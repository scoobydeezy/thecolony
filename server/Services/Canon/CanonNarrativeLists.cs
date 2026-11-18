using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using ColonyTracker.Api.Models;
using YamlDotNet.RepresentationModel;

namespace ColonyTracker.Api.Services.Canon;

// The two lists a narrative file holds (ADVENTURE-BOOK-PLAN.md §13), translated between the file
// (canonical ids) and the entity (compact JSON with row ids):
//
//   leadsTo:                                  [{"to":row,"thread":row,"visibility":"Public"}]
//     - to: event.prisoners
//       thread: thread.the-keeper
//       visibility: Public        (omitted when GMOnly)
//
//   links:                                    [{"entityType":"Character","entityId":row, ...}]
//     - npc.vara-cairn            a bare id, or a mapping when it carries more:
//     - { id: faction.dawn, role: ..., notes: ..., primary: true, visibility: Public }
//
// A link to anything the app doesn't model (creature., rule., source., ...) stays in the file as it
// is; the app neither shows nor removes it.
public static class CanonNarrativeLists
{
    private static readonly JsonSerializerOptions Compact = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    public static NarrativeEntityType? TypeOfCanon(string id) => id[..Math.Max(0, id.IndexOf('.'))] switch
    {
        "npc" or "pc" => NarrativeEntityType.Character,
        "faction" => NarrativeEntityType.Faction,
        "asset" => NarrativeEntityType.Asset,
        "location" => NarrativeEntityType.Location,
        _ => null,
    };

    public static string RefTypeOf(NarrativeEntityType t) => t switch
    {
        NarrativeEntityType.Character => "character",
        NarrativeEntityType.Faction => "faction",
        NarrativeEntityType.Asset => "asset",
        NarrativeEntityType.Location => "location",
        _ => throw new CanonValidationException($"A {t} link is play data and can't be stored in a file."),
    };

    private static string? Str(YamlMappingNode m, string k) =>
        m.Children.TryGetValue(new YamlScalarNode(k), out var n) && n is YamlScalarNode s && s.Value is { Length: > 0 } v ? v : null;

    // ---------------------------------------------------------------- file -> JSON

    public static string LeadsToJson(YamlSequenceNode? seq, Func<string, string?> row)
    {
        var arr = new JsonArray();
        foreach (var m in seq?.Children.OfType<YamlMappingNode>() ?? [])
        {
            var o = new JsonObject { ["to"] = row(Str(m, "to") ?? ""), ["thread"] = row(Str(m, "thread") ?? "") };
            o["visibility"] = Str(m, "visibility") ?? nameof(NarrativeVisibility.GMOnly);
            arr.Add(o);
        }
        return arr.ToJsonString(Compact);
    }

    // (id, role, notes, primary, visibility) of one links entry.
    private static (string Id, string? Role, string? Notes, bool Primary, string Visibility)? LinkOf(YamlNode n) => n switch
    {
        YamlScalarNode { Value: { Length: > 0 } id } => (id, null, null, false, nameof(NarrativeVisibility.GMOnly)),
        YamlMappingNode m when Str(m, "id") is { } id => (id, Str(m, "role"), Str(m, "notes"), Str(m, "primary") is "true" or "True",
            Str(m, "visibility") ?? nameof(NarrativeVisibility.GMOnly)),
        _ => null,
    };

    public static string LinksJson(YamlSequenceNode? seq, Func<string, string?> row)
    {
        var arr = new JsonArray();
        foreach (var n in seq?.Children ?? [])
        {
            if (LinkOf(n) is not { } l || TypeOfCanon(l.Id) is not { } type) continue;
            arr.Add(Link(type.ToString(), row(l.Id) ?? l.Id, l.Role, l.Notes, l.Primary, l.Visibility));
        }
        return arr.ToJsonString(Compact);
    }

    private static JsonObject Link(string type, string id, string? role, string? notes, bool primary, string visibility)
    {
        var o = new JsonObject { ["entityType"] = type, ["entityId"] = id };
        if (role is not null) o["role"] = role;
        if (notes is not null) o["notes"] = notes;
        o["isPrimary"] = primary;
        o["visibility"] = visibility;
        return o;
    }

    // ---------------------------------------------------------------- JSON <-> app records

    public sealed record LeadsTo(string To, string Thread, NarrativeVisibility Visibility);
    public sealed record LinkItem(NarrativeEntityType EntityType, string EntityId, string? Role, string? Notes, bool IsPrimary, NarrativeVisibility Visibility);

    public static List<LeadsTo> ParseLeadsTo(string? json) =>
        (JsonNode.Parse(string.IsNullOrWhiteSpace(json) ? "[]" : json) as JsonArray ?? [])
        .OfType<JsonObject>()
        .Select(o => new LeadsTo((string?)o["to"] ?? "", (string?)o["thread"] ?? "", Enum.TryParse<NarrativeVisibility>((string?)o["visibility"], out var v) ? v : NarrativeVisibility.GMOnly))
        .ToList();

