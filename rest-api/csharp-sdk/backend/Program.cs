using System.IO;
using thoughtspot_rest_api_sdk;
using thoughtspot_rest_api_sdk.Api;
using thoughtspot_rest_api_sdk.Client;
using thoughtspot_rest_api_sdk.Model;


// Loads key=value lines from a .env file into process environment variables
static void LoadDotEnv(string path = ".env")
{
    if (!File.Exists(path))
    {
        return;
    }

    foreach (var raw in File.ReadAllLines(path))
    {
        var line = raw.Trim();
        if (string.IsNullOrEmpty(line) || line.StartsWith("#"))
            continue;

        var idx = line.IndexOf('=');
        if (idx <= 0)
            continue;

        var key = line.Substring(0, idx).Trim();
        var val = line.Substring(idx + 1).Trim();

        if ((val.StartsWith("\"") && val.EndsWith("\"")) || (val.StartsWith("'") && val.EndsWith("'")))
        {
            val = val.Substring(1, val.Length - 2);
        }

        // Do not overwrite existing environment vars
        if (Environment.GetEnvironmentVariable(key) == null)
        {
            Environment.SetEnvironmentVariable(key, val);
        }
    }
}

// Load a local .env file (if present) so developers don't have to export vars.
LoadDotEnv();

// Prefer the VITE_* env vars (used by the frontend/dev) but fall back
// to the legacy TS_* names for compatibility.
string hostEnv = Environment.GetEnvironmentVariable("VITE_TS_HOST") ?? Environment.GetEnvironmentVariable("TS_HOST");
string host = ThoughtSpotConfiguration.NormalizeHost(hostEnv);
string user = Environment.GetEnvironmentVariable("VITE_TS_USERNAME") ?? Environment.GetEnvironmentVariable("TS_USER") ?? "";
string pass = Environment.GetEnvironmentVariable("VITE_TS_PASSWORD") ?? Environment.GetEnvironmentVariable("TS_PASS") ?? "";
string liveboardId = Environment.GetEnvironmentVariable("VITE_LIVEBOARD_ID") ?? Environment.GetEnvironmentVariable("TS_LIVEBOARD_ID") ?? "";
string spotterWorksheetId = Environment.GetEnvironmentVariable("VITE_SPOTTER_WORKSHEET_ID") ?? Environment.GetEnvironmentVariable("TS_SPOTTER_WORKSHEET_ID") ?? "";

// Try to create the ThoughtSpot client but don't crash the server if it fails.
ThoughtSpotRestApi? api = null;
try
{
    if (string.IsNullOrWhiteSpace(user) || string.IsNullOrWhiteSpace(pass))
    {
        throw new InvalidOperationException("Missing ThoughtSpot credentials (TS_USER/TS_PASS or VITE_TS_USERNAME/VITE_TS_PASSWORD).");
    }

    api = await ThoughtSpotRestApi.CreateAsync(new ApiClientConfiguration
    {
        Host = host,
        Username = user,
        Password = pass,
        TokenValiditySeconds = 3600,
        // Self-signed dev/demo clusters. Remove for production.
        IgnoreSslErrors = true,
    });

    Console.WriteLine("ThoughtSpot client created successfully.");
}
catch (Exception ex)
{
    Console.Error.WriteLine($"Warning: ThoughtSpot client not configured: {ex.Message}");
    Console.Error.WriteLine("Server will continue running; API endpoints will return 503 until configured.");
}

// Determine the URL to listen on and configure the host.
var builder = WebApplication.CreateBuilder(args);
string? urls = Environment.GetEnvironmentVariable("ASPNETCORE_URLS");
if (string.IsNullOrWhiteSpace(urls))
{
    string port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
    urls = $"http://127.0.0.1:{port}";
    Console.WriteLine($"No ASPNETCORE_URLS set; binding to {urls}");
    builder.WebHost.UseUrls(urls);
}
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://0.0.0.0:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();
app.UseCors();

