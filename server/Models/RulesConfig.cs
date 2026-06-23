namespace ColonyTracker.Api.Models;

public enum StressWeightCurve { Linear, Quadratic, Cubic, Exponential }

public class RulesConfig
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CampaignId { get; set; } = string.Empty;

    // Shared belief match/conflict (weighted by each faction's value priorities in the engine)
    public double BeliefMatch { get; set; } = 3.0;
    public double BeliefConflict { get; set; } = -2.0;

    // Value vector alignment/conflict scales (applied to dot product results)
    public double ValueAlignmentScale { get; set; } = 5.5;
    public double ValueConflictScale { get; set; } = 3.0;

    // Stress multipliers — tilt with stress level (0–10)
    public double StressPositiveMultiplierPerPoint { get; set; } = 0.25;
    public double StressNegativeMultiplierPerPoint { get; set; } = 0.2;

    // Enable/disable entire positive or negative relationship contributions
    public bool PositiveEnabled { get; set; } = true;
    public bool NegativeEnabled { get; set; } = true;

    // Stress-weight composition: shifts belief/value sub-score weighting as stress rises
    public bool StressWeightEnabled { get; set; } = true;
    public StressWeightCurve StressWeightCurve { get; set; } = StressWeightCurve.Cubic;
    public double StressWeightIntensity { get; set; } = 0.7;

    // Influence system: caps max conviction bonus from faction peers
    // bonus = factionInfluenceAvg × (impressionable/100) × InfluenceConvictionScale
    public double InfluenceConvictionScale { get; set; } = 0.5;

    // Relationship thresholds (stored as JSON) — live-tuned defaults
    public string ThresholdsJson { get; set; } = """
        [
          {"label":"Aligned","minScore":6},
          {"label":"Cooperative","minScore":4},
          {"label":"Friendly","minScore":2},
          {"label":"Tolerated","minScore":-1},
          {"label":"Strained","minScore":-3},
          {"label":"Opposed","minScore":-6}
        ]
        """;

    // Generic value labels for new campaigns
    public string ValueLabelsJson { get; set; } = """
        {"a":"Value A","b":"Value B","c":"Value C","edgeAC":"Secondary AC","edgeAB":"Secondary AB","edgeBC":"Secondary BC"}
        """;

    // Generic belief axis labels for new campaigns
    public string BeliefAxisLabelsJson { get; set; } = """
        {
          "a":{"axisName":"Axis A","type":"opinion","positiveAligns":true,"positive":"Positive A","neutral":"Neutral A","negative":"Negative A"},
          "b":{"axisName":"Axis B","type":"boolean","positiveAligns":false,"positive":"Yes","neutral":"Neutral","negative":"No"},
          "c":{"axisName":"Axis C","type":"opinion","positiveAligns":false,"positive":"Positive C","neutral":"Neutral C","negative":"Negative C"}
        }
        """;

    // Cascade rules — empty for new campaigns
    public string CascadeRulesJson { get; set; } = "[]";

    // Formula weights — live defaults stored explicitly so new campaigns don't depend on client fallbacks
    public string FormulasJson { get; set; } = """
        {"memberAvgWeight":0.6,"memberMaxWeight":0.4,"baseInfluenceWeight":0.45,"charInfluenceWeight":0.35,"momentumInfluenceWeight":0.20,"legitimacyBase":0.5,"legitimacyScale":100,"leaderlessPowerMultiplier":0.75,"beliefDerivationThreshold":0.4}
        """;
}
