using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <summary>§18.6: Earliest Act on goals (Faction Phase eligibility only). Additive; existing goals get Act II.</summary>
    public partial class M4_EarliestAct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "EarliestAct",
                table: "FactionGoals",
                type: "INTEGER",
                nullable: false,
                defaultValue: 2);   // ruling 2026-10-17: existing goals default to Act II, then are reviewed one by one
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EarliestAct",
                table: "FactionGoals");
        }
    }
}
