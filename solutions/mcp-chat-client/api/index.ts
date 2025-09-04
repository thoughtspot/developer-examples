import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { Context } from "../backend/context";
import { listConnectors } from "../backend/mcp/connectors";
import { MCPAuthError } from "../backend/util";

type ContextVariableMap = { Variables: { context: Context } };

const contextMiddleware = createMiddleware<ContextVariableMap>(async (c, next) => {
    // Get protocol and host to construct the full app URL
    const protocol = c.req.header("X-Forwarded-Proto") || (c.req.header("Forwarded")?.split(";").find(s => s.trim().startsWith("proto="))?.split("=")[1]) || "https";
    const host = c.req.header("X-Forwarded-Host") || c.req.header("Host") || "chat.thoughtspot.app";
    const appUrl = `${protocol}://${host}`;
    const context = new Context(c.req.header("Authorization"), appUrl);
    c.set("context", context);
    await next();
});

const app = new Hono<ContextVariableMap>().basePath("/api");
app.use(contextMiddleware);

app.get("/", (c) => c.text("Hello World"));

app.post("/test", async (c) => {
    const body = await c.req.json();
    console.log(body);
    return c.json(body);
});

app.post("/mcp/add", async (c) => {
    const mcpServer = await c.req.json();
    const resp = await c.var.context.addMCPServer(mcpServer);
    return c.json(resp);
});

app.post("/mcp/add/connector", async (c) => {
    const { connectorId } = await c.req.json();
    const resp = await c.var.context.addMCPServerFromConnector(connectorId);
    return c.json(resp);
});

app.post("/mcp/:serverId/connect", async (c) => {
    const serverId = c.req.param("serverId");
    return new Promise(async (resolve) => {
        const onRedirect = (url: string) => {
            resolve(c.json({ redirectUrl: url }));
        };
        const { error } = await c.var.context.connectMCPServer(serverId, onRedirect);
        if (error) {
            resolve(c.json({ error: error.message }, 500));
        } else {
            resolve(c.json({ success: true }));
        }
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
    const connectors = await listConnectors(c.var.context.supabaseClient);
    return c.json(connectors);
})

app.post("/conversations/create", async (c) => {
    // Create a new conversation
});

app.post("/conversations/send", async (c) => {
    const { message, attachments, referenceId, mcpServers, enabledDefaultTools } = await c.req.json();
    const responseStream = await c.var.context.sendMessage(message, attachments, mcpServers, enabledDefaultTools, referenceId);
    return new Response(responseStream, {
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Transfer-Encoding": "chunked",
            "Connection": "keep-alive",
        },
    });
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

// Define a global error handler
app.onError((err, c) => {
    console.error(err) // log the error
    if (err instanceof MCPAuthError) {
        return c.json(
            {
                error: 'MCP Connection Error',
                code: 'MCP_CONNECTION_ERROR',
                message: err.message,
            },
            403
        )
    }
    return c.json(
        {
            error: 'Internal Server Error',
            message: err.message,
        },
        500
    )
})

export default app;