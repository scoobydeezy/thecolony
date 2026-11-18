using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace ColonyTracker.Api.Controllers;

// Paths are declared in their branch's file (§14); a path's id is its canonical id (path.<slug>).
[ApiController]
[Route("api/narrative/paths")]
public class NarrativePathsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? pathSetId = null)
    {
        var paths = await NarrativeBranches.PathsAsync(db, await campaign.GetActiveIdAsync());
        return Ok(paths.Where(p => pathSetId is null || p.PathSetId == pathSetId).OrderBy(p => p.PathSetId).ThenBy(p => p.SortOrder));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id) =>
        (await NarrativeBranches.PathsAsync(db, await campaign.GetActiveIdAsync())).FirstOrDefault(p => p.Id == id) is { } p ? Ok(p) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NarrativePath path)
    {
        var saved = await NarrativeBranches.AddPathAsync(db, await campaign.GetActiveIdAsync(), path);
        return CreatedAtAction(nameof(GetById), new { id = saved.Id }, saved);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] NarrativePath path)
    {
        if (id != path.Id) return BadRequest();
        return Ok(await NarrativeBranches.UpdatePathAsync(db, await campaign.GetActiveIdAsync(), id, path));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        await NarrativeBranches.RemovePathAsync(db, await campaign.GetActiveIdAsync(), id);
        return NoContent();
    }
}
