namespace ColonyTracker.Api.Models;

public class NarrativeEventPlacement
{
    public string NarrativeEventId { get; set; } = string.Empty;
    public double X { get; set; }
    public double Y { get; set; }
    public double? Width { get; set; }
    public double? Height { get; set; }
}
