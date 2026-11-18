using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Json.Schema;
using YamlDotNet.Core;
using YamlDotNet.RepresentationModel;

namespace ColonyTracker.Api.Services.Canon;

public class CanonConflictException(string message) : Exception(message);
public class CanonValidationException(string message) : Exception(message);

// The single store for canonical entities (ADVENTURE-BOOK-PLAN.md §9, §10): one file per
// character (<content>/npcs|pcs/*.md), faction (factions/*.yaml), Asset (assets/*.yaml) and
// location (locations/*.yaml), read and written by both the app (through this class) and the
// adventure book. The database keeps only the link rows and what happens in play.
//
// Writes edit the YAML (a Markdown file's frontmatter, or a whole .yaml file) in place, so fields
// the app doesn't own (title, provenance, design notes, status, ...) survive every app save. Each
// write is validated against the book's generated JSON Schema, refused if the file changed since
// it was read, and written atomically.
public sealed partial class CanonStore
{
    // For a .yaml entity, Frontmatter is the whole file and there is no body. For an event or encounter
    // (RawBody set) the body is everything after the frontmatter, untouched; Preamble and Sections are unused.
    public sealed record Document(YamlMappingNode Frontmatter, string Preamble, List<CanonSection> Sections, string? RawBody = null);

    // Each kind: its folder under the content root, file extension, and key order for saves
    // (matching the scripts that first wrote the files, so app saves produce small diffs).
    public sealed record KindSpec(string Kind, string Folder, string Ext, string[] KeyOrder)
    {
        public bool IsMarkdown => Ext == ".md";
        public bool IsCharacter => Kind is "npc" or "pc";
    }

    private static readonly string[] CharacterKeys = ["id", "slug", "name", "title", "role", "ancestry", "heritage", "class", "background", "level",
        "gender", "pronouns", "age", "aliases", "summary", "portrait", "narrativeTier", "status", "origin", "start", "relationships", "provenance", "design"];

    // Declared before Kinds: static fields initialise in order.
    private static readonly string[] NarrativeKeys = ["id", "slug", "name", "summary", "function", "synopsis", "visibility", "part", "chapter", "order", "sidebar",
        "event", "route", "leadsTo", "links", "variesBy", "onPaths", "variants", "status", "readiness", "inventory", "revelations", "provenance", "design"];

    public static readonly IReadOnlyDictionary<string, KindSpec> Kinds = new Dictionary<string, KindSpec>
    {
        ["npc"] = new("npc", "npcs", ".md", CharacterKeys),
        ["pc"] = new("pc", "pcs", ".md", CharacterKeys),
        ["faction"] = new("faction", "factions", ".yaml", ["id", "slug", "name", "type", "summary", "motto", "represents", "publicFace", "selfImage",
            "coreTenet", "focus", "certainOf", "rightAbout", "afraidOf", "wrongAbout", "response", "origin", "foundedAs", "became", "history", "notes",
            "heraldry", "status", "start", "provenance", "design"]),
        ["asset"] = new("asset", "assets", ".yaml", ["id", "slug", "name", "type", "role", "tier", "keystone", "summary", "status", "start", "provenance", "design"]),
        ["location"] = new("location", "locations", ".yaml", ["id", "slug", "name", "type", "summary", "parent", "asset", "markerColor", "status", "start",
            "provenance", "design"]),
        ["goal"] = new("goal", "goals", ".yaml", ["id", "slug", "name", "faction", "type", "priority", "visibility", "outcome", "earliestAct", "champion",
            "target", "effects", "summary", "status", "start", "provenance", "design"]),
        // ADVENTURE-BOOK-PLAN.md §13. The Markdown body is the book's prose: kept byte for byte.
        ["event"] = new("event", "events", ".md", NarrativeKeys),
        ["encounter"] = new("encounter", "encounters", ".md", NarrativeKeys),
        ["thread"] = new("thread", "threads", ".yaml", ["id", "slug", "name", "summary", "color", "links", "status", "provenance", "design"]),
        ["condition"] = new("condition", "conditions", ".yaml", ["id", "slug", "name", "summary", "rule", "otherwise", "stress", "requires", "variesBy", "start", "status", "provenance", "design"]),
        ["branch"] = new("branch", "branches", ".yaml", ["id", "slug", "name", "summary", "origin", "convergence", "requires", "paths", "status", "provenance", "design"]),
    };


    public static KindSpec Spec(string kind) => Kinds.TryGetValue(kind, out var k) ? k : throw new ArgumentException($"unknown canon kind {kind}");

