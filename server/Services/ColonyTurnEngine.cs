using System.Text.Json;
using ColonyTracker.Api.Models;

namespace ColonyTracker.Api.Services;

/// <summary>
/// M5 server verifier for Colony Turn phases. A faithful port of client core/sim/prng.ts, faction-phase.ts, opening.ts
/// and momentum.ts: it re-derives a phase's results and Effects from its frozen inputs (and the recorded dice) and
/// rejects a commit that does not match. Keep the two in step; the shared vectors in server.Tests pin them together.
/// </summary>
public static class ColonyTurnEngine
{
    public const string FactionPhaseVersion = "fp-5";   // fp-2: GM-accepted resolutions (§18.5). fp-3: milestone state (§18.9). fp-4: advance Effects (§18.11). fp-5: Priority as a roll bonus; guards share Power (§18.12)
    public const string OpeningVersion = "op-4";   // op-4: Defection Checks moved to the Character Phase (§18.4); op-3: no unattended outcomes
    public const string CharacterPhaseVersion = "cp-2";   // cp-2: Defection Checks first (§18.4)

    // ---------- seeded randomness ----------
    public sealed class Mulberry32(uint seed)
    {
        private uint _a = seed;
        public uint Next()
        {
            unchecked
            {
                _a += 0x6D2B79F5;
                uint t = (_a ^ (_a >> 15)) * (1u | _a);
                t = (t + ((t ^ (t >> 7)) * (61u | t))) ^ t;
                return t ^ (t >> 14);
            }
        }
        public int Int(int n) => (int)(Next() % (uint)n);
    }

    public static Mulberry32 AllocationStream(uint seed) => new(seed);
    public static Mulberry32 DiceStream(uint seed) => new(seed ^ 0x9E3779B9);
    public static Mulberry32 DefectionDiceStream(uint seed) => new(seed ^ 0xC2B2AE35);   // the Character Phase's Defection Checks (formerly the Opening's)
    public static Mulberry32 CharacterDiceStream(uint seed) => new(seed ^ 0x85EBCA6B);

    public static void Shuffle<T>(IList<T> items, Mulberry32 rng)
    {
        for (int i = items.Count - 1; i > 0; i--)
        {
            int j = rng.Int(i + 1);
            (items[i], items[j]) = (items[j], items[i]);
        }
    }

    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    // ---------- Faction Phase ----------
    public record FpFaction(string Id, string Name, int Power, int Momentum);
    public record FpGoal(string Id, string FactionId, string Title, string Priority, string Status, string OutcomeMode,
                         string? TargetEntityType, string? TargetEntityId, string? TargetState, string? TargetOwnerFactionId,
                         List<AdvanceFx>? OnProgressing = null,    // §18.11: written at Planning → Progressing
                         List<AdvanceFx>? OnAccomplished = null);  // §18.11: written at Accomplished, after the target
    /// <summary>§18.11: an Effect a goal names for its advance (ordinary vocabulary), credited to the goal's faction.</summary>
    public record AdvanceFx(string TargetType, string TargetId, string Property, double Delta, string? Value);
    /// <summary>§18.12: an active Maintain assignment threatened by a known goal this Turn: it competes for Power.</summary>
    public record FpGuard(string Id, string FactionId, string Title, string Priority, string TargetEntityId);
    public record FpInputs(string Version, uint Seed, int Target, Dictionary<string, int> PriorityBonus, List<FpFaction> Factions, List<FpGoal> Goals,
                           List<FpGuard>? Guards = null);
    public record FpAllocation(string FactionId, string GoalId, int Attempts);
    public record FpAttempt(string Id, string FactionId, string GoalId, int Index, int D1, int D2, int Natural, int Priority, int Modifier, int Defense,
                            string? GuardId, int Total, int Dc, string Degree, int Signal, string Source);
    public record FpGoalResult(string GoalId, string FactionId, int Allocated, int Rolled, bool Succeeded, string Outcome, int? Margin, bool Preempted);
    public record FpResults(string Version, string DiceSource, List<FpAllocation> Allocations, List<FpAttempt> Attempts, List<FpGoalResult> Goals,
                            List<string>? Accepted = null, List<string>? Guarding = null);

