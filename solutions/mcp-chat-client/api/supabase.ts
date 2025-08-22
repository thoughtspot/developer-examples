import { createClient as _createClient } from "@supabase/supabase-js";

export const createClient = (authorization: string) => {
    return _createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!,
        {
            global: {
                headers: { Authorization: authorization },
            },
        }
    );
}

export const globalSupabaseClient = _createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
);