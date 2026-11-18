using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class CanonLinkUnique : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Locations_CampaignId_CanonId",
                table: "Locations",
                columns: new[] { "CampaignId", "CanonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Factions_CampaignId_CanonId",
                table: "Factions",
                columns: new[] { "CampaignId", "CanonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FactionGoals_CampaignId_CanonId",
                table: "FactionGoals",
                columns: new[] { "CampaignId", "CanonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Characters_CampaignId_CanonId",
                table: "Characters",
                columns: new[] { "CampaignId", "CanonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Assets_CampaignId_CanonId",
                table: "Assets",
                columns: new[] { "CampaignId", "CanonId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Locations_CampaignId_CanonId",
                table: "Locations");

            migrationBuilder.DropIndex(
                name: "IX_Factions_CampaignId_CanonId",
                table: "Factions");

            migrationBuilder.DropIndex(
                name: "IX_FactionGoals_CampaignId_CanonId",
                table: "FactionGoals");

            migrationBuilder.DropIndex(
                name: "IX_Characters_CampaignId_CanonId",
                table: "Characters");

            migrationBuilder.DropIndex(
                name: "IX_Assets_CampaignId_CanonId",
                table: "Assets");
        }
    }
}