    /// <summary>§18.12 seeded draw: per faction (ordinal), a bag of one token per eligible goal and per guard; Power-many drawn.
    /// Returns the drawn goals (draw order; one attempt each) and the posted guards (ordinal order).</summary>
    public static (List<FpAllocation> Allocations, List<string> Guarding) Allocate(FpInputs inp)
    {
        var rng = AllocationStream(inp.Seed);
        var guards = (inp.Guards ?? []).Select(g => g.Id).ToHashSet();
        var allocations = new List<FpAllocation>(); var guarding = new List<string>();
        foreach (var f in inp.Factions.OrderBy(f => f.Id, StringComparer.Ordinal))
        {
            var bag = inp.Goals.Where(g => g.FactionId == f.Id).Select(g => g.Id)
                .Concat((inp.Guards ?? []).Where(g => g.FactionId == f.Id).Select(g => g.Id))
                .OrderBy(id => id, StringComparer.Ordinal).ToList();
            Shuffle(bag, rng);
            foreach (var id in bag.Take(Math.Max(0, f.Power)))
                if (guards.Contains(id)) guarding.Add(id); else allocations.Add(new FpAllocation(f.Id, id, 1));
        }
        return (allocations, guarding.OrderBy(x => x, StringComparer.Ordinal).ToList());
    }

    /// <summary>The best posted guard of another faction on the goal's target (highest Priority bonus, then ordinal id).</summary>
    public static FpGuard? GuardAgainst(FpInputs inp, List<string> guarding, FpGoal g)
    {
        if (g.TargetEntityId is null) return null;
        var posted = guarding.ToHashSet();
        return (inp.Guards ?? []).Where(x => posted.Contains(x.Id) && x.FactionId != g.FactionId && x.TargetEntityId == g.TargetEntityId)
            .OrderByDescending(x => inp.PriorityBonus.GetValueOrDefault(x.Priority)).ThenBy(x => x.Id, StringComparer.Ordinal).FirstOrDefault();
    }

    public static string DegreeOf(int natural, int total, int target) =>
        natural == 12 ? "CriticalSuccess" : natural == 2 ? "CriticalFailure" : total >= target ? "Success" : "Failure";

    /// <summary>Re-run the Faction Phase with the recorded dice. Returns the derived results, or an error.</summary>
    public static (FpResults? Results, string? Error) ReplayFactionPhase(FpInputs inp, FpResults recorded)
    {
        var (allocations, guarding) = Allocate(inp);
        var dice = DiceStream(inp.Seed);
        var fac = inp.Factions.ToDictionary(f => f.Id); var goal = inp.Goals.ToDictionary(g => g.Id);
        var rec = recorded.Attempts.ToDictionary(a => a.Id);
        var attempts = new List<FpAttempt>(); var goals = new List<FpGoalResult>();
        foreach (var a in allocations)
        {
            var g = goal[a.GoalId]; var f = fac[a.FactionId];
            var id = $"{g.Id}#0";
            int appD1 = 1 + dice.Int(6), appD2 = 1 + dice.Int(6);   // the stream always advances
            if (!rec.TryGetValue(id, out var r)) return (null, $"attempt {id} is missing");
            if (r.D1 is < 1 or > 6 || r.D2 is < 1 or > 6) return (null, $"attempt {id} has impossible dice");
            if (r.Source == "app" && (r.D1 != appD1 || r.D2 != appD2)) return (null, $"attempt {id} claims app dice that the seed does not produce");
            var guard = GuardAgainst(inp, guarding, g);
            int priority = inp.PriorityBonus.GetValueOrDefault(g.Priority), defense = guard is null ? 0 : inp.PriorityBonus.GetValueOrDefault(guard.Priority);
            int natural = r.D1 + r.D2, total = natural + priority + f.Momentum, dc = inp.Target + defense;
            var degree = DegreeOf(natural, total, dc);
            bool ok = degree is "Success" or "CriticalSuccess";
            attempts.Add(new FpAttempt(id, f.Id, g.Id, 0, r.D1, r.D2, natural, priority, f.Momentum, defense, guard?.Id, total, dc, degree,
                degree == "CriticalSuccess" ? 1 : degree == "CriticalFailure" ? -1 : 0, r.Source));
            int? margin = ok ? total - dc : null; int rolled = 1;
            var outcome = !ok ? "None" : g.Status == "Plotting" ? "Progressing" : g.OutcomeMode == "Adjudicated" ? "ReadyToResolve" : "Accomplished";
            goals.Add(new FpGoalResult(g.Id, f.Id, a.Attempts, rolled, ok, outcome, margin, false));
        }
        if (attempts.Count != recorded.Attempts.Count) return (null, "the recorded attempts do not match the allocation");
        Collide(inp, goals, attempts);
        // §18.5: the GM may accept a goal only if the dice made it Ready to Resolve
        var accepted = recorded.Accepted ?? [];
        var ready = goals.Where(r => r.Outcome == "ReadyToResolve").Select(r => r.GoalId).ToHashSet();
        if (accepted.Any(id => !ready.Contains(id))) return (null, "an accepted goal is not Ready to Resolve");
        if (!accepted.SequenceEqual(accepted.Distinct().OrderBy(x => x, StringComparer.Ordinal))) return (null, "accepted goals must be distinct and in ordinal order");
        return (new FpResults(FactionPhaseVersion, recorded.DiceSource, allocations, attempts, goals, accepted, guarding), null);
    }

