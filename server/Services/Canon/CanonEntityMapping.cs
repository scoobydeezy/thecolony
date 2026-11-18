using System.Globalization;
using System.Reflection;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using ColonyTracker.Api.Models;
using YamlDotNet.Core;
using YamlDotNet.RepresentationModel;

namespace ColonyTracker.Api.Services.Canon;

// Maps factions, Assets, locations and faction goals to and from their canonical .yaml files
// (ADVENTURE-BOOK-PLAN.md §10, §11). One table per type lists every file-backed property and where it
// lives in the file; the rows keep Id, CampaignId, CanonId and play data (IntroducedAtEventId, and
// for factions SortOrder plus the retired Momentum / PowerModifier columns).
public static class CanonEntityMapping
{
    // PolyRef: a reference whose target type is another property's value (a goal's target).
    // Effects: a JSON list of Effects on the entity, a YAML list in the file (ids translated).
    // LeadsTo / Links: an event's connections and an event's or thread's links (ADVENTURE-BOOK-PLAN.md
    // §13), a JSON list with row ids on the entity, a YAML list with canonical ids in the file.
    // RefList: a list of canonical ids of RefType (JSON: row ids). Paths: a branch's [{id, name}].
    // Variants: an event's per-path versions (§14).
    // Requirements / ConditionVariesBy: a World Condition's `requires` and `variesBy` (§15), JSON with row ids.
    public enum FieldKind { Text, Int, Number, Bool, Enum, Ref, PolyRef, Effects, LeadsTo, Links, RefList, Paths, Variants, Requirements, ConditionVariesBy }

    // Path: dotted location in the file. RefType: the reference target for Ref, or for PolyRef the
    // property holding the target type. Omit: a value left out of the file (the schema's default).
    public sealed record Field(string Property, string Path, FieldKind Kind, string? RefType = null, string? Omit = null);

    private static Field T(string p, string path) => new(p, path, FieldKind.Text);
    private static Field I(string p, string path) => new(p, path, FieldKind.Int);
    private static Field N(string p, string path) => new(p, path, FieldKind.Number);
    private static Field B(string p, string path) => new(p, path, FieldKind.Bool);
    private static Field E(string p, string path) => new(p, path, FieldKind.Enum);
    private static Field R(string p, string path, string type) => new(p, path, FieldKind.Ref, type);
    private static Field P(string p, string path, string typeProperty) => new(p, path, FieldKind.PolyRef, typeProperty);
    private static Field X(string p, string path) => new(p, path, FieldKind.Effects);
    private static Field L(string p, string path) => new(p, path, FieldKind.LeadsTo);
    private static Field K(string p, string path) => new(p, path, FieldKind.Links);
    private static Field RL(string p, string path, string type) => new(p, path, FieldKind.RefList, type);

