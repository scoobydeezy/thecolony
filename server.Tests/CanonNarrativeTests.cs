using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using ColonyTracker.Api.Services.Canon;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Tests;

// ADVENTURE-BOOK-PLAN.md §13: events, encounters and threads are canonical files; connections are
// the source event's `leadsTo` and entity links the owner's `links`, with canonical ids in the files
// and row ids in the app. The Markdown body is the book's and is never touched by an app save.
public class CanonNarrativeTests : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    private readonly TestCanon _canon = new();
    private const string Cid = "c1";

    public CanonNarrativeTests()
    {
        _conn.Open();
        using var db = _canon.Db(_conn);
        db.Database.EnsureCreated();
        db.Campaigns.Add(new Campaign { Id = Cid, Name = "Test" });
        db.Characters.Add(new Character { Id = "guid-vara", CampaignId = Cid, Name = "Vara Cairn" });
        db.NarrativeThreads.Add(new NarrativeThread { Id = "guid-keeper", CampaignId = Cid, Title = "The Keeper", Color = "#aa8844" });
        db.NarrativeEvents.Add(new NarrativeEvent { Id = "guid-calling", CampaignId = Cid, Title = "The Calling", Summary = "Bells ring.", Visibility = NarrativeVisibility.Public, SortOrder = 0 });
        db.NarrativeEvents.Add(new NarrativeEvent { Id = "guid-reading", CampaignId = Cid, Title = "The Reading", Kind = NarrativeKind.Encounter, ParentEventId = "guid-calling", SortOrder = 1 });
        db.SaveChanges();
    }

    public void Dispose() { _conn.Dispose(); _canon.Dispose(); }

    [Fact]
    public void Items_are_files_of_their_kind_with_canonical_references()
    {
        var calling = File.ReadAllText(_canon.File("event.the-calling"));
        Assert.StartsWith("---\n# yaml-language-server: $schema=../../../schemas/event.schema.json\nid: event.the-calling\nslug: the-calling\nname: The Calling\nsummary: Bells ring.\nvisibility: Public\n", calling);
        var reading = File.ReadAllText(_canon.File("encounter.the-reading"));
        Assert.Contains("\nevent: event.the-calling\n", reading);
        Assert.DoesNotContain("visibility", reading);   // GMOnly is the schema's default: left out
        Assert.Contains("color: \"#aa8844\"\n", File.ReadAllText(_canon.File("thread.the-keeper")));

        using var db = _canon.Db(_conn);
        var r = db.NarrativeEvents.Single(e => e.Id == "guid-reading");
        Assert.Equal((NarrativeKind.Encounter, "guid-calling", "The Reading", NarrativeVisibility.GMOnly), (r.Kind, r.ParentEventId, r.Title, r.Visibility));
        var columns = db.Database.SqlQueryRaw<string>("SELECT name AS Value FROM pragma_table_info('NarrativeEvents')").ToList();
        Assert.DoesNotContain("Title", columns);
        Assert.Contains("Status", columns);
        Assert.Contains("SortOrder", columns);
    }

    [Fact]
    public async Task Connections_and_links_live_in_the_owners_files()
    {
        using (var db = _canon.Db(_conn))
        {
            var c = await NarrativeGraph.AddConnectionAsync(db, Cid, new NarrativeEventConnection { SourceNarrativeEventId = "guid-calling", TargetNarrativeEventId = "guid-reading", ThreadId = "guid-keeper" });
            Assert.Equal(NarrativeGraph.ConnectionId("guid-calling", "guid-reading", "guid-keeper"), c.Id);
            await NarrativeGraph.AddLinkAsync(db, Cid, new NarrativeEntityLink { OwnerType = NarrativeOwnerType.Event, OwnerId = "guid-reading", EntityType = NarrativeEntityType.Character, EntityId = "guid-vara" });
            await NarrativeGraph.AddLinkAsync(db, Cid, new NarrativeEntityLink { OwnerType = NarrativeOwnerType.Thread, OwnerId = "guid-keeper", EntityType = NarrativeEntityType.Character, EntityId = "guid-vara", Role = "The Keeper", IsPrimary = true });
            await Assert.ThrowsAsync<CanonValidationException>(() => NarrativeGraph.AddConnectionAsync(db, Cid, new NarrativeEventConnection { SourceNarrativeEventId = "guid-calling", TargetNarrativeEventId = "guid-reading", ThreadId = "guid-keeper" }));
        }
        Assert.Contains("leadsTo:\n  - to: encounter.the-reading\n    thread: thread.the-keeper\n", File.ReadAllText(_canon.File("event.the-calling")));
        Assert.Contains("links:\n  - npc.vara-cairn\n", File.ReadAllText(_canon.File("encounter.the-reading")));
        Assert.Contains("links:\n  - id: npc.vara-cairn\n    role: The Keeper\n    primary: true\n", File.ReadAllText(_canon.File("thread.the-keeper")));
        foreach (var f in Directory.EnumerateFiles(_canon.Dir, "*", SearchOption.AllDirectories)) Assert.DoesNotContain("guid-", File.ReadAllText(f));

        using (var db = _canon.Db(_conn))
        {
            var links = await NarrativeGraph.LinksAsync(db, Cid);
            Assert.Equal(2, links.Count);
            Assert.All(links, l => Assert.Equal("guid-vara", l.EntityId));
            // Changing the target changes the id (it is derived from what the entry connects).
            var id = NarrativeGraph.ConnectionId("guid-calling", "guid-reading", "guid-keeper");
            var moved = await NarrativeGraph.UpdateConnectionAsync(db, Cid, id, new NarrativeEventConnection { Id = id, SourceNarrativeEventId = "guid-reading", TargetNarrativeEventId = "guid-calling", ThreadId = "guid-keeper", Visibility = NarrativeVisibility.Revealed });
            Assert.Equal(NarrativeGraph.ConnectionId("guid-reading", "guid-calling", "guid-keeper"), moved!.Id);
            Assert.Single(await NarrativeGraph.ConnectionsAsync(db, Cid));
        }
        Assert.DoesNotContain("leadsTo", File.ReadAllText(_canon.File("event.the-calling")));
        Assert.Contains("leadsTo:\n  - to: event.the-calling\n    thread: thread.the-keeper\n    visibility: Revealed\n", File.ReadAllText(_canon.File("encounter.the-reading")));
    }

    [Fact]
    public async Task A_session_link_is_play_data_and_stays_a_row()
    {
        using var db = _canon.Db(_conn);
        db.NarrativeEntityLinks.Add(new NarrativeEntityLink { CampaignId = Cid, OwnerType = NarrativeOwnerType.Event, OwnerId = "guid-calling", EntityType = NarrativeEntityType.Session, EntityId = "s1" });
        db.SaveChanges();
        Assert.DoesNotContain("links", File.ReadAllText(_canon.File("event.the-calling")));
        Assert.Contains(await NarrativeGraph.LinksAsync(db, Cid), l => l.EntityType == NarrativeEntityType.Session);
    }

    [Fact]
    public void An_app_save_keeps_the_body_and_what_the_app_does_not_model()
    {
        var file = _canon.File("event.the-calling");
        var handWritten = """
            ---
            # yaml-language-server: $schema=../../../schemas/event.schema.json
            id: event.the-calling
            slug: the-calling
            name: The Calling
            summary: Bells ring.
            visibility: Public
            part: part.act-1
            chapter: arrival
            order: 1
            links:
              - creature.kelda-varruk
              - npc.vara-cairn
            status: draft
            readiness:
              status: compiled
            ---

            :::gm-note
            The prose is the book's.
            :::

            ## A heading in the body
            """.Replace("\r\n", "\n") + "\n";
        File.WriteAllText(file, handWritten);
        _canon.Store.Refresh(force: true);

        using (var db = _canon.Db(_conn))
        {
            var ev = db.NarrativeEvents.Single(e => e.Id == "guid-calling");
            ev.Status = NarrativeEventStatus.Occurred;   // play data: no file write
            db.SaveChanges();
        }
        Assert.Equal(handWritten, File.ReadAllText(file));

        using (var db = _canon.Db(_conn))
        {
            var ev = db.NarrativeEvents.Single(e => e.Id == "guid-calling");
            Assert.Single(CanonNarrativeLists.ParseLinks(ev.LinksJson));   // the app sees Vara, not the stat block
            ev.Summary = "Bells ring at dusk.";
            ev.LinksJson = "[]";                                              // unlink Vara
            db.SaveChanges();
        }
        var after = File.ReadAllText(file);
        Assert.Equal(handWritten.Replace("summary: Bells ring.", "summary: Bells ring at dusk.").Replace("  - npc.vara-cairn\n", ""), after);
    }

    [Fact]
    public void Deleting_an_item_leaves_references_to_it_flagged_not_rewritten()
    {
        using (var db = _canon.Db(_conn))
        {
            NarrativeGraph.AddConnectionAsync(db, Cid, new NarrativeEventConnection { SourceNarrativeEventId = "guid-calling", TargetNarrativeEventId = "guid-reading", ThreadId = "guid-keeper" }).GetAwaiter().GetResult();
            db.NarrativeEvents.Remove(db.NarrativeEvents.Single(e => e.Id == "guid-reading"));
            db.SaveChanges();
        }
        Assert.False(File.Exists(_canon.File("encounter.the-reading")));
        var calling = _canon.Store.All("event").Single();
        Assert.Contains(CanonEntityMapping.References(calling), r => r.Id == "encounter.the-reading");   // still there: a stale reference
    }
}
