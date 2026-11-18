using ColonyTracker.Api.Data;
using ColonyTracker.Api.Services;
using ColonyTracker.Api.Services.Canon;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

// The canonical files the app reads and saves (ADVENTURE-BOOK-PLAN.md §9, §10).
[ApiController]
[Route("api/canon")]
public class CanonController(AppDbContext db, ICampaignContext campaign, CanonStore canon) : ControllerBase
{
    // GET /api/canon/status: where the files are, any that can't be read, and any of this
    // campaign's rows whose file is missing.
    [HttpGet("status")]
    public async Task<IActionResult> Status()
    {
        var cid = await campaign.GetActiveIdAsync();
        var links = new List<(string Type, string Id, string? CanonId)>();
        links.AddRange((await db.Characters.AsNoTracking().Where(c => c.CampaignId == cid).Select(c => new { c.Id, c.CanonId }).ToListAsync()).Select(l => ("character", l.Id, l.CanonId)));
        links.AddRange((await db.Factions.AsNoTracking().Where(c => c.CampaignId == cid).Select(c => new { c.Id, c.CanonId }).ToListAsync()).Select(l => ("faction", l.Id, l.CanonId)));
        links.AddRange((await db.Assets.AsNoTracking().Where(c => c.CampaignId == cid).Select(c => new { c.Id, c.CanonId }).ToListAsync()).Select(l => ("asset", l.Id, l.CanonId)));
        links.AddRange((await db.Locations.AsNoTracking().Where(c => c.CampaignId == cid).Select(c => new { c.Id, c.CanonId }).ToListAsync()).Select(l => ("location", l.Id, l.CanonId)));
        links.AddRange((await db.FactionGoals.AsNoTracking().Where(c => c.CampaignId == cid).Select(c => new { c.Id, c.CanonId }).ToListAsync()).Select(l => ("goal", l.Id, l.CanonId)));
        links.AddRange((await db.NarrativeEvents.AsNoTracking().Where(c => c.CampaignId == cid).Select(c => new { c.Id, c.CanonId }).ToListAsync()).Select(l => ("narrative", l.Id, l.CanonId)));
        links.AddRange((await db.NarrativeThreads.AsNoTracking().Where(c => c.CampaignId == cid).Select(c => new { c.Id, c.CanonId }).ToListAsync()).Select(l => ("thread", l.Id, l.CanonId)));
        links.AddRange((await db.PathSets.AsNoTracking().Where(c => c.CampaignId == cid).Select(c => new { c.Id, c.CanonId }).ToListAsync()).Select(l => ("branch", l.Id, l.CanonId)));
        links.AddRange((await db.WorldConditions.AsNoTracking().Where(c => c.CampaignId == cid).Select(c => new { c.Id, c.CanonId }).ToListAsync()).Select(l => ("condition", l.Id, l.CanonId)));
        var all = canon.All();
        // Paths are declared inside branch files (§14), not files of their own.
        var paths = all.Where(e => e.Kind == "branch")
            .SelectMany(e => CanonNarrativeLists.ParsePaths(CanonNarrativeLists.PathsJson(e.Document.Frontmatter.Children.TryGetValue(new YamlDotNet.RepresentationModel.YamlScalarNode("paths"), out var n) ? n as YamlDotNet.RepresentationModel.YamlSequenceNode : null)))
            .Select(p => p.Id).ToHashSet();
        bool Exists(string id) => id.StartsWith("path.", StringComparison.Ordinal) ? paths.Contains(id) : !CanonStore.Kinds.ContainsKey(id.Split('.')[0]) || canon.TryGet(id, out _);
        var linked = links.Where(l => l.CanonId is not null).Select(l => l.CanonId!).ToHashSet();
        return Ok(new
        {
            contentPath = canon.ContentPath,
            schemaPath = canon.SchemaPath,
            files = all.GroupBy(e => e.Kind).ToDictionary(g => g.Key, g => g.Count()),
            loadErrors = canon.Errors(),
            campaignLinks = links.GroupBy(l => l.Type).ToDictionary(g => g.Key, g => g.Count()),
            missingFiles = links.Where(l => l.CanonId is null || !canon.TryGet(l.CanonId, out _)).Select(l => new { type = l.Type, id = l.Id, canonId = l.CanonId }),
            notInThisCampaign = all.Where(e => !linked.Contains(e.Id)).Select(e => e.Id),
            // §12: references to entries that no longer exist (e.g. a faction deleted while characters
            // still name it). Flagged, never removed automatically. Only kinds the app stores: a link to a
            // book-only entry (creature., rule., source.) is the book's to check.
            staleReferences = all.SelectMany(e => CanonEntityMapping.References(e)
                    .Where(r => !Exists(r.Id)).Select(r => new { from = e.Id, path = r.Path, to = r.Id })),
        });
    }

    // GET /api/canon/characters: the character files as the API parses them.
    [HttpGet("characters")]
    public IActionResult Characters() => Ok(canon.Characters().Select(e => new { e.Id, e.Kind, file = Path.GetRelativePath(canon.ContentPath, e.File), e.Version, e.Model }));
}