    // Order within each nested mapping follows the order here (top-level order: CanonStore.Kinds).
    public static readonly IReadOnlyDictionary<Type, (string Kind, Field[] Fields)> Tables = new Dictionary<Type, (string, Field[])>
    {
        [typeof(Faction)] = ("faction", [
            T(nameof(Faction.Name), "name"), E(nameof(Faction.Type), "type"), T(nameof(Faction.Summary), "summary"),
            T(nameof(Faction.Motto), "motto"), T(nameof(Faction.Represents), "represents"), T(nameof(Faction.PublicFace), "publicFace"),
            T(nameof(Faction.SelfImage), "selfImage"), T(nameof(Faction.CoreTenet), "coreTenet"), T(nameof(Faction.Focus), "focus"),
            T(nameof(Faction.CertainOf), "certainOf"), T(nameof(Faction.RightAbout), "rightAbout"), T(nameof(Faction.AfraidOf), "afraidOf"),
            T(nameof(Faction.WrongAbout), "wrongAbout"), T(nameof(Faction.Response), "response"), T(nameof(Faction.Origin), "origin"),
            T(nameof(Faction.FoundedAs), "foundedAs"), T(nameof(Faction.Became), "became"), T(nameof(Faction.History), "history"),
            T(nameof(Faction.Notes), "notes"),
            T(nameof(Faction.GlyphPath), "heraldry.glyph"), T(nameof(Faction.IconPath), "heraldry.icon"),
            T(nameof(Faction.PrimaryColor), "heraldry.primaryColor"), T(nameof(Faction.SecondaryColor), "heraldry.secondaryColor"),
            T(nameof(Faction.BannerShape), "heraldry.bannerShape"),
            B(nameof(Faction.Active), "start.active"), R(nameof(Faction.LeaderId), "start.leader", "character"),
            I(nameof(Faction.MomentumTier), "start.momentum"), I(nameof(Faction.FactionSize), "start.size"),
            N(nameof(Faction.TruthValue), "start.values.truth"), N(nameof(Faction.StabilityValue), "start.values.stability"),
            N(nameof(Faction.AgencyValue), "start.values.agency"),
            E(nameof(Faction.BeliefA), "start.beliefs.a"), E(nameof(Faction.BeliefB), "start.beliefs.b"), E(nameof(Faction.BeliefC), "start.beliefs.c"),
        ]),
        [typeof(Asset)] = ("asset", [
            T(nameof(Asset.Name), "name"), E(nameof(Asset.Type), "type"), E(nameof(Asset.Role), "role"), I(nameof(Asset.Tier), "tier"),
            B(nameof(Asset.Keystone), "keystone"), T(nameof(Asset.Description), "summary"),
            R(nameof(Asset.ControllingFactionId), "start.controller", "faction"), R(nameof(Asset.LocationId), "start.location", "location"),
            E(nameof(Asset.Status), "start.status"), R(nameof(Asset.StatusActorFactionId), "start.statusActor", "faction"),
        ]),
        [typeof(Location)] = ("location", [
            T(nameof(Location.Name), "name"), T(nameof(Location.LocationType), "type"), T(nameof(Location.Description), "summary"),
            R(nameof(Location.ParentLocationId), "parent", "location"), R(nameof(Location.LinkedAssetId), "asset", "asset"),
            T(nameof(Location.MarkerColor), "markerColor"), E(nameof(Location.State), "start.state"),
        ]),
        [typeof(FactionGoal)] = ("goal", [
            T(nameof(FactionGoal.Title), "name"), R(nameof(FactionGoal.FactionId), "faction", "faction"),
            E(nameof(FactionGoal.ConditionType), "type"), E(nameof(FactionGoal.Priority), "priority"), E(nameof(FactionGoal.Visibility), "visibility"),
            E(nameof(FactionGoal.OutcomeMode), "outcome"), I(nameof(FactionGoal.EarliestAct), "earliestAct"),
            R(nameof(FactionGoal.ChampionId), "champion", "character"),
            E(nameof(FactionGoal.TargetEntityType), "target.type"), P(nameof(FactionGoal.TargetEntityId), "target.id", nameof(FactionGoal.TargetEntityType)),
            T(nameof(FactionGoal.TargetState), "target.state"), R(nameof(FactionGoal.TargetOwnerFactionId), "target.owner", "faction"),
            T(nameof(FactionGoal.TargetProperty), "target.property"), T(nameof(FactionGoal.TargetOperator), "target.operator"),
            I(nameof(FactionGoal.TargetThreshold), "target.threshold"),
            X(nameof(FactionGoal.ProgressingEffectsJson), "effects.progressing"), X(nameof(FactionGoal.AccomplishedEffectsJson), "effects.accomplished"),
            E(nameof(FactionGoal.Status), "start.status"),
        ]),
        // Kind "event" stands for both event and encounter files (NarrativeEvent.Kind says which).
        // part, chapter, order, route, readiness, inventory, revelations and the body are the book's.
        [typeof(NarrativeEvent)] = ("event", [
            T(nameof(NarrativeEvent.Title), "name"), T(nameof(NarrativeEvent.Summary), "summary"),
            T(nameof(NarrativeEvent.NarrativeFunction), "function"), T(nameof(NarrativeEvent.Description), "synopsis"),
            new(nameof(NarrativeEvent.Visibility), "visibility", FieldKind.Enum, Omit: nameof(NarrativeVisibility.GMOnly)),
            R(nameof(NarrativeEvent.ParentEventId), "event", "narrative"),
            L(nameof(NarrativeEvent.LeadsToJson), "leadsTo"), K(nameof(NarrativeEvent.LinksJson), "links"),
            RL(nameof(NarrativeEvent.VariesByJson), "variesBy", "branch"), RL(nameof(NarrativeEvent.OnPathsJson), "onPaths", "path"),
            new(nameof(NarrativeEvent.VariantsJson), "variants", FieldKind.Variants),
        ]),
        // §14. A path's app id is its canonical id, so `paths`, `requires` and `when` need no translation.
        // §15. SortOrder stays in the row.
        [typeof(WorldCondition)] = ("condition", [
            T(nameof(WorldCondition.Title), "name"), T(nameof(WorldCondition.Rule), "rule"), T(nameof(WorldCondition.RuleOtherwise), "otherwise"),
            new(nameof(WorldCondition.StressContribution), "stress", FieldKind.Int, Omit: "0"),
            new(nameof(WorldCondition.RequirementsJson), "requires", FieldKind.Requirements),
            new(nameof(WorldCondition.VariesByJson), "variesBy", FieldKind.ConditionVariesBy),
            new(nameof(WorldCondition.ActiveAtStart), "start.established", FieldKind.Bool, Omit: "true"),
        ]),
        [typeof(PathSet)] = ("branch", [
            T(nameof(PathSet.Name), "name"), R(nameof(PathSet.OriginEventId), "origin", "narrative"), R(nameof(PathSet.ConvergenceEventId), "convergence", "narrative"),
            RL(nameof(PathSet.RequiresJson), "requires", "path"), new(nameof(PathSet.PathsJson), "paths", FieldKind.Paths),
        ]),
        [typeof(NarrativeThread)] = ("thread", [
            T(nameof(NarrativeThread.Title), "name"), T(nameof(NarrativeThread.Summary), "summary"),
            T(nameof(NarrativeThread.Color), "color"), K(nameof(NarrativeThread.LinksJson), "links"),
        ]),
    };

