import { createClient } from "@supabase/supabase-js";

declare const window: any;
const supabaseUrl = window.env.SUPABASE_URL;
const supabaseAnonKey = window.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
    }
});

(window as any).handleSignInWithGoogle = async (response: any) => {
    const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
    })
    console.log(data, error);
}