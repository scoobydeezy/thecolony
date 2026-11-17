using ColonyTracker.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using ColonyTracker.Api.Services;

namespace ColonyTracker.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
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
    public DbSet<CharacterNarrativeProfile> CharacterNarrativeProfiles => Set<CharacterNarrativeProfile>();
    public DbSet<CharacterDetail> CharacterDetails => Set<CharacterDetail>();
    public DbSet<CharacterRelationship> CharacterRelationships => Set<CharacterRelationship>();
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

    // ── Narrative path/scope model ────────────────────────────────────────────
    public DbSet<PathSet> PathSets => Set<PathSet>();
    public DbSet<NarrativePath> NarrativePaths => Set<NarrativePath>();
    public DbSet<PathSetContext> PathSetContexts => Set<PathSetContext>();
    public DbSet<PathEventScope> PathEventScopes => Set<PathEventScope>();
    public DbSet<NarrativeEventVariantParticipation> NarrativeEventVariantParticipations => Set<NarrativeEventVariantParticipation>();

    // ── Narrative event override model ────────────────────────────────────────
    public DbSet<NarrativeEventOverride> NarrativeEventOverrides => Set<NarrativeEventOverride>();
    public DbSet<EventOverridePath> EventOverridePaths => Set<EventOverridePath>();
    public DbSet<EventOverrideConnection> EventOverrideConnections => Set<EventOverrideConnection>();
    public DbSet<EventOverrideEntityLink> EventOverrideEntityLinks => Set<EventOverrideEntityLink>();

    // ── Narrative content ─────────────────────────────────────────────────────
    public DbSet<NarrativeThread> NarrativeThreads => Set<NarrativeThread>();
    public DbSet<NarrativeEvent> NarrativeEvents => Set<NarrativeEvent>();
    public DbSet<NarrativeEventConnection> NarrativeEventConnections => Set<NarrativeEventConnection>();
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

        modelBuilder.Entity<CharacterNarrativeProfile>()
            .HasKey(p => p.CharacterId);

        modelBuilder.Entity<ColonyMap>()
            .HasMany<MapPlacement>()
            .WithOne()
            .HasForeignKey(p => p.MapId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Narrative path/scope composites ───────────────────────────────────

        modelBuilder.Entity<PathSetContext>()
            .HasKey(x => new { x.PathSetId, x.RequiredPathId });

        modelBuilder.Entity<PathEventScope>()
            .HasKey(x => new { x.PathId, x.NarrativeEventId });

        modelBuilder.Entity<NarrativeEventVariantParticipation>()
            .HasKey(x => new { x.NarrativeEventId, x.PathSetId });

        modelBuilder.Entity<NarrativeEventVariantParticipation>()
            .HasOne<PathSet>()
            .WithMany()
            .HasForeignKey(p => p.PathSetId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Narrative event override composites ───────────────────────────────

        modelBuilder.Entity<EventOverridePath>()
            .HasKey(x => new { x.EventOverrideId, x.PathId });

        // ── Cascade deletes ────────────────────────────────────────────────────

        // Deleting a PathSet cascades to its Paths, which cascades to PathEventScope
        // and EventOverridePath records referencing those Paths.
        modelBuilder.Entity<NarrativePath>()
            .HasOne<PathSet>()
            .WithMany()
            .HasForeignKey(p => p.PathSetId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PathSetContext>()
            .HasOne<PathSet>()
            .WithMany()
            .HasForeignKey(c => c.PathSetId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PathEventScope>()
            .HasOne<NarrativePath>()
            .WithMany()
            .HasForeignKey(s => s.PathId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EventOverridePath>()
            .HasOne<NarrativePath>()
            .WithMany()
            .HasForeignKey(op => op.PathId)
            .OnDelete(DeleteBehavior.Cascade);

        // Deleting an override cascades to all four collection tables.
        modelBuilder.Entity<EventOverridePath>()
            .HasOne<NarrativeEventOverride>()
            .WithMany()
            .HasForeignKey(op => op.EventOverrideId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EventOverrideConnection>()
            .HasOne<NarrativeEventOverride>()
            .WithMany()
            .HasForeignKey(oc => oc.EventOverrideId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EventOverrideEntityLink>()
            .HasOne<NarrativeEventOverride>()
            .WithMany()
            .HasForeignKey(ol => ol.EventOverrideId)
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
        return await base.SaveChangesAsync(acceptAllChangesOnSuccess, ct);
    }

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
