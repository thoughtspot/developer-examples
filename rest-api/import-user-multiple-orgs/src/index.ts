import express, { Request, Response } from "express";
import cryptoRandomString from 'crypto-random-string';
import path from "path";
import https from 'https';
import { fileURLToPath } from "url";
import { dirname } from "path";
import fetch from "node-fetch"; // Import fetch for Node.js
import { THOUGHTSPOT_HOST, SECRET_KEY, THOUGHTSPOT_USERNAME, THOUGHTSPOT_PASSWORD, USER_IDENTIFIER, USER_EMAIL, ORG_IDENTIFIER1, ORG_IDENTIFIER2 } from "./constants";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.json());
app.use(express.static(__dirname));

// End point to create user in multiple orgs.
app.post("/create-user", async (req: Request, res: Response): Promise<void> => {
    const { org1, org2 } = req.body;
    try {
        if (!THOUGHTSPOT_HOST || !THOUGHTSPOT_PASSWORD) {
            res.status(500).json({ error: "Server is missing required configurations" });
            return;
        }

        const agent = new https.Agent({
          rejectUnauthorized: false
        });

        const tokenHeaders = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        };

        const body = JSON.stringify({
            username: THOUGHTSPOT_USERNAME,
            validity_time_in_sec: 300,
            auto_create: false,
            password: THOUGHTSPOT_PASSWORD,
            secret_key: SECRET_KEY
        });

        const tokenResponse = await fetch(`${THOUGHTSPOT_HOST}/api/rest/2.0/auth/token/full`, {
            method: "POST",
            headers: tokenHeaders,
            body: body,
            redirect: "follow" as RequestRedirect,
            agent: agent,
        });

        const tokenResult = await tokenResponse.json();
        if (!tokenResponse.ok) {
            throw new Error(`API error: ${JSON.stringify(tokenResult)}`);
        }

        const token = tokenResult.token;
        const bearerToken = `Bearer ${token}`;
        const userIdentifier = cryptoRandomString({ length: 10 });

        const requestBody: RequestBody = {
          users: [
            {
              user_identifier: userIdentifier,
              display_name: userIdentifier,
              password: "Cloud123!",
              account_type: "LOCAL_USER",
              account_status: "ACTIVE",
              email: "test@gmail.com",
              org_identifiers: [
                org1,
                org2
              ],
            },
          ],
          dry_run: false,
          delete_unspecified_users: false,
        };

        const headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": bearerToken,
        };

        const response = await fetch(`${THOUGHTSPOT_HOST}/api/rest/2.0/users/import`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(requestBody),
            redirect: "follow" as RequestRedirect,
            agent: agent,
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(`API error: ${JSON.stringify(result)}`);
        }

        res.json({result });
    } catch (error: unknown) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Failed to create user", details: (error as Error).message });
    }
});

app.post("/", (req: Request, res: Response) => {
  console.log(req.body.name);
  res.end();
});

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, (err?: Error) => {
  if (err) console.error(err);
  console.log(`Server listening on http://localhost:${PORT}`);
});