using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class WorldConditionsAudit : Migration
    {
        /// <summary>The World Conditions audit (WORLD-CONDITIONS-AUDIT.md, accepted 2026-10-26): one condition per subject, entity
        /// state before goal stage, table rules rather than narration. Each statement is guarded by the condition's current
        /// Id and Title (a merge's deletions by the merged condition's new Title), so edited or missing rows are left alone.</summary>
        private static readonly string[] Statements =
        [
            """"
            UPDATE WorldConditions SET Title = 'Procession Watch', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "67fe02c3-330a-4563-b685-3a9e68bbfac8"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Order checkpoints restrict access to the Keeper Procession route.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "Armed Order guards control approaches to the Procession.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'procession_secured' AND Title = 'Procession Secured';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_67fe02c3-330a-4563-b685-3a9e68bbfac8' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'procession_secured' AND Title = 'Procession Watch');
            """",
            """"
            UPDATE WorldConditions SET Title = 'Procession Protest', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "8bd0a0cb-8930-491c-9361-4d0aa26d413f"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Dawn demonstrators gather along the Keeper Procession route.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "The occupied route cannot be used without negotiation, dispersal or alternate approach.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'procession_blockade' AND Title = 'Procession Blockade';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_8bd0a0cb-8930-491c-9361-4d0aa26d413f' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'procession_blockade' AND Title = 'Procession Protest');
            """",
            """"
            UPDATE WorldConditions SET Title = 'Dawn Posters', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "91941b95-331e-497c-b2a0-e1e8a54013da"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Dawn campaign posters appear throughout the Assembly district.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "Dawn campaign posters cover the Colony, giving residents clear organizing contacts and public meeting notices.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'dawn_poster_campaign' AND Title = 'Dawn Poster Campaign';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_91941b95-331e-497c-b2a0-e1e8a54013da' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'dawn_poster_campaign' AND Title = 'Dawn Posters');
            """",
            """"
            UPDATE WorldConditions SET Title = 'Witness Broadsides', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "2822c497-2c2a-4b72-81a6-5decaa299974"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "Witness-authenticated historical accounts appear on broadsides covering or accompanying Dawn posters, and remain usable as evidence.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'dawn_history_corrected' AND Title = 'The Record Corrected';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_2822c497-2c2a-4b72-81a6-5decaa299974' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'dawn_history_corrected' AND Title = 'Witness Broadsides');
            """",
            """"
            UPDATE WorldConditions SET Title = 'Assembly Hearing', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "2976ada1-5124-4dad-8af8-66eaa5308060"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "A public hearing on Order authority is scheduled at Assembly Hall; a motion to withdraw recognition is introduced.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'goal_2976ada1-5124-4dad-8af8-66eaa5308060' AND Title = 'Sunset the Order';
            """",
            """"
            UPDATE WorldConditions SET Title = 'Assembly Hall Authority', ActiveAtStart = 1,
                RequirementsJson = '[{"kind":"assetController","assetId":"ced96c5d-670a-42ed-b736-9bb04164d20f","factionId":"seekers"}]'
            WHERE Id = 'order_excluded_from_assembly' AND Title = 'Order Excluded';
            """",
            """"
            UPDATE WorldConditions SET Title = 'River Crossings', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "c7d9544c-1260-4010-857d-a1662119b0c7"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Aspis establishes guarded supply and transit routes through the remaining usable river crossings.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "Major supply convoys use designated river crossings only with Aspis authorization, though independent bypasses remain possible.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'aspis_controlled_crossings' AND Title = 'Aspis-Controlled Crossings';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_c7d9544c-1260-4010-857d-a1662119b0c7' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'aspis_controlled_crossings' AND Title = 'River Crossings');
            """",
            """"
            UPDATE WorldConditions SET Title = 'Aspis Credit', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "5600a056-da04-4f92-8f46-115ffcd461e1"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Aspis loads portable capital and personnel onto outbound convoys and suspends new local credit guarantees.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "The River Exchange stops offering Consortium-backed guarantees and new credit while Aspis withdraws staff and capital.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'aspis_credit_withdrawn' AND Title = 'Aspis Credit Withdrawn';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_5600a056-da04-4f92-8f46-115ffcd461e1' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'aspis_credit_withdrawn' AND Title = 'Aspis Credit');
            """",
            """"
            UPDATE WorldConditions SET Title = 'Reception Rite', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "02a567da-5c60-468d-9e68-6a8f62749eab"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "At Pilgrim’s Rest, Cult guides can receive existing manifestations in supervised, Form-scaffolded spaces. A rite does not create a mnemonic Source or guarantee a truthful reconstruction.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'cult_reception_rite' AND Title = 'Cult Reception Rite';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_02a567da-5c60-468d-9e68-6a8f62749eab' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'cult_reception_rite' AND Title = 'Reception Rite');
            """",
            """"
            UPDATE WorldConditions SET Title = 'Emergency Mnemonic Routing', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "f6bed289-c2ff-4c86-833d-a877da82baab"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "Surviving EGRESS infrastructure can divert some escaping mnemonic weight to other containment sites; diversion transfers and concentrates the burden rather than ending Totality or erasing a Source.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'emergency_mnemonic_routing' AND Title = 'Emergency Mnemonic Routing';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_f6bed289-c2ff-4c86-833d-a877da82baab' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'emergency_mnemonic_routing' AND Title = 'Emergency Mnemonic Routing');
            """",
            """"
            UPDATE WorldConditions SET Title = 'Corrupted Frames', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "8528e927-0119-47dd-8d34-520c4c419744"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "EGRESS isolates compromised Frame control channels and begins shutting down unstable Proxies.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "The targeted EGRESS Frames are switched off and unavailable for security or research labor.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'corrupted_frames_disabled' AND Title = 'Corrupted Frames Disabled';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_8528e927-0119-47dd-8d34-520c4c419744' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'corrupted_frames_disabled' AND Title = 'Corrupted Frames');
            """",
            """"
            UPDATE WorldConditions SET Title = 'EGRESS Totality Survey', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "360a4626-af6a-4c71-a857-a243d21f6cc4"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "EGRESS deploys field instruments to measure Totality pressure and Source activity at accessible sites.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "Investigators can consult an EGRESS survey of measured Source activity, pressure gradients, and accessible routes. The survey does not reveal unverified personal identities.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'egress_totality_survey' AND Title = 'EGRESS Totality Survey';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_360a4626-af6a-4c71-a857-a243d21f6cc4' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'egress_totality_survey' AND Title = 'EGRESS Totality Survey');
            """",
            """"
            UPDATE WorldConditions SET Title = 'Milltown Passage', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "d084df17-59bd-45f7-b9b2-0ff079043161"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Order engineers mark the edges of Milltown''s impossible flood and establish guarded dry routes between inhabited blocks.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "One guarded evacuation passage across Milltown remains usable while the historical flood persists elsewhere.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'milltown_safe_passage' AND Title = 'Milltown Safe Passage';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_d084df17-59bd-45f7-b9b2-0ff079043161' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'milltown_safe_passage' AND Title = 'Milltown Passage');
            """",
            """"
            UPDATE WorldConditions SET Title = 'Old Town Quarantine', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "1f3298bf-8c42-41a8-87e8-f0212af6ba65"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Order patrols establish checkpoints along Old Town''s remaining accessible routes.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "Armed checkpoints restrict entry to and exit from Old Town without Order permission or an alternate route.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'old_town_quarantine' AND Title = 'Old Town Quarantine';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_1f3298bf-8c42-41a8-87e8-f0212af6ba65' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'old_town_quarantine' AND Title = 'Old Town Quarantine');
            """",
            """"
            UPDATE WorldConditions SET Title = 'Order Evacuations', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "b61df27f-9530-4d45-8849-c3fc1f387cdf"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Order patrols establish civilian assembly points and escort one stranded group toward a secure refuge.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "A guarded evacuation route and refuge are known; further escorted rescues can use them while accessible.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'order_evacuation_route' AND Title = 'Order Evacuation Route';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_b61df27f-9530-4d45-8849-c3fc1f387cdf' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'order_evacuation_route' AND Title = 'Order Evacuations');
            """",
            """"
            UPDATE WorldConditions SET Title = 'Garrison Armory', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "1f3e7fa9-4217-447a-bf97-779ed0955eab"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Dawn raiders penetrate the Order Watch Garrison armory and stage weapons for removal.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "Dawn can equip an armed contingent using weapons taken from the Order Watch Garrison until those supplies are expended, returned, or recaptured.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'dawn_armory_weapons' AND Title = 'Dawn Armory Weapons';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_1f3e7fa9-4217-447a-bf97-779ed0955eab' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'dawn_armory_weapons' AND Title = 'Garrison Armory');
            """",
            """"
            UPDATE WorldConditions SET Title = 'Founder’s Bridge', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "afd9f6a5-fd64-4481-8354-e5882a64c60f"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Shattered saboteurs plant charges at Founder''s Bridge and prepare an escape route before detonation.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "Founder’s Bridge cannot carry ordinary foot or convoy traffic. Travelers must find another crossing until the bridge is repaired or bypassed.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'founders_bridge_destroyed' AND Title = 'Founder’s Bridge Destroyed';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_afd9f6a5-fd64-4481-8354-e5882a64c60f' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'founders_bridge_destroyed' AND Title = 'Founder’s Bridge');
            """",
            """"
            UPDATE WorldConditions SET Title = 'Witness Field Archives', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "eb412c6d-4c43-4c6d-88ca-920808646fb2"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Witnesses deploy their Recovery Wagons to collect displaced belongings and testimony from affected districts.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "Mobile archive stations provide recovered Relationship and Context evidence without requiring access to the Hall of Remembrance.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'witness_field_archives' AND Title = 'Witness Field Archives';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_eb412c6d-4c43-4c6d-88ca-920808646fb2' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'witness_field_archives' AND Title = 'Witness Field Archives');
            """",
            """"
            UPDATE WorldConditions SET Title = 'Hall Containment', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "76fefbfa-fd88-4b6b-8d1b-2c30fab1771b"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Witnesses isolate dangerous collections and restrict entry to unstable wings of the Hall of Remembrance.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "One wing remains available for supervised preservation and Context research despite ongoing danger elsewhere.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'hall_secured_wing' AND Title = 'Hall Secured Wing';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_76fefbfa-fd88-4b6b-8d1b-2c30fab1771b' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'hall_secured_wing' AND Title = 'Hall Containment');
            """",
            """"
            UPDATE WorldConditions SET Title = 'Clearing House Occupation', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "ca629b3d-c96f-4e15-a9f2-c4e9812ce712"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Cult attendants occupy the Clearing House entrances and suspend the settlement of new claims.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'goal_ca629b3d-c96f-4e15-a9f2-c4e9812ce712' AND Title = 'Clear the Clearing House';
            """",
            """"
            UPDATE WorldConditions SET Title = 'Registry Tracing', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "0cf3f25e-3eab-4024-a712-1a6a68455823"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Pilgrim’s Rest can trace surrendered possessions through Claims Registry entries.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'goal_0cf3f25e-3eab-4024-a712-1a6a68455823' AND Title = 'Connect';
            """",
            """"
            UPDATE WorldConditions SET Title = 'Recovery Notices', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "9ae89441-9b41-4f7c-85ad-a92a4eeacd8f"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Witness recovery notices identify the missing resonant object and offer a reward for its return.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'goal_9ae89441-9b41-4f7c-85ad-a92a4eeacd8f' AND Title = 'Recover the Unclaimed Object';
            """",
            """"
            UPDATE WorldConditions SET ActiveAtStart = 1 WHERE Id = 'witness_specimen' AND ActiveAtStart = 0;
            """",
            """"
            UPDATE WorldConditions SET Title = 'Bell of the Sun', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "assetStatus", "id": "12f6d2e8-4695-42e9-ac44-a2e6742b9d02"}, "rows": [{"state": "Stable", "text": "", "stress": 0}, {"state": "Contested", "text": "", "stress": 0}, {"state": "Damaged", "text": "The Bell of the Sun is Damaged; its ringing is unreliable.", "stress": 0}, {"state": "Destroyed", "text": "Loss of the Colony''s familiar civic alarm increases public unease.", "stress": 1}]}'
            WHERE Id = 'civic_alarm_lost' AND Title = 'Civic Alarm Lost';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_eb6229a5-92a6-44e4-82d6-cc791b63064a' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'civic_alarm_lost' AND Title = 'Bell of the Sun');
            """",
            """"
            INSERT INTO WorldConditions (Id, CampaignId, Title, Rule, RuleOtherwise, ActiveAtStart, RequirementsJson, StressContribution, SortOrder, VariesByJson)
            SELECT 'empty_lectern', CampaignId, 'The Empty Lectern', '', NULL, 1, '[]', 0, 17, '{"subject": {"kind": "assetStatus", "id": "ff0d5870-c94c-443f-957e-0d872373366f"}, "rows": [{"state": "Stable", "text": "", "stress": 0}, {"state": "Contested", "text": "", "stress": 0}, {"state": "Damaged", "text": "The Empty Lectern is unsafe for remembrance ceremonies.", "stress": 0}, {"state": "Destroyed", "text": "Remembrance ceremonies require another site or lectern.", "stress": 0}]}' FROM WorldConditions
            WHERE Id = 'goal_6735b150-58fb-4cfe-9256-d124a46fdbc8' AND NOT EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'empty_lectern') AND EXISTS (SELECT 1 FROM Assets WHERE Id = 'ff0d5870-c94c-443f-957e-0d872373366f');
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_6735b150-58fb-4cfe-9256-d124a46fdbc8' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'empty_lectern' AND Title = 'The Empty Lectern');
            """",
            """"
            INSERT INTO WorldConditions (Id, CampaignId, Title, Rule, RuleOtherwise, ActiveAtStart, RequirementsJson, StressContribution, SortOrder, VariesByJson)
            SELECT 'civic_fund', CampaignId, 'Civic Improvement Fund', '', NULL, 1, '[]', 0, 18, '{"subject": {"kind": "assetController", "id": "6d139ecc-e99f-4344-8816-61b5810786c3"}, "rows": [{"state": "aspis", "text": "", "stress": 0}, {"state": "burdened", "text": "", "stress": 0}, {"state": "civilians", "text": "", "stress": 0}, {"state": "cult", "text": "", "stress": 0}, {"state": "fractured", "text": "", "stress": 0}, {"state": "heirs", "text": "", "stress": 0}, {"state": "institute", "text": "Dawn-funded work remains halted until refinanced.", "stress": 0}, {"state": "keepers", "text": "", "stress": 0}, {"state": "seekers", "text": "", "stress": 0}, {"state": "shattered", "text": "", "stress": 0}, {"state": "witnesses", "text": "The Fund''s resources go toward preservation; Dawn-funded work is halted.", "stress": 0}, {"state": "", "text": "Dawn-funded work is halted until the Fund is refinanced.", "stress": 0}]}' FROM WorldConditions
            WHERE Id = 'goal_42da29be-19bc-4fb7-93e1-f2abe8aa637a' AND NOT EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'civic_fund') AND EXISTS (SELECT 1 FROM Assets WHERE Id = '6d139ecc-e99f-4344-8816-61b5810786c3');
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_42da29be-19bc-4fb7-93e1-f2abe8aa637a' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'civic_fund' AND Title = 'Civic Improvement Fund');
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_6336b6ac-68a6-4e5f-bede-cc83828f6a75' AND EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'civic_fund' AND Title = 'Civic Improvement Fund');
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_7aa79d6e-661f-40ad-a14b-cd6906f4b49b' AND Title = 'Open the Book of Names';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_cbfba392-9945-40b2-a216-eda8c286f560' AND Title = 'Break the Shattered';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_8ec2638b-d7cc-474b-9a66-2739ffc29194' AND Title = 'Steal the Offering Chest';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_5e6312a0-21e3-40ef-8a83-aab7612a351f' AND Title = 'Acquire the Book of Names';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_514d9423-b0db-4add-bab1-b2a3b498bcc2' AND Title = 'Recover the Registry (tentative)';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_f55c28b3-d9dd-489c-b431-54a2598ad0ee' AND Title = 'Reveal';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_f7b1c7a6-865f-44c4-9fbf-be233fea2533' AND Title = 'Understand';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_927aa7b6-d391-484b-9f58-145d45d9421e' AND Title = 'Requisition the Specimen';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_65d6e10e-dbc6-4b35-9e2c-2526421cae1d' AND Title = 'Seize the Stockpiles';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_5a3c3c08-e4e0-4c07-8975-04bd6a5d9d6a' AND Title = 'Steal the Ledger';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_783de804-d426-4f67-a3a3-e93beb35ea47' AND Title = 'Steal the Unclaimed Object';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_5d3026c0-09a7-47e0-9306-55ca93911bfe' AND Title = 'Secure the Hall of Keepers';
            """",
            """"
            DELETE FROM WorldConditions WHERE Id = 'goal_2c16e93c-87d4-4262-92d8-6f16ad192876' AND Title = 'Sunset the Dawn';
            """",
            """"
            UPDATE WorldConditions SET Title = 'Tavia''s Hunt', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "6c8fbe28-6183-4309-9ac8-2a2217ed4178"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Tavia Rusk begins shadowing Darkwing, looking for access to Vara.", "stress": 0}, {"state": "Ready", "text": "During the next session, Tavia Rusk attempts to assassinate Vara; the attempt does not guarantee her death.", "stress": 0}, {"state": "Accomplished", "text": "", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'goal_6c8fbe28-6183-4309-9ac8-2a2217ed4178' AND Title = 'Take out the Keeper';
            """",
            """"
            UPDATE WorldConditions SET Title = 'Slum Evacuation', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0, ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "cd6cc308-00d1-49d6-8c0a-0ab08b5548b3"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Witnesses record the identities and belongings of slum residents while guiding a threatened neighborhood toward a viable exit.", "stress": 0}, {"state": "Ready", "text": "", "stress": 0}, {"state": "Accomplished", "text": "A slum neighborhood reaches a documented refuge with its people and belongings accounted for; the wider district remains under Totality.", "stress": 0}, {"state": "Failed", "text": "", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE Id = 'goal_cd6cc308-00d1-49d6-8c0a-0ab08b5548b3' AND Title = 'Evacuate Slums';
            """",
        ];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var sql in Statements) migrationBuilder.Sql(sql);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // data only: not reversible (the removed texts are listed in GOAL-ADVANCE-EFFECTS-CHANGES.md §12)
        }
    }
}
