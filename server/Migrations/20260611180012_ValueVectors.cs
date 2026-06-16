using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class ValueVectors : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AgencyChange",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "AgencyKnowledge",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "AgencyRitual",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "DesireVsSacrifice",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "MaintainsVsSacrifice",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "SharedDesire",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "SharedMaintains",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "StabilityChange",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "StabilityKnowledge",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "StabilityRitual",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "TruthChange",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "Desires",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "Maintains",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "Sacrifices",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "PartyDesires",
                table: "ColonyStates");

            migrationBuilder.DropColumn(
                name: "PartyMaintains",
                table: "ColonyStates");

            migrationBuilder.DropColumn(
                name: "PartySacrifices",
                table: "ColonyStates");

            migrationBuilder.RenameColumn(
                name: "TruthRitual",
                table: "RulesConfigs",
                newName: "ValueConflictScale");

            migrationBuilder.RenameColumn(
                name: "TruthKnowledge",
                table: "RulesConfigs",
                newName: "ValueAlignmentScale");

            migrationBuilder.AddColumn<double>(
                name: "AgencyValue",
                table: "Factions",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "StabilityValue",
                table: "Factions",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "TruthValue",
                table: "Factions",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "PartyAgencyValue",
                table: "ColonyStates",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "PartyStabilityValue",
                table: "ColonyStates",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "PartyTruthValue",
                table: "ColonyStates",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AgencyValue",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "StabilityValue",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "TruthValue",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "PartyAgencyValue",
                table: "ColonyStates");

            migrationBuilder.DropColumn(
                name: "PartyStabilityValue",
                table: "ColonyStates");

            migrationBuilder.DropColumn(
                name: "PartyTruthValue",
                table: "ColonyStates");

            migrationBuilder.RenameColumn(
                name: "ValueConflictScale",
                table: "RulesConfigs",
                newName: "TruthRitual");

            migrationBuilder.RenameColumn(
                name: "ValueAlignmentScale",
                table: "RulesConfigs",
                newName: "TruthKnowledge");

            migrationBuilder.AddColumn<double>(
                name: "AgencyChange",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "AgencyKnowledge",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "AgencyRitual",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "DesireVsSacrifice",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "MaintainsVsSacrifice",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "SharedDesire",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "SharedMaintains",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "StabilityChange",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "StabilityKnowledge",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "StabilityRitual",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "TruthChange",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "Desires",
                table: "Factions",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Maintains",
                table: "Factions",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Sacrifices",
                table: "Factions",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PartyDesires",
                table: "ColonyStates",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PartyMaintains",
                table: "ColonyStates",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PartySacrifices",
                table: "ColonyStates",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }
    }
}
