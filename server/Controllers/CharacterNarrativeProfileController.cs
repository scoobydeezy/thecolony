using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/characters/{characterId}/narrative-profile")]
public class CharacterNarrativeProfileController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(string characterId)
    {
        var profile = await db.CharacterNarrativeProfiles.FindAsync(characterId);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPut]
    public async Task<IActionResult> Upsert(string characterId, [FromBody] CharacterNarrativeProfile profile)
    {
        profile.CharacterId = characterId;
        var exists = await db.CharacterNarrativeProfiles.AnyAsync(p => p.CharacterId == characterId);
        if (exists)
            db.Entry(profile).State = EntityState.Modified;
        else
            db.CharacterNarrativeProfiles.Add(profile);
        await db.SaveChangesAsync();
        return Ok(profile);
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(string characterId)
    {
        var profile = await db.CharacterNarrativeProfiles.FindAsync(characterId);
        if (profile is null) return NotFound();
        db.CharacterNarrativeProfiles.Remove(profile);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
