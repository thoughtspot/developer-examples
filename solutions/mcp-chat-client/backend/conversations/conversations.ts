import { SupabaseClient } from "@supabase/supabase-js";

export class Conversations {
    constructor(private readonly supabaseClient: SupabaseClient) {
    }

    async createConversation(conversation: Conversation) {
        const { data, error } = await this.supabaseClient.from('conversations').insert(conversation).select().single();
    }
}