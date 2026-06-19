using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixBeliefABSwap : Migration
    {
        // The prior RenameBeliefColumns migration swapped A and B:
        //   Knowledge → BeliefB (wrong), Change → BeliefA (wrong).
        // Correct: Knowledge = BeliefA (axis a), Change = BeliefB (axis b).
        // This migration swaps them back using SQLite's ADD COLUMN + UPDATE + DROP approach
        // via a temp column (value 9 = sentinel for non-null).

        private static void SwapBeliefAB(MigrationBuilder mb, string table)
        {
            // Step 1: copy BeliefA into a temp sentinel (use value 9 — outside valid enum range 0-2)
            mb.Sql($@"ALTER TABLE ""{table}"" ADD COLUMN ""_TmpA"" INTEGER;");
            mb.Sql($@"UPDATE ""{table}"" SET ""_TmpA"" = ""BeliefA"";");
            // Step 2: overwrite BeliefA with BeliefB, BeliefB with temp
            mb.Sql($@"UPDATE ""{table}"" SET ""BeliefA"" = ""BeliefB"", ""BeliefB"" = ""_TmpA"";");
            // Step 3: drop the temp column
            mb.Sql($@"ALTER TABLE ""{table}"" DROP COLUMN ""_TmpA"";");
        }

        private static void SwapPartyBeliefAB(MigrationBuilder mb)
        {
            mb.Sql(@"ALTER TABLE ""ColonyStates"" ADD COLUMN ""_TmpA"" INTEGER;");
            mb.Sql(@"UPDATE ""ColonyStates"" SET ""_TmpA"" = ""PartyBeliefA"";");
            mb.Sql(@"UPDATE ""ColonyStates"" SET ""PartyBeliefA"" = ""PartyBeliefB"", ""PartyBeliefB"" = ""_TmpA"";");
            mb.Sql(@"ALTER TABLE ""ColonyStates"" DROP COLUMN ""_TmpA"";");
        }

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            SwapBeliefAB(migrationBuilder, "Factions");
            SwapBeliefAB(migrationBuilder, "Characters");
            SwapPartyBeliefAB(migrationBuilder);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Swap is its own inverse
            SwapBeliefAB(migrationBuilder, "Factions");
            SwapBeliefAB(migrationBuilder, "Characters");
            SwapPartyBeliefAB(migrationBuilder);
        }
    }
}
