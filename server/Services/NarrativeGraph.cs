using System.Security.Cryptography;
using System.Text;
using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services.Canon;
using Microsoft.EntityFrameworkCore;
using static ColonyTracker.Api.Services.Canon.CanonNarrativeLists;

namespace ColonyTracker.Api.Services;

// Connections and authored entity links live in their owner's file (ADVENTURE-BOOK-PLAN.md §13):
// an event's `leadsTo`, an event's or thread's `links`. This presents them as the records the API has
// always served, with ids derived from what each entry connects, and edits them by saving the owner.
// Links to sessions and session events are play data and stay rows in NarrativeEntityLinks.
public static class NarrativeGraph
{
    // A stable id for an entry, from what it connects (the files never hold app ids).
    public static string IdOf(params string[] parts)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(string.Join("|", parts)));
        return new Guid(hash.AsSpan(0, 16)).ToString();
    }

    public static string ConnectionId(string source, string target, string thread) => IdOf("leadsTo", source, target, thread);
    public static string LinkId(NarrativeOwnerType owner, string ownerId, NarrativeEntityType type, string entityId) => IdOf("links", owner.ToString(), ownerId, type.ToString(), entityId);

    // ---------------------------------------------------------------- reading

    public static IEnumerable<NarrativeEventConnection> ConnectionsOf(NarrativeEvent e) =>
        ParseLeadsTo(e.LeadsToJson).Select(l => new NarrativeEventConnection
        {
            Id = ConnectionId(e.Id, l.To, l.Thread), CampaignId = e.CampaignId, SourceNarrativeEventId = e.Id,
            TargetNarrativeEventId = l.To, ThreadId = l.Thread, Visibility = l.Visibility,
        });

    public static async Task<List<NarrativeEventConnection>> ConnectionsAsync(AppDbContext db, string campaignId) =>
        (await db.NarrativeEvents.AsNoTracking().Where(e => e.CampaignId == campaignId).ToListAsync()).SelectMany(ConnectionsOf).ToList();

    private static IEnumerable<NarrativeEntityLink> LinksOf(NarrativeOwnerType owner, string ownerId, string campaignId, string? json) =>
        ParseLinks(json).Select(l => new NarrativeEntityLink
        {
            Id = LinkId(owner, ownerId, l.EntityType, l.EntityId), CampaignId = campaignId, OwnerType = owner, OwnerId = ownerId,
            EntityType = l.EntityType, EntityId = l.EntityId, Role = l.Role, Notes = l.Notes, IsPrimary = l.IsPrimary, Visibility = l.Visibility,
        });

    public static async Task<List<NarrativeEntityLink>> LinksAsync(AppDbContext db, string campaignId)
    {
        var events = await db.NarrativeEvents.AsNoTracking().Where(e => e.CampaignId == campaignId).ToListAsync();
        var threads = await db.NarrativeThreads.AsNoTracking().Where(t => t.CampaignId == campaignId).ToListAsync();
        var play = await db.NarrativeEntityLinks.AsNoTracking().Where(l => l.CampaignId == campaignId).ToListAsync();
        return events.SelectMany(e => LinksOf(NarrativeOwnerType.Event, e.Id, campaignId, e.LinksJson))
            .Concat(threads.SelectMany(t => LinksOf(NarrativeOwnerType.Thread, t.Id, campaignId, t.LinksJson)))
            .Concat(play)
            .ToList();
    }

    // ---------------------------------------------------------------- editing connections

    public static async Task<NarrativeEventConnection> AddConnectionAsync(AppDbContext db, string campaignId, NarrativeEventConnection c)
    {
        var source = await EventAsync(db, campaignId, c.SourceNarrativeEventId);
        var list = ParseLeadsTo(source.LeadsToJson);
        if (list.Any(l => l.To == c.TargetNarrativeEventId && l.Thread == c.ThreadId))
            throw new CanonValidationException("That connection already exists.");
        list.Add(new LeadsTo(c.TargetNarrativeEventId, c.ThreadId, c.Visibility));
        source.LeadsToJson = LeadsToJson(list);
        await db.SaveChangesAsync();
        return ConnectionsOf(source).Single(x => x.TargetNarrativeEventId == c.TargetNarrativeEventId && x.ThreadId == c.ThreadId);
    }

    public static async Task<NarrativeEventConnection?> UpdateConnectionAsync(AppDbContext db, string campaignId, string id, NarrativeEventConnection c)
    {
        var existing = (await ConnectionsAsync(db, campaignId)).FirstOrDefault(x => x.Id == id);
        if (existing is null) return null;
        var from = await EventAsync(db, campaignId, existing.SourceNarrativeEventId);
        var fromList = ParseLeadsTo(from.LeadsToJson);
        var index = fromList.FindIndex(l => l.To == existing.TargetNarrativeEventId && l.Thread == existing.ThreadId);
        var entry = new LeadsTo(c.TargetNarrativeEventId, c.ThreadId, c.Visibility);
        if (c.SourceNarrativeEventId == existing.SourceNarrativeEventId)
        {
            if (fromList.Where((l, i) => i != index).Any(l => l.To == entry.To && l.Thread == entry.Thread)) throw new CanonValidationException("That connection already exists.");
            fromList[index] = entry;   // same place in the list
            from.LeadsToJson = LeadsToJson(fromList);
        }
        else
        {
            var to = await EventAsync(db, campaignId, c.SourceNarrativeEventId);
            var toList = ParseLeadsTo(to.LeadsToJson);
            if (toList.Any(l => l.To == entry.To && l.Thread == entry.Thread)) throw new CanonValidationException("That connection already exists.");
            fromList.RemoveAt(index);
            toList.Add(entry);
            from.LeadsToJson = LeadsToJson(fromList);
            to.LeadsToJson = LeadsToJson(toList);
        }
        await db.SaveChangesAsync();
        return (await ConnectionsAsync(db, campaignId)).First(x => x.Id == ConnectionId(c.SourceNarrativeEventId, entry.To, entry.Thread));
    }

    public static async Task<bool> RemoveConnectionAsync(AppDbContext db, string campaignId, string id)
    {
        var existing = (await ConnectionsAsync(db, campaignId)).FirstOrDefault(x => x.Id == id);
        if (existing is null) return false;
        var source = await EventAsync(db, campaignId, existing.SourceNarrativeEventId);
        source.LeadsToJson = LeadsToJson(ParseLeadsTo(source.LeadsToJson).Where(l => !(l.To == existing.TargetNarrativeEventId && l.Thread == existing.ThreadId)));
        await db.SaveChangesAsync();
        return true;
    }

    // ---------------------------------------------------------------- editing authored links

    // The owner's links as an editable list, and a way to store it back.
    private static async Task<(List<LinkItem> List, Action<List<LinkItem>> Store)> OwnerLinksAsync(AppDbContext db, string campaignId, NarrativeOwnerType owner, string ownerId)
    {
        if (owner == NarrativeOwnerType.Event)
        {
            var e = await EventAsync(db, campaignId, ownerId);
            return (ParseLinks(e.LinksJson), l => e.LinksJson = LinksJson(l));
        }
        var t = await db.NarrativeThreads.FirstOrDefaultAsync(x => x.Id == ownerId && x.CampaignId == campaignId)
            ?? throw new KeyNotFoundException($"Thread {ownerId} not found.");
        return (ParseLinks(t.LinksJson), l => t.LinksJson = LinksJson(l));
    }

    public static async Task<NarrativeEntityLink> AddLinkAsync(AppDbContext db, string campaignId, NarrativeEntityLink link)
    {
        var (list, store) = await OwnerLinksAsync(db, campaignId, link.OwnerType, link.OwnerId);
        if (list.Any(l => l.EntityType == link.EntityType && l.EntityId == link.EntityId)) throw new CanonValidationException("That link already exists.");
        list.Add(new LinkItem(link.EntityType, link.EntityId, link.Role, link.Notes, link.IsPrimary, link.Visibility));
        store(list);
        await db.SaveChangesAsync();
        return (await LinksAsync(db, campaignId)).First(l => l.Id == LinkId(link.OwnerType, link.OwnerId, link.EntityType, link.EntityId));
    }

    public static async Task<NarrativeEntityLink?> UpdateLinkAsync(AppDbContext db, string campaignId, NarrativeEntityLink existing, NarrativeEntityLink link)
    {
        var (list, store) = await OwnerLinksAsync(db, campaignId, existing.OwnerType, existing.OwnerId);
        var i = list.FindIndex(l => l.EntityType == existing.EntityType && l.EntityId == existing.EntityId);
        if (i < 0) return null;
        list[i] = list[i] with { Role = link.Role, Notes = link.Notes, IsPrimary = link.IsPrimary, Visibility = link.Visibility };
        store(list);
        await db.SaveChangesAsync();
        return (await LinksAsync(db, campaignId)).First(l => l.Id == existing.Id);
    }

    public static async Task RemoveLinkAsync(AppDbContext db, string campaignId, NarrativeEntityLink existing)
    {
        var (list, store) = await OwnerLinksAsync(db, campaignId, existing.OwnerType, existing.OwnerId);
        store(list.Where(l => !(l.EntityType == existing.EntityType && l.EntityId == existing.EntityId)).ToList());
        await db.SaveChangesAsync();
    }

    private static async Task<NarrativeEvent> EventAsync(AppDbContext db, string campaignId, string id) =>
        await db.NarrativeEvents.FirstOrDefaultAsync(e => e.Id == id && e.CampaignId == campaignId)
        ?? throw new KeyNotFoundException($"Narrative event {id} not found.");
}
