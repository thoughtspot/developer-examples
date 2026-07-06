using ThoughtSpot.Client;
using ThoughtSpot.Client.Api;
using ThoughtSpot.Client.Client;
using ThoughtSpot.Client.Model;

// ─────────────────────────────────────────────────────────────────────────────
//  ThoughtSpot C# SDK — full-stack example (backend)
//
//  A tiny ASP.NET Core minimal API that wraps the ThoughtSpot.Client SDK and
//  exposes six JSON/file endpoints for the React frontend in ../frontend:
//
//    POST /api/users              — create a user
//    POST /api/style              — update style customization
//    GET  /api/users              — search users
//    GET  /api/liveboards         — search liveboards
//    GET  /api/liveboards/{id}/export  — export a liveboard as PDF
//    GET  /api/liveboards/{id}/tml     — export a liveboard's TML
//
//  Run with:  dotnet run   (from this backend/ folder)
//  Config via env vars: TS_HOST, TS_USER, TS_PASS (see defaults below).
//
//  Uses ThoughtSpotRestApi.CreateAsync(...) instead of the legacy
//  HttpClient/HttpClientHandler constructors. CreateAsync builds its own
//  SocketsHttpHandler/HttpClient internally, which is what actually gives you
//  ConnectTimeout / ReadTimeout / WriteTimeout, connection pooling, SSL
//  handling, and automatic bearer-token fetch + refresh (TokenInjectingHandler).
//  None of that is wired up if you build the client from your own
//  HttpClient/HttpClientHandler via the legacy constructors.
// ─────────────────────────────────────────────────────────────────────────────

string host = Environment.GetEnvironmentVariable("TS_HOST") ?? "https://172.32.25.218:8443";
string user = Environment.GetEnvironmentVariable("TS_USER") ?? "tsadmin";
string pass = Environment.GetEnvironmentVariable("TS_PASS") ?? "4Xyc1f%[H^3L";

var api = await ThoughtSpotRestApi.CreateAsync(new ApiClientConfiguration
{
    Host = host,
    Username = user,
    Password = pass,
    TokenValiditySeconds = 3600,
    // Self-signed dev/demo clusters. Remove for production.
    IgnoreSslErrors = true,
});

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();
app.UseCors();

app.MapGet("/api/health", () => Results.Ok(new { host }));

// 1. User creation ------------------------------------------------------------
app.MapPost("/api/users", (CreateUserBody body) =>
{
    var request = new CreateUserRequest(
        name: body.Name,
        displayName: body.DisplayName,
        password: body.Password,
        email: body.Email,
        accountType: CreateUserRequest.AccountTypeEnum.LOCALUSER,
        accountStatus: CreateUserRequest.AccountStatusEnum.ACTIVE,
        triggerWelcomeEmail: false,
        triggerActivationEmail: false);

    try
    {
        User created = api.CreateUser(request);
        return Results.Ok(new { id = created.Id, name = created.Name });
    }
    catch (ApiException ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: ex.ErrorCode);
    }
});

// 2. Style customization -------------------------------------------------------
app.MapPost("/api/style", (StyleBody body) =>
{
    try
    {
        api.UpdateStyleCustomization(
            scope: "ORG",
            operation: "REPLACE",
            navigationPanel: new NavigationPanelInput(
                theme: NavigationPanelInput.ThemeEnum.CUSTOM,
                baseColor: body.BaseColor),
            embeddedFooterText: body.FooterText);

        return Results.Ok(new { success = true });
    }
    catch (ApiException ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: ex.ErrorCode);
    }
});

// 3. Search users ---------------------------------------------------------------
app.MapGet("/api/users", (string? query, int size) =>
{
    var request = new SearchUsersRequest(
        namePattern: string.IsNullOrWhiteSpace(query) ? null : $"%{query}%",
        recordSize: size <= 0 ? 10 : size);

    List<User> users = api.SearchUsers(request);
    return Results.Ok(users.Select(u => new { id = u.Id, name = u.Name, displayName = u.DisplayName }));
});

// 4. Search liveboards ------------------------------------------------------------
app.MapGet("/api/liveboards", (string? query, int size) =>
{
    var metadataItem = new MetadataListItemInput(
        type: MetadataListItemInput.TypeEnum.LIVEBOARD,
        namePattern: string.IsNullOrWhiteSpace(query) ? null : $"%{query}%");

    var request = new SearchMetadataRequest(
        metadata: new List<MetadataListItemInput> { metadataItem },
        recordSize: size <= 0 ? 10 : size);

    List<MetadataSearchResponse> results = api.SearchMetadata(request);
    return Results.Ok(results.Select(r => new { id = r.MetadataId, name = r.MetadataName }));
});

// 5. Export liveboard (PDF) --------------------------------------------------------
app.MapGet("/api/liveboards/{id}/export", (string id) =>
{
    var request = new ExportLiveboardReportRequest(
        metadataIdentifier: id,
        fileFormat: ExportLiveboardReportRequest.FileFormatEnum.PDF);

    try
    {
        FileParameter file = api.ExportLiveboardReport(request);
        using var ms = new MemoryStream();
        file.Content.CopyTo(ms);
        // Explicit content-length + attachment disposition so the browser's
        // fetch()/blob download on the frontend gets a well-formed response
        // instead of a chunked stream with no size hint.
        var bytes = ms.ToArray();
        return Results.Bytes(bytes, "application/pdf", $"liveboard-{id}.pdf");
    }
    catch (ApiException ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: ex.ErrorCode);
    }
});

// 6. Export TML ---------------------------------------------------------------------
app.MapGet("/api/liveboards/{id}/tml", (string id) =>
{
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
        return Results.Ok(tml);
    }
    catch (ApiException ex)
    {
        return Results.Json(new { error = ex.Message }, statusCode: ex.ErrorCode);
    }
});

app.Run();

record CreateUserBody(string Name, string DisplayName, string Email, string Password);
record StyleBody(string BaseColor, string FooterText);
