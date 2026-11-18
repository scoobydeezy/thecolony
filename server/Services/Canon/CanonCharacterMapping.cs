using System.Globalization;
using ColonyTracker.Api.Models;
using YamlDotNet.RepresentationModel;

namespace ColonyTracker.Api.Services.Canon;

// Maps the app's Character entity to and from its canonical file. Every property listed in
// CanonProperties lives only in the file; the Characters table keeps Id, CampaignId, CanonId
// and IntroducedAtEventId (play data).
public static class CanonCharacterMapping
{
    public static readonly string[] CanonProperties =
    [
        nameof(Character.Name), nameof(Character.CharacterType), nameof(Character.Ancestry), nameof(Character.Heritage),
        nameof(Character.Class), nameof(Character.Background), nameof(Character.Level), nameof(Character.NarrativeTier),
        nameof(Character.Gender), nameof(Character.Pronouns), nameof(Character.Age), nameof(Character.Occupation),
        nameof(Character.Aliases), nameof(Character.Summary), nameof(Character.PortraitPath),
        nameof(Character.FactionId), nameof(Character.SocialClassId), nameof(Character.LocationId), nameof(Character.State),
        nameof(Character.Instability), nameof(Character.ReaffirmedFactionId),
        nameof(Character.TruthValue), nameof(Character.StabilityValue), nameof(Character.AgencyValue),
        nameof(Character.BeliefA), nameof(Character.BeliefB), nameof(Character.BeliefC), nameof(Character.DoubtDirection),
        nameof(Character.Conviction), nameof(Character.Pressure), nameof(Character.Influence), nameof(Character.Impressionable),
        nameof(Character.RelationshipsJson),
    ];

    public static string KindOf(Character c) => c.CharacterType == CharacterType.PartyMember ? "pc" : "npc";

    // ---------------------------------------------------------------- file -> entity

    // References (start.faction, ...) are canonical ids in the file and this campaign's row ids on
    // the entity; without `refs` they stay canonical ids.
    public static void Hydrate(Character c, CanonStore.Entry e, CanonRefs? refs)
    {
        string? Row(string? canonId) => refs is null ? canonId : refs.ToRow(c.CampaignId, canonId);
        var m = e.Model!;
        c.Name = m.Name;
        c.CharacterType = e.Kind == "pc" ? CharacterType.PartyMember : CharacterType.NPC;
        c.Occupation = m.Role;
        c.Ancestry = m.Ancestry;
        c.Heritage = m.Heritage;
        c.Class = m.Class;
        c.Background = m.Background;
        c.Level = m.Level;
        c.Gender = m.Gender;
        c.Pronouns = m.Pronouns;
        c.Age = m.Age;
        c.Aliases = m.Aliases.Count > 0 ? string.Join(", ", m.Aliases) : null;
        c.Summary = m.Summary;
        c.PortraitPath = m.Portrait;
        c.NarrativeTier = Enum.TryParse<NarrativeTier>(m.NarrativeTier, out var tier) ? tier : NarrativeTier.Minor;
        var s = m.Start ?? new CanonStart();
        c.FactionId = Row(s.Faction);
        c.SocialClassId = Row(s.SocialClass);
        c.LocationId = Row(s.Location);
        c.State = Enum.TryParse<CharacterState>(s.State, out var st) ? st : CharacterState.Alive;
        c.Instability = Enum.TryParse<CharacterInstability>(s.Instability, out var ins) ? ins : CharacterInstability.Stable;
        c.ReaffirmedFactionId = Row(s.ReaffirmedFaction);
        c.TruthValue = m.Start is null ? 1.0 / 3 : s.Truth;
        c.StabilityValue = m.Start is null ? 1.0 / 3 : s.Stability;
        c.AgencyValue = m.Start is null ? 1.0 / 3 : s.Agency;
        c.BeliefA = Parse<BeliefPosition>(s.BeliefA);
        c.BeliefB = Parse<BeliefPosition>(s.BeliefB);
        c.BeliefC = Parse<BeliefPosition>(s.BeliefC);
        c.DoubtDirection = Parse<DoubtDirection>(s.Doubt);
        c.Conviction = s.Conviction;
        c.Pressure = s.Pressure;
        c.Influence = s.Influence;
        c.Impressionable = s.Impressionable;
        c.RelationshipsJson = CanonCharacterRelations.Json(e.Document.Frontmatter.Children.TryGetValue(new YamlScalarNode("relationships"), out var rn) ? rn as YamlSequenceNode : null, Row);
    }

    private static T? Parse<T>(string? v) where T : struct, Enum => v is not null && Enum.TryParse<T>(v, out var x) ? x : null;

    // ---------------------------------------------------------------- entity -> file