app.MapGet("/api/health", () => Results.Ok(new { host, liveboardId, spotterWorksheetId }));

Func<IResult> clientNotConfigured = () => Results.Json(new { error = "ThoughtSpot client not configured. See .env.example or set TS_USER/TS_PASS." }, statusCode: 503);

// Some clusters (e.g. restricted sandbox/trial accounts) return a generic
// "Operation is not allowed" 403 for calls that need privileges the
// configured account doesn't have. Surface that as a clear message instead
// of the raw upstream error blob.
string FriendlyError(ApiException ex)
{
    if (ex.ErrorCode == 403 && ex.Message.Contains("Operation is not allowed"))
    {
        return "This operation requires privileges (e.g. admin) that the configured ThoughtSpot account does not have on this cluster.";
    }

    return ex.Message;
}

// 1. Search users ---------------------------------------------------------------
app.MapGet("/api/users", (string? query, int size) =>
{
    if (api == null) return clientNotConfigured();
    string? namePattern = string.IsNullOrWhiteSpace(query) ? null : $"%{query}%";
    var request = new SearchUsersRequest(
        namePattern: namePattern ?? null!,
        recordSize: size <= 0 ? 10 : size);

    List<User> users = api.SearchUsers(request);
    return Results.Ok(users.Select(u => new { id = u.Id, name = u.Name, displayName = u.DisplayName }));
});

// 2. Search liveboards ------------------------------------------------------------
app.MapGet("/api/liveboards", (string? query, int size) =>
{
    if (api == null) return clientNotConfigured();
    string? namePattern = string.IsNullOrWhiteSpace(query) ? null : $"%{query}%";
    var metadataItem = new MetadataListItemInput(
        type: MetadataListItemInput.TypeEnum.LIVEBOARD,
        namePattern: namePattern ?? null!);

    var request = new SearchMetadataRequest(
        metadata: new List<MetadataListItemInput> { metadataItem },
        recordSize: size <= 0 ? 10 : size);

    List<MetadataSearchResponse> results = api.SearchMetadata(request);
    return Results.Ok(results.Select(r => new { id = r.MetadataId, name = r.MetadataName }));
});

// 3. Export TML ---------------------------------------------------------------------
app.MapGet("/api/liveboards/{id}/tml", (string id) =>
{
    if (api == null) return clientNotConfigured();
    var request = new ExportMetadataTMLRequest(
        metadata: new List<ExportMetadataTypeInput>
        {
            new ExportMetadataTypeInput(type: ExportMetadataTypeInput.TypeEnum.LIVEBOARD, identifier: id)
        },
        exportFqn: true,
        edocFormat: ExportMetadataTMLRequest.EdocFormatEnum.JSON);

    try
    {
        List<Object> tml = api.ExportMetadataTML(request);
        // The SDK deserializes this response body with Newtonsoft.Json, so each
        // entry in `tml` is really a Newtonsoft JObject/JArray/JValue. ASP.NET
        // Core's default System.Text.Json serializer doesn't understand those
        // types and silently writes them out as near-empty objects/arrays.
        // Round-trip through Newtonsoft to get back well-formed JSON text.
        string json = Newtonsoft.Json.JsonConvert.SerializeObject(tml);
        return Results.Content(json, "application/json");
    }
    catch (ApiException ex)
    {
        return Results.Json(new { error = FriendlyError(ex) }, statusCode: ex.ErrorCode);
    }
});

