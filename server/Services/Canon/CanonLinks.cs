using ColonyTracker.Api.Data;
using Microsoft.EntityFrameworkCore;
using YamlDotNet.RepresentationModel;

namespace ColonyTracker.Api.Services.Canon;

// The switches to canonical files (ADVENTURE-BOOK-PLAN.md §9 step 4, §10, §11). A migration that
// drops columns runs only when it can't lose data: the files must exist, and every existing row must
// be linkable to its file through the merge's id-map.yaml. The maps are archived in
// colony-data/canon-switch-archive/staging/; they matter only when a pre-switch database is restored.
public static class CanonLinks
{
    public const string SwitchMigration = "CanonCharacterStore";      // characters (§9)
    public const string EntitySwitchMigration = "CanonEntityStore";   // factions, Assets, locations (§10)
    public const string GoalSwitchMigration = "CanonGoalStore";       // faction goals (§11)
    public const string NarrativeSwitchMigration = "CanonNarrativeStore";   // events, encounters, threads, connections, links (§13)
    public const string BranchSwitchMigration = "CanonBranchStore";         // branches, paths, versions (§14)
    public const string ConditionSwitchMigration = "CanonConditionStore";   // World Conditions, character relationships (§15)

    private static readonly (string Table, string Kind)[] EntityTables = [("Factions", "faction"), ("Assets", "asset"), ("Locations", "location")];

    public static string IdMapPath(IConfiguration config, IWebHostEnvironment env) =>
        Resolve(env, config["Canon:LinkMapPath"] ?? "../colony-data/canon-switch-archive/staging/characters/id-map.yaml");

    public static string EntityIdMapPath(IConfiguration config, IWebHostEnvironment env) =>
        Resolve(env, config["Canon:EntityLinkMapPath"] ?? "../colony-data/canon-switch-archive/staging/entities/id-map.yaml");

    public static string GoalIdMapPath(IConfiguration config, IWebHostEnvironment env) =>
        Resolve(env, config["Canon:GoalLinkMapPath"] ?? "../colony-data/canon-switch-archive/staging/goals/id-map.yaml");

    public static string NarrativeIdMapPath(IConfiguration config, IWebHostEnvironment env) =>
        Resolve(env, config["Canon:NarrativeLinkMapPath"] ?? "../colony-data/canon-switch-archive/staging/narrative/id-map.yaml");

    public static string ConditionIdMapPath(IConfiguration config, IWebHostEnvironment env) =>
        Resolve(env, config["Canon:ConditionLinkMapPath"] ?? "../colony-data/canon-switch-archive/staging/conditions/id-map.yaml");

    public static string BranchIdMapPath(IConfiguration config, IWebHostEnvironment env) =>
        Resolve(env, config["Canon:BranchLinkMapPath"] ?? "../colony-data/canon-switch-archive/staging/branches/id-map.yaml");

    private static string Resolve(IWebHostEnvironment env, string raw) => Path.IsPathRooted(raw) ? raw : Path.GetFullPath(Path.Combine(env.ContentRootPath, raw));

    private static bool Pending(AppDbContext db, string migration) =>
        db.Database.GetPendingMigrations().Any(m => m.EndsWith("_" + migration, StringComparison.Ordinal));

    // Before Migrate(): refuse to drop columns unless the files and the link maps are present.
    public static void GuardSwitch(AppDbContext db, CanonStore store, string idMapPath, string entityIdMapPath, string goalIdMapPath, string narrativeIdMapPath = "", string branchIdMapPath = "", string conditionIdMapPath = "")
    {
        if (!db.Database.GetAppliedMigrations().Any()) return;   // a brand-new database: nothing to lose

        if (Pending(db, SwitchMigration))
        {
            var rows = db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS \"Value\" FROM \"Characters\"").AsEnumerable().First();
            if (rows > 0)
            {
                if (store.Characters().Count == 0)
                    throw new InvalidOperationException($"Refusing to migrate: {rows} characters would lose their data, and no character files were found in {store.ContentPath}.");
                var map = Load(idMapPath);
                var ids = db.Database.SqlQueryRaw<string>("SELECT \"Id\" AS \"Value\" FROM \"Characters\"").ToList();
                var unmapped = ids.Where(id => !map.TryGetValue(id, out var cid) || !store.TryGet(cid, out _)).ToList();
                if (unmapped.Count > 0)
                    throw new InvalidOperationException($"Refusing to migrate: {unmapped.Count} character rows have no file in the link map {idMapPath} (e.g. {string.Join(", ", unmapped.Take(3))}).");
            }
        }

