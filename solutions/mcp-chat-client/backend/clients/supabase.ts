import { createClient as _createClient } from "@supabase/supabase-js";

export const createClient = (authorization: string) => {
    const client = _createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_ANON_KEY!,
        {
            global: {
                headers: { Authorization: authorization },
            },
        }
    );
    client.auth.getUser().then((user) => {
        console.debug(`[SUPABASE] user ${user.data.user.id}`);
    });
    return client;
}

export const globalSupabaseClient = _createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);