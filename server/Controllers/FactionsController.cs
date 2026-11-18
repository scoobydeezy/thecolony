using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/factions")]
public class FactionsController(AppDbContext db, ICampaignContext campaign, IWebHostEnvironment env, IConfiguration config) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cid = await campaign.GetActiveIdAsync();
        // Name is file-backed (ADVENTURE-BOOK-PLAN.md §10), so sort after loading.
        var factions = await db.Factions.Where(f => f.CampaignId == cid).ToListAsync();
        return Ok(factions.OrderBy(f => f.SortOrder).ThenBy(f => f.Name, StringComparer.CurrentCulture).ToList());
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var faction = await db.Factions.FindAsync(id);
        return faction is null ? NotFound() : Ok(faction);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Faction faction)
    {
        var cid = await campaign.GetActiveIdAsync();
        faction.Id = await EntityIds.ForCreateAsync(db.Factions, faction.Id);   // keep an imported id when it is free
        faction.CanonId = null;   // a new entity gets a new canonical file
        faction.CampaignId = cid;
        if (faction.MomentumTier is < -2 or > 2) return BadRequest("momentumTier must be between -2 and +2.");
        if (faction.SortOrder == 0)
            faction.SortOrder = (await db.Factions.Where(f => f.CampaignId == cid).MaxAsync(f => (int?)f.SortOrder) ?? 0) + 1;
        db.Factions.Add(faction);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = faction.Id }, faction);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] Faction faction)
    {
        if (id != faction.Id) return BadRequest();
        // The link to the faction's file is the server's, never the request's (ADVENTURE-BOOK-PLAN.md §10).
        var link = await db.Factions.AsNoTracking().Where(x => x.Id == id).Select(x => new { x.CanonId }).FirstOrDefaultAsync();
        if (link is null) return NotFound();
        faction.CanonId = link.CanonId;
        if (faction.MomentumTier is < -2 or > 2) return BadRequest("momentumTier must be between -2 and +2.");
        var cid = await campaign.GetActiveIdAsync();
        faction.CampaignId = cid;
        db.Entry(faction).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(faction);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var faction = await db.Factions.FindAsync(id);
        if (faction is null) return NotFound();
        db.Factions.Remove(faction);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("reorder")]
    public async Task<IActionResult> Reorder([FromBody] List<string> orderedIds)
    {
        var factions = await db.Factions.Where(f => orderedIds.Contains(f.Id)).ToListAsync();
        for (int i = 0; i < orderedIds.Count; i++)
        {
            var f = factions.FirstOrDefault(x => x.Id == orderedIds[i]);
            if (f is not null) f.SortOrder = i;
        }
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/upload-glyph")]
    public async Task<IActionResult> UploadGlyph(string id, IFormFile file)
        => await UploadImage(id, file, "glyph");

    [HttpPost("{id}/upload-icon")]
    public async Task<IActionResult> UploadIcon(string id, IFormFile file)
        => await UploadImage(id, file, "icon");

    private async Task<IActionResult> UploadImage(string id, IFormFile? file, string kind)
    {
        if (file is null || file.Length == 0) return BadRequest("No file provided");
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png" or ".svg"))
            return BadRequest("Only .jpg, .png, and .svg files are accepted");

        var faction = await db.Factions.FindAsync(id);
        if (faction is null) return NotFound();

        var uploadsRaw = config["UploadsPath"] ?? "../colony-uploads";
        var uploadsRoot = Path.IsPathRooted(uploadsRaw)
            ? uploadsRaw
            : Path.GetFullPath(Path.Combine(env.ContentRootPath, uploadsRaw));
        var uploadsDir = Path.Combine(uploadsRoot, "factions");
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{id}-{kind}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);
        await using var stream = System.IO.File.Create(filePath);
        await file.CopyToAsync(stream);

        var urlPath = $"/colony-uploads/factions/{fileName}";
        if (kind == "glyph") faction.GlyphPath = urlPath;
        else faction.IconPath = urlPath;

        db.Entry(faction).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return Ok(new { path = urlPath });
    }
}
