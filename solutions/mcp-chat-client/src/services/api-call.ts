import { supabase } from "../supabase";

const abortControllers = {};

export const abortRequest = (cancelId) => {
    if (abortControllers[cancelId]) {
        abortControllers[cancelId].abort();
    }
}

export const apiCall = async (path, body = {}, cancelId?) => {
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

    const resp = await fetch(url, {
        body: JSON.stringify(body),
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        signal,
    });

    if (!resp.ok) {
        console.error('Api call failed', await resp.text());
        throw new Error(`Api call failed ${resp.statusText}`);
    }

    return resp.json();
}