    public static string LeadsToJson(IEnumerable<LeadsTo> items) =>
        new JsonArray(items.Select(i => (JsonNode)new JsonObject { ["to"] = i.To, ["thread"] = i.Thread, ["visibility"] = i.Visibility.ToString() }).ToArray()).ToJsonString(Compact);

    public static List<LinkItem> ParseLinks(string? json) =>
        (JsonNode.Parse(string.IsNullOrWhiteSpace(json) ? "[]" : json) as JsonArray ?? [])
        .OfType<JsonObject>()
        .Select(o => new LinkItem(Enum.Parse<NarrativeEntityType>((string)o["entityType"]!), (string?)o["entityId"] ?? "", (string?)o["role"], (string?)o["notes"],
            (bool?)o["isPrimary"] ?? false, Enum.TryParse<NarrativeVisibility>((string?)o["visibility"], out var v) ? v : NarrativeVisibility.GMOnly))
        .ToList();

    public static string LinksJson(IEnumerable<LinkItem> items) =>
        new JsonArray(items.Select(i => (JsonNode)Link(i.EntityType.ToString(), i.EntityId, Blank(i.Role), Blank(i.Notes), i.IsPrimary, i.Visibility.ToString())).ToArray()).ToJsonString(Compact);

    private static string? Blank(string? s) => string.IsNullOrWhiteSpace(s) ? null : s;

    // ---------------------------------------------------------------- references

    public static IEnumerable<(string Path, string Id)> References(YamlSequenceNode? seq, string path, bool leadsTo)
    {
        if (seq is null) yield break;
        for (var i = 0; i < seq.Children.Count; i++)
        {
            var n = seq.Children[i];
            if (leadsTo)
            {
                if (n is not YamlMappingNode m) continue;
                if (Str(m, "to") is { } to) yield return ($"{path}[{i}].to", to);
                if (Str(m, "thread") is { } th) yield return ($"{path}[{i}].thread", th);
            }
            else if (LinkOf(n) is { } l) yield return ($"{path}[{i}]", l.Id);
        }
    }

    // ---------------------------------------------------------------- JSON -> file

    // keepEmpty: an empty list stays in the file as `[]` (a version's list that replaces the event's with nothing).
    public static void Write(YamlMappingNode root, string key, string? json, bool leadsTo, CanonRefs refs, string where, bool keepEmpty = false)
    {
        var k = new YamlScalarNode(key);
        var existing = root.Children.TryGetValue(k, out var node) ? node as YamlSequenceNode : null;
        JsonNode? parsed;
        try { parsed = JsonNode.Parse(string.IsNullOrWhiteSpace(json) ? "[]" : json); }
        catch (JsonException) { throw new CanonValidationException($"{where}: not valid JSON"); }
        var items = parsed as JsonArray ?? throw new CanonValidationException($"{where} must be a list");

        // The app's entries with canonical ids, compared with what the file says (as the app sees it).
        var seq = new YamlSequenceNode();
        if (leadsTo)
        {
            foreach (var o in items.OfType<JsonObject>())
            {
                var m = new YamlMappingNode
                {
                    { "to", CanonYaml.Scalar(refs.ToCanon("narrative", (string?)o["to"], $"{where} to") ?? throw new CanonValidationException($"{where}: a connection needs a target"), false) },
                    { "thread", CanonYaml.Scalar(refs.ToCanon("thread", (string?)o["thread"], $"{where} thread") ?? throw new CanonValidationException($"{where}: a connection needs a thread"), false) },
                };
                if ((string?)o["visibility"] is { } vis && vis != nameof(NarrativeVisibility.GMOnly)) m.Add("visibility", vis);
                seq.Add(m);
            }
            if (existing is not null && LeadsToJson(existing, id => id) == LeadsToJson(seq, id => id)) return;   // unchanged: keep formatting
        }
        else
        {
            foreach (var o in items.OfType<JsonObject>())
            {
                var type = Enum.TryParse<NarrativeEntityType>((string?)o["entityType"], out var t) ? t : throw new CanonValidationException($"{where}: unknown entity type {(string?)o["entityType"]}");
                var id = refs.ToCanon(RefTypeOf(type), (string?)o["entityId"], $"{where} {type}") ?? throw new CanonValidationException($"{where}: a link needs an entity");
                var role = Blank((string?)o["role"]); var notes = Blank((string?)o["notes"]);
                var primary = (bool?)o["isPrimary"] ?? false; var vis = (string?)o["visibility"] ?? nameof(NarrativeVisibility.GMOnly);
                if (role is null && notes is null && !primary && vis == nameof(NarrativeVisibility.GMOnly)) { seq.Add(CanonYaml.Scalar(id, false)); continue; }
                var m = new YamlMappingNode { { "id", CanonYaml.Scalar(id, false) } };
                if (role is not null) m.Add("role", CanonYaml.Scalar(role));
                if (notes is not null) m.Add("notes", CanonYaml.Scalar(notes));
                if (primary) m.Add("primary", new YamlScalarNode("true"));
                if (vis != nameof(NarrativeVisibility.GMOnly)) m.Add("visibility", vis);
                seq.Add(m);
            }
            if (existing is not null && LinksJson(existing, id => id) == LinksJson(seq, id => id)) return;   // unchanged: keep formatting
            // Entries the app doesn't model keep their place, after the app's.
            foreach (var n in existing?.Children ?? [])
                if (LinkOf(n) is { } l && TypeOfCanon(l.Id) is null) seq.Add(n);
        }
        if (seq.Children.Count == 0 && !keepEmpty) root.Children.Remove(k);
        else
        {
            if (seq.Children.Count == 0) seq.Style = YamlDotNet.Core.Events.SequenceStyle.Flow;
            root.Children[k] = seq;
        }
    }

