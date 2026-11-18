using ColonyTracker.Api.Data;
using ColonyTracker.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using ColonyTracker.Api.Services.Canon;

namespace ColonyTracker.Api.Services;

/// <summary>Raised when a write would change locked state in a Live campaign. Mapped to HTTP 409.</summary>
public class LiveCampaignViolationException(string message) : Exception(message);

/// <summary>
/// M1 rules for writes that affect simulation state (BOARD-GAME-REVIEW §9, §17).
/// <list type="bullet">
/// <item>Every tracked write bumps the owning campaign's HistoryVersion (see AppDbContext).</item>
/// <item>In a Live campaign: locked baseline fields cannot change, simulation entities cannot be deleted,
/// new simulation entities need IntroducedAtEventId, rules change only through versioning, relationship overrides
/// are frozen, and committed Colony Turns are immutable.</item>
/// </list>
/// Descriptive fields (names, prose, portraits, colors) stay editable.
/// </summary>
public static class SimulationGuard
{
    // Locked baseline simulation fields per entity type. Anything not listed is descriptive.
    private static readonly Dictionary<Type, string[]> Locked = new()
    {
        [typeof(Character)] = ["TruthValue", "StabilityValue", "AgencyValue", "BeliefA", "BeliefB", "BeliefC", "DoubtDirection",
                               "Conviction", "Pressure", "Influence", "Impressionable", "State", "FactionId", "SocialClassId",
                               "LocationId", "CharacterType", "IntroducedAtEventId", "Instability", "ReaffirmedFactionId"],
        [typeof(Faction)] = ["Momentum", "MomentumTier", "PowerModifier", "FactionSize", "LeaderId",
                             "TruthValue", "StabilityValue", "AgencyValue", "BeliefA", "BeliefB", "BeliefC", "Active", "Type",
                             "IntroducedAtEventId"],
        [typeof(Asset)] = ["ControllingFactionId", "Status", "StatusActorFactionId", "Tier", "Role", "Type", "Keystone", "LocationId",
                           "IntroducedAtEventId"],
        [typeof(FactionGoal)] = ["FactionId", "Status", "ConditionType", "Priority", "TargetEntityType", "TargetEntityId", "TargetState",
                                 "TargetOwnerFactionId", "ChampionId", "TargetProperty", "TargetOperator", "TargetThreshold",
                                 "IntroducedAtEventId", "OutcomeMode"],
        [typeof(Location)] = ["State", "ParentLocationId", "LinkedAssetId", "IntroducedAtEventId"],
        [typeof(ColonyState)] = ["PartyTruthValue", "PartyStabilityValue", "PartyAgencyValue",
                                 "PartyBeliefA", "PartyBeliefB", "PartyBeliefC"],
    };

    private static readonly HashSet<Type> Introducible = [typeof(Character), typeof(Faction), typeof(Asset), typeof(FactionGoal), typeof(Location)];

    /// <summary>Entity types whose writes affect simulation state (and therefore HistoryVersion).</summary>
    public static bool Tracks(object entity) => entity is Character or Faction or Asset or FactionGoal or Location or ColonyState
        or RulesConfig or RelationshipOverride or Session or Event or EventEffect or ColonyTurn or ColonyTurnPhase or RulesVersion;

    public static async Task CheckLiveAsync(EntityEntry e, AppDbContext db, CancellationToken ct)
    {
        var type = e.Entity.GetType();
        var name = type.Name;
        switch (e.Entity)
        {
            case RelationshipOverride:
                throw new LiveCampaignViolationException("Relationship overrides are frozen in a Live campaign; record a relationship shift as an Event.");
            case RulesConfig when e.State == EntityState.Modified && !db.AllowRulesVersioning:
                throw new LiveCampaignViolationException("Rules in a Live campaign change only by creating a new RulesVersion (PUT /api/rules?effectiveFromEventId=…).");
            case ColonyTurn turn when e.State == EntityState.Deleted || (e.State == EntityState.Modified && OriginalStatus(e) != ColonyTurnStatus.Draft):
                throw new LiveCampaignViolationException("A committed Colony Turn is immutable; void and re-run it instead (M7).");
            case Event ev when ev.Kind == EventKind.ColonyTurn && e.State != EntityState.Added:
                throw new LiveCampaignViolationException("Colony Turn events are written only by the Colony Turn procedure.");
            case EventEffect ef when ef.PhaseId is not null && e.State != EntityState.Added:
                // M5: a phase's Effects change only by voiding that phase of a Draft turn.
                var phase = await db.ColonyTurnPhases.AsNoTracking().FirstOrDefaultAsync(p => p.Id == ef.PhaseId, ct);
                var owner = phase is null ? null : await db.ColonyTurns.AsNoTracking().FirstOrDefaultAsync(t => t.Id == phase.ColonyTurnId, ct);
                if (owner is not null && owner.Status != ColonyTurnStatus.Draft)
                    throw new LiveCampaignViolationException("Effects of a committed Colony Turn are immutable.");
                break;
        }

        if (!Locked.ContainsKey(type)) return;

        if (e.State == EntityState.Deleted)
            throw new LiveCampaignViolationException($"{name} cannot be deleted in a Live campaign; retire it with an Effect.");

        if (e.State == EntityState.Added)
        {
            if (Introducible.Contains(type) && e.Property("IntroducedAtEventId").CurrentValue is null)
                throw new LiveCampaignViolationException($"A new {name} in a Live campaign needs IntroducedAtEventId (the Event that brings it into the world).");
            return;
        }

        // Modified: compare against what is stored (the database, or for file-backed properties the
        // entity's file), because PUT handlers attach the incoming entity as Modified.
        var stored = await e.GetDatabaseValuesAsync(ct);
        if (stored is null) return;
        // A detached update may not carry its file link; the database row has it.
        var canonEntity = e.Entity as ICanonEntity;
        var canonId = canonEntity is null ? null : canonEntity.CanonId ?? stored[nameof(ICanonEntity.CanonId)] as string;
        var fileValues = canonId is not null && db.Canon is not null && db.Canon.TryGet(canonId, out var file)
            ? CanonMapping.FileValues(type, file, db.Refs, canonEntity!.CampaignId, db.Canon) : null;
        var changed = Locked[type].Where(p => CanonMapping.IsCanon(type, p)
                ? fileValues is not null && !Equals(fileValues[p], CanonMapping.Normalize(type.GetProperty(p)!.GetValue(e.Entity)))
                : e.Metadata.FindProperty(p) is not null && !Equals(stored[p], e.Property(p).CurrentValue)).ToList();
        if (changed.Count > 0)
            throw new LiveCampaignViolationException($"Locked in a Live campaign: {name}.{string.Join(", ", changed)}. Record the change as an Event instead.");
    }

    private static ColonyTurnStatus OriginalStatus(EntityEntry e) => (ColonyTurnStatus)e.Property(nameof(ColonyTurn.Status)).OriginalValue!;
}
