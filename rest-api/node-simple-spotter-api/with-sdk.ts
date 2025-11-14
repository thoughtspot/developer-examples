import { createBearerAuthenticationConfig, ThoughtSpotRestApi } from "@thoughtspot/rest-api-sdk";

const THOUGHTSPOT_HOST = process.env.THOUGHTSPOT_HOST;
const BEARER_TOKEN = process.env.BEARER_TOKEN;
const DATA_SOURCE_ID = process.env.DATA_SOURCE_ID;

const config = createBearerAuthenticationConfig(
    THOUGHTSPOT_HOST,
    async () => {
        return BEARER_TOKEN;    
    },
);


const thoughtSpotClient = new ThoughtSpotRestApi(config);

async function main() {
    const conversation = await thoughtSpotClient.createConversation({
        metadata_identifier: DATA_SOURCE_ID,
    });
    
    const response = await thoughtSpotClient.sendMessage(
        conversation.conversation_identifier,
        {
            metadata_identifier: DATA_SOURCE_ID,
            message: "revenue by region"
        }
    );

    const data = await thoughtSpotClient.exportAnswerReport({
        session_identifier: response[0].session_identifier!,
        generation_number: response[0].generation_number!,
        file_format: "CSV",
    });

    console.log(await data.text());
}

main();