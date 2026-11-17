using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    // M6: Character.Instability (Stable = 0 default for every existing row) and ReaffirmedFactionId. Additive.
    public partial class M6_CharacterInstability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Instability",
                table: "Characters",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ReaffirmedFactionId",
                table: "Characters",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Instability",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "ReaffirmedFactionId",
                table: "Characters");
        }
    }
}
