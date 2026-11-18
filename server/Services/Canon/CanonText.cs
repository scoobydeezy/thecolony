using System.Text;
using System.Text.RegularExpressions;

namespace ColonyTracker.Api.Services.Canon;

// Text rules shared with the adventure's JavaScript tooling (scripts/merge-characters.mjs,
// github-slugger), so keys and comparisons agree across both sides.
public static partial class CanonText
{
    // github-slugger: lower-case, drop punctuation (keep letters, digits, spaces, '-' and '_'),
    // then each space becomes '-'.
    public static string Slug(string heading)
    {
        var sb = new StringBuilder(heading.Length);
        foreach (var ch in heading.ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(ch) || ch == '-' || ch == '_') sb.Append(ch);
            else if (ch == ' ') sb.Append('-');
        }
        return sb.ToString();
    }

    // Equality for parity checks: quotes, emphasis, bullet styles and whitespace don't count.
    public static string Normalize(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return "";
        var t = s.Replace('“', '"').Replace('”', '"').Replace('‘', '\'').Replace('’', '\'');
        t = Bullets().Replace(t, "- ");
        t = t.Replace("**", "").Replace("__", "").Replace("`", "");
        t = LooseEmphasis().Replace(t, "");
        return Whitespace().Replace(t, " ").Trim();
    }

    public static bool Same(string? a, string? b) => Normalize(a) == Normalize(b);

    [GeneratedRegex(@"^\s*[•*-]\s+", RegexOptions.Multiline)] private static partial Regex Bullets();
    [GeneratedRegex(@"(?<!\w)[*_](?!\s)|(?<!\s)[*_](?!\w)")] private static partial Regex LooseEmphasis();
    [GeneratedRegex(@"\s+")] private static partial Regex Whitespace();
}
