using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    /// <summary>Maintain assignments get an Earliest Act; existing ones are set to Act I (their behaviour is unchanged).</summary>
    public partial class MaintainEarliestAct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 2026-10-22: Maintain assignments now have an Earliest Act (in force from it). Until now they were in force
            // from the start and ignored the column's default (II), so existing ones move to Act I: nothing changes.
            // ConditionType 1 = Maintain.
            migrationBuilder.Sql("UPDATE FactionGoals SET EarliestAct = 1 WHERE ConditionType = 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE FactionGoals SET EarliestAct = 2 WHERE ConditionType = 1;");
        }
    }
}
