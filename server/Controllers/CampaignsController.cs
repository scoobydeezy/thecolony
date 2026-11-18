using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services.Canon;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/campaigns")]
public class CampaignsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await db.Campaigns.OrderBy(c => c.CreatedAt).ToListAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var campaign = await db.Campaigns.FindAsync(id);
        return campaign is null ? NotFound() : Ok(campaign);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Campaign campaign)
    {
        campaign.Id = Guid.NewGuid().ToString();
        campaign.CreatedAt = DateTime.UtcNow;
        campaign.UpdatedAt = DateTime.UtcNow;
        db.Campaigns.Add(campaign);

        // Each new campaign gets its own default ColonyState and RulesConfig
        db.ColonyStates.Add(new ColonyState { CampaignId = campaign.Id });
        db.RulesConfigs.Add(new RulesConfig { CampaignId = campaign.Id });

        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = campaign.Id }, campaign);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] Campaign campaign)
    {
        if (id != campaign.Id) return BadRequest();
        // M1: only descriptive fields; Mode, ActivatedAt and HistoryVersion change through their own rules.
        var existing = await db.Campaigns.FindAsync(id);
        if (existing is null) return NotFound();
        existing.Name = campaign.Name;
        existing.Description = campaign.Description;
        existing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(existing);
    }

    // POST /api/campaigns/{id}/activate  { engineVersion }
    // M1: one-way Design -> Live. Writes RulesVersion 1 (snapshot of the current rules) and locks the baseline.
    [HttpPost("{id}/activate")]
    public async Task<IActionResult> Activate(string id, [FromBody] ActivateRequest request)
    {
        var existing = await db.Campaigns.FindAsync(id);
        if (existing is null) return NotFound();
        if (existing.Mode == CampaignMode.Live) return Conflict("Campaign is already Live.");
        if (string.IsNullOrWhiteSpace(request.EngineVersion)) return BadRequest("engineVersion is required.");
        var rules = await db.RulesConfigs.AsNoTracking().FirstOrDefaultAsync(r => r.CampaignId == id);
        if (rules is null) return Conflict("Campaign has no rules to version.");

        await using var tx = await db.Database.BeginTransactionAsync();
        db.RulesVersions.Add(new RulesVersion
        {
            CampaignId = id, Version = 1, EngineVersion = request.EngineVersion,
            RulesJson = System.Text.Json.JsonSerializer.Serialize(rules),
        });
        existing.Mode = CampaignMode.Live;
        existing.ActivatedAt = DateTime.UtcNow;
        existing.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return Ok(existing);
    }

    [HttpGet("{id}/rules-versions")]
    public async Task<IActionResult> RulesVersions(string id) =>
        Ok(await db.RulesVersions.Where(r => r.CampaignId == id).OrderBy(r => r.Version).ToListAsync());

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var count = await db.Campaigns.CountAsync();
        if (count <= 1) return Conflict("Cannot delete the last remaining campaign.");

        var campaign = await db.Campaigns.FindAsync(id);
        if (campaign is null) return NotFound();

        // D15 (M0): delete EVERYTHING the campaign owns, children before parents, in one transaction
        // (previously Assets, Goals, Locations, Maps, character narrative rows and all Narrative* rows were orphaned,
        // and each bulk delete committed independently).
        await using var tx = await db.Database.BeginTransactionAsync();

        var characterIds = await db.Characters.Where(c => c.CampaignId == id).Select(c => c.Id).ToListAsync();
        // Characters, factions, Assets and locations live in canonical files shared by every campaign:
        // delete only this campaign's link rows and play state, never the files.
        await db.CharacterSectionReveals.Where(x => characterIds.Contains(x.CharacterId)).ExecuteDeleteAsync();
        // Relationships are in the character files (§15): nothing to delete here.

        var mapIds = await db.ColonyMaps.Where(m => m.CampaignId == id).Select(m => m.Id).ToListAsync();
        await db.MapPlacements.Where(x => mapIds.Contains(x.MapId)).ExecuteDeleteAsync();
        await db.ColonyMaps.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.Locations.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.Assets.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.FactionGoals.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.WorldConditions.Where(x => x.CampaignId == id).ExecuteDeleteAsync();

        // Narrative planning graph
        var narrativeEventIds = await db.NarrativeEvents.Where(e => e.CampaignId == id).Select(e => e.Id).ToListAsync();
        // Branches, paths and versions are in the files (§14); only the branch link rows go.
        await db.PathSets.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.NarrativeEventPlacements.Where(x => narrativeEventIds.Contains(x.NarrativeEventId)).ExecuteDeleteAsync();
        await db.NarrativeEntityLinks.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.NarrativeThreads.Where(x => x.CampaignId == id).ExecuteDeleteAsync();

        // Sessions → Events → EventEffects (bulk delete bypasses EF cascade, so delete explicitly)
        var sessionIds = await db.Sessions.Where(s => s.CampaignId == id).Select(s => s.Id).ToListAsync();
        var sessionEventIds = await db.Events.Where(e => sessionIds.Contains(e.SessionId)).Select(e => e.Id).ToListAsync();
        await db.NarrativeEventRealizations.Where(x => narrativeEventIds.Contains(x.NarrativeEventId) || sessionEventIds.Contains(x.SessionEventId)).ExecuteDeleteAsync();
        await db.NarrativeEvents.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.EventEffects.Where(ef => sessionEventIds.Contains(ef.EventId)).ExecuteDeleteAsync();
        await db.Events.Where(e => sessionIds.Contains(e.SessionId)).ExecuteDeleteAsync();
        await db.Sessions.Where(s => s.CampaignId == id).ExecuteDeleteAsync();

        await db.Characters.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.Factions.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.RelationshipOverrides.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.ColonyStates.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.RulesConfigs.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.SessionLog.Where(x => x.CampaignId == id).ExecuteDeleteAsync();

        db.Campaigns.Remove(campaign);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return NoContent();
    }

    // POST /api/campaigns/import
    // Duplicates entities from a source campaign into the currently active campaign.
    // entityTypes: array of "factions" | "characters" | "partyMembers"
    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] ImportRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SourceCampaignId))
            return BadRequest("sourceCampaignId is required.");

        var source = await db.Campaigns.FindAsync(request.SourceCampaignId);
        if (source is null) return NotFound("Source campaign not found.");

        var settings = await db.AppSettings.FirstOrDefaultAsync();
        var targetCid = settings?.ActiveCampaignId;
        if (string.IsNullOrWhiteSpace(targetCid)) return BadRequest("No active campaign.");
        if (targetCid == request.SourceCampaignId) return BadRequest("Source and target campaigns must differ.");

        var types = request.EntityTypes ?? [];
        var importAll = request.ImportAll;

        // Factions and characters are canonical files shared by every campaign (ADVENTURE-BOOK-PLAN.md
        // §9, §10): importing one links the target campaign to the same file. References between them
        // (a character's faction, a faction's leader) are canonical ids in the files, so they resolve to
        // the target campaign's own rows automatically; a reference to something not imported shows
        // its canonical id until that entity is imported too.
        var canon = db.Canon ?? throw new InvalidOperationException("No canonical file store.");
        var linked = 0;
        var skipped = 0;

        async Task LinkAsync<T>(IQueryable<T> source, Func<T, bool> include, Func<T, T> newRow) where T : class, ICanonEntity
        {
            var existing = (await db.Set<T>().AsNoTracking().Where(x => x.CampaignId == targetCid).Select(x => x.CanonId).ToListAsync()).ToHashSet();
            foreach (var x in (await source.AsNoTracking().ToListAsync()).Where(include))
            {
                if (x.CanonId is null || existing.Contains(x.CanonId) || !canon.TryGet(x.CanonId, out var entry)) { skipped++; continue; }
                var row = newRow(x);
                row.CanonId = x.CanonId;
                CanonMapping.Hydrate(row, entry, refs: null, canon);   // the file's values, so the save writes nothing
                db.Add(row);
                existing.Add(x.CanonId);
                linked++;
            }
        }

        if (importAll || types.Contains("factions"))
            await LinkAsync(db.Factions.Where(f => f.CampaignId == request.SourceCampaignId), _ => true,
                f => new Faction { Id = Guid.NewGuid().ToString(), CampaignId = targetCid, SortOrder = f.SortOrder, Momentum = f.Momentum, PowerModifier = f.PowerModifier });

        if (importAll || types.Contains("characters") || types.Contains("partyMembers"))
        {
            var partyOnly = !importAll && types.Contains("partyMembers") && !types.Contains("characters");
            await LinkAsync(db.Characters.Where(c => c.CampaignId == request.SourceCampaignId), c => !partyOnly || c.CharacterType == CharacterType.PartyMember,
                _ => new Character { Id = Guid.NewGuid().ToString(), CampaignId = targetCid });
        }

        await db.SaveChangesAsync();
        return Ok(new
        {
            message = skipped > 0 ? $"Import complete: {linked} linked, {skipped} already in this campaign or without a file." : "Import complete.",
            linked,
            skipped,
        });
    }
}

public record ActivateRequest(string EngineVersion);

public record ImportRequest(
    string SourceCampaignId,
    List<string>? EntityTypes,
    bool ImportAll
);
