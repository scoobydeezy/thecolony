using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class RenameBeliefColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Ritual",
                table: "Factions",
                newName: "BeliefC");

            migrationBuilder.RenameColumn(
                name: "Knowledge",
                table: "Factions",
                newName: "BeliefB");

            migrationBuilder.RenameColumn(
                name: "Change",
                table: "Factions",
                newName: "BeliefA");

            migrationBuilder.RenameColumn(
                name: "PartyRitual",
                table: "ColonyStates",
                newName: "PartyBeliefC");

            migrationBuilder.RenameColumn(
                name: "PartyKnowledge",
                table: "ColonyStates",
                newName: "PartyBeliefB");

            migrationBuilder.RenameColumn(
                name: "PartyChange",
                table: "ColonyStates",
                newName: "PartyBeliefA");

            migrationBuilder.RenameColumn(
                name: "Ritual",
                table: "Characters",
                newName: "BeliefC");

            migrationBuilder.RenameColumn(
                name: "Knowledge",
                table: "Characters",
                newName: "BeliefB");

            migrationBuilder.RenameColumn(
                name: "Change",
                table: "Characters",
                newName: "BeliefA");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "BeliefC",
                table: "Factions",
                newName: "Ritual");

            migrationBuilder.RenameColumn(
                name: "BeliefB",
                table: "Factions",
                newName: "Knowledge");

            migrationBuilder.RenameColumn(
                name: "BeliefA",
                table: "Factions",
                newName: "Change");

            migrationBuilder.RenameColumn(
                name: "PartyBeliefC",
                table: "ColonyStates",
                newName: "PartyRitual");

            migrationBuilder.RenameColumn(
                name: "PartyBeliefB",
                table: "ColonyStates",
                newName: "PartyKnowledge");

            migrationBuilder.RenameColumn(
                name: "PartyBeliefA",
                table: "ColonyStates",
                newName: "PartyChange");

            migrationBuilder.RenameColumn(
                name: "BeliefC",
                table: "Characters",
                newName: "Ritual");

            migrationBuilder.RenameColumn(
                name: "BeliefB",
                table: "Characters",
                newName: "Knowledge");

            migrationBuilder.RenameColumn(
                name: "BeliefA",
                table: "Characters",
                newName: "Change");
        }
    }
}
