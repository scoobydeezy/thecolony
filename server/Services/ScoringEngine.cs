using ColonyTracker.Api.DTOs;
using ColonyTracker.Api.Models;

namespace ColonyTracker.Api.Services;

public interface IScoringEngine
{
    RelationshipBreakdownDto ScoreRelationship(
        Faction source,
        Faction target,
        int colonyStress,
        int manualBump,
        RulesConfig rules);

    RelationshipBreakdownDto ScoreRelationshipToParty(
        Faction source,
        ColonyState colonyState,
        int manualBump,
        RulesConfig rules);
}

public class ScoringEngine : IScoringEngine
{
    public RelationshipBreakdownDto ScoreRelationship(
        Faction source,
        Faction target,
        int colonyStress,
        int manualBump,
        RulesConfig rules)
    {
        return Score(
            source.Id, target.Id,
            source.TruthValue, source.StabilityValue, source.AgencyValue,
            source.Ritual, source.Knowledge, source.Change,
            target.TruthValue, target.StabilityValue, target.AgencyValue,
            target.Ritual, target.Knowledge, target.Change,
            colonyStress, manualBump, rules);
    }

    public RelationshipBreakdownDto ScoreRelationshipToParty(
        Faction source,
        ColonyState cs,
        int manualBump,
        RulesConfig rules)
    {
        return Score(
            source.Id, "party",
            source.TruthValue, source.StabilityValue, source.AgencyValue,
            source.Ritual, source.Knowledge, source.Change,
            cs.PartyTruthValue, cs.PartyStabilityValue, cs.PartyAgencyValue,
            cs.PartyRitual, cs.PartyKnowledge, cs.PartyChange,
            cs.ColonyStress, manualBump, rules);
    }

    private static RelationshipBreakdownDto Score(
        string sourceId, string targetId,
        double sTruth, double sStability, double sAgency,
        RitualPosition? sourceRitual, KnowledgePosition? sourceKnowledge, ChangePosition? sourceChange,
        double tTruth, double tStability, double tAgency,
        RitualPosition? targetRitual, KnowledgePosition? targetKnowledge, ChangePosition? targetChange,
        int colonyStress, int manualBump, RulesConfig rules)
    {
        // Ritual weighted by source's Agency value; Neutral on either side = buffer (0)
        double ritualRaw = ScoreBelief(sourceRitual, targetRitual,
            a => a == RitualPosition.Neutral, rules) * sAgency;

        // Knowledge weighted by source's Truth value; Controlled on either side = buffer (0)
        double knowledgeRaw = ScoreBelief(sourceKnowledge, targetKnowledge,
            a => a == KnowledgePosition.Controlled, rules) * sTruth;

        // Change weighted by source's Stability value; no buffer position
        double changeRaw = ScoreBelief(sourceChange, targetChange,
            _ => false, rules) * sStability;

        // Apply enabled flags: clamp each contribution so only the allowed sign passes through
        double ritualContrib    = ClampByEnabled(ritualRaw,    rules);
        double knowledgeContrib = ClampByEnabled(knowledgeRaw, rules);
        double changeContrib    = ClampByEnabled(changeRaw,    rules);

        double alignmentRaw = Dot(sTruth, sStability, sAgency, tTruth, tStability, tAgency)
                              * rules.ValueAlignmentScale;
        double conflictRaw  = Dot(sTruth, sStability, sAgency, 1 - tTruth, 1 - tStability, 1 - tAgency)
                              * rules.ValueConflictScale;

        double alignment = rules.PositiveEnabled ? alignmentRaw : 0;
        double conflict  = rules.NegativeEnabled ? conflictRaw  : 0;

        double baseScore     = Math.Round(ritualContrib + knowledgeContrib + changeContrib + alignment - conflict, 1);
        double stressedScore = Math.Round(ApplyStress(baseScore, colonyStress, rules), 1);
        double finalScore    = Math.Round(stressedScore + manualBump, 1);

        return new RelationshipBreakdownDto
        {
            SourceId = sourceId,
            TargetId = targetId,
            BaseScore = baseScore,
            StressedScore = stressedScore,
            ManualBump = manualBump,
            FinalScore = finalScore,
            Label = GetLabel(finalScore, rules).ToString(),
            Contributions = new RelationshipContributionsDto
            {
                Ritual         = Math.Round(ritualContrib, 1),
                Knowledge      = Math.Round(knowledgeContrib, 1),
                Change         = Math.Round(changeContrib, 1),
                ValueAlignment = Math.Round(alignment, 1),
                ValueConflict  = Math.Round(-conflict, 1)
            }
        };
    }

    // Allow only contributions whose sign is enabled; returns 0 if the sign is disabled
    private static double ClampByEnabled(double value, RulesConfig rules)
    {
        if (value > 0 && !rules.PositiveEnabled) return 0;
        if (value < 0 && !rules.NegativeEnabled) return 0;
        return value;
    }

    private static double ScoreBelief<T>(T? a, T? b, Func<T, bool> isBuffer, RulesConfig rules)
        where T : struct
    {
        if (!a.HasValue || !b.HasValue) return 0;
        if (isBuffer(a.Value) || isBuffer(b.Value)) return 0;
        return EqualityComparer<T>.Default.Equals(a.Value, b.Value)
            ? rules.BeliefMatch
            : rules.BeliefConflict;
    }

    private static double Dot(double at, double as_, double aa, double bt, double bs, double ba)
        => at * bt + as_ * bs + aa * ba;

    // Positive multiplier fades out as stress rises; negative fades in — tilt across 0–10.
    private static double ApplyStress(double score, int colonyStress, RulesConfig rules)
    {
        const double maxStress = 10.0;
        double t = Math.Clamp(colonyStress / maxStress, 0, 1);
        if (score > 0 && rules.PositiveEnabled) return score * (1 + colonyStress * rules.StressPositiveMultiplierPerPoint * (1 - t));
        if (score < 0 && rules.NegativeEnabled) return score * (1 + colonyStress * rules.StressNegativeMultiplierPerPoint * t);
        return score;
    }

    private static RelationshipLabel GetLabel(double score, RulesConfig rules)
    {
        var thresholds = ParseThresholds(rules.ThresholdsJson);
        foreach (var t in thresholds.OrderByDescending(x => x.MinScore))
        {
            if (score >= t.MinScore) return t.Label;
        }
        return RelationshipLabel.Hostile;
    }

    private record ThresholdEntry(RelationshipLabel Label, double MinScore);

    private static readonly System.Text.Json.JsonSerializerOptions _caseInsensitive = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private static List<ThresholdEntry> ParseThresholds(string json)
    {
        try
        {
            var items = System.Text.Json.JsonSerializer.Deserialize<List<ThresholdEntryJson>>(json, _caseInsensitive) ?? [];
            return items.Select(x => new ThresholdEntry(
                Enum.Parse<RelationshipLabel>(x.Label, ignoreCase: true), x.MinScore)).ToList();
        }
        catch
        {
            return DefaultThresholds();
        }
    }

    private static List<ThresholdEntry> DefaultThresholds() =>
    [
        new(RelationshipLabel.Aligned,      6),
        new(RelationshipLabel.Cooperative,  4),
        new(RelationshipLabel.Friendly,     2),
        new(RelationshipLabel.Tolerated, -1),
        new(RelationshipLabel.Strained,  -4),
        new(RelationshipLabel.Opposed,   -10),
        new(RelationshipLabel.Hostile,   -999)
    ];

    private record ThresholdEntryJson(string Label, double MinScore);
}
