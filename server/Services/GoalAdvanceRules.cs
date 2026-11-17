using System.Text.Json;
using ColonyTracker.Api.Models;

namespace ColonyTracker.Api.Services;

/// <summary>§18.11: the Effects a goal may name for its advances, checked when a goal is saved. Mirrors the client's
/// ADVANCE_PROPERTIES (core/sim/advance-effects.ts): an advance writes only the ordinary vocabulary below.
/// It never establishes or ends a World Condition: a condition that follows a goal is driven by the goal's stage.</summary>
public static class GoalAdvanceRules
{
    private static readonly Dictionary<string, Dictionary<string, string[]?>> Allowed = new()
    {
        ["asset"] = new() { ["status"] = ["Stable", "Contested", "Damaged", "Destroyed"], ["controllingFactionId"] = null, ["locationChange"] = null },
        ["character"] = new() { ["state"] = ["Alive", "Dead", "Missing", "Forgotten"] },
        ["faction"] = new() { ["factionSize"] = null },
        ["location"] = new() { ["state"] = ["Stable", "ActiveIncursion", "Unstable"] },
    };

    /// <summary>Why the goal's advance Effects cannot be stored, or null.</summary>
    public static string? Issue(FactionGoal g)
    {
        g.ProgressingEffectsJson = string.IsNullOrWhiteSpace(g.ProgressingEffectsJson) ? "[]" : g.ProgressingEffectsJson;
        g.AccomplishedEffectsJson = string.IsNullOrWhiteSpace(g.AccomplishedEffectsJson) ? "[]" : g.AccomplishedEffectsJson;
        return Check(g.ProgressingEffectsJson, "at Progressing") ?? Check(g.AccomplishedEffectsJson, "at Accomplished");
    }

    private static string? Check(string json, string when)
    {
        JsonElement root;
        try { root = JsonDocument.Parse(json).RootElement; } catch (JsonException) { return $"the Effects {when} are not valid JSON"; }
        if (root.ValueKind != JsonValueKind.Array) return $"the Effects {when} must be a list";
        foreach (var e in root.EnumerateArray())
        {
            string? S(string k) => e.TryGetProperty(k, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
            var type = S("targetType"); var prop = S("property");
            if (type is null || prop is null || !Allowed.TryGetValue(type, out var props) || !props.TryGetValue(prop, out var values))
                return $"an Effect {when} ({type} {prop}) is not an advance Effect";
            if (string.IsNullOrEmpty(S("targetId"))) return $"an Effect {when} has no target";
            if (values is not null && !values.Contains(S("value"))) return $"an Effect {when} has an invalid value for {type} {prop}";
            if (prop == "factionSize" && (!e.TryGetProperty("delta", out var d) || d.ValueKind != JsonValueKind.Number || d.GetDouble() == 0))
                return $"a Faction Size Effect {when} needs a non-zero change";
        }
        return null;
    }
}