    private static void Collide(FpInputs inp, List<FpGoalResult> goals, List<FpAttempt> attempts)
    {
        var goal = inp.Goals.ToDictionary(g => g.Id);
        int First(string gid) => attempts.FindIndex(a => a.GoalId == gid);
        string Wants(FpGoalResult r) { var g = goal[r.GoalId]; return $"{g.TargetOwnerFactionId ?? ""}|{g.TargetState ?? ""}"; }
        var byTarget = goals.Where(r => r.Outcome == "Accomplished" && goal[r.GoalId].TargetEntityId is not null)
            .GroupBy(r => goal[r.GoalId].TargetEntityId!);
        foreach (var grp in byTarget)
        {
            var list = grp.ToList();
            if (list.Select(Wants).Distinct().Count() < 2) continue;
            list.Sort((a, b) => b.Margin!.Value != a.Margin!.Value ? b.Margin!.Value - a.Margin!.Value : First(a.GoalId) - First(b.GoalId));
            var winner = Wants(list[0]);
            foreach (var r in list.Skip(1).Where(r => Wants(r) != winner))
                goals[goals.IndexOf(r)] = r with { Outcome = "None", Preempted = true };
        }
    }

    public record Fx(string TargetType, string TargetId, string Property, double Delta, string? Value, string? SecondaryTargetId,
                     string? ActorFactionId, EffectOrigin Origin);

    public static List<Fx> FactionPhaseEffects(FpInputs inp, FpResults res)
    {
        var goal = inp.Goals.ToDictionary(g => g.Id); var outp = new List<Fx>();
        foreach (var r in res.Goals)
        {
            var g = goal[r.GoalId];
            if (r.Outcome == "Progressing")
            {
                foreach (var e in g.OnProgressing ?? []) outp.Add(Advance(e, g.FactionId));
                outp.Add(new Fx("goal", g.Id, "status", 0, "Progressing", null, null, EffectOrigin.FactionPhase));
            }
            var accepted = r.Outcome == "ReadyToResolve" && (res.Accepted ?? []).Contains(g.Id);
            if (r.Outcome == "ReadyToResolve" && !accepted) outp.Add(new Fx("goal", g.Id, "readyToResolve", 0, "Ready", null, null, EffectOrigin.FactionPhase));
            if (r.Outcome == "Accomplished" || accepted)
            {
                bool machine = g.TargetEntityId is not null && (g.TargetEntityType == "Character" ? g.TargetState is not null
                    : g.TargetEntityType == "Asset" && (g.TargetOwnerFactionId ?? g.TargetState) is not null);
                if (machine) outp.Add(TargetEffect(g.TargetEntityType, g.TargetEntityId!, g.TargetState, g.TargetOwnerFactionId, g.FactionId, EffectOrigin.GoalGenerator));
                foreach (var e in g.OnAccomplished ?? []) outp.Add(Advance(e, g.FactionId));
                outp.Add(new Fx("goal", g.Id, "status", 0, "Accomplished", null, null, EffectOrigin.FactionPhase));
            }
        }
        foreach (var a in res.Attempts.Where(a => a.Signal != 0))
            outp.Add(new Fx("faction", a.FactionId, "momentumSignal", a.Signal,
                $"{(a.Signal > 0 ? "Critical Success" : "Critical Failure")} ({a.D1}+{a.D2}) on {goal[a.GoalId].Title}", a.Id, null, EffectOrigin.FactionPhase));
        return outp;
    }

