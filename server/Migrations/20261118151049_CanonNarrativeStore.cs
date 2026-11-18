using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class CanonNarrativeStore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ADVENTURE-BOOK-PLAN.md §13: connections are the source events' `leadsTo`, and links to factions,
            // characters, Assets and locations (EntityType 0..3) the owners' `links`, in the files. Links to
            // sessions (play data) stay. CanonLinks.GuardSwitch checks every dropped row is in a file first.
            migrationBuilder.Sql("DELETE FROM \"NarrativeEntityLinks\" WHERE \"EntityType\" < 4;");

            migrationBuilder.DropTable(
                name: "NarrativeEventConnections");

            migrationBuilder.DropColumn(
                name: "Color",
                table: "NarrativeThreads");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "NarrativeThreads");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "NarrativeEvents");

            migrationBuilder.DropColumn(
                name: "NarrativeFunction",
                table: "NarrativeEvents");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "NarrativeEvents");

            migrationBuilder.DropColumn(
                name: "Visibility",
                table: "NarrativeEvents");

            // Not a rename (EF guessed one): Summary is file-backed now, CanonId is the new file link.
            migrationBuilder.DropColumn(
                name: "Summary",
                table: "NarrativeThreads");

            migrationBuilder.AddColumn<string>(
                name: "CanonId",
                table: "NarrativeThreads",
                type: "TEXT",
                nullable: true);

            // Not a rename (EF guessed one): Summary is file-backed now, CanonId is the new file link.
            migrationBuilder.DropColumn(
                name: "Summary",
                table: "NarrativeEvents");

            migrationBuilder.AddColumn<string>(
                name: "CanonId",
                table: "NarrativeEvents",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_NarrativeThreads_CampaignId_CanonId",
                table: "NarrativeThreads",
                columns: new[] { "CampaignId", "CanonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NarrativeThreads_CanonId",
                table: "NarrativeThreads",
                column: "CanonId");

            migrationBuilder.CreateIndex(
                name: "IX_NarrativeEvents_CampaignId_CanonId",
                table: "NarrativeEvents",
                columns: new[] { "CampaignId", "CanonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NarrativeEvents_CanonId",
                table: "NarrativeEvents",
                column: "CanonId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NarrativeThreads_CampaignId_CanonId",
                table: "NarrativeThreads");

            migrationBuilder.DropIndex(
                name: "IX_NarrativeThreads_CanonId",
                table: "NarrativeThreads");

            migrationBuilder.DropIndex(
                name: "IX_NarrativeEvents_CampaignId_CanonId",
                table: "NarrativeEvents");

            migrationBuilder.DropIndex(
                name: "IX_NarrativeEvents_CanonId",
                table: "NarrativeEvents");

            migrationBuilder.DropColumn(
                name: "CanonId",
                table: "NarrativeThreads");

            migrationBuilder.AddColumn<string>(
                name: "Summary",
                table: "NarrativeThreads",
                type: "TEXT",
                nullable: true);

            migrationBuilder.DropColumn(
                name: "CanonId",
                table: "NarrativeEvents");

            migrationBuilder.AddColumn<string>(
                name: "Summary",
                table: "NarrativeEvents",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "NarrativeThreads",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "NarrativeThreads",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "NarrativeEvents",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NarrativeFunction",
                table: "NarrativeEvents",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "NarrativeEvents",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Visibility",
                table: "NarrativeEvents",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "NarrativeEventConnections",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<string>(type: "TEXT", nullable: false),
                    SourceNarrativeEventId = table.Column<string>(type: "TEXT", nullable: false),
                    TargetNarrativeEventId = table.Column<string>(type: "TEXT", nullable: false),
                    ThreadId = table.Column<string>(type: "TEXT", nullable: false),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NarrativeEventConnections", x => x.Id);
                });
        }
    }
}
