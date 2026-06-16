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
                name: "ColonyStates",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Act = table.Column<int>(type: "INTEGER", nullable: false),
                    Week = table.Column<int>(type: "INTEGER", nullable: false),
                    ColonyStress = table.Column<int>(type: "INTEGER", nullable: false),
                    PartyRitual = table.Column<int>(type: "INTEGER", nullable: false),
                    PartyKnowledge = table.Column<int>(type: "INTEGER", nullable: false),
                    PartyChange = table.Column<int>(type: "INTEGER", nullable: false),
                    PartyDesires = table.Column<int>(type: "INTEGER", nullable: false),
                    PartyMaintains = table.Column<int>(type: "INTEGER", nullable: false),
                    PartySacrifices = table.Column<int>(type: "INTEGER", nullable: false),
                    SessionSummary = table.Column<string>(type: "TEXT", nullable: true),
                    DominantFactions = table.Column<string>(type: "TEXT", nullable: true),
                    InfluenceNotes = table.Column<string>(type: "TEXT", nullable: true),
                    MajorConsequences = table.Column<string>(type: "TEXT", nullable: true)
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
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Represents = table.Column<string>(type: "TEXT", nullable: false),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    CoreTenet = table.Column<string>(type: "TEXT", nullable: false),
                    CertainOf = table.Column<string>(type: "TEXT", nullable: false),
                    RightAbout = table.Column<string>(type: "TEXT", nullable: false),
                    AfraidOf = table.Column<string>(type: "TEXT", nullable: false),
                    WrongAbout = table.Column<string>(type: "TEXT", nullable: false),
                    SingleSentence = table.Column<string>(type: "TEXT", nullable: false),
                    PrimaryTension = table.Column<string>(type: "TEXT", nullable: false),
                    Ritual = table.Column<int>(type: "INTEGER", nullable: true),
                    Knowledge = table.Column<int>(type: "INTEGER", nullable: true),
                    Change = table.Column<int>(type: "INTEGER", nullable: true),
                    Desires = table.Column<int>(type: "INTEGER", nullable: true),
                    Maintains = table.Column<int>(type: "INTEGER", nullable: true),
                    Sacrifices = table.Column<int>(type: "INTEGER", nullable: true),
                    Active = table.Column<bool>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: true)
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
                    RitualMatch = table.Column<double>(type: "REAL", nullable: false),
                    RitualConflict = table.Column<double>(type: "REAL", nullable: false),
                    KnowledgeMatch = table.Column<double>(type: "REAL", nullable: false),
                    KnowledgeConflict = table.Column<double>(type: "REAL", nullable: false),
                    ChangeMatch = table.Column<double>(type: "REAL", nullable: false),
                    ChangeConflict = table.Column<double>(type: "REAL", nullable: false),
                    SharedDesire = table.Column<double>(type: "REAL", nullable: false),
                    SharedMaintains = table.Column<double>(type: "REAL", nullable: false),
                    DesireVsSacrifice = table.Column<double>(type: "REAL", nullable: false),
                    MaintainsVsSacrifice = table.Column<double>(type: "REAL", nullable: false),
                    StabilityRitual = table.Column<double>(type: "REAL", nullable: false),
                    StabilityKnowledge = table.Column<double>(type: "REAL", nullable: false),
                    StabilityChange = table.Column<double>(type: "REAL", nullable: false),
                    TruthRitual = table.Column<double>(type: "REAL", nullable: false),
                    TruthKnowledge = table.Column<double>(type: "REAL", nullable: false),
                    TruthChange = table.Column<double>(type: "REAL", nullable: false),
                    AgencyRitual = table.Column<double>(type: "REAL", nullable: false),
                    AgencyKnowledge = table.Column<double>(type: "REAL", nullable: false),
                    AgencyChange = table.Column<double>(type: "REAL", nullable: false),
                    StressPositiveMultiplierPerPoint = table.Column<double>(type: "REAL", nullable: false),
                    StressNegativeMultiplierPerPoint = table.Column<double>(type: "REAL", nullable: false),
                    ThresholdsJson = table.Column<string>(type: "TEXT", nullable: false)
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
                    FutureConsequences = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SessionLog", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ColonyStates");

            migrationBuilder.DropTable(
                name: "Factions");

            migrationBuilder.DropTable(
                name: "RelationshipOverrides");

            migrationBuilder.DropTable(
                name: "RulesConfigs");

            migrationBuilder.DropTable(
                name: "SessionLog");
        }
    }
}
