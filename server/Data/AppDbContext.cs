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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ColonyState>().HasKey(x => x.Id);
        modelBuilder.Entity<RulesConfig>().HasKey(x => x.Id);
    }
}
