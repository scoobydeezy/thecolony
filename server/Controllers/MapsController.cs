using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/maps")]
public class MapsController(AppDbContext db, ICampaignContext campaign, IWebHostEnvironment env, IConfiguration config) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cid = await campaign.GetActiveIdAsync();
        return Ok(await db.ColonyMaps
            .Where(m => m.CampaignId == cid)
            .OrderBy(m => m.Name)
            .ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var map = await db.ColonyMaps.FindAsync(id);
        return map is null ? NotFound() : Ok(map);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ColonyMap map)
    {
        var cid = await campaign.GetActiveIdAsync();
        map.Id = Guid.NewGuid().ToString();
        map.CampaignId = cid;
        db.ColonyMaps.Add(map);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = map.Id }, map);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] ColonyMap map)
    {
        if (id != map.Id) return BadRequest();
        map.CampaignId = await campaign.GetActiveIdAsync();
        db.Entry(map).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(map);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var map = await db.ColonyMaps.FindAsync(id);
        if (map is null) return NotFound();
        db.ColonyMaps.Remove(map);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file is null || file.Length == 0) return BadRequest("No file provided.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png" or ".webp"))
            return BadRequest("Only jpg, png, and webp images are accepted.");

        var uploadsRaw = config["UploadsPath"] ?? "../colony-uploads";
        var uploadsRoot = Path.IsPathRooted(uploadsRaw)
            ? uploadsRaw
            : Path.GetFullPath(Path.Combine(env.ContentRootPath, uploadsRaw));
        var mapsDir = Path.Combine(uploadsRoot, "maps");
        Directory.CreateDirectory(mapsDir);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(mapsDir, fileName);

        using (var stream = System.IO.File.Create(filePath))
            await file.CopyToAsync(stream);

        return Ok(new { path = $"/colony-uploads/maps/{fileName}" });
    }
}
