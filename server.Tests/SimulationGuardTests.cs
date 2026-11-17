using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Tests;

/// <summary>M1: history version and Live-campaign locks, enforced in AppDbContext.SaveChangesAsync.</summary>
public class SimulationGuardTests : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    private const string Cid = "c1";

    public SimulationGuardTests()
    {
        _conn.Open();
        using var db = Db();
        db.Database.EnsureCreated();
        db.Campaigns.Add(new Campaign { Id = Cid, Name = "Test" });
        db.Factions.Add(new Faction { Id = "keepers", CampaignId = Cid, Name = "Order", FactionSize = 13 });
        db.Characters.Add(new Character { Id = "jorren", CampaignId = Cid, Name = "Jorren", Pressure = 50, FactionId = "keepers" });
        db.Sessions.Add(new Session { Id = "s1", CampaignId = Cid, Number = 1, Title = "S1" });
        db.Events.Add(new Event { Id = "e1", SessionId = "s1", Title = "Raid" });
        db.RulesConfigs.Add(new RulesConfig { Id = "r1", CampaignId = Cid });
        db.SaveChanges();
    }

    private AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_conn).Options);
    private long Version() { using var db = Db(); return db.Campaigns.Single(c => c.Id == Cid).HistoryVersion; }
    private void GoLive() { using var db = Db(); db.Campaigns.Single().Mode = CampaignMode.Live; db.SaveChanges(); }

    public void Dispose() => _conn.Dispose();

    [Fact]
    public void Simulation_writes_bump_history_version_including_effects_via_their_session()
    {
        var v0 = Version();
        using (var db = Db()) { db.Factions.Single().FactionSize = 20; db.SaveChanges(); }
        Assert.Equal(v0 + 1, Version());
        using (var db = Db()) { db.EventEffects.Add(new EventEffect { EventId = "e1", TargetType = "colony", TargetId = "colony", Property = "stress", Delta = 1 }); db.SaveChanges(); }
        Assert.Equal(v0 + 2, Version());
    }

    [Fact]
    public void Design_campaign_allows_baseline_edits_and_deletes()
    {
        using var db = Db();
        db.Characters.Single().Pressure = 90;
        db.SaveChanges();
        db.Characters.Remove(db.Characters.Single());
        db.SaveChanges();
        Assert.Empty(db.Characters);
    }

    [Fact]
    public void Live_campaign_rejects_locked_field_change_made_through_a_detached_PUT_style_attach()
    {
        GoLive();
        using var db = Db();
        // PUT handlers attach the incoming entity as Modified; the guard must compare against the database.
        var incoming = new Character { Id = "jorren", CampaignId = Cid, Name = "Jorren", Pressure = 95, FactionId = "keepers" };
        db.Entry(incoming).State = EntityState.Modified;
        var ex = Assert.Throws<LiveCampaignViolationException>(() => db.SaveChanges());
        Assert.Contains("Pressure", ex.Message);
    }

    [Fact]
    public void Live_campaign_locks_the_starting_Momentum_tier()   // M3: a baseline field the GM sets in Design mode
    {
        using (var db = Db()) { db.Factions.Single().MomentumTier = -2; db.SaveChanges(); }   // Design: allowed
        GoLive();
        using var live = Db();
        live.Factions.Single().MomentumTier = 1;
        var ex = Assert.Throws<LiveCampaignViolationException>(() => live.SaveChanges());
        Assert.Contains("MomentumTier", ex.Message);
    }

    [Fact]
    public void Live_campaign_locks_goal_outcome_mode_but_not_its_descriptive_text()   // M4
    {
        using (var db = Db()) { db.FactionGoals.Add(new FactionGoal { Id = "g1", CampaignId = Cid, FactionId = "keepers", Title = "Hold" }); db.SaveChanges(); }
        GoLive();
        using (var db = Db()) { db.FactionGoals.Single().Title = "Hold the Spire"; db.SaveChanges(); }
        using var live = Db();
        live.FactionGoals.Single().OutcomeMode = GoalOutcomeMode.Adjudicated;
        Assert.Contains("OutcomeMode", Assert.Throws<LiveCampaignViolationException>(() => live.SaveChanges()).Message);
    }

    [Fact]
    public void Live_campaign_allows_descriptive_edits()
    {
        GoLive();
        using var db = Db();
        var c = db.Characters.Single();
        c.Summary = "Loyal but conflicted watchman";
        c.Name = "Jorren Vale";
        db.SaveChanges();
        Assert.Equal("Jorren Vale", Db().Characters.Single().Name);
    }

    [Fact]
    public void Live_campaign_rejects_deletes_and_unintroduced_additions()
    {
        GoLive();
        using (var db = Db())
        {
            db.Factions.Remove(db.Factions.Single());
            Assert.Throws<LiveCampaignViolationException>(() => db.SaveChanges());
        }
        using (var db = Db())
        {
            db.Characters.Add(new Character { Id = "new", CampaignId = Cid, Name = "Newcomer" });
            Assert.Throws<LiveCampaignViolationException>(() => db.SaveChanges());
        }
        using (var db = Db())
        {
            db.Characters.Add(new Character { Id = "new2", CampaignId = Cid, Name = "Newcomer", IntroducedAtEventId = "e1" });
            db.SaveChanges();
        }
        Assert.Equal(2, Db().Characters.Count());
    }

    [Fact]
    public void Live_campaign_rules_change_only_when_versioning()
    {
        GoLive();
        using (var db = Db())
        {
            db.RulesConfigs.Single().BeliefMatch = 9;
            Assert.Throws<LiveCampaignViolationException>(() => db.SaveChanges());
        }
        using (var db = Db())
        {
            db.RulesConfigs.Single().BeliefMatch = 9;
            db.RulesVersions.Add(new RulesVersion { CampaignId = Cid, Version = 2, EffectiveFromEventId = "e1", RulesJson = "{}" });
            db.AllowRulesVersioning = true;
            db.SaveChanges();
        }
        Assert.Equal(9, Db().RulesConfigs.Single().BeliefMatch);
    }

    [Fact]
    public void Live_campaign_freezes_relationship_overrides_and_committed_colony_turns()
    {
        using (var db = Db())
        {
            db.ColonyTurns.Add(new ColonyTurn { Id = "t1", CampaignId = Cid, SessionId = "s1", EventId = "e1", Status = ColonyTurnStatus.Committed });
            db.SaveChanges();
        }
        GoLive();
        using (var db = Db())
        {
            db.RelationshipOverrides.Add(new RelationshipOverride { CampaignId = Cid, SourceId = "keepers", TargetId = "party", ScoreBump = 2 });
            Assert.Throws<LiveCampaignViolationException>(() => db.SaveChanges());
        }
        using (var db = Db())
        {
            db.ColonyTurns.Single().Seed = 42;
            Assert.Throws<LiveCampaignViolationException>(() => db.SaveChanges());
        }
    }
}
