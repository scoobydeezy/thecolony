using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/settings")]
public class SettingsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var settings = await db.AppSettings.Include(s => s.ActiveCampaign).FirstOrDefaultAsync();
        return settings is null ? NotFound() : Ok(settings);
    }

    [HttpPatch]
    public async Task<IActionResult> SetActiveCampaign([FromBody] SetActiveCampaignRequest request)
    {
        var campaign = await db.Campaigns.FindAsync(request.ActiveCampaignId);
        if (campaign is null) return NotFound("Campaign not found.");

        var settings = await db.AppSettings.FirstOrDefaultAsync();
        if (settings is null)
        {
            settings = new AppSettings { Id = "singleton", ActiveCampaignId = request.ActiveCampaignId };
            db.AppSettings.Add(settings);
        }
        else
        {
            settings.ActiveCampaignId = request.ActiveCampaignId;
        }

        await db.SaveChangesAsync();

        await db.Entry(settings).Reference(s => s.ActiveCampaign).LoadAsync();
        return Ok(settings);
    }
}

public record SetActiveCampaignRequest(string ActiveCampaignId);