// 4. Spotter — ask a natural-language question, streamed live via SSE -----------
//
//    Creates a fresh agent conversation per question, then relays the
//    Server-Sent Events from SendAgentConversationMessageStreamingStreamAsync
//    straight through to the browser as they arrive (no buffering the full
//    answer server-side first). Each upstream `data: [...]` line is
//    forwarded verbatim as the default SSE "message" event; a final custom
//    "done" event (or "ts-error" on failure) tells the frontend when to stop
//    listening.
app.MapGet("/api/spotter/stream", async (HttpContext ctx, string query, string? worksheetId) =>
{
    if (api == null)
    {
        ctx.Response.StatusCode = 503;
        await ctx.Response.WriteAsJsonAsync(new { error = "ThoughtSpot client not configured. See .env.example or set TS_USER/TS_PASS." });
        return;
    }

    string metadataId = string.IsNullOrWhiteSpace(worksheetId) ? spotterWorksheetId : worksheetId;
    if (string.IsNullOrWhiteSpace(query) || string.IsNullOrWhiteSpace(metadataId))
    {
        ctx.Response.StatusCode = 400;
        await ctx.Response.WriteAsJsonAsync(new { error = "A 'query' and a worksheet id (VITE_SPOTTER_WORKSHEET_ID or ?worksheetId=) are required." });
        return;
    }

    ctx.Response.ContentType = "text/event-stream";
    ctx.Response.Headers.CacheControl = "no-cache";
    ctx.Response.Headers["X-Accel-Buffering"] = "no";

    async Task WriteEventAsync(string? eventName, string data)
    {
        if (!string.IsNullOrEmpty(eventName))
        {
            await ctx.Response.WriteAsync($"event: {eventName}\n", ctx.RequestAborted);
        }
        await ctx.Response.WriteAsync($"data: {data}\n\n", ctx.RequestAborted);
        await ctx.Response.Body.FlushAsync(ctx.RequestAborted);
    }

    try
    {
        // Workaround: thoughtspot_rest_api_sdk's DataSourceContextInput always
        // serializes its unused sibling fields (data_source_identifiers, guid)
        // as explicit JSON nulls (still true as of 0.1.0-beta.7). This
        // cluster's request validation rejects that shape (it falls back to
        // expecting a `worksheet_context` payload instead). Bypassing the
        // typed DataSourceContext property and writing the minimal object via
        // AdditionalProperties avoids emitting those nulls.
        var metadataContext = new ContextPayloadV2Input(type: ContextPayloadV2Input.TypeEnum.DATASOURCE);
        metadataContext.AdditionalProperties["data_source_context"] = new Dictionary<string, object>
        {
            ["data_source_identifier"] = metadataId,
        };

        AgentConversation conversation = api.CreateAgentConversation(new CreateAgentConversationRequest(
            metadataContext: metadataContext,
            conversationSettings: new ConversationSettingsInput()));

        var streamRequest = new SendAgentConversationMessageStreamingRequest(messages: new List<string> { query });

        await foreach (var payload in api.SendAgentConversationMessageStreamingStreamAsync(
            conversation.ConversationIdentifier, streamRequest, ctx.RequestAborted))
        {
            await WriteEventAsync(null, payload);
        }

        await WriteEventAsync("done", "{}");
    }
    catch (ApiException ex)
    {
        await WriteEventAsync("ts-error", System.Text.Json.JsonSerializer.Serialize(new { error = FriendlyError(ex) }));
    }
    catch (OperationCanceledException)
    {
        // Client navigated away / closed the EventSource — nothing to write.
    }
});

app.Run();

public static class ThoughtSpotConfiguration
{
    public static string NormalizeHost(string? host)
    {
        if (string.IsNullOrWhiteSpace(host))
        {
            return "https://try-everywhere.thoughtspot.cloud";
        }

        var trimmed = host.Trim();
        if (!trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            trimmed = $"https://{trimmed}";
        }

        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
        {
            throw new ArgumentException($"The TS_HOST value '{host}' is not a valid URL.", nameof(host));
        }

        var path = uri.AbsolutePath.Trim('/');
        if (path.Equals("v2", StringComparison.OrdinalIgnoreCase))
        {
            path = string.Empty;
        }

        var builder = new UriBuilder(uri)
        {
            Path = string.IsNullOrEmpty(path) ? string.Empty : $"/{path}",
            Query = string.Empty,
            Fragment = string.Empty
        };

        return builder.Uri.GetLeftPart(UriPartial.Authority) + (builder.Path.Length > 1 ? builder.Path : string.Empty);
    }
}

