import express, { Request, Response } from "express";
// import { Request, Response } from "express-serve-static-core";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fetch from "node-fetch"; // Import fetch for Node.js
import { THOUGHTSPOT_HOST, SECRET_KEY, THOUGHTSPOT_USERNAME, THOUGHTSPOT_PASSWORD } from "./constants";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.json());
app.use(express.static(__dirname));

// Endpoint to generate token
app.post("/generate-token", async (req: Request, res: Response): Promise<void> => {
    try {
        if (!THOUGHTSPOT_HOST || !THOUGHTSPOT_PASSWORD) {
            res.status(500).json({ error: "Server is missing required configurations" });
            return;
        }

        const headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        };

        const body = JSON.stringify({
            username: THOUGHTSPOT_USERNAME,
            validity_time_in_sec: 300,
            password: THOUGHTSPOT_PASSWORD,
            // secret_key: SECRET_KEY, // It is highly recommended to use secret key in production environment
            auto_create: true, // To provision a user just-in-time (JIT), set this attribute to true.
            persist_option: "APPEND", // Indicates whether the specified attributes should be persisted or not.
            // Other persist options supported are: "REPLACE", "RESET" and "NONE".
            filter_rules: [
                {
                    column_name: "Color",
                    operator: "IN",
                    values: [
                        "sky"
                    ],
                },
            ],
            parameter_values: [
                {
                    name: "Secured",
                    values: [
                        "Default"
                    ]
                },
            ]
        });

        const response = await fetch(`${THOUGHTSPOT_HOST}/api/rest/2.0/auth/token/custom`, {
            method: "POST",
            headers: headers,
            body: body,
            redirect: "follow" as RequestRedirect,
        });

        const result = await response.json();


        if (!response.ok) {
            throw new Error(`API error: ${JSON.stringify(result)}`);
        }

        res.json({ token: result });
    } catch (error: unknown) {
        console.error("Error generating token:", error);
        res.status(500).json({ error: "Failed to generate token", details: (error as Error).message });
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
