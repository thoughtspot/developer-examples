const BEARER_TOKEN = process.env.BEARER_TOKEN;
const THOUGHTSPOT_HOST = process.env.THOUGHTSPOT_HOST;
const DATA_SOURCE_ID = process.env.DATA_SOURCE_ID;

async function apiCall(endpoint: string, body: any, responseType: "json" | "text" = "json") {
    const url = new URL(endpoint, THOUGHTSPOT_HOST).href;
    const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json",
            "x-requested-by": "ThoughtSpot",
            "Authorization": `Bearer ${BEARER_TOKEN}`,
        },
    });

    if (responseType === "json") {
        return response.json();
    }

    return response.text();
}

async function main() {
    const conversation = await apiCall("/api/rest/2.0/ai/conversation/create", {
        metadata_identifier: DATA_SOURCE_ID,
    });

    const response = await apiCall(`/api/rest/2.0/ai/conversation/${conversation.conversation_identifier}/converse`, {
        metadata_identifier: DATA_SOURCE_ID,
        message: "revenue by region",
    });

    const data = await apiCall("/api/rest/2.0/report/answer", {
        session_identifier: response.session_identifier,
        generation_number: response.generation_number,
        file_format: "CSV",
    }, "text");

    console.log(data);
}