        if (Pending(db, EntitySwitchMigration))
        {
            var map = Load(entityIdMapPath);
            foreach (var (table, kind) in EntityTables)
            {
                var ids = db.Database.SqlQueryRaw<string>($"SELECT \"Id\" AS \"Value\" FROM \"{table}\"").ToList();
                if (ids.Count == 0) continue;
                var unmapped = ids.Where(id => !map.TryGetValue(id, out var cid) || !store.TryGet(cid, out var e) || e.Kind != kind).ToList();
                if (unmapped.Count > 0)
                    throw new InvalidOperationException($"Refusing to migrate: {unmapped.Count} of {ids.Count} {table} rows have no {kind} file in {store.ContentPath} through the link map {entityIdMapPath} (e.g. {string.Join(", ", unmapped.Take(3))}).");
            }
            // Character files must already refer to factions and locations by canonical id.
            var stale = store.Characters().Where(e => e.Model?.Start is { } s && new[] { s.Faction, s.SocialClass, s.Location, s.ReaffirmedFaction }
                .Any(v => v is not null && !CanonRefs.LooksCanonical(v == s.Location ? "location" : "faction", v))).Select(e => e.Id).ToList();
            if (stale.Count > 0)
                throw new InvalidOperationException($"Refusing to migrate: {stale.Count} character files still refer to app ids in start: (e.g. {string.Join(", ", stale.Take(3))}). Copy the merged character files from staging/entities first.");
        }

