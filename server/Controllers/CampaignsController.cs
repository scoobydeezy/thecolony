using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
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
        await db.CharacterNarrativeProfiles.Where(x => characterIds.Contains(x.CharacterId)).ExecuteDeleteAsync();
        await db.CharacterDetails.Where(x => characterIds.Contains(x.CharacterId)).ExecuteDeleteAsync();
        await db.CharacterRelationships.Where(x => characterIds.Contains(x.SourceCharacterId)).ExecuteDeleteAsync();

        var mapIds = await db.ColonyMaps.Where(m => m.CampaignId == id).Select(m => m.Id).ToListAsync();
        await db.MapPlacements.Where(x => mapIds.Contains(x.MapId)).ExecuteDeleteAsync();
        await db.ColonyMaps.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.Locations.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.Assets.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.FactionGoals.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.WorldConditions.Where(x => x.CampaignId == id).ExecuteDeleteAsync();

        // Narrative planning graph
        var narrativeEventIds = await db.NarrativeEvents.Where(e => e.CampaignId == id).Select(e => e.Id).ToListAsync();
        var pathSetIds = await db.PathSets.Where(p => p.CampaignId == id).Select(p => p.Id).ToListAsync();
        var pathIds = await db.NarrativePaths.Where(p => pathSetIds.Contains(p.PathSetId)).Select(p => p.Id).ToListAsync();
        var overrideIds = await db.NarrativeEventOverrides.Where(o => narrativeEventIds.Contains(o.NarrativeEventId)).Select(o => o.Id).ToListAsync();
        await db.EventOverridePaths.Where(x => overrideIds.Contains(x.EventOverrideId)).ExecuteDeleteAsync();
        await db.EventOverrideConnections.Where(x => overrideIds.Contains(x.EventOverrideId)).ExecuteDeleteAsync();
        await db.EventOverrideEntityLinks.Where(x => overrideIds.Contains(x.EventOverrideId)).ExecuteDeleteAsync();
        await db.NarrativeEventOverrides.Where(x => overrideIds.Contains(x.Id)).ExecuteDeleteAsync();
        await db.PathEventScopes.Where(x => pathIds.Contains(x.PathId) || narrativeEventIds.Contains(x.NarrativeEventId)).ExecuteDeleteAsync();
        await db.NarrativeEventVariantParticipations.Where(x => pathSetIds.Contains(x.PathSetId) || narrativeEventIds.Contains(x.NarrativeEventId)).ExecuteDeleteAsync();
        await db.PathSetContexts.Where(x => pathSetIds.Contains(x.PathSetId)).ExecuteDeleteAsync();
        await db.NarrativePaths.Where(x => pathSetIds.Contains(x.PathSetId)).ExecuteDeleteAsync();
        await db.PathSets.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.NarrativeEventPlacements.Where(x => narrativeEventIds.Contains(x.NarrativeEventId)).ExecuteDeleteAsync();
        await db.NarrativeEventConnections.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
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

        // Build faction and character ID remap tables so references can be fixed up
        var factionIdMap = new Dictionary<string, string>();
        var characterIdMap = new Dictionary<string, string>();

        if (importAll || types.Contains("factions"))
        {
            var sourceFactions = await db.Factions.Where(f => f.CampaignId == request.SourceCampaignId).ToListAsync();
            foreach (var f in sourceFactions)
            {
                var newId = Guid.NewGuid().ToString();
                factionIdMap[f.Id] = newId;
                db.Factions.Add(new Faction
                {
                    Id = newId,
                    CampaignId = targetCid,
                    Name = f.Name,
                    Represents = f.Represents,
                    Type = f.Type,
                    CoreTenet = f.CoreTenet,
                    Focus = f.Focus,
                    CertainOf = f.CertainOf,
                    RightAbout = f.RightAbout,
                    AfraidOf = f.AfraidOf,
                    WrongAbout = f.WrongAbout,
                    Response = f.Response,
                    Summary = f.Summary,
                    Motto = f.Motto,
                    Origin = f.Origin,
                    FoundedAs = f.FoundedAs,
                    Became = f.Became,
                    PublicFace = f.PublicFace,
                    SelfImage = f.SelfImage,
                    History = f.History,
                    GlyphPath = f.GlyphPath,
                    IconPath = f.IconPath,
                    BeliefC = f.BeliefC,
                    BeliefA = f.BeliefA,
                    BeliefB = f.BeliefB,
                    TruthValue = f.TruthValue,
                    StabilityValue = f.StabilityValue,
                    AgencyValue = f.AgencyValue,
                    Active = f.Active,
                    Notes = f.Notes,
                    SortOrder = f.SortOrder,
                    Momentum = f.Momentum,
                    PowerModifier = f.PowerModifier,
                    // D15 (M0): previously dropped
                    FactionSize = f.FactionSize,
                    PrimaryColor = f.PrimaryColor,
                    SecondaryColor = f.SecondaryColor,
                    BannerShape = f.BannerShape,
                    LeaderId = f.LeaderId, // remapped to the imported character below, or cleared
                });
            }
        }

        if (importAll || types.Contains("characters") || types.Contains("partyMembers"))
        {
            var query = db.Characters.Where(c => c.CampaignId == request.SourceCampaignId);
            if (!importAll && types.Contains("partyMembers") && !types.Contains("characters"))
                query = query.Where(c => c.CharacterType == CharacterType.PartyMember);

            var sourceChars = await query.ToListAsync();
            foreach (var c in sourceChars)
            {
                var newCharId = Guid.NewGuid().ToString();
                characterIdMap[c.Id] = newCharId;
                // Remap factionId if the faction was imported; null if it wasn't
                var newFactionId = c.FactionId != null && factionIdMap.TryGetValue(c.FactionId, out var mapped)
                    ? mapped : null;

                db.Characters.Add(new Character
                {
                    Id = newCharId,
                    CampaignId = targetCid,
                    Name = c.Name,
                    CharacterType = c.CharacterType,
                    Ancestry = c.Ancestry,
                    Heritage = c.Heritage,
                    Class = c.Class,
                    Background = c.Background,
                    Level = c.Level,
                    Gender = c.Gender,
                    Age = c.Age,
                    Occupation = c.Occupation,
                    Summary = c.Summary,
                    FactionId = newFactionId,
                    // Social classes are factions: remap if imported, otherwise null.
                    SocialClassId = c.SocialClassId != null && factionIdMap.TryGetValue(c.SocialClassId, out var mappedClass) ? mappedClass : null,
                    NarrativeTier = c.NarrativeTier,
                    Pronouns = c.Pronouns,
                    Aliases = c.Aliases,
                    PortraitPath = c.PortraitPath,
                    TruthValue = c.TruthValue,
                    StabilityValue = c.StabilityValue,
                    AgencyValue = c.AgencyValue,
                    BeliefC = c.BeliefC,
                    BeliefA = c.BeliefA,
                    BeliefB = c.BeliefB,
                    DoubtDirection = c.DoubtDirection,
                    Conviction = c.Conviction,
                    Pressure = c.Pressure,
                    Influence = c.Influence,
                    Impressionable = c.Impressionable,
                    State = c.State,
                });
            }
        }

        // D15: leaders point at imported characters (or nothing, if the leader wasn't imported).
        foreach (var f in db.ChangeTracker.Entries<Faction>().Where(e => e.State == EntityState.Added).Select(e => e.Entity))
            f.LeaderId = f.LeaderId != null && characterIdMap.TryGetValue(f.LeaderId, out var newLeader) ? newLeader : null;

        await db.SaveChangesAsync();
        return Ok(new { message = "Import complete." });
    }
}

public record ActivateRequest(string EngineVersion);

public record ImportRequest(
    string SourceCampaignId,
    List<string>? EntityTypes,
    bool ImportAll
);
