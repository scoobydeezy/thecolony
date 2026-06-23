using ColonyTracker.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Services;

public interface ICampaignContext
{
    Task<string> GetActiveIdAsync();
}

public class CampaignContext(AppDbContext db) : ICampaignContext
{
    private string? _cached;

    public async Task<string> GetActiveIdAsync()
    {
        if (_cached is not null) return _cached;
        var settings = await db.AppSettings.FirstOrDefaultAsync();
        _cached = settings?.ActiveCampaignId ?? string.Empty;
        return _cached;
    }
}