    public sealed class Entry
    {
        public required string Id { get; init; }
        public required string Kind { get; init; }
        public required string File { get; init; }
        public required string Version { get; init; }
        // The parsed character (npc / pc only; null for factions, Assets and locations, which the
        // app maps straight from Document.Frontmatter).
        public CanonCharacter? Model { get; init; }
        public required Document Document { get; init; }
        public DateTime Mtime { get; init; }
        internal long Length { get; init; }
    }

    private readonly object _gate = new();
    private readonly Dictionary<string, Entry> _byId = new(StringComparer.Ordinal);
    private readonly Dictionary<string, CanonLoadError> _errors = new(StringComparer.Ordinal);
    private readonly Dictionary<string, JsonSchema> _schemas = new(StringComparer.Ordinal);
    private DateTime _lastScan = DateTime.MinValue;
    private readonly ILogger? _log;

    public string ContentPath { get; }
    public string SchemaPath { get; }

    public CanonStore(string contentPath, string? schemaPath = null, ILogger? log = null)
    {
        ContentPath = Path.GetFullPath(contentPath);
        SchemaPath = Path.GetFullPath(schemaPath ?? Path.Combine(ContentPath, "..", "..", "schemas"));
        _log = log;
    }

    // DI constructor: Canon:ContentPath (default ../adventure/src/content, relative to the API's content root).
    public CanonStore(IConfiguration config, IWebHostEnvironment env, ILogger<CanonStore> log)
        : this(Resolve(env, config["Canon:ContentPath"] ?? "../adventure/src/content"),
               config["Canon:SchemaPath"] is { } s ? Resolve(env, s) : null, log) { }

    private static string Resolve(IWebHostEnvironment env, string p) => Path.IsPathRooted(p) ? p : Path.GetFullPath(Path.Combine(env.ContentRootPath, p));

    // ------------------------------------------------------------------ reading

    public IReadOnlyList<Entry> All() { Refresh(); lock (_gate) return _byId.Values.OrderBy(e => e.Id, StringComparer.Ordinal).ToList(); }
    public IReadOnlyList<Entry> All(params string[] kinds) => All().Where(e => kinds.Contains(e.Kind)).ToList();
    public IReadOnlyList<Entry> Characters() => All("npc", "pc");

    // The location file that stands for an Asset (location `asset:`), if any.
    public Entry? LocationLinking(string assetId) =>
        All("location").FirstOrDefault(l => CanonEntityMapping.Read(l.Document.Frontmatter, "asset") == assetId);
    public IReadOnlyList<CanonLoadError> Errors() { Refresh(); lock (_gate) return _errors.Values.ToList(); }
    public bool TryGet(string? id, out Entry entry)
    {
        entry = null!;
        if (id is null) return false;
        Refresh();
        lock (_gate) if (_byId.TryGetValue(id, out entry!)) return true;
        // A miss may be a file created since the last scan (scans are throttled): rescan once.
        Refresh(force: true);
        lock (_gate) return _byId.TryGetValue(id, out entry!);
    }

    // Rescan at most every 300 ms; reparse only files whose size or mtime changed, so edits made
    // outside the app (VS Code, git checkout, an agent) are picked up without a restart.
    public void Refresh(bool force = false)
    {
        lock (_gate)
        {
            if (!force && (DateTime.UtcNow - _lastScan).TotalMilliseconds < 300) return;
            _lastScan = DateTime.UtcNow;
            var seen = new HashSet<string>(StringComparer.Ordinal);
            foreach (var spec in Kinds.Values)
            {
                var kind = spec.Kind;
                var dir = Path.Combine(ContentPath, spec.Folder);
                if (!Directory.Exists(dir)) continue;
                foreach (var file in Directory.EnumerateFiles(dir, "*" + spec.Ext))
                {
                    if (Path.GetFileName(file).StartsWith('_')) continue;
                    seen.Add(file);
                    var info = new FileInfo(file);
                    var current = _byId.Values.FirstOrDefault(e => e.File == file);
                    if (current is not null && current.Mtime == info.LastWriteTimeUtc && current.Length == info.Length) continue;
                    try
                    {
                        var entry = Load(file, kind, info);
                        if (current is not null && current.Id != entry.Id) _byId.Remove(current.Id);
                        if (_byId.TryGetValue(entry.Id, out var other) && other.File != file)
                            throw new FormatException($"duplicate id {entry.Id} (also in {Path.GetFileName(other.File)})");
                        _byId[entry.Id] = entry;
                        _errors.Remove(file);
                    }
                    catch (Exception ex)
                    {
                        // Keep serving the last good version of a file that is mid-edit or broken.
                        _errors[file] = new CanonLoadError(file, ex.Message);
                        _log?.LogWarning("Canon file {File} could not be read: {Message}", file, ex.Message);
                    }
                }
            }
            foreach (var gone in _byId.Values.Where(e => !seen.Contains(e.File)).Select(e => e.Id).ToList()) _byId.Remove(gone);
            foreach (var gone in _errors.Keys.Where(f => !seen.Contains(f)).ToList()) _errors.Remove(gone);
        }
    }

