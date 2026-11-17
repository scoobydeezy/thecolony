using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    // M4 (BOARD-GAME-REVIEW §6.2, §14.5): outcome mode, the unattended-resolution contract, and GoalStatus.Retired (= 5,
    // appended, so no existing value moves). Additive.
    public partial class M4_GoalOutcomes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Attempt",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeadlineTurns",
                table: "FactionGoals",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "Discovery",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Opportunity",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "OutcomeMode",
                table: "FactionGoals",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "OutcomeText",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UnattendedOutcome",
                table: "FactionGoals",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "UnattendedText",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);

            // §6.2 defaults: Achieve goals with a machine-readable Asset target (state or owner) resolve Automatically;
            // every other Achieve goal (Character targets, legacy faction-threshold targets, no target) is Adjudicated.
            // Enums are stored as integers: ConditionType Achieve = 0; TargetEntityType Asset = 2; OutcomeMode Adjudicated = 1.
            migrationBuilder.Sql(@"UPDATE ""FactionGoals"" SET ""OutcomeMode"" = 1
                WHERE ""ConditionType"" = 0
                  AND (""TargetEntityType"" IS NULL OR ""TargetEntityType"" <> 2
                       OR (""TargetState"" IS NULL AND ""TargetOwnerFactionId"" IS NULL));");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Attempt",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "DeadlineTurns",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "Discovery",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "Opportunity",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "OutcomeMode",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "OutcomeText",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "UnattendedOutcome",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "UnattendedText",
                table: "FactionGoals");
        }
    }
}
