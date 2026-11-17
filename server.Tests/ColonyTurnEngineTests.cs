using System.Text.Json;
using System.Text.Json.Nodes;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;

namespace ColonyTracker.Api.Tests;

/// <summary>M5: the server verifier reproduces the client engine exactly (vectors from client core/sim, Vectors/generate.ts).</summary>
public class ColonyTurnEngineTests
{
    private static JsonArray Load(string name) =>
        JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Vectors", name)))!.AsArray();

    private static List<EventEffect> Effects(JsonNode node) => node.AsArray().Select(e => new EventEffect
    {
        TargetType = (string)e!["targetType"]!, TargetId = (string)e["targetId"]!, Property = (string)e["property"]!,
        Delta = (double)e["delta"]!, Value = (string?)e["value"], SecondaryTargetId = (string?)e["secondaryTargetId"],
        ActorFactionId = (string?)e["actorFactionId"], Origin = Enum.Parse<EffectOrigin>((string)e["origin"]!),
    }).ToList();

    [Fact]
    public void Mulberry32_matches_the_client_reference_vector()
    {
        var rng = new ColonyTurnEngine.Mulberry32(12345);
        Assert.Equal(new uint[] { 4207900869, 1317490944, 2079646450, 3513001552, 2187978186 },
                     Enumerable.Range(0, 5).Select(_ => rng.Next()).ToArray());
    }

    [Fact]
    public void Every_client_Faction_Phase_vector_verifies()
    {
        foreach (var v in Load("faction-phase.json"))
            Assert.Null(ColonyTurnEngine.Verify(ColonyTurnPhaseKind.FactionPhase, (string)v!["inputs"]!, (string)v["results"]!, Effects(v["effects"]!)));
    }

    [Fact]
    public void Every_client_Opening_vector_verifies()
    {
        foreach (var v in Load("opening.json"))
            Assert.Null(ColonyTurnEngine.Verify(ColonyTurnPhaseKind.Opening, (string)v!["inputs"]!, (string)v["results"]!, Effects(v["effects"]!)));
    }

    [Fact]
    public void Tampering_is_rejected()
    {
        var v = Load("faction-phase.json").First(x => JsonNode.Parse((string)x!["results"]!)!["attempts"]!.AsArray().Count > 0)!;
        var results = JsonNode.Parse((string)v["results"]!)!;
        // 1. claim different app dice than the seed produced
        var a0 = results["attempts"]![0]!;
        a0["d1"] = (int)a0["d1"]! == 6 ? 5 : 6;
        Assert.NotNull(ColonyTurnEngine.Verify(ColonyTurnPhaseKind.FactionPhase, (string)v["inputs"]!, results.ToJsonString(), Effects(v["effects"]!)));
        // 2. an extra Effect the phase did not produce
        var extra = Effects(v["effects"]!);
        extra.Add(new EventEffect { TargetType = "goal", TargetId = "x", Property = "status", Value = "Accomplished", Origin = EffectOrigin.FactionPhase });
        Assert.NotNull(ColonyTurnEngine.Verify(ColonyTurnPhaseKind.FactionPhase, (string)v["inputs"]!, (string)v["results"]!, extra));
        // 3. a Momentum change the signals do not support
        var op = Load("opening.json")[0]!;
        var opFx = Effects(op["effects"]!);
        opFx.Add(new EventEffect { TargetType = "faction", TargetId = "aspis", Property = "momentumTier", Delta = 1, Origin = EffectOrigin.MomentumResolution });
        Assert.NotNull(ColonyTurnEngine.Verify(ColonyTurnPhaseKind.Opening, (string)op["inputs"]!, (string)op["results"]!, opFx));
    }

    [Fact]
    public void Guards_and_the_DC_are_rederived()   // §18.12 fp-5
    {
        var v = Load("faction-phase.json").First(x => JsonNode.Parse((string)x!["results"]!)!["attempts"]!.AsArray().Any(a => (int)a!["defense"]! > 0))!;
        Assert.Null(ColonyTurnEngine.Verify(ColonyTurnPhaseKind.FactionPhase, (string)v["inputs"]!, (string)v["results"]!, Effects(v["effects"]!)));
        // 1. claiming no guard was posted
        var noGuards = JsonNode.Parse((string)v["results"]!)!;
        noGuards["guarding"] = new JsonArray();
        Assert.NotNull(ColonyTurnEngine.Verify(ColonyTurnPhaseKind.FactionPhase, (string)v["inputs"]!, noGuards.ToJsonString(), Effects(v["effects"]!)));
        // 2. a defended roll recorded as undefended
        var undefended = JsonNode.Parse((string)v["results"]!)!;
        var a = undefended["attempts"]!.AsArray().First(x => (int)x!["defense"]! > 0)!;
        a["dc"] = (int)a["dc"]! - (int)a["defense"]!; a["defense"] = 0; a["guardId"] = null;
        Assert.NotNull(ColonyTurnEngine.Verify(ColonyTurnPhaseKind.FactionPhase, (string)v["inputs"]!, undefended.ToJsonString(), Effects(v["effects"]!)));
    }

