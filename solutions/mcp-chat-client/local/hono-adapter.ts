import express from "express";
import { Hono } from "hono";

// Convert Express req into a proper fetch Request
function expressToFetch(req: express.Request): Request {
    const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    let body: string | undefined;

    // req.body is a Buffer from bodyParser
    if (req.body && !["GET", "HEAD"].includes(req.method)) {
        body = req.body.toString(); // convert Buffer to string
    }

    return new Request(url, {
        method: req.method,
        headers: req.headers as any,
        body,
    });
}

export function honoHandler(honoApp: Hono) {
    return async (req: express.Request, res: express.Response) => {
        try {
            const fetchReq = await expressToFetch(req);
            const honoRes = await honoApp.fetch(fetchReq);

            res.status(honoRes.status);
            honoRes.headers.forEach((v, k) => res.setHeader(k, v));

            if (honoRes.body) {
                // pipe Hono response to Express
                const reader = honoRes.body.getReader();
                const decoder = new TextDecoder();
                const readChunk = async () => {
                    const { done, value } = await reader.read();
                    if (done) return res.end();
                    res.write(decoder.decode(value));
                    readChunk();
                };
                readChunk();
            } else {
                res.end();
            }
        } catch (err) {
            console.error(err);
            res.status(500).send("Internal Server Error");
        }
    };
}
