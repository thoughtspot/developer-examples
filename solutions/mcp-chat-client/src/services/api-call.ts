import { supabase } from "../supabase";
import { message } from "antd";

const abortControllers = {};

export const abortRequest = (cancelId) => {
    if (abortControllers[cancelId]) {
        abortControllers[cancelId].abort();
    }
}

export const apiCall = async (path, payload: any = {}, cancelId?, stream?: boolean) => {
    let signal;
    if (cancelId) {
        abortRequest(cancelId);
        abortControllers[cancelId] = new AbortController();
        signal = abortControllers[cancelId].signal;
    }
    const session = await supabase.auth.getSession();
    const token = session?.data.session.access_token;
    if (!token) {
        throw new Error('no token');
    }

    path = path.startsWith('/') ? path : `/${path}`;
    const url = `/api${path}`;
    const { body, ...payloadWithoutBody } = payload;

    const resp = await fetch(url, {
        body: body ? JSON.stringify(body) : undefined,
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        signal,
        ...payloadWithoutBody,
    });

    if (!resp.ok) {
        const contentType = resp.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const error = await resp.json();
            console.error('Api call failed', error);
            message.error(error.message);
        } else {
            const error = await resp.text();
            console.error('Api call failed', error);
            message.error(error || 'Something went wrong.');
        }
        throw new Error(`Api call failed ${resp.statusText}`);
    }

    if (stream) {
        return resp.body;
    }

    return resp.json();
}

export async function* readNDJSONStream(stream: ReadableStream) {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Split buffer into lines (NDJSON)
        const lines = buffer.split('\n')
        buffer = lines.pop()! // Keep the last incomplete line

        for (const line of lines) {
            if (!line.trim()) continue
            try {
                yield JSON.parse(line)
            } catch (err) {
                console.error('Failed to parse JSON:', line, err)
            }
        }
    }

    // Handle remaining buffer
    if (buffer.trim()) {
        try {
            yield JSON.parse(buffer)
        } catch (err) {
            console.error('Failed to parse remaining buffer:', buffer)
        }
    }
}