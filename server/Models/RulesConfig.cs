namespace ColonyTracker.Api.Models;

public enum StressWeightCurve { Linear, Quadratic, Cubic, Exponential }

public class RulesConfig
{
    public string Id { get; set; } = "singleton";

    // Shared belief match/conflict (weighted by each faction's value priorities in the engine)
    public double BeliefMatch { get; set; } = 2.5;
    public double BeliefConflict { get; set; } = -1.0;

    // Value vector alignment/conflict scales (applied to dot product results)
    public double ValueAlignmentScale { get; set; } = 5.0;
    public double ValueConflictScale { get; set; } = 3.0;

    // Stress multipliers — tilt with stress level (0–10)
    public double StressPositiveMultiplierPerPoint { get; set; } = 0.25;
    public double StressNegativeMultiplierPerPoint { get; set; } = 0.35;

    // Enable/disable entire positive or negative relationship contributions
    public bool PositiveEnabled { get; set; } = true;
    public bool NegativeEnabled { get; set; } = true;

    // Stress-weight composition: shifts belief/value sub-score weighting as stress rises
    public bool StressWeightEnabled { get; set; } = false;
    public StressWeightCurve StressWeightCurve { get; set; } = StressWeightCurve.Linear;
    public double StressWeightIntensity { get; set; } = 0.5;

    // Influence system: caps max conviction bonus from faction peers
    // bonus = factionInfluenceAvg × (impressionable/100) × InfluenceConvictionScale
    public double InfluenceConvictionScale { get; set; } = 0.5;

    // Relationship thresholds (stored as JSON)
    public string ThresholdsJson { get; set; } = """
        [
          {"label":"Aligned","minScore":6},
          {"label":"Cooperative","minScore":4},
          {"label":"Friendly","minScore":2},
          {"label":"Tolerated","minScore":-1},
          {"label":"Strained","minScore":-4},
          {"label":"Opposed","minScore":-10},
          {"label":"Hostile","minScore":-999}
        ]
        """;

    // Display label overrides (stored as JSON; empty string = use client defaults)
    public string ValueLabelsJson { get; set; } = "";
    public string BeliefAxisLabelsJson { get; set; } = "";

    // Cascade rules (stored as JSON; empty string = use client defaults)
    public string CascadeRulesJson { get; set; } = "";

    // Formula weights (stored as JSON; empty string = use client defaults)
    public string FormulasJson { get; set; } = "";
}