    // The table for a file kind (an encounter file uses the event table).
    public static (string Kind, Field[] Fields)? TableForKind(string kind)
    {
        var k = kind == "encounter" ? "event" : kind;
        foreach (var t in Tables.Values) if (t.Kind == k) return t;
        return null;
    }

    // Mappings kept in the file even when empty (as the merges wrote them).
    private static readonly HashSet<string> KeepEmpty = ["start", "start.beliefs"];

    public static bool Maps(Type t) => Tables.ContainsKey(t);
    // The display-name property (a goal's is its title).
    public static string NameProperty(Type t) => Tables.TryGetValue(t, out var tb) ? tb.Fields[0].Property : "Name";
    public static string[] PropertiesOf(Type t) => Tables[t].Fields.Select(f => f.Property).ToArray();

    // ---------------------------------------------------------------- file -> entity

    public static void Hydrate(object entity, CanonStore.Entry e, CanonRefs? refs, CanonStore? store = null)
    {
        var type = entity.GetType();
        var defaults = Activator.CreateInstance(type)!;
        var campaign = ((ICanonEntity)entity).CampaignId;
        foreach (var f in Tables[type].Fields)
        {
            var prop = type.GetProperty(f.Property)!;
            if (f.Kind == FieldKind.Effects)
            {
                prop.SetValue(entity, EffectsToJson(Node(e.Document.Frontmatter, f.Path) as YamlSequenceNode, id => refs is null ? id : refs.ToRow(campaign, id)));
                continue;
            }
            if (f.Kind is FieldKind.Requirements or FieldKind.ConditionVariesBy)
            {
                prop.SetValue(entity, CanonConditionJson.Hydrate(Node(e.Document.Frontmatter, f.Path), f.Kind == FieldKind.Requirements, id => refs is null ? id : refs.ToRow(campaign, id))
                    ?? prop.GetValue(defaults));
                continue;
            }
            if (f.Kind is FieldKind.LeadsTo or FieldKind.Links or FieldKind.RefList or FieldKind.Paths or FieldKind.Variants)
            {
                var seq = Node(e.Document.Frontmatter, f.Path) as YamlSequenceNode;
                string? Row(string id) => refs is null ? id : refs.ToRow(campaign, id);
                prop.SetValue(entity, f.Kind switch
                {
                    FieldKind.LeadsTo => CanonNarrativeLists.LeadsToJson(seq, Row),
                    FieldKind.Links => CanonNarrativeLists.LinksJson(seq, Row),
                    FieldKind.RefList => CanonNarrativeLists.RefListJson(seq, Row),
                    FieldKind.Paths => CanonNarrativeLists.PathsJson(seq),
                    _ => CanonNarrativeLists.VariantsJson(seq, Row),
                });
                continue;
            }
            var raw = Read(e.Document.Frontmatter, f.Path);
            prop.SetValue(entity, raw is null ? prop.GetValue(defaults) : Convert(prop, f, raw, refs, campaign, e.Id));
        }
        if (entity is NarrativeEvent ne) ne.Kind = e.Kind == "encounter" ? NarrativeKind.Encounter : NarrativeKind.Event;
        // One fact, one place (§10): an Asset that a location stands for is where that location is.
        if (entity is Asset a && store?.LocationLinking(e.Id) is { } linking)
            a.LocationId = Read(linking.Document.Frontmatter, "parent") is { } parent ? (refs is null ? parent : refs.ToRow(campaign, parent)) : null;
    }

