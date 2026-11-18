using ColonyTracker.Api.Data;
using ColonyTracker.Api.Services.Canon;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Tests;

// A throwaway canonical-file store for tests (ADVENTURE-BOOK-PLAN.md §9), validated against the
// real schemas the adventure book generates (adventure/schemas/*.schema.json).
public sealed class TestCanon : IDisposable
{
    public string Dir { get; } = Path.Combine(Path.GetTempPath(), $"canon-{Guid.NewGuid():N}");
    public CanonStore Store { get; }

    public TestCanon()
    {
        Directory.CreateDirectory(Path.Combine(Dir, "npcs"));
        Store = new CanonStore(Dir, SchemaDir);
    }

    public static string SchemaDir
    {
        get
        {
            for (var d = new DirectoryInfo(AppContext.BaseDirectory); d is not null; d = d.Parent)
                if (Directory.Exists(Path.Combine(d.FullName, "adventure", "schemas"))) return Path.Combine(d.FullName, "adventure", "schemas");
            throw new DirectoryNotFoundException("adventure/schemas not found above the test output directory");
        }
    }

    // One interceptor per store; each new interceptor means a new EF internal service provider, so
    // across a test run EF's "many service providers" guard is ignored here (the app has one singleton).
    private CanonMaterializationInterceptor? _interceptor;
    public AppDbContext Db(SqliteConnection conn) =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(conn)
            .AddInterceptors(_interceptor ??= new CanonMaterializationInterceptor(Store))
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.CoreEventId.ManyServiceProvidersCreatedWarning))
            .Options);

    public string File(string id)
    {
        var spec = CanonStore.Spec(id[..id.IndexOf('.')]);
        return Path.Combine(Dir, spec.Folder, $"{id[(id.IndexOf('.') + 1)..]}{spec.Ext}");
    }

    public void Dispose() { if (Directory.Exists(Dir)) Directory.Delete(Dir, recursive: true); }
}