    private static Entry Load(string file, string kind, FileInfo info) => Load(file, kind, System.IO.File.ReadAllText(file), info);

    // Parse without touching the cache (the editor's check that the app can read a file before it is written).
    private static Entry Load(string file, string kind, string text) => Load(file, kind, text, null);

    private static Entry Load(string file, string kind, string text, FileInfo? info)
    {
        var spec = Spec(kind);
        var doc = Parse(text, kind);
        if (spec.IsCharacter)
        {
            var model = CanonCharacterReader.FromNodes(doc.Frontmatter, doc.Sections, file, kind);
            return new Entry { Id = model.Id, Kind = kind, File = file, Version = VersionOf(text), Model = model, Document = doc, Mtime = info?.LastWriteTimeUtc ?? default, Length = info?.Length ?? 0 };
        }
        var id = doc.Frontmatter.Children.TryGetValue(new YamlScalarNode("id"), out var idNode) && idNode is YamlScalarNode { Value: { Length: > 0 } v } ? v
            : throw new FormatException("missing id");
        if (!id.StartsWith(kind + ".", StringComparison.Ordinal)) throw new FormatException($"id {id} must start with \"{kind}.\"");
        return new Entry { Id = id, Kind = kind, File = file, Version = VersionOf(text), Document = doc, Mtime = info?.LastWriteTimeUtc ?? default, Length = info?.Length ?? 0 };
    }

    public static Document Parse(string text, string kind) =>
        !Spec(kind).IsMarkdown ? ParseYaml(text) : Spec(kind).IsCharacter ? ParseDocument(text) : ParseRaw(text);

    // Frontmatter plus the body exactly as written (events and encounters).
    public static Document ParseRaw(string text)
    {
        var m = Frontmatter().Match(text);
        if (!m.Success) throw new FormatException("no YAML frontmatter");
        var yaml = new YamlStream();
        yaml.Load(new StringReader(m.Groups[1].Value));
        if (yaml.Documents.Count == 0 || yaml.Documents[0].RootNode is not YamlMappingNode fm)
            throw new FormatException("frontmatter is not a mapping");
        return new Document(fm, "", [], text[m.Length..]);
    }

    public static Document ParseYaml(string text)
    {
        var yaml = new YamlStream();
        yaml.Load(new StringReader(text));
        if (yaml.Documents.Count == 0 || yaml.Documents[0].RootNode is not YamlMappingNode root)
            throw new FormatException("file is not a YAML mapping");
        return new Document(root, "", []);
    }

    public static Document ParseDocument(string text)
    {
        var m = Frontmatter().Match(text);
        if (!m.Success) throw new FormatException("no YAML frontmatter");
        var yaml = new YamlStream();
        yaml.Load(new StringReader(m.Groups[1].Value));
        if (yaml.Documents.Count == 0 || yaml.Documents[0].RootNode is not YamlMappingNode fm)
            throw new FormatException("frontmatter is not a mapping");
        var body = text[m.Length..];
        var first = FirstSection().Match(body);
        var preamble = first.Success ? body[..first.Index] : body;
        return new Document(fm, preamble.Trim(), CanonCharacterReader.ParseSections(body));
    }

