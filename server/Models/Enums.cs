namespace ColonyTracker.Api.Models;

public enum BeliefPosition { Positive, Neutral, Negative }
public enum CoreValue { A, B, C }
public enum RelationshipLabel { Aligned, Cooperative, Friendly, Tolerated, Strained, Opposed, Hostile }
public enum GroupType { Faction, SocialClass }
public enum CharacterType { NPC, PartyMember, FactionLeader }
public enum DoubtDirection { A, B, C, AB, AC, BC }
public enum CharacterState { Alive, Dead, Missing, Forgotten }
public enum AssetType { Infrastructure, Artifact, Resource, Intelligence }
public enum AssetRole { Operational, Strategic, Symbolic, Hidden, Mandate }
public enum AssetStatus { Stable, Contested, Damaged, Destroyed, Hidden, Lost }
public enum GoalStatus { Plotting, Progressing, Stalled, Accomplished, Failed }
public enum GoalTargetEntityType { Faction, Character, Asset }
public enum GoalPriority { Critical, Major, Minor }
public enum GoalVisibility { Open, Known, Secret }
