using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    // Relationship scoring geometry (SCORING-AUDIT.md). Additive; existing rows get the provisional constants.
    // The old ValueAlignmentScale / ValueConflictScale columns stay (archived, unused).
    public partial class ScoringGeometry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "BeliefAdjacent",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: -1.0);

            migrationBuilder.AddColumn<double>(
                name: "BeliefWeightBlend",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.5);

            migrationBuilder.AddColumn<double>(
                name: "ValueOppositionScale",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 3.0);

            migrationBuilder.AddColumn<double>(
                name: "ValueSimilarityScale",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 3.5);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BeliefAdjacent",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "BeliefWeightBlend",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "ValueOppositionScale",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "ValueSimilarityScale",
                table: "RulesConfigs");
        }
    }
}
