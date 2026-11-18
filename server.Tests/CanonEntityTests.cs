using System.Text.Json;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using ColonyTracker.Api.Services.Canon;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Tests;

// ADVENTURE-BOOK-PLAN.md §10: factions, Assets and locations live in canonical .yaml files, and
// files refer to each other by canonical id while the app's rows keep using row ids.
public class CanonEntityTests : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    private readonly TestCanon _canon = new();
    private const string Cid = "c1";

    public CanonEntityTests()
    {
        _conn.Open();
        using var db = _canon.Db(_conn);
        db.Database.EnsureCreated();
        db.Campaigns.Add(new Campaign { Id = Cid, Name = "Test" });
        db.SaveChanges();
    }

    public void Dispose() { _conn.Dispose(); _canon.Dispose(); }

    private void SeedWorld()
    {
        using var db = _canon.Db(_conn);
        // Created together in one save: references between new rows resolve before any file is written.
        db.Factions.Add(new Faction { Id = "keepers", CampaignId = Cid, Name = "The Order of Theia", Motto = "Until the Veil is Lifted", MomentumTier = 1, FactionSize = 220,
            TruthValue = 0.121, StabilityValue = 0.879, AgencyValue = 0.0, BeliefC = BeliefPosition.Positive,
            History = "First paragraph.\n\nSecond paragraph.", PrimaryColor = "#dedede", LeaderId = "guid-serevan" });
        db.Characters.Add(new Character { Id = "guid-serevan", CampaignId = Cid, Name = "Serevan Ilvar", FactionId = "keepers" });
        db.Locations.Add(new Location { Id = "guid-memorial", CampaignId = Cid, Name = "Memorial Building" });
        db.Locations.Add(new Location { Id = "guid-chamber", CampaignId = Cid, Name = "Ritual Chamber", ParentLocationId = "guid-memorial", LinkedAssetId = "guid-asset-chamber" });
        db.Assets.Add(new Asset { Id = "guid-asset-chamber", CampaignId = Cid, Name = "The Ritual Chamber", Tier = 5, ControllingFactionId = "keepers", LocationId = "guid-memorial" });
        db.Assets.Add(new Asset { Id = "guid-book", CampaignId = Cid, Name = "Book of Names", Type = AssetType.Artifact, Role = AssetRole.Mandate, Tier = 5, Keystone = true,
            ControllingFactionId = "keepers", LocationId = "guid-chamber", Description = "The oldest artifact." });
        db.SaveChanges();
    }

    [Fact]
    public void Entities_are_written_with_canonical_references_and_read_back_with_row_ids()
    {
        SeedWorld();
        var faction = File.ReadAllText(_canon.File("faction.order-of-theia"));
        Assert.StartsWith("# yaml-language-server: $schema=../../../schemas/faction.schema.json\nid: faction.order-of-theia\n", faction);
        Assert.Contains("  leader: npc.serevan-ilvar\n", faction);
        Assert.Contains("history: |-\n  First paragraph.\n\n  Second paragraph.\n", faction);   // prose stays readable
        Assert.Contains("  primaryColor: \"#dedede\"\n", faction);
        var book = File.ReadAllText(_canon.File("asset.book-of-names"));
        Assert.Contains("  controller: faction.order-of-theia\n  location: location.ritual-chamber\n", book);
        var chamber = File.ReadAllText(_canon.File("location.ritual-chamber"));
        Assert.Contains("parent: location.memorial-building\nasset: asset.ritual-chamber\n", chamber);   // "The" dropped from the Asset's id
        Assert.Contains("  faction: faction.order-of-theia\n", File.ReadAllText(_canon.File("npc.serevan-ilvar")));
        // No app id ever reaches a file.
        foreach (var f in Directory.EnumerateFiles(_canon.Dir, "*", SearchOption.AllDirectories))
            Assert.DoesNotContain("guid-", File.ReadAllText(f));

        // A fresh context: the interceptor translates back to this campaign's row ids mid-query.
        using var db = _canon.Db(_conn);
        var f2 = db.Factions.Single();
        Assert.Equal(("The Order of Theia", "guid-serevan", 1, 220, 0.121, BeliefPosition.Positive, "First paragraph.\n\nSecond paragraph."),
            (f2.Name, f2.LeaderId, f2.MomentumTier, f2.FactionSize, f2.TruthValue, f2.BeliefC, f2.History));
        var a = db.Assets.Single(x => x.Id == "guid-book");
        Assert.Equal(("keepers", "guid-chamber", AssetRole.Mandate, true, "The oldest artifact."), (a.ControllingFactionId, a.LocationId, a.Role, a.Keystone, a.Description));
        var l = db.Locations.Single(x => x.Id == "guid-chamber");
        Assert.Equal(("guid-memorial", "guid-asset-chamber"), (l.ParentLocationId, l.LinkedAssetId));
        Assert.Equal("keepers", db.Characters.Single().FactionId);
        var columns = db.Database.SqlQueryRaw<string>("SELECT name AS Value FROM pragma_table_info('Factions')").ToList();
        Assert.DoesNotContain("Name", columns);
        Assert.Contains("SortOrder", columns);
    }

    [Fact]
    public void A_reference_to_a_row_with_no_file_is_refused()
    {
        using var db = _canon.Db(_conn);
        db.Assets.Add(new Asset { Id = "a1", CampaignId = Cid, Name = "Orphan", ControllingFactionId = "no-such-faction" });
        var ex = Assert.Throws<CanonValidationException>(() => db.SaveChanges());
        Assert.Contains("no-such-faction", ex.Message);
        Assert.False(File.Exists(_canon.File("asset.orphan")));
    }

    [Fact]
    public void A_faction_baseline_is_locked_in_a_live_campaign_but_prose_stays_editable()
    {
        SeedWorld();
        using (var db = _canon.Db(_conn)) { db.Campaigns.Single().Mode = CampaignMode.Live; db.SaveChanges(); }
        using (var db = _canon.Db(_conn))
        {
            var f = db.Factions.Single();
            f.MomentumTier = 2;
            Assert.Throws<LiveCampaignViolationException>(() => db.SaveChanges());
        }
        using (var db = _canon.Db(_conn))
        {
            var f = db.Factions.Single();
            f.Motto = "Until the Veil is lifted";
            db.SaveChanges();
        }
        Assert.Contains("motto: Until the Veil is lifted\n", File.ReadAllText(_canon.File("faction.order-of-theia")));
    }

    [Fact]
    public void A_detached_update_keeps_fields_the_app_does_not_own()
    {
        SeedWorld();
        var path = _canon.File("location.ritual-chamber");
        File.WriteAllText(path, File.ReadAllText(path).Replace("status: draft\n", "status: stub\n") + "provenance:\n  - doc: Encounters\n    heading: The Reading\n");
        _canon.Store.Refresh(force: true);   // scans are throttled to 300 ms; an edit inside that window reads as a conflict
        using (var db = _canon.Db(_conn))
        {
            var loaded = db.Locations.AsNoTracking().Single(x => x.Id == "guid-chamber");
            loaded.Description = "A hidden chamber.";
            loaded.CanonId = null;   // a PUT body need not carry the link
            db.Entry(loaded).State = EntityState.Modified;
            db.SaveChanges();
        }
        var text = File.ReadAllText(path);
        Assert.Contains("summary: A hidden chamber.\n", text);
        Assert.Contains("status: stub\n", text);
        Assert.Contains("heading: The Reading", text);
        Assert.Single(Directory.EnumerateFiles(Path.Combine(_canon.Dir, "locations"), "ritual-chamber*"));
    }

    [Fact]
    public void Deleting_an_entity_deletes_its_file()
    {
        SeedWorld();
        using (var db = _canon.Db(_conn)) { db.Assets.Remove(db.Assets.Single(x => x.Id == "guid-book")); db.SaveChanges(); }
        Assert.False(File.Exists(_canon.File("asset.book-of-names")));
        Assert.True(File.Exists(_canon.File("asset.ritual-chamber")));
    }

    [Fact]
    public void A_second_campaign_links_the_same_files_and_resolves_its_own_rows()
    {
        SeedWorld();
        using (var db = _canon.Db(_conn))
        {
            db.Campaigns.Add(new Campaign { Id = "c2", Name = "Second" });
            foreach (var (row, id) in new (ICanonEntity, string)[] {
                (new Faction { Id = "f2", CampaignId = "c2" }, "faction.order-of-theia"),
                (new Character { Id = "ch2", CampaignId = "c2" }, "npc.serevan-ilvar") })
            {
                row.CanonId = id;
                _canon.Store.TryGet(id, out var e);
                CanonMapping.Hydrate(row, e, refs: null);
                db.Add(row);
            }
            var before = File.ReadAllText(_canon.File("faction.order-of-theia"));
            db.SaveChanges();
            Assert.Equal(before, File.ReadAllText(_canon.File("faction.order-of-theia")));   // linking writes nothing
        }
        using var db2 = _canon.Db(_conn);
        Assert.Equal("ch2", db2.Factions.Single(f => f.CampaignId == "c2").LeaderId);
        Assert.Equal("f2", db2.Characters.Single(c => c.CampaignId == "c2").FactionId);
        Assert.Equal("guid-serevan", db2.Factions.Single(f => f.CampaignId == Cid).LeaderId);
    }

    // The files the merge script wrote must survive an unchanged app save byte for byte, so the
    // first edit from the app changes only the lines it edits.
    [Fact]
    public void Every_content_file_survives_an_unchanged_app_save_byte_for_byte()
    {
        // CANON_TEST_CONTENT points at another content folder (e.g. a merge's staging output).
        var dir = Environment.GetEnvironmentVariable("CANON_TEST_CONTENT") is { Length: > 0 } d ? d : Path.Combine(TestCanon.SchemaDir, "..", "src", "content");
        var store = new CanonStore(dir, TestCanon.SchemaDir);
        Assert.Empty(store.Errors());
        var refs = new CanonRefs();
        var checkedFiles = 0;
        foreach (var e in store.All())
        {
            ICanonEntity entity = e.Kind switch
            {
                "npc" or "pc" => new Character(), "faction" => new Faction(), "asset" => new Asset(), "location" => new Location(), "goal" => new FactionGoal(),
                "event" or "encounter" => new NarrativeEvent(), "thread" => new NarrativeThread(), "branch" => new PathSet(), "condition" => new WorldCondition(),
                _ => throw new InvalidOperationException(e.Kind),
            };
            entity.CanonId = e.Id;
            CanonMapping.Hydrate(entity, e, refs, store);
            var text = File.ReadAllText(e.File);
            var doc = CanonStore.Parse(text, e.Kind);
            CanonMapping.Apply(entity, doc, refs, store);
            Assert.Equal(text, CanonStore.Serialize(doc, e.Kind));
            checkedFiles++;
        }
        Assert.True(checkedFiles > 0);
    }

    // The enum names the files use are the C# enum names.
    [Theory]
    [InlineData("faction", "properties.type", typeof(GroupType))]
    [InlineData("faction", "properties.start.properties.beliefs.properties.a", typeof(BeliefPosition))]
    [InlineData("asset", "properties.type", typeof(AssetType))]
    [InlineData("asset", "properties.role", typeof(AssetRole))]
    [InlineData("asset", "properties.start.properties.status", typeof(AssetStatus))]
    [InlineData("location", "properties.start.properties.state", typeof(LocationState))]
    [InlineData("npc", "properties.start.properties.instability", typeof(CharacterInstability))]
    [InlineData("goal", "properties.start.properties.status", typeof(GoalStatus))]
    [InlineData("goal", "properties.type", typeof(GoalConditionType))]
    [InlineData("goal", "properties.priority", typeof(GoalPriority))]
    [InlineData("goal", "properties.visibility", typeof(GoalVisibility))]
    [InlineData("goal", "properties.outcome", typeof(GoalOutcomeMode))]
    [InlineData("goal", "properties.target.properties.type", typeof(GoalTargetEntityType))]
    [InlineData("event", "properties.visibility", typeof(NarrativeVisibility))]
    public void Schema_enums_match_the_app(string kind, string path, Type enumType)
    {
        var node = JsonDocument.Parse(File.ReadAllText(Path.Combine(TestCanon.SchemaDir, $"{kind}.schema.json"))).RootElement;
        foreach (var key in path.Split('.')) node = node.GetProperty(key);
        var names = node.GetProperty("enum").EnumerateArray().Select(x => x.GetString()).ToArray();
        Assert.Equal(Enum.GetNames(enumType), names);
    }

    // ---------------------------------------------------------------- §10: one fact, one place

    [Fact]
    public void An_Asset_a_location_stands_for_takes_its_location_from_that_location()
    {
        SeedWorld();
        Assert.DoesNotContain("location:", File.ReadAllText(_canon.File("asset.ritual-chamber")));   // only the location says where
        using (var db = _canon.Db(_conn)) Assert.Equal("guid-memorial", db.Assets.Single(a => a.Id == "guid-asset-chamber").LocationId);

        // Move the place: the Asset follows, and still stores nothing itself.
        using (var db = _canon.Db(_conn))
        {
            db.Locations.Add(new Location { Id = "guid-square", CampaignId = Cid, Name = "Town Square" });
            db.Locations.Single(l => l.Id == "guid-chamber").ParentLocationId = "guid-square";
            db.SaveChanges();
            Assert.Equal("guid-square", db.Assets.AsNoTracking().Single(a => a.Id == "guid-asset-chamber").LocationId);
        }
        Assert.DoesNotContain("location:", File.ReadAllText(_canon.File("asset.ritual-chamber")));

        // Let the Asset go: it keeps the location it had.
        using (var db = _canon.Db(_conn)) { db.Locations.Single(l => l.Id == "guid-chamber").LinkedAssetId = null; db.SaveChanges(); }
        Assert.Contains("  location: location.town-square\n", File.ReadAllText(_canon.File("asset.ritual-chamber")));
        using (var db = _canon.Db(_conn)) Assert.Equal("guid-square", db.Assets.Single(a => a.Id == "guid-asset-chamber").LocationId);

        // Link it again: its own location is removed.
        using (var db = _canon.Db(_conn)) { db.Locations.Single(l => l.Id == "guid-chamber").LinkedAssetId = "guid-asset-chamber"; db.SaveChanges(); }
        Assert.DoesNotContain("location:", File.ReadAllText(_canon.File("asset.ritual-chamber")));

        // Delete the place: the Asset keeps where it was.
        using (var db = _canon.Db(_conn)) { db.Locations.Remove(db.Locations.Single(l => l.Id == "guid-chamber")); db.SaveChanges(); }
        Assert.Contains("  location: location.town-square\n", File.ReadAllText(_canon.File("asset.ritual-chamber")));
    }

    // ---------------------------------------------------------------- §11: goals

    [Fact]
    public void A_goal_is_written_with_canonical_ids_and_its_Effects_read_back_exactly()
    {
        SeedWorld();
        const string accomplished = """[{"targetType":"asset","targetId":"guid-book","property":"locationChange","delta":0,"value":"guid-memorial"},{"targetType":"faction","targetId":"keepers","property":"factionSize","delta":-40}]""";
        using (var db = _canon.Db(_conn))
        {
            db.FactionGoals.Add(new FactionGoal
            {
                Id = "g1", CampaignId = Cid, FactionId = "keepers", Title = "Move the Book", Priority = GoalPriority.Critical, ChampionId = "guid-serevan",
                TargetEntityType = GoalTargetEntityType.Asset, TargetEntityId = "guid-book", TargetOwnerFactionId = "keepers", TargetState = "Contested",
                ProgressingEffectsJson = """[{"targetType":"asset","targetId":"guid-book","property":"status","delta":0,"value":"Contested"}]""",
                AccomplishedEffectsJson = accomplished, Status = GoalStatus.Progressing, EarliestAct = 3,
            });
            db.SaveChanges();
        }
        var text = File.ReadAllText(_canon.File("goal.move-the-book"));
        Assert.Contains("faction: faction.order-of-theia\n", text);
        Assert.Contains("champion: npc.serevan-ilvar\n", text);
        Assert.Contains("target:\n  type: Asset\n  id: asset.book-of-names\n  state: Contested\n  owner: faction.order-of-theia\n", text);
        Assert.Contains("      targetId: asset.book-of-names\n      property: locationChange\n      delta: 0\n      value: location.memorial-building\n", text);
        Assert.Contains("start:\n  status: Progressing\n", text);
        Assert.DoesNotContain("guid-", text);
        Assert.DoesNotContain("keepers\n", text);

        using var db2 = _canon.Db(_conn);
        var g = db2.FactionGoals.Single();
        Assert.Equal(accomplished, g.AccomplishedEffectsJson);   // the exact string the app saved
        Assert.Equal(("keepers", "guid-serevan", "guid-book", GoalStatus.Progressing, 3), (g.FactionId, g.ChampionId, g.TargetEntityId, g.Status, g.EarliestAct));
        var columns = db2.Database.SqlQueryRaw<string>("SELECT name AS Value FROM pragma_table_info('FactionGoals')").ToList();
        Assert.Equal(["CampaignId", "CanonId", "Id", "IntroducedAtEventId"], columns.Order().ToList());   // links and play data only

        // A goal's baseline is live-locked; its title is not.
        db2.Campaigns.Single().Mode = CampaignMode.Live; db2.SaveChanges();
        g.Status = GoalStatus.Accomplished;
        Assert.Throws<LiveCampaignViolationException>(() => db2.SaveChanges());
    }

    [Fact]
    public void A_goal_Effect_naming_something_with_no_file_is_refused()
    {
        SeedWorld();
        using var db = _canon.Db(_conn);
        db.FactionGoals.Add(new FactionGoal { Id = "g2", CampaignId = Cid, FactionId = "keepers", Title = "Bad",
            ProgressingEffectsJson = """[{"targetType":"asset","targetId":"no-such-asset","property":"status","delta":0,"value":"Contested"}]""" });
        Assert.Throws<CanonValidationException>(() => db.SaveChanges());
    }

    // ---------------------------------------------------------------- all-or-nothing saves

    private Dictionary<string, string> Snapshot() =>
        Directory.EnumerateFiles(_canon.Dir, "*", SearchOption.AllDirectories).ToDictionary(f => f, File.ReadAllText);

    [Fact]
    public void A_save_refused_partway_puts_back_every_file_it_already_wrote()
    {
        SeedWorld();
        var before = Snapshot();
        using var db = _canon.Db(_conn);
        db.Factions.Single().Motto = "Written, then put back";                 // an existing file, changed
        db.Locations.Add(new Location { Id = "guid-new", CampaignId = Cid, Name = "New Place" });   // a new file
        db.Assets.Add(new Asset { Id = "a-bad", CampaignId = Cid, Name = "Bad", Tier = 9 });       // refused by the schema
        Assert.Throws<CanonValidationException>(() => db.SaveChanges());
        Assert.Equal(before, Snapshot());
    }

    [Fact]
    public void A_failed_commit_puts_back_every_file_the_save_wrote()
    {
        SeedWorld();
        var before = Snapshot();
        using var db = _canon.Db(_conn);
        db.Factions.Single().Motto = "Written, then put back";
        db.Factions.Add(new Faction { Id = "f-new", CampaignId = Cid, Name = "Lantern Circle" });
        // The files are fine; the database refuses the commit (a duplicate key).
        db.Assets.Add(new Asset { Id = "guid-book", CampaignId = Cid, Name = "Duplicate Book" });
        Assert.ThrowsAny<DbUpdateException>(() => db.SaveChanges());
        Assert.Equal(before, Snapshot());
        Assert.False(File.Exists(_canon.File("faction.lantern-circle")));
    }

    // ---------------------------------------------------------------- one source of truth

    [Fact]
    public void A_file_added_outside_the_app_appears_in_Design_campaigns_without_being_rewritten()
    {
        SeedWorld();
        using (var db = _canon.Db(_conn)) { db.Campaigns.Add(new Campaign { Id = "live", Name = "Live one", Mode = CampaignMode.Live }); db.SaveChanges(); }
        Directory.CreateDirectory(Path.Combine(_canon.Dir, "npcs"));
        var text = "---\nid: npc.willow-stoutfoot\nslug: willow-stoutfoot\nname: Willow Stoutfoot\nsummary: Miriel's grandmother.\nstatus: draft\nstart:\n  faction: faction.order-of-theia\n  state: Forgotten\n  values:\n    truth: 0.5\n    stability: 0.25\n    agency: 0.25\n---\n\n";
        File.WriteAllText(_canon.File("npc.willow-stoutfoot"), text);
        _canon.Store.Refresh(force: true);

        using (var db = _canon.Db(_conn))
        {
            // Too new: it may be a file the app is creating right now.
            Assert.Equal(0, CanonAutoLink.LinkAsync(db, _canon.Store).GetAwaiter().GetResult());
            Assert.Equal(1, CanonAutoLink.LinkAsync(db, _canon.Store, settle: TimeSpan.Zero).GetAwaiter().GetResult());
            Assert.Equal(0, CanonAutoLink.LinkAsync(db, _canon.Store, settle: TimeSpan.Zero).GetAwaiter().GetResult());   // once only
        }
        Assert.Equal(text, File.ReadAllText(_canon.File("npc.willow-stoutfoot")));
        using var db2 = _canon.Db(_conn);
        var w = db2.Characters.Single(c => c.CanonId == "npc.willow-stoutfoot");
        Assert.Equal((Cid, "Willow Stoutfoot", CharacterState.Forgotten, "keepers"), (w.CampaignId, w.Name, w.State, w.FactionId));
        Assert.False(db2.Characters.Any(c => c.CampaignId == "live"));   // Live campaigns introduce entities through Events
    }

    [Fact]
    public void A_file_cannot_be_linked_twice_in_one_campaign()
    {
        SeedWorld();
        using var db = _canon.Db(_conn);
        db.Factions.Add(new Faction { Id = "dup", CampaignId = Cid, CanonId = "faction.order-of-theia", Name = "The Order of Theia" });
        Assert.ThrowsAny<DbUpdateException>(() => db.SaveChanges());
    }

    [Fact]
    public void A_delete_through_the_app_leaves_flaggable_stale_references_and_nothing_else_changes()
    {
        SeedWorld();
        var before = File.ReadAllText(_canon.File("asset.book-of-names"));
        using (var db = _canon.Db(_conn)) { db.Factions.Remove(db.Factions.Single()); db.SaveChanges(); }
        Assert.False(File.Exists(_canon.File("faction.order-of-theia")));
        Assert.Equal(before, File.ReadAllText(_canon.File("asset.book-of-names")));   // never rewritten automatically
        var stale = _canon.Store.All().SelectMany(e => CanonEntityMapping.References(e).Where(r => !_canon.Store.TryGet(r.Id, out _)).Select(r => $"{e.Id} {r.Path}")).Order().ToList();
        Assert.Equal(["asset.book-of-names start.controller", "asset.ritual-chamber start.controller", "npc.serevan-ilvar start.faction"], stale);
        // The app still loads them, showing the canonical id it can't resolve.
        using var db2 = _canon.Db(_conn);
        Assert.Equal("faction.order-of-theia", db2.Assets.Single(a => a.Id == "guid-book").ControllingFactionId);
    }
}

