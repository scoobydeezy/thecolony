using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class UnifiedBeliefScoring : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ChangeConflict",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "ChangeMatch",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "KnowledgeConflict",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "KnowledgeMatch",
                table: "RulesConfigs");

            migrationBuilder.RenameColumn(
                name: "RitualMatch",
                table: "RulesConfigs",
                newName: "BeliefMatch");

            migrationBuilder.RenameColumn(
                name: "RitualConflict",
                table: "RulesConfigs",
                newName: "BeliefConflict");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "BeliefMatch",
                table: "RulesConfigs",
                newName: "RitualMatch");

            migrationBuilder.RenameColumn(
                name: "BeliefConflict",
                table: "RulesConfigs",
                newName: "RitualConflict");

            migrationBuilder.AddColumn<double>(
                name: "ChangeConflict",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "ChangeMatch",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "KnowledgeConflict",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "KnowledgeMatch",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);
        }
    }
}
