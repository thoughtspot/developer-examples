// `npm run dev`: starts the receiver without a ThoughtSpot cluster or cloud
// credentials and sends it deliveries shaped like the payload docs. Files land
// in ./out. `npm test` runs the same thing once and fails on any surprise.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

process.env.RECEIVER_TOKEN ??= 'demo-token';
process.env.LOCAL_BUCKET_DIR = 'fixtures/bucket'; // storage-mode files come from here instead of S3
delete process.env.DRIVE_FOLDER_ID; // uploads go to ./out
const { app, idle } = await import('./main.js');

const port = Number(process.env.PORT ?? 3000);
const url = `http://localhost:${port}/webhooks/thoughtspot`;
const fixture = (name: string) => readFile(path.join('fixtures', name));

// Direct mode: the multipart layout from the payload docs.
async function direct() {
  const body = new FormData();
  body.append('payload', (await fixture('event-direct.json')).toString());
  body.append('file', new Blob([await fixture('files/sales_report.pdf')], { type: 'application/pdf' }), 'sales_report.pdf');
  body.append('file', new Blob([await fixture('files/sales_data.csv')], { type: 'text/csv' }), 'sales_data.csv');
  return body;
}

// Storage mode: the event plus its files[] manifest (one file stored, one FAILED).
async function storage() {
  const event = { ...JSON.parse((await fixture('event-storage.json')).toString()), ...JSON.parse((await fixture('manifest.json')).toString()) };
  return JSON.stringify(event);
}

const deliveries = [
  { name: 'direct (multipart)', body: direct, expect: 'Webhook received successfully' },
  { name: 'storage (JSON + files[])', body: storage, expect: 'Webhook received successfully' },
  { name: 'direct again (a retry)', body: direct, expect: 'Duplicate delivery; already received' },
];

app.get('/', (_req, res) => res.type('text').send('ThoughtSpot webhook receiver demo: see the terminal and ./out'));
await new Promise<void>((resolve, reject) => app.listen(port, (err) => (err ? reject(err) : resolve())));

let failures = 0;
for (const delivery of deliveries) {
  const body = await delivery.body();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RECEIVER_TOKEN}`,
      ...(typeof body === 'string' && { 'Content-Type': 'application/json' }),
    },
    body,
  });
  const { message } = await res.json();
  const ok = res.status === 200 && message === delivery.expect;
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${delivery.name}: ${res.status} "${message}"`);
}

await idle();
const files = (await readdir('out', { recursive: true }).catch(() => [])).filter((f) => path.extname(f));
console.log(`\n${files.length} file(s) in out/:\n  ${files.sort().join('\n  ')}`);
if (files.length < 3) failures++; // 2 attachments + 1 stored file

if (process.argv.includes('--once')) process.exit(failures ? 1 : 0);
console.log(`\nStill listening on ${url} (bearer token: ${process.env.RECEIVER_TOKEN})`);