    public static string VersionOf(string text) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text)))[..16].ToLowerInvariant();

    // ------------------------------------------------------------------ writing

    // Create or update one character file. `mutate` edits the document in place. When
    // expectedVersion is given and the file has changed since, nothing is written.
    public Entry Write(string id, string kind, Action<Document> mutate, string? expectedVersion)
    {
        lock (_gate)
        {
            Refresh(force: true);
            _byId.TryGetValue(id, out var existing);
            if (existing is null && _errors.Keys.Any(f => Path.GetFileNameWithoutExtension(f) == SlugOf(id) && FolderOf(kind) == Path.GetFileName(Path.GetDirectoryName(f))))
                throw new CanonConflictException($"The file for {id} exists but can't be read; fix it before saving from the app.");
            if (existing is not null && expectedVersion is not null && existing.Version != expectedVersion)
                throw new CanonConflictException($"{id} was changed outside the app since it was loaded (in {Path.GetFileName(existing.File)}). Reload and try again.");
            if (existing is not null && existing.Kind != kind)
                throw new CanonValidationException(existing.Kind is "npc" or "pc" && kind is "npc" or "pc"
                    ? $"{id} is a{(existing.Kind == "pc" ? " party member" : "n NPC")}; changing between NPC and party member isn't supported."
                    : $"{id} is a {existing.Kind}, not a {kind}.");

            var doc = existing is null
                ? new Document(NewFrontmatter(id), "", [], Spec(kind).IsMarkdown && !Spec(kind).IsCharacter ? "\n" : null)
                : Parse(System.IO.File.ReadAllText(existing.File), kind);   // fresh copy, never the cached nodes
            mutate(doc);
            var text = Serialize(doc, kind);
            Validate(id, kind, doc.Frontmatter);

            var file = existing?.File ?? Path.Combine(ContentPath, FolderOf(kind), $"{SlugOf(id)}{Spec(kind).Ext}");
            if (existing is not null && System.IO.File.ReadAllText(existing.File) == text) return existing;   // nothing changed
            Directory.CreateDirectory(Path.GetDirectoryName(file)!);
            _journal.Value?.Record(file);
            WriteAtomically(file, text);
            var entry = Load(file, kind, new FileInfo(file));
            _byId[entry.Id] = entry;
            _log?.LogInformation("Saved canon file {File}", file);
            return entry;
        }
    }

    public void Delete(string id)
    {
        lock (_gate)
        {
            if (!_byId.TryGetValue(id, out var entry)) return;
            _journal.Value?.Record(entry.File);
            System.IO.File.Delete(entry.File);
            _byId.Remove(id);
            _log?.LogInformation("Deleted canon file {File}", entry.File);
        }
    }

    private static void WriteAtomically(string file, string text)
    {
        var tmp = Path.Combine(Path.GetDirectoryName(file)!, $".{Path.GetFileName(file)}.{Guid.NewGuid():N}.tmp");
        System.IO.File.WriteAllText(tmp, text);
        System.IO.File.Move(tmp, file, overwrite: true);
    }

    // ------------------------------------------------------------------ whole files (the book's editor)

    // Content folder -> entry type (the book's ENTITY_TYPES dirs). "docs" is a book page (any depth).
    public static readonly IReadOnlyDictionary<string, string> TypeOfFolder = new Dictionary<string, string>
    {
        ["creatures"] = "creature", ["npcs"] = "npc", ["pcs"] = "pc", ["locations"] = "location", ["factions"] = "faction",
        ["assets"] = "asset", ["goals"] = "goal", ["events"] = "event", ["encounters"] = "encounter", ["threads"] = "thread",
        ["branches"] = "branch", ["conditions"] = "condition", ["rules"] = "rule", ["veiled-sources"] = "source", ["items"] = "item",
        ["inventory"] = "inventory", ["revelations"] = "revelation", ["clocks"] = "clock", ["handouts"] = "handout", ["hazards"] = "hazard", ["maps"] = "map", ["docs"] = "docs",
    };

    public sealed record FileInfoResult(string Path, string Type, string? Id, string Text, string Version);

    // A path relative to the content folder, checked: inside it, a known folder, .md / .yaml, not hidden.
    public (string Full, string Rel, string Type) ResolveContent(string rel)
    {
        if (string.IsNullOrWhiteSpace(rel)) throw new CanonValidationException("A path is required.");
        var clean = rel.Replace('\\', '/').TrimStart('/');
        if (clean.StartsWith("src/content/", StringComparison.Ordinal)) clean = clean["src/content/".Length..];
        var full = Path.GetFullPath(Path.Combine(ContentPath, clean));
        if (!full.StartsWith(ContentPath + Path.DirectorySeparatorChar, StringComparison.Ordinal)) throw new CanonValidationException($"{rel} is outside the content folder.");
        var parts = Path.GetRelativePath(ContentPath, full).Split(Path.DirectorySeparatorChar);
        if (!TypeOfFolder.TryGetValue(parts[0], out var type)) throw new CanonValidationException($"{parts[0]} is not a content folder.");
        if (type != "docs" && parts.Length != 2) throw new CanonValidationException($"{rel}: entries sit directly in their folder.");
        var name = parts[^1];
        if (name.StartsWith('.') || name.StartsWith('_')) throw new CanonValidationException($"{rel}: hidden and draft files can't be edited here.");
        var ext = Path.GetExtension(name);
        if (ext is not (".md" or ".yaml" or ".yml") || (type == "docs" && ext != ".md")) throw new CanonValidationException($"{rel}: only .md and .yaml files.");
        return (full, string.Join('/', parts), type);
    }

    public FileInfoResult ReadFile(string rel)
    {
        var (full, clean, type) = ResolveContent(rel);
        if (!System.IO.File.Exists(full)) throw new KeyNotFoundException($"{clean} does not exist.");
        var text = System.IO.File.ReadAllText(full);
        return new FileInfoResult(clean, type, IdIn(text, full), text, VersionOf(text));
    }

    private static string? IdIn(string text, string full)
    {
        try
        {
            var fm = Path.GetExtension(full) == ".md" ? ParseRaw(text).Frontmatter : ParseYaml(text).Frontmatter;
            return fm.Children.TryGetValue(new YamlScalarNode("id"), out var n) && n is YamlScalarNode { Value: { Length: > 0 } v } ? v : null;
        }
        catch (Exception) { return null; }
    }

    // Write a whole file from the book's editor. The same guarantees as an app save: it must parse, match
    // the entry type's schema (and, for kinds the app reads, load as the app reads it), keep its id, and
    // not have changed since it was opened. `create`: the file must not exist yet, and its id must be new.
    public FileInfoResult WriteFile(string rel, string text, string? expectedVersion, bool create)
    {
        var (full, clean, type) = ResolveContent(rel);
        text = text.Replace("\r\n", "\n");
        if (!text.EndsWith('\n')) text += "\n";
        lock (_gate)
        {
            var exists = System.IO.File.Exists(full);
            if (create && exists) throw new CanonConflictException($"{clean} already exists.");
            if (!create && !exists) throw new KeyNotFoundException($"{clean} does not exist.");
            var before = exists ? System.IO.File.ReadAllText(full) : null;
            if (!create && expectedVersion is not null && VersionOf(before!) != expectedVersion)
                throw new CanonConflictException($"{clean} was changed elsewhere since it was opened (in the app, VS Code or another tab). Reload it and try again.");

            var isMd = Path.GetExtension(full) == ".md";
            YamlMappingNode fm;
            try { fm = isMd ? ParseRaw(text).Frontmatter : ParseYaml(text).Frontmatter; }
            catch (Exception ex) { throw new CanonValidationException($"{clean}: the frontmatter is not valid YAML ({ex.Message})."); }

            if (type == "docs")
            {
                if (!(fm.Children.TryGetValue(new YamlScalarNode("title"), out var t) && t is YamlScalarNode { Value: { Length: > 0 } }))
                    throw new CanonValidationException($"{clean}: a book page needs a title.");
            }
            else
            {
                var id = fm.Children.TryGetValue(new YamlScalarNode("id"), out var idn) && idn is YamlScalarNode { Value: { Length: > 0 } iv } ? iv
                    : throw new CanonValidationException($"{clean}: an entry needs an id.");
                var prefix = type is "npc" or "pc" ? type : type;
                if (!id.StartsWith(prefix + ".", StringComparison.Ordinal)) throw new CanonValidationException($"{clean}: the id {id} must start with \"{prefix}.\"");
                if (before is not null && IdIn(before, full) is { } oldId && oldId != id)
                    throw new CanonValidationException($"{clean}: the id can't change here ({oldId} -> {id}); other entries refer to it.");
                if (create && IdTaken(type, id)) throw new CanonConflictException($"{id} already exists.");
                Validate(id, type, fm);
                if (Kinds.ContainsKey(type))
                {
                    try { Load(full, type, text); }
                    catch (CanonValidationException) { throw; }
                    catch (Exception ex) { throw new CanonValidationException($"{clean}: the app can't read it ({ex.Message})."); }
                }
            }
            Directory.CreateDirectory(Path.GetDirectoryName(full)!);
            WriteAtomically(full, text);
            _log?.LogInformation("Saved {File} from the book", clean);
            Refresh(force: true);
            return new FileInfoResult(clean, type, IdIn(text, full), text, VersionOf(text));
        }
    }

    public void DeleteFile(string rel, string? expectedVersion)
    {
        var (full, clean, _) = ResolveContent(rel);
        lock (_gate)
        {
            if (!System.IO.File.Exists(full)) throw new KeyNotFoundException($"{clean} does not exist.");
            if (expectedVersion is not null && VersionOf(System.IO.File.ReadAllText(full)) != expectedVersion)
                throw new CanonConflictException($"{clean} was changed elsewhere since it was opened. Reload it and try again.");
            System.IO.File.Delete(full);
            _log?.LogInformation("Deleted {File} from the book", clean);
            Refresh(force: true);
        }
    }

    // Whether an entry id is in use: the app's kinds through the store, the book's own by scanning the folder.
    private bool IdTaken(string type, string id)
    {
        if (Kinds.ContainsKey(type)) { Refresh(force: true); return _byId.ContainsKey(id); }
        var folder = TypeOfFolder.First(kv => kv.Value == type).Key;
        var dir = Path.Combine(ContentPath, folder);
        return Directory.Exists(dir) && Directory.EnumerateFiles(dir).Any(f => IdIn(System.IO.File.ReadAllText(f), f) == id);
    }

    // A new entry's id and file from a name (as the app allocates them), and a starting text.
    public (string Path, string Text) NewFile(string type, string name, string? docsDir = null)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new CanonValidationException("A name is required.");
        if (type == "docs")
        {
            var dir = string.IsNullOrWhiteSpace(docsDir) ? throw new CanonValidationException("Which chapter folder?") : AsciiSlug(docsDir);
            var basis = AsciiSlug(name);
            var file = $"docs/{dir}/{basis}.md";
            for (var n = 2; System.IO.File.Exists(Path.Combine(ContentPath, file)); n++) file = $"docs/{dir}/{basis}-{n}.md";
            return (file, $"---\ntitle: {CanonYaml.Scalar(name.Trim()).Value}\n---\n\n");
        }
        var folder = TypeOfFolder.FirstOrDefault(kv => kv.Value == type).Key ?? throw new CanonValidationException($"Unknown entry type {type}.");
        string id;
        if (Kinds.ContainsKey(type)) id = AllocateId(type, name);
        else
        {
            var basis = AsciiSlug(name);
            if (basis.Length == 0) basis = type;
            id = $"{type}.{basis}";
            for (var n = 2; IdTaken(type, id) || System.IO.File.Exists(Path.Combine(ContentPath, folder, $"{SlugOf(id)}.md")) || System.IO.File.Exists(Path.Combine(ContentPath, folder, $"{SlugOf(id)}.yaml")); n++)
                id = $"{type}.{basis}-{n}";
        }
        // Markdown for types whose entries have prose, YAML for data-only ones (as the existing files are).
        var md = type is "npc" or "pc" or "creature" or "event" or "encounter" or "rule" or "source" or "item" or "handout"
            || (Directory.Exists(Path.Combine(ContentPath, folder)) && Directory.EnumerateFiles(Path.Combine(ContentPath, folder), "*.md").Any());
        var head = $"# yaml-language-server: $schema=../../../schemas/{type}.schema.json\nid: {id}\nslug: {SlugOf(id)}\nname: {CanonYaml.Scalar(name.Trim()).Value}\nstatus: stub\n";
        var nameLine = CanonYaml.Scalar(name.Trim());
        if (nameLine.Style == ScalarStyle.DoubleQuoted) head = head.Replace($"name: {nameLine.Value}\n", $"name: \"{nameLine.Value.Replace("\"", "\\\"")}\"\n");
        return md ? ($"{folder}/{SlugOf(id)}.md", $"---\n{head}---\n\n") : ($"{folder}/{SlugOf(id)}.yaml", head);
    }

    // ------------------------------------------------------------------ all-or-nothing saves

    // One save can write several files (several entities, an Asset relinked by its location) before
    // the database commits. A journal records each file as it was before the save's first change to
    // it; if anything later fails, Rollback puts every file back (and removes files the save created),
    // so files and database never disagree. Per async flow, so concurrent requests don't mix.
    private readonly AsyncLocal<Journal?> _journal = new();

    public Journal BeginJournal()
    {
        var j = new Journal(this);
        _journal.Value = j;
        return j;
    }

    public sealed class Journal(CanonStore store) : IDisposable
    {
        private readonly List<(string File, string? Before)> _entries = [];
        public int Count => _entries.Count;

        internal void Record(string file)
        {
            if (_entries.Any(e => e.File == file)) return;
            _entries.Add((file, System.IO.File.Exists(file) ? System.IO.File.ReadAllText(file) : null));
        }

        public void Rollback()
        {
            lock (store._gate)
            {
                foreach (var (file, before) in Enumerable.Reverse(_entries))
                {
                    try
                    {
                        if (before is null) { if (System.IO.File.Exists(file)) System.IO.File.Delete(file); }
                        else WriteAtomically(file, before);
                    }
                    catch (Exception ex)
                    {
                        store._log?.LogError(ex, "Could not restore canon file {File} after a failed save", file);
                    }
                }
                store._log?.LogWarning("Save failed: restored {Count} canon files", _entries.Count);
                _entries.Clear();
                store.Refresh(force: true);
            }
        }

        public void Dispose() { if (store._journal.Value == this) store._journal.Value = null; }
    }

    // A new, unused canonical id from a display name: npc.kelda-varruk, npc.kelda-varruk-2, ...
    // Factions, Assets, locations and goals drop a leading "The" (faction.order-of-theia), as their merges did.
    // `reserved` holds ids already handed out in the same save but not yet written.
    public string AllocateId(string kind, string name, ISet<string>? reserved = null)
    {
        Refresh(force: true);
        var spec = Spec(kind);
        var basis = AsciiSlug(name);
        // Events, encounters and threads keep it (event.the-calling), as their merge did.
        if (kind is "faction" or "asset" or "location" or "goal" && basis.StartsWith("the-", StringComparison.Ordinal)) basis = basis[4..];
        if (basis.Length == 0) basis = spec.IsCharacter ? "character" : kind;
        var id = $"{kind}.{basis}";
        lock (_gate)
            for (var n = 2; _byId.ContainsKey(id) || reserved?.Contains(id) == true || System.IO.File.Exists(Path.Combine(ContentPath, FolderOf(kind), $"{SlugOf(id)}{spec.Ext}")); n++)
                id = $"{kind}.{basis}-{n}";
        reserved?.Add(id);
        return id;
    }

    public static string FolderOf(string kind) => Spec(kind).Folder;
    private static string SlugOf(string id) => id[(id.IndexOf('.') + 1)..];

    public static string AsciiSlug(string s)
    {
        var decomposed = s.Replace('“', ' ').Replace('”', ' ').Replace('"', ' ').Replace('\'', ' ').Replace('’', ' ').Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var ch in decomposed)
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark) sb.Append(ch);
        return Regex.Replace(CanonText.Slug(sb.ToString()), "-{2,}", "-").Trim('-');
    }

    private static YamlMappingNode NewFrontmatter(string id) => new()
    {
        { "id", id },
        { "slug", SlugOf(id) },
        { "status", "draft" },
    };

    // ------------------------------------------------------------------ serialisation

    public static string Serialize(Document doc, string kind)
    {
        var spec = Spec(kind);
        Reorder(doc.Frontmatter, spec.KeyOrder);
        var sw = new StringWriter { NewLine = "\n" };
        var emitter = new Emitter(sw, new EmitterSettings(2, int.MaxValue, false, 1024, false, true));
        new YamlStream(new YamlDocument(doc.Frontmatter)).Save(emitter, assignAnchors: false);
        var yaml = Regex.Replace(sw.ToString().Replace("\r\n", "\n"), @"\n?\.\.\.\s*$", "").TrimEnd('\n');
        var schemaLine = $"# yaml-language-server: $schema=../../../schemas/{kind}.schema.json\n";
        if (!spec.IsMarkdown) return schemaLine + yaml + "\n";
        if (doc.RawBody is not null) return $"---\n{schemaLine}{yaml}\n---\n{doc.RawBody}";
        var sb = new StringBuilder();
        sb.Append("---\n").Append(schemaLine).Append(yaml).Append("\n---\n\n");
        if (doc.Preamble.Length > 0) sb.Append(doc.Preamble).Append("\n\n");
        sb.Append(string.Join("\n", doc.Sections.Select(s =>
            $"## {s.Heading}\n\n{(s.Audience == "players" ? $":::player-facing\n{s.Body}\n:::" : s.Body)}\n")));
        var text = sb.ToString();
        return text.EndsWith('\n') ? text : text + "\n";
    }

    private static void Reorder(YamlMappingNode map, string[] order)
    {
        var entries = map.Children.ToList();
        var rank = order.Select((k, i) => (k, i)).ToDictionary(x => x.k, x => x.i);
        int Rank(YamlNode k) => k is YamlScalarNode s && s.Value is not null && rank.TryGetValue(s.Value, out var r) ? r : order.Length;
        var sorted = entries.Select((kv, i) => (kv, i)).OrderBy(x => Rank(x.kv.Key)).ThenBy(x => x.i).Select(x => x.kv).ToList();
        map.Children.Clear();
        foreach (var kv in sorted) map.Children.Add(kv.Key, kv.Value);
    }

    // ------------------------------------------------------------------ validation

    // The same JSON Schema the book generates from its Zod schemas (adventure/schemas/<kind>.schema.json),
    // plus the one rule JSON Schema can't express (the value vector sums to 1).
    private void Validate(string id, string kind, YamlMappingNode fm)
    {
        var json = ToJson(fm);
        var schema = SchemaFor(kind);
        if (schema is not null)
        {
            var element = System.Text.Json.JsonDocument.Parse(json?.ToJsonString() ?? "null").RootElement;
            var result = schema.Evaluate(element, new EvaluationOptions { OutputFormat = OutputFormat.List });
            if (!result.IsValid)
            {
                var problems = (result.Details ?? []).Where(d => d.Errors is { Count: > 0 })
                    .SelectMany(d => d.Errors!.Select(e => $"{(d.InstanceLocation.ToString() is "" ? "(root)" : d.InstanceLocation.ToString())}: {e.Value}"))
                    .Distinct().Take(8);
                throw new CanonValidationException($"{id} doesn't match the {kind} schema: {string.Join("; ", problems)}");
            }
        }
        if (json is JsonObject o && o["start"]?["values"] is JsonObject v)
        {
            // Whole numbers (agency: 0) arrive as integers.
            static double? Num(JsonNode? n) => n is JsonValue jv && jv.TryGetValue<double>(out var d) ? d : n is JsonValue jl && jl.TryGetValue<long>(out var l) ? l : null;
            var sum = Num(v["truth"]) + Num(v["stability"]) + Num(v["agency"]);
            if (sum is { } s && Math.Abs(s - 1) >= 0.02)
                throw new CanonValidationException($"{id}: truth + stability + agency must sum to 1 (got {s.ToString(CultureInfo.InvariantCulture)})");
        }
    }

    private JsonSchema? SchemaFor(string kind)
    {
        lock (_gate)
        {
            if (_schemas.TryGetValue(kind, out var cached)) return cached;
            var file = Path.Combine(SchemaPath, $"{kind}.schema.json");
            if (!System.IO.File.Exists(file))
            {
                _log?.LogWarning("No schema at {File}; character files are saved without schema validation", file);
                return null;
            }
            var schema = JsonSchema.FromText(System.IO.File.ReadAllText(file));
            _schemas[kind] = schema;
            return schema;
        }
    }

    // YAML 1.2 core-schema typing for plain scalars; quoted scalars are always strings.
    public static JsonNode? ToJson(YamlNode node) => node switch
    {
        YamlMappingNode m => new JsonObject(m.Children.Select(kv => KeyValuePair.Create(((YamlScalarNode)kv.Key).Value ?? "", ToJson(kv.Value)))),
        YamlSequenceNode s => new JsonArray(s.Children.Select(ToJson).ToArray()),
        YamlScalarNode sc when sc.Style is ScalarStyle.Plain or ScalarStyle.Any => Plain(sc.Value),
        YamlScalarNode sc => JsonValue.Create(sc.Value ?? ""),
        _ => null,
    };

    private static JsonNode? Plain(string? v)
    {
        if (v is null or "" or "~" or "null" or "Null" or "NULL") return null;
        if (v is "true" or "True" or "TRUE") return JsonValue.Create(true);
        if (v is "false" or "False" or "FALSE") return JsonValue.Create(false);
        if (IntPattern().IsMatch(v) && long.TryParse(v, NumberStyles.Integer, CultureInfo.InvariantCulture, out var l)) return JsonValue.Create(l);
        if (FloatPattern().IsMatch(v) && double.TryParse(v, NumberStyles.Float, CultureInfo.InvariantCulture, out var d)) return JsonValue.Create(d);
        return JsonValue.Create(v);
    }

    [GeneratedRegex(@"\A---\r?\n([\s\S]*?)\r?\n---\r?\n?")] private static partial Regex Frontmatter();
    [GeneratedRegex(@"^## ", RegexOptions.Multiline)] private static partial Regex FirstSection();
    [GeneratedRegex(@"^[-+]?[0-9]+$")] private static partial Regex IntPattern();
    [GeneratedRegex(@"^[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?$")] private static partial Regex FloatPattern();
}
