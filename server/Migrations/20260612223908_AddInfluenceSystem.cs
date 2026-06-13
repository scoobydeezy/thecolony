using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInfluenceSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "InfluenceConvictionScale",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "Impressionable",
                table: "Characters",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Influence",
                table: "Characters",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InfluenceConvictionScale",
                table: "RulesConfigs");

            migrationBuilder.DropColumn(
                name: "Impressionable",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Influence",
                table: "Characters");
        }
    }
}
