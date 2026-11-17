using Microsoft.EntityFrameworkCore;

namespace ColonyTracker.Api.Services;

/// <summary>
/// The id a created record gets. A supplied id is kept when it is non-blank, reasonable, and not already in use, so an
/// imported file's rows can reference each other (e.g. a goal targeting an Asset added by the same import). Otherwise,
/// e.g. for a record created in the UI, a fresh GUID.
/// </summary>
public static class EntityIds
{
    public const int MaxLength = 64;

    public static async Task<string> ForCreateAsync<T>(DbSet<T> set, string? requested) where T : class
    {
        if (!string.IsNullOrWhiteSpace(requested) && requested.Length <= MaxLength && requested == requested.Trim()
            && await set.FindAsync(requested) is null)
            return requested;
        return Guid.NewGuid().ToString();
    }
}