    // ---------------------------------------------------------------- branching (§14)

    public static string RefListJson(YamlSequenceNode? seq, Func<string, string?> row) =>
        new JsonArray((seq?.Children ?? []).OfType<YamlScalarNode>().Where(s => s.Value is { Length: > 0 }).Select(s => (JsonNode)JsonValue.Create(row(s.Value!) ?? s.Value!)!).ToArray()).ToJsonString(Compact);

    public static List<string> ParseRefList(string? json) =>
        (JsonNode.Parse(string.IsNullOrWhiteSpace(json) ? "[]" : json) as JsonArray ?? []).Select(n => (string?)n).OfType<string>().ToList();

    public static string RefListJson(IEnumerable<string> ids) => new JsonArray(ids.Select(i => (JsonNode)JsonValue.Create(i)!).ToArray()).ToJsonString(Compact);

    public static void WriteRefList(YamlMappingNode root, string key, string? json, string refType, CanonRefs refs, string where)
    {
        var k = new YamlScalarNode(key);
        var ids = ParseRefList(json).Select(id => refs.ToCanon(refType, id, where)!).ToList();
        var existing = root.Children.TryGetValue(k, out var n) ? n as YamlSequenceNode : null;
        if (existing is not null && RefListJson(existing, id => id) == RefListJson(ids)) return;
        if (ids.Count == 0) { root.Children.Remove(k); return; }
        var seq = new YamlSequenceNode();
        foreach (var id in ids) seq.Add(CanonYaml.Scalar(id, false));
        root.Children[k] = seq;
    }

    public sealed record PathItem(string Id, string Name);

    public static string PathsJson(YamlSequenceNode? seq) =>
        PathsJson((seq?.Children ?? []).OfType<YamlMappingNode>().Select(m => new PathItem(Str(m, "id") ?? "", Str(m, "name") ?? "")));

    public static string PathsJson(IEnumerable<PathItem> items) =>
        new JsonArray(items.Select(p => (JsonNode)new JsonObject { ["id"] = p.Id, ["name"] = p.Name }).ToArray()).ToJsonString(Compact);

    public static List<PathItem> ParsePaths(string? json) =>
        (JsonNode.Parse(string.IsNullOrWhiteSpace(json) ? "[]" : json) as JsonArray ?? []).OfType<JsonObject>()
        .Select(o => new PathItem((string?)o["id"] ?? "", (string?)o["name"] ?? "")).ToList();

    public static void WritePaths(YamlMappingNode root, string key, string? json, string where)
    {
        var k = new YamlScalarNode(key);
        var items = ParsePaths(json);
        foreach (var p in items)
            if (!CanonRefs.LooksCanonical("path", p.Id) || string.IsNullOrWhiteSpace(p.Name)) throw new CanonValidationException($"{where}: a path needs an id (path.<slug>) and a name");
        var existing = root.Children.TryGetValue(k, out var n) ? n as YamlSequenceNode : null;
        if (existing is not null && PathsJson(existing) == PathsJson(items)) return;
        if (items.Count == 0) { root.Children.Remove(k); return; }
        var seq = new YamlSequenceNode();
        foreach (var p in items) seq.Add(new YamlMappingNode { { "id", CanonYaml.Scalar(p.Id, false) }, { "name", CanonYaml.Scalar(p.Name) } });
        root.Children[k] = seq;
    }

