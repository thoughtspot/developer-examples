// Receives ThoughtSpot LIVEBOARD_SCHEDULE webhook deliveries and uploads the
// exported files to Google Drive (or to ./out when DRIVE_FOLDER_ID is unset).
// Payload reference: https://developers.thoughtspot.com/docs/webhooks-lb-payload

import Busboy from 'busboy';
import express, { type Request, type Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';

const MAX_BYTES = 25 * 1024 * 1024; // ThoughtSpot delivers up to 25 MB

// Names from a delivery (filenames, msgUniqueId) made safe for use on disk:
// no directories, no "..", only [A-Za-z0-9_.-].
const safeName = (name: string) => path.basename(name).replace(/[^\w.-]/g, '_').replace(/^\.*$/, '_');

interface StoredFile {
  filename: string;
  contentType: string;
  provider: 'AWS_S3' | 'GCP_GCS';
  bucketName?: string;
  region?: string;
  objectKey?: string;
  uploadStatus: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
}

interface WebhookEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  metadataObject: { id: string; name: string };
  data: { scheduleDetails?: { name?: string }; msgUniqueId?: string };
  // Storage mode: where ThoughtSpot put the files.
  files?: StoredFile[];
  error?: string;
}

interface LocalFile {
  filename: string;
  contentType: string;
  path: string;
}

// ---- Parsing ---------------------------------------------------------------

// Direct mode: a "payload" part with the event JSON and one "file" part per
// attachment. Attachments are streamed to `dir`.
function parseMultipart(req: Request, dir: string) {
  return new Promise<{ payload?: string; files: LocalFile[]; tooLarge: boolean }>((resolve, reject) => {
    const bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_BYTES, fieldSize: MAX_BYTES } });
    const files: LocalFile[] = [];
    const writes: Promise<void>[] = [];
    let payload: string | undefined;
    let tooLarge = false;

    bb.on('field', (name, value) => {
      if (name === 'payload') payload = value;
    });
    bb.on('file', (name, stream, info) => {
      stream.on('limit', () => (tooLarge = true));
      if (name !== 'file') return void stream.resume();
      const filename = safeName(info.filename || 'attachment');
      const file = { filename, contentType: info.mimeType, path: path.join(dir, `attachment-${files.length}`) };
      files.push(file);
      const write = pipeline(stream, createWriteStream(file.path));
      write.catch(() => {}); // reported through Promise.all below
      writes.push(write);
    });
    bb.on('error', reject);
    bb.on('close', () => Promise.all(writes).then(() => resolve({ payload, files, tooLarge }), reject));
    req.pipe(bb);
  });
}

// Storage mode: the docs show the files[] manifest both next to the event and
// as "the content in the file attachment", so accept either.
async function takeManifest(event: WebhookEvent, attachments: LocalFile[]): Promise<StoredFile[] | undefined> {
  if (Array.isArray(event.files)) return event.files;
  for (const [i, file] of attachments.entries()) {
    if (!file.contentType.startsWith('application/json')) continue;
    const json = JSON.parse(await readFile(file.path, 'utf8'));
    if (Array.isArray(json.files)) {
      attachments.splice(i, 1);
      event.error ??= json.error;
      return json.files;
    }
  }
  return undefined;
}

// ---- Getting the files -------------------------------------------------------

// Reads a storage-mode object with the receiver's own credentials (AWS default
// chain; needs s3:GetObject). ThoughtSpot's role can only write.
// LOCAL_BUCKET_DIR swaps S3 for a folder on disk (used by the demo).
async function fetchStored(file: StoredFile, dest: string): Promise<void> {
  if (process.env.LOCAL_BUCKET_DIR) {
    const bucket = path.resolve(process.env.LOCAL_BUCKET_DIR, file.bucketName!);
    const source = path.resolve(bucket, file.objectKey!);
    if (!source.startsWith(bucket + path.sep)) throw new Error(`bad objectKey ${file.objectKey}`);
    await copyFile(source, dest);
    return;
  }
  if (file.provider !== 'AWS_S3') throw new Error(`${file.provider} is not handled by this example`);
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({ region: file.region });
  const object = await s3.send(new GetObjectCommand({ Bucket: file.bucketName, Key: file.objectKey }));
  await pipeline(object.Body as NodeJS.ReadableStream, createWriteStream(dest));
}

// ---- Downstream ----------------------------------------------------------------

