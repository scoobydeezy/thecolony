using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class ThreadAsConnection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EventOverrideThreads");

            migrationBuilder.DropTable(
                name: "NarrativeThreadEvents");

            migrationBuilder.DropColumn(
                name: "OverridesThreads",
                table: "NarrativeEventOverrides");

            migrationBuilder.DropColumn(
                name: "Label",
                table: "NarrativeEventConnections");

            migrationBuilder.DropColumn(
                name: "Label",
                table: "EventOverrideConnections");

            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "NarrativeThreads",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThreadId",
                table: "NarrativeEventConnections",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ThreadId",
                table: "EventOverrideConnections",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Color",
                table: "NarrativeThreads");

            migrationBuilder.DropColumn(
                name: "ThreadId",
                table: "NarrativeEventConnections");

            migrationBuilder.DropColumn(
                name: "ThreadId",
                table: "EventOverrideConnections");

            migrationBuilder.AddColumn<bool>(
                name: "OverridesThreads",
                table: "NarrativeEventOverrides",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Label",
                table: "NarrativeEventConnections",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Label",
                table: "EventOverrideConnections",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "EventOverrideThreads",
                columns: table => new
                {
                    EventOverrideId = table.Column<string>(type: "TEXT", nullable: false),
                    NarrativeThreadId = table.Column<string>(type: "TEXT", nullable: false),
                    IsPrimary = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventOverrideThreads", x => new { x.EventOverrideId, x.NarrativeThreadId });
                    table.ForeignKey(
                        name: "FK_EventOverrideThreads_NarrativeEventOverrides_EventOverrideId",
                        column: x => x.EventOverrideId,
                        principalTable: "NarrativeEventOverrides",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NarrativeThreadEvents",
                columns: table => new
                {
                    NarrativeThreadId = table.Column<string>(type: "TEXT", nullable: false),
                    NarrativeEventId = table.Column<string>(type: "TEXT", nullable: false),
                    IsPrimary = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NarrativeThreadEvents", x => new { x.NarrativeThreadId, x.NarrativeEventId });
                });
        }
    }
}
