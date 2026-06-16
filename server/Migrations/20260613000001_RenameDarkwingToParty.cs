using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class RenameDarkwingToParty : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(table: "ColonyStates", name: "DarkwingRitual",        newName: "PartyRitual");
            migrationBuilder.RenameColumn(table: "ColonyStates", name: "DarkwingKnowledge",     newName: "PartyKnowledge");
            migrationBuilder.RenameColumn(table: "ColonyStates", name: "DarkwingChange",        newName: "PartyChange");
            migrationBuilder.RenameColumn(table: "ColonyStates", name: "DarkwingTruthValue",    newName: "PartyTruthValue");
            migrationBuilder.RenameColumn(table: "ColonyStates", name: "DarkwingStabilityValue", newName: "PartyStabilityValue");
            migrationBuilder.RenameColumn(table: "ColonyStates", name: "DarkwingAgencyValue",   newName: "PartyAgencyValue");

            migrationBuilder.RenameColumn(table: "SessionLog",   name: "DarkwingActions",       newName: "PartyActions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(table: "ColonyStates", name: "PartyRitual",        newName: "DarkwingRitual");
            migrationBuilder.RenameColumn(table: "ColonyStates", name: "PartyKnowledge",     newName: "DarkwingKnowledge");
            migrationBuilder.RenameColumn(table: "ColonyStates", name: "PartyChange",        newName: "DarkwingChange");
            migrationBuilder.RenameColumn(table: "ColonyStates", name: "PartyTruthValue",    newName: "DarkwingTruthValue");
            migrationBuilder.RenameColumn(table: "ColonyStates", name: "PartyStabilityValue", newName: "DarkwingStabilityValue");
            migrationBuilder.RenameColumn(table: "ColonyStates", name: "PartyAgencyValue",   newName: "DarkwingAgencyValue");

            migrationBuilder.RenameColumn(table: "SessionLog",   name: "PartyActions",       newName: "DarkwingActions");
        }
    }
}
