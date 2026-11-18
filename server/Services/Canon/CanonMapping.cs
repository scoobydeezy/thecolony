using System.Runtime.CompilerServices;
using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace ColonyTracker.Api.Services.Canon;

// One entry point for every file-backed entity type (ADVENTURE-BOOK-PLAN.md §9, §10): characters
// (CanonCharacterMapping) and factions, Assets and locations (CanonEntityMapping).
public static class CanonMapping
{
    public static readonly Type[] Types = [typeof(Character), typeof(Faction), typeof(Asset), typeof(Location), typeof(FactionGoal), typeof(NarrativeEvent), typeof(NarrativeThread), typeof(PathSet), typeof(WorldCondition)];

    public static bool IsCanonType(Type t) => t == typeof(Character) || CanonEntityMapping.Maps(t);

    public static string[] PropertiesOf(Type t) => t == typeof(Character) ? CanonCharacterMapping.CanonProperties : CanonEntityMapping.PropertiesOf(t);

    private static readonly Dictionary<Type, HashSet<string>> PropertySets = Types.ToDictionary(t => t, t => PropertiesOf(t).ToHashSet());
    public static bool IsCanon(Type t, string property) => PropertySets.TryGetValue(t, out var set) && set.Contains(property);

    // The file kind: npc / pc / faction / asset / location / goal / event / encounter / thread.
    public static string KindOf(object entity) => entity switch
    {
        Character c => CanonCharacterMapping.KindOf(c),
        NarrativeEvent ne => ne.Kind == NarrativeKind.Encounter ? "encounter" : "event",
        _ => CanonEntityMapping.Tables[entity.GetType()].Kind,
    };

    // The reference target type other files use for this entity ("character" for npc and pc,
    // "narrative" for event and encounter).
    public static string RefTypeOf(Type t) => t == typeof(Character) ? "character" : t == typeof(NarrativeEvent) ? "narrative" : CanonEntityMapping.Tables[t].Kind;

    public static string NameOf(object entity) => (string?)entity.GetType().GetProperty(CanonEntityMapping.NameProperty(entity.GetType()))!.GetValue(entity) ?? "";

    // `store` lets an entity read a fact another file owns (an Asset's location, from the location
    // that stands for it); without it that fact is left as loaded.
    public static void Hydrate(object entity, CanonStore.Entry e, CanonRefs? refs, CanonStore? store = null)
    {
        if (entity is Character c) CanonCharacterMapping.Hydrate(c, e, refs);
        else CanonEntityMapping.Hydrate(entity, e, refs, store);
        var ce = (ICanonEntity)entity;
        ce.CanonVersion = e.Version;
        ce.CanonMissing = false;
        Remember(entity);
    }

    public static void Apply(object entity, CanonStore.Document doc, CanonRefs refs, CanonStore? store = null)
    {
        if (entity is Character c) CanonCharacterMapping.Apply(c, doc, refs);
        else CanonEntityMapping.Apply(entity, doc, refs, store);
    }

    // ---------------------------------------------------------------- change detection

    // EF can't see changes to properties it doesn't map, so the values an entity was loaded with
    // are kept here; SaveChanges compares against them to notice edits to file-backed fields.
    private static readonly ConditionalWeakTable<object, Dictionary<string, object?>> Snapshots = new();

    public static Dictionary<string, object?> Values(object entity) =>
        PropertiesOf(entity.GetType()).ToDictionary(p => p, p => Normalize(entity.GetType().GetProperty(p)!.GetValue(entity)));

    public static object? Normalize(object? v) => v is string s && string.IsNullOrWhiteSpace(s) ? null : v;

    // The file-backed values as currently stored in an entity's file, as this campaign sees them.
    public static Dictionary<string, object?> FileValues(Type t, CanonStore.Entry e, CanonRefs? refs, string campaignId, CanonStore? store = null)
    {
        var temp = Activator.CreateInstance(t)!;
        t.GetProperty(nameof(ICanonEntity.CampaignId))!.SetValue(temp, campaignId);
        if (temp is Character c) CanonCharacterMapping.Hydrate(c, e, refs);
        else CanonEntityMapping.Hydrate(temp, e, refs, store);
        return Values(temp);
    }

    public static void Remember(object entity) => Snapshots.AddOrUpdate(entity, Values(entity));

    public static bool ChangedSinceLoad(object entity) =>
        Snapshots.TryGetValue(entity, out var snap) && Values(entity).Any(kv => !Equals(snap[kv.Key], kv.Value));
}

// Fills file-backed properties whenever EF materialises a linked entity, so every query anywhere in
// the app (controllers, simulation, rules) sees the whole entity without knowing about files.
public sealed class CanonMaterializationInterceptor(CanonStore store) : IMaterializationInterceptor
{
    public CanonStore Store { get; } = store;

    public object InitializedInstance(MaterializationInterceptionData data, object entity)
    {
        if (entity is ICanonEntity { CanonId: { } canonId } ce)
        {
            if (Store.TryGet(canonId, out var e) && e.Kind == KindFor(entity, e))
                CanonMapping.Hydrate(entity, e, (data.Context as AppDbContext)?.Refs, Store);
            else
            {
                if (entity is Character c) c.Name = $"⚠ {canonId} (file missing)";
                else entity.GetType().GetProperty(CanonEntityMapping.NameProperty(entity.GetType()))?.SetValue(entity, $"⚠ {canonId} (file missing)");
                ce.CanonMissing = true;
                CanonMapping.Remember(entity);   // so an edit is noticed, and refused, rather than silently dropped
            }
        }
        return entity;
    }

    // A character row may link to an npc or a pc file; other types to their own kind only.
    private static string KindFor(object entity, CanonStore.Entry e) => entity switch
    {
        Character => e.Kind is "npc" or "pc" ? e.Kind : "",
        NarrativeEvent => e.Kind is "event" or "encounter" ? e.Kind : "",
        _ => CanonMapping.KindOf(entity),
    };
}
