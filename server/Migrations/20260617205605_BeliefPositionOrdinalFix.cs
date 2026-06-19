using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class BeliefPositionOrdinalFix : Migration
    {
        // Old ordinals: KnowledgePosition { Hidden=0, Controlled=1, Revealed=2 }
        //               ChangePosition    { Yes=0, No=1 }
        // New ordinals: BeliefPosition    { Positive=0, Neutral=1, Negative=2 }
        //
        // Ritual was already Good=0/Neutral=1/Bad=2 — matches Positive/Neutral/Negative, no change.
        // Knowledge: Revealed(2)→Positive(0), Controlled(1)→Neutral(1) [no-op], Hidden(0)→Negative(2)
        // Change:    Yes(0)→Positive(0) [no-op], No(1)→Negative(2)
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Knowledge: remap Hidden(0)↔Revealed(2); use 9 as a temp sentinel
            migrationBuilder.Sql("UPDATE Factions    SET Knowledge = 9 WHERE Knowledge = 0");
            migrationBuilder.Sql("UPDATE Factions    SET Knowledge = 0 WHERE Knowledge = 2");
            migrationBuilder.Sql("UPDATE Factions    SET Knowledge = 2 WHERE Knowledge = 9");
            migrationBuilder.Sql("UPDATE Characters  SET Knowledge = 9 WHERE Knowledge = 0");
            migrationBuilder.Sql("UPDATE Characters  SET Knowledge = 0 WHERE Knowledge = 2");
            migrationBuilder.Sql("UPDATE Characters  SET Knowledge = 2 WHERE Knowledge = 9");
            migrationBuilder.Sql("UPDATE ColonyStates SET PartyKnowledge = 9 WHERE PartyKnowledge = 0");
            migrationBuilder.Sql("UPDATE ColonyStates SET PartyKnowledge = 0 WHERE PartyKnowledge = 2");
            migrationBuilder.Sql("UPDATE ColonyStates SET PartyKnowledge = 2 WHERE PartyKnowledge = 9");

            // Change: remap No(1)→Negative(2)
            migrationBuilder.Sql("UPDATE Factions    SET Change = 2 WHERE Change = 1");
            migrationBuilder.Sql("UPDATE Characters  SET Change = 2 WHERE Change = 1");
            migrationBuilder.Sql("UPDATE ColonyStates SET PartyChange = 2 WHERE PartyChange = 1");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Reverse Change: Negative(2)→No(1)
            migrationBuilder.Sql("UPDATE Factions    SET Change = 1 WHERE Change = 2");
            migrationBuilder.Sql("UPDATE Characters  SET Change = 1 WHERE Change = 2");
            migrationBuilder.Sql("UPDATE ColonyStates SET PartyChange = 1 WHERE PartyChange = 2");

            // Reverse Knowledge: swap Positive(0)↔Negative(2)
            migrationBuilder.Sql("UPDATE Factions    SET Knowledge = 9 WHERE Knowledge = 0");
            migrationBuilder.Sql("UPDATE Factions    SET Knowledge = 0 WHERE Knowledge = 2");
            migrationBuilder.Sql("UPDATE Factions    SET Knowledge = 2 WHERE Knowledge = 9");
            migrationBuilder.Sql("UPDATE Characters  SET Knowledge = 9 WHERE Knowledge = 0");
            migrationBuilder.Sql("UPDATE Characters  SET Knowledge = 0 WHERE Knowledge = 2");
            migrationBuilder.Sql("UPDATE Characters  SET Knowledge = 2 WHERE Knowledge = 9");
            migrationBuilder.Sql("UPDATE ColonyStates SET PartyKnowledge = 9 WHERE PartyKnowledge = 0");
            migrationBuilder.Sql("UPDATE ColonyStates SET PartyKnowledge = 0 WHERE PartyKnowledge = 2");
            migrationBuilder.Sql("UPDATE ColonyStates SET PartyKnowledge = 2 WHERE PartyKnowledge = 9");
        }
    }
}
