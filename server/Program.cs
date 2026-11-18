using ColonyTracker.Api.Data;
using ColonyTracker.Api.Services;
using ColonyTracker.Api.Services.Canon;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o =>
        o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddOpenApi();

// Characters, factions, Assets and locations live in canonical content files (ADVENTURE-BOOK-PLAN.md
// §9, §10). The interceptor fills file-backed properties as EF loads them; AppDbContext writes them back on save.
builder.Services.AddSingleton<CanonStore>();
builder.Services.AddSingleton<CanonMaterializationInterceptor>();
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")
        ?? "Data Source=colony.db")
        .AddInterceptors(sp.GetRequiredService<CanonMaterializationInterceptor>()));

builder.Services.AddScoped<IScoringEngine, ScoringEngine>();
builder.Services.AddScoped<ICampaignContext, CampaignContext>();
// One source of truth: canon files with no app record are linked into Design campaigns.
builder.Services.AddHostedService<CanonAutoLink>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        // 4200: the app (and the book through its /docs proxy); 4321-4323: the book served or run on its own.
        policy.WithOrigins("http://localhost:4200", "http://localhost:4321", "http://localhost:4322", "http://localhost:4323")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var canonStore = scope.ServiceProvider.GetRequiredService<CanonStore>();
    var idMap = CanonLinks.IdMapPath(app.Configuration, app.Environment);
    var entityIdMap = CanonLinks.EntityIdMapPath(app.Configuration, app.Environment);
    var goalIdMap = CanonLinks.GoalIdMapPath(app.Configuration, app.Environment);
    var narrativeIdMap = CanonLinks.NarrativeIdMapPath(app.Configuration, app.Environment);
    var branchIdMap = CanonLinks.BranchIdMapPath(app.Configuration, app.Environment);
    var conditionIdMap = CanonLinks.ConditionIdMapPath(app.Configuration, app.Environment);
    // The switch migrations drop the file-backed columns; refuse unless the files and links exist.
    CanonLinks.GuardSwitch(db, canonStore, idMap, entityIdMap, goalIdMap, narrativeIdMap, branchIdMap, conditionIdMap);
    db.Database.Migrate();
    CanonLinks.Backfill(db, canonStore, idMap, entityIdMap, goalIdMap, narrativeIdMap, app.Logger, branchIdMap, conditionIdMap);
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
    // Canon files: changed outside the app since loaded (409), or not valid canon (400).
    catch (CanonConflictException ex)
    {
        ctx.Response.StatusCode = StatusCodes.Status409Conflict;
        await ctx.Response.WriteAsJsonAsync(new { error = "canon-conflict", message = ex.Message });
    }
    catch (CanonValidationException ex)
    {
        ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
        await ctx.Response.WriteAsJsonAsync(new { error = "canon-invalid", message = ex.Message });
    }
    // NarrativeGraph: an owner (event, thread) that isn't in this campaign.
    catch (KeyNotFoundException ex)
    {
        ctx.Response.StatusCode = StatusCodes.Status404NotFound;
        await ctx.Response.WriteAsJsonAsync(new { error = "not-found", message = ex.Message });
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