    private static Fx Advance(AdvanceFx e, string actor) =>
        new(e.TargetType, e.TargetId, e.Property, e.Delta, e.Value, null, actor, EffectOrigin.GoalGenerator);

    private static Fx TargetEffect(string? type, string id, string? state, string? owner, string actor, EffectOrigin origin) =>
        type == "Character" ? new Fx("character", id, "state", 0, state, null, actor, origin)
        : owner is not null ? new Fx("asset", id, "controllingFactionId", 0, owner, null, actor, origin)
        : new Fx("asset", id, "status", 0, state, null, actor, origin);

    // ---------- Opening ----------
    public record Signal(string FactionId, int Sign, string Rule, string RootCauseId, string SourceSessionId, string Reason);
    public record OpCheck(string CharacterId, string Name, string FactionId, string Label, int Modifier, bool IsLeader);
    public record OpInputs(string Version, uint Seed, Dictionary<string, int> Tiers, List<Signal> Pending);
    public record OpCheckResult(string CharacterId, string FactionId, int D1, int D2, int Total, bool Left, string Source);

    /// <summary>Re-run the Character Phase's Defection Checks with the recorded dice.</summary>
    public static (List<OpCheckResult>? Checks, string? Error) ReplayChecks(uint seed, int target, List<OpCheck> inputs, List<OpCheckResult> recorded)
    {
        var dice = DefectionDiceStream(seed);
        var rec = recorded.ToDictionary(c => c.CharacterId);
        var outp = new List<OpCheckResult>();
        foreach (var c in inputs.OrderBy(c => c.CharacterId, StringComparer.Ordinal))
        {
            int a1 = 1 + dice.Int(6), a2 = 1 + dice.Int(6);
            if (!rec.TryGetValue(c.CharacterId, out var r)) return (null, $"Defection Check {c.CharacterId} is missing");
            if (r.D1 is < 1 or > 6 || r.D2 is < 1 or > 6) return (null, $"Defection Check {c.CharacterId} has impossible dice");
            if (r.Source == "app" && (r.D1 != a1 || r.D2 != a2)) return (null, $"Defection Check {c.CharacterId} claims app dice that the seed does not produce");
            int total = r.D1 + r.D2 + c.Modifier;
            outp.Add(new OpCheckResult(c.CharacterId, c.FactionId, r.D1, r.D2, total, total >= target, r.Source));
        }
        if (outp.Count != recorded.Count) return (null, "the recorded Defection Checks do not match the Compromised characters");
        return (outp, null);
    }

    /// <summary>Dedupe per (faction, root, sign); net; cap ±1; clamp ±2. Returns (from, to, reasons) per faction with signals.</summary>
    public static List<(string FactionId, int From, int To, List<Signal> Signals)> ResolveMomentum(Dictionary<string, int> tiers, List<Signal> pending)
    {
        var seen = new HashSet<string>(); var by = new Dictionary<string, List<Signal>>();
        foreach (var s in pending)
            if (seen.Add($"{s.FactionId}|{s.RootCauseId}|{s.Sign}"))
                (by.TryGetValue(s.FactionId, out var l) ? l : by[s.FactionId] = []).Add(s);
        var outp = new List<(string, int, int, List<Signal>)>();
        foreach (var f in by.Keys.OrderBy(k => k, StringComparer.Ordinal))
        {
            int net = by[f].Sum(s => s.Sign), applied = Math.Clamp(net, -1, 1), from = tiers.GetValueOrDefault(f);
            outp.Add((f, from, Math.Clamp(from + applied, -2, 2), by[f]));
        }
        return outp;
    }

    public static List<Fx> OpeningEffects(OpInputs inp)
    {
        var outp = new List<Fx> { new("colony", "colony", "opening", 0, "resolved", null, null, EffectOrigin.Opening) };
        foreach (var (f, from, to, sigs) in ResolveMomentum(inp.Tiers, inp.Pending))
            if (to != from)
                outp.Add(new Fx("faction", f, "momentumTier", to - from,
                    string.Join("; ", sigs.Select(s => $"{(s.Sign > 0 ? "+1" : "−1")} {s.Reason}")), null, null, EffectOrigin.MomentumResolution));
        return outp;
    }

