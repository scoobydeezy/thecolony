using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class M1_LifecycleAndHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IntroducedAtEventId",
                table: "Locations",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IntroducedAtEventId",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IntroducedAtEventId",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Kind",
                table: "Events",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Ordinal",
                table: "EventEffects",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Origin",
                table: "EventEffects",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "PhaseId",
                table: "EventEffects",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IntroducedAtEventId",
                table: "Characters",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ActivatedAt",
                table: "Campaigns",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "HistoryVersion",
                table: "Campaigns",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<int>(
                name: "Mode",
                table: "Campaigns",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "IntroducedAtEventId",
                table: "Assets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ColonyTurns",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    SessionId = table.Column<string>(type: "TEXT", nullable: false),
                    EventId = table.Column<string>(type: "TEXT", nullable: false),
                    Seed = table.Column<long>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    RulesVersionId = table.Column<string>(type: "TEXT", nullable: true),
                    EngineVersion = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CommittedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ColonyTurns", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RulesVersions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    Version = table.Column<int>(type: "INTEGER", nullable: false),
                    RulesJson = table.Column<string>(type: "TEXT", nullable: false),
                    EngineVersion = table.Column<string>(type: "TEXT", nullable: false),
                    EffectiveFromEventId = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RulesVersions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ColonyTurnPhases",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    ColonyTurnId = table.Column<string>(type: "TEXT", nullable: false),
                    Ordinal = table.Column<int>(type: "INTEGER", nullable: false),
                    Kind = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    FrozenInputsJson = table.Column<string>(type: "TEXT", nullable: false),
                    FrozenInputsHash = table.Column<string>(type: "TEXT", nullable: false),
                    ResultsJson = table.Column<string>(type: "TEXT", nullable: false),
                    HistoryVersion = table.Column<long>(type: "INTEGER", nullable: false),
                    CommittedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ColonyTurnPhases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ColonyTurnPhases_ColonyTurns_ColonyTurnId",
                        column: x => x.ColonyTurnId,
                        principalTable: "ColonyTurns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ColonyTurnPhases_ColonyTurnId_Ordinal",
                table: "ColonyTurnPhases",
                columns: new[] { "ColonyTurnId", "Ordinal" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RulesVersions_CampaignId_Version",
                table: "RulesVersions",
                columns: new[] { "CampaignId", "Version" },
                unique: true);

            // Backfills (M1): synthetic map-edit events get Kind = MapEdits (3); existing effects get an explicit
            // Ordinal equal to their stored insertion order within the event, which is the order replay already used.
            migrationBuilder.Sql("UPDATE \"Events\" SET \"Kind\" = 3 WHERE \"IsSynthetic\" = 1;");
            migrationBuilder.Sql(@"UPDATE ""EventEffects"" SET ""Ordinal"" =
                (SELECT COUNT(*) FROM ""EventEffects"" AS e2 WHERE e2.""EventId"" = ""EventEffects"".""EventId"" AND e2.rowid < ""EventEffects"".rowid);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ColonyTurnPhases");

            migrationBuilder.DropTable(
                name: "RulesVersions");

            migrationBuilder.DropTable(
                name: "ColonyTurns");

            migrationBuilder.DropColumn(
                name: "IntroducedAtEventId",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "IntroducedAtEventId",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "IntroducedAtEventId",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "Ordinal",
                table: "EventEffects");

            migrationBuilder.DropColumn(
                name: "Origin",
                table: "EventEffects");

            migrationBuilder.DropColumn(
                name: "PhaseId",
                table: "EventEffects");

            migrationBuilder.DropColumn(
                name: "IntroducedAtEventId",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "ActivatedAt",
                table: "Campaigns");

            migrationBuilder.DropColumn(
                name: "HistoryVersion",
                table: "Campaigns");

            migrationBuilder.DropColumn(
                name: "Mode",
                table: "Campaigns");

            migrationBuilder.DropColumn(
                name: "IntroducedAtEventId",
                table: "Assets");
        }
    }
}
