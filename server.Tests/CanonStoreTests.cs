using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using ColonyTracker.Api.Services.Canon;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Tests;

// ADVENTURE-BOOK-PLAN.md §9 step 4: characters live only in canonical files. The app reads and
// saves them through EF exactly as before; the Characters table keeps the link and play data.
public class CanonStoreTests : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    private readonly TestCanon _canon = new();
    private const string Cid = "c1";

    public CanonStoreTests()
    {
        _conn.Open();
        using var db = _canon.Db(_conn);
        db.Database.EnsureCreated();
        db.Campaigns.Add(new Campaign { Id = Cid, Name = "Test" });
        // Row id "keepers"; its file is faction.order-of-theia. Characters refer to it by row id in
        // the app and by canonical id in their files.
        db.Factions.Add(new Faction { Id = "keepers", CampaignId = Cid, Name = "The Order of Theia" });
        db.SaveChanges();
    }

    public void Dispose() { _conn.Dispose(); _canon.Dispose(); }

    private Character Kelda() => new()
    {
        Id = "guid-kelda", CampaignId = Cid, Name = "Kelda Varruk", Occupation = "Captain of the Guard", Ancestry = "Dwarf", Class = "Fighter",
        Level = 13, Age = 112, Aliases = "Doors", NarrativeTier = NarrativeTier.Major, FactionId = "keepers",
        TruthValue = 0.6506540826617453, StabilityValue = 0.25, AgencyValue = 0.0993459173382547, BeliefB = BeliefPosition.Negative,
        DoubtDirection = DoubtDirection.AB, Conviction = 75, Pressure = 65,
    };

    [Fact]
    public void A_new_character_is_written_to_a_file_and_read_back_whole()
    {
        using (var db = _canon.Db(_conn)) { db.Characters.Add(Kelda()); db.SaveChanges(); }
        var file = _canon.File("npc.kelda-varruk");
        Assert.True(File.Exists(file));
        var text = File.ReadAllText(file);
        Assert.Contains("id: npc.kelda-varruk", text);
        Assert.Contains("truth: 0.6506540826617453", text);   // exact, not rounded
        Assert.Contains("origin: prepared", text);
        Assert.Contains("faction: faction.order-of-theia", text);   // canonical id in the file, never the row id

        using var db2 = _canon.Db(_conn);
        var c = db2.Characters.Single();
        Assert.Equal(("npc.kelda-varruk", "Kelda Varruk", "Dwarf", 13, "keepers", 0.6506540826617453, DoubtDirection.AB, BeliefPosition.Negative),
            (c.CanonId, c.Name, c.Ancestry, c.Level, c.FactionId, c.TruthValue, c.DoubtDirection, c.BeliefB));
        Assert.NotNull(c.CanonVersion);
        // The table holds no character data any more.
        var columns = db2.Database.SqlQueryRaw<string>("SELECT name AS Value FROM pragma_table_info('Characters')").ToList();
        Assert.DoesNotContain("Name", columns);
        Assert.Contains("CanonId", columns);
    }

    [Fact]
    public void Editing_a_tracked_character_saves_its_file()
    {
        using (var db = _canon.Db(_conn)) { db.Characters.Add(Kelda()); db.SaveChanges(); }
        using (var db = _canon.Db(_conn)) { db.Characters.Single().Summary = "Wry, capable commander."; db.SaveChanges(); }
        Assert.Contains("summary: Wry, capable commander.", File.ReadAllText(_canon.File("npc.kelda-varruk")));
        using var db3 = _canon.Db(_conn);
        Assert.Equal("Wry, capable commander.", db3.Characters.Single().Summary);
    }

    [Fact]
    public void An_app_save_keeps_what_the_app_does_not_own()
    {
        Directory.CreateDirectory(Path.Combine(_canon.Dir, "npcs"));
        File.WriteAllText(_canon.File("npc.kelda-varruk"), """
            ---
            id: npc.kelda-varruk
            slug: kelda-varruk
            name: Kelda Varruk
            title: Captain
            ancestry: Dwarf
            class: Fighter
            level: 13
            status: canonical
            provenance:
              - { doc: Character Briefs, heading: Captain of the Guard - Kelda Varruk }
            design: Kept out of the GM book.
            ---

            ## Overview

            The Captain commands the Colony’s guard.

            ## Relationship to the Order

            :::player-facing
            She respects hierarchy.
            :::
            """);
        using (var db = _canon.Db(_conn))
        {
            db.Characters.Add(new Character { Id = "guid-kelda", CampaignId = Cid, CanonId = "npc.kelda-varruk" });
            db.Database.ExecuteSqlRaw("INSERT INTO Characters (Id, CampaignId, CanonId) VALUES ('guid-kelda', 'c1', 'npc.kelda-varruk')");
        }
        using (var db = _canon.Db(_conn)) { db.Characters.Single().Gender = "Female"; db.SaveChanges(); }

        var text = File.ReadAllText(_canon.File("npc.kelda-varruk"));
        Assert.Contains("gender: Female", text);
        Assert.Contains("title: Captain", text);
        Assert.Contains("status: canonical", text);
        Assert.Contains("heading: Captain of the Guard - Kelda Varruk", text);
        Assert.Contains("design: Kept out of the GM book.", text);
        Assert.Contains("## Overview\n\nThe Captain commands the Colony’s guard.", text);
        Assert.Contains(":::player-facing\nShe respects hierarchy.\n:::", text);
    }

    [Fact]
    public void A_file_changed_outside_the_app_is_not_overwritten()
    {
        using (var db = _canon.Db(_conn)) { db.Characters.Add(Kelda()); db.SaveChanges(); }
        using var db2 = _canon.Db(_conn);
        var c = db2.Characters.Single();                                   // loaded at version A
        var file = _canon.File("npc.kelda-varruk");
        File.WriteAllText(file, File.ReadAllText(file).Replace("age: 112", "age: 113"));   // edited in VS Code
        _canon.Store.Refresh(force: true);
        c.Summary = "From the app.";
        Assert.Throws<CanonConflictException>(() => db2.SaveChanges());
        Assert.Contains("age: 113", File.ReadAllText(file));
        Assert.DoesNotContain("From the app.", File.ReadAllText(file));
    }

    [Fact]
    public void A_save_that_breaks_the_schema_is_refused()
    {
        using (var db = _canon.Db(_conn)) { db.Characters.Add(Kelda()); db.SaveChanges(); }
        var before = File.ReadAllText(_canon.File("npc.kelda-varruk"));
        using var db2 = _canon.Db(_conn);
        db2.Characters.Single().Level = 99;   // schema: level 0..25
        var ex = Assert.Throws<CanonValidationException>(() => db2.SaveChanges());
        Assert.Contains("level", ex.Message);
        Assert.Equal(before, File.ReadAllText(_canon.File("npc.kelda-varruk")));
    }

    [Fact]
    public void Starting_values_are_locked_in_a_live_campaign()
    {
        using (var db = _canon.Db(_conn)) { db.Characters.Add(Kelda()); db.SaveChanges(); }
        using (var db = _canon.Db(_conn)) { db.Campaigns.Single().Mode = CampaignMode.Live; db.SaveChanges(); }
        using (var db = _canon.Db(_conn))
        {
            db.Characters.Single().Pressure = 90;
            Assert.Throws<LiveCampaignViolationException>(() => db.SaveChanges());
        }
        Assert.Contains("pressure: 65", File.ReadAllText(_canon.File("npc.kelda-varruk")));
        using (var db = _canon.Db(_conn)) { db.Characters.Single().Summary = "Descriptive fields stay editable."; db.SaveChanges(); }
        Assert.Contains("Descriptive fields stay editable.", File.ReadAllText(_canon.File("npc.kelda-varruk")));
    }

    [Fact]
    public void A_shared_file_is_deleted_only_with_its_last_link()
    {
        using (var db = _canon.Db(_conn))
        {
            db.Campaigns.Add(new Campaign { Id = "c2", Name = "Copy" });
            db.Characters.Add(Kelda());
            db.SaveChanges();
            var second = new Character { Id = "guid-kelda-2", CampaignId = "c2", CanonId = "npc.kelda-varruk" };
            Assert.True(_canon.Store.TryGet("npc.kelda-varruk", out var e));
            CanonMapping.Hydrate(second, e, refs: null);
            db.Characters.Add(second);
            db.SaveChanges();
        }
        using (var db = _canon.Db(_conn)) { db.Characters.Remove(db.Characters.Single(c => c.Id == "guid-kelda")); db.SaveChanges(); }
        Assert.True(File.Exists(_canon.File("npc.kelda-varruk")));
        using (var db = _canon.Db(_conn)) { db.Characters.Remove(db.Characters.Single()); db.SaveChanges(); }
        Assert.False(File.Exists(_canon.File("npc.kelda-varruk")));
    }

    [Fact]
    public void A_character_whose_file_is_missing_is_shown_but_never_saved()
    {
        using (var db = _canon.Db(_conn)) db.Database.ExecuteSqlRaw("INSERT INTO Characters (Id, CampaignId, CanonId) VALUES ('g', 'c1', 'npc.nobody')");
        using var db2 = _canon.Db(_conn);
        var c = db2.Characters.Single();
        Assert.True(c.CanonMissing);
        Assert.Contains("npc.nobody", c.Name);
        c.Summary = "x";
        Assert.Throws<CanonConflictException>(() => db2.SaveChanges());
        Assert.False(File.Exists(_canon.File("npc.nobody")));
    }

    [Fact]
    public void Profile_and_detail_sections_round_trip_through_the_file()
    {
        var doc = new CanonStore.Document(new YamlDotNet.RepresentationModel.YamlMappingNode { { "id", "npc.x" }, { "slug", "x" }, { "name", "X" } }, "", []);
        CanonSections.ApplyProfile(doc, new CharacterNarrativeProfile { Overview = "Line one.\nLine two.", SignatureQuote = "*“Quote.”*" });
        doc.Sections.Add(CanonSections.Section("Relationship to the Order", "Respects it.", "players"));
        var text = CanonStore.Serialize(doc, "npc");
        var back = CanonStore.ParseDocument(text);
        var profile = CanonSections.ToProfile("g", back.Sections)!;
        Assert.Equal(("Line one.\nLine two.", "*“Quote.”*"), (profile.Overview, profile.SignatureQuote));
        var details = CanonSections.ToDetails("g", back.Sections, new HashSet<string> { });
        Assert.Equal(("g~relationship-to-the-order", "Respects it.", NarrativeVisibility.Public), (details.Single().Id, details.Single().Body, details.Single().Visibility));
        Assert.Equal(NarrativeVisibility.Revealed, CanonSections.ToDetails("g", back.Sections, new HashSet<string> { "relationship-to-the-order" }).Single().Visibility);
    }
}