    private static object? Convert(PropertyInfo prop, Field f, string raw, CanonRefs? refs, string campaign, string where)
    {
        var t = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;
        return f.Kind switch
        {
            FieldKind.Text => raw,
            FieldKind.Ref or FieldKind.PolyRef => refs is null ? raw : refs.ToRow(campaign, raw),
            FieldKind.Int => int.Parse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture),
            FieldKind.Number => double.Parse(raw, NumberStyles.Float, CultureInfo.InvariantCulture),
            FieldKind.Bool => raw is "true" or "True" or "TRUE",
            FieldKind.Enum => Enum.TryParse(t, raw, out var v) ? v : throw new FormatException($"{where}: {f.Path} \"{raw}\" is not a {t.Name}"),
            _ => throw new ArgumentOutOfRangeException(nameof(f)),
        };
    }

    private static YamlNode? Node(YamlMappingNode root, string path)
    {
        YamlNode node = root;
        foreach (var key in path.Split('.'))
        {
            if (node is not YamlMappingNode m || !m.Children.TryGetValue(new YamlScalarNode(key), out var next)) return null;
            node = next;
        }
        return node;
    }

    public static string? Read(YamlMappingNode root, string path) =>
        Node(root, path) is YamlScalarNode s && s.Value is { } v && !(s.Style is ScalarStyle.Plain && v is "" or "~" or "null") ? v : null;

    // ---------------------------------------------------------------- references

    private static readonly string[] CharacterRefs = ["start.faction", "start.socialClass", "start.location", "start.reaffirmedFaction"];

    // Every canonical id a file refers to, with where (a dotted path; Effects as effects.<when>[i].field).
    public static IEnumerable<(string Path, string Id)> References(CanonStore.Entry e)
    {
        var fm = e.Document.Frontmatter;
        if (e.Kind is "npc" or "pc")
        {
            foreach (var p in CharacterRefs) if (Read(fm, p) is { } v) yield return (p, v);
            foreach (var r in CanonCharacterRelations.References(Node(fm, "relationships") as YamlSequenceNode)) yield return r;
            yield break;
        }
        if (TableForKind(e.Kind) is not { } table) yield break;
        foreach (var f in table.Fields)
        {
            if (f.Kind is FieldKind.Ref or FieldKind.PolyRef && Read(fm, f.Path) is { } v) yield return (f.Path, v);
            if (f.Kind is FieldKind.LeadsTo or FieldKind.Links)
                foreach (var r in CanonNarrativeLists.References(Node(fm, f.Path) as YamlSequenceNode, f.Path, f.Kind == FieldKind.LeadsTo)) yield return r;
            if (f.Kind is FieldKind.RefList && Node(fm, f.Path) is YamlSequenceNode ids)
                for (var i = 0; i < ids.Children.Count; i++) if (ids.Children[i] is YamlScalarNode { Value: { Length: > 0 } id }) yield return ($"{f.Path}[{i}]", id);
            if (f.Kind is FieldKind.Variants)
                foreach (var r in CanonNarrativeLists.VariantReferences(Node(fm, f.Path) as YamlSequenceNode)) yield return r;
            if (f.Kind is FieldKind.Requirements or FieldKind.ConditionVariesBy)
                foreach (var r in CanonConditionJson.References(Node(fm, f.Path), f.Path, f.Kind == FieldKind.Requirements)) yield return r;
            if (f.Kind == FieldKind.Effects && Node(fm, f.Path) is YamlSequenceNode seq)
                for (var i = 0; i < seq.Children.Count; i++)
                {
                    if (seq.Children[i] is not YamlMappingNode m) continue;
                    string? Get(string k) => m.Children.TryGetValue(new YamlScalarNode(k), out var n) && n is YamlScalarNode sn ? sn.Value : null;
                    if (Get("targetId") is { } t) yield return ($"{f.Path}[{i}].targetId", t);
                    if (RefTypeOfValue(Get("targetType"), Get("property")) is not null && Get("value") is { } val) yield return ($"{f.Path}[{i}].value", val);
                }
        }
    }

    // ---------------------------------------------------------------- Effects lists

    // Which Effect fields hold ids, by target type and property (GoalAdvanceRules' vocabulary).
    private static string RefTypeOfTarget(string? targetType) => targetType == "character" ? "character" : targetType ?? "";
    private static string? RefTypeOfValue(string? targetType, string? property) => (targetType, property) switch
    {
        ("asset", "controllingFactionId") => "faction",
        ("asset", "locationChange") => "location",
        _ => null,
    };

    private static readonly JsonSerializerOptions Compact = new() { Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    // YAML list -> the app's compact JSON, keys in file order, ids mapped by `map`.
    private static string EffectsToJson(YamlSequenceNode? seq, Func<string, string?> map)
    {
        if (seq is null || seq.Children.Count == 0) return "[]";
        var arr = new JsonArray();
        foreach (var item in seq.Children.OfType<YamlMappingNode>())
        {
            var o = new JsonObject();
            string? Get(string k) => item.Children.TryGetValue(new YamlScalarNode(k), out var v) && v is YamlScalarNode sv ? sv.Value : null;
            var tt = Get("targetType"); var prop = Get("property");
            foreach (var (k, v) in item.Children)
            {
                var key = ((YamlScalarNode)k).Value!;
                var node = CanonStore.ToJson(v);
                if (node is JsonValue jv && jv.TryGetValue<string>(out var str) && (key == "targetId" || (key == "value" && RefTypeOfValue(tt, prop) is not null)))
                    node = JsonValue.Create(map(str));
                o[key] = node;
            }
            arr.Add(o);
        }
        return arr.ToJsonString(Compact);
    }

    // The app's JSON -> a YAML list, ids mapped by `map`.
    private static YamlSequenceNode JsonToEffects(string json, Func<string, string, string?> map, string where)
    {
        var seq = new YamlSequenceNode();
        JsonNode? root;
        try { root = JsonNode.Parse(json); } catch (JsonException) { throw new CanonValidationException($"{where}: the Effects are not valid JSON"); }
        foreach (var item in root as JsonArray ?? throw new CanonValidationException($"{where}: the Effects must be a list"))
        {
            if (item is not JsonObject o) throw new CanonValidationException($"{where}: each Effect must be an object");
            var tt = (string?)o["targetType"]; var prop = (string?)o["property"];
            var m = new YamlMappingNode();
            foreach (var (k, v) in o)
            {
                if (v is null) continue;
                if (v is JsonValue jv && jv.TryGetValue<string>(out var str))
                {
                    var refType = k == "targetId" ? RefTypeOfTarget(tt) : k == "value" ? RefTypeOfValue(tt, prop) : null;
                    m.Add(new YamlScalarNode(k), CanonYaml.Scalar(refType is null ? str : map(refType, str) ?? str));
                }
                else if (v is JsonValue num && num.GetValueKind() is JsonValueKind.Number or JsonValueKind.True or JsonValueKind.False)
                    m.Add(new YamlScalarNode(k), new YamlScalarNode(num.ToJsonString()));
                else throw new CanonValidationException($"{where}: Effect field {k} must be a string or a number");
            }
            seq.Add(m);
        }
        return seq;
    }

    // ---------------------------------------------------------------- entity -> file

    public static void Apply(object entity, CanonStore.Document doc, CanonRefs refs, CanonStore? store = null)
    {
        var type = entity.GetType();
        var (kind, fields) = Tables[type];
        var where = ((ICanonEntity)entity).CanonId ?? kind;
        foreach (var f in fields)
        {
            var v = type.GetProperty(f.Property)!.GetValue(entity);
            if (f.Kind == FieldKind.Effects)
            {
                WriteEffects(doc.Frontmatter, f.Path, v as string, refs, $"{where} {f.Path}");
                continue;
            }
            if (f.Kind is FieldKind.LeadsTo or FieldKind.Links)
            {
                CanonNarrativeLists.Write(doc.Frontmatter, f.Path, v as string, f.Kind == FieldKind.LeadsTo, refs, $"{where} {f.Path}");
                continue;
            }
            if (f.Kind is FieldKind.RefList) { CanonNarrativeLists.WriteRefList(doc.Frontmatter, f.Path, v as string, f.RefType!, refs, $"{where} {f.Path}"); continue; }
            if (f.Kind is FieldKind.Paths) { CanonNarrativeLists.WritePaths(doc.Frontmatter, f.Path, v as string, $"{where} {f.Path}"); continue; }
            if (f.Kind is FieldKind.Variants) { CanonNarrativeLists.WriteVariants(doc.Frontmatter, f.Path, v as string, refs, $"{where} {f.Path}"); continue; }
            if (f.Kind is FieldKind.Requirements or FieldKind.ConditionVariesBy) { CanonConditionJson.Write(doc.Frontmatter, f.Path, v as string, f.Kind == FieldKind.Requirements, refs, $"{where} {f.Path}"); continue; }
            string? text = v switch
            {
                null => null,
                string s when f.Kind == FieldKind.Ref => refs.ToCanon(f.RefType!, s, $"{where} {f.Path}"),
                string s when f.Kind == FieldKind.PolyRef => refs.ToCanon(type.GetProperty(f.RefType!)!.GetValue(entity)?.ToString()?.ToLowerInvariant() ?? "?", s, $"{where} {f.Path}"),
                string s => string.IsNullOrWhiteSpace(s) ? null : s,
                bool b => b ? "true" : "false",
                int i => i.ToString(CultureInfo.InvariantCulture),
                double d => d.ToString("R", CultureInfo.InvariantCulture),
                Enum en => en.ToString(),
                _ => v.ToString(),
            };
            if (f.Omit is not null && text == f.Omit) text = null;
            Write(doc.Frontmatter, f.Path, text, quoteNumbers: f.Kind is FieldKind.Text);
        }
        // An Asset that a location stands for takes its location from that location's parent.
        if (entity is Asset && ((ICanonEntity)entity).CanonId is { } id && store?.LocationLinking(id) is not null)
            Write(doc.Frontmatter, "start.location", null, false);
        Prune(doc.Frontmatter, "");
        // A condition established at the start has no start: (the default), even if it once had one.
        if (kind == "condition" && Node(doc.Frontmatter, "start") is YamlMappingNode { Children.Count: 0 }) doc.Frontmatter.Children.Remove(new YamlScalarNode("start"));
        Order(doc.Frontmatter, "", fields);
    }

    private static void WriteEffects(YamlMappingNode root, string path, string? json, CanonRefs refs, string where)
    {
        json = string.IsNullOrWhiteSpace(json) ? "[]" : json;
        var existing = Node(root, path) as YamlSequenceNode;
        // Unchanged (after id translation): keep the nodes, and so their formatting.
        if (existing is not null && SameJson(EffectsToJson(existing, id => id), JsonToEffectsJson(json, refs, where))) return;
        var seq = JsonToEffects(json, (t, id) => refs.ToCanon(t, id, where), where);
        var keys = path.Split('.');
        if (seq.Children.Count == 0) { if (Node(root, keys[0]) is YamlMappingNode parent) parent.Children.Remove(new YamlScalarNode(keys[1])); return; }
        if (Node(root, keys[0]) is not YamlMappingNode m) { m = new YamlMappingNode(); root.Children[new YamlScalarNode(keys[0])] = m; }
        m.Children[new YamlScalarNode(keys[1])] = seq;
    }

    // The app's JSON with ids already canonical, for comparing with the file.
    private static string JsonToEffectsJson(string json, CanonRefs refs, string where) =>
        EffectsToJson(JsonToEffects(json, (t, id) => refs.ToCanon(t, id, where), where), id => id);

    private static bool SameJson(string a, string b) => JsonNode.DeepEquals(JsonNode.Parse(a), JsonNode.Parse(b));

    private static void Write(YamlMappingNode root, string path, string? value, bool quoteNumbers)
    {
        var keys = path.Split('.');
        var map = root;
        for (var i = 0; i < keys.Length - 1; i++)
        {
            var k = new YamlScalarNode(keys[i]);
            if (map.Children.TryGetValue(k, out var child) && child is YamlMappingNode cm) { map = cm; continue; }
            if (value is null) return;   // nothing to remove under a mapping that doesn't exist
            var created = new YamlMappingNode();
            map.Children[k] = created;
            map = created;
        }
        var key = new YamlScalarNode(keys[^1]);
        if (value is null) { map.Children.Remove(key); return; }
        CanonYaml.Set(map, key.Value!, value, quoteNumbers);
    }

    private static void Prune(YamlMappingNode map, string prefix)
    {
        foreach (var (k, v) in map.Children.ToList())
        {
            if (v is not YamlMappingNode child || k is not YamlScalarNode { Value: { } name }) continue;
            var path = prefix.Length == 0 ? name : $"{prefix}.{name}";
            Prune(child, path);
            if (child.Children.Count == 0 && !KeepEmpty.Contains(path)) map.Children.Remove(k);
        }
    }

    // Nested mappings follow the table's order; keys the app doesn't own keep their place after.
    private static void Order(YamlMappingNode map, string prefix, Field[] fields)
    {
        if (prefix.Length > 0)
        {
            var rank = fields.Select(f => f.Path).Where(p => p.StartsWith(prefix + ".", StringComparison.Ordinal))
                .Select(p => p[(prefix.Length + 1)..].Split('.')[0]).Distinct().Select((k, i) => (k, i)).ToDictionary(x => x.k, x => x.i);
            var sorted = map.Children.Select((kv, i) => (kv, i))
                .OrderBy(x => x.kv.Key is YamlScalarNode { Value: { } k } && rank.TryGetValue(k, out var r) ? r : rank.Count).ThenBy(x => x.i)
                .Select(x => x.kv).ToList();
            map.Children.Clear();
            foreach (var kv in sorted) map.Children.Add(kv.Key, kv.Value);
        }
        foreach (var (k, v) in map.Children)
            if (v is YamlMappingNode child && k is YamlScalarNode { Value: { } name })
                Order(child, prefix.Length == 0 ? name : $"{prefix}.{name}", fields);
    }
}

