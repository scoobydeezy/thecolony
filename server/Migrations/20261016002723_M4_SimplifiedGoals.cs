using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <summary>
    /// M4 simplification (2026-10-15): a Goal is what a faction wants, what progress looks like and what success looks
    /// like. The milestone and the declared stakes become the two World States (renamed, data kept); the authored
    /// encounter fields (attempt, opportunity, discovery, unattended outcome and text, deadline, milestone consequence
    /// and discoverability) are removed.
    /// </summary>
    public partial class M4_SimplifiedGoals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(name: "ProgressMilestone", table: "FactionGoals", newName: "ProgressingWorldState");
            migrationBuilder.RenameColumn(name: "OutcomeText", table: "FactionGoals", newName: "CompletedWorldState");
            migrationBuilder.DropColumn(name: "Attempt", table: "FactionGoals");
            migrationBuilder.DropColumn(name: "Opportunity", table: "FactionGoals");
            migrationBuilder.DropColumn(name: "Discovery", table: "FactionGoals");
            migrationBuilder.DropColumn(name: "UnattendedOutcome", table: "FactionGoals");
            migrationBuilder.DropColumn(name: "UnattendedText", table: "FactionGoals");
            migrationBuilder.DropColumn(name: "DeadlineTurns", table: "FactionGoals");
            migrationBuilder.DropColumn(name: "ProgressConsequence", table: "FactionGoals");
            migrationBuilder.DropColumn(name: "ProgressDiscovery", table: "FactionGoals");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(name: "ProgressingWorldState", table: "FactionGoals", newName: "ProgressMilestone");
            migrationBuilder.RenameColumn(name: "CompletedWorldState", table: "FactionGoals", newName: "OutcomeText");
            migrationBuilder.AddColumn<string>(name: "Attempt", table: "FactionGoals", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Opportunity", table: "FactionGoals", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Discovery", table: "FactionGoals", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "UnattendedText", table: "FactionGoals", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "ProgressConsequence", table: "FactionGoals", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "ProgressDiscovery", table: "FactionGoals", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<int>(name: "UnattendedOutcome", table: "FactionGoals", type: "INTEGER", nullable: false, defaultValue: 0);
            migrationBuilder.AddColumn<int>(name: "DeadlineTurns", table: "FactionGoals", type: "INTEGER", nullable: false, defaultValue: 1);
        }
    }
}
