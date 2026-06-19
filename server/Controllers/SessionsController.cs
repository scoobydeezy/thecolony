using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

[ApiController]
[Route("api/sessions")]
public class SessionsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var sessions = await db.Sessions
            .Include(s => s.Events)
                .ThenInclude(e => e.Effects)
            .OrderBy(s => s.Number)
            .ToListAsync();
        return Ok(sessions);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var session = await db.Sessions
            .Include(s => s.Events.OrderBy(e => e.SortOrder))
                .ThenInclude(e => e.Effects)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (session is null) return NotFound();
        return Ok(session);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Session session)
    {
        session.Id = Guid.NewGuid().ToString();
        foreach (var ev in session.Events)
        {
            ev.Id = Guid.NewGuid().ToString();
            ev.SessionId = session.Id;
            foreach (var ef in ev.Effects)
            {
                ef.Id = Guid.NewGuid().ToString();
                ef.EventId = ev.Id;
            }
        }
        db.Sessions.Add(session);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = session.Id }, session);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] Session session)
    {
        if (id != session.Id) return BadRequest();

        var existing = await db.Sessions
            .Include(s => s.Events)
                .ThenInclude(e => e.Effects)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (existing is null) return NotFound();

        existing.Number = session.Number;
        existing.Title = session.Title;
        existing.Act = session.Act;
        existing.Week = session.Week;
        existing.Date = session.Date;
        existing.Summary = session.Summary;

        await db.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var session = await db.Sessions.FindAsync(id);
        if (session is null) return NotFound();
        db.Sessions.Remove(session);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] List<Session> sessions)
    {
        if (sessions is null || sessions.Count == 0) return BadRequest("No sessions provided.");

        var existingIds = await db.Sessions.Select(s => s.Id).ToHashSetAsync();
        var imported = new List<Session>();

        foreach (var session in sessions)
        {
            if (existingIds.Contains(session.Id))
                continue;

            session.Id = string.IsNullOrWhiteSpace(session.Id) ? Guid.NewGuid().ToString() : session.Id;
            foreach (var ev in session.Events)
            {
                ev.Id = string.IsNullOrWhiteSpace(ev.Id) ? Guid.NewGuid().ToString() : ev.Id;
                ev.SessionId = session.Id;
                foreach (var ef in ev.Effects)
                {
                    ef.Id = string.IsNullOrWhiteSpace(ef.Id) ? Guid.NewGuid().ToString() : ef.Id;
                    ef.EventId = ev.Id;
                }
            }
            db.Sessions.Add(session);
            imported.Add(session);
        }

        await db.SaveChangesAsync();
        return Ok(new { imported = imported.Count, skipped = sessions.Count - imported.Count });
    }
}
