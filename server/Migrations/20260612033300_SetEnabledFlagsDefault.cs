using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class SetEnabledFlagsDefault : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE \"RulesConfigs\" SET \"PositiveEnabled\" = 1, \"NegativeEnabled\" = 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE \"RulesConfigs\" SET \"PositiveEnabled\" = 0, \"NegativeEnabled\" = 0;");
        }
    }
}
