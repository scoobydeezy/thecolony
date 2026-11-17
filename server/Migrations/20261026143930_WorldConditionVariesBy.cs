using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    /// <summary>"Varies by" World Conditions: one entity's property with a row per state.</summary>
    public partial class WorldConditionVariesBy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "VariesByJson",
                table: "WorldConditions",
                type: "TEXT",
                nullable: true);

            // The campaign's Cache Looting (one rule listing four loot tables) becomes one "varies by" condition on the
            // Dead Drop Network's status, a row per status. Only if it is still in its original form (ruling 2026-10-26).
            migrationBuilder.Sql("""
                UPDATE WorldConditions
                SET VariesByJson = '{"subject": {"kind": "assetStatus", "id": "d789ddfd-d031-4059-bf9c-5660840aa883"}, "rows": [{"state": "Stable", "text": "Newly discovered caches hold loot on 4–6 (d6).", "stress": 0}, {"state": "Contested", "text": "Newly discovered caches hold loot on 5–6 (d6).", "stress": 0}, {"state": "Damaged", "text": "Newly discovered caches hold loot on 6 only (d6).", "stress": 0}, {"state": "Destroyed", "text": "Newly discovered caches hold no loot.", "stress": 0}]}', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', ActiveAtStart = 1
                WHERE Id = 'cache_looting' AND VariesByJson IS NULL AND Rule LIKE 'Newly discovered caches hold loot on Stable%'
                  AND EXISTS (SELECT 1 FROM Assets WHERE Id = 'd789ddfd-d031-4059-bf9c-5660840aa883');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VariesByJson",
                table: "WorldConditions");
        }
    }
}
