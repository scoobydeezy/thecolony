using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services.Canon;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

// The book's in-browser editor (ADVENTURE-BOOK-PLAN.md §16): read, save, create and delete whole content
// files. Every edit, wherever it is made, lands in the one source file the book and the app both read,
// so they can't drift. Saves get the app's guarantees (schema, version check, atomic write); deleting
// an entry the app tracks goes through its rows, as an app delete does, so references are flagged, never
// rewritten.
[ApiController]
[Route("api/content")]
public class ContentController(AppDbContext db, CanonStore canon) : ControllerBase
{
    public sealed record SaveRequest(string Path, string Text, string? Version, bool Create = false);
    public sealed record NewRequest(string Type, string Name, string? Dir = null);

    [HttpGet("file")]
    public IActionResult Get([FromQuery] string path) => Ok(canon.ReadFile(path));

    [HttpPut("file")]
    public IActionResult Save([FromBody] SaveRequest r) => Ok(canon.WriteFile(r.Path, r.Text, r.Version, r.Create));

    // A starting text for a new entry or page (id allocated from the name, as the app does). Nothing is
    // written until it is saved with create = true.
    [HttpPost("new")]
    public IActionResult New([FromBody] NewRequest r)
    {
        var (path, text) = canon.NewFile(r.Type, r.Name, r.Dir);
        return Ok(new { path, text });
    }

    [HttpDelete("file")]
    public async Task<IActionResult> Delete([FromQuery] string path, [FromQuery] string? version)
    {
        var file = canon.ReadFile(path);
        if (version is not null && file.Version != version)
            throw new CanonConflictException($"{file.Path} was changed elsewhere since it was opened. Reload it and try again.");
        // An entry the app tracks: remove its rows in every campaign; the file goes with the last one.
        if (file.Id is { } id && CanonStore.Kinds.ContainsKey(file.Type) && await RemoveRowsAsync(file.Type, id) > 0)
        {
            await db.SaveChangesAsync();
            return NoContent();
        }
        canon.DeleteFile(file.Path, file.Version);
        return NoContent();
    }

    private async Task<int> RemoveRowsAsync(string type, string id)
    {
        async Task<int> Remove<T>(IQueryable<T> rows) where T : class
        {
            var list = await rows.ToListAsync();
            db.RemoveRange(list);
            return list.Count;
        }
        switch (type)
        {
            case "npc" or "pc": return await Remove(db.Characters.Where(x => x.CanonId == id));
            case "faction": return await Remove(db.Factions.Where(x => x.CanonId == id));
            case "asset": return await Remove(db.Assets.Where(x => x.CanonId == id));
            case "location": return await Remove(db.Locations.Where(x => x.CanonId == id));
            case "goal": return await Remove(db.FactionGoals.Where(x => x.CanonId == id));
            case "condition": return await Remove(db.WorldConditions.Where(x => x.CanonId == id));
            case "branch": return await Remove(db.PathSets.Where(x => x.CanonId == id));
            case "thread":
            {
                var rows = await db.NarrativeThreads.Where(x => x.CanonId == id).Select(x => x.Id).ToListAsync();
                db.NarrativeEntityLinks.RemoveRange(db.NarrativeEntityLinks.Where(l => l.OwnerType == NarrativeOwnerType.Thread && rows.Contains(l.OwnerId)));
                return await Remove(db.NarrativeThreads.Where(x => x.CanonId == id));
            }
            case "event" or "encounter":
            {
                var rows = await db.NarrativeEvents.Where(x => x.CanonId == id).Select(x => x.Id).ToListAsync();
                db.NarrativeEntityLinks.RemoveRange(db.NarrativeEntityLinks.Where(l => l.OwnerType == NarrativeOwnerType.Event && rows.Contains(l.OwnerId)));
                return await Remove(db.NarrativeEvents.Where(x => x.CanonId == id));
            }
            default: return 0;
        }
    }
}