// Uploads to a Google Drive folder as a service account
// (GOOGLE_APPLICATION_CREDENTIALS). Service accounts have no My Drive storage,
// so the folder must be in a shared drive the account is a member of.
async function upload(file: LocalFile, event: WebhookEvent, key: string): Promise<void> {
  const folderId = process.env.DRIVE_FOLDER_ID;
  if (!folderId) {
    const dir = path.join(process.env.OUT_DIR ?? 'out', safeName(key).slice(0, 8));
    await mkdir(dir, { recursive: true });
    await copyFile(file.path, path.join(dir, file.filename));
    return;
  }
  const { drive, auth } = await import('@googleapis/drive');
  const client = drive({ version: 'v3', auth: new auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive'] }) });
  const name = `${event.metadataObject.name} - ${event.data.scheduleDetails?.name ?? 'schedule'} - ${event.timestamp} - ${file.filename}`;
  await client.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType: file.contentType, body: createReadStream(file.path) },
    supportsAllDrives: true,
  });
}

// ---- The webhook endpoint ----------------------------------------------------------

const seen = new Set<string>(); // use a shared store if you run several replicas
let queue: Promise<void> = Promise.resolve();

// Resolves once every accepted delivery has been processed.
export const idle = () => queue;

async function processDelivery(event: WebhookEvent, key: string, files: LocalFile[], stored: StoredFile[], dir: string) {
  try {
    if (event.error) console.error(`[${event.eventId}] storage upload error: ${event.error}`);
    for (const [i, file] of stored.entries()) {
      if (file.uploadStatus !== 'SUCCESS') {
        console.error(`[${event.eventId}] ${file.filename} was not stored: ${file.errorMessage}`);
        continue;
      }
      const dest = path.join(dir, `stored-${i}`);
      await fetchStored(file, dest);
      files.push({ filename: safeName(file.filename), contentType: file.contentType, path: dest });
    }
    for (const file of files) {
      await upload(file, event, key);
      console.log(`[${event.eventId}] delivered ${file.filename}`);
    }
  } catch (err) {
    seen.delete(key); // let a redelivery try again
    console.error(`[${event.eventId}] processing failed: ${(err as Error).message}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function reply(res: Response, status: number, message: string) {
  // WebhookResponse, as defined in the payload docs
  res.status(status).json({ status: status < 300 ? 'SUCCESS' : 'ERROR', message, time: new Date().toISOString() });
}

function authorized(req: Request): boolean {
  const token = process.env.RECEIVER_TOKEN; // the webhook's BEARER_TOKEN
  if (!token) return true;
  const got = Buffer.from(req.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${token}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export const app = express();

app.post(
  '/webhooks/thoughtspot',
  (req, res, next) => (authorized(req) ? next() : reply(res, 401, 'unauthorized')),
  express.json({ limit: MAX_BYTES }),
  async (req, res) => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'ts-webhook-'));
    let event: WebhookEvent;
    let files: LocalFile[] = [];
    let stored: StoredFile[];
    try {
      if (req.is('multipart/form-data')) {
        const parts = await parseMultipart(req, dir);
        if (parts.tooLarge) throw Object.assign(new Error('delivery too large'), { status: 413 });
        event = JSON.parse(parts.payload ?? 'null');
        files = parts.files;
      } else {
        event = req.body;
      }
      if (typeof event?.eventId !== 'string') throw new Error('missing event payload');
      stored = (await takeManifest(event, files)) ?? [];
    } catch (err) {
      await rm(dir, { recursive: true, force: true });
      return reply(res, (err as { status?: number }).status ?? 400, (err as Error).message);
    }

    // data.msgUniqueId is documented for deduplication; ThoughtSpot retries
    // deliveries that fail or take longer than 5 seconds.
    const key = event.data?.msgUniqueId ?? event.eventId;
    if (event.eventType !== 'LIVEBOARD_SCHEDULE' || seen.has(key)) {
      await rm(dir, { recursive: true, force: true });
      return reply(res, 200, seen.has(key) ? 'Duplicate delivery; already received' : 'Event not handled');
    }
    seen.add(key);

    // Acknowledge first, then upload in the background.
    reply(res, 200, 'Webhook received successfully');
    console.log(`[${event.eventId}] received "${event.metadataObject?.name}": ${files.length} attachment(s), ${stored.length} stored file(s)`);
    queue = queue.then(() => processDelivery(event, key, files, stored, dir));
  },
);

// Malformed or oversized JSON bodies from express.json()
app.use((err: { status?: number; message: string }, _req: Request, res: Response, _next: express.NextFunction) =>
  reply(res, err.status ?? 500, err.message),
);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, (err) => {
    if (err) throw err;
    console.log(`Listening on http://localhost:${port}/webhooks/thoughtspot`);
  });
}
