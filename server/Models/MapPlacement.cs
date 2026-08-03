namespace ColonyTracker.Api.Models;

public class MapPlacement
{
    public string Id { get; set; } = "";
    public string MapId { get; set; } = "";
    public PlacementSubjectType SubjectType { get; set; }
    public string SubjectId { get; set; } = "";
    public GeometryType GeometryType { get; set; } = GeometryType.Point;
    public string GeometryData { get; set; } = "[]"; // JSON: [x,y] or [[x,y],...]
    public bool IsHidden { get; set; } = false;
}
