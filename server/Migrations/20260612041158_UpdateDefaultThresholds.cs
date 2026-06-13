using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class UpdateDefaultThresholds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            const string newJson = "[{\"label\":\"Aligned\",\"minScore\":5},{\"label\":\"Friendly\",\"minScore\":3},{\"label\":\"Tolerated\",\"minScore\":-1},{\"label\":\"Strained\",\"minScore\":-4},{\"label\":\"Opposed\",\"minScore\":-10},{\"label\":\"Hostile\",\"minScore\":-999}]";
            migrationBuilder.Sql($"UPDATE \"RulesConfigs\" SET \"ThresholdsJson\" = '{newJson}', \"ValueConflictScale\" = 3.0, \"StressNegativeMultiplierPerPoint\" = 0.35 WHERE \"Id\" = 'singleton';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            const string oldJson = "[{\"label\":\"Aligned\",\"minScore\":5},{\"label\":\"Friendly\",\"minScore\":3},{\"label\":\"Tolerated\",\"minScore\":-1},{\"label\":\"Strained\",\"minScore\":-4},{\"label\":\"Opposed\",\"minScore\":-8},{\"label\":\"Hostile\",\"minScore\":-999}]";
            migrationBuilder.Sql($"UPDATE \"RulesConfigs\" SET \"ThresholdsJson\" = '{oldJson}', \"ValueConflictScale\" = 2.0, \"StressNegativeMultiplierPerPoint\" = 0.5 WHERE \"Id\" = 'singleton';");
        }
    }
}
