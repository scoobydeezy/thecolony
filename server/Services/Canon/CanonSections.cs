using ColonyTracker.Api.Models;

namespace ColonyTracker.Api.Services.Canon;

// The narrative profile and detail sections of a character, as "## Heading" blocks in its file.
// Profile fields use fixed headings; every other section is a detail. Whether a section has been
// Revealed at the table is play state and lives in the database (CharacterSectionReveal).
public static class CanonSections
{
    public static readonly (string Heading, Func<CharacterNarrativeProfile, string?> Get, Action<CharacterNarrativeProfile, string?> Set)[] Profile =
    [
        ("Overview", p => p.Overview, (p, v) => p.Overview = v),
        ("Personality", p => p.Personality, (p, v) => p.Personality = v),
        ("Motivation", p => p.Motivation, (p, v) => p.Motivation = v),
        ("Primary Protection", p => p.PrimaryProtection, (p, v) => p.PrimaryProtection = v),
        ("Fears", p => p.Fears, (p, v) => p.Fears = v),
        ("Blind Spot", p => p.BlindSpot, (p, v) => p.BlindSpot = v),
        ("Narrative Role", p => p.NarrativeRole, (p, v) => p.NarrativeRole = v),
        ("Portrayal Notes", p => p.PortrayalNotes, (p, v) => p.PortrayalNotes = v),
        ("Pressure Response", p => p.PressureResponse, (p, v) => p.PressureResponse = v),
        ("Signature Quote", p => p.SignatureQuote, (p, v) => p.SignatureQuote = v),
        ("Signature Object", p => p.SignatureObject, (p, v) => p.SignatureObject = v),
        ("Performance Inspiration", p => p.PerformanceInspiration, (p, v) => p.PerformanceInspiration = v),
        ("Notes", p => p.Notes, (p, v) => p.Notes = v),
    ];
    private static readonly HashSet<string> ProfileKeys = Profile.Select(x => CanonText.Slug(x.Heading)).ToHashSet(StringComparer.Ordinal);
    public static bool IsProfile(CanonSection s) => ProfileKeys.Contains(s.Key);

    public static string DetailId(string characterId, string key) => $"{characterId}~{key}";
    public static string KeyOfDetailId(string id) => id[(id.LastIndexOf('~') + 1)..];

    public static CanonSection Section(string heading, string? body, string audience = "gm") =>
        new(heading.Trim(), CanonText.Slug(heading.Trim()), (body ?? "").Trim().Replace("\r\n", "\n"), audience);

    // ---------------------------------------------------------------- profile

    public static CharacterNarrativeProfile? ToProfile(string characterId, IEnumerable<CanonSection> sections)
    {
        var byKey = sections.GroupBy(s => s.Key).ToDictionary(g => g.Key, g => g.First());
        var p = new CharacterNarrativeProfile { CharacterId = characterId };
        var any = false;
        foreach (var (heading, _, set) in Profile)
            if (byKey.TryGetValue(CanonText.Slug(heading), out var s)) { set(p, s.Body); any = true; }
        return any ? p : null;
    }

    // Profile sections first in their fixed order, then the details as they were.
    public static void ApplyProfile(CanonStore.Document doc, CharacterNarrativeProfile? profile)
    {
        var existing = doc.Sections.Where(IsProfile).ToDictionary(s => s.Key);
        var profileSections = new List<CanonSection>();
        if (profile is not null)
            foreach (var (heading, get, _) in Profile)
            {
                var v = get(profile);
                if (string.IsNullOrWhiteSpace(v)) continue;
                var audience = existing.TryGetValue(CanonText.Slug(heading), out var old) ? old.Audience : "gm";
                profileSections.Add(Section(heading, v, audience));
            }
        var details = doc.Sections.Where(s => !IsProfile(s)).ToList();
        doc.Sections.Clear();
        doc.Sections.AddRange(profileSections);
        doc.Sections.AddRange(details);
    }

    // ---------------------------------------------------------------- details

    public static List<CharacterDetail> ToDetails(string characterId, IEnumerable<CanonSection> sections, ISet<string> revealed) =>
        sections.Where(s => !IsProfile(s)).Select((s, i) => new CharacterDetail
        {
            Id = DetailId(characterId, s.Key),
            CharacterId = characterId,
            Key = s.Key,
            Heading = s.Heading,
            Body = s.Body,
            SortOrder = i,
            Visibility = revealed.Contains(s.Key) ? NarrativeVisibility.Revealed : s.Audience == "players" ? NarrativeVisibility.Public : NarrativeVisibility.GMOnly,
        }).ToList();

    public static string AudienceOf(NarrativeVisibility v) => v == NarrativeVisibility.Public ? "players" : "gm";
}
