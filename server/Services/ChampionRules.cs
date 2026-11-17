using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Services;

/// <summary>
/// §18.8: a character champions at most one active assignment (Achieve goal or Maintain assignment) in the campaign.
/// Active = not Accomplished, Failed or Retired (Planning, Progressing and the legacy Stalled count, including while
/// Dormant, Not yet eligible or Ready to Resolve). Champion incapacity does not free an assignment.
/// Only NEW occupancy is checked: a champion that is unchanged on an unchanged active goal is accepted even if legacy data
/// already duplicates it, so unrelated edits to such records keep working.
/// </summary>
public static class ChampionRules
{
    public static bool IsActive(GoalStatus s) => s is not (GoalStatus.Accomplished or GoalStatus.Failed or GoalStatus.Retired);

    /// <summary>Null when the goal may be saved; otherwise why not. `previous` is the stored row (null when creating).</summary>
    public static async Task<string?> ConflictAsync(AppDbContext db, FactionGoal goal, FactionGoal? previous)
    {
        if (string.IsNullOrEmpty(goal.ChampionId) || !IsActive(goal.Status)) return null;
        var newlyOccupied = previous is null || previous.ChampionId != goal.ChampionId || !IsActive(previous.Status);
        if (!newlyOccupied) return null;
        var other = await db.FactionGoals.AsNoTracking()
            .Where(g => g.CampaignId == goal.CampaignId && g.Id != goal.Id && g.ChampionId == goal.ChampionId
                        && g.Status != GoalStatus.Accomplished && g.Status != GoalStatus.Failed && g.Status != GoalStatus.Retired)
            .OrderBy(g => g.Title).FirstOrDefaultAsync();
        if (other is null) return null;
        var name = (await db.Characters.AsNoTracking().FirstOrDefaultAsync(c => c.Id == goal.ChampionId))?.Name ?? goal.ChampionId;
        return $"{name} already champions \"{other.Title}\". A character champions one active goal or assignment at a time.";
    }
}
