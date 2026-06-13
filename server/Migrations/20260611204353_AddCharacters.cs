using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCharacters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Characters",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    CharacterType = table.Column<int>(type: "INTEGER", nullable: false),
                    Ancestry = table.Column<string>(type: "TEXT", nullable: true),
                    Heritage = table.Column<string>(type: "TEXT", nullable: true),
                    Class = table.Column<string>(type: "TEXT", nullable: true),
                    Background = table.Column<string>(type: "TEXT", nullable: true),
                    Level = table.Column<int>(type: "INTEGER", nullable: true),
                    Gender = table.Column<string>(type: "TEXT", nullable: true),
                    Age = table.Column<int>(type: "INTEGER", nullable: true),
                    Occupation = table.Column<string>(type: "TEXT", nullable: true),
                    Summary = table.Column<string>(type: "TEXT", nullable: true),
                    Goals = table.Column<string>(type: "TEXT", nullable: true),
                    Fears = table.Column<string>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    FactionId = table.Column<string>(type: "TEXT", nullable: true),
                    SocialClassId = table.Column<string>(type: "TEXT", nullable: true),
                    TruthValue = table.Column<double>(type: "REAL", nullable: false),
                    StabilityValue = table.Column<double>(type: "REAL", nullable: false),
                    AgencyValue = table.Column<double>(type: "REAL", nullable: false),
                    DoubtDirection = table.Column<int>(type: "INTEGER", nullable: true),
                    Conviction = table.Column<int>(type: "INTEGER", nullable: false),
                    Pressure = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Characters", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Characters");
        }
    }
}
