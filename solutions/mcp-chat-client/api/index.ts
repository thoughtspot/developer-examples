import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
// import { Context } from "./context";
// import { listConnectors } from "./mcp/connectors";

class Context {
    constructor(a: any, b: any) {
    }
    addMCPServer(mcpServer: any) { }
    connectMCPServer(serverId: string, onRedirect: (url: string) => void) { }
    finishMCPServerOAuth(code: string, state: string) { }
    listMCPServers() { }
    listMCPServerTools(serverId: string) { }
    listMCPServerResources(serverId: string) { }
    readMCPServerResource(serverId: string, resourceURI: string) { }
}

type ContextVariableMap = { Variables: { context: Context } };

const contextMiddleware = createMiddleware<ContextVariableMap>(async (c, next) => {
    const appUrl = c.req.header("X-Forwarded-Host") || c.req.header("Host") || "https://chat.thoughtspot.app";
    const context = new Context(c.req.header("Authorization"), appUrl);
    c.set("context", context);
    await next();
});

const app = new Hono<ContextVariableMap>().basePath("/api");
app.use(contextMiddleware);

app.get("/", (c) => c.text("Hello World"));


app.post("/mcp/add", async (c) => {
    const mcpServer = await c.req.json();
    c.var.context.addMCPServer(mcpServer);
});

app.get("/mcp/:serverId/connect", async (c) => {
    const serverId = c.req.param("serverId");
    return new Promise((resolve) => {
        const onRedirect = (url: string) => {
            resolve(c.json({ redirectUrl: url }));
        };
        c.var.context.connectMCPServer(serverId, onRedirect);
    });
});

app.post("/mcp/oauth/callback", async (c) => {
    const { code, state } = await c.req.json();
    await c.var.context.finishMCPServerOAuth(code, state);
    return c.json({ success: true });
});

app.get("/mcp/list", async (c) => {
    const mcpServers = await c.var.context.listMCPServers();
    return c.json(mcpServers);
});

app.get("/mcp/:serverId/tools/list", async (c) => {
    const serverId = c.req.param("serverId");
    const tools = await c.var.context.listMCPServerTools(serverId);
    return c.json(tools);
});


app.get("/mcp/:serverId/resources/list", async (c) => {
    const serverId = c.req.param("serverId");
    const resources = await c.var.context.listMCPServerResources(serverId);
    return c.json(resources);
});

app.get("/mcp/:serverId/resources/read", async (c) => {
    const serverId = c.req.param("serverId");
    const resourceURI = c.req.query("resourceURI");
    const resource = await c.var.context.readMCPServerResource(serverId, resourceURI);
    return c.json(resource);
});

app.get("/mcp/connectors/list", async (c) => {
    // const connectors = await listConnectors(c.var.context.supabaseClient);
    // return c.json(connectors);
    return c.json([]);
})

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

app.notFound((c) => {
    console.log(c.req.url, c.req.path);
    return c.text('This endpoint does not exist', 404)
})

export default app;