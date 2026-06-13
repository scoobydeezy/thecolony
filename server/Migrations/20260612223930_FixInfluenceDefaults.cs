using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixInfluenceDefaults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Backfill existing rows: Impressionable defaults to 50 (not 0), InfluenceConvictionScale to 0.5
            migrationBuilder.Sql("UPDATE \"Characters\" SET \"Impressionable\" = 50 WHERE \"Impressionable\" = 0;");
            migrationBuilder.Sql("UPDATE \"RulesConfigs\" SET \"InfluenceConvictionScale\" = 0.5 WHERE \"InfluenceConvictionScale\" = 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
