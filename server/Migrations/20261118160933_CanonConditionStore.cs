using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class CanonConditionStore : Migration
    {
        /// <inheritdoc />
        // ADVENTURE-BOOK-PLAN.md §15: World Conditions become files (the row keeps Id, CampaignId, CanonId,
        // SortOrder); relationships move into the character files. EF's guessed VariesByJson -> CanonId rename
        // is a drop plus add. CanonLinks.GuardSwitch checks every dropped value is in a file first.
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CharacterRelationships");

            migrationBuilder.DropColumn(
                name: "ActiveAtStart",
                table: "WorldConditions");

            migrationBuilder.DropColumn(
                name: "RequirementsJson",
                table: "WorldConditions");

            migrationBuilder.DropColumn(
                name: "Rule",
                table: "WorldConditions");

            migrationBuilder.DropColumn(
                name: "RuleOtherwise",
                table: "WorldConditions");

            migrationBuilder.DropColumn(
                name: "StressContribution",
                table: "WorldConditions");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "WorldConditions");

            migrationBuilder.DropColumn(
                name: "VariesByJson",
                table: "WorldConditions");

            migrationBuilder.AddColumn<string>(
                name: "CanonId",
                table: "WorldConditions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorldConditions_CampaignId_CanonId",
                table: "WorldConditions",
                columns: new[] { "CampaignId", "CanonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorldConditions_CanonId",
                table: "WorldConditions",
                column: "CanonId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WorldConditions_CampaignId_CanonId",
                table: "WorldConditions");

            migrationBuilder.DropIndex(
                name: "IX_WorldConditions_CanonId",
                table: "WorldConditions");

            migrationBuilder.DropColumn(
                name: "CanonId",
                table: "WorldConditions");

            migrationBuilder.AddColumn<string>(
                name: "VariesByJson",
                table: "WorldConditions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ActiveAtStart",
                table: "WorldConditions",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "RequirementsJson",
                table: "WorldConditions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Rule",
                table: "WorldConditions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RuleOtherwise",
                table: "WorldConditions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StressContribution",
                table: "WorldConditions",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "WorldConditions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "CharacterRelationships",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    RelationshipType = table.Column<string>(type: "TEXT", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    SourceCharacterId = table.Column<string>(type: "TEXT", nullable: false),
                    State = table.Column<int>(type: "INTEGER", nullable: false),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    TargetCharacterId = table.Column<string>(type: "TEXT", nullable: true),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CharacterRelationships", x => x.Id);
                });
        }
    }
}
