import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import axios from "axios";
import morgan from "morgan";
import https from "https";

const TS_SECRET_KEY = process.env.TS_SECRET_KEY;
const TS_HOST =
    process.env.TS_HOST;

axios.defaults.httpsAgent = new (https.Agent)({
    rejectUnauthorized: false,
});
// create express server on port 3000
const app = express();

// set up express to use body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("short"));

// set up express to use cors
app.use(cors());

// create a GET route for the root path
app.get("/api", (req, res) => {
    res.send("Hello World!");
});

app.all("/api/token/:user", async (req, res) => {
    const { user } = req.params;
    let groups = req.body?.groups;
    try {
        const userToken: any = await axios.post(
            `${TS_HOST}/api/rest/2.0/auth/token/full`,
            {
                secret_key: process.env.TS_SECRET_KEY,
                username: user,
                auto_create: true,
                ...(groups ? { group_identifiers: groups } : {}),
            },
            {
                headers: {
                    accept: "application/json",
                    "Content-Type": "application/json",
                },
            }
        )
        console.debug(userToken.data);
        res.send(userToken.data.token);
    } catch (error: any) {
        console.error(error);
        console.error("Error", error, error.response.status, error.response, error);
        res.status(500).send("Error getting token");
    };
});


export default app;