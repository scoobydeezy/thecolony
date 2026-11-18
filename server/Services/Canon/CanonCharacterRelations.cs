using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using ColonyTracker.Api.Models;
using YamlDotNet.RepresentationModel;

namespace ColonyTracker.Api.Services.Canon;

// A character's `relationships` (ADVENTURE-BOOK-PLAN.md §15), between the file and the entity's JSON:
//   - to: npc.uldren-harthwright      [{"targetCharacterId":row|null,"relationshipType":"Spouse",
//     type: Spouse                       "summary":..., "state":"Active", "visibility":"GMOnly"}]
//     summary: ...
//     state: Estranged                 (absent = Active)
//     visibility: Public               (absent = GMOnly)
public static class CanonCharacterRelations
{
    private static readonly JsonSerializerOptions Compact = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    public sealed record Item(string? To, string Type, string? Summary, RelationshipState State, NarrativeVisibility Visibility);

    private static string? Str(YamlMappingNode m, string k) =>
        m.Children.TryGetValue(new YamlScalarNode(k), out var n) && n is YamlScalarNode s && s.Value is { Length: > 0 } v ? v : null;

    public static List<Item> FromYaml(YamlSequenceNode? seq, Func<string, string?> row) =>
        (seq?.Children ?? []).OfType<YamlMappingNode>().Select(m => new Item(
            Str(m, "to") is { } to ? row(to) ?? to : null, Str(m, "type") ?? "", Str(m, "summary"),
            Enum.TryParse<RelationshipState>(Str(m, "state"), out var st) ? st : RelationshipState.Active,
            Enum.TryParse<NarrativeVisibility>(Str(m, "visibility"), out var v) ? v : NarrativeVisibility.GMOnly)).ToList();

    public static string Json(IEnumerable<Item> items) =>
        new JsonArray(items.Select(i => (JsonNode)new JsonObject
        {
            ["targetCharacterId"] = i.To, ["relationshipType"] = i.Type, ["summary"] = i.Summary,
            ["state"] = i.State.ToString(), ["visibility"] = i.Visibility.ToString(),
        }).ToArray()).ToJsonString(Compact);

    public static string Json(YamlSequenceNode? seq, Func<string?, string?> row) => Json(FromYaml(seq, id => row(id)));

    public static List<Item> Parse(string? json) =>
        (JsonNode.Parse(string.IsNullOrWhiteSpace(json) ? "[]" : json) as JsonArray ?? []).OfType<JsonObject>().Select(o => new Item(
            string.IsNullOrWhiteSpace((string?)o["targetCharacterId"]) ? null : (string?)o["targetCharacterId"], (string?)o["relationshipType"] ?? "",
            string.IsNullOrWhiteSpace((string?)o["summary"]) ? null : (string?)o["summary"],
            Enum.TryParse<RelationshipState>((string?)o["state"], out var st) ? st : RelationshipState.Active,
            Enum.TryParse<NarrativeVisibility>((string?)o["visibility"], out var v) ? v : NarrativeVisibility.GMOnly)).ToList();

    public static IEnumerable<(string Path, string Id)> References(YamlSequenceNode? seq)
    {
        if (seq is null) yield break;
        for (var i = 0; i < seq.Children.Count; i++)
            if (seq.Children[i] is YamlMappingNode m && Str(m, "to") is { } to) yield return ($"relationships[{i}].to", to);
    }

    public static void Write(YamlMappingNode fm, string? json, CanonRefs refs, string where)
    {
        var k = new YamlScalarNode("relationships");
        var items = Parse(json).Select(i => i with { To = refs.ToCanon("character", i.To, $"{where} to") }).ToList();
        foreach (var i in items) if (string.IsNullOrWhiteSpace(i.Type)) throw new CanonValidationException($"{where}: a relationship needs a type");
        var existing = fm.Children.TryGetValue(k, out var n) ? n as YamlSequenceNode : null;
        if (existing is not null && Json(FromYaml(existing, id => id)) == Json(items)) return;   // unchanged: keep formatting
        if (items.Count == 0) { fm.Children.Remove(k); return; }
        var seq = new YamlSequenceNode();
        foreach (var i in items)
        {
            var m = new YamlMappingNode();
            if (i.To is not null) m.Add("to", CanonYaml.Scalar(i.To, false));
            m.Add("type", CanonYaml.Scalar(i.Type));
            if (i.Summary is not null) m.Add("summary", CanonYaml.Scalar(i.Summary));
            if (i.State != RelationshipState.Active) m.Add("state", i.State.ToString());
            if (i.Visibility != NarrativeVisibility.GMOnly) m.Add("visibility", i.Visibility.ToString());
            seq.Add(m);
        }
        fm.Children[k] = seq;
    }
}
