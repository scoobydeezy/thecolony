using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services.Canon;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

// A character's narrative profile is a set of fixed "## Heading" sections in its canonical file
// (ADVENTURE-BOOK-PLAN.md §9). Same API shape as before the switch.
[ApiController]
[Route("api/characters/{characterId}/narrative-profile")]
public class CharacterNarrativeProfileController(AppDbContext db, CanonStore canon) : ControllerBase
{
    private async Task<(string? CanonId, string Kind)?> LinkAsync(string characterId) =>
        await db.Characters.AsNoTracking().Where(c => c.Id == characterId).Select(c => new { c.CanonId }).FirstOrDefaultAsync() is { } l
            ? (l.CanonId, canon.TryGet(l.CanonId, out var e) ? e.Kind : "npc") : null;

    [HttpGet]
    public async Task<IActionResult> Get(string characterId)
    {
        var link = await LinkAsync(characterId);
        if (link is null || !canon.TryGet(link.Value.CanonId, out var entry)) return NotFound();
        var profile = CanonSections.ToProfile(characterId, entry.Model!.Sections);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpPut]
    public async Task<IActionResult> Upsert(string characterId, [FromBody] CharacterNarrativeProfile profile)
    {
        var link = await LinkAsync(characterId);
        if (link is null || link.Value.CanonId is null || !canon.TryGet(link.Value.CanonId, out _)) return NotFound();
        profile.CharacterId = characterId;
        canon.Write(link.Value.CanonId, link.Value.Kind, doc => CanonSections.ApplyProfile(doc, profile), expectedVersion: null);
        return Ok(profile);
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(string characterId)
    {
        var link = await LinkAsync(characterId);
        if (link is null || !canon.TryGet(link.Value.CanonId, out var entry) || CanonSections.ToProfile(characterId, entry.Model!.Sections) is null) return NotFound();
        canon.Write(link.Value.CanonId!, link.Value.Kind, doc => CanonSections.ApplyProfile(doc, null), expectedVersion: null);
        return NoContent();
    }
}
