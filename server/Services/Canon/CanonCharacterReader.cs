using System.Globalization;
using System.Text.RegularExpressions;
using YamlDotNet.RepresentationModel;

namespace ColonyTracker.Api.Services.Canon;

// Reads canonical character files. Read-only (step 3 of ADVENTURE-BOOK-PLAN.md §9): the app
// still uses the database; this exists so the parity check can prove the mapping first.
// Schema validation is the adventure build's job (Zod); this reader is tolerant and reports
// problems per file instead of throwing, so one bad file never takes the API down.
public static partial class CanonCharacterReader
{
    public static (List<CanonCharacter> Characters, List<CanonLoadError> Errors) LoadDirectory(string root)
    {
        var chars = new List<CanonCharacter>();
        var errors = new List<CanonLoadError>();
        foreach (var (sub, kind) in new[] { ("npcs", "npc"), ("pcs", "pc") })
        {
            var dir = Path.Combine(root, sub);
            if (!Directory.Exists(dir)) continue;
            foreach (var file in Directory.EnumerateFiles(dir, "*.md").Order(StringComparer.Ordinal))
            {
                if (Path.GetFileName(file).StartsWith('_')) continue;
                try { chars.Add(Parse(File.ReadAllText(file), file, kind)); }
                catch (Exception ex) { errors.Add(new CanonLoadError(file, ex.Message)); }
            }
        }
        return (chars, errors);
    }

    public static CanonCharacter Parse(string text, string file, string kind)
    {
        var doc = CanonStore.ParseDocument(text);
        return FromNodes(doc.Frontmatter, doc.Sections, file, kind);
    }

    public static CanonCharacter FromNodes(YamlMappingNode fm, List<CanonSection> sections, string file, string kind)
    {
        var id = Str(fm, "id") ?? throw new FormatException("missing id");
        var start = Map(fm, "start");
        var values = start is null ? null : Map(start, "values");
        var beliefs = start is null ? null : Map(start, "beliefs");

        return new CanonCharacter
        {
            Id = id,
            Kind = kind,
            File = file,
            Name = Str(fm, "name") ?? "",
            Title = Str(fm, "title"),
            Role = Str(fm, "role"),
            Ancestry = Str(fm, "ancestry"),
            Heritage = Str(fm, "heritage"),
            Class = Str(fm, "class"),
            Background = Str(fm, "background"),
            Level = Int(fm, "level"),
            Gender = Str(fm, "gender"),
            Pronouns = Str(fm, "pronouns"),
            Age = Int(fm, "age"),
            Aliases = List(fm, "aliases"),
            Summary = Str(fm, "summary"),
            Portrait = Str(fm, "portrait"),
            NarrativeTier = Str(fm, "narrativeTier") ?? "Minor",
            Origin = Str(fm, "origin") ?? "prepared",
            Start = start is null ? null : new CanonStart
            {
                Faction = Str(start, "faction"),
                SocialClass = Str(start, "socialClass"),
                Location = Str(start, "location"),
                State = Str(start, "state") ?? "Alive",
                Instability = Str(start, "instability") ?? "Stable",
                ReaffirmedFaction = Str(start, "reaffirmedFaction"),
                Truth = Dbl(values, "truth") ?? 0,
                Stability = Dbl(values, "stability") ?? 0,
                Agency = Dbl(values, "agency") ?? 0,
                BeliefA = Str(beliefs, "a"),
                BeliefB = Str(beliefs, "b"),
                BeliefC = Str(beliefs, "c"),
                Doubt = Str(start, "doubt"),
                Conviction = Int(start, "conviction") ?? 50,
                Pressure = Int(start, "pressure") ?? 0,
                Influence = Int(start, "influence") ?? 0,
                Impressionable = Int(start, "impressionable") ?? 50,
            },
            Sections = sections,
        };
    }

    // "## Heading" blocks (outside code fences). A body wrapped entirely in :::player-facing
    // is a Public section; anything else is GM-only.
    public static List<CanonSection> ParseSections(string body)
    {
        var sections = new List<CanonSection>();
        string? heading = null;
        var lines = new List<string>();
        var fenced = false;
        void Flush()
        {
            if (heading is null) return;
            var text = string.Join('\n', lines).Trim();
            var audience = "gm";
            var pf = PlayerFacing().Match(text);
            if (pf.Success) { text = pf.Groups[1].Value.Trim(); audience = "players"; }
            sections.Add(new CanonSection(heading, CanonText.Slug(heading), text, audience));
        }
        foreach (var raw in body.Split('\n'))
        {
            var line = raw.TrimEnd('\r');
            if (line.TrimStart().StartsWith("```") || line.TrimStart().StartsWith("~~~")) fenced = !fenced;
            if (!fenced && line.StartsWith("## "))
            {
                Flush();
                heading = line[3..].Trim();
                lines.Clear();
                continue;
            }
            lines.Add(line);
        }
        Flush();
        return sections;
    }

    // ---- YAML helpers (tolerant: wrong shapes read as absent)
    private static YamlNode? Get(YamlMappingNode? map, string key) =>
        map is not null && map.Children.TryGetValue(new YamlScalarNode(key), out var v) ? v : null;
    private static YamlMappingNode? Map(YamlMappingNode? map, string key) => Get(map, key) as YamlMappingNode;
    private static string? Str(YamlMappingNode? map, string key) =>
        Get(map, key) is YamlScalarNode s && !string.IsNullOrEmpty(s.Value) && s.Value != "null" && s.Value != "~" ? s.Value : null;
    private static int? Int(YamlMappingNode? map, string key) =>
        int.TryParse(Str(map, key), NumberStyles.Integer, CultureInfo.InvariantCulture, out var n) ? n : null;
    private static double? Dbl(YamlMappingNode? map, string key) =>
        double.TryParse(Str(map, key), NumberStyles.Float, CultureInfo.InvariantCulture, out var d) ? d : null;
    private static List<string> List(YamlMappingNode? map, string key) =>
        Get(map, key) is YamlSequenceNode seq ? seq.Children.OfType<YamlScalarNode>().Select(s => s.Value ?? "").Where(s => s != "").ToList() : [];

    [GeneratedRegex(@"\A:::player-facing\s*\n([\s\S]*?)\n:::\s*\z")] private static partial Regex PlayerFacing();
}
