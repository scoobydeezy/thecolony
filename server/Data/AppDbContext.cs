using ColonyTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Faction> Factions => Set<Faction>();
    public DbSet<ColonyState> ColonyStates => Set<ColonyState>();
    public DbSet<RelationshipOverride> RelationshipOverrides => Set<RelationshipOverride>();
    public DbSet<RulesConfig> RulesConfigs => Set<RulesConfig>();
    public DbSet<SessionLogEntry> SessionLog => Set<SessionLogEntry>();
    public DbSet<Character> Characters => Set<Character>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<EventEffect> EventEffects => Set<EventEffect>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
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

    }
}
