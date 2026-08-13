using ColonyTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

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
    public DbSet<EventOverrideThread> EventOverrideThreads => Set<EventOverrideThread>();
    public DbSet<EventOverrideEntityLink> EventOverrideEntityLinks => Set<EventOverrideEntityLink>();

    // ── Narrative content ─────────────────────────────────────────────────────
    public DbSet<NarrativeThread> NarrativeThreads => Set<NarrativeThread>();
    public DbSet<NarrativeEvent> NarrativeEvents => Set<NarrativeEvent>();
    public DbSet<NarrativeEventConnection> NarrativeEventConnections => Set<NarrativeEventConnection>();
    public DbSet<NarrativeThreadEvent> NarrativeThreadEvents => Set<NarrativeThreadEvent>();
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

        modelBuilder.Entity<EventOverrideThread>()
            .HasKey(x => new { x.EventOverrideId, x.NarrativeThreadId });

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

        modelBuilder.Entity<EventOverrideThread>()
            .HasOne<NarrativeEventOverride>()
            .WithMany()
            .HasForeignKey(ot => ot.EventOverrideId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EventOverrideEntityLink>()
            .HasOne<NarrativeEventOverride>()
            .WithMany()
            .HasForeignKey(ol => ol.EventOverrideId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Legacy narrative join composites ──────────────────────────────────

        modelBuilder.Entity<NarrativeThreadEvent>()
            .HasKey(x => new { x.NarrativeThreadId, x.NarrativeEventId });

        modelBuilder.Entity<NarrativeEventPlacement>()
            .HasKey(x => x.NarrativeEventId);
    }
}
