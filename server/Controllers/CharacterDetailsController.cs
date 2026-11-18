using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services.Canon;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

// Detail sections are "## Heading" blocks in the character's canonical file (ADVENTURE-BOOK-PLAN.md §9).
// Id = "<characterId>~<section key>"; Public = wrapped in :::player-facing; Revealed is play state,
// kept in the database (CharacterSectionReveal). Same API shape as before the switch.
[ApiController]
[Route("api/characters/{characterId}/details")]
public class CharacterDetailsController(AppDbContext db, CanonStore canon) : ControllerBase
{
    private async Task<(string CanonId, string Kind)?> LinkAsync(string characterId)
    {
        var canonId = await db.Characters.AsNoTracking().Where(c => c.Id == characterId).Select(c => c.CanonId).FirstOrDefaultAsync();
        return canonId is not null && canon.TryGet(canonId, out var e) ? (canonId, e.Kind) : null;
    }

    private async Task<HashSet<string>> RevealedAsync(string characterId) =>
        (await db.CharacterSectionReveals.AsNoTracking().Where(r => r.CharacterId == characterId).Select(r => r.SectionKey).ToListAsync()).ToHashSet();

    private async Task<List<CharacterDetail>> CurrentAsync(string characterId, string canonId) =>
        canon.TryGet(canonId, out var e) ? CanonSections.ToDetails(characterId, e.Model!.Sections, await RevealedAsync(characterId)) : [];

    private async Task SetRevealedAsync(string characterId, string key, bool revealed, string? oldKey = null)
    {
        var rows = await db.CharacterSectionReveals.Where(r => r.CharacterId == characterId && (r.SectionKey == key || r.SectionKey == oldKey)).ToListAsync();
        db.CharacterSectionReveals.RemoveRange(rows);
        if (revealed) db.CharacterSectionReveals.Add(new CharacterSectionReveal { CharacterId = characterId, SectionKey = key });
        await db.SaveChangesAsync();
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(string characterId) =>
        await LinkAsync(characterId) is { } link ? Ok(await CurrentAsync(characterId, link.CanonId)) : Ok(Array.Empty<CharacterDetail>());

    [HttpPost]
    public async Task<IActionResult> Create(string characterId, [FromBody] CharacterDetail detail)
    {
        if (await LinkAsync(characterId) is not { } link) return NotFound();
        if (string.IsNullOrWhiteSpace(detail.Heading)) return BadRequest("A section needs a heading.");
        var section = CanonSections.Section(detail.Heading, detail.Body, CanonSections.AudienceOf(detail.Visibility));
        canon.Write(link.CanonId, link.Kind, doc =>
        {
            if (doc.Sections.Any(s => s.Key == section.Key)) throw new CanonConflictException($"{link.CanonId} already has a section \"{section.Heading}\".");
            doc.Sections.Add(section);
        }, expectedVersion: null);
        await SetRevealedAsync(characterId, section.Key, detail.Visibility == NarrativeVisibility.Revealed);
        return Ok((await CurrentAsync(characterId, link.CanonId)).First(d => d.Key == section.Key));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string characterId, string id, [FromBody] CharacterDetail detail)
    {
        if (id != detail.Id) return BadRequest();
        if (await LinkAsync(characterId) is not { } link) return NotFound();
        var oldKey = CanonSections.KeyOfDetailId(id);
        var section = CanonSections.Section(detail.Heading, detail.Body, CanonSections.AudienceOf(detail.Visibility));
        var found = false;
        canon.Write(link.CanonId, link.Kind, doc =>
        {
            var i = doc.Sections.FindIndex(s => s.Key == oldKey && !CanonSections.IsProfile(s));
            if (i < 0) return;
            if (section.Key != oldKey && doc.Sections.Any(s => s.Key == section.Key)) throw new CanonConflictException($"{link.CanonId} already has a section \"{section.Heading}\".");
            doc.Sections[i] = section;
            found = true;
        }, expectedVersion: null);
        if (!found) return NotFound();
        await SetRevealedAsync(characterId, section.Key, detail.Visibility == NarrativeVisibility.Revealed, oldKey);
        return Ok((await CurrentAsync(characterId, link.CanonId)).First(d => d.Key == section.Key));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string characterId, string id)
    {
        if (await LinkAsync(characterId) is not { } link) return NotFound();
        var key = CanonSections.KeyOfDetailId(id);
        var removed = 0;
        canon.Write(link.CanonId, link.Kind, doc => removed = doc.Sections.RemoveAll(s => s.Key == key && !CanonSections.IsProfile(s)), expectedVersion: null);
        if (removed == 0) return NotFound();
        await SetRevealedAsync(characterId, key, revealed: false);
        return NoContent();
    }

    [HttpPatch("reorder")]
    public async Task<IActionResult> Reorder(string characterId, [FromBody] List<string> orderedIds)
    {
        if (await LinkAsync(characterId) is not { } link) return NotFound();
        var order = orderedIds.Select(CanonSections.KeyOfDetailId).Select((k, i) => (k, i)).ToDictionary(x => x.k, x => x.i);
        canon.Write(link.CanonId, link.Kind, doc =>
        {
            var profile = doc.Sections.Where(CanonSections.IsProfile).ToList();
            var details = doc.Sections.Where(s => !CanonSections.IsProfile(s))
                .Select((s, i) => (s, i)).OrderBy(x => order.TryGetValue(x.s.Key, out var r) ? r : int.MaxValue).ThenBy(x => x.i).Select(x => x.s).ToList();
            doc.Sections.Clear();
            doc.Sections.AddRange(profile);
            doc.Sections.AddRange(details);
        }, expectedVersion: null);
        return Ok();
    }
}
