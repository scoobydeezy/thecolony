using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSortOrderAndPartyName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "Factions",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "PartyName",
                table: "ColonyStates",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "Factions");

            migrationBuilder.DropColumn(
                name: "PartyName",
                table: "ColonyStates");
        }
    }
}
