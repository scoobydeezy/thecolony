using ColonyTracker.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using ColonyTracker.Api.Services;
using ColonyTracker.Api.Services.Canon;

namespace ColonyTracker.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // The canonical file store, taken from the interceptor registered on these options
    // (Program.cs, tests). Null only for contexts that never touch canon entities.
    public CanonStore? Canon { get; } = options.FindExtension<CoreOptionsExtension>()?.Interceptors?
        .OfType<CanonMaterializationInterceptor>().FirstOrDefault()?.Store;

    // Canonical id <-> row id for this context (ADVENTURE-BOOK-PLAN.md §10); reloaded after each save.
    private CanonRefs? _refs;
    public CanonRefs Refs => _refs ??= CanonRefs.Load(Database.GetDbConnection(), Database.CurrentTransaction?.GetDbTransaction());

    public DbSet<Campaign> Campaigns => Set<Campaign>();
    public DbSet<AppSettings> AppSettings => Set<AppSettings>();
    public DbSet<Faction> Factions => Set<Faction>();
    public DbSet<ColonyState> ColonyStates => Set<ColonyState>();
    public DbSet<RelationshipOverride> RelationshipOverrides => Set<RelationshipOverride>();
    public DbSet<RulesConfig> RulesConfigs => Set<RulesConfig>();
    public DbSet<SessionLogEntry> SessionLog => Set<SessionLogEntry>();
    public DbSet<Character> Characters => Set<Character>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<EventEffect> EventEffects => Set<EventEffect>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<FactionGoal> FactionGoals => Set<FactionGoal>();
    // Profiles and detail sections now live in each character's canonical file (CanonSections);
    // only the play-state "revealed" flags stay here.
    public DbSet<CharacterSectionReveal> CharacterSectionReveals => Set<CharacterSectionReveal>();
    // Relationships are in each character's file (§15): CharacterRelations serves them.
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<ColonyMap> ColonyMaps => Set<ColonyMap>();
    public DbSet<MapPlacement> MapPlacements => Set<MapPlacement>();

    // ── M1: rule versions and Colony Turns ────────────────────────────────────
    public DbSet<RulesVersion> RulesVersions => Set<RulesVersion>();
    public DbSet<ColonyTurn> ColonyTurns => Set<ColonyTurn>();
    public DbSet<ColonyTurnPhase> ColonyTurnPhases => Set<ColonyTurnPhase>();
    public DbSet<WorldCondition> WorldConditions => Set<WorldCondition>();   // §18.6

    /// <summary>Set by RulesController when a Live campaign's rules change is being versioned.</summary>
    public bool AllowRulesVersioning { get; set; }

    // ── Narrative branching (ADVENTURE-BOOK-PLAN.md §14) ───────────────────────
    // A branch is a file (PathSet keeps the link row). Its paths, and every event's participation,
    // scope and versions, are in the files: NarrativeBranches serves them.
    public DbSet<PathSet> PathSets => Set<PathSet>();

    // ── Narrative content ─────────────────────────────────────────────────────
    public DbSet<NarrativeThread> NarrativeThreads => Set<NarrativeThread>();
    public DbSet<NarrativeEvent> NarrativeEvents => Set<NarrativeEvent>();
    public DbSet<NarrativeEntityLink> NarrativeEntityLinks => Set<NarrativeEntityLink>();
    public DbSet<NarrativeEventRealization> NarrativeEventRealizations => Set<NarrativeEventRealization>();
    public DbSet<NarrativeEventPlacement> NarrativeEventPlacements => Set<NarrativeEventPlacement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppSettings>().HasKey(x => x.Id);
        modelBuilder.Entity<AppSettings>()
            .HasOne(x => x.ActiveCampaign)
            .WithMany()
            .HasForeignKey(x => x.ActiveCampaignId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ColonyState>().HasKey(x => x.Id);
        modelBuilder.Entity<RulesConfig>().HasKey(x => x.Id);

        modelBuilder.Entity<Session>()
            .HasMany(s => s.Events)
            .WithOne(e => e.Session)
            .HasForeignKey(e => e.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Event>()
            .HasMany(e => e.Effects)
            .WithOne(ef => ef.Event)
            .HasForeignKey(ef => ef.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        // File-backed properties are not columns (ADVENTURE-BOOK-PLAN.md §9, §10).
        foreach (var t in CanonMapping.Types)
        {
            foreach (var p in CanonMapping.PropertiesOf(t)) modelBuilder.Entity(t).Ignore(p);
            modelBuilder.Entity(t).HasIndex(nameof(ICanonEntity.CanonId));
            // One file, at most one row per campaign (the auto-linker and the app can never double-link).
            modelBuilder.Entity(t).HasIndex(nameof(ICanonEntity.CampaignId), nameof(ICanonEntity.CanonId)).IsUnique();
        }
        modelBuilder.Entity<CharacterSectionReveal>().HasKey(r => new { r.CharacterId, r.SectionKey });

        modelBuilder.Entity<ColonyMap>()
            .HasMany<MapPlacement>()
            .WithOne()
            .HasForeignKey(p => p.MapId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<NarrativeEventPlacement>()
            .HasKey(x => x.NarrativeEventId);

        modelBuilder.Entity<ColonyTurn>()
            .HasMany(t => t.Phases)
            .WithOne()
            .HasForeignKey(p => p.ColonyTurnId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<RulesVersion>().HasIndex(r => new { r.CampaignId, r.Version }).IsUnique();
        modelBuilder.Entity<ColonyTurnPhase>().HasIndex(p => new { p.ColonyTurnId, p.Ordinal }).IsUnique();
    }

    // ── M1: history version and Live-campaign locks ───────────────────────────
    public override int SaveChanges(bool acceptAllChangesOnSuccess) =>
        SaveChangesAsync(acceptAllChangesOnSuccess).GetAwaiter().GetResult();

    public override async Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken ct = default)
    {
        // Edits to file-backed properties are invisible to EF's change tracker; compare each tracked
        // canon entity with the values it was loaded with.
        ChangeTracker.DetectChanges();
        foreach (var ce in ChangeTracker.Entries<ICanonEntity>().Where(e => e.State == EntityState.Unchanged && CanonMapping.ChangedSinceLoad(e.Entity)).ToList())
            ce.State = EntityState.Modified;

        var entries = ChangeTracker.Entries()
            .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted
                        && SimulationGuard.Tracks(e.Entity))
            .ToList();
        if (entries.Count > 0)
        {
            var campaignIds = new HashSet<string>();
            foreach (var e in entries)
            {
                var cid = await CampaignOf(e, ct);
                if (cid is null) continue;
                campaignIds.Add(cid);
                var campaign = await Campaigns.FindAsync(new object[] { cid }, ct);
                if (campaign is { Mode: CampaignMode.Live })
                    await SimulationGuard.CheckLiveAsync(e, this, ct);
            }
            foreach (var cid in campaignIds)
            {
                var campaign = await Campaigns.FindAsync(new object[] { cid }, ct);
                if (campaign is not null) campaign.HistoryVersion++;
            }
        }
        // Canon files first: a refused write (conflict, schema) leaves the database untouched. The
        // journal makes the save all-or-nothing: if a later file or the commit fails, every file this
        // save wrote or deleted is put back.
        using var journal = Canon?.BeginJournal();
        try
        {
            await WriteCanonAsync(ct);
            return await base.SaveChangesAsync(acceptAllChangesOnSuccess, ct);
        }
        catch
        {
            if (journal is { Count: > 0 }) journal.Rollback();
            throw;
        }
        finally
        {
            _refs = null;   // links may have changed
        }
    }

    // ── ADVENTURE-BOOK-PLAN.md §9, §10: characters, factions, Assets and locations live in files ──
    private async Task WriteCanonAsync(CancellationToken ct)
    {
        var changed = ChangeTracker.Entries<ICanonEntity>().Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted).ToList();
        if (changed.Count == 0) return;
        var canon = Canon ?? throw new InvalidOperationException("Characters, factions, Assets and locations are stored in canonical files, but this DbContext has no CanonStore (register CanonMaterializationInterceptor).");
        var refs = Refs;

        // Pass 1: every saved entity gets its file link before any file is written, so references
        // between entities created in the same save resolve.
        var reserved = new HashSet<string>(StringComparer.Ordinal);
        var isNew = new Dictionary<object, bool>(ReferenceEqualityComparer.Instance);
        foreach (var e in changed.Where(e => e.State != EntityState.Deleted))
        {
            var x = e.Entity;
            if (x.CanonMissing)
                throw new CanonConflictException($"{x.CanonId}: the file is missing or unreadable, so it can't be saved. Restore or fix the file first.");
            // A detached update may not carry its file link: take it from the row, never allocate a new file.
            if (x.CanonId is null && e.State == EntityState.Modified)
                x.CanonId = (await e.GetDatabaseValuesAsync(ct))?[nameof(ICanonEntity.CanonId)] as string;
            var kind = CanonMapping.KindOf(x);
            x.CanonId ??= canon.AllocateId(kind, CanonMapping.NameOf(x), reserved);
            isNew[x] = !canon.TryGet(x.CanonId, out _);
            refs.Add(CanonMapping.RefTypeOf(x.GetType()), x.CampaignId, x.Id, x.CanonId);
        }

        // Pass 2: write (or delete) the files.
        foreach (var e in changed)
        {
            var x = e.Entity;
            if (e.State == EntityState.Deleted)
            {
                // Several campaigns can link to one file: delete it only with its last link.
                var id = e.Property(nameof(ICanonEntity.CanonId)).OriginalValue as string;
                if (id is not null && !await OtherLinksAsync(x, id, ct))
                {
                    var gone = x is Location && canon.TryGet(id, out var goneEntry) ? goneEntry.Document.Frontmatter : null;
                    canon.Delete(id);
                    if (gone is not null) RelinkAssets(canon, gone, null);
                }
                continue;
            }
            var kind = CanonMapping.KindOf(x);
            var created = isNew[x];
            // A new row that only links an existing file (seed, import, auto-link) and changes none of its
            // values writes nothing, so a hand-written file keeps its exact text.
            if (!created && e.State == EntityState.Added && !CanonMapping.ChangedSinceLoad(x)) continue;
            // Created during a Live campaign means improvised at the table (characters record it).
            var improvised = created && x is Character && await Campaigns.AsNoTracking().AnyAsync(c => c.Id == x.CampaignId && c.Mode == CampaignMode.Live, ct);
            // A location that changes which Asset it stands for: remember what it stood for, and where.
            var before = x is Location && canon.TryGet(x.CanonId, out var old) ? old : null;
            var entry = canon.Write(x.CanonId!, kind, doc =>
            {
                CanonMapping.Apply(x, doc, refs, canon);
                if (created && x is Character)
                    doc.Frontmatter.Children[new YamlDotNet.RepresentationModel.YamlScalarNode("origin")] = new YamlDotNet.RepresentationModel.YamlScalarNode(improvised ? "improvised" : "prepared");
            }, created ? null : x.CanonVersion);
            if (x is Location) RelinkAssets(canon, before?.Document.Frontmatter, entry.Document.Frontmatter);
        }

        // Re-read everything saved: an Asset's location may come from a location written after it.
        foreach (var e in changed.Where(e => e.State != EntityState.Deleted))
            if (canon.TryGet(e.Entity.CanonId, out var entry)) CanonMapping.Hydrate(e.Entity, entry, refs, canon);
    }

    // §10, one fact in one place: an Asset that a location stands for has no location of its own.
    // When a location takes an Asset, the Asset's own location is removed; when it lets one go (or
    // is deleted), the Asset keeps the location it had, the parent the location had.
    private static void RelinkAssets(CanonStore canon, YamlDotNet.RepresentationModel.YamlMappingNode? before, YamlDotNet.RepresentationModel.YamlMappingNode? after)
    {
        var oldAsset = before is null ? null : CanonEntityMapping.Read(before, "asset");
        var newAsset = after is null ? null : CanonEntityMapping.Read(after, "asset");
        if (newAsset is not null && canon.TryGet(newAsset, out _))
            canon.Write(newAsset, "asset", doc => SetAssetLocation(doc, null), expectedVersion: null);
        if (oldAsset is not null && oldAsset != newAsset && canon.TryGet(oldAsset, out _) && canon.LocationLinking(oldAsset) is null)
            canon.Write(oldAsset, "asset", doc => SetAssetLocation(doc, CanonEntityMapping.Read(before!, "parent")), expectedVersion: null);
    }

    private static void SetAssetLocation(CanonStore.Document doc, string? location)
    {
        var key = new YamlDotNet.RepresentationModel.YamlScalarNode("start");
        if (!doc.Frontmatter.Children.TryGetValue(key, out var n) || n is not YamlDotNet.RepresentationModel.YamlMappingNode start)
        {
            if (location is null) return;
            start = new YamlDotNet.RepresentationModel.YamlMappingNode();
            doc.Frontmatter.Children[key] = start;
        }
        CanonYaml.Set(start, "location", location, isText: false);
        // Keep the schema's order: controller, location, status, statusActor.
        var order = new[] { "controller", "location", "status", "statusActor" };
        var sorted = start.Children.OrderBy(kv => Array.IndexOf(order, ((YamlDotNet.RepresentationModel.YamlScalarNode)kv.Key).Value) is var i && i < 0 ? 99 : i).ToList();
        start.Children.Clear();
        foreach (var kv in sorted) start.Children.Add(kv.Key, kv.Value);
    }

    private async Task<bool> OtherLinksAsync(ICanonEntity x, string canonId, CancellationToken ct) => x switch
    {
        Character => await Characters.AsNoTracking().AnyAsync(o => o.CanonId == canonId && o.Id != x.Id, ct),
        Faction => await Factions.AsNoTracking().AnyAsync(o => o.CanonId == canonId && o.Id != x.Id, ct),
        Asset => await Assets.AsNoTracking().AnyAsync(o => o.CanonId == canonId && o.Id != x.Id, ct),
        Location => await Locations.AsNoTracking().AnyAsync(o => o.CanonId == canonId && o.Id != x.Id, ct),
        FactionGoal => await FactionGoals.AsNoTracking().AnyAsync(o => o.CanonId == canonId && o.Id != x.Id, ct),
        NarrativeEvent => await NarrativeEvents.AsNoTracking().AnyAsync(o => o.CanonId == canonId && o.Id != x.Id, ct),
        NarrativeThread => await NarrativeThreads.AsNoTracking().AnyAsync(o => o.CanonId == canonId && o.Id != x.Id, ct),
        PathSet => await PathSets.AsNoTracking().AnyAsync(o => o.CanonId == canonId && o.Id != x.Id, ct),
        WorldCondition => await WorldConditions.AsNoTracking().AnyAsync(o => o.CanonId == canonId && o.Id != x.Id, ct),
        _ => true,
    };

    private async Task<string?> CampaignOf(EntityEntry e, CancellationToken ct)
    {
        string? Val(string prop) => (e.State == EntityState.Deleted ? e.Property(prop).OriginalValue : e.Property(prop).CurrentValue) as string;
        switch (e.Entity)
        {
            case Event:
                return await SessionCampaign(Val(nameof(Event.SessionId)), ct);
            case EventEffect:
            {
                var eventId = Val(nameof(EventEffect.EventId));
                var ev = Events.Local.FirstOrDefault(x => x.Id == eventId) ?? await Events.AsNoTracking().FirstOrDefaultAsync(x => x.Id == eventId, ct);
                return ev is null ? null : await SessionCampaign(ev.SessionId, ct);
            }
            case ColonyTurnPhase:
            {
                var turnId = Val(nameof(ColonyTurnPhase.ColonyTurnId));
                var turn = ColonyTurns.Local.FirstOrDefault(x => x.Id == turnId) ?? await ColonyTurns.AsNoTracking().FirstOrDefaultAsync(x => x.Id == turnId, ct);
                return turn?.CampaignId;
            }
            default:
                return e.Metadata.FindProperty("CampaignId") is null ? null : Val("CampaignId");
        }
    }

    private async Task<string?> SessionCampaign(string? sessionId, CancellationToken ct)
    {
        if (sessionId is null) return null;
        var session = Sessions.Local.FirstOrDefault(x => x.Id == sessionId) ?? await Sessions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == sessionId, ct);
        return session?.CampaignId;
    }
}
