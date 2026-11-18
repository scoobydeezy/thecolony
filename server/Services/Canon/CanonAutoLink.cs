using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Services.Canon;

// One source of truth (user, 2026-11-17): every canonical file is in the app, and every app entity
// is a file. The app already writes a file for everything it creates; this links the other way:
// a file with no row in a campaign (added in VS Code, by git, by a merge) gets one.
//
// Design campaigns only. In a Live campaign a new entity enters the world through an Event
// (IntroducedAtEventId), so an unlinked file is listed in /api/canon/status instead.
public sealed class CanonAutoLink(IServiceScopeFactory scopes, CanonStore store, ILogger<CanonAutoLink> log) : BackgroundService
{
    // A file this new may be one the app is creating right now (files are written just before the
    // row is committed); it is linked on a later pass if it still has no row.
    public static readonly TimeSpan SettleTime = TimeSpan.FromSeconds(5);

    private string? _seen;

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                // Only touch the database when the set of files (or a still-settling file) changes.
                var all = store.All();
                var key = string.Join(",", all.Select(e => e.Id)) + (all.Any(e => DateTime.UtcNow - e.Mtime < SettleTime) ? "+settling" : "");
                if (key != _seen)
                {
                    using var scope = scopes.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    await LinkAsync(db, store, log, ct);
                    _seen = key;
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                log.LogWarning(ex, "Linking new canon files failed; retrying");
                _seen = null;
            }
            await Task.Delay(TimeSpan.FromSeconds(2), ct);
        }
    }

    // Link every settled file that has no row in each Design campaign. Returns the rows added.
    public static async Task<int> LinkAsync(AppDbContext db, CanonStore store, ILogger? log = null, CancellationToken ct = default, TimeSpan? settle = null)
    {
        var cutoff = DateTime.UtcNow - (settle ?? SettleTime);
        var added = 0;
        foreach (var campaign in await db.Campaigns.AsNoTracking().Where(c => c.Mode == CampaignMode.Design).ToListAsync(ct))
        {
            var linked = new HashSet<string>(StringComparer.Ordinal);
            linked.UnionWith(await db.Characters.AsNoTracking().Where(x => x.CampaignId == campaign.Id && x.CanonId != null).Select(x => x.CanonId!).ToListAsync(ct));
            linked.UnionWith(await db.Factions.AsNoTracking().Where(x => x.CampaignId == campaign.Id && x.CanonId != null).Select(x => x.CanonId!).ToListAsync(ct));
            linked.UnionWith(await db.Assets.AsNoTracking().Where(x => x.CampaignId == campaign.Id && x.CanonId != null).Select(x => x.CanonId!).ToListAsync(ct));
            linked.UnionWith(await db.Locations.AsNoTracking().Where(x => x.CampaignId == campaign.Id && x.CanonId != null).Select(x => x.CanonId!).ToListAsync(ct));
            linked.UnionWith(await db.FactionGoals.AsNoTracking().Where(x => x.CampaignId == campaign.Id && x.CanonId != null).Select(x => x.CanonId!).ToListAsync(ct));
            linked.UnionWith(await db.NarrativeEvents.AsNoTracking().Where(x => x.CampaignId == campaign.Id && x.CanonId != null).Select(x => x.CanonId!).ToListAsync(ct));
            linked.UnionWith(await db.NarrativeThreads.AsNoTracking().Where(x => x.CampaignId == campaign.Id && x.CanonId != null).Select(x => x.CanonId!).ToListAsync(ct));
            linked.UnionWith(await db.PathSets.AsNoTracking().Where(x => x.CampaignId == campaign.Id && x.CanonId != null).Select(x => x.CanonId!).ToListAsync(ct));
            linked.UnionWith(await db.WorldConditions.AsNoTracking().Where(x => x.CampaignId == campaign.Id && x.CanonId != null).Select(x => x.CanonId!).ToListAsync(ct));
            var conditionOrder = (await db.WorldConditions.AsNoTracking().Where(c => c.CampaignId == campaign.Id).MaxAsync(c => (int?)c.SortOrder, ct) ?? -1) + 1;
            var eventOrder = (await db.NarrativeEvents.AsNoTracking().Where(e => e.CampaignId == campaign.Id).MaxAsync(e => (int?)e.SortOrder, ct) ?? -1) + 1;
            var sortOrder = (await db.Factions.AsNoTracking().Where(f => f.CampaignId == campaign.Id).MaxAsync(f => (int?)f.SortOrder, ct) ?? -1) + 1;
            foreach (var entry in store.All().Where(e => !linked.Contains(e.Id) && e.Mtime < cutoff))
            {
                ICanonEntity row = entry.Kind switch
                {
                    "npc" or "pc" => new Character { CampaignId = campaign.Id },
                    "faction" => new Faction { CampaignId = campaign.Id, SortOrder = sortOrder++ },
                    "asset" => new Asset { CampaignId = campaign.Id },
                    "location" => new Location { CampaignId = campaign.Id },
                    "goal" => new FactionGoal { CampaignId = campaign.Id },
                    "event" or "encounter" => new NarrativeEvent { CampaignId = campaign.Id, SortOrder = eventOrder++ },
                    "thread" => new NarrativeThread { CampaignId = campaign.Id },
                    "branch" => new PathSet { CampaignId = campaign.Id },
                    "condition" => new WorldCondition { CampaignId = campaign.Id, SortOrder = conditionOrder++ },
                    _ => throw new InvalidOperationException($"unknown canon kind {entry.Kind}"),
                };
                row.GetType().GetProperty(nameof(ICanonEntity.Id))!.SetValue(row, Guid.NewGuid().ToString());
                row.CanonId = entry.Id;
                CanonMapping.Hydrate(row, entry, refs: null, store);   // the file's values, so the save writes nothing
                db.Add(row);
                log?.LogInformation("Linked canon file {Id} into campaign {Campaign}", entry.Id, campaign.Name);
                added++;
            }
        }
        if (added > 0) await db.SaveChangesAsync(ct);
        return added;
    }
}