    // A version: [{"key","when":[path ids],"summary"?,"synopsis"?,"leadsTo"?:[..],"links"?:[..]}]; an absent
    // field is inherited from the event, a present one replaces it (even when empty).
    public static string VariantsJson(YamlSequenceNode? seq, Func<string, string?> row)
    {
        var arr = new JsonArray();
        foreach (var m in seq?.Children.OfType<YamlMappingNode>() ?? [])
        {
            var o = new JsonObject { ["key"] = Str(m, "key") ?? "", ["when"] = JsonNode.Parse(RefListJson(m.Children.TryGetValue(new YamlScalarNode("when"), out var w) ? w as YamlSequenceNode : null, row)) };
            foreach (var f in new[] { "summary", "synopsis" })
                if (m.Children.TryGetValue(new YamlScalarNode(f), out var t) && t is YamlScalarNode ts) o[f] = ts.Value ?? "";
            if (m.Children.TryGetValue(new YamlScalarNode("leadsTo"), out var l)) o["leadsTo"] = JsonNode.Parse(LeadsToJson(l as YamlSequenceNode, row));
            if (m.Children.TryGetValue(new YamlScalarNode("links"), out var k)) o["links"] = JsonNode.Parse(LinksJson(k as YamlSequenceNode, row));
            arr.Add(o);
        }
        return arr.ToJsonString(Compact);
    }

    public static IEnumerable<(string Path, string Id)> VariantReferences(YamlSequenceNode? seq)
    {
        if (seq is null) yield break;
        for (var i = 0; i < seq.Children.Count; i++)
        {
            if (seq.Children[i] is not YamlMappingNode m) continue;
            if (m.Children.TryGetValue(new YamlScalarNode("when"), out var w) && w is YamlSequenceNode ws)
                for (var j = 0; j < ws.Children.Count; j++) if (ws.Children[j] is YamlScalarNode { Value: { Length: > 0 } p }) yield return ($"variants[{i}].when[{j}]", p);
            foreach (var r in References(m.Children.TryGetValue(new YamlScalarNode("leadsTo"), out var l) ? l as YamlSequenceNode : null, $"variants[{i}].leadsTo", true)) yield return r;
            foreach (var r in References(m.Children.TryGetValue(new YamlScalarNode("links"), out var k) ? k as YamlSequenceNode : null, $"variants[{i}].links", false)) yield return r;
        }
    }

    public static void WriteVariants(YamlMappingNode root, string key, string? json, CanonRefs refs, string where)
    {
        var k = new YamlScalarNode(key);
        var existing = root.Children.TryGetValue(k, out var n) ? n as YamlSequenceNode : null;
        JsonArray items;
        try { items = JsonNode.Parse(string.IsNullOrWhiteSpace(json) ? "[]" : json) as JsonArray ?? throw new CanonValidationException($"{where} must be a list"); }
        catch (JsonException) { throw new CanonValidationException($"{where}: not valid JSON"); }

        var seq = new YamlSequenceNode();
        foreach (var o in items.OfType<JsonObject>())
        {
            var vkey = (string?)o["key"] is { Length: > 0 } kk ? kk : throw new CanonValidationException($"{where}: a version needs a key");
            var before = existing?.Children.OfType<YamlMappingNode>().FirstOrDefault(m => Str(m, "key") == vkey);
            var m = new YamlMappingNode { { "key", CanonYaml.Scalar(vkey, false) } };
            var when = new YamlSequenceNode();
            foreach (var p in (o["when"] as JsonArray ?? []).Select(x => (string?)x).OfType<string>()) when.Add(CanonYaml.Scalar(refs.ToCanon("path", p, $"{where} {vkey} when")!, false));
            if (when.Children.Count == 0) when.Style = YamlDotNet.Core.Events.SequenceStyle.Flow;
            m.Add("when", when);
            foreach (var f in new[] { "summary", "synopsis" })
                if (o.ContainsKey(f)) m.Add(f, CanonYaml.Scalar((string?)o[f] ?? ""));
            foreach (var (f, leads) in new[] { ("leadsTo", true), ("links", false) })
            {
                if (!o.ContainsKey(f)) continue;
                // Start from this version's list as it is in the file, so an unchanged list keeps its nodes.
                if (before is not null && before.Children.TryGetValue(new YamlScalarNode(f), out var old)) m.Add(f, old);
                Write(m, f, o[f]?.ToJsonString() ?? "[]", leads, refs, $"{where} {vkey} {f}", keepEmpty: true);
            }
            seq.Add(m);
        }
        if (new HashSet<string>(seq.Children.OfType<YamlMappingNode>().Select(m => Str(m, "key")!)).Count != seq.Children.Count)
            throw new CanonValidationException($"{where}: two versions with the same key");
        // Unchanged (as ids go): keep the file's nodes, and so their formatting.
        if (existing is not null && VariantsJson(existing, id => id) == VariantsJson(seq, id => id)) return;
        if (seq.Children.Count == 0) root.Children.Remove(k);
        else root.Children[k] = seq;
    }
}
