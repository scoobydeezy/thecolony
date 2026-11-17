using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    /// <summary>§18.11: goal advance Effects (Faction Phase fp-4) replace the single milestone state.</summary>
    public partial class GoalAdvanceEffects : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccomplishedEffectsJson",
                table: "FactionGoals",
                type: "TEXT",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "ProgressingEffectsJson",
                table: "FactionGoals",
                type: "TEXT",
                nullable: false,
                defaultValue: "[]");

            // §18.11: a milestone state (§18.9) becomes the goal's first Progressing Effect, on its own target
            // (TargetEntityType: 1 = Character → state, 2 = Asset → status). Before the drop, which rebuilds the table.
            migrationBuilder.Sql("""
                UPDATE FactionGoals
                SET ProgressingEffectsJson = json_array(json_object(
                    'targetType', CASE TargetEntityType WHEN 2 THEN 'asset' ELSE 'character' END,
                    'targetId', TargetEntityId,
                    'property', CASE TargetEntityType WHEN 2 THEN 'status' ELSE 'state' END,
                    'delta', 0,
                    'value', ProgressingTargetState))
                WHERE ProgressingTargetState IS NOT NULL AND ProgressingTargetState <> ''
                  AND TargetEntityId IS NOT NULL AND TargetEntityType IN (1, 2);
                """);

            migrationBuilder.DropColumn(
                name: "ProgressingTargetState",
                table: "FactionGoals");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccomplishedEffectsJson",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "ProgressingEffectsJson",
                table: "FactionGoals");

            migrationBuilder.AddColumn<string>(
                name: "ProgressingTargetState",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);
        }
    }
}
