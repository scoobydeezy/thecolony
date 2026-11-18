using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

// ADVENTURE-BOOK-PLAN.md §9 step 4: characters move to canonical content files. Program.cs runs
// CanonLinks.GuardSwitch first, so this only applies when every row has a file to link to.
namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class CanonCharacterStore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CharacterDetails");

            migrationBuilder.DropTable(
                name: "CharacterNarrativeProfiles");

            migrationBuilder.DropColumn(
                name: "Age",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "AgencyValue",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Aliases",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Ancestry",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Background",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "BeliefA",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "BeliefB",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "BeliefC",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "CharacterType",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Class",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Conviction",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "DoubtDirection",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "FactionId",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Gender",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Heritage",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Impressionable",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Influence",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Instability",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Level",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "LocationId",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "NarrativeTier",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Occupation",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "PortraitPath",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Pressure",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Pronouns",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "ReaffirmedFactionId",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "SocialClassId",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "StabilityValue",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "State",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "TruthValue",
                table: "Characters");

            // EF scaffolded this as RenameColumn(Summary -> CanonId), which would have put every
            // summary into the link column. Summary moves to the files like the other fields; CanonId
            // starts empty and is filled by CanonLinks.Backfill from the merge's id-map.yaml.
            migrationBuilder.DropColumn(
                name: "Summary",
                table: "Characters");

            migrationBuilder.AddColumn<string>(
                name: "CanonId",
                table: "Characters",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CharacterSectionReveals",
                columns: table => new
                {
                    CharacterId = table.Column<string>(type: "TEXT", nullable: false),
                    SectionKey = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CharacterSectionReveals", x => new { x.CharacterId, x.SectionKey });
                });

            migrationBuilder.CreateIndex(
                name: "IX_Characters_CanonId",
                table: "Characters",
                column: "CanonId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CharacterSectionReveals");

            migrationBuilder.DropIndex(
                name: "IX_Characters_CanonId",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "CanonId",
                table: "Characters");

            migrationBuilder.AddColumn<string>(
                name: "Summary",
                table: "Characters",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Age",
                table: "Characters",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "AgencyValue",
                table: "Characters",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "Aliases",
                table: "Characters",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Ancestry",
                table: "Characters",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Background",
                table: "Characters",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BeliefA",
                table: "Characters",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BeliefB",
                table: "Characters",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BeliefC",
                table: "Characters",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CharacterType",
                table: "Characters",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Class",
                table: "Characters",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Conviction",
                table: "Characters",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "DoubtDirection",
                table: "Characters",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FactionId",
                table: "Characters",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Gender",
                table: "Characters",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Heritage",
                table: "Characters",
                type: "TEXT",
                nullable: true);

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

            migrationBuilder.AddColumn<int>(
                name: "Instability",
                table: "Characters",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Level",
                table: "Characters",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LocationId",
                table: "Characters",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Characters",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "NarrativeTier",
                table: "Characters",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Occupation",
                table: "Characters",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PortraitPath",
                table: "Characters",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Pressure",
                table: "Characters",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Pronouns",
                table: "Characters",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReaffirmedFactionId",
                table: "Characters",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SocialClassId",
                table: "Characters",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "StabilityValue",
                table: "Characters",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "State",
                table: "Characters",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<double>(
                name: "TruthValue",
                table: "Characters",
                type: "REAL",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.CreateTable(
                name: "CharacterDetails",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Body = table.Column<string>(type: "TEXT", nullable: true),
                    CharacterId = table.Column<string>(type: "TEXT", nullable: false),
                    Heading = table.Column<string>(type: "TEXT", nullable: false),
                    Key = table.Column<string>(type: "TEXT", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    Visibility = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CharacterDetails", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CharacterNarrativeProfiles",
                columns: table => new
                {
                    CharacterId = table.Column<string>(type: "TEXT", nullable: false),
                    BlindSpot = table.Column<string>(type: "TEXT", nullable: true),
                    Fears = table.Column<string>(type: "TEXT", nullable: true),
                    Motivation = table.Column<string>(type: "TEXT", nullable: true),
                    NarrativeRole = table.Column<string>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", nullable: true),
                    Overview = table.Column<string>(type: "TEXT", nullable: true),
                    PerformanceInspiration = table.Column<string>(type: "TEXT", nullable: true),
                    Personality = table.Column<string>(type: "TEXT", nullable: true),
                    PortrayalNotes = table.Column<string>(type: "TEXT", nullable: true),
                    PressureResponse = table.Column<string>(type: "TEXT", nullable: true),
                    PrimaryProtection = table.Column<string>(type: "TEXT", nullable: true),
                    SignatureObject = table.Column<string>(type: "TEXT", nullable: true),
                    SignatureQuote = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CharacterNarrativeProfiles", x => x.CharacterId);
                });
        }
    }
}