    // ---------- Character Phase ----------
    public record CpCharacter(string Id, string Name, string FactionId, string Instability, double Drift, bool Exempt, bool Reaffirmed);
    public record CpInputs(string Version, uint Seed, int Target, double WaveringAt, double BreakingAt, Dictionary<string, int> BandModifiers,
                           int DefectionTarget, List<OpCheck> Checks, List<string> Factions, List<CpCharacter> Characters);
    public record CpRoll(string CharacterId, string FactionId, double Drift, string Band, int Modifier, int D1, int D2, int Total, bool Success,
                         string From, string To, string Source);
    public record CpSkip(string FactionId, string Reason);
    public record CpResults(string Version, List<OpCheckResult> Checks, List<string> Settled, List<CpRoll> Rolls, List<CpSkip> Skipped);

    public static string BandOf(double drift, double wavering, double breaking) =>
        drift <= 0 ? "Steady" : drift < wavering ? "Strained" : drift < breaking ? "Wavering" : "Breaking";

    public static (CpResults? Results, string? Error) ReplayCharacterPhase(CpInputs inp, CpResults recorded)
    {
        var (checks, checkErr) = ReplayChecks(inp.Seed, inp.DefectionTarget, inp.Checks ?? [], recorded.Checks ?? []);
        if (checkErr is not null) return (null, checkErr);
        var consumed = checks!.Select(c => c.FactionId).ToHashSet();
        string Band(CpCharacter c) => BandOf(c.Drift, inp.WaveringAt, inp.BreakingAt);
        var chars = inp.Characters.OrderBy(c => c.Id, StringComparer.Ordinal).ToList();
        var settled = chars.Where(c => c.Instability == "Conflicted" && Band(c) == "Steady").Select(c => c.Id).ToList();
        var settledSet = settled.ToHashSet();
        string State(CpCharacter c) => settledSet.Contains(c.Id) ? "Stable" : c.Instability;
        var dice = CharacterDiceStream(inp.Seed);
        var rec = recorded.Rolls.ToDictionary(r => r.CharacterId);
        var rolls = new List<CpRoll>(); var skipped = new List<CpSkip>();
        foreach (var f in inp.Factions.OrderBy(x => x, StringComparer.Ordinal))
        {
            if (consumed.Contains(f)) { skipped.Add(new CpSkip(f, "consumed")); continue; }
            var eligible = chars.Where(c => c.FactionId == f && Band(c) != "Steady" && State(c) != "Compromised" && !c.Exempt && !c.Reaffirmed).ToList();
            if (eligible.Count == 0) { skipped.Add(new CpSkip(f, "no eligible member")); continue; }
            var c = eligible.OrderByDescending(x => x.Drift).ThenBy(x => x.Name, StringComparer.Ordinal).ThenBy(x => x.Id, StringComparer.Ordinal).First();
            int a1 = 1 + dice.Int(6), a2 = 1 + dice.Int(6);
            if (!rec.TryGetValue(c.Id, out var r)) return (null, $"the Drift Roll for {c.Id} is missing (wrong nominee?)");
            if (r.D1 is < 1 or > 6 || r.D2 is < 1 or > 6) return (null, $"the Drift Roll for {c.Id} has impossible dice");
            if (r.Source == "app" && (r.D1 != a1 || r.D2 != a2)) return (null, $"the Drift Roll for {c.Id} claims app dice that the seed does not produce");
            var band = Band(c); int mod = inp.BandModifiers.GetValueOrDefault(band); int total = r.D1 + r.D2 + mod; bool ok = total >= inp.Target;
            var from = State(c); var to = ok ? (from == "Stable" ? "Conflicted" : "Compromised") : "Stable";
            rolls.Add(new CpRoll(c.Id, f, c.Drift, band, mod, r.D1, r.D2, total, ok, from, to, r.Source));
        }
        if (rolls.Count != recorded.Rolls.Count) return (null, "the recorded Drift Rolls do not match the nominees");
        return (new CpResults(CharacterPhaseVersion, checks, settled, rolls, skipped), null);
    }

    public static List<Fx> CharacterPhaseEffects(CpResults res)
    {
        var outp = new List<Fx> { new("colony", "colony", "characterPhase", 0, "resolved", null, null, EffectOrigin.CharacterPhase) };
        foreach (var r in res.Checks)
        {
            outp.Add(new Fx("character", r.CharacterId, "defectionCheck", r.Total, r.Left ? "left" : "stayed", r.FactionId, null, EffectOrigin.CharacterPhase));
            if (r.Left) outp.Add(new Fx("character", r.CharacterId, "factionChange", 0, "", null, null, EffectOrigin.CharacterPhase));
            outp.Add(new Fx("character", r.CharacterId, "instability", 0, r.Left ? "Stable" : "Conflicted", null, null, EffectOrigin.CharacterPhase));
        }
        foreach (var id in res.Settled) outp.Add(new Fx("character", id, "instability", 0, "Stable", null, null, EffectOrigin.CharacterPhase));
        foreach (var r in res.Rolls.Where(r => r.To != r.From)) outp.Add(new Fx("character", r.CharacterId, "instability", 0, r.To, null, null, EffectOrigin.CharacterPhase));
        return outp;
    }

