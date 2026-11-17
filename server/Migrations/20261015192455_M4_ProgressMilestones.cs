using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    // M4 (2026-10-15): declared Progress milestone, its world consequence, and discoverability. Additive, nullable text.
    public partial class M4_ProgressMilestones : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProgressConsequence",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProgressDiscovery",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProgressMilestone",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProgressConsequence",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "ProgressDiscovery",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "ProgressMilestone",
                table: "FactionGoals");
        }
    }
}
