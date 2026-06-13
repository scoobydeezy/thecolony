using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCooperativeLabel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            const string json = "[{\"label\":\"Aligned\",\"minScore\":6},{\"label\":\"Cooperative\",\"minScore\":4},{\"label\":\"Friendly\",\"minScore\":2},{\"label\":\"Tolerated\",\"minScore\":-1},{\"label\":\"Strained\",\"minScore\":-5},{\"label\":\"Opposed\",\"minScore\":-10},{\"label\":\"Hostile\",\"minScore\":-999}]";
            migrationBuilder.Sql($"UPDATE \"RulesConfigs\" SET \"ThresholdsJson\" = '{json}' WHERE \"Id\" = 'singleton';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            const string json = "[{\"label\":\"Aligned\",\"minScore\":5},{\"label\":\"Friendly\",\"minScore\":3},{\"label\":\"Tolerated\",\"minScore\":-1},{\"label\":\"Strained\",\"minScore\":-4},{\"label\":\"Opposed\",\"minScore\":-10},{\"label\":\"Hostile\",\"minScore\":-999}]";
            migrationBuilder.Sql($"UPDATE \"RulesConfigs\" SET \"ThresholdsJson\" = '{json}' WHERE \"Id\" = 'singleton';");
        }
    }
}
