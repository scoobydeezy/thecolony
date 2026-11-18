using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    // ADVENTURE-BOOK-PLAN.md §11: faction goals move into canonical files. Guarded by CanonLinks.GuardSwitch.
    public partial class CanonGoalStore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccomplishedEffectsJson",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "ChampionId",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "ConditionType",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "EarliestAct",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "FactionId",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "OutcomeMode",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "ProgressingEffectsJson",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "TargetEntityId",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "TargetEntityType",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "TargetOperator",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "TargetOwnerFactionId",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "TargetProperty",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "TargetThreshold",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "Visibility",
                table: "FactionGoals");

            // Hand-fixed: EF scaffolded a rename of TargetState to CanonId, which would have put goal
            // target states into the link column. Drop it and add CanonId empty instead;
            // CanonLinks.Backfill fills CanonId from staging/goals/id-map.yaml.
            migrationBuilder.DropColumn(
                name: "TargetState",
                table: "FactionGoals");

            migrationBuilder.AddColumn<string>(
                name: "CanonId",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FactionGoals_CanonId",
                table: "FactionGoals",
                column: "CanonId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FactionGoals_CanonId",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "CanonId",
                table: "FactionGoals");

            migrationBuilder.AddColumn<string>(
                name: "TargetState",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AccomplishedEffectsJson",
                table: "FactionGoals",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ChampionId",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ConditionType",
                table: "FactionGoals",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "EarliestAct",
                table: "FactionGoals",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "FactionId",
                table: "FactionGoals",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "OutcomeMode",
                table: "FactionGoals",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Priority",
                table: "FactionGoals",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ProgressingEffectsJson",
                table: "FactionGoals",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "FactionGoals",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "TargetEntityId",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TargetEntityType",
                table: "FactionGoals",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TargetOperator",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TargetOwnerFactionId",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TargetProperty",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TargetThreshold",
                table: "FactionGoals",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "FactionGoals",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Visibility",
                table: "FactionGoals",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }
    }
}
