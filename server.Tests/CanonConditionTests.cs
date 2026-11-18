using ColonyTracker.Api.Controllers;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services.Canon;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Tests;

// ADVENTURE-BOOK-PLAN.md §15: World Conditions are files with canonical ids in their requirements and
// "varies by"; a character's relationships are a list in its own file.
public class CanonConditionTests : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    private readonly TestCanon _canon = new();
    private const string Cid = "c1";

    public CanonConditionTests()
    {
        _conn.Open();
        using var db = _canon.Db(_conn);
        db.Database.EnsureCreated();
        db.Campaigns.Add(new Campaign { Id = Cid, Name = "Test" });
        db.Factions.Add(new Faction { Id = "witnesses", CampaignId = Cid, Name = "The Witnesses", TruthValue = 0.5, StabilityValue = 0.5, AgencyValue = 0 });
        db.Assets.Add(new Asset { Id = "guid-object", CampaignId = Cid, Name = "The Unclaimed Object", ControllingFactionId = "witnesses" });
        db.Characters.Add(new Character { Id = "guid-celia", CampaignId = Cid, Name = "Celia Harthwright" });
        db.Characters.Add(new Character { Id = "guid-uldren", CampaignId = Cid, Name = "Uldren Harthwright" });
        db.SaveChanges();
    }

    public void Dispose() { _conn.Dispose(); _canon.Dispose(); }

    [Fact]
    public void A_condition_is_a_file_with_canonical_ids()
    {
        using (var db = _canon.Db(_conn))
        {
            db.WorldConditions.Add(new WorldCondition { Id = "guid-specimen", CampaignId = Cid, Title = "Witness Specimen", Rule = "Supervised examination.", SortOrder = 7,
                RequirementsJson = """[{"kind":"assetController","assetId":"guid-object","factionId":"witnesses"},{"kind":"assetController","assetId":"guid-object","factionId":""}]""" });
            db.WorldConditions.Add(new WorldCondition { Id = "guid-watch", CampaignId = Cid, Title = "Procession Watch", ActiveAtStart = false, StressContribution = 2,
                VariesByJson = """{"subject":{"kind":"assetStatus","id":"guid-object"},"rows":[{"state":"Secure","text":"","stress":0},{"state":"Contested","text":"Checkpoints.","stress":1}]}""" });
            db.SaveChanges();
        }
        var specimen = File.ReadAllText(_canon.File("condition.witness-specimen"));
        Assert.Contains("requires:\n  - kind: assetController\n    assetId: asset.unclaimed-object\n    factionId: faction.witnesses\n  - kind: assetController\n    assetId: asset.unclaimed-object\n    factionId: \"\"\n", specimen);
        Assert.DoesNotContain("stress", specimen);   // 0 is the default
        Assert.DoesNotContain("start", specimen);    // established at the start is the default
        var watch = File.ReadAllText(_canon.File("condition.procession-watch"));
        Assert.Contains("stress: 2\n", watch);
        Assert.Contains("variesBy:\n  subject:\n    kind: assetStatus\n    id: asset.unclaimed-object\n  rows:\n    - state: Secure\n      text: \"\"\n      stress: 0\n", watch);
        Assert.Contains("start:\n  established: false\n", watch);
        foreach (var f in Directory.EnumerateFiles(_canon.Dir, "*", SearchOption.AllDirectories)) Assert.DoesNotContain("guid-", File.ReadAllText(f));

        using (var db = _canon.Db(_conn))
        {
            var w = db.WorldConditions.Single(c => c.Id == "guid-watch");
            Assert.Equal((false, 2, "guid-object"), (w.ActiveAtStart, w.StressContribution, System.Text.Json.Nodes.JsonNode.Parse(w.VariesByJson!)!["subject"]!["id"]!.GetValue<string>()));
            Assert.Contains("\"assetId\":\"guid-object\"", db.WorldConditions.Single(c => c.Id == "guid-specimen").RequirementsJson);
            Assert.Equal(7, db.WorldConditions.Single(c => c.Id == "guid-specimen").SortOrder);   // stays in the row
            var columns = db.Database.SqlQueryRaw<string>("SELECT name AS Value FROM pragma_table_info('WorldConditions')").ToList();
            Assert.DoesNotContain("Title", columns);
            w.ActiveAtStart = true;   // back to the default: start: goes
            db.SaveChanges();
        }
        Assert.DoesNotContain("start", File.ReadAllText(_canon.File("condition.procession-watch")));
    }

    [Fact]
    public async Task Relationships_live_in_the_character_file()
    {
        using (var db = _canon.Db(_conn))
        {
            var controller = new CharacterRelationshipsController(db, new FixedCampaign(Cid));
            await controller.Create("guid-celia", new CharacterRelationship { TargetCharacterId = "guid-uldren", RelationshipType = "Spouse", Summary = "Two halves." });
            await controller.Create("guid-celia", new CharacterRelationship { RelationshipType = "Rival", State = RelationshipState.Estranged, Visibility = NarrativeVisibility.Public, SortOrder = 5 });
        }
        var celia = File.ReadAllText(_canon.File("npc.celia-harthwright"));
        Assert.Contains("relationships:\n  - to: npc.uldren-harthwright\n    type: Spouse\n    summary: Two halves.\n  - type: Rival\n    state: Estranged\n    visibility: Public\n", celia);
        Assert.DoesNotContain("guid-", celia);

        using (var db = _canon.Db(_conn))
        {
            var controller = new CharacterRelationshipsController(db, new FixedCampaign(Cid));
            var list = (List<CharacterRelationship>)((Microsoft.AspNetCore.Mvc.OkObjectResult)await controller.GetAll("guid-celia")).Value!;
            Assert.Equal(("guid-uldren", "Spouse", 0), (list[0].TargetCharacterId, list[0].RelationshipType, list[0].SortOrder));
            Assert.Equal(CharacterRelationshipsController.IdOf("guid-celia", "guid-uldren", "Spouse"), list[0].Id);
            await controller.Delete("guid-celia", list[1].Id);
        }
        Assert.DoesNotContain("Rival", File.ReadAllText(_canon.File("npc.celia-harthwright")));
    }

    private sealed class FixedCampaign(string id) : ColonyTracker.Api.Services.ICampaignContext
    {
        public Task<string> GetActiveIdAsync() => Task.FromResult(id);
    }
}
