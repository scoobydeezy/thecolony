using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using YamlDotNet.RepresentationModel;

namespace ColonyTracker.Api.Services.Canon;

// A World Condition's `requires` and `variesBy` (ADVENTURE-BOOK-PLAN.md §15): the same structure in
// the file and in the app's JSON (core/sim/conditions.ts), with canonical ids in the file and row ids
// in the app. Which keys hold ids, and of what:
//   requires[i]          assetId, characterId, factionId, locationId, conditionId, goalId ("" = none)
//   variesBy.subject.id  by subject.kind (assetStatus / assetController -> asset, ...)
public static class CanonConditionJson
{
    private static readonly JsonSerializerOptions Compact = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    private static readonly Dictionary<string, string> KeyType = new()
    {
        ["assetId"] = "asset", ["characterId"] = "character", ["factionId"] = "faction",
        ["locationId"] = "location", ["conditionId"] = "condition", ["goalId"] = "goal",
    };

    private static readonly Dictionary<string, string> SubjectType = new()
    {
        ["assetStatus"] = "asset", ["assetController"] = "asset", ["characterState"] = "character",
        ["characterFaction"] = "character", ["locationState"] = "location", ["goalStage"] = "goal",
    };

    // Every id in the tree, with its reference type, as (path, type, value) for translation.
    private static IEnumerable<(JsonObject Owner, string Key, string Type, string Path)> Ids(JsonNode? root, string path, bool requires)
    {
        if (requires)
        {
            var i = 0;
            foreach (var o in (root as JsonArray ?? []).OfType<JsonObject>())
            {
                foreach (var (k, type) in KeyType)
                    if (o[k] is JsonValue v && v.TryGetValue<string>(out var s) && s.Length > 0) yield return (o, k, type, $"{path}[{i}].{k}");
                i++;
            }
        }
        else if (root?["subject"] is JsonObject subject && (string?)subject["kind"] is { } kind && SubjectType.TryGetValue(kind, out var t)
                 && subject["id"] is JsonValue v && v.TryGetValue<string>(out var s) && s.Length > 0)
            yield return (subject, "id", t, $"{path}.subject.id");
    }

    public static string? Hydrate(YamlNode? node, bool requires, Func<string, string?> row)
    {
        if (node is null) return requires ? "[]" : null;
        var json = CanonStore.ToJson(node);
        foreach (var (o, k, _, _) in Ids(json, "", requires).ToList()) o[k] = row((string)o[k]!) ?? (string)o[k]!;
        return json?.ToJsonString(Compact);
    }

    public static IEnumerable<(string Path, string Id)> References(YamlNode? node, string path, bool requires) =>
        node is null ? [] : Ids(CanonStore.ToJson(node), path, requires).Select(x => (x.Path, (string)x.Owner[x.Key]!)).ToList();

    public static void Write(YamlMappingNode root, string key, string? json, bool requires, CanonRefs refs, string where)
    {
        var k = new YamlScalarNode(key);
        JsonNode? tree;
        try { tree = string.IsNullOrWhiteSpace(json) || json.Trim() == "null" ? null : JsonNode.Parse(json); }
        catch (JsonException) { throw new CanonValidationException($"{where}: not valid JSON"); }
        if (tree is not null)
            foreach (var (o, kk, type, p) in Ids(tree, key, requires).ToList()) o[kk] = refs.ToCanon(type, (string)o[kk]!, $"{where} {p}");
        var empty = tree is null || (tree is JsonArray a && a.Count == 0);
        var existing = root.Children.TryGetValue(k, out var n) ? n : null;
        if (empty) { root.Children.Remove(k); return; }
        // Unchanged (as ids go): keep the file's nodes, and so their formatting.
        if (existing is not null && JsonNode.DeepEquals(CanonStore.ToJson(existing), tree)) return;
        root.Children[k] = ToYaml(tree!);
    }

    private static YamlNode ToYaml(JsonNode node) => node switch
    {
        JsonObject o => new YamlMappingNode(o.Select(kv => new KeyValuePair<YamlNode, YamlNode>(new YamlScalarNode(kv.Key), kv.Value is null ? new YamlScalarNode("null") : ToYaml(kv.Value)))),
        JsonArray a => a.Count == 0 ? new YamlSequenceNode { Style = YamlDotNet.Core.Events.SequenceStyle.Flow } : new YamlSequenceNode(a.Select(x => x is null ? new YamlScalarNode("null") : ToYaml(x))),
        JsonValue v when v.GetValueKind() == JsonValueKind.String => CanonYaml.Scalar((string)v!),
        JsonValue v => new YamlScalarNode(v.ToJsonString()),   // numbers, true, false: plain
        _ => throw new CanonValidationException("unsupported JSON value"),
    };
}
