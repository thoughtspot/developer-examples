import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("Hello World"));


app.post("/mcp/add", async (c) => {
    const { mcpServerUrl, mcpServerName, oAuthClientId, oAuthClientSecret } = await c.req.json();
    console.log(mcpServerUrl, mcpServerName, oAuthClientId);
    return c.json({ message: "MCP server added" });
});

app.get("/mcp/connect", async (c) => {
    // Retrieve the mcp server from the database
    // Start the oAuth flow.
});

app.get("/mcp/oauth-callback", async (c) => {
    // Retrieve the mcp server from the database
    // Complete the oAuth flow.
});

app.post("/mcp/list", async (c) => {
    // Retrieve the mcp servers from the database for the current user
    // Return the mcp servers
});

app.post("/mcp/tools/list", async (c) => {
    // Retrieve the mcp tools from the database for the current user
    // Return the mcp tools
});


app.post("/mcp/resources/list", async (c) => {
    // Retrieve the mcp token for the server id, and the current user
    // List the MCP resources using the sdk using list-resources
});

app.post("/mcp/resources/read", async (c) => {
    // Retrieve the mcp token for the server id, and the current user
    // Read the MCP resource using the sdk using read-resource
});

app.post("/conversations/create", async (c) => {
    // Create a new conversation
});

app.post("/conversations/send", async (c) => {
    // Send a message to the conversation
    // Return the response from the conversation using the llm
});

app.post("/conversations/list", async (c) => {
    // List the conversations for the current user
});

app.post("/conversations/delete", async (c) => {
    // Delete a conversation for the current user
});

export default app;