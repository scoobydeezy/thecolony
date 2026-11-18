using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using ColonyTracker.Api.Services.Canon;
using Microsoft.Data.Sqlite;

namespace ColonyTracker.Api.Tests;

// ADVENTURE-BOOK-PLAN.md §14: a branch is a file declaring its paths; an event's versions, participation
// and scope live in the event's file. A path's app id is its canonical id.
public class CanonBranchTests : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    private readonly TestCanon _canon = new();
    private const string Cid = "c1";

    public CanonBranchTests()
    {
        _conn.Open();
        using var db = _canon.Db(_conn);
        db.Database.EnsureCreated();
        db.Campaigns.Add(new Campaign { Id = Cid, Name = "Test" });
        db.Characters.Add(new Character { Id = "guid-vara", CampaignId = Cid, Name = "Vara Cairn" });
        db.NarrativeThreads.Add(new NarrativeThread { Id = "guid-keeper", CampaignId = Cid, Title = "The Keeper" });
        db.NarrativeEvents.Add(new NarrativeEvent { Id = "guid-reading", CampaignId = Cid, Title = "The Reading", Kind = NarrativeKind.Encounter });
        db.NarrativeEvents.Add(new NarrativeEvent { Id = "guid-manor", CampaignId = Cid, Title = "The Manor", Summary = "A house." });
        db.PathSets.Add(new PathSet { Id = "guid-set", CampaignId = Cid, Name = "The Reading", OriginEventId = "guid-reading" });
        db.SaveChanges();
    }

    public void Dispose() { _conn.Dispose(); _canon.Dispose(); }

    [Fact]
    public async Task Paths_versions_participation_and_scope_live_in_the_files()
    {
        using (var db = _canon.Db(_conn))
        {
            var stopped = await NarrativeBranches.AddPathAsync(db, Cid, new NarrativePath { PathSetId = "guid-set", Name = "The Reading is Stopped" });
            var succeeds = await NarrativeBranches.AddPathAsync(db, Cid, new NarrativePath { PathSetId = "guid-set", Name = "The Reading Succeeds", SortOrder = 0 });
            Assert.Equal(("path.the-reading-is-stopped", "path.the-reading-succeeds"), (stopped.Id, succeeds.Id));
            await NarrativeBranches.SetParticipationAsync(db, Cid, "guid-manor", "guid-set", on: true);
            await NarrativeBranches.SetScopeAsync(db, Cid, stopped.Id, "guid-manor", on: true);
            var v = await NarrativeBranches.AddVersionAsync(db, Cid, new NarrativeEventOverride { NarrativeEventId = "guid-manor", Key = "stopped", OverridesSummary = true, Summary = "A refuge.", OverridesConnections = true });
            Assert.Equal(NarrativeBranches.VariantId("guid-manor", "stopped"), v.Id);
            await NarrativeBranches.SetVersionPathAsync(db, Cid, v.Id, stopped.Id, on: true);
            await NarrativeBranches.AddVersionConnectionAsync(db, Cid, new EventOverrideConnection { EventOverrideId = v.Id, TargetNarrativeEventId = "guid-reading", ThreadId = "guid-keeper" });
            // A version that clears the links (present, empty) is different from one that inherits them.
            var cleared = await NarrativeBranches.AddVersionAsync(db, Cid, new NarrativeEventOverride { NarrativeEventId = "guid-manor", Key = "succeeds", OverridesAssets = true });
            await NarrativeBranches.SetVersionPathAsync(db, Cid, cleared.Id, succeeds.Id, on: true);
        }
        var branch = File.ReadAllText(_canon.File("branch.the-reading"));
        Assert.Contains("origin: encounter.the-reading\npaths:\n  - id: path.the-reading-succeeds\n    name: The Reading Succeeds\n  - id: path.the-reading-is-stopped\n", branch);
        var manor = File.ReadAllText(_canon.File("event.the-manor"));
        Assert.Contains("variesBy:\n  - branch.the-reading\nonPaths:\n  - path.the-reading-is-stopped\nvariants:\n  - key: stopped\n    when:\n      - path.the-reading-is-stopped\n    summary: A refuge.\n    leadsTo:\n      - to: encounter.the-reading\n        thread: thread.the-keeper\n  - key: succeeds\n    when:\n      - path.the-reading-succeeds\n    links: []\n", manor);
        foreach (var f in Directory.EnumerateFiles(_canon.Dir, "*", SearchOption.AllDirectories)) Assert.DoesNotContain("guid-", File.ReadAllText(f));

        using (var db = _canon.Db(_conn))
        {
            var versions = await NarrativeBranches.VersionsAsync(db, Cid);
            Assert.Equal(2, versions.Count);
            var s = versions.Single(x => x.Override.Key == "stopped");
            Assert.Equal((true, "A refuge.", false, true, false), (s.Override.OverridesSummary, s.Override.Summary, s.Override.OverridesDescription, s.Override.OverridesConnections, s.Override.OverridesAssets));
            Assert.Equal(("guid-reading", "guid-keeper"), (s.Connections.Single().TargetNarrativeEventId, s.Connections.Single().ThreadId));
            var c = versions.Single(x => x.Override.Key == "succeeds");
            Assert.True(c.Override.OverridesAssets);
            Assert.Empty(c.Links);
            Assert.Single(await NarrativeBranches.ParticipationAsync(db, Cid));
            Assert.Equal("path.the-reading-is-stopped", (await NarrativeBranches.ScopesAsync(db, Cid)).Single().PathId);
            Assert.Equal(["path.the-reading-succeeds", "path.the-reading-is-stopped"], (await NarrativeBranches.PathsAsync(db, Cid)).Select(p => p.Id));

            // Turning the switch off removes the field: the version inherits again.
            await NarrativeBranches.UpdateVersionAsync(db, Cid, c.Override.Id, new NarrativeEventOverride { Id = c.Override.Id });
        }
        Assert.DoesNotContain("links: []", File.ReadAllText(_canon.File("event.the-manor")));
    }

    [Fact]
    public async Task Deleting_a_path_leaves_versions_that_name_it_flagged()
    {
        using var db = _canon.Db(_conn);
        var p = await NarrativeBranches.AddPathAsync(db, Cid, new NarrativePath { PathSetId = "guid-set", Name = "Gone" });
        var v = await NarrativeBranches.AddVersionAsync(db, Cid, new NarrativeEventOverride { NarrativeEventId = "guid-manor", OverridesSummary = true, Summary = "x" });
        Assert.StartsWith("version-", (await NarrativeBranches.VersionsAsync(db, Cid)).Single().Override.Key);
        await NarrativeBranches.SetVersionPathAsync(db, Cid, v.Id, p.Id, on: true);
        await NarrativeBranches.RemovePathAsync(db, Cid, p.Id);
        Assert.Empty(await NarrativeBranches.PathsAsync(db, Cid));
        var manor = _canon.Store.All("event").Single(e => e.Id == "event.the-manor");
        Assert.Contains(CanonEntityMapping.References(manor), r => r.Id == "path.gone");
    }
}
