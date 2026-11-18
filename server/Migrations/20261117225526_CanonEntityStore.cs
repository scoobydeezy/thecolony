using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    // ADVENTURE-BOOK-PLAN.md §10: factions, Assets and locations move into canonical files. Guarded by
    // CanonLinks.GuardSwitch (refuses unless every row has a file in the merge's id-map.yaml).
    public partial class CanonEntityStore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Description",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "LinkedAssetId",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "LocationType",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "MarkerColor",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "State",
                table: "Locations");

            migrationBuilder.DropColumn(
                name: "Active",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "AfraidOf",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "AgencyValue",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "BannerShape",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "Became",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "BeliefA",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "BeliefB",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "BeliefC",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "CertainOf",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "CoreTenet",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "FactionSize",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "Focus",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "FoundedAs",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "GlyphPath",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "History",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "IconPath",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "LeaderId",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "MomentumTier",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "Motto",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "Origin",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "PrimaryColor",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "PublicFace",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "Represents",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "Response",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "RightAbout",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "SecondaryColor",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "SelfImage",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "StabilityValue",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "TruthValue",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "WrongAbout",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "ControllingFactionId",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Keystone",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "LocationId",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Tier",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Assets");

            // Hand-fixed: EF scaffolded a rename of ParentLocationId to CanonId, which would have put
            // Locations.ParentLocationId values into the link column. Drop it and add CanonId empty instead;
            // CanonLinks.Backfill fills CanonId from the merge's id-map.yaml.
            migrationBuilder.DropColumn(
                name: "ParentLocationId",
                table: "Locations");

            migrationBuilder.AddColumn<string>(
                name: "CanonId",
                table: "Locations",
                type: "TEXT",
                nullable: true);

            // Hand-fixed: EF scaffolded a rename of Summary to CanonId, which would have put
            // Factions.Summary values into the link column. Drop it and add CanonId empty instead;
            // CanonLinks.Backfill fills CanonId from the merge's id-map.yaml.
            migrationBuilder.DropColumn(
                name: "Summary",
                table: "Factions");

            migrationBuilder.AddColumn<string>(
                name: "CanonId",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            // Hand-fixed: EF scaffolded a rename of StatusActorFactionId to CanonId, which would have put
            // Assets.StatusActorFactionId values into the link column. Drop it and add CanonId empty instead;
            // CanonLinks.Backfill fills CanonId from the merge's id-map.yaml.
            migrationBuilder.DropColumn(
                name: "StatusActorFactionId",
                table: "Assets");

            migrationBuilder.AddColumn<string>(
                name: "CanonId",
                table: "Assets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Locations_CanonId",
                table: "Locations",
                column: "CanonId");

            migrationBuilder.CreateIndex(
                name: "IX_Factions_CanonId",
                table: "Factions",
                column: "CanonId");

            migrationBuilder.CreateIndex(
                name: "IX_Assets_CanonId",
                table: "Assets",
                column: "CanonId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Locations_CanonId",
                table: "Locations");

            migrationBuilder.DropIndex(
                name: "IX_Factions_CanonId",
                table: "Factions");

            migrationBuilder.DropIndex(
                name: "IX_Assets_CanonId",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "CanonId",
                table: "Locations");

            migrationBuilder.AddColumn<string>(
                name: "ParentLocationId",
                table: "Locations",
                type: "TEXT",
                nullable: true);

            migrationBuilder.DropColumn(
                name: "CanonId",
                table: "Factions");

            migrationBuilder.AddColumn<string>(
                name: "Summary",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.DropColumn(
                name: "CanonId",
                table: "Assets");

            migrationBuilder.AddColumn<string>(
                name: "StatusActorFactionId",
                table: "Assets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Locations",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LinkedAssetId",
                table: "Locations",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LocationType",
                table: "Locations",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MarkerColor",
                table: "Locations",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Locations",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "State",
                table: "Locations",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "Active",
                table: "Factions",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "AfraidOf",
                table: "Factions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<double>(
                name: "AgencyValue",
                table: "Factions",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "BannerShape",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Became",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BeliefA",
                table: "Factions",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BeliefB",
                table: "Factions",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BeliefC",
                table: "Factions",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CertainOf",
                table: "Factions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CoreTenet",
                table: "Factions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "FactionSize",
                table: "Factions",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Focus",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FoundedAs",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GlyphPath",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "History",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IconPath",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LeaderId",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MomentumTier",
                table: "Factions",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Motto",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Factions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Origin",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrimaryColor",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublicFace",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Represents",
                table: "Factions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Response",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RightAbout",
                table: "Factions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SecondaryColor",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SelfImage",
                table: "Factions",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "StabilityValue",
                table: "Factions",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "TruthValue",
                table: "Factions",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "Factions",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "WrongAbout",
                table: "Factions",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ControllingFactionId",
                table: "Assets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Assets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Keystone",
                table: "Assets",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "LocationId",
                table: "Assets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Assets",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Role",
                table: "Assets",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "Assets",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Tier",
                table: "Assets",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "Assets",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }
    }
}
