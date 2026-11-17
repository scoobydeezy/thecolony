using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    /// <summary>Goal-driven World Conditions (ruling 2026-10-26). A goal no longer carries World State text, and its advance
    /// Effects no longer establish or end conditions: what becomes true is the text of World Conditions that vary by (or
    /// require) the goal's stage. Data first, then the columns go:
    /// 1. the conditions the campaign's goals established are converted to vary by their goal's stage;
    /// 2. Order Excluded also requires Sunset the Order to be Accomplished (it keeps its Assembly Hall requirement);
    /// 3. every other goal World State text becomes a condition of its own, titled after the goal, so no text is lost;
    /// 4. condition Effects are removed from the goals' advance Effects; 5. ProgressingWorldState and CompletedWorldState
    /// are dropped. Each step is guarded, so a campaign without these rows is untouched.</summary>
    public partial class GoalDrivenConditions : Migration
    {
        private static readonly string[] Stages = ["Planning", "Progressing", "Ready", "Accomplished", "Failed", "Retired"];

        /// <summary>The "varies by" JSON for a goal: <paramref name="text"/> gives each stage's text (an SQL expression).</summary>
        private static string VariesBy(string goalId, Func<string, string> text, Func<string, string> stress) =>
            $"json_object('subject', json_object('kind', 'goalStage', 'id', {goalId}), 'rows', json_array("
            + string.Join(", ", Stages.Select(st => $"json_object('state', '{st}', 'text', {text(st)}, 'stress', {stress(st)})")) + "))";

        /// <summary>The goal of a title and faction in the condition's campaign.</summary>
        private static string Goal(string title, string faction) =>
            $"FROM FactionGoals g WHERE g.Title = '{title.Replace("'", "''")}' AND g.FactionId = '{faction}' AND g.CampaignId = c.CampaignId";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Event conditions a goal established (by its advance Effects, or by design for Abide, whose Effects were
            // never written) now follow the goal's stage: in force from the stage that established them, while the goal
            // stays there or goes on to Accomplished (not once it Fails or is Retired). Their rule is that stage's text.
            (string Id, string Goal, string Faction, string[] From)[] converted =
            [
                ("procession_secured", "Secure the Procession", "keepers", ["Accomplished"]),
                ("procession_blockade", "Blockade the Procession", "seekers", ["Accomplished"]),
                ("dawn_poster_campaign", "Gain Momentum", "seekers", ["Accomplished"]),
                ("dawn_history_corrected", "Twilight the Dawn", "witnesses", ["Accomplished"]),
                ("cult_procession_access", "Abide", "cult", ["Progressing", "Ready", "Accomplished"]),
                ("house_custody_dispute", "Abide", "cult", ["Ready", "Accomplished"]),
            ];
            foreach (var (id, goal, faction, from) in converted)
                migrationBuilder.Sql($"""
                    UPDATE WorldConditions AS c
                    SET VariesByJson = (SELECT {VariesBy("g.Id", st => from.Contains(st) ? "c.Rule" : "''", st => from.Contains(st) ? "c.StressContribution" : "0")} {Goal(goal, faction)}),
                        Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1
                    WHERE c.Id = '{id}' AND c.VariesByJson IS NULL AND c.ActiveAtStart = 0 AND EXISTS (SELECT 1 {Goal(goal, faction)});
                    """);

            // 2. Order Excluded: Sunset the Order Accomplished, and Dawn holding Assembly Hall (its existing requirement).
            migrationBuilder.Sql($"""
                UPDATE WorldConditions AS c
                SET RequirementsJson = '[' || (SELECT json_object('kind', 'goalStage', 'goalId', g.Id, 'stages', json_array('Accomplished')) {Goal("Sunset the Order", "seekers")})
                                           || ',' || substr(c.RequirementsJson, 2),
                    ActiveAtStart = 1
                WHERE c.Id = 'order_excluded_from_assembly' AND c.VariesByJson IS NULL AND c.ActiveAtStart = 0 AND c.RequirementsJson LIKE '[' || char(123) || '%'
                  AND EXISTS (SELECT 1 {Goal("Sunset the Order", "seekers")});
                """);

            // 3. Every Achieve goal's remaining World State text, as a condition varying by the goal's stage: the
            // Progressing text while Progressing; the Completed text once Accomplished (and, for a goal the GM resolves,
            // already while it is Ready to Resolve: that text describes what play then resolves). A stage another
            // condition already covers is left blank; a goal with nothing left gets no condition.
            const string covered = """
                (EXISTS (SELECT 1 FROM WorldConditions w, json_each(w.VariesByJson, '$.rows') r
                         WHERE w.VariesByJson IS NOT NULL AND json_extract(w.VariesByJson, '$.subject.kind') = 'goalStage'
                           AND json_extract(w.VariesByJson, '$.subject.id') = t.Id
                           AND json_extract(r.value, '$.state') = '{0}' AND json_extract(r.value, '$.text') <> '')
                 OR EXISTS (SELECT 1 FROM WorldConditions w, json_each(w.RequirementsJson) q, json_each(q.value, '$.stages') s
                            WHERE json_extract(q.value, '$.kind') = 'goalStage' AND json_extract(q.value, '$.goalId') = t.Id AND s.value = '{0}'))
                """;
            string Text(string st) => st switch
            {
                "Progressing" => "t.P",
                "Ready" => "CASE WHEN t.OutcomeMode = 1 THEN COALESCE(NULLIF(t.C, ''), t.P) ELSE '' END",
                "Accomplished" => "t.C",
                _ => "''",
            };
            string Row(string st) => Text(st) == "''" ? "''" : $"CASE WHEN {string.Format(covered, st)} THEN '' ELSE {Text(st)} END";
            migrationBuilder.Sql($"""
                WITH t AS (
                    SELECT Id, CampaignId, Title, FactionId, OutcomeMode,
                           TRIM(COALESCE(ProgressingWorldState, '')) AS P, TRIM(COALESCE(CompletedWorldState, '')) AS C
                    FROM FactionGoals WHERE ConditionType = 0),
                rows AS (
                    SELECT t.Id, t.CampaignId, t.Title, t.FactionId, {Row("Progressing")} AS RP, {Row("Ready")} AS RR, {Row("Accomplished")} AS RA
                    FROM t WHERE t.P <> '' OR t.C <> '')
                INSERT INTO WorldConditions (Id, CampaignId, Title, Rule, RuleOtherwise, ActiveAtStart, RequirementsJson, StressContribution, SortOrder, VariesByJson)
                SELECT 'goal_' || r.Id, r.CampaignId, r.Title, '', NULL, 1, '[]', 0,
                       1000 + ROW_NUMBER() OVER (PARTITION BY r.CampaignId ORDER BY r.FactionId, r.Title),
                       {VariesBy("r.Id", st => st switch { "Progressing" => "r.RP", "Ready" => "r.RR", "Accomplished" => "r.RA", _ => "''" }, _ => "0")}
                FROM rows r
                WHERE (r.RP <> '' OR r.RR <> '' OR r.RA <> '') AND NOT EXISTS (SELECT 1 FROM WorldConditions w WHERE w.Id = 'goal_' || r.Id);
                """);

            // 4. Goals no longer establish or end conditions by their advance Effects.
            foreach (var col in new[] { "ProgressingEffectsJson", "AccomplishedEffectsJson" })
                migrationBuilder.Sql($"""
                    UPDATE FactionGoals
                    SET {col} = (SELECT json_group_array(json(e.value)) FROM json_each(FactionGoals.{col}) e
                                 WHERE json_extract(e.value, '$.targetType') IS NOT 'condition')
                    WHERE json_valid({col}) AND EXISTS (SELECT 1 FROM json_each(FactionGoals.{col}) e WHERE json_extract(e.value, '$.targetType') = 'condition');
                    """);

            // 5.
            migrationBuilder.DropColumn(
                name: "CompletedWorldState",
                table: "FactionGoals");

            migrationBuilder.DropColumn(
                name: "ProgressingWorldState",
                table: "FactionGoals");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CompletedWorldState",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProgressingWorldState",
                table: "FactionGoals",
                type: "TEXT",
                nullable: true);
        }
    }
}
