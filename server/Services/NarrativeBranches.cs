using System.Text.Json.Nodes;
using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services.Canon;
using Microsoft.EntityFrameworkCore;
using static ColonyTracker.Api.Services.Canon.CanonNarrativeLists;

namespace ColonyTracker.Api.Services;

// Branching lives in the files (ADVENTURE-BOOK-PLAN.md §14): a branch file declares its paths and
// the paths it requires; an event file holds `variesBy`, `onPaths` and its `variants`. This presents
// them as the records the API has always served and edits them by saving the owning file.
//
// Ids: a path's id is its canonical id (path.<slug>). A version's id comes from its event and `key`;
// a version's connection or link from the version and what it connects (like NarrativeGraph).
public static class NarrativeBranches
{
    public static string VariantId(string eventId, string key) => NarrativeGraph.IdOf("variant", eventId, key);
    public static string VariantConnectionId(string variantId, string to, string thread) => NarrativeGraph.IdOf("variant-leadsTo", variantId, to, thread);
    public static string VariantLinkId(string variantId, NarrativeEntityType type, string entityId) => NarrativeGraph.IdOf("variant-links", variantId, type.ToString(), entityId);

    // ---------------------------------------------------------------- reading

    public static Task<List<PathSet>> PathSetsAsync(AppDbContext db, string cid, bool track = false) =>
        (track ? db.PathSets : db.PathSets.AsNoTracking()).Where(s => s.CampaignId == cid).ToListAsync();

    private static Task<List<NarrativeEvent>> EventsAsync(AppDbContext db, string cid, bool track = false) =>
        (track ? db.NarrativeEvents : db.NarrativeEvents.AsNoTracking()).Where(e => e.CampaignId == cid).ToListAsync();

    public static IEnumerable<NarrativePath> PathsOf(PathSet s) =>
        ParsePaths(s.PathsJson).Select((p, i) => new NarrativePath { Id = p.Id, PathSetId = s.Id, Name = p.Name, SortOrder = i });

    public static async Task<List<NarrativePath>> PathsAsync(AppDbContext db, string cid) => (await PathSetsAsync(db, cid)).SelectMany(PathsOf).ToList();

    public static async Task<List<PathSetContext>> ContextsAsync(AppDbContext db, string cid) =>
        (await PathSetsAsync(db, cid)).SelectMany(s => ParseRefList(s.RequiresJson).Select(p => new PathSetContext { PathSetId = s.Id, RequiredPathId = p })).ToList();

    public static async Task<List<NarrativeEventVariantParticipation>> ParticipationAsync(AppDbContext db, string cid) =>
        (await EventsAsync(db, cid)).SelectMany(e => ParseRefList(e.VariesByJson).Select(b => new NarrativeEventVariantParticipation { NarrativeEventId = e.Id, PathSetId = b })).ToList();

    public static async Task<List<PathEventScope>> ScopesAsync(AppDbContext db, string cid) =>
        (await EventsAsync(db, cid)).SelectMany(e => ParseRefList(e.OnPathsJson).Select(p => new PathEventScope { PathId = p, NarrativeEventId = e.Id })).ToList();

    // One version of an event, in the shape the API serves, with its paths, connections and links.
    public sealed record Version(NarrativeEventOverride Override, List<EventOverridePath> Paths, List<EventOverrideConnection> Connections, List<EventOverrideEntityLink> Links);

    public static IEnumerable<Version> VersionsOf(NarrativeEvent e)
    {
        foreach (var v in Variants(e))
        {
            var id = VariantId(e.Id, v.Key);
            var o = new NarrativeEventOverride
            {
                Id = id, NarrativeEventId = e.Id, Key = v.Key,
                OverridesSummary = v.Summary is not null, Summary = v.Summary,
                OverridesDescription = v.Synopsis is not null, Description = v.Synopsis,
                OverridesConnections = v.LeadsTo is not null, OverridesAssets = v.Links is not null,
            };
            yield return new Version(o,
                v.When.Select(p => new EventOverridePath { EventOverrideId = id, PathId = p }).ToList(),
                (v.LeadsTo ?? []).Select(l => new EventOverrideConnection { Id = VariantConnectionId(id, l.To, l.Thread), EventOverrideId = id, TargetNarrativeEventId = l.To, ThreadId = l.Thread, Visibility = l.Visibility }).ToList(),
                (v.Links ?? []).Select(l => new EventOverrideEntityLink { Id = VariantLinkId(id, l.EntityType, l.EntityId), EventOverrideId = id, EntityType = l.EntityType, EntityId = l.EntityId, Role = l.Role, IsPrimary = l.IsPrimary, Visibility = l.Visibility }).ToList());
        }
    }

