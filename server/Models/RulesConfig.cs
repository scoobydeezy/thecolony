namespace ColonyTracker.Api.Models;

public enum StressWeightCurve { Linear, Quadratic, Cubic, Exponential }

public class RulesConfig
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CampaignId { get; set; } = string.Empty;

    // Belief agreement per axis (SCORING-AUDIT.md): same position / middle vs pole / opposite poles.
    // Each axis is weighted by BeliefWeightBlend·(source Value on the axis) + (1 − BeliefWeightBlend)/3.
    public double BeliefMatch { get; set; } = 3.0;
    public double BeliefConflict { get; set; } = -2.0;
    public double BeliefAdjacent { get; set; } = -1.0;
    public double BeliefWeightBlend { get; set; } = 0.5;

    // Value geometry: similarity (1 − 2·distance on the ternary) and directional opposition. Provisional constants.
    public double ValueSimilarityScale { get; set; } = 3.5;
    public double ValueOppositionScale { get; set; } = 3.0;

    // Pre-audit dot-product scales: archived, unused by the engine.
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
          "b":{"axisName":"Axis B","type":"opinion","positiveAligns":false,"positive":"Yes","neutral":"Neutral","negative":"No"},
          "c":{"axisName":"Axis C","type":"opinion","positiveAligns":false,"positive":"Positive C","neutral":"Neutral C","negative":"Negative C"}
        }
        """;

    // §18.10: Cascade Rules and Stress Triggers are retired. Both JSON columns are kept for reference and never executed.
    public string CascadeRulesJson { get; set; } = "[]";

    public string StressTriggersJson { get; set; } = "[]";

    // Formula weights — live defaults stored explicitly so new campaigns don't depend on client fallbacks
    public string FormulasJson { get; set; } = """
        {"peoplePoints":10,"leaderBonus":5,"unnamedPerPoint":20,"holdingsPoints":15,"mandatePoints":5,"beliefDerivationThreshold":0.5}
        """;
}