    [Fact]
    public void Only_a_Ready_to_Resolve_goal_can_be_accepted()   // §18.5
    {
        var v = Load("faction-phase.json").First(x => JsonNode.Parse((string)x!["results"]!)!["accepted"]!.AsArray().Count > 0)!;
        Assert.Null(ColonyTurnEngine.Verify(ColonyTurnPhaseKind.FactionPhase, (string)v["inputs"]!, (string)v["results"]!, Effects(v["effects"]!)));
        // accepting a goal the dice did not make Ready is refused
        var results = JsonNode.Parse((string)v["results"]!)!;
        var notReady = results["goals"]!.AsArray().First(g => (string)g!["outcome"]! != "ReadyToResolve")!;
        var acc = results["accepted"]!.AsArray(); acc.Add((string)notReady["goalId"]!);
        Assert.NotNull(ColonyTurnEngine.Verify(ColonyTurnPhaseKind.FactionPhase, (string)v["inputs"]!, results.ToJsonString(), Effects(v["effects"]!)));
        // an accepted goal's Effects without the acceptance recorded are refused (the resolution must be on the record)
        var unrecorded = JsonNode.Parse((string)v["results"]!)!; unrecorded["accepted"] = new JsonArray();
        Assert.NotNull(ColonyTurnEngine.Verify(ColonyTurnPhaseKind.FactionPhase, (string)v["inputs"]!, unrecorded.ToJsonString(), Effects(v["effects"]!)));
    }

    [Fact]
    public void Every_client_Character_Phase_vector_verifies()   // M6
    {
        foreach (var v in Load("character-phase.json"))
            Assert.Null(ColonyTurnEngine.Verify(ColonyTurnPhaseKind.CharacterPhase, (string)v!["inputs"]!, (string)v["results"]!, Effects(v["effects"]!)));
    }

    [Fact]
    public void A_wrong_nominee_or_a_forged_Defection_Check_is_rejected()   // M6
    {
        var v = Load("character-phase.json").First(x => JsonNode.Parse((string)x!["results"]!)!["rolls"]!.AsArray().Count > 0)!;
        var inputs = JsonNode.Parse((string)v["inputs"]!)!;
        var results = JsonNode.Parse((string)v["results"]!)!;
        var nominee = (string)results["rolls"]![0]!["characterId"]!;
        // make the nominee exempt: the recorded roll no longer belongs to the right character
        foreach (var c in inputs["characters"]!.AsArray()) if ((string)c!["id"]! == nominee) c["exempt"] = true;
        Assert.NotNull(ColonyTurnEngine.Verify(ColonyTurnPhaseKind.CharacterPhase, inputs.ToJsonString(), (string)v["results"]!, Effects(v["effects"]!)));

        // §18.4: Defection Checks are part of the Character Phase
        var o = Load("character-phase.json").First(x => JsonNode.Parse((string)x!["results"]!)!["checks"]!.AsArray().Any(c => (string)c!["source"]! == "app"))!;
        var or = JsonNode.Parse((string)o["results"]!)!;
        var check = or["checks"]!.AsArray().First(c => (string)c!["source"]! == "app")!;
        check["d1"] = (int)check["d1"]! == 6 ? 5 : 6;
        Assert.NotNull(ColonyTurnEngine.Verify(ColonyTurnPhaseKind.CharacterPhase, (string)o["inputs"]!, or.ToJsonString(), Effects(o["effects"]!)));
        // ...and a defection the dice did not produce (a stayed check written as a departure) is refused
        var stayed = Load("character-phase.json").FirstOrDefault(x => JsonNode.Parse((string)x!["results"]!)!["checks"]!.AsArray().Any(c => !(bool)c!["left"]!));
        Assert.NotNull(stayed);
        var fx = Effects(stayed!["effects"]!);
        var conflicted = fx.First(e => e.Property == "instability" && e.Value == "Conflicted" && e.Origin == EffectOrigin.CharacterPhase);
        fx.Insert(fx.IndexOf(conflicted), new EventEffect { TargetType = "character", TargetId = conflicted.TargetId, Property = "factionChange", Value = "", Origin = EffectOrigin.CharacterPhase });
        Assert.NotNull(ColonyTurnEngine.Verify(ColonyTurnPhaseKind.CharacterPhase, (string)stayed["inputs"]!, (string)stayed["results"]!, fx));
    }

    [Fact]
    public void Physical_dice_are_accepted_but_must_be_dice()
    {
        var v = Load("faction-phase.json").First(x => ((string)x!["results"]!).Contains("\"source\":\"physical\""))!;
        Assert.Null(ColonyTurnEngine.Verify(ColonyTurnPhaseKind.FactionPhase, (string)v["inputs"]!, (string)v["results"]!, Effects(v["effects"]!)));
        var results = JsonNode.Parse((string)v["results"]!)!;
        var p = results["attempts"]!.AsArray().First(a => (string)a!["source"]! == "physical")!;
        p["d1"] = 7;
        Assert.NotNull(ColonyTurnEngine.Verify(ColonyTurnPhaseKind.FactionPhase, (string)v["inputs"]!, results.ToJsonString(), Effects(v["effects"]!)));
    }
}
