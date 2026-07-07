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
        campaign.UpdatedAt = DateTime.UtcNow;
        db.Entry(campaign).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(campaign);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var count = await db.Campaigns.CountAsync();
        if (count <= 1) return Conflict("Cannot delete the last remaining campaign.");

        var campaign = await db.Campaigns.FindAsync(id);
        if (campaign is null) return NotFound();

        // Cascade-delete all owned data for this campaign
        await db.Factions.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.Characters.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.RelationshipOverrides.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.ColonyStates.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.RulesConfigs.Where(x => x.CampaignId == id).ExecuteDeleteAsync();
        await db.SessionLog.Where(x => x.CampaignId == id).ExecuteDeleteAsync();

        // Sessions cascade to Events → EventEffects via DB FK, but EF bulk delete bypasses that.
        // Load session IDs, delete effects and events explicitly, then sessions.
        var sessionIds = await db.Sessions.Where(s => s.CampaignId == id).Select(s => s.Id).ToListAsync();
        if (sessionIds.Count > 0)
        {
            var eventIds = await db.Events.Where(e => sessionIds.Contains(e.SessionId)).Select(e => e.Id).ToListAsync();
            if (eventIds.Count > 0)
                await db.EventEffects.Where(ef => eventIds.Contains(ef.EventId)).ExecuteDeleteAsync();
            await db.Events.Where(e => sessionIds.Contains(e.SessionId)).ExecuteDeleteAsync();
            await db.Sessions.Where(s => s.CampaignId == id).ExecuteDeleteAsync();
        }

        db.Campaigns.Remove(campaign);
        await db.SaveChangesAsync();
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

        // Build a faction ID remap table so character.FactionId can be fixed up
        var factionIdMap = new Dictionary<string, string>();

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
                    BaseLegitimacy = f.BaseLegitimacy,
                    PowerModifier = f.PowerModifier,
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
                // Remap factionId if the faction was imported; null if it wasn't
                var newFactionId = c.FactionId != null && factionIdMap.TryGetValue(c.FactionId, out var mapped)
                    ? mapped : null;

                db.Characters.Add(new Character
                {
                    Id = Guid.NewGuid().ToString(),
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
                    Goals = c.Goals,
                    Fears = c.Fears,
                    Notes = c.Notes,
                    FactionId = newFactionId,
                    SocialClassId = null, // social classes are factions; null if not imported
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

        await db.SaveChangesAsync();
        return Ok(new { message = "Import complete." });
    }
}

public record ImportRequest(
    string SourceCampaignId,
    List<string>? EntityTypes,
    bool ImportAll
);