// How the app writes YAML scalars, matching the scripts that first wrote the files (js-yaml with
// double quotes): an unchanged value keeps its node (and so its quoting); multi-line text is a
// literal block; anything YAML would misread unquoted is double-quoted.
public static class CanonYaml
{
    public static void Set(YamlMappingNode map, string key, string? value, bool isText = true)
    {
        var k = new YamlScalarNode(key);
        if (value is null) { map.Children.Remove(k); return; }
        if (map.Children.TryGetValue(k, out var old) && old is YamlScalarNode os && os.Value == value) return;
        map.Children[k] = Scalar(value, isText);
    }

    public static YamlScalarNode Scalar(string value, bool isText = true)
    {
        var node = new YamlScalarNode(value);
        if (value.Contains('\n')) node.Style = ScalarStyle.Literal;
        else if (NeedsQuotes(value) || (isText && LooksTyped(value))) node.Style = ScalarStyle.DoubleQuoted;
        return node;
    }

    private static bool LooksTyped(string v) =>
        v is "true" or "false" or "True" or "False" or "TRUE" or "FALSE" or "null" or "Null" or "NULL" or "~" or "yes" or "no"
        || double.TryParse(v, NumberStyles.Float, CultureInfo.InvariantCulture, out _);

    private static bool NeedsQuotes(string v) =>
        v.Length == 0 || char.IsWhiteSpace(v[0]) || char.IsWhiteSpace(v[^1]) || "#&*!|>'\"%@`{[,]}".Contains(v[0])
        || ((v[0] is '-' or '?' or ':') && (v.Length == 1 || v[1] == ' '))
        || v.Contains(": ") || v.Contains(" #") || v.EndsWith(':') || v.Contains('\t');
}