    public static void Apply(Character c, CanonStore.Document doc, CanonRefs refs)
    {
        var where = c.CanonId ?? "character";
        var fm = doc.Frontmatter;
        Set(fm, "name", c.Name);
        Set(fm, "role", c.Occupation);
        Set(fm, "ancestry", c.Ancestry);
        Set(fm, "heritage", c.Heritage);
        Set(fm, "class", c.Class);
        Set(fm, "background", c.Background);
        Set(fm, "level", I(c.Level));
        Set(fm, "gender", c.Gender);
        Set(fm, "pronouns", c.Pronouns);
        Set(fm, "age", I(c.Age));
        SetList(fm, "aliases", SplitAliases(c.Aliases));
        Set(fm, "summary", c.Summary);
        Set(fm, "portrait", c.PortraitPath);
        Set(fm, "narrativeTier", c.NarrativeTier.ToString());
        CanonCharacterRelations.Write(fm, c.RelationshipsJson, refs, $"{where} relationships");

        var hasStart = fm.Children.TryGetValue(new YamlScalarNode("start"), out var sn) && sn is YamlMappingNode;
        // A file without start: hydrates to the defaults; saving those unchanged adds nothing.
        if (!hasStart && HasDefaultStart(c)) return;
        var start = hasStart ? (YamlMappingNode)sn! : new YamlMappingNode();
        Set(start, "faction", refs.ToCanon("faction", c.FactionId, $"{where} start.faction"));
        Set(start, "socialClass", refs.ToCanon("faction", c.SocialClassId, $"{where} start.socialClass"));
        Set(start, "location", refs.ToCanon("location", c.LocationId, $"{where} start.location"));
        Set(start, "state", c.State.ToString());
        Set(start, "instability", c.Instability.ToString());
        Set(start, "reaffirmedFaction", refs.ToCanon("faction", c.ReaffirmedFactionId, $"{where} start.reaffirmedFaction"));
        var values = new YamlMappingNode
        {
            { "truth", D(c.TruthValue) },
            { "stability", D(c.StabilityValue) },
            { "agency", D(c.AgencyValue) },
        };
        start.Children[new YamlScalarNode("values")] = values;
        var beliefs = new YamlMappingNode();
        if (c.BeliefA is { } a) beliefs.Add("a", a.ToString());
        if (c.BeliefB is { } b) beliefs.Add("b", b.ToString());
        if (c.BeliefC is { } cc) beliefs.Add("c", cc.ToString());
        start.Children[new YamlScalarNode("beliefs")] = beliefs;   // numbers and enum names: always plain
        Set(start, "doubt", c.DoubtDirection?.ToString());
        Set(start, "conviction", I(c.Conviction));
        Set(start, "pressure", I(c.Pressure));
        Set(start, "influence", I(c.Influence));
        Set(start, "impressionable", I(c.Impressionable));
        ReorderStart(start);
        fm.Children[new YamlScalarNode("start")] = start;
    }

    private static bool HasDefaultStart(Character c) =>
        c.FactionId is null && c.SocialClassId is null && c.LocationId is null && c.State == CharacterState.Alive
        && c.Instability == CharacterInstability.Stable && c.ReaffirmedFactionId is null
        && c.TruthValue == 1.0 / 3 && c.StabilityValue == 1.0 / 3 && c.AgencyValue == 1.0 / 3
        && c.BeliefA is null && c.BeliefB is null && c.BeliefC is null && c.DoubtDirection is null
        && c.Conviction == 50 && c.Pressure == 0 && c.Influence == 0 && c.Impressionable == 50;

    private static readonly string[] StartOrder = ["faction", "socialClass", "location", "state", "instability", "reaffirmedFaction", "values",
        "beliefs", "doubt", "conviction", "pressure", "influence", "impressionable"];

    private static void ReorderStart(YamlMappingNode start)
    {
        var rank = StartOrder.Select((k, i) => (k, i)).ToDictionary(x => x.k, x => x.i);
        var sorted = start.Children.Select((kv, i) => (kv, i))
            .OrderBy(x => x.kv.Key is YamlScalarNode k && k.Value is not null && rank.TryGetValue(k.Value, out var r) ? r : StartOrder.Length).ThenBy(x => x.i)
            .Select(x => x.kv).ToList();
        start.Children.Clear();
        foreach (var kv in sorted) start.Children.Add(kv.Key, kv.Value);
    }

    private static string? I(int? v) => v?.ToString(CultureInfo.InvariantCulture);
    private static string D(double v) => v.ToString("R", CultureInfo.InvariantCulture);

    // Numbers and enum names are written plain; text that YAML would misread is quoted.
    private static readonly HashSet<string> Typed = ["level", "age", "conviction", "pressure", "influence", "impressionable", "narrativeTier", "state", "instability", "doubt"];

    private static void Set(YamlMappingNode map, string key, string? value) =>
        CanonYaml.Set(map, key, string.IsNullOrWhiteSpace(value) ? null : value, isText: !Typed.Contains(key));

    private static void SetList(YamlMappingNode map, string key, List<string> items)
    {
        var k = new YamlScalarNode(key);
        if (items.Count == 0) { map.Children.Remove(k); return; }
        // Keep the existing list when unchanged, so its quoting survives.
        if (map.Children.TryGetValue(k, out var old) && old is YamlSequenceNode os && os.Children.OfType<YamlScalarNode>().Select(x => x.Value).SequenceEqual(items)) return;
        map.Children[k] = new YamlSequenceNode(items.Select(i => (YamlNode)CanonYaml.Scalar(i)));
    }

    public static List<string> SplitAliases(string? a) =>
        string.IsNullOrWhiteSpace(a) ? [] : [.. a.Split([',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)];
}
