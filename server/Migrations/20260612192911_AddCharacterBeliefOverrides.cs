using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCharacterBeliefOverrides : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Change",
                table: "Characters",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Knowledge",
                table: "Characters",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Ritual",
                table: "Characters",
                type: "INTEGER",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Change",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Knowledge",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Ritual",
                table: "Characters");
        }
    }
}
