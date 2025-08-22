import { createClient } from "./api/supabase";
import { next } from "@vercel/edge";


export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - /api/hello (hello API endpoint)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!favicon\\.ico(?:$|\\/)|api\\/hello(?:$|\\/)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
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

    return next({
        request: {
            headers: requestHeaders
        },
    });
}