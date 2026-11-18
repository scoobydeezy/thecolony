using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class CanonBranchStore : Migration
    {
        /// <inheritdoc />
        // ADVENTURE-BOOK-PLAN.md §14: branches, paths, versions, participation and scope move into the files.
        // CanonLinks.GuardSwitch checks every dropped row is in a file first.
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EventOverrideConnections");

            migrationBuilder.DropTable(
                name: "EventOverrideEntityLinks");

            migrationBuilder.DropTable(
                name: "EventOverridePaths");

            migrationBuilder.DropTable(
                name: "NarrativeEventVariantParticipations");

            migrationBuilder.DropTable(
                name: "PathEventScopes");

            migrationBuilder.DropTable(
                name: "PathSetContexts");

            migrationBuilder.DropTable(
                name: "NarrativeEventOverrides");

            migrationBuilder.DropTable(
                name: "NarrativePaths");

            migrationBuilder.DropColumn(
                name: "ConvergenceEventId",
                table: "PathSets");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "PathSets");

            // Not a rename (EF guessed one): OriginEventId is file-backed now, CanonId is the new file link.
            migrationBuilder.DropColumn(
                name: "OriginEventId",
                table: "PathSets");

            migrationBuilder.AddColumn<string>(
                name: "CanonId",
                table: "PathSets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PathSets_CampaignId_CanonId",
                table: "PathSets",
                columns: new[] { "CampaignId", "CanonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PathSets_CanonId",
                table: "PathSets",
                column: "CanonId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PathSets_CampaignId_CanonId",
                table: "PathSets");

            migrationBuilder.DropIndex(
                name: "IX_PathSets_CanonId",
                table: "PathSets");

            migrationBuilder.DropColumn(
                name: "CanonId",
                table: "PathSets");

            migrationBuilder.AddColumn<string>(
                name: "OriginEventId",
                table: "PathSets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ConvergenceEventId",
                table: "PathSets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "PathSets",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "NarrativeEventOverrides",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    NarrativeEventId = table.Column<string>(type: "TEXT", nullable: false),
                    OverridesAssets = table.Column<bool>(type: "INTEGER", nullable: false),
                    OverridesConnections = table.Column<bool>(type: "INTEGER", nullable: false),
                    OverridesDescription = table.Column<bool>(type: "INTEGER", nullable: false),
                    OverridesSummary = table.Column<bool>(type: "INTEGER", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NarrativeEventOverrides", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NarrativeEventVariantParticipations",
                columns: table => new
                {
                    NarrativeEventId = table.Column<string>(type: "TEXT", nullable: false),
                    PathSetId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NarrativeEventVariantParticipations", x => new { x.NarrativeEventId, x.PathSetId });
                    table.ForeignKey(
                        name: "FK_NarrativeEventVariantParticipations_PathSets_PathSetId",
                        column: x => x.PathSetId,
                        principalTable: "PathSets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NarrativePaths",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    PathSetId = table.Column<string>(type: "TEXT", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NarrativePaths", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NarrativePaths_PathSets_PathSetId",
                        column: x => x.PathSetId,
                        principalTable: "PathSets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PathSetContexts",
                columns: table => new
                {
                    PathSetId = table.Column<string>(type: "TEXT", nullable: false),
                    RequiredPathId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PathSetContexts", x => new { x.PathSetId, x.RequiredPathId });
                    table.ForeignKey(
                        name: "FK_PathSetContexts_PathSets_PathSetId",
                        column: x => x.PathSetId,
                        principalTable: "PathSets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EventOverrideConnections",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    EventOverrideId = table.Column<string>(type: "TEXT", nullable: false),
                    TargetNarrativeEventId = table.Column<string>(type: "TEXT", nullable: false),
                    ThreadId = table.Column<string>(type: "TEXT", nullable: false),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventOverrideConnections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EventOverrideConnections_NarrativeEventOverrides_EventOverrideId",
                        column: x => x.EventOverrideId,
                        principalTable: "NarrativeEventOverrides",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EventOverrideEntityLinks",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    EntityId = table.Column<string>(type: "TEXT", nullable: false),
                    EntityType = table.Column<int>(type: "INTEGER", nullable: false),
                    EventOverrideId = table.Column<string>(type: "TEXT", nullable: false),
                    IsPrimary = table.Column<bool>(type: "INTEGER", nullable: false),
                    Role = table.Column<string>(type: "TEXT", nullable: true),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventOverrideEntityLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EventOverrideEntityLinks_NarrativeEventOverrides_EventOverrideId",
                        column: x => x.EventOverrideId,
                        principalTable: "NarrativeEventOverrides",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EventOverridePaths",
                columns: table => new
                {
                    EventOverrideId = table.Column<string>(type: "TEXT", nullable: false),
                    PathId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventOverridePaths", x => new { x.EventOverrideId, x.PathId });
                    table.ForeignKey(
                        name: "FK_EventOverridePaths_NarrativeEventOverrides_EventOverrideId",
                        column: x => x.EventOverrideId,
                        principalTable: "NarrativeEventOverrides",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EventOverridePaths_NarrativePaths_PathId",
                        column: x => x.PathId,
                        principalTable: "NarrativePaths",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PathEventScopes",
                columns: table => new
                {
                    PathId = table.Column<string>(type: "TEXT", nullable: false),
                    NarrativeEventId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PathEventScopes", x => new { x.PathId, x.NarrativeEventId });
                    table.ForeignKey(
                        name: "FK_PathEventScopes_NarrativePaths_PathId",
                        column: x => x.PathId,
                        principalTable: "NarrativePaths",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EventOverrideConnections_EventOverrideId",
                table: "EventOverrideConnections",
                column: "EventOverrideId");

            migrationBuilder.CreateIndex(
                name: "IX_EventOverrideEntityLinks_EventOverrideId",
                table: "EventOverrideEntityLinks",
                column: "EventOverrideId");

            migrationBuilder.CreateIndex(
                name: "IX_EventOverridePaths_PathId",
                table: "EventOverridePaths",
                column: "PathId");

            migrationBuilder.CreateIndex(
                name: "IX_NarrativeEventVariantParticipations_PathSetId",
                table: "NarrativeEventVariantParticipations",
                column: "PathSetId");

            migrationBuilder.CreateIndex(
                name: "IX_NarrativePaths_PathSetId",
                table: "NarrativePaths",
                column: "PathSetId");
        }
    }
}
