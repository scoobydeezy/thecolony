using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/characters")]
public class CharactersController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cid = await campaign.GetActiveIdAsync();
        return Ok(await db.Characters
            .Where(c => c.CampaignId == cid)
            .OrderBy(c => c.Name)
            .ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var character = await db.Characters.FindAsync(id);
        return character is null ? NotFound() : Ok(character);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Character character)
    {
        var cid = await campaign.GetActiveIdAsync();
        character.Id = Guid.NewGuid().ToString();
        character.CampaignId = cid;
        db.Characters.Add(character);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = character.Id }, character);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] Character character)
    {
        if (id != character.Id) return BadRequest();
        db.Entry(character).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(character);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var character = await db.Characters.FindAsync(id);
        if (character is null) return NotFound();
        db.Characters.Remove(character);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
