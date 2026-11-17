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
    /// <summary>§18.10: the server stores no Colony Stress (it is derived on the client from the World Conditions in force),
    /// so its scores are at Stress 0. The client re-scores every relationship at the viewed Stress; the server's list
    /// supplies the pairs.</summary>
    public const int ServerStress = 0;

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
            source.BeliefC, source.BeliefA, source.BeliefB,
            target.TruthValue, target.StabilityValue, target.AgencyValue,
            target.BeliefC, target.BeliefA, target.BeliefB,
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
            source.BeliefC, source.BeliefA, source.BeliefB,
            cs.PartyTruthValue, cs.PartyStabilityValue, cs.PartyAgencyValue,
            cs.PartyBeliefC, cs.PartyBeliefA, cs.PartyBeliefB,
            ServerStress, manualBump, rules);
    }

    private static RelationshipBreakdownDto Score(
        string sourceId, string targetId,
        double sTruth, double sStability, double sAgency,
        BeliefPosition? sourceBeliefc, BeliefPosition? sourceBeliefa, BeliefPosition? sourceBeliefb,
        double tTruth, double tStability, double tAgency,
        BeliefPosition? targetBeliefc, BeliefPosition? targetBeliefa, BeliefPosition? targetBeliefb,
        int colonyStress, int manualBump, RulesConfig rules)
    {
        // Same formula as client core/services/scoring.service.ts (SCORING-AUDIT.md); keep the two in step.
        // Beliefs: three positions on every axis; weight = blend·(source Value) + (1 − blend)/3.
        double blend = Math.Clamp(rules.BeliefWeightBlend, 0, 1), equal = (1 - blend) / 3;
        double beliefcContrib = ClampByEnabled(ScoreBelief(sourceBeliefc, targetBeliefc, rules) * (blend * sAgency + equal), rules);
        double beliefaContrib = ClampByEnabled(ScoreBelief(sourceBeliefa, targetBeliefa, rules) * (blend * sTruth + equal), rules);
        double beliefbContrib = ClampByEnabled(ScoreBelief(sourceBeliefb, targetBeliefb, rules) * (blend * sStability + equal), rules);

        // Values: similarity 1 − 2·distance (symmetric) and opposition Σ sᵢ·max(0, sᵢ − tᵢ) (directional).
        double distance   = (Math.Abs(sTruth - tTruth) + Math.Abs(sStability - tStability) + Math.Abs(sAgency - tAgency)) / 2;
        double opposition = sTruth * Math.Max(0, sTruth - tTruth) + sStability * Math.Max(0, sStability - tStability)
                          + sAgency * Math.Max(0, sAgency - tAgency);
        double similarity = ClampByEnabled((1 - 2 * distance) * rules.ValueSimilarityScale, rules);
        double oppose     = ClampByEnabled(-opposition * rules.ValueOppositionScale, rules);

        double beliefSubScore = beliefcContrib + beliefaContrib + beliefbContrib;
        double valueSubScore  = similarity + oppose;

        // Stress-weight scaling: shifts composition from belief-driven to value-driven as stress rises.
        // Both sub-scores remain additive; only their relative weight changes.
        double beliefScale = 1.0;
        double valueScale  = 1.0;
        double stressWeight = 0.0;

        if (rules.StressWeightEnabled)
        {
            const double maxStress = 10.0;
            double t = Math.Clamp(colonyStress / maxStress, 0, 1);
            stressWeight = ApplyCurve(t, rules.StressWeightCurve) * rules.StressWeightIntensity;
            beliefScale  = 1.0 - stressWeight;
            valueScale   = 1.0 + stressWeight;
        }

        double baseScore     = Math.Round(beliefSubScore * beliefScale + valueSubScore * valueScale, 1);
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
                BeliefC        = Math.Round(beliefcContrib, 1),
                BeliefA        = Math.Round(beliefaContrib, 1),
                BeliefB        = Math.Round(beliefbContrib, 1),
                ValueSimilarity = Math.Round(similarity, 1),
                ValueOpposition = Math.Round(oppose, 1),
                BeliefSubScore = Math.Round(beliefSubScore, 1),
                ValueSubScore  = Math.Round(valueSubScore, 1),
                StressWeight   = Math.Round(stressWeight, 3)
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

    // Same → BeliefMatch; middle vs pole → BeliefAdjacent; opposite poles → BeliefConflict; unset → 0.
    private static double ScoreBelief(BeliefPosition? a, BeliefPosition? b, RulesConfig rules)
    {
        if (!a.HasValue || !b.HasValue) return 0;
        int gap = Math.Abs(Rank(a.Value) - Rank(b.Value));
        return gap == 0 ? rules.BeliefMatch : gap == 1 ? rules.BeliefAdjacent : rules.BeliefConflict;
    }

    private static int Rank(BeliefPosition p) => p switch
    {
        BeliefPosition.Negative => 0,
        BeliefPosition.Neutral  => 1,
        _                       => 2,
    };

    // t in [0,1] → curve output in [0,1]
    private static double ApplyCurve(double t, StressWeightCurve curve) => curve switch
    {
        StressWeightCurve.Quadratic   => t * t,
        StressWeightCurve.Cubic       => t * t * t,
        StressWeightCurve.Exponential => (Math.Exp(t) - 1) / (Math.E - 1),
        _                             => t   // Linear
    };

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
