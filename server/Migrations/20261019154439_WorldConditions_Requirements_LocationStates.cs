using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    /// <summary>§18.9: World Condition requirement lists and Stress; the goal milestone state change; Location states remapped.</summary>
    public partial class WorldConditions_Requirements_LocationStates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // §18.9: Location state is now Stable / ActiveIncursion / Unstable. The old values (Active, Abandoned, Ruined,
            // Unknown) were attributes, not these conditions, and their numbers would map onto the wrong meanings, so every
            // Location starts Stable (ruling 2026-10-19: the current campaign's history need not be preserved).
            migrationBuilder.Sql("UPDATE Locations SET State = 0;");
            migrationBuilder.DropColumn(
                name: "RequiresAssetId",
                table: "WorldConditions");

            migrationBuilder.DropColumn(
                name: "RequiresAssetStatuses",
                table: "WorldConditions");

            migrationBuilder.DropColumn(
                name: "RequiresConditionId",
                table: "WorldConditions");

            migrationBuilder.DropColumn(
                name: "RequiresOwnerFactionId",
                table: "WorldConditions");

            migrationBuilder.AddColumn<string>(
                name: "RequirementsJson",
                table: "WorldConditions",
                type: "TEXT",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<int>(
                name: "StressContribution",
                table: "WorldConditions",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ProgressingTargetState",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RequirementsJson",
                table: "WorldConditions");

            migrationBuilder.DropColumn(
                name: "StressContribution",
                table: "WorldConditions");

            migrationBuilder.DropColumn(
                name: "ProgressingTargetState",
                table: "FactionGoals");

            migrationBuilder.AddColumn<string>(
                name: "RequiresAssetId",
                table: "WorldConditions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequiresAssetStatuses",
                table: "WorldConditions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequiresConditionId",
                table: "WorldConditions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RequiresOwnerFactionId",
                table: "WorldConditions",
                type: "TEXT",
                nullable: true);
        }
    }
}
