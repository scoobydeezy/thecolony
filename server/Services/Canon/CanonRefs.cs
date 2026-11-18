using System.Data.Common;
using System.Text.RegularExpressions;

namespace ColonyTracker.Api.Services.Canon;

// References between canonical files are canonical ids (start.faction: faction.order-of-theia);
// the app's rows refer to each other by row id, per campaign. This index translates between the
// two using the link rows (CanonId) of Characters, Factions, Assets and Locations.
//
// One instance per DbContext (AppDbContext.Refs), loaded lazily with a raw query on the context's
// own connection, so it also works while EF is materialising (the interceptor hydrates inside a
// query). Links made during a save are added before any file is written.
public sealed partial class CanonRefs
{
    // Reference targets: "character" (npc. / pc.), "faction", "asset", "location", "goal", "narrative"
    // (event. / encounter.), "thread".
    private readonly Dictionary<(string Type, string RowId), string> _canonOf = [];
    private readonly Dictionary<(string Campaign, string CanonId), string> _rowOf = [];

    public void Add(string type, string campaignId, string rowId, string canonId)
    {
        _canonOf[(type, rowId)] = canonId;
        _rowOf.TryAdd((campaignId, canonId), rowId);
    }

    // Canonical id -> this campaign's row id. A file may refer to an entity that has no row in
    // this campaign; the canonical id is then kept as the value, so a save writes it back unchanged.
    public string? ToRow(string? campaignId, string? canonId)
    {
        if (string.IsNullOrWhiteSpace(canonId)) return null;
        return campaignId is not null && _rowOf.TryGetValue((campaignId, canonId), out var row) ? row : canonId;
    }

    // Row id (or a canonical id kept as above) -> canonical id. A row id with no file is refused:
    // a file must never hold an app id.
    public string? ToCanon(string type, string? value, string where)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (_canonOf.TryGetValue((type, value), out var canon)) return canon;
        if (LooksCanonical(type, value)) return value;
        throw new CanonValidationException($"{where} refers to {type} {value}, which has no canonical file.");
    }

    public static bool LooksCanonical(string type, string value) =>
        CanonicalId().Match(value) is { Success: true } m && type switch
        {
            "character" => m.Groups[1].Value is "npc" or "pc",
            "narrative" => m.Groups[1].Value is "event" or "encounter",
            _ => m.Groups[1].Value == type,
        };

    public static CanonRefs Load(DbConnection conn, DbTransaction? tx)
    {
        var refs = new CanonRefs();
        var opened = false;
        if (conn.State != System.Data.ConnectionState.Open) { conn.Open(); opened = true; }
        try
        {
            using var cmd = conn.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = """
                SELECT 'character', "Id", "CampaignId", "CanonId" FROM "Characters" WHERE "CanonId" IS NOT NULL
                UNION ALL SELECT 'faction', "Id", "CampaignId", "CanonId" FROM "Factions" WHERE "CanonId" IS NOT NULL
                UNION ALL SELECT 'asset', "Id", "CampaignId", "CanonId" FROM "Assets" WHERE "CanonId" IS NOT NULL
                UNION ALL SELECT 'location', "Id", "CampaignId", "CanonId" FROM "Locations" WHERE "CanonId" IS NOT NULL
                UNION ALL SELECT 'goal', "Id", "CampaignId", "CanonId" FROM "FactionGoals" WHERE "CanonId" IS NOT NULL
                UNION ALL SELECT 'narrative', "Id", "CampaignId", "CanonId" FROM "NarrativeEvents" WHERE "CanonId" IS NOT NULL
                UNION ALL SELECT 'thread', "Id", "CampaignId", "CanonId" FROM "NarrativeThreads" WHERE "CanonId" IS NOT NULL
                UNION ALL SELECT 'branch', "Id", "CampaignId", "CanonId" FROM "PathSets" WHERE "CanonId" IS NOT NULL
                UNION ALL SELECT 'condition', "Id", "CampaignId", "CanonId" FROM "WorldConditions" WHERE "CanonId" IS NOT NULL
                """;
            using var r = cmd.ExecuteReader();
            while (r.Read()) refs.Add(r.GetString(0), r.GetString(2), r.GetString(1), r.GetString(3));
        }
        finally
        {
            if (opened) conn.Close();
        }
        return refs;
    }

    [GeneratedRegex(@"^([a-z]+)\.[a-z0-9]+(?:[.-][a-z0-9]+)*$")] private static partial Regex CanonicalId();
}
