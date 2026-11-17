using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ColonyTracker.Api.Tests;

/// <summary>§18.8: one active assignment per champion; legacy duplicates survive unrelated edits.</summary>
public class ChampionRulesTests : IDisposable
{
    private readonly SqliteConnection _conn = new("Data Source=:memory:");
    private const string Cid = "c1";

    public ChampionRulesTests()
    {
        _conn.Open();
        using var db = Db();
        db.Database.EnsureCreated();
        db.Campaigns.Add(new Campaign { Id = Cid, Name = "Test" });
        db.Characters.Add(new Character { Id = "julian", CampaignId = Cid, Name = "Julian Arrett", FactionId = "seekers" });
        db.Characters.Add(new Character { Id = "asha", CampaignId = Cid, Name = "Asha Weaver", FactionId = "seekers" });
        // legacy data: Julian champions two active goals
        db.FactionGoals.Add(Goal("order", "Sunset the Order", "julian", GoalStatus.Progressing));
        db.FactionGoals.Add(Goal("ritual", "Stop the Ritual", "julian", GoalStatus.Plotting));
        db.FactionGoals.Add(Goal("funds", "Manage Reform Funds", "asha", GoalStatus.Progressing, GoalConditionType.Maintain));
        db.FactionGoals.Add(Goal("done", "An old victory", "asha", GoalStatus.Accomplished));
        db.SaveChanges();
    }

    private static FactionGoal Goal(string id, string title, string? champ, GoalStatus status, GoalConditionType type = GoalConditionType.Achieve) =>
        new() { Id = id, CampaignId = Cid, FactionId = "seekers", Title = title, ChampionId = champ, Status = status, ConditionType = type };
    private AppDbContext Db() => new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_conn).Options);
    private FactionGoal Stored(string id) { using var db = Db(); return db.FactionGoals.AsNoTracking().Single(g => g.Id == id); }
    private async Task<string?> Check(FactionGoal g, FactionGoal? prev) { using var db = Db(); return await ChampionRules.ConflictAsync(db, g, prev); }

    [Fact]
    public async Task A_new_goal_cannot_take_a_champion_who_already_holds_an_active_assignment_of_either_type()
    {
        Assert.Contains("already champions", await Check(Goal("n1", "New", "julian", GoalStatus.Plotting), null));
        Assert.Contains("Manage Reform Funds", await Check(Goal("n2", "New", "asha", GoalStatus.Plotting), null));                       // Maintain blocks Achieve
        Assert.NotNull(await Check(Goal("n3", "New", "julian", GoalStatus.Plotting, GoalConditionType.Maintain), null));                  // Achieve blocks Maintain
        Assert.Null(await Check(Goal("n4", "New", null, GoalStatus.Plotting), null));                                                     // unassigned is fine
        Assert.Null(await Check(Goal("n5", "New", "julian", GoalStatus.Retired), null));                                                  // a terminal goal occupies no one
    }

    [Fact]
    public async Task Legacy_duplicates_survive_unrelated_edits_but_a_new_duplicate_is_refused()
    {
        var order = Stored("order");
        var edited = Goal("order", "Sunset the Order (renamed)", "julian", GoalStatus.Progressing);
        Assert.Null(await Check(edited, order));                                                                            // unrelated edit
        Assert.NotNull(await Check(Goal("funds", "Manage Reform Funds", "julian", GoalStatus.Progressing, GoalConditionType.Maintain), Stored("funds")));   // reassignment to Julian
    }

    [Fact]
    public async Task Terminal_goals_release_their_champion_and_reactivating_one_is_validated()
    {
        // Asha's Accomplished goal does not occupy her; but reopening it while she holds "Manage Reform Funds" is a new duplicate
        Assert.NotNull(await Check(Goal("done", "An old victory", "asha", GoalStatus.Progressing), Stored("done")));
        using (var db = Db()) { db.FactionGoals.Single(g => g.Id == "funds").Status = GoalStatus.Retired; db.SaveChanges(); }
        Assert.Null(await Check(Goal("done", "An old victory", "asha", GoalStatus.Progressing), Stored("done")));
        // clearing Julian from one goal frees him for another
        using (var db = Db()) { db.FactionGoals.Single(g => g.Id == "ritual").ChampionId = null; db.FactionGoals.Single(g => g.Id == "order").ChampionId = null; db.SaveChanges(); }
        Assert.Null(await Check(Goal("n6", "New", "julian", GoalStatus.Plotting), null));
    }

    [Fact]
    public void Active_means_not_Accomplished_Failed_or_Retired_and_the_legacy_Stalled_status_counts_as_active()
    {
        Assert.True(ChampionRules.IsActive(GoalStatus.Plotting));
        Assert.True(ChampionRules.IsActive(GoalStatus.Progressing));
        Assert.True(ChampionRules.IsActive(GoalStatus.Stalled));
        Assert.False(ChampionRules.IsActive(GoalStatus.Accomplished));
        Assert.False(ChampionRules.IsActive(GoalStatus.Failed));
        Assert.False(ChampionRules.IsActive(GoalStatus.Retired));
    }

    public void Dispose() => _conn.Dispose();
}
