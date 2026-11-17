using ColonyTracker.Api.Data;
using ColonyTracker.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o =>
        o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")
        ?? "Data Source=colony.db"));

builder.Services.AddScoped<IScoringEngine, ScoringEngine>();
builder.Services.AddScoped<ICampaignContext, CampaignContext>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    SeedData.Seed(db);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();

// M1: Live-campaign lock violations → 409; optional stale-state guard via If-History-Version on any write.
app.Use(async (ctx, next) =>
{
    if (!HttpMethods.IsGet(ctx.Request.Method) && ctx.Request.Headers.TryGetValue("If-History-Version", out var hv))
    {
        var db = ctx.RequestServices.GetRequiredService<AppDbContext>();
        var cid = await ctx.RequestServices.GetRequiredService<ICampaignContext>().GetActiveIdAsync();
        var current = await db.Campaigns.AsNoTracking().Where(c => c.Id == cid).Select(c => (long?)c.HistoryVersion).FirstOrDefaultAsync();
        if (current is not null && (!long.TryParse(hv, out var expected) || expected != current))
        {
            ctx.Response.StatusCode = StatusCodes.Status409Conflict;
            await ctx.Response.WriteAsJsonAsync(new { error = "stale", message = "Campaign history changed since this was computed; recompute and retry.", currentHistoryVersion = current });
            return;
        }
    }
    try { await next(); }
    catch (LiveCampaignViolationException ex)
    {
        ctx.Response.StatusCode = StatusCodes.Status409Conflict;
        await ctx.Response.WriteAsJsonAsync(new { error = "live-locked", message = ex.Message });
    }
});

// Resolve the canonical uploads root from config (overridden per-environment via env var in docker-compose)
var uploadsRaw = app.Configuration["UploadsPath"] ?? "../colony-uploads";
var colonyUploadsPath = Path.IsPathRooted(uploadsRaw)
    ? uploadsRaw
    : Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, uploadsRaw));
Directory.CreateDirectory(Path.Combine(colonyUploadsPath, "maps"));
Directory.CreateDirectory(Path.Combine(colonyUploadsPath, "factions"));
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(colonyUploadsPath),
    RequestPath = "/colony-uploads"
});
// Legacy alias: existing faction image URLs stored in the DB use /uploads/factions/...
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(colonyUploadsPath),
    RequestPath = "/uploads"
});

app.MapControllers();

app.Run();