    public static async Task<List<Version>> VersionsAsync(AppDbContext db, string cid) => (await EventsAsync(db, cid)).SelectMany(VersionsOf).ToList();

    // ---------------------------------------------------------------- the variants list, editable

    public sealed class Variant
    {
        public string Key { get; set; } = "";
        public List<string> When { get; set; } = [];
        public string? Summary { get; set; }
        public string? Synopsis { get; set; }
        public List<LeadsTo>? LeadsTo { get; set; }
        public List<LinkItem>? Links { get; set; }
    }

    public static List<Variant> Variants(NarrativeEvent e) =>
        (JsonNode.Parse(string.IsNullOrWhiteSpace(e.VariantsJson) ? "[]" : e.VariantsJson) as JsonArray ?? []).OfType<JsonObject>().Select(o => new Variant
        {
            Key = (string?)o["key"] ?? "",
            When = (o["when"] as JsonArray ?? []).Select(x => (string?)x).OfType<string>().ToList(),
            Summary = o.ContainsKey("summary") ? (string?)o["summary"] ?? "" : null,
            Synopsis = o.ContainsKey("synopsis") ? (string?)o["synopsis"] ?? "" : null,
            LeadsTo = o.ContainsKey("leadsTo") ? ParseLeadsTo(o["leadsTo"]?.ToJsonString()) : null,
            Links = o.ContainsKey("links") ? ParseLinks(o["links"]?.ToJsonString()) : null,
        }).ToList();

