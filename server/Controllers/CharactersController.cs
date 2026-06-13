using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/characters")]
public class CharactersController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await db.Characters.OrderBy(c => c.Name).ToListAsync());

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var character = await db.Characters.FindAsync(id);
        return character is null ? NotFound() : Ok(character);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Character character)
    {
        character.Id = Guid.NewGuid().ToString();
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
