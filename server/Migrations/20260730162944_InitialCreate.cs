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
                name: "Sessions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    Number = table.Column<int>(type: "INTEGER", nullable: false),
                    Act = table.Column<int>(type: "INTEGER", nullable: false),
                    Week = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sessions", x => x.Id);
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
                    IsHero = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ColonyMaps", x => x.Id);
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
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    ControllingFactionId = table.Column<string>(type: "TEXT", nullable: true),
                    StatusActorFactionId = table.Column<string>(type: "TEXT", nullable: true),
                    LocationId = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Assets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Characters",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    CharacterType = table.Column<int>(type: "INTEGER", nullable: false),
                    NarrativeTier = table.Column<int>(type: "INTEGER", nullable: false),
                    State = table.Column<int>(type: "INTEGER", nullable: false),
                    Gender = table.Column<string>(type: "TEXT", nullable: true),
                    Pronouns = table.Column<string>(type: "TEXT", nullable: true),
                    Age = table.Column<int>(type: "INTEGER", nullable: true),
                    Ancestry = table.Column<string>(type: "TEXT", nullable: true),
                    Heritage = table.Column<string>(type: "TEXT", nullable: true),
                    Class = table.Column<string>(type: "TEXT", nullable: true),
                    Level = table.Column<int>(type: "INTEGER", nullable: true),
                    Occupation = table.Column<string>(type: "TEXT", nullable: true),
                    SocialClassId = table.Column<string>(type: "TEXT", nullable: true),
                    FactionId = table.Column<string>(type: "TEXT", nullable: true),
                    Background = table.Column<string>(type: "TEXT", nullable: true),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    Aliases = table.Column<string>(type: "TEXT", nullable: true),
                    PortraitPath = table.Column<string>(type: "TEXT", nullable: true),
                    Influence = table.Column<int>(type: "INTEGER", nullable: false),
                    Impressionable = table.Column<int>(type: "INTEGER", nullable: false),
                    Pressure = table.Column<int>(type: "INTEGER", nullable: false),
                    Conviction = table.Column<int>(type: "INTEGER", nullable: false),
                    DoubtDirection = table.Column<int>(type: "INTEGER", nullable: true),
                    BeliefA = table.Column<int>(type: "INTEGER", nullable: true),
                    BeliefB = table.Column<int>(type: "INTEGER", nullable: true),
                    BeliefC = table.Column<int>(type: "INTEGER", nullable: true),
                    AgencyValue = table.Column<double>(type: "REAL", nullable: false),
                    StabilityValue = table.Column<double>(type: "REAL", nullable: false),
                    TruthValue = table.Column<double>(type: "REAL", nullable: false),
                    LocationId = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Characters", x => x.Id);
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
                    Motivation = table.Column<string>(type: "TEXT", nullable: true),
                    NarrativeRole = table.Column<string>(type: "TEXT", nullable: true),
                    Personality = table.Column<string>(type: "TEXT", nullable: true),
                    Fears = table.Column<string>(type: "TEXT", nullable: true),
                    BlindSpot = table.Column<string>(type: "TEXT", nullable: true),
                    PrimaryProtection = table.Column<string>(type: "TEXT", nullable: true),
                    PressureResponse = table.Column<string>(type: "TEXT", nullable: true),
                    SignatureObject = table.Column<string>(type: "TEXT", nullable: true),
                    SignatureQuote = table.Column<string>(type: "TEXT", nullable: true),
                    PortrayalNotes = table.Column<string>(type: "TEXT", nullable: true),
                    PerformanceInspiration = table.Column<string>(type: "TEXT", nullable: true),
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
                    State = table.Column<int>(type: "INTEGER", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CharacterRelationships", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ColonyStates",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    Act = table.Column<int>(type: "INTEGER", nullable: false),
                    Week = table.Column<int>(type: "INTEGER", nullable: false),
                    ColonyStress = table.Column<int>(type: "INTEGER", nullable: false),
                    PartyName = table.Column<string>(type: "TEXT", nullable: false),
                    PartyBeliefA = table.Column<int>(type: "INTEGER", nullable: false),
                    PartyBeliefB = table.Column<int>(type: "INTEGER", nullable: false),
                    PartyBeliefC = table.Column<int>(type: "INTEGER", nullable: false),
                    PartyAgencyValue = table.Column<double>(type: "REAL", nullable: false),
                    PartyStabilityValue = table.Column<double>(type: "REAL", nullable: false),
                    PartyTruthValue = table.Column<double>(type: "REAL", nullable: false),
                    DominantFactions = table.Column<string>(type: "TEXT", nullable: true),
                    InfluenceNotes = table.Column<string>(type: "TEXT", nullable: true),
                    MajorConsequences = table.Column<string>(type: "TEXT", nullable: true),
                    SessionSummary = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ColonyStates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Factions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Active = table.Column<bool>(type: "INTEGER", nullable: false),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    CoreTenet = table.Column<string>(type: "TEXT", nullable: false),
                    Represents = table.Column<string>(type: "TEXT", nullable: false),
                    AfraidOf = table.Column<string>(type: "TEXT", nullable: false),
                    CertainOf = table.Column<string>(type: "TEXT", nullable: false),
                    RightAbout = table.Column<string>(type: "TEXT", nullable: false),
                    WrongAbout = table.Column<string>(type: "TEXT", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    History = table.Column<string>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    Origin = table.Column<string>(type: "TEXT", nullable: true),
                    FoundedAs = table.Column<string>(type: "TEXT", nullable: true),
                    Became = table.Column<string>(type: "TEXT", nullable: true),
                    PublicFace = table.Column<string>(type: "TEXT", nullable: true),
                    SelfImage = table.Column<string>(type: "TEXT", nullable: true),
                    Focus = table.Column<string>(type: "TEXT", nullable: true),
                    Response = table.Column<string>(type: "TEXT", nullable: true),
                    Motto = table.Column<string>(type: "TEXT", nullable: true),
                    LeaderId = table.Column<string>(type: "TEXT", nullable: true),
                    BaseLegitimacy = table.Column<int>(type: "INTEGER", nullable: false),
                    Momentum = table.Column<int>(type: "INTEGER", nullable: false),
                    PowerModifier = table.Column<int>(type: "INTEGER", nullable: false),
                    AdditionalMemberCount = table.Column<int>(type: "INTEGER", nullable: false),
                    BeliefA = table.Column<int>(type: "INTEGER", nullable: true),
                    BeliefB = table.Column<int>(type: "INTEGER", nullable: true),
                    BeliefC = table.Column<int>(type: "INTEGER", nullable: true),
                    AgencyValue = table.Column<double>(type: "REAL", nullable: false),
                    StabilityValue = table.Column<double>(type: "REAL", nullable: false),
                    TruthValue = table.Column<double>(type: "REAL", nullable: false),
                    PrimaryColor = table.Column<string>(type: "TEXT", nullable: true),
                    SecondaryColor = table.Column<string>(type: "TEXT", nullable: true),
                    BannerShape = table.Column<string>(type: "TEXT", nullable: true),
                    IconPath = table.Column<string>(type: "TEXT", nullable: true),
                    GlyphPath = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Factions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FactionGoals",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    FactionId = table.Column<string>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Priority = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false),
                    ConditionType = table.Column<int>(type: "INTEGER", nullable: false),
                    TargetProperty = table.Column<string>(type: "TEXT", nullable: true),
                    TargetEntityId = table.Column<string>(type: "TEXT", nullable: true),
                    TargetEntityType = table.Column<int>(type: "INTEGER", nullable: true),
                    TargetOwnerFactionId = table.Column<string>(type: "TEXT", nullable: true),
                    TargetOperator = table.Column<string>(type: "TEXT", nullable: true),
                    TargetThreshold = table.Column<int>(type: "INTEGER", nullable: true),
                    TargetState = table.Column<string>(type: "TEXT", nullable: true),
                    ChampionId = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FactionGoals", x => x.Id);
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
                name: "RelationshipOverrides",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    SourceId = table.Column<string>(type: "TEXT", nullable: false),
                    TargetId = table.Column<string>(type: "TEXT", nullable: false),
                    ScoreBump = table.Column<int>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true)
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
                    BeliefAxisLabelsJson = table.Column<string>(type: "TEXT", nullable: false),
                    BeliefMatch = table.Column<double>(type: "REAL", nullable: false),
                    BeliefConflict = table.Column<double>(type: "REAL", nullable: false),
                    ValueLabelsJson = table.Column<string>(type: "TEXT", nullable: false),
                    ValueAlignmentScale = table.Column<double>(type: "REAL", nullable: false),
                    ValueConflictScale = table.Column<double>(type: "REAL", nullable: false),
                    InfluenceConvictionScale = table.Column<double>(type: "REAL", nullable: false),
                    PositiveEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    NegativeEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    StressWeightEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    StressWeightCurve = table.Column<int>(type: "INTEGER", nullable: false),
                    StressWeightIntensity = table.Column<double>(type: "REAL", nullable: false),
                    StressPositiveMultiplierPerPoint = table.Column<double>(type: "REAL", nullable: false),
                    StressNegativeMultiplierPerPoint = table.Column<double>(type: "REAL", nullable: false),
                    ThresholdsJson = table.Column<string>(type: "TEXT", nullable: false),
                    FormulasJson = table.Column<string>(type: "TEXT", nullable: false),
                    CascadeRulesJson = table.Column<string>(type: "TEXT", nullable: false),
                    StressTriggersJson = table.Column<string>(type: "TEXT", nullable: false)
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
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    Act = table.Column<int>(type: "INTEGER", nullable: false),
                    Week = table.Column<int>(type: "INTEGER", nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ColonyStressChange = table.Column<int>(type: "INTEGER", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    PartyActions = table.Column<string>(type: "TEXT", nullable: true),
                    FactionChanges = table.Column<string>(type: "TEXT", nullable: true),
                    RelationshipBumps = table.Column<string>(type: "TEXT", nullable: true),
                    FutureConsequences = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionLog", x => x.Id);
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
                    IsSynthetic = table.Column<bool>(type: "INTEGER", nullable: false, defaultValue: false)
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
                name: "EventEffects",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    EventId = table.Column<string>(type: "TEXT", nullable: false),
                    TargetType = table.Column<string>(type: "TEXT", nullable: false),
                    TargetId = table.Column<string>(type: "TEXT", nullable: false),
                    SecondaryTargetId = table.Column<string>(type: "TEXT", nullable: true),
                    ActorFactionId = table.Column<string>(type: "TEXT", nullable: true),
                    Property = table.Column<string>(type: "TEXT", nullable: false),
                    Delta = table.Column<double>(type: "REAL", nullable: false),
                    Value = table.Column<string>(type: "TEXT", nullable: true)
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
                name: "IX_Events_SessionId",
                table: "Events",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_MapPlacements_MapId",
                table: "MapPlacements",
                column: "MapId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "AppSettings");
            migrationBuilder.DropTable(name: "Assets");
            migrationBuilder.DropTable(name: "CharacterDetails");
            migrationBuilder.DropTable(name: "CharacterNarrativeProfiles");
            migrationBuilder.DropTable(name: "CharacterRelationships");
            migrationBuilder.DropTable(name: "ColonyStates");
            migrationBuilder.DropTable(name: "EventEffects");
            migrationBuilder.DropTable(name: "Events");
            migrationBuilder.DropTable(name: "FactionGoals");
            migrationBuilder.DropTable(name: "Factions");
            migrationBuilder.DropTable(name: "Locations");
            migrationBuilder.DropTable(name: "MapPlacements");
            migrationBuilder.DropTable(name: "RelationshipOverrides");
            migrationBuilder.DropTable(name: "RulesConfigs");
            migrationBuilder.DropTable(name: "SessionLog");
            migrationBuilder.DropTable(name: "Characters");
            migrationBuilder.DropTable(name: "ColonyMaps");
            migrationBuilder.DropTable(name: "Sessions");
            migrationBuilder.DropTable(name: "Campaigns");
        }
    }
}
