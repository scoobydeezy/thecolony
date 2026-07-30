namespace ColonyTracker.Api.Models;

public class CharacterNarrativeProfile
{
    public string CharacterId { get; set; } = string.Empty;

    public string? Overview { get; set; }
    public string? Personality { get; set; }
    public string? Motivation { get; set; }

    public string? PrimaryProtection { get; set; }
    public string? Fears { get; set; }
    public string? BlindSpot { get; set; }
    public string? NarrativeRole { get; set; }

    public string? PerformanceInspiration { get; set; }
    public string? PortrayalNotes { get; set; }
    public string? PressureResponse { get; set; }

    public string? SignatureQuote { get; set; }
    public string? SignatureObject { get; set; }

    public string? Notes { get; set; }
}
