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
                    ControllingFactionId = table.Column<string>(type: "TEXT", nullable: true),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    Keystone = table.Column<bool>(type: "INTEGER", nullable: false),
                    Location = table.Column<string>(type: "TEXT", nullable: true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Role = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    Tier = table.Column<int>(type: "INTEGER", nullable: false)
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
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Campaigns", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Characters",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Age = table.Column<int>(type: "INTEGER", nullable: true),
                    AgencyValue = table.Column<double>(type: "REAL", nullable: false),
                    Ancestry = table.Column<string>(type: "TEXT", nullable: true),
                    Background = table.Column<string>(type: "TEXT", nullable: true),
                    BeliefA = table.Column<int>(type: "INTEGER", nullable: true),
                    BeliefB = table.Column<int>(type: "INTEGER", nullable: true),
                    BeliefC = table.Column<int>(type: "INTEGER", nullable: true),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    CharacterType = table.Column<int>(type: "INTEGER", nullable: false),
                    Class = table.Column<string>(type: "TEXT", nullable: true),
                    Conviction = table.Column<int>(type: "INTEGER", nullable: false),
                    DoubtDirection = table.Column<int>(type: "INTEGER", nullable: true),
                    FactionId = table.Column<string>(type: "TEXT", nullable: true),
                    Fears = table.Column<string>(type: "TEXT", nullable: true),
                    Gender = table.Column<string>(type: "TEXT", nullable: true),
                    Goals = table.Column<string>(type: "TEXT", nullable: true),
                    Heritage = table.Column<string>(type: "TEXT", nullable: true),
                    Impressionable = table.Column<int>(type: "INTEGER", nullable: false),
                    Influence = table.Column<int>(type: "INTEGER", nullable: false),
                    Level = table.Column<int>(type: "INTEGER", nullable: true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    Occupation = table.Column<string>(type: "TEXT", nullable: true),
                    PortraitPath = table.Column<string>(type: "TEXT", nullable: true),
                    Pressure = table.Column<int>(type: "INTEGER", nullable: false),
                    SocialClassId = table.Column<string>(type: "TEXT", nullable: true),
                    StabilityValue = table.Column<double>(type: "REAL", nullable: false),
                    State = table.Column<int>(type: "INTEGER", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    TruthValue = table.Column<double>(type: "REAL", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Characters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ColonyStates",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Act = table.Column<int>(type: "INTEGER", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    ColonyStress = table.Column<int>(type: "INTEGER", nullable: false),
                    DominantFactions = table.Column<string>(type: "TEXT", nullable: true),
                    InfluenceNotes = table.Column<string>(type: "TEXT", nullable: true),
                    MajorConsequences = table.Column<string>(type: "TEXT", nullable: true),
                    PartyAgencyValue = table.Column<double>(type: "REAL", nullable: false),
                    PartyBeliefA = table.Column<int>(type: "INTEGER", nullable: false),
                    PartyBeliefB = table.Column<int>(type: "INTEGER", nullable: false),
                    PartyBeliefC = table.Column<int>(type: "INTEGER", nullable: false),
                    PartyName = table.Column<string>(type: "TEXT", nullable: false),
                    PartyStabilityValue = table.Column<double>(type: "REAL", nullable: false),
                    PartyTruthValue = table.Column<double>(type: "REAL", nullable: false),
                    SessionSummary = table.Column<string>(type: "TEXT", nullable: true),
                    Week = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ColonyStates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EventEffects",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Delta = table.Column<double>(type: "REAL", nullable: false),
                    EventId = table.Column<string>(type: "TEXT", nullable: false),
                    Property = table.Column<string>(type: "TEXT", nullable: false),
                    SecondaryTargetId = table.Column<string>(type: "TEXT", nullable: true),
                    TargetId = table.Column<string>(type: "TEXT", nullable: false),
                    TargetType = table.Column<string>(type: "TEXT", nullable: false),
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

            migrationBuilder.CreateTable(
                name: "FactionGoals",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    FactionId = table.Column<string>(type: "TEXT", nullable: false),
                    Priority = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    TargetEntityId = table.Column<string>(type: "TEXT", nullable: true),
                    TargetEntityType = table.Column<int>(type: "INTEGER", nullable: true),
                    TargetOperator = table.Column<string>(type: "TEXT", nullable: true),
                    TargetProperty = table.Column<string>(type: "TEXT", nullable: true),
                    TargetState = table.Column<string>(type: "TEXT", nullable: true),
                    TargetThreshold = table.Column<int>(type: "INTEGER", nullable: true),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false)
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
                    Active = table.Column<bool>(type: "INTEGER", nullable: false),
                    AdditionalMemberCount = table.Column<int>(type: "INTEGER", nullable: false),
                    AfraidOf = table.Column<string>(type: "TEXT", nullable: false),
                    AgencyValue = table.Column<double>(type: "REAL", nullable: false),
                    BannerShape = table.Column<string>(type: "TEXT", nullable: true),
                    BaseLegitimacy = table.Column<int>(type: "INTEGER", nullable: false),
                    Became = table.Column<string>(type: "TEXT", nullable: true),
                    BeliefA = table.Column<int>(type: "INTEGER", nullable: true),
                    BeliefB = table.Column<int>(type: "INTEGER", nullable: true),
                    BeliefC = table.Column<int>(type: "INTEGER", nullable: true),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    CertainOf = table.Column<string>(type: "TEXT", nullable: false),
                    CoreTenet = table.Column<string>(type: "TEXT", nullable: false),
                    Focus = table.Column<string>(type: "TEXT", nullable: true),
                    FoundedAs = table.Column<string>(type: "TEXT", nullable: true),
                    GlyphPath = table.Column<string>(type: "TEXT", nullable: true),
                    History = table.Column<string>(type: "TEXT", nullable: true),
                    IconPath = table.Column<string>(type: "TEXT", nullable: true),
                    PrimaryColor = table.Column<string>(type: "TEXT", nullable: true),
                    SecondaryColor = table.Column<string>(type: "TEXT", nullable: true),
                    Momentum = table.Column<int>(type: "INTEGER", nullable: false),
                    Motto = table.Column<string>(type: "TEXT", nullable: true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    Origin = table.Column<string>(type: "TEXT", nullable: true),
                    PowerModifier = table.Column<int>(type: "INTEGER", nullable: false),
                    PublicFace = table.Column<string>(type: "TEXT", nullable: true),
                    Represents = table.Column<string>(type: "TEXT", nullable: false),
                    Response = table.Column<string>(type: "TEXT", nullable: true),
                    RightAbout = table.Column<string>(type: "TEXT", nullable: false),
                    SelfImage = table.Column<string>(type: "TEXT", nullable: true),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    StabilityValue = table.Column<double>(type: "REAL", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    TruthValue = table.Column<double>(type: "REAL", nullable: false),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    WrongAbout = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Factions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RelationshipOverrides",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    ScoreBump = table.Column<int>(type: "INTEGER", nullable: false),
                    SourceId = table.Column<string>(type: "TEXT", nullable: false),
                    TargetId = table.Column<string>(type: "TEXT", nullable: false)
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
                    BeliefAxisLabelsJson = table.Column<string>(type: "TEXT", nullable: false),
                    BeliefConflict = table.Column<double>(type: "REAL", nullable: false),
                    BeliefMatch = table.Column<double>(type: "REAL", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    CascadeRulesJson = table.Column<string>(type: "TEXT", nullable: false),
                    FormulasJson = table.Column<string>(type: "TEXT", nullable: false),
                    InfluenceConvictionScale = table.Column<double>(type: "REAL", nullable: false),
                    NegativeEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    PositiveEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    StressNegativeMultiplierPerPoint = table.Column<double>(type: "REAL", nullable: false),
                    StressPositiveMultiplierPerPoint = table.Column<double>(type: "REAL", nullable: false),
                    StressTriggersJson = table.Column<string>(type: "TEXT", nullable: false),
                    StressWeightCurve = table.Column<int>(type: "INTEGER", nullable: false),
                    StressWeightEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    StressWeightIntensity = table.Column<double>(type: "REAL", nullable: false),
                    ThresholdsJson = table.Column<string>(type: "TEXT", nullable: false),
                    ValueAlignmentScale = table.Column<double>(type: "REAL", nullable: false),
                    ValueConflictScale = table.Column<double>(type: "REAL", nullable: false),
                    ValueLabelsJson = table.Column<string>(type: "TEXT", nullable: false)
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
                    Act = table.Column<int>(type: "INTEGER", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    ColonyStressChange = table.Column<int>(type: "INTEGER", nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    FactionChanges = table.Column<string>(type: "TEXT", nullable: true),
                    FutureConsequences = table.Column<string>(type: "TEXT", nullable: true),
                    PartyActions = table.Column<string>(type: "TEXT", nullable: true),
                    RelationshipBumps = table.Column<string>(type: "TEXT", nullable: true),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    Week = table.Column<int>(type: "INTEGER", nullable: false)
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
                    Act = table.Column<int>(type: "INTEGER", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Number = table.Column<int>(type: "INTEGER", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    Week = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Events",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    SessionId = table.Column<string>(type: "TEXT", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false)
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

            migrationBuilder.CreateIndex(
                name: "IX_AppSettings_ActiveCampaignId",
                table: "AppSettings",
                column: "ActiveCampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_Events_SessionId",
                table: "Events",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_EventEffects_EventId",
                table: "EventEffects",
                column: "EventId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "AppSettings");
            migrationBuilder.DropTable(name: "Assets");
            migrationBuilder.DropTable(name: "Characters");
            migrationBuilder.DropTable(name: "ColonyStates");
            migrationBuilder.DropTable(name: "EventEffects");
            migrationBuilder.DropTable(name: "FactionGoals");
            migrationBuilder.DropTable(name: "Factions");
            migrationBuilder.DropTable(name: "RelationshipOverrides");
            migrationBuilder.DropTable(name: "RulesConfigs");
            migrationBuilder.DropTable(name: "SessionLog");
            migrationBuilder.DropTable(name: "Events");
            migrationBuilder.DropTable(name: "Sessions");
            migrationBuilder.DropTable(name: "Campaigns");
        }
    }
}