    // ---------- verification entry point ----------
    /// <summary>Null if the submitted Effects (and Faction Phase results) are exactly what the inputs produce; else the reason.</summary>
    public static string? Verify(ColonyTurnPhaseKind kind, string frozenInputsJson, string resultsJson, IReadOnlyList<EventEffect> effects)
    {
        try
        {
            List<Fx> expected;
            switch (kind)
            {
                case ColonyTurnPhaseKind.Opening:
                    var op = JsonSerializer.Deserialize<OpInputs>(frozenInputsJson, Json) ?? throw new JsonException("no inputs");
                    if (op.Version != OpeningVersion) return $"unsupported Opening version {op.Version}";
                    expected = OpeningEffects(op);
                    break;
                case ColonyTurnPhaseKind.CharacterPhase:
                    var cp = JsonSerializer.Deserialize<CpInputs>(frozenInputsJson, Json) ?? throw new JsonException("no inputs");
                    var cpr = JsonSerializer.Deserialize<CpResults>(resultsJson, Json) ?? throw new JsonException("no results");
                    if (cp.Version != CharacterPhaseVersion) return $"unsupported Character Phase version {cp.Version}";
                    var (cpd, cperr) = ReplayCharacterPhase(cp, cpr);
                    if (cperr is not null) return cperr;
                    if (!cpd!.Checks.SequenceEqual(cpr.Checks)) return "the Defection Checks do not match their dice";
                    if (!cpd.Settled.SequenceEqual(cpr.Settled)) return "the Settlings do not match the drift bands";
                    if (!cpd.Rolls.SequenceEqual(cpr.Rolls)) return "the Drift Rolls do not match their nominees and dice";
                    if (!cpd.Skipped.SequenceEqual(cpr.Skipped)) return "the skipped factions do not match";
                    expected = CharacterPhaseEffects(cpd);
                    break;
                case ColonyTurnPhaseKind.FactionPhase:
                    var fp = JsonSerializer.Deserialize<FpInputs>(frozenInputsJson, Json) ?? throw new JsonException("no inputs");
                    var rec = JsonSerializer.Deserialize<FpResults>(resultsJson, Json) ?? throw new JsonException("no results");
                    if (fp.Version != FactionPhaseVersion) return $"unsupported Faction Phase version {fp.Version}";
                    var (derived, err) = ReplayFactionPhase(fp, rec);
                    if (err is not null) return err;
                    if (!derived!.Allocations.SequenceEqual(rec.Allocations)) return "the allocation does not match the seed";
                    if (!derived.Guarding!.SequenceEqual(rec.Guarding ?? [])) return "the guards posted do not match the seed";
                    if (!derived.Attempts.SequenceEqual(rec.Attempts)) return "the attempts do not match their dice";
                    if (!derived.Goals.SequenceEqual(rec.Goals)) return "the goal outcomes do not match the attempts";
                    if (!derived.Accepted!.SequenceEqual(rec.Accepted ?? [])) return "the accepted resolutions do not match";
                    expected = FactionPhaseEffects(fp, derived);
                    break;
                case ColonyTurnPhaseKind.Publish:
                    return effects.Count == 0 ? null : "Publish writes no Effects";
                default:
                    return $"unknown phase {kind}";
            }
            var got = effects.Select(e => new Fx(e.TargetType, e.TargetId, e.Property, e.Delta, e.Value, e.SecondaryTargetId, e.ActorFactionId, e.Origin)).ToList();
            if (got.Count != expected.Count) return $"expected {expected.Count} effects, got {got.Count}";
            for (int i = 0; i < got.Count; i++)
                if (got[i] != expected[i]) return $"effect {i} differs: expected {expected[i]}, got {got[i]}";
            return null;
        }
        catch (JsonException ex) { return $"unreadable phase payload: {ex.Message}"; }
    }
}
