using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Assets",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    Role = table.Column<int>(type: "INTEGER", nullable: false),
                    Tier = table.Column<int>(type: "INTEGER", nullable: false),
                    Keystone = table.Column<bool>(type: "INTEGER", nullable: false),
                    ControllingFactionId = table.Column<string>(type: "TEXT", nullable: true),
                    LocationId = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    StatusActorFactionId = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Assets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Campaigns",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Campaigns", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CharacterDetails",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CharacterId = table.Column<string>(type: "TEXT", nullable: false),
                    Key = table.Column<string>(type: "TEXT", nullable: false),
                    Heading = table.Column<string>(type: "TEXT", nullable: false),
                    Body = table.Column<string>(type: "TEXT", nullable: true),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CharacterDetails", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CharacterNarrativeProfiles",
                columns: table => new
                {
                    CharacterId = table.Column<string>(type: "TEXT", nullable: false),
                    Overview = table.Column<string>(type: "TEXT", nullable: true),
                    Personality = table.Column<string>(type: "TEXT", nullable: true),
                    Motivation = table.Column<string>(type: "TEXT", nullable: true),
                    PrimaryProtection = table.Column<string>(type: "TEXT", nullable: true),
                    Fears = table.Column<string>(type: "TEXT", nullable: true),
                    BlindSpot = table.Column<string>(type: "TEXT", nullable: true),
                    NarrativeRole = table.Column<string>(type: "TEXT", nullable: true),
                    PerformanceInspiration = table.Column<string>(type: "TEXT", nullable: true),
                    PortrayalNotes = table.Column<string>(type: "TEXT", nullable: true),
                    PressureResponse = table.Column<string>(type: "TEXT", nullable: true),
                    SignatureQuote = table.Column<string>(type: "TEXT", nullable: true),
                    SignatureObject = table.Column<string>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CharacterNarrativeProfiles", x => x.CharacterId);
                });

            migrationBuilder.CreateTable(
                name: "CharacterRelationships",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    SourceCharacterId = table.Column<string>(type: "TEXT", nullable: false),
                    TargetCharacterId = table.Column<string>(type: "TEXT", nullable: true),
                    RelationshipType = table.Column<string>(type: "TEXT", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    State = table.Column<int>(type: "INTEGER", nullable: false),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CharacterRelationships", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Characters",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    CharacterType = table.Column<int>(type: "INTEGER", nullable: false),
                    Ancestry = table.Column<string>(type: "TEXT", nullable: true),
                    Heritage = table.Column<string>(type: "TEXT", nullable: true),
                    Class = table.Column<string>(type: "TEXT", nullable: true),
                    Background = table.Column<string>(type: "TEXT", nullable: true),
                    Level = table.Column<int>(type: "INTEGER", nullable: true),
                    NarrativeTier = table.Column<int>(type: "INTEGER", nullable: false),
                    Gender = table.Column<string>(type: "TEXT", nullable: true),
                    Pronouns = table.Column<string>(type: "TEXT", nullable: true),
                    Age = table.Column<int>(type: "INTEGER", nullable: true),
                    Occupation = table.Column<string>(type: "TEXT", nullable: true),
                    Aliases = table.Column<string>(type: "TEXT", nullable: true),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    FactionId = table.Column<string>(type: "TEXT", nullable: true),
                    SocialClassId = table.Column<string>(type: "TEXT", nullable: true),
                    TruthValue = table.Column<double>(type: "REAL", nullable: false),
                    StabilityValue = table.Column<double>(type: "REAL", nullable: false),
                    AgencyValue = table.Column<double>(type: "REAL", nullable: false),
                    BeliefC = table.Column<int>(type: "INTEGER", nullable: true),
                    BeliefA = table.Column<int>(type: "INTEGER", nullable: true),
                    BeliefB = table.Column<int>(type: "INTEGER", nullable: true),
                    DoubtDirection = table.Column<int>(type: "INTEGER", nullable: true),
                    Conviction = table.Column<int>(type: "INTEGER", nullable: false),
                    Pressure = table.Column<int>(type: "INTEGER", nullable: false),
                    Influence = table.Column<int>(type: "INTEGER", nullable: false),
                    Impressionable = table.Column<int>(type: "INTEGER", nullable: false),
                    PortraitPath = table.Column<string>(type: "TEXT", nullable: true),
                    State = table.Column<int>(type: "INTEGER", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    LocationId = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Characters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ColonyMaps",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    LocationId = table.Column<string>(type: "TEXT", nullable: true),
                    ImagePath = table.Column<string>(type: "TEXT", nullable: true),
                    ImageWidth = table.Column<int>(type: "INTEGER", nullable: false),
                    ImageHeight = table.Column<int>(type: "INTEGER", nullable: false),
                    IsHero = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ColonyMaps", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ColonyStates",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    PartyName = table.Column<string>(type: "TEXT", nullable: false),
                    Act = table.Column<int>(type: "INTEGER", nullable: false),
                    Week = table.Column<int>(type: "INTEGER", nullable: false),
                    ColonyStress = table.Column<int>(type: "INTEGER", nullable: false),
                    PartyBeliefC = table.Column<int>(type: "INTEGER", nullable: false),
                    PartyBeliefA = table.Column<int>(type: "INTEGER", nullable: false),
                    PartyBeliefB = table.Column<int>(type: "INTEGER", nullable: false),
                    PartyTruthValue = table.Column<double>(type: "REAL", nullable: false),
                    PartyStabilityValue = table.Column<double>(type: "REAL", nullable: false),
                    PartyAgencyValue = table.Column<double>(type: "REAL", nullable: false),
                    SessionSummary = table.Column<string>(type: "TEXT", nullable: true),
                    DominantFactions = table.Column<string>(type: "TEXT", nullable: true),
                    InfluenceNotes = table.Column<string>(type: "TEXT", nullable: true),
                    MajorConsequences = table.Column<string>(type: "TEXT", nullable: true),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ColonyStates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FactionGoals",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    FactionId = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    ConditionType = table.Column<int>(type: "INTEGER", nullable: false),
                    Priority = table.Column<int>(type: "INTEGER", nullable: false),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false),
                    TargetEntityType = table.Column<int>(type: "INTEGER", nullable: true),
                    TargetEntityId = table.Column<string>(type: "TEXT", nullable: true),
                    TargetState = table.Column<string>(type: "TEXT", nullable: true),
                    TargetOwnerFactionId = table.Column<string>(type: "TEXT", nullable: true),
                    ChampionId = table.Column<string>(type: "TEXT", nullable: true),
                    TargetProperty = table.Column<string>(type: "TEXT", nullable: true),
                    TargetOperator = table.Column<string>(type: "TEXT", nullable: true),
                    TargetThreshold = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FactionGoals", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Factions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Represents = table.Column<string>(type: "TEXT", nullable: false),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    CoreTenet = table.Column<string>(type: "TEXT", nullable: false),
                    Focus = table.Column<string>(type: "TEXT", nullable: true),
                    CertainOf = table.Column<string>(type: "TEXT", nullable: false),
                    RightAbout = table.Column<string>(type: "TEXT", nullable: false),
                    AfraidOf = table.Column<string>(type: "TEXT", nullable: false),
                    WrongAbout = table.Column<string>(type: "TEXT", nullable: false),
                    Response = table.Column<string>(type: "TEXT", nullable: true),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    Origin = table.Column<string>(type: "TEXT", nullable: true),
                    FoundedAs = table.Column<string>(type: "TEXT", nullable: true),
                    Became = table.Column<string>(type: "TEXT", nullable: true),
                    PublicFace = table.Column<string>(type: "TEXT", nullable: true),
                    SelfImage = table.Column<string>(type: "TEXT", nullable: true),
                    BeliefC = table.Column<int>(type: "INTEGER", nullable: true),
                    BeliefA = table.Column<int>(type: "INTEGER", nullable: true),
                    BeliefB = table.Column<int>(type: "INTEGER", nullable: true),
                    TruthValue = table.Column<double>(type: "REAL", nullable: false),
                    StabilityValue = table.Column<double>(type: "REAL", nullable: false),
                    AgencyValue = table.Column<double>(type: "REAL", nullable: false),
                    Active = table.Column<bool>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    Momentum = table.Column<int>(type: "INTEGER", nullable: false),
                    BaseLegitimacy = table.Column<int>(type: "INTEGER", nullable: false),
                    PowerModifier = table.Column<int>(type: "INTEGER", nullable: false),
                    AdditionalMemberCount = table.Column<int>(type: "INTEGER", nullable: false),
                    Motto = table.Column<string>(type: "TEXT", nullable: true),
                    History = table.Column<string>(type: "TEXT", nullable: true),
                    GlyphPath = table.Column<string>(type: "TEXT", nullable: true),
                    IconPath = table.Column<string>(type: "TEXT", nullable: true),
                    PrimaryColor = table.Column<string>(type: "TEXT", nullable: true),
                    SecondaryColor = table.Column<string>(type: "TEXT", nullable: true),
                    BannerShape = table.Column<string>(type: "TEXT", nullable: true),
                    LeaderId = table.Column<string>(type: "TEXT", nullable: true),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Factions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Locations",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    ParentLocationId = table.Column<string>(type: "TEXT", nullable: true),
                    State = table.Column<int>(type: "INTEGER", nullable: false),
                    LinkedAssetId = table.Column<string>(type: "TEXT", nullable: true),
                    LocationType = table.Column<string>(type: "TEXT", nullable: true),
                    MarkerColor = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Locations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NarrativeEntityLinks",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    OwnerType = table.Column<int>(type: "INTEGER", nullable: false),
                    OwnerId = table.Column<string>(type: "TEXT", nullable: false),
                    EntityType = table.Column<int>(type: "INTEGER", nullable: false),
                    EntityId = table.Column<string>(type: "TEXT", nullable: false),
                    Role = table.Column<string>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    IsPrimary = table.Column<bool>(type: "INTEGER", nullable: false),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NarrativeEntityLinks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NarrativeEventConnections",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    SourceNarrativeEventId = table.Column<string>(type: "TEXT", nullable: false),
                    TargetNarrativeEventId = table.Column<string>(type: "TEXT", nullable: false),
                    Label = table.Column<string>(type: "TEXT", nullable: true),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NarrativeEventConnections", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NarrativeEventOverrides",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    NarrativeEventId = table.Column<string>(type: "TEXT", nullable: false),
                    OverridesSummary = table.Column<bool>(type: "INTEGER", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    OverridesDescription = table.Column<bool>(type: "INTEGER", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    OverridesConnections = table.Column<bool>(type: "INTEGER", nullable: false),
                    OverridesThreads = table.Column<bool>(type: "INTEGER", nullable: false),
                    OverridesAssets = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NarrativeEventOverrides", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NarrativeEventPlacements",
                columns: table => new
                {
                    NarrativeEventId = table.Column<string>(type: "TEXT", nullable: false),
                    X = table.Column<double>(type: "REAL", nullable: false),
                    Y = table.Column<double>(type: "REAL", nullable: false),
                    Width = table.Column<double>(type: "REAL", nullable: true),
                    Height = table.Column<double>(type: "REAL", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NarrativeEventPlacements", x => x.NarrativeEventId);
                });

            migrationBuilder.CreateTable(
                name: "NarrativeEventRealizations",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    NarrativeEventId = table.Column<string>(type: "TEXT", nullable: false),
                    SessionEventId = table.Column<string>(type: "TEXT", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NarrativeEventRealizations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NarrativeEvents",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    NarrativeFunction = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NarrativeEvents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NarrativeThreadEvents",
                columns: table => new
                {
                    NarrativeThreadId = table.Column<string>(type: "TEXT", nullable: false),
                    NarrativeEventId = table.Column<string>(type: "TEXT", nullable: false),
                    IsPrimary = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NarrativeThreadEvents", x => new { x.NarrativeThreadId, x.NarrativeEventId });
                });

            migrationBuilder.CreateTable(
                name: "NarrativeThreads",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    State = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NarrativeThreads", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PathSets",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    OriginEventId = table.Column<string>(type: "TEXT", nullable: true),
                    ConvergenceEventId = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PathSets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RelationshipOverrides",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    SourceId = table.Column<string>(type: "TEXT", nullable: false),
                    TargetId = table.Column<string>(type: "TEXT", nullable: false),
                    ScoreBump = table.Column<int>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RelationshipOverrides", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RulesConfigs",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    BeliefMatch = table.Column<double>(type: "REAL", nullable: false),
                    BeliefConflict = table.Column<double>(type: "REAL", nullable: false),
                    ValueAlignmentScale = table.Column<double>(type: "REAL", nullable: false),
                    ValueConflictScale = table.Column<double>(type: "REAL", nullable: false),
                    StressPositiveMultiplierPerPoint = table.Column<double>(type: "REAL", nullable: false),
                    StressNegativeMultiplierPerPoint = table.Column<double>(type: "REAL", nullable: false),
                    PositiveEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    NegativeEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    StressWeightEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    StressWeightCurve = table.Column<int>(type: "INTEGER", nullable: false),
                    StressWeightIntensity = table.Column<double>(type: "REAL", nullable: false),
                    InfluenceConvictionScale = table.Column<double>(type: "REAL", nullable: false),
                    ThresholdsJson = table.Column<string>(type: "TEXT", nullable: false),
                    ValueLabelsJson = table.Column<string>(type: "TEXT", nullable: false),
                    BeliefAxisLabelsJson = table.Column<string>(type: "TEXT", nullable: false),
                    CascadeRulesJson = table.Column<string>(type: "TEXT", nullable: false),
                    StressTriggersJson = table.Column<string>(type: "TEXT", nullable: false),
                    FormulasJson = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RulesConfigs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SessionLog",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Act = table.Column<int>(type: "INTEGER", nullable: false),
                    Week = table.Column<int>(type: "INTEGER", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    PartyActions = table.Column<string>(type: "TEXT", nullable: true),
                    FactionChanges = table.Column<string>(type: "TEXT", nullable: true),
                    ColonyStressChange = table.Column<int>(type: "INTEGER", nullable: false),
                    RelationshipBumps = table.Column<string>(type: "TEXT", nullable: true),
                    FutureConsequences = table.Column<string>(type: "TEXT", nullable: true),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionLog", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Sessions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Number = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Act = table.Column<int>(type: "INTEGER", nullable: false),
                    Week = table.Column<int>(type: "INTEGER", nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AppSettings",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    ActiveCampaignId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppSettings_Campaigns_ActiveCampaignId",
                        column: x => x.ActiveCampaignId,
                        principalTable: "Campaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MapPlacements",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    MapId = table.Column<string>(type: "TEXT", nullable: false),
                    SubjectType = table.Column<int>(type: "INTEGER", nullable: false),
                    SubjectId = table.Column<string>(type: "TEXT", nullable: false),
                    GeometryType = table.Column<int>(type: "INTEGER", nullable: false),
                    GeometryData = table.Column<string>(type: "TEXT", nullable: false),
                    IsHidden = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MapPlacements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MapPlacements_ColonyMaps_MapId",
                        column: x => x.MapId,
                        principalTable: "ColonyMaps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EventOverrideConnections",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    EventOverrideId = table.Column<string>(type: "TEXT", nullable: false),
                    TargetNarrativeEventId = table.Column<string>(type: "TEXT", nullable: false),
                    Label = table.Column<string>(type: "TEXT", nullable: true),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventOverrideConnections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EventOverrideConnections_NarrativeEventOverrides_EventOverrideId",
                        column: x => x.EventOverrideId,
                        principalTable: "NarrativeEventOverrides",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EventOverrideEntityLinks",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    EventOverrideId = table.Column<string>(type: "TEXT", nullable: false),
                    EntityType = table.Column<int>(type: "INTEGER", nullable: false),
                    EntityId = table.Column<string>(type: "TEXT", nullable: false),
                    Role = table.Column<string>(type: "TEXT", nullable: true),
                    IsPrimary = table.Column<bool>(type: "INTEGER", nullable: false),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventOverrideEntityLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EventOverrideEntityLinks_NarrativeEventOverrides_EventOverrideId",
                        column: x => x.EventOverrideId,
                        principalTable: "NarrativeEventOverrides",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EventOverrideThreads",
                columns: table => new
                {
                    EventOverrideId = table.Column<string>(type: "TEXT", nullable: false),
                    NarrativeThreadId = table.Column<string>(type: "TEXT", nullable: false),
                    IsPrimary = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventOverrideThreads", x => new { x.EventOverrideId, x.NarrativeThreadId });
                    table.ForeignKey(
                        name: "FK_EventOverrideThreads_NarrativeEventOverrides_EventOverrideId",
                        column: x => x.EventOverrideId,
                        principalTable: "NarrativeEventOverrides",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NarrativeEventVariantParticipations",
                columns: table => new
                {
                    NarrativeEventId = table.Column<string>(type: "TEXT", nullable: false),
                    PathSetId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NarrativeEventVariantParticipations", x => new { x.NarrativeEventId, x.PathSetId });
                    table.ForeignKey(
                        name: "FK_NarrativeEventVariantParticipations_PathSets_PathSetId",
                        column: x => x.PathSetId,
                        principalTable: "PathSets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NarrativePaths",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    PathSetId = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NarrativePaths", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NarrativePaths_PathSets_PathSetId",
                        column: x => x.PathSetId,
                        principalTable: "PathSets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PathSetContexts",
                columns: table => new
                {
                    PathSetId = table.Column<string>(type: "TEXT", nullable: false),
                    RequiredPathId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PathSetContexts", x => new { x.PathSetId, x.RequiredPathId });
                    table.ForeignKey(
                        name: "FK_PathSetContexts_PathSets_PathSetId",
                        column: x => x.PathSetId,
                        principalTable: "PathSets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Events",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    SessionId = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    IsSynthetic = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Events", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Events_Sessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "Sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EventOverridePaths",
                columns: table => new
                {
                    EventOverrideId = table.Column<string>(type: "TEXT", nullable: false),
                    PathId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventOverridePaths", x => new { x.EventOverrideId, x.PathId });
                    table.ForeignKey(
                        name: "FK_EventOverridePaths_NarrativeEventOverrides_EventOverrideId",
                        column: x => x.EventOverrideId,
                        principalTable: "NarrativeEventOverrides",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EventOverridePaths_NarrativePaths_PathId",
                        column: x => x.PathId,
                        principalTable: "NarrativePaths",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PathEventScopes",
                columns: table => new
                {
                    PathId = table.Column<string>(type: "TEXT", nullable: false),
                    NarrativeEventId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PathEventScopes", x => new { x.PathId, x.NarrativeEventId });
                    table.ForeignKey(
                        name: "FK_PathEventScopes_NarrativePaths_PathId",
                        column: x => x.PathId,
                        principalTable: "NarrativePaths",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EventEffects",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    EventId = table.Column<string>(type: "TEXT", nullable: false),
                    TargetType = table.Column<string>(type: "TEXT", nullable: false),
                    TargetId = table.Column<string>(type: "TEXT", nullable: false),
                    Property = table.Column<string>(type: "TEXT", nullable: false),
                    Delta = table.Column<double>(type: "REAL", nullable: false),
                    Value = table.Column<string>(type: "TEXT", nullable: true),
                    SecondaryTargetId = table.Column<string>(type: "TEXT", nullable: true),
                    ActorFactionId = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventEffects", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EventEffects_Events_EventId",
                        column: x => x.EventId,
                        principalTable: "Events",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppSettings_ActiveCampaignId",
                table: "AppSettings",
                column: "ActiveCampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_EventEffects_EventId",
                table: "EventEffects",
                column: "EventId");

            migrationBuilder.CreateIndex(
                name: "IX_EventOverrideConnections_EventOverrideId",
                table: "EventOverrideConnections",
                column: "EventOverrideId");

            migrationBuilder.CreateIndex(
                name: "IX_EventOverrideEntityLinks_EventOverrideId",
                table: "EventOverrideEntityLinks",
                column: "EventOverrideId");

            migrationBuilder.CreateIndex(
                name: "IX_EventOverridePaths_PathId",
                table: "EventOverridePaths",
                column: "PathId");

            migrationBuilder.CreateIndex(
                name: "IX_Events_SessionId",
                table: "Events",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_MapPlacements_MapId",
                table: "MapPlacements",
                column: "MapId");

            migrationBuilder.CreateIndex(
                name: "IX_NarrativeEventVariantParticipations_PathSetId",
                table: "NarrativeEventVariantParticipations",
                column: "PathSetId");

            migrationBuilder.CreateIndex(
                name: "IX_NarrativePaths_PathSetId",
                table: "NarrativePaths",
                column: "PathSetId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppSettings");

            migrationBuilder.DropTable(
                name: "Assets");

            migrationBuilder.DropTable(
                name: "CharacterDetails");

            migrationBuilder.DropTable(
                name: "CharacterNarrativeProfiles");

            migrationBuilder.DropTable(
                name: "CharacterRelationships");

            migrationBuilder.DropTable(
                name: "Characters");

            migrationBuilder.DropTable(
                name: "ColonyStates");

            migrationBuilder.DropTable(
                name: "EventEffects");

            migrationBuilder.DropTable(
                name: "EventOverrideConnections");

            migrationBuilder.DropTable(
                name: "EventOverrideEntityLinks");

            migrationBuilder.DropTable(
                name: "EventOverridePaths");

            migrationBuilder.DropTable(
                name: "EventOverrideThreads");

            migrationBuilder.DropTable(
                name: "FactionGoals");

            migrationBuilder.DropTable(
                name: "Factions");

            migrationBuilder.DropTable(
                name: "Locations");

            migrationBuilder.DropTable(
                name: "MapPlacements");

            migrationBuilder.DropTable(
                name: "NarrativeEntityLinks");

            migrationBuilder.DropTable(
                name: "NarrativeEventConnections");

            migrationBuilder.DropTable(
                name: "NarrativeEventPlacements");

            migrationBuilder.DropTable(
                name: "NarrativeEventRealizations");

            migrationBuilder.DropTable(
                name: "NarrativeEvents");

            migrationBuilder.DropTable(
                name: "NarrativeEventVariantParticipations");

            migrationBuilder.DropTable(
                name: "NarrativeThreadEvents");

            migrationBuilder.DropTable(
                name: "NarrativeThreads");

            migrationBuilder.DropTable(
                name: "PathEventScopes");

            migrationBuilder.DropTable(
                name: "PathSetContexts");

            migrationBuilder.DropTable(
                name: "RelationshipOverrides");

            migrationBuilder.DropTable(
                name: "RulesConfigs");

            migrationBuilder.DropTable(
                name: "SessionLog");

            migrationBuilder.DropTable(
                name: "Campaigns");

            migrationBuilder.DropTable(
                name: "Events");

            migrationBuilder.DropTable(
                name: "NarrativeEventOverrides");

            migrationBuilder.DropTable(
                name: "ColonyMaps");

            migrationBuilder.DropTable(
                name: "NarrativePaths");

            migrationBuilder.DropTable(
                name: "Sessions");

            migrationBuilder.DropTable(
                name: "PathSets");
        }
    }
}
