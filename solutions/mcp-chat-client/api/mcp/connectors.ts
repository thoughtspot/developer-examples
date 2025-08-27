import { SupabaseClient } from "@supabase/supabase-js";


export const listConnectors = async (supabaseClient: SupabaseClient) => {
    const { data, error } = await supabaseClient.from('connectors').select('*');
    if (error) {
        throw error;
    }
    return data;
}