using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/characters")]
public class CharactersController(AppDbContext db, ICampaignContext campaign, IWebHostEnvironment env) : ControllerBase
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
        character.CampaignId = await campaign.GetActiveIdAsync();
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

    [HttpPost("{id}/upload-portrait")]
    public async Task<IActionResult> UploadPortrait(string id, IFormFile file)
    {
        if (file is null || file.Length == 0) return BadRequest("No file provided");
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png"))
            return BadRequest("Only .jpg and .png files are accepted");

        var character = await db.Characters.FindAsync(id);
        if (character is null) return NotFound();

        var uploadsDir = Path.Combine(env.ContentRootPath, "uploads", "characters");
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{id}-portrait{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);
        await using var stream = System.IO.File.Create(filePath);
        await file.CopyToAsync(stream);

        var urlPath = $"/uploads/characters/{fileName}";
        character.PortraitPath = urlPath;
        db.Entry(character).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(new { path = urlPath });
    }
}