        if (Pending(db, GoalSwitchMigration)) GuardTable(db, store, "FactionGoals", "goal", Load(goalIdMapPath), goalIdMapPath);
        if (Pending(db, NarrativeSwitchMigration)) GuardNarrative(db, store, Load(narrativeIdMapPath), narrativeIdMapPath);
        if (Pending(db, BranchSwitchMigration)) GuardBranches(db, store, Load(branchIdMapPath), branchIdMapPath);
        if (Pending(db, ConditionSwitchMigration))
        {
            GuardTable(db, store, "WorldConditions", "condition", Load(conditionIdMapPath), conditionIdMapPath);
            GuardRelationships(db, store);
        }
    }

    // §15: every relationship row (the table the migration drops) is in its character's file.
    private static void GuardRelationships(AppDbContext db, CanonStore store)
    {
        string? Canon(string? row) => row is null ? null : db.Database.SqlQueryRaw<string>("SELECT \"CanonId\" AS \"Value\" FROM \"Characters\" WHERE \"Id\" = {0}", row).AsEnumerable().FirstOrDefault();
        var missing = new List<string>();
        foreach (var r in db.Database.SqlQueryRaw<RelationshipRow>("SELECT \"SourceCharacterId\" AS \"Source\", \"TargetCharacterId\" AS \"Target\", \"RelationshipType\" AS \"Type\" FROM \"CharacterRelationships\"").ToList())
        {
            var src = Canon(r.Source);
            var have = src is not null && store.TryGet(src, out var e)
                && CanonCharacterRelations.FromYaml(e.Document.Frontmatter.Children.TryGetValue(new YamlScalarNode("relationships"), out var n) ? n as YamlSequenceNode : null, id => id)
                    .Any(i => i.To == Canon(r.Target) && i.Type == r.Type);
            if (!have) missing.Add($"{src ?? r.Source} {r.Type} -> {Canon(r.Target) ?? "(no one)"}");
        }
        if (missing.Count > 0)
            throw new InvalidOperationException($"Refusing to migrate: {missing.Count} relationships are not in the character files (e.g. {string.Join("; ", missing.Take(3))}). Copy the merged files from staging/conditions first.");
    }

    private sealed record RelationshipRow(string Source, string? Target, string Type);

    // §14: every path set has its branch file with its paths, and every version, participation and scope
    // row (the tables the migration drops) is in its event's file. Text may differ (canon fixes); shape may not.
    private static void GuardBranches(AppDbContext db, CanonStore store, Dictionary<string, string> map, string mapPath)
    {
        GuardTable(db, store, "PathSets", "branch", map, mapPath);
        string Path(string row) => map.TryGetValue(row, out var c) ? c : row;
        string? Event(string row) => db.Database.SqlQueryRaw<string>("SELECT \"CanonId\" AS \"Value\" FROM \"NarrativeEvents\" WHERE \"Id\" = {0}", row).AsEnumerable().FirstOrDefault();
        YamlNode? Get(YamlMappingNode m, string k) => m.Children.TryGetValue(new YamlScalarNode(k), out var n) ? n : null;
        IEnumerable<string> Ids(YamlNode? n) => (n as YamlSequenceNode)?.Children.OfType<YamlScalarNode>().Select(x => x.Value ?? "") ?? [];
        var missing = new List<string>();

        foreach (var p in db.Database.SqlQueryRaw<PathRow>("SELECT \"Id\", \"PathSetId\" AS \"Owner\" FROM \"NarrativePaths\"").ToList())
        {
            var declared = store.TryGet(Path(p.Owner), out var b) && Get(b.Document.Frontmatter, "paths") is YamlSequenceNode ps
                && ps.Children.OfType<YamlMappingNode>().Any(x => (Get(x, "id") as YamlScalarNode)?.Value == Path(p.Id));
            if (!declared) missing.Add($"path {Path(p.Id)} in {Path(p.Owner)}");
        }
        foreach (var r in db.Database.SqlQueryRaw<PairRow>("SELECT \"NarrativeEventId\" AS \"A\", \"PathSetId\" AS \"B\" FROM \"NarrativeEventVariantParticipations\"").ToList())
            if (!(Event(r.A) is { } ev && store.TryGet(ev, out var e) && Ids(Get(e.Document.Frontmatter, "variesBy")).Contains(Path(r.B)))) missing.Add($"variesBy {Path(r.B)} on {Event(r.A)}");
        foreach (var r in db.Database.SqlQueryRaw<PairRow>("SELECT \"NarrativeEventId\" AS \"A\", \"PathId\" AS \"B\" FROM \"PathEventScopes\"").ToList())
            if (!(Event(r.A) is { } ev && store.TryGet(ev, out var e) && Ids(Get(e.Document.Frontmatter, "onPaths")).Contains(Path(r.B)))) missing.Add($"onPaths {Path(r.B)} on {Event(r.A)}");

        foreach (var o in db.Database.SqlQueryRaw<OverrideRow>("SELECT \"Id\", \"NarrativeEventId\" AS \"Event\", \"OverridesSummary\" AS \"S\", \"OverridesDescription\" AS \"D\", \"OverridesConnections\" AS \"C\", \"OverridesAssets\" AS \"A\" FROM \"NarrativeEventOverrides\"").ToList())
        {
            var when = db.Database.SqlQueryRaw<string>("SELECT \"PathId\" AS \"Value\" FROM \"EventOverridePaths\" WHERE \"EventOverrideId\" = {0}", o.Id).AsEnumerable().Select(Path).OrderBy(x => x).ToList();
            var ev = Event(o.Event);
            var v = ev is not null && store.TryGet(ev, out var e) && Get(e.Document.Frontmatter, "variants") is YamlSequenceNode vs
                ? vs.Children.OfType<YamlMappingNode>().FirstOrDefault(x => Ids(Get(x, "when")).OrderBy(y => y).SequenceEqual(when)) : null;
            var nConn = db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS \"Value\" FROM \"EventOverrideConnections\" WHERE \"EventOverrideId\" = {0}", o.Id).AsEnumerable().First();
            var nLink = db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS \"Value\" FROM \"EventOverrideEntityLinks\" WHERE \"EventOverrideId\" = {0}", o.Id).AsEnumerable().First();
            var ok = v is not null
                && (Get(v, "summary") is not null) == o.S && (Get(v, "synopsis") is not null) == o.D
                && (Get(v, "leadsTo") is not null) == o.C && (!o.C || (Get(v, "leadsTo") as YamlSequenceNode)?.Children.Count == nConn)
                && (Get(v, "links") is not null) == o.A && (!o.A || (Get(v, "links") as YamlSequenceNode)?.Children.Count == nLink);
            if (!ok) missing.Add($"version of {ev ?? o.Event} on [{string.Join(", ", when)}]");
        }
        if (missing.Count > 0)
            throw new InvalidOperationException($"Refusing to migrate: {missing.Count} branching records are not in the files (e.g. {string.Join("; ", missing.Take(3))}). Copy the merged files from staging/branches first.");
    }

    private sealed record PathRow(string Id, string Owner);
    private sealed record PairRow(string A, string B);
    private sealed record OverrideRow(string Id, string Event, bool S, bool D, bool C, bool A);

    // §13: every event and thread row has its file, and every connection and authored link (the
    // rows the migration drops) is in its owner's file.
    private static void GuardNarrative(AppDbContext db, CanonStore store, Dictionary<string, string> map, string mapPath)
    {
        GuardTable(db, store, "NarrativeEvents", "event|encounter", map, mapPath);
        GuardTable(db, store, "NarrativeThreads", "thread", map, mapPath);
        string Canon(string rowId) => map.TryGetValue(rowId, out var c) ? c : rowId;
        var missing = new List<string>();

        var connections = db.Database.SqlQueryRaw<ConnectionRow>("SELECT \"SourceNarrativeEventId\" AS \"Source\", \"TargetNarrativeEventId\" AS \"Target\", \"ThreadId\" AS \"Thread\" FROM \"NarrativeEventConnections\"").ToList();
        foreach (var c in connections)
        {
            var leads = store.TryGet(Canon(c.Source), out var e) ? CanonNarrativeLists.ParseLeadsTo(CanonNarrativeLists.LeadsToJson(e.Document.Frontmatter.Children.TryGetValue(new YamlScalarNode("leadsTo"), out var n) ? n as YamlSequenceNode : null, id => id)) : [];
            if (!leads.Any(l => l.To == Canon(c.Target) && l.Thread == Canon(c.Thread))) missing.Add($"connection {Canon(c.Source)} -> {Canon(c.Target)} [{Canon(c.Thread)}]");
        }

        string[] tables = ["Factions", "Characters", "Assets", "Locations"];   // NarrativeEntityType 0..3
        var links = db.Database.SqlQueryRaw<LinkRow>("SELECT \"OwnerId\" AS \"Owner\", \"EntityType\" AS \"Type\", \"EntityId\" AS \"Entity\" FROM \"NarrativeEntityLinks\" WHERE \"EntityType\" < 4").ToList();
        foreach (var l in links)
        {
            var entity = db.Database.SqlQueryRaw<string>($"SELECT \"CanonId\" AS \"Value\" FROM \"{tables[l.Type]}\" WHERE \"Id\" = {{0}}", l.Entity).AsEnumerable().FirstOrDefault();
            var have = store.TryGet(Canon(l.Owner), out var e) && e.Document.Frontmatter.Children.TryGetValue(new YamlScalarNode("links"), out var n) && n is YamlSequenceNode seq
                ? CanonNarrativeLists.References(seq, "links", leadsTo: false).Select(r => r.Id).ToHashSet() : [];
            if (entity is null || !have.Contains(entity)) missing.Add($"link {Canon(l.Owner)} -> {entity ?? l.Entity}");
        }
        if (missing.Count > 0)
            throw new InvalidOperationException($"Refusing to migrate: {missing.Count} narrative connections or links are not in the files (e.g. {string.Join("; ", missing.Take(3))}). Copy the merged files from staging/narrative first.");
    }

    private sealed record ConnectionRow(string Source, string Target, string Thread);
    private sealed record LinkRow(string Owner, int Type, string Entity);

    // `kind` may list alternatives: "event|encounter".
    private static void GuardTable(AppDbContext db, CanonStore store, string table, string kind, Dictionary<string, string> map, string mapPath)
    {
        var kinds = kind.Split('|');
        var ids = db.Database.SqlQueryRaw<string>($"SELECT \"Id\" AS \"Value\" FROM \"{table}\"").ToList();
        var unmapped = ids.Where(id => !map.TryGetValue(id, out var cid) || !store.TryGet(cid, out var e) || !kinds.Contains(e.Kind)).ToList();
        if (unmapped.Count > 0)
            throw new InvalidOperationException($"Refusing to migrate: {unmapped.Count} of {ids.Count} {table} rows have no {kind} file in {store.ContentPath} through the link map {mapPath} (e.g. {string.Join(", ", unmapped.Take(3))}).");
    }

    // After Migrate(): link rows that have no CanonId yet, from the merges' id-map.yaml files.
    public static int Backfill(AppDbContext db, CanonStore store, string idMapPath, string entityIdMapPath, string goalIdMapPath, string narrativeIdMapPath, ILogger log, string branchIdMapPath = "", string conditionIdMapPath = "")
    {
        var linked = 0;
        var missing = db.Characters.Where(c => c.CanonId == null).Select(c => c.Id).ToList();
        if (missing.Count > 0)
        {
            var map = Load(idMapPath);
            foreach (var id in missing)
            {
                if (!map.TryGetValue(id, out var cid) || !store.TryGet(cid, out _)) { log.LogError("Character {Id} has no canonical file in {Map}", id, idMapPath); continue; }
                linked += db.Characters.Where(c => c.Id == id).ExecuteUpdate(s => s.SetProperty(c => c.CanonId, cid));
            }
            log.LogInformation("Linked {Linked} of {Missing} characters to their canonical files", linked, missing.Count);
        }

        Dictionary<string, string>? entityMap = null, goalMap = null, narrativeMap = null, branchMap = null, conditionMap = null;
        foreach (var (table, kind) in EntityTables.Append(("FactionGoals", "goal")).Append(("NarrativeEvents", "event|encounter")).Append(("NarrativeThreads", "thread")).Append(("PathSets", "branch")).Append(("WorldConditions", "condition")))
        {
            var ids = db.Database.SqlQueryRaw<string>($"SELECT \"Id\" AS \"Value\" FROM \"{table}\" WHERE \"CanonId\" IS NULL").ToList();
            if (ids.Count == 0) continue;
            var narrative = table.StartsWith("Narrative", StringComparison.Ordinal);
            var map = kind == "goal" ? goalMap ??= Load(goalIdMapPath) : kind == "branch" ? branchMap ??= Load(branchIdMapPath) : kind == "condition" ? conditionMap ??= Load(conditionIdMapPath) : narrative ? narrativeMap ??= Load(narrativeIdMapPath) : entityMap ??= Load(entityIdMapPath);
            var mapPath = kind == "goal" ? goalIdMapPath : kind == "branch" ? branchIdMapPath : kind == "condition" ? conditionIdMapPath : narrative ? narrativeIdMapPath : entityIdMapPath;
            var n = 0;
            foreach (var id in ids)
            {
                if (!map.TryGetValue(id, out var cid) || !store.TryGet(cid, out var e) || !kind.Split('|').Contains(e.Kind)) { log.LogError("{Kind} {Id} has no canonical file in {Map}", kind, id, mapPath); continue; }
                n += db.Database.ExecuteSqlRaw($"UPDATE \"{table}\" SET \"CanonId\" = {{0}} WHERE \"Id\" = {{1}}", cid, id);
            }
            log.LogInformation("Linked {Linked} of {Missing} {Table} rows to their canonical files", n, ids.Count, table);
            linked += n;
        }
        return linked;
    }

    // id-map.yaml: [{ appId, id, name, ... }] -> appId -> canonical id
    public static Dictionary<string, string> Load(string file)
    {
        var map = new Dictionary<string, string>(StringComparer.Ordinal);
        if (!File.Exists(file)) return map;
        var yaml = new YamlStream();
        yaml.Load(new StringReader(File.ReadAllText(file)));
        if (yaml.Documents.Count == 0 || yaml.Documents[0].RootNode is not YamlSequenceNode seq) return map;
        foreach (var item in seq.Children.OfType<YamlMappingNode>())
        {
            string? Val(string k) => item.Children.TryGetValue(new YamlScalarNode(k), out var v) && v is YamlScalarNode s && s.Value is not (null or "" or "null") ? s.Value : null;
            if (Val("appId") is { } app && Val("id") is { } id) map[app] = id;
        }
        return map;
    }
}
