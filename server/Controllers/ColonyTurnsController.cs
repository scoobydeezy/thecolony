using System.Security.Cryptography;
using System.Text;
using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using ColonyTracker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Controllers;

/// <summary>
/// M1: Colony Turn records (BOARD-GAME-REVIEW §17.5). One ColonyTurn per session, recorded as the session's first
/// Event (Kind ColonyTurn). Phases commit one at a time, in order, each in its own transaction, and each requires the
/// If-History-Version header so a phase computed against stale state is rejected (409).
/// M5: every Opening and Faction Phase commit is re-derived by ColonyTurnEngine from its frozen inputs and recorded dice
/// (422 on any mismatch). A Draft turn can be corrected by voiding a phase (and every later phase) and re-running it.
/// </summary>
[ApiController]
[Route("api/colony-turns")]
public class ColonyTurnsController(AppDbContext db, ICampaignContext campaign) : ControllerBase
{
    public const int ColonyTurnSortOrder = -1000;   // always first in its session

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var cid = await campaign.GetActiveIdAsync();
        return Ok(await db.ColonyTurns.Include(t => t.Phases.OrderBy(p => p.Ordinal))
            .Where(t => t.CampaignId == cid).OrderBy(t => t.CreatedAt).ToListAsync());
    }

    /// <summary>The active campaign's history version: phases are computed against it and committed with If-History-Version.</summary>
    [HttpGet("history-version")]
    public async Task<IActionResult> HistoryVersion()
    {
        var cid = await campaign.GetActiveIdAsync();
        return Ok(new { historyVersion = (await db.Campaigns.AsNoTracking().FirstAsync(c => c.Id == cid)).HistoryVersion });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var turn = await db.ColonyTurns.Include(t => t.Phases.OrderBy(p => p.Ordinal)).FirstOrDefaultAsync(t => t.Id == id);
        return turn is null ? NotFound() : Ok(turn);
    }

    // POST /api/colony-turns  { sessionId, seed, engineVersion }  → Draft turn + its ColonyTurn Event
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateColonyTurnRequest req)
    {
        var cid = await campaign.GetActiveIdAsync();
        var session = await db.Sessions.FirstOrDefaultAsync(s => s.Id == req.SessionId && s.CampaignId == cid);
        if (session is null) return BadRequest("sessionId must be a session in the active campaign.");
        if (string.IsNullOrWhiteSpace(req.EngineVersion)) return BadRequest("engineVersion is required.");
        if (await db.ColonyTurns.AnyAsync(t => t.SessionId == req.SessionId && t.Status != ColonyTurnStatus.Voided))
            return Conflict("This session already has a Colony Turn.");

        var rulesVersion = await db.RulesVersions.Where(r => r.CampaignId == cid).OrderByDescending(r => r.Version).FirstOrDefaultAsync();
        // A voided turn leaves its (now empty) Colony Turn Event; a new turn reuses it rather than adding another.
        var ev = await db.Events.FirstOrDefaultAsync(e => e.SessionId == session.Id && e.Kind == EventKind.ColonyTurn);
        if (ev is null)
        {
            ev = new Event { SessionId = session.Id, Title = $"Colony Turn before Session {session.Number}", Kind = EventKind.ColonyTurn, SortOrder = ColonyTurnSortOrder };
            db.Events.Add(ev);
        }
        var turn = new ColonyTurn { CampaignId = cid, SessionId = session.Id, EventId = ev.Id, Seed = req.Seed, EngineVersion = req.EngineVersion, RulesVersionId = rulesVersion?.Id };
        db.ColonyTurns.Add(turn);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = turn.Id }, turn);
    }

    // POST /api/colony-turns/{id}/phases   (header If-History-Version required)
    [HttpPost("{id}/phases")]
    public async Task<IActionResult> CommitPhase(string id, [FromBody] CommitPhaseRequest req)
    {
        if (!Request.Headers.ContainsKey("If-History-Version"))
            return BadRequest("If-History-Version header is required to commit a Colony Turn phase.");
        var turn = await db.ColonyTurns.Include(t => t.Phases).FirstOrDefaultAsync(t => t.Id == id);
        if (turn is null) return NotFound();
        if (turn.Status != ColonyTurnStatus.Draft) return Conflict($"Colony Turn is {turn.Status}.");

        var session = await db.Sessions.AsNoTracking().FirstAsync(s => s.Id == turn.SessionId);
        var problem = CheckPhase(turn, session, req);
        if (problem is not null) return problem;

        var cid = turn.CampaignId;
        var historyVersion = (await db.Campaigns.AsNoTracking().FirstAsync(c => c.Id == cid)).HistoryVersion;
        await using var tx = await db.Database.BeginTransactionAsync();
        var phase = await AddPhase(turn, req, historyVersion);
        if (req.Kind == ColonyTurnPhaseKind.Publish)
        {
            turn.Status = ColonyTurnStatus.Committed;
            turn.CommittedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        var now = (await db.Campaigns.AsNoTracking().FirstAsync(c => c.Id == cid)).HistoryVersion;
        return Ok(new { phase, historyVersion = now });
    }

    // POST /api/colony-turns/complete   (header If-History-Version required)
    // The whole Turn at once: creates it, verifies and writes every phase in order, adds Publish, and commits, in ONE
    // transaction. Nothing is written unless every phase reproduces. (The per-phase endpoint remains for tooling.)
    [HttpPost("complete")]
    public async Task<IActionResult> Complete([FromBody] CompleteColonyTurnRequest req)
    {
        if (!Request.Headers.ContainsKey("If-History-Version"))
            return BadRequest("If-History-Version header is required to commit a Colony Turn.");
        var cid = await campaign.GetActiveIdAsync();
        var session = await db.Sessions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == req.SessionId && s.CampaignId == cid);
        if (session is null) return BadRequest("sessionId must be a session in the active campaign.");
        if (string.IsNullOrWhiteSpace(req.EngineVersion)) return BadRequest("engineVersion is required.");
        if (req.Phases is null || req.Phases.Count == 0) return BadRequest("phases are required.");
        if (req.Phases.Any(p => p.Kind == ColonyTurnPhaseKind.Publish)) return BadRequest("Publish is added by the server.");
        if (await db.ColonyTurns.AnyAsync(t => t.SessionId == req.SessionId && t.Status != ColonyTurnStatus.Voided))
            return Conflict("This session already has a Colony Turn.");

        var historyVersion = (await db.Campaigns.AsNoTracking().FirstAsync(c => c.Id == cid)).HistoryVersion;
        await using var tx = await db.Database.BeginTransactionAsync();
        var rulesVersion = await db.RulesVersions.Where(r => r.CampaignId == cid).OrderByDescending(r => r.Version).FirstOrDefaultAsync();
        var ev = await db.Events.FirstOrDefaultAsync(e => e.SessionId == session.Id && e.Kind == EventKind.ColonyTurn);
        if (ev is null)
        {
            ev = new Event { SessionId = session.Id, Title = $"Colony Turn before Session {session.Number}", Kind = EventKind.ColonyTurn, SortOrder = ColonyTurnSortOrder };
            db.Events.Add(ev);
        }
        var turn = new ColonyTurn { CampaignId = cid, SessionId = session.Id, EventId = ev.Id, Seed = req.Seed, EngineVersion = req.EngineVersion, RulesVersionId = rulesVersion?.Id };
        db.ColonyTurns.Add(turn);
        foreach (var p in req.Phases.Append(PublishOf(req.Phases)))
        {
            var problem = CheckPhase(turn, session, p);
            if (problem is not null) return problem;   // the transaction is disposed without commit: nothing is written
            await AddPhase(turn, p, historyVersion);
        }
        turn.Status = ColonyTurnStatus.Committed;
        turn.CommittedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        var now = (await db.Campaigns.AsNoTracking().FirstAsync(c => c.Id == cid)).HistoryVersion;
        return Ok(new { turn, historyVersion = now });
    }

    private static CommitPhaseRequest PublishOf(List<CommitPhaseRequest> phases)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(new { version = "pb-1", phases = phases.Select(p => new { kind = p.Kind.ToString(), hash = p.FrozenInputsHash }) });
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(json))).ToLowerInvariant();
        return new CommitPhaseRequest(ColonyTurnPhaseKind.Publish, json, hash, "{\"published\":true}", []);
    }

    /// <summary>Order, act rules, hash, allowed origins and reproduction. Null when the phase may be written.</summary>
    private IActionResult? CheckPhase(ColonyTurn turn, Session session, CommitPhaseRequest req)
    {
        // Phase order: Opening → Faction Phase → Character Phase → Publish, in every Act (§18.6; before it, Act I had no
        // Faction Phase, and turns saved then keep their records). Voided phases do not count.
        var live = turn.Phases.Where(p => p.Status != ColonyTurnStatus.Voided).OrderBy(p => p.Ordinal).ToList();
        var last = live.LastOrDefault();
        if (last is null ? req.Kind != ColonyTurnPhaseKind.Opening : req.Kind <= last.Kind)
            return Conflict($"Phase {req.Kind} is out of order (previous: {last?.Kind.ToString() ?? "none"}).");
        if (req.Kind == ColonyTurnPhaseKind.CharacterPhase && live.All(p => p.Kind != ColonyTurnPhaseKind.FactionPhase))
            return Conflict("The Character Phase follows the Faction Phase.");
        if (req.Kind == ColonyTurnPhaseKind.Publish && live.All(p => p.Kind != ColonyTurnPhaseKind.CharacterPhase))
            return Conflict("Publish follows the Character Phase.");   // M6: every act has a Character Phase

        var hash = HashOf(req.FrozenInputsJson);
        if (!string.Equals(hash, req.FrozenInputsHash, StringComparison.OrdinalIgnoreCase))
            return UnprocessableEntity("frozenInputsHash does not match frozenInputsJson.");

        var allowed = req.Kind switch
        {
            ColonyTurnPhaseKind.Opening => new[] { EffectOrigin.Opening, EffectOrigin.MomentumResolution },
            ColonyTurnPhaseKind.FactionPhase => new[] { EffectOrigin.FactionPhase, EffectOrigin.GoalGenerator },
            ColonyTurnPhaseKind.CharacterPhase => new[] { EffectOrigin.CharacterPhase },
            _ => Array.Empty<EffectOrigin>(),
        };
        var effects = req.Effects ?? [];
        if (effects.Any(ef => !allowed.Contains(ef.Origin)))
            return UnprocessableEntity($"{req.Kind} may only write effects with origin {string.Join("/", allowed)}.");
        var mismatch = ColonyTurnEngine.Verify(req.Kind, req.FrozenInputsJson ?? "{}", req.ResultsJson ?? "{}", effects);
        if (mismatch is not null)
            return UnprocessableEntity($"{req.Kind} does not reproduce from its inputs: {mismatch}.");
        return null;
    }

    private static string HashOf(string? json) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(json ?? "{}"))).ToLowerInvariant();

    private async Task<ColonyTurnPhase> AddPhase(ColonyTurn turn, CommitPhaseRequest req, long historyVersion)
    {
        var hash = HashOf(req.FrozenInputsJson);
        var phase = new ColonyTurnPhase
        {
            ColonyTurnId = turn.Id, Ordinal = turn.Phases.Count == 0 ? 0 : turn.Phases.Max(p => p.Ordinal) + 1, Kind = req.Kind,
            FrozenInputsJson = req.FrozenInputsJson ?? "{}", FrozenInputsHash = hash, ResultsJson = req.ResultsJson ?? "{}",
            HistoryVersion = historyVersion,
        };
        db.ColonyTurnPhases.Add(phase);
        turn.Phases.Add(phase);
        var ordinal = await db.EventEffects.CountAsync(ef => ef.EventId == turn.EventId) + db.ChangeTracker.Entries<EventEffect>()
            .Count(e => e.State == EntityState.Added && e.Entity.EventId == turn.EventId);
        foreach (var ef in req.Effects ?? [])
        {
            ef.Id = Guid.NewGuid().ToString();
            ef.EventId = turn.EventId;
            ef.PhaseId = phase.Id;
            ef.Ordinal = ordinal++;
            db.EventEffects.Add(ef);
        }
        return phase;
    }

    // POST /api/colony-turns/{id}/phases/{phaseId}/void   (header If-History-Version required)
    // Voids the phase and every later phase of the same Draft turn (they froze its output) and removes their Effects.
    // Its record stays (Status Voided) for the audit trail; re-run the phase to continue.
    [HttpPost("{id}/phases/{phaseId}/void")]
    public async Task<IActionResult> VoidPhase(string id, string phaseId)
    {
        if (!Request.Headers.ContainsKey("If-History-Version")) return BadRequest("If-History-Version header is required.");
        var turn = await db.ColonyTurns.Include(t => t.Phases).FirstOrDefaultAsync(t => t.Id == id);
        if (turn is null) return NotFound();
        if (turn.Status != ColonyTurnStatus.Draft) return Conflict($"Colony Turn is {turn.Status}; a committed turn is immutable.");
        var target = turn.Phases.FirstOrDefault(p => p.Id == phaseId && p.Status != ColonyTurnStatus.Voided);
        if (target is null) return NotFound();
        await using var tx = await db.Database.BeginTransactionAsync();
        var voided = turn.Phases.Where(p => p.Status != ColonyTurnStatus.Voided && p.Ordinal >= target.Ordinal).ToList();
        var ids = voided.Select(p => p.Id).ToList();
        db.EventEffects.RemoveRange(await db.EventEffects.Where(ef => ef.PhaseId != null && ids.Contains(ef.PhaseId)).ToListAsync());
        foreach (var p in voided) p.Status = ColonyTurnStatus.Voided;
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        var now = (await db.Campaigns.AsNoTracking().FirstAsync(c => c.Id == turn.CampaignId)).HistoryVersion;
        return Ok(new { voided = ids, historyVersion = now });
    }

    // POST /api/colony-turns/{id}/void   (header If-History-Version required): the whole Draft turn, so it can be re-seeded.
    [HttpPost("{id}/void")]
    public async Task<IActionResult> VoidTurn(string id)
    {
        if (!Request.Headers.ContainsKey("If-History-Version")) return BadRequest("If-History-Version header is required.");
        var turn = await db.ColonyTurns.Include(t => t.Phases).FirstOrDefaultAsync(t => t.Id == id);
        if (turn is null) return NotFound();
        if (turn.Status != ColonyTurnStatus.Draft) return Conflict($"Colony Turn is {turn.Status}; a committed turn is immutable.");
        await using var tx = await db.Database.BeginTransactionAsync();
        var ids = turn.Phases.Select(p => p.Id).ToList();
        db.EventEffects.RemoveRange(await db.EventEffects.Where(ef => ef.PhaseId != null && ids.Contains(ef.PhaseId)).ToListAsync());
        foreach (var p in turn.Phases) p.Status = ColonyTurnStatus.Voided;
        turn.Status = ColonyTurnStatus.Voided;
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        var now = (await db.Campaigns.AsNoTracking().FirstAsync(c => c.Id == turn.CampaignId)).HistoryVersion;
        return Ok(new { historyVersion = now });
    }
}

public record CompleteColonyTurnRequest(string SessionId, long Seed, string EngineVersion, List<CommitPhaseRequest> Phases);
public record CreateColonyTurnRequest(string SessionId, long Seed, string EngineVersion);
public record CommitPhaseRequest(ColonyTurnPhaseKind Kind, string? FrozenInputsJson, string FrozenInputsHash, string? ResultsJson, List<EventEffect>? Effects);
