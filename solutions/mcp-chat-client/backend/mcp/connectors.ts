import { SupabaseClient } from "@supabase/supabase-js";


export const listConnectors = async (supabaseClient: SupabaseClient) => {
    const { data, error } = await supabaseClient.from('connectors').select('*').order('order', { ascending: true });
    if (error) {
        throw error;
    }
    return data;
}

export const getConnector = async (supabaseClient: SupabaseClient, connectorId: string) => {
    const { data, error } = await supabaseClient.from('connectors').select('*').eq('id', connectorId).single();
    if (error) {
        throw error;
    }
    return data;
}