    private static void Store(NarrativeEvent e, List<Variant> list)
    {
        var arr = new JsonArray();
        foreach (var v in list)
        {
            var o = new JsonObject { ["key"] = v.Key, ["when"] = JsonNode.Parse(RefListJson(v.When)) };
            if (v.Summary is not null) o["summary"] = v.Summary;
            if (v.Synopsis is not null) o["synopsis"] = v.Synopsis;
            if (v.LeadsTo is not null) o["leadsTo"] = JsonNode.Parse(LeadsToJson(v.LeadsTo));
            if (v.Links is not null) o["links"] = JsonNode.Parse(LinksJson(v.Links));
            arr.Add(o);
        }
        e.VariantsJson = arr.ToJsonString(new System.Text.Json.JsonSerializerOptions { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
    }

    // The event (tracked) and its version with this id.
    private static async Task<(NarrativeEvent Event, List<Variant> List, Variant Variant)> FindVariantAsync(AppDbContext db, string cid, string variantId)
    {
        foreach (var e in await EventsAsync(db, cid, track: true))
        {
            var list = Variants(e);
            if (list.FirstOrDefault(v => VariantId(e.Id, v.Key) == variantId) is { } v) return (e, list, v);
        }
        throw new KeyNotFoundException($"Version {variantId} not found.");
    }

    private static async Task<NarrativeEvent> EventAsync(AppDbContext db, string cid, string id) =>
        await db.NarrativeEvents.FirstOrDefaultAsync(e => e.Id == id && e.CampaignId == cid) ?? throw new KeyNotFoundException($"Narrative event {id} not found.");

    private static async Task<PathSet> PathSetAsync(AppDbContext db, string cid, string id) =>
        await db.PathSets.FirstOrDefaultAsync(s => s.Id == id && s.CampaignId == cid) ?? throw new KeyNotFoundException($"Path set {id} not found.");

    // ---------------------------------------------------------------- versions

    public static async Task<NarrativeEventOverride> AddVersionAsync(AppDbContext db, string cid, NarrativeEventOverride o)
    {
        var e = await EventAsync(db, cid, o.NarrativeEventId);
        var list = Variants(e);
        var key = string.IsNullOrWhiteSpace(o.Key) ? null : CanonStore.AsciiSlug(o.Key);
        if (key is null) for (var n = 1; key is null || list.Any(v => v.Key == key); n++) key = $"version-{n}";
        if (list.Any(v => v.Key == key)) throw new CanonValidationException($"{e.Title} already has a version {key}.");
        var v = new Variant { Key = key };
        Apply(v, o);
        list.Add(v);
        Store(e, list);
        await db.SaveChangesAsync();
        return VersionsOf(e).First(x => x.Override.Key == key).Override;
    }

    private static void Apply(Variant v, NarrativeEventOverride o)
    {
        v.Summary = o.OverridesSummary ? o.Summary ?? "" : null;
        v.Synopsis = o.OverridesDescription ? o.Description ?? "" : null;
        v.LeadsTo = o.OverridesConnections ? v.LeadsTo ?? [] : null;
        v.Links = o.OverridesAssets ? v.Links ?? [] : null;
    }

    public static async Task<NarrativeEventOverride> UpdateVersionAsync(AppDbContext db, string cid, string id, NarrativeEventOverride o)
    {
        var (e, list, v) = await FindVariantAsync(db, cid, id);
        Apply(v, o);
        Store(e, list);
        await db.SaveChangesAsync();
        return VersionsOf(e).First(x => x.Override.Id == id).Override;
    }

    public static async Task RemoveVersionAsync(AppDbContext db, string cid, string id)
    {
        var (e, list, v) = await FindVariantAsync(db, cid, id);
        list.Remove(v);
        Store(e, list);
        await db.SaveChangesAsync();
    }

    public static async Task<bool> SetVersionPathAsync(AppDbContext db, string cid, string id, string pathId, bool on)
    {
        var (e, list, v) = await FindVariantAsync(db, cid, id);
        if (on == v.When.Contains(pathId)) return false;
        if (on) v.When.Add(pathId); else v.When.Remove(pathId);
        Store(e, list);
        await db.SaveChangesAsync();
        return true;
    }

    public static async Task<EventOverrideConnection> AddVersionConnectionAsync(AppDbContext db, string cid, EventOverrideConnection c)
    {
        var (e, list, v) = await FindVariantAsync(db, cid, c.EventOverrideId);
        v.LeadsTo ??= [];
        if (v.LeadsTo.Any(l => l.To == c.TargetNarrativeEventId && l.Thread == c.ThreadId)) throw new CanonValidationException("That connection already exists.");
        v.LeadsTo.Add(new LeadsTo(c.TargetNarrativeEventId, c.ThreadId, c.Visibility));
        Store(e, list);
        await db.SaveChangesAsync();
        return VersionsOf(e).SelectMany(x => x.Connections).First(x => x.Id == VariantConnectionId(c.EventOverrideId, c.TargetNarrativeEventId, c.ThreadId));
    }

    private static async Task<(NarrativeEvent, List<Variant>, Variant, int)> FindVersionConnectionAsync(AppDbContext db, string cid, string id)
    {
        foreach (var e in await EventsAsync(db, cid, track: true))
        {
            var list = Variants(e);
            foreach (var v in list)
            {
                var i = (v.LeadsTo ?? []).FindIndex(l => VariantConnectionId(VariantId(e.Id, v.Key), l.To, l.Thread) == id);
                if (i >= 0) return (e, list, v, i);
            }
        }
        throw new KeyNotFoundException($"Version connection {id} not found.");
    }

    public static async Task<EventOverrideConnection> UpdateVersionConnectionAsync(AppDbContext db, string cid, string id, EventOverrideConnection c)
    {
        var (e, list, v, i) = await FindVersionConnectionAsync(db, cid, id);
        if (v.LeadsTo!.Where((l, j) => j != i).Any(l => l.To == c.TargetNarrativeEventId && l.Thread == c.ThreadId)) throw new CanonValidationException("That connection already exists.");
        v.LeadsTo[i] = new LeadsTo(c.TargetNarrativeEventId, c.ThreadId, c.Visibility);
        Store(e, list);
        await db.SaveChangesAsync();
        var vid = VariantId(e.Id, v.Key);
        return VersionsOf(e).SelectMany(x => x.Connections).First(x => x.Id == VariantConnectionId(vid, c.TargetNarrativeEventId, c.ThreadId));
    }

    public static async Task RemoveVersionConnectionAsync(AppDbContext db, string cid, string id)
    {
        var (e, list, v, i) = await FindVersionConnectionAsync(db, cid, id);
        v.LeadsTo!.RemoveAt(i);
        Store(e, list);
        await db.SaveChangesAsync();
    }

    public static async Task<EventOverrideEntityLink> AddVersionLinkAsync(AppDbContext db, string cid, EventOverrideEntityLink l)
    {
        if (!NarrativeEntityLink.IsAuthored(l.EntityType)) throw new CanonValidationException($"A {l.EntityType} link is play data and can't be part of a version.");
        var (e, list, v) = await FindVariantAsync(db, cid, l.EventOverrideId);
        v.Links ??= [];
        if (v.Links.Any(x => x.EntityType == l.EntityType && x.EntityId == l.EntityId)) throw new CanonValidationException("That link already exists.");
        v.Links.Add(new LinkItem(l.EntityType, l.EntityId, l.Role, null, l.IsPrimary, l.Visibility));
        Store(e, list);
        await db.SaveChangesAsync();
        return VersionsOf(e).SelectMany(x => x.Links).First(x => x.Id == VariantLinkId(l.EventOverrideId, l.EntityType, l.EntityId));
    }

    private static async Task<(NarrativeEvent, List<Variant>, Variant, int)> FindVersionLinkAsync(AppDbContext db, string cid, string id)
    {
        foreach (var e in await EventsAsync(db, cid, track: true))
        {
            var list = Variants(e);
            foreach (var v in list)
            {
                var i = (v.Links ?? []).FindIndex(l => VariantLinkId(VariantId(e.Id, v.Key), l.EntityType, l.EntityId) == id);
                if (i >= 0) return (e, list, v, i);
            }
        }
        throw new KeyNotFoundException($"Version link {id} not found.");
    }

    public static async Task<EventOverrideEntityLink> UpdateVersionLinkAsync(AppDbContext db, string cid, string id, EventOverrideEntityLink l)
    {
        if (!NarrativeEntityLink.IsAuthored(l.EntityType)) throw new CanonValidationException($"A {l.EntityType} link is play data and can't be part of a version.");
        var (e, list, v, i) = await FindVersionLinkAsync(db, cid, id);
        if (v.Links!.Where((x, j) => j != i).Any(x => x.EntityType == l.EntityType && x.EntityId == l.EntityId)) throw new CanonValidationException("That link already exists.");
        v.Links[i] = new LinkItem(l.EntityType, l.EntityId, l.Role, v.Links[i].Notes, l.IsPrimary, l.Visibility);
        Store(e, list);
        await db.SaveChangesAsync();
        var vid = VariantId(e.Id, v.Key);
        return VersionsOf(e).SelectMany(x => x.Links).First(x => x.Id == VariantLinkId(vid, l.EntityType, l.EntityId));
    }

    public static async Task RemoveVersionLinkAsync(AppDbContext db, string cid, string id)
    {
        var (e, list, v, i) = await FindVersionLinkAsync(db, cid, id);
        v.Links!.RemoveAt(i);
        Store(e, list);
        await db.SaveChangesAsync();
    }

    // ---------------------------------------------------------------- participation and scope

    public static async Task<bool> SetParticipationAsync(AppDbContext db, string cid, string eventId, string pathSetId, bool on)
    {
        var e = await EventAsync(db, cid, eventId);
        await PathSetAsync(db, cid, pathSetId);
        var list = ParseRefList(e.VariesByJson);
        if (on == list.Contains(pathSetId)) return false;
        if (on) list.Add(pathSetId); else list.Remove(pathSetId);
        e.VariesByJson = RefListJson(list);
        await db.SaveChangesAsync();
        return true;
    }

    public static async Task<bool> SetScopeAsync(AppDbContext db, string cid, string pathId, string eventId, bool on)
    {
        var e = await EventAsync(db, cid, eventId);
        var list = ParseRefList(e.OnPathsJson);
        if (on == list.Contains(pathId)) return false;
        if (on) list.Add(pathId); else list.Remove(pathId);
        e.OnPathsJson = RefListJson(list);
        await db.SaveChangesAsync();
        return true;
    }

    // PUT replaces the full scope of a path: exactly these events have it in `onPaths`.
    public static async Task ReplaceScopeAsync(AppDbContext db, string cid, string pathId, IReadOnlyCollection<string> eventIds)
    {
        foreach (var e in await EventsAsync(db, cid, track: true))
        {
            var list = ParseRefList(e.OnPathsJson);
            var want = eventIds.Contains(e.Id);
            if (want == list.Contains(pathId)) continue;
            if (want) list.Add(pathId); else list.Remove(pathId);
            e.OnPathsJson = RefListJson(list);
        }
        await db.SaveChangesAsync();
    }

    // ---------------------------------------------------------------- paths and contexts

    public static async Task<NarrativePath> AddPathAsync(AppDbContext db, string cid, NarrativePath p)
    {
        var s = await PathSetAsync(db, cid, p.PathSetId);
        if (string.IsNullOrWhiteSpace(p.Name)) throw new CanonValidationException("A path needs a name.");
        var canon = db.Canon ?? throw new InvalidOperationException("No canonical file store.");
        var taken = canon.All("branch").SelectMany(b => ParsePaths(CanonNarrativeLists.PathsJson(b.Document.Frontmatter.Children.TryGetValue(new YamlDotNet.RepresentationModel.YamlScalarNode("paths"), out var n) ? n as YamlDotNet.RepresentationModel.YamlSequenceNode : null)))
            .Select(x => x.Id).Concat(ParsePaths(s.PathsJson).Select(x => x.Id)).ToHashSet();
        var basis = CanonStore.AsciiSlug(p.Name);
        var id = $"path.{(basis.Length > 0 ? basis : "path")}";
        for (var n = 2; taken.Contains(id); n++) id = $"path.{basis}-{n}";
        var list = ParsePaths(s.PathsJson);
        list.Insert(Math.Clamp(p.SortOrder, 0, list.Count), new PathItem(id, p.Name.Trim()));
        s.PathsJson = CanonNarrativeLists.PathsJson(list);
        await db.SaveChangesAsync();
        return PathsOf(s).First(x => x.Id == id);
    }

    private static async Task<PathSet> PathSetOfPathAsync(AppDbContext db, string cid, string pathId) =>
        (await PathSetsAsync(db, cid, track: true)).FirstOrDefault(s => ParsePaths(s.PathsJson).Any(p => p.Id == pathId))
        ?? throw new KeyNotFoundException($"Path {pathId} not found.");

    public static async Task<NarrativePath> UpdatePathAsync(AppDbContext db, string cid, string id, NarrativePath p)
    {
        var s = await PathSetOfPathAsync(db, cid, id);
        var list = ParsePaths(s.PathsJson);
        var i = list.FindIndex(x => x.Id == id);
        list.RemoveAt(i);
        list.Insert(Math.Clamp(p.SortOrder, 0, list.Count), new PathItem(id, string.IsNullOrWhiteSpace(p.Name) ? throw new CanonValidationException("A path needs a name.") : p.Name.Trim()));
        s.PathsJson = CanonNarrativeLists.PathsJson(list);
        await db.SaveChangesAsync();
        return PathsOf(s).First(x => x.Id == id);
    }

    // Events that name the path in a version or `onPaths` keep it there, flagged as a stale reference (§12).
    public static async Task RemovePathAsync(AppDbContext db, string cid, string id)
    {
        var s = await PathSetOfPathAsync(db, cid, id);
        s.PathsJson = CanonNarrativeLists.PathsJson(ParsePaths(s.PathsJson).Where(x => x.Id != id));
        await db.SaveChangesAsync();
    }

    public static async Task<bool> SetContextAsync(AppDbContext db, string cid, string pathSetId, string pathId, bool on)
    {
        var s = await PathSetAsync(db, cid, pathSetId);
        var list = ParseRefList(s.RequiresJson);
        if (on == list.Contains(pathId)) return false;
        if (on) list.Add(pathId); else list.Remove(pathId);
        s.RequiresJson = RefListJson(list);
        await db.SaveChangesAsync();
        return true;
    }
}
