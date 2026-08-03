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
builder.Services.AddScoped<IFactionInfluenceService, FactionInfluenceService>();
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
