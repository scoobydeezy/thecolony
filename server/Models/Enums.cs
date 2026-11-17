namespace ColonyTracker.Api.Models;

public enum BeliefPosition { Positive, Neutral, Negative }
public enum CoreValue { A, B, C }
public enum RelationshipLabel { Aligned, Cooperative, Friendly, Tolerated, Strained, Opposed, Hostile }
public enum GroupType { Faction, SocialClass }
public enum CharacterType { NPC, PartyMember }
public enum NarrativeTier { Major, Supporting, Minor, Background }
public enum NarrativeVisibility { Public, GMOnly, Revealed }
public enum RelationshipState { Active, Estranged, Severed, Unknown }
public enum DoubtDirection { A, B, C, AB, AC, BC }
public enum CharacterState { Alive, Dead, Missing, Forgotten }
public enum AssetType { Infrastructure, Artifact, Resource, Intelligence }
public enum AssetRole { Operational, Strategic, Symbolic, Covert, Mandate }
public enum AssetStatus { Stable, Contested, Damaged, Destroyed }
public enum GoalStatus { Plotting, Progressing, Stalled, Accomplished, Failed, Retired }   // M4: Retired = impossible/obsolete, set aside (terminal, no signal); Stalled is legacy (not offered)
public enum GoalOutcomeMode { Automatic, Adjudicated }
public enum CharacterInstability { Stable, Conflicted, Compromised }                 // M6                  // M4 (BOARD-GAME-REVIEW §6.2)
public enum GoalConditionType { Achieve, Maintain }
public enum GoalTargetEntityType { Faction, Character, Asset }
public enum GoalPriority { Critical, Major, Minor }
public enum GoalVisibility { Open, Known, Secret }
public enum LocationState { Stable, ActiveIncursion, Unstable }   // §18.9: a transient condition of the place (World Condition predicates), not an attribute
public enum GeometryType { Point, Polygon, MultiPoint }
public enum PlacementSubjectType { Location, Character, Asset }
public enum NarrativeThreadState  { Open, Resolved }
public enum NarrativeEventStatus  { Planned, Available, Occurred, Bypassed, Obsolete }
public enum NarrativeOwnerType    { Thread, Event }
public enum NarrativeEntityType   { Faction, Character, Asset, Location, Session, SessionEvent }

// ── M1: campaign lifecycle, history, Colony Turns ───────────────────────────
public enum CampaignMode { Design, Live }
public enum EventKind { Play, ColonyTurn, Correction, MapEdits }
public enum EffectOrigin { Manual, Opening, FactionPhase, CharacterPhase, GoalGenerator, MomentumResolution, Consequence, Correction }
public enum ColonyTurnStatus { Draft, Committed, Voided }
public enum ColonyTurnPhaseKind { Opening, FactionPhase, CharacterPhase, Publish }
