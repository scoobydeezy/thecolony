using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStressWeightToRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "StressWeightEnabled",
                table: "RulesConfigs",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            // StressWeightCurve stored as int (enum): 0=Linear, 1=Quadratic, 2=Cubic, 3=Exponential
            migrationBuilder.AddColumn<int>(
                name: "StressWeightCurve",
                table: "RulesConfigs",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<double>(
                name: "StressWeightIntensity",
                table: "RulesConfigs",
                type: "REAL",
                nullable: false,
                defaultValue: 0.5);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "StressWeightEnabled",  table: "RulesConfigs");
            migrationBuilder.DropColumn(name: "StressWeightCurve",    table: "RulesConfigs");
            migrationBuilder.DropColumn(name: "StressWeightIntensity", table: "RulesConfigs");
        }
    }
}
