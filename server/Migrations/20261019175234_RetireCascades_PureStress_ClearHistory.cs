using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    /// <summary>§18.10: Cascade Rules and Stress Triggers retired (their JSON stays, never executed); Colony Stress is derived
    /// from World Conditions only, so the stored baseline Stress and the Session Log's Stress change are dropped; and the
    /// test campaign's play history is cleared (ruling 2026-10-19). Entities, goals, conditions, rules, the map and the
    /// narrative plan are kept. A backup was taken first: colony-data/colony.db.bak-20261019-before-history-clear.</summary>
    public partial class RetireCascades_PureStress_ClearHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // History first, before the table rebuilds the column drops cause. Children before parents (no reliance on
            // SQLite foreign-key cascades, which are off for raw SQL unless PRAGMA foreign_keys is on).
            migrationBuilder.Sql("DELETE FROM ColonyTurnPhases;");
            migrationBuilder.Sql("DELETE FROM ColonyTurns;");
            migrationBuilder.Sql("DELETE FROM NarrativeEventRealizations;");   // links narrative events to session Events
            migrationBuilder.Sql("DELETE FROM EventEffects;");
            migrationBuilder.Sql("DELETE FROM Events;");                       // Play, ColonyTurn, Correction and Map Edits Events
            migrationBuilder.Sql("DELETE FROM Sessions;");
            migrationBuilder.Sql("DELETE FROM RulesVersions WHERE EffectiveFromEventId IS NOT NULL;");
            foreach (var t in new[] { "Factions", "Characters", "Assets", "FactionGoals", "Locations" })
                migrationBuilder.Sql($"UPDATE {t} SET IntroducedAtEventId = NULL;");
            migrationBuilder.Sql("UPDATE Campaigns SET HistoryVersion = HistoryVersion + 1;");   // any open client view is stale

            migrationBuilder.DropColumn(
                name: "ColonyStressChange",
                table: "SessionLog");

            migrationBuilder.DropColumn(
                name: "ColonyStress",
                table: "ColonyStates");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ColonyStressChange",
                table: "SessionLog",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ColonyStress",
                table: "ColonyStates",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }
    }
}
