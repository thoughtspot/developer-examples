import { createClient } from "./backend/clients/supabase";
import { next } from "@vercel/edge";


export const config = {
    matcher: [
        /*
         * Match all api routes
         */
        '/api/:path*',
    ],
}

export default async function middleware(req: Request) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204 });

    const supabase = createClient(req.headers.get('Authorization')!);
    const { data, error } = await supabase.auth.getUser();
    if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 401,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', data.user.id);
    requestHeaders.set('x-user-email', data.user.email);

    console.debug(`[API] ${data.user.id} ${req.url}`);

    return next({
        request: {
            headers: requestHeaders
        },
    });
}