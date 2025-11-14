import express from 'express';
import { pipeResponse } from "./hono-adapter";
import middleware, { config } from '../middleware';

export async function useMiddleware(req, res, next) {
    req.fetchReq = createFetchRequest(req);
    const [middlewareResp, shouldCallHandler] = await applyMiddleware(req, res);

    if (shouldCallHandler) {
        addMiddlewareHeaders(req.fetchReq, middlewareResp);
        next();
    } else {
        pipeResponse(middlewareResp, res);
    }
}

function createFetchRequest(req: express.Request) {
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    let headers = new Headers();
    for (let key in req.headers) {
        if (req.headers[key]) headers.append(key, req.headers[key] as string);
    }
    return new Request(fullUrl, {
        method: req.method,
        body: req.method === 'POST' ? req.body : null,
        headers,
    });
}

async function applyMiddleware(expressReq, res) {
    const regex = new RegExp(config.matcher[0]);
    if (!regex.test(expressReq.path)) {
        return [null, true];
    }

    const fetchReq = expressReq.fetchReq;
    const middlewareResp = await middleware(fetchReq);
    if (!middlewareResp || middlewareResp.headers.get('x-middleware-next')) {
        return [middlewareResp, true];
    }
    return [middlewareResp, false];
}

function addMiddlewareHeaders(request: Request, response: Response) {
    if (!response || !response.headers) {
        return;
    }
    const overrideHeaders = response.headers.get('x-middleware-override-headers').split(',');
    for (let header of overrideHeaders) {
        const value = response.headers.get(`x-middleware-request-${header}`);
        request.headers.set(header, value);
    }
}