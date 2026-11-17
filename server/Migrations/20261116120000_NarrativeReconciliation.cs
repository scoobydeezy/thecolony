using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ColonyTracker.Api.Migrations
{
    /// <inheritdoc />
    public partial class NarrativeReconciliation : Migration
    {
        /// <summary>Narrative reconciliation (NARRATIVE-RECONCILIATION-CHANGES.md, 2026-11-16): the app's goals, World Conditions and
        /// Narrative Events brought into line with the revised campaign docs (five Act III fronts, Faction Goals.md rewrite).
        /// Every statement is guarded by the row's current Id and Title (inserts by NOT EXISTS), so rows edited by hand are left alone.</summary>
        private static readonly string[] Statements =
        [
            """"
            UPDATE Assets SET Keystone = 1 WHERE Id = '0caa5f7d-bda7-4af4-bb5a-0e0f093db6e1' AND Name = 'Claims Registry';
            """",
            """"
            UPDATE Assets SET Keystone = 0 WHERE Id = 'c9e342d5-e48e-471d-a7b3-a896d2d0af17' AND Name = 'River Exchange';
            """",
            """"
            UPDATE WorldConditions SET RequirementsJson = REPLACE(RequirementsJson, '90c84272-604f-55b0-8701-67091727c4fc', '4432a639-df72-4a36-b7a7-32d26f46b725') WHERE Id = 'witness_specimen' AND Title = 'Witness Specimen';
            """",
            """"
            UPDATE FactionGoals SET ProgressingEffectsJson = REPLACE(ProgressingEffectsJson, '90c84272-604f-55b0-8701-67091727c4fc', '4432a639-df72-4a36-b7a7-32d26f46b725'),
            AccomplishedEffectsJson = REPLACE(AccomplishedEffectsJson, '90c84272-604f-55b0-8701-67091727c4fc', '4432a639-df72-4a36-b7a7-32d26f46b725')
            WHERE Id = '9ae89441-9b41-4f7c-85ad-a92a4eeacd8f' AND Title = 'Recover the Unclaimed Object';
            """",
            """"
            UPDATE FactionGoals SET ProgressingEffectsJson = REPLACE(ProgressingEffectsJson, '90c84272-604f-55b0-8701-67091727c4fc', '4432a639-df72-4a36-b7a7-32d26f46b725'),
            AccomplishedEffectsJson = REPLACE(AccomplishedEffectsJson, '90c84272-604f-55b0-8701-67091727c4fc', '4432a639-df72-4a36-b7a7-32d26f46b725')
            WHERE Id = '927aa7b6-d391-484b-9f58-145d45d9421e' AND Title = 'Requisition the Specimen';
            """",
            """"
            UPDATE FactionGoals SET ProgressingEffectsJson = REPLACE(ProgressingEffectsJson, '90c84272-604f-55b0-8701-67091727c4fc', '4432a639-df72-4a36-b7a7-32d26f46b725'),
            AccomplishedEffectsJson = REPLACE(AccomplishedEffectsJson, '90c84272-604f-55b0-8701-67091727c4fc', '4432a639-df72-4a36-b7a7-32d26f46b725')
            WHERE Id = 'f55c28b3-d9dd-489c-b431-54a2598ad0ee' AND Title = 'Reveal';
            """",
            """"
            DELETE FROM NarrativeEntityLinks WHERE EntityType = 2 AND EntityId = '7056739c-bf04-4dc5-b65f-56a500572fab' AND NOT EXISTS (SELECT 1 FROM Assets WHERE Id = '7056739c-bf04-4dc5-b65f-56a500572fab');
            """",
            """"
            UPDATE FactionGoals SET ChampionId = NULL WHERE Id = 'd084df17-59bd-45f7-b9b2-0ff079043161' AND Title = 'Contain Milltown Flooding' AND FactionId = 'keepers';
            """",
            """"
            UPDATE FactionGoals SET Title = 'Evacuate Milltown', FactionId = 'seekers', ConditionType = 0, EarliestAct = 3, Priority = 0,
            OutcomeMode = 1, Visibility = 1, TargetEntityType = 2, TargetEntityId = 'ced96c5d-670a-42ed-b736-9bb04164d20f', TargetState = NULL,
            TargetOwnerFactionId = NULL, TargetProperty = NULL, TargetOperator = NULL, TargetThreshold = NULL
            WHERE Id = 'd084df17-59bd-45f7-b9b2-0ff079043161' AND Title = 'Contain Milltown Flooding';
            """",
            """"
            UPDATE WorldConditions SET Title = 'Milltown Rescue', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0,
            ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "d084df17-59bd-45f7-b9b2-0ff079043161"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Dawn organizers map Milltown''s surviving shelters and stage rescue teams on the north shore of the River Foam.", "stress": 0}, {"state": "Ready", "text": "Dawn rescue teams are inside Milltown, holding shelters and routes while residents are dragged by currents no one can see.", "stress": 0}, {"state": "Accomplished", "text": "Dawn''s organized response holds in Milltown; the residents it reached are sheltered while the remembered flood persists (the Assembly Hall''s status records how much survived).", "stress": 0}, {"state": "Failed", "text": "Dawn''s Milltown response has collapsed; its rescue teams are scattered or lost.", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}' WHERE Id = 'milltown_safe_passage' AND Title = 'Milltown Passage';
            """",
            """"
            UPDATE FactionGoals SET Title = 'Preserve the Ledger', FactionId = 'witnesses', ConditionType = 0, EarliestAct = 3, Priority = 0,
            OutcomeMode = 1, Visibility = 1, TargetEntityType = 2, TargetEntityId = '92220b6d-3523-4d91-85e8-491c20d9ed12', TargetState = NULL,
            TargetOwnerFactionId = NULL, TargetProperty = NULL, TargetOperator = NULL, TargetThreshold = NULL
            WHERE Id = '76fefbfa-fd88-4b6b-8d1b-2c30fab1771b' AND Title = 'Stabilize the Hall';
            """",
            """"
            UPDATE WorldConditions SET Title = 'Ledger Preservation', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0,
            ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "76fefbfa-fd88-4b6b-8d1b-2c30fab1771b"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Witnesses move the Ledger''s working volumes to Celia''s desk and post defenders in the Hall of Remembrance.", "stress": 0}, {"state": "Ready", "text": "Under Totality, four Witness defenders hold the Hall of Remembrance while Celia works the Ledger''s cross-references.", "stress": 0}, {"state": "Accomplished", "text": "The Witnesses keep the Ledger and the capacity to use it through Totality (the Ledger''s status records how much survived).", "stress": 0}, {"state": "Failed", "text": "The Witnesses could not preserve the Ledger; it is lost to them.", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}' WHERE Id = 'hall_secured_wing' AND Title = 'Hall Containment';
            """",
            """"
            UPDATE FactionGoals SET Title = 'Contain the Breach', FactionId = 'institute', ConditionType = 0, EarliestAct = 3, Priority = 0,
            OutcomeMode = 1, Visibility = 1, TargetEntityType = 2, TargetEntityId = '64f51360-de07-43b7-b050-7ef7456bad52', TargetState = NULL,
            TargetOwnerFactionId = NULL, TargetProperty = NULL, TargetOperator = NULL, TargetThreshold = NULL
            WHERE Id = 'f6bed289-c2ff-4c86-833d-a877da82baab' AND Title = 'Contain the Breach';
            """",
            """"
            UPDATE WorldConditions SET Title = 'Emergency Mnemonic Routing', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0,
            ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "f6bed289-c2ff-4c86-833d-a877da82baab"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "EGRESS stages emergency teams at Occlusion Containment and the Engram Vault.", "stress": 0}, {"state": "Ready", "text": "EGRESS splits its staff between the Occlusion Containment emergency and the defence of the Engram Vault.", "stress": 0}, {"state": "Accomplished", "text": "Surviving EGRESS infrastructure can divert some escaping mnemonic weight to other containment sites; diversion transfers and concentrates the burden rather than ending Totality or erasing a Source (the Engram Vault''s status records how much survived).", "stress": 0}, {"state": "Failed", "text": "EGRESS was overwhelmed by the containment emergency and could not protect the Engram Vault.", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}' WHERE Id = 'emergency_mnemonic_routing' AND Title = 'Emergency Mnemonic Routing';
            """",
            """"
            UPDATE FactionGoals SET Title = 'Open the Door', FactionId = 'cult', ConditionType = 0, EarliestAct = 3, Priority = 0,
            OutcomeMode = 1, Visibility = 1, TargetEntityType = 2, TargetEntityId = '2d1a8b50-3459-456a-baab-f938e29ae276', TargetState = NULL,
            TargetOwnerFactionId = NULL, TargetProperty = NULL, TargetOperator = NULL, TargetThreshold = NULL
            WHERE Id = '02a567da-5c60-468d-9e68-6a8f62749eab' AND Title = 'Receive the Pilgrims';
            """",
            """"
            UPDATE WorldConditions SET Title = 'The Open Door', Rule = '', RuleOtherwise = NULL, RequirementsJson = '[]', StressContribution = 0,
            ActiveAtStart = 1, VariesByJson = '{"subject": {"kind": "goalStage", "id": "02a567da-5c60-468d-9e68-6a8f62749eab"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Cult hosts light lanterns through the Pilgrim Quarter and ready Pilgrim''s Rest to shelter anyone fleeing Totality.", "stress": 0}, {"state": "Ready", "text": "Pilgrim''s Rest opens to all. Its welcome becomes a pull no guest wants to leave, and the Cult''s own hosts are among those held.", "stress": 0}, {"state": "Accomplished", "text": "Cult hosts and shelters again operate beyond Pilgrim''s Rest, welcoming the displaced without asking them to stay (Pilgrim''s Rest''s status records how much survived).", "stress": 0}, {"state": "Failed", "text": "Pilgrim''s Rest still holds its guests and staff; the Cult cannot act beyond its walls.", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}' WHERE Id = 'cult_reception_rite' AND Title = 'Reception Rite';
            """",
            """"
            INSERT INTO FactionGoals (Id, AccomplishedEffectsJson, CampaignId, ChampionId, ConditionType, EarliestAct, FactionId, IntroducedAtEventId,
            OutcomeMode, Priority, ProgressingEffectsJson, Status, TargetEntityId, TargetEntityType, TargetOperator, TargetOwnerFactionId,
            TargetProperty, TargetState, TargetThreshold, Title, Visibility)
            SELECT 'fe6e3dde-aca8-4b0f-ba3d-1bc711a8f790', '[]', '00000000-0000-0000-0000-000000000001', NULL, 0, 3, 'shattered', NULL, 1, 0, '[]', 0, 'd789ddfd-d031-4059-bf9c-5660840aa883', 2, NULL, NULL, NULL, NULL, NULL,
            'Answer the Reckoning', 1
            WHERE NOT EXISTS (SELECT 1 FROM FactionGoals WHERE Id = 'fe6e3dde-aca8-4b0f-ba3d-1bc711a8f790');
            """",
            """"
            INSERT INTO WorldConditions (Id, ActiveAtStart, CampaignId, RequirementsJson, Rule, SortOrder, StressContribution, Title, RuleOtherwise, VariesByJson)
            SELECT 'goal_fe6e3dde-aca8-4b0f-ba3d-1bc711a8f790', 1, '00000000-0000-0000-0000-000000000001', '[]', '', 1039, 0, 'Old Town Response', NULL, '{"subject": {"kind": "goalStage", "id": "fe6e3dde-aca8-4b0f-ba3d-1bc711a8f790"}, "rows": [{"state": "Planning", "text": "", "stress": 0}, {"state": "Progressing", "text": "Shattered cells pass word through the Dead Drop Network and gather at the edges of Old Town.", "stress": 0}, {"state": "Ready", "text": "An organized Shattered response moves into the Old Town cemetery as the Broken Bell rings unstruck.", "stress": 0}, {"state": "Accomplished", "text": "The Shattered keep an organized response at Old Town, able to expose and act on its reclaimed history (the Dead Drop Network''s status records how much survived).", "stress": 0}, {"state": "Failed", "text": "The Shattered response at Old Town collapsed; its cells are scattered.", "stress": 0}, {"state": "Retired", "text": "", "stress": 0}]}'
            WHERE NOT EXISTS (SELECT 1 FROM WorldConditions WHERE Id = 'goal_fe6e3dde-aca8-4b0f-ba3d-1bc711a8f790');
            """",
            """"
            INSERT INTO FactionGoals (Id, AccomplishedEffectsJson, CampaignId, ChampionId, ConditionType, EarliestAct, FactionId, IntroducedAtEventId,
            OutcomeMode, Priority, ProgressingEffectsJson, Status, TargetEntityId, TargetEntityType, TargetOperator, TargetOwnerFactionId,
            TargetProperty, TargetState, TargetThreshold, Title, Visibility)
            SELECT 'b29d5f20-0d4a-447d-aef9-43d10bd1e8c2', '[]', '00000000-0000-0000-0000-000000000001', NULL, 1, 1, 'shattered', NULL, 0, 1, '[]', 1, 'd789ddfd-d031-4059-bf9c-5660840aa883', 2, NULL, NULL, NULL, 'Stable', NULL,
            'Protect the Network', 1
            WHERE NOT EXISTS (SELECT 1 FROM FactionGoals WHERE Id = 'b29d5f20-0d4a-447d-aef9-43d10bd1e8c2');
            """",
            """"
            UPDATE FactionGoals SET EarliestAct = 2 WHERE Id = '6c8fbe28-6183-4309-9ac8-2a2217ed4178' AND Title = 'Take out the Keeper' AND EarliestAct = 1;
            """",
            """"
            UPDATE FactionGoals SET Status = 5, ChampionId = NULL WHERE Id = '8528e927-0119-47dd-8d34-520c4c419744' AND Title = 'Disable Corrupted Frames' AND Status IN (0, 1);
            """",
            """"
            UPDATE NarrativeEvents SET Title = 'Old Town', Description = 'The Party enters abandoned Old Town expecting the ruins of a Duskwood attack and instead finds details that refuse to fit the story. At the old cemetery they meet Tom, who calls everyone “Sunny” despite remembering people, places, objects, and relationships with remarkable precision. Possessions from six forgotten lives recombine into an unstable Chorus whose fragments migrate between bodies whenever they are dispersed. The Party learns to recognize each person''s recurring Pattern, find the grave and history it belongs to, and give that life a truthful Name; each Named Boundary restores one life and Anchors its grave. Old Town''s buried truth becomes clear: its catastrophe began within the Colony, and the Shattered''s habit of exposing evidence without preserving provenance risks repeating it. Tom is briefly relieved, but whoever he calls “Sunny” remains unfound.' WHERE Id = '75476309-ba60-4567-91b0-351abf851061' AND Title = 'Sunny';
            """",
            """"
            UPDATE NarrativeEvents SET Title = 'Sunny', NarrativeFunction = 'Shattered Front', Summary = 'Under Totality, Old Town remembers one woman hundreds of times.', Description = 'Lost parts of Old Town return as solid, featureless black extensions of its ruined streets, and the damaged Broken Bell sounds without being struck. Tom''s genuine Relationship with Sundara, under overwhelming Recognition, drives the district''s Wound to manifest hundreds of false reconstructions of one woman. Darkwing must hold back the black horde while searching the cemetery for Sundara''s specific grave among many plausible ones, then sound the authentic whistle bound to her memory. Graves Anchored on an earlier Old Town visit help calibrate the search but do not solve it. Ending the mass Incursion can stabilize the cemetery without healing Tom or the district''s older Wound. Sunny is the Shattered front: the Shattered''s organized response sets the Dead Drop Network''s finale capability and its Finale Pressure.' WHERE Id = 'b7b9d99c-8b72-4b3e-b3d7-afafd7234ba8' AND Title = 'The Reckoning';
            """",
            """"
            UPDATE NarrativeEvents SET NarrativeFunction = 'EGRESS Front', Description = 'Under Totality, the boundaries between containment, Source, and reconstructed Pattern fail at Occlusion Containment. A great Veiled Dragon erupts from its prison and leaves carrying its own mobile Source. Other Incursions threaten staff and the city, the Sheep punishes unbroken observation, and an apparent Mother with her aquatic brood exposes a real Relationship that EGRESS''s return plumbing has misunderstood. Restoring the mother–brood return circuit can reestablish containment for cell-bound Sources, leaving the Dragon, some escapees, damaged research, and the central Scar as unresolved truths. The Breach is the EGRESS front: its one outcome sets the Engram Vault''s finale condition, its Finale Pressure, and the Memory Frames EGRESS can bring to The Burden.' WHERE Id = '3645d191-82dd-4451-9c02-2cf55e386c86' AND Title = 'The Breach';
            """",
            """"
            UPDATE NarrativeEvents SET Description = 'The eclipse reaches Totality and stops. If the Reading was stopped, the resumed ritual can accept only the burden still connected to the Book; if it succeeded, the Party''s living reconstruction of Vara has reopened the closed chain. Either way the old status quo is mechanically unrecoverable. The first alarms are not a neat choice: the Broken Bell rings without being struck, EGRESS declares a containment emergency, and the Milltown Floodwarden''s warning becomes an impossible flood, while the Pilgrim Quarter falls conspicuously silent and the Hall of Remembrance''s crisis emerges from quiet work already under way. Five faction fronts are now in motion at once. The Party cannot answer them all; the factions supply the clocks.' WHERE Id = '4fe26086-3144-4141-992c-77c268f62eed' AND Title = 'Totality';
            """",
            """"
            UPDATE NarrativeEvents SET Description = REPLACE(Description,
            'while factions, Keystones, Assets, and prior relationships determine which methods are readily available and which must be recovered, negotiated for, or worked around.',
            'while the five front results, Perrik''s access to the Claims Registry, Kelda, and each faction''s relationship with the Party determine which help arrives and whether it assists or interferes.')
            WHERE Id = 'eaa79e6d-f049-4f34-9b9d-2ff1486aadf9' AND Title = 'The Burden';
            """",
            """"
            UPDATE NarrativeEvents SET Summary = 'A corrupted Engram recorded from a Veiled becomes a Source. The recording is accurate; the subject was not.', Description = 'EGRESS loads one of five corrupted OCC Engrams, recorded from a Veiled Incursion rather than a verified person, into the Vault''s comparison Core. At full strength, identity comparison supplies Recognition: the record that remembers being someone becomes a Source and reconstructs its Occlusion physically in the Core as the Vault locks down. Trapped and stalked, Darkwing tests authentic candidate Engrams one life at a time, reading each destructive response to deduce whose experience the corrupted record falsely claims. Restoring the correct authentic Memory makes the false experiential model untenable.' WHERE Id = '58b28707-f7db-48ea-8278-469a27a456f6' AND Title = 'Playing for Keeps';
            """",
            """"
            UPDATE NarrativeEvents SET Summary = 'A damaged OCC reference on the Manor map leads to five corrupted Engrams in the Engram Vault.', Description = 'Near the Engram Vault, the Manor map preserves a partially obscured EGRESS reference, #-9.#3/#-OCC/R#22-3, and the Observer''s question: WHO DID THIS REMEMBER BEING? EGRESS stores Engrams, technical records of lived experience, including a pre-Reading baseline from every Keeper. It has also made a more dangerous category: corrupted Engrams recorded from Veiled Incursions. Five quarantined records match the damaged reference. The route asks whether genuine remembered experience is enough to reconstruct a person.' WHERE Id = '92ff33bd-760d-4b04-8e24-a63c533e816d' AND Title = 'The Institute';
            """",
            """"
            UPDATE NarrativeEvents SET Summary = 'The Manor''s unseen resident reveals the map is his, and that the Party is the variable he could not model.' WHERE Id = '6e2cbd25-411c-462e-8b7c-838c5c26ec4f' AND Title = 'The Observer';
            """",
            """"
            UPDATE NarrativeEvents SET Summary = 'The Face gives accumulated projection a visible shape, but not a truthful one.' WHERE Id = '0320f766-c0df-419c-ac5e-6b0f8b870b92' AND Title = 'The Shape of Someone';
            """",
            """"
            UPDATE NarrativeEvents SET NarrativeFunction = 'Identity: Choice' WHERE Id = '802147bb-1f1f-438d-802a-820beaf96224' AND Title = 'Revolutionaries';
            """",
            """"
            UPDATE NarrativeEventOverrides SET Summary = 'Vara''s pre-Reading Engram is among the candidates, and the Party reacts to it without knowing why.', Description = 'EGRESS still holds Vara''s pre-Reading Engram under her recorded identity, though no one consciously remembers her, and it sits in the comparison set as an ordinary candidate. The Party''s possessions, habits, and unexplained reactions respond to it and to her compass, but those reactions do not replace the deterministic comparison: Darkwing must still deduce the corrupted record''s subject from evidence.' WHERE Id = '46624243-9f65-4245-a1db-d8eef005ef2f' AND NarrativeEventId = '58b28707-f7db-48ea-8278-469a27a456f6';
            """",
            """"
            UPDATE NarrativeEventOverrides SET Summary = 'Vara meets her own Engram and her father''s among the candidates.', Description = 'Living Vara can encounter both her own pre-Reading Engram and Marek''s archived record as ordinary candidates inside the comparison set. Their presence makes the route intensely personal without either being the hidden subject; the danger is letting recognition and grief stand in for the comparison the Core demands.' WHERE Id = '836e5476-a22d-49a4-9e02-113e270a3d4b' AND NarrativeEventId = '58b28707-f7db-48ea-8278-469a27a456f6';
            """",
            """"
            UPDATE NarrativeEvents SET SortOrder = 32 WHERE Id = 'b964d024-30c6-4da9-9929-9506de4e83aa' AND Title = 'The Light Remains' AND SortOrder < 30;
            """",
            """"
            UPDATE NarrativeEvents SET SortOrder = 31 WHERE Id = '05d06704-f850-4a68-880a-64ab0be477fd' AND Title = 'Aletheia' AND SortOrder < 30;
            """",
            """"
            UPDATE NarrativeEvents SET SortOrder = 30 WHERE Id = 'eaa79e6d-f049-4f34-9b9d-2ff1486aadf9' AND Title = 'The Burden' AND SortOrder < 30;
            """",
            """"
            INSERT INTO NarrativeEvents (Id, CampaignId, Description, NarrativeFunction, SortOrder, Status, Summary, Title, Visibility)
            SELECT '26e71f20-85d2-40f6-ae91-e189a8ad78c7', '00000000-0000-0000-0000-000000000001', 'Generations of River Foam floods have replaced Milltown''s houses and street plans, leaving only a handful of shelters. Under Totality the district''s Wound recalls several historical floods at once without producing visible water: residents are dragged by currents no one can see, and the living Floodwarden''s modern ward cannot stop a remembered flood. A black Veiled Floodwarden follows incomplete historical instructions that protect one street and endanger another. Darkwing coordinates a cooperative rescue of six endangered civilians through limited shelter and routes; the true problem is Pattern and Context under historical pressure, not a monster to defeat. Milltown is the Dawn front: the number rescued sets the Assembly Hall''s finale capability and its Finale Pressure.', 'Dawn Front', 27, 0, 'Under Totality, Milltown remembers its floods without water.', 'Milltown', 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '26e71f20-85d2-40f6-ae91-e189a8ad78c7');
            """",
            """"
            INSERT INTO NarrativeEventPlacements (NarrativeEventId, X, Y, Width, Height) SELECT '26e71f20-85d2-40f6-ae91-e189a8ad78c7', 2462.0, 141.0, NULL, NULL WHERE NOT EXISTS (SELECT 1 FROM NarrativeEventPlacements WHERE NarrativeEventId = '26e71f20-85d2-40f6-ae91-e189a8ad78c7');
            """",
            """"
            INSERT INTO NarrativeEvents (Id, CampaignId, Description, NarrativeFunction, SortOrder, Status, Summary, Title, Visibility)
            SELECT '9786e1ec-1aef-4fee-9c31-f5ec7db88913', '00000000-0000-0000-0000-000000000001', 'Celia has gathered twelve genuinely credible heirlooms that might connect to an extraordinary Veiled Spider shaped by a Forgotten craftsperson''s Grandmother Spider devotion. Four Witnesses defend the Hall while the Spider repeatedly appears to Disperse, but the battle is a performance: she controls her Stabilization Windows and lets the Ledger investigation proceed while she crafts a genuine new magical object of her own. A sufficiently early, truthful conjunction of the three original heirlooms produces real Coherence and exposes her false divine Form. The Witnesses'' immediate task is to preserve the Ledger and the capacity to use it. The Tangled Web is the Witnesses front: its outcome sets the Ledger''s finale condition and its Finale Pressure; the Spider''s fourth object is a separate, unresolved consequence.', 'Witnesses Front', 28, 0, 'Under Totality, a Counterfeit Weaver performs her own defeat in the Hall of Remembrance.', 'The Tangled Web', 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '9786e1ec-1aef-4fee-9c31-f5ec7db88913');
            """",
            """"
            INSERT INTO NarrativeEventPlacements (NarrativeEventId, X, Y, Width, Height) SELECT '9786e1ec-1aef-4fee-9c31-f5ec7db88913', 2470.0, 487.0, NULL, NULL WHERE NOT EXISTS (SELECT 1 FROM NarrativeEventPlacements WHERE NarrativeEventId = '9786e1ec-1aef-4fee-9c31-f5ec7db88913');
            """",
            """"
            INSERT INTO NarrativeEvents (Id, CampaignId, Description, NarrativeFunction, SortOrder, Status, Summary, Title, Visibility)
            SELECT '4ccffd48-0494-47ae-83c3-7ba21597fdf9', '00000000-0000-0000-0000-000000000001', 'There is no alarm. Townspeople, Cult adherents, and genuine Veiled arrive voluntarily to witness what seems the triumph of generations of welcome, until every street in the quarter is deserted. Pilgrim''s Rest has become a location-Source whose real history of hospitality draws a false conclusion: being welcomed means never wanting anything else. Guests keep their memory and competence while every other obligation loses its felt priority. Maelyn is not in control of the effect. Her own Offering Chest practice, the willing release of treasured possessions, offers the contradiction that can let her release the people her home receives, leave, and freely return. The Open Door is the Cult front: whether Pilgrim''s Rest can again offer hospitality beyond its walls sets its finale capability and its Finale Pressure.', 'Cult Front', 29, 0, 'Under Totality, the Pilgrim Quarter goes silent: everyone has gone to Pilgrim''s Rest, and no one wants to leave.', 'The Open Door', 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '4ccffd48-0494-47ae-83c3-7ba21597fdf9');
            """",
            """"
            INSERT INTO NarrativeEventPlacements (NarrativeEventId, X, Y, Width, Height) SELECT '4ccffd48-0494-47ae-83c3-7ba21597fdf9', 2456.0, -205.0, NULL, NULL WHERE NOT EXISTS (SELECT 1 FROM NarrativeEventPlacements WHERE NarrativeEventId = '4ccffd48-0494-47ae-83c3-7ba21597fdf9');
            """",
            """"
            INSERT INTO NarrativeEventConnections (Id, CampaignId, SourceNarrativeEventId, TargetNarrativeEventId, ThreadId, Visibility)
            SELECT '66e6e187-0c38-4641-bee9-75b3f4f393f3', '00000000-0000-0000-0000-000000000001', '4fe26086-3144-4141-992c-77c268f62eed', '26e71f20-85d2-40f6-ae91-e189a8ad78c7', '2a59fd7c-3f4f-4b58-9104-a5715c370b4d', 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEventConnections WHERE Id = '66e6e187-0c38-4641-bee9-75b3f4f393f3')
            AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '4fe26086-3144-4141-992c-77c268f62eed') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '26e71f20-85d2-40f6-ae91-e189a8ad78c7')
            AND EXISTS (SELECT 1 FROM NarrativeThreads WHERE Id = '2a59fd7c-3f4f-4b58-9104-a5715c370b4d');
            """",
            """"
            INSERT INTO NarrativeEventConnections (Id, CampaignId, SourceNarrativeEventId, TargetNarrativeEventId, ThreadId, Visibility)
            SELECT 'fc1c2c38-05c9-4025-a27d-3f4837c7d273', '00000000-0000-0000-0000-000000000001', '4fe26086-3144-4141-992c-77c268f62eed', '9786e1ec-1aef-4fee-9c31-f5ec7db88913', '2a59fd7c-3f4f-4b58-9104-a5715c370b4d', 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEventConnections WHERE Id = 'fc1c2c38-05c9-4025-a27d-3f4837c7d273')
            AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '4fe26086-3144-4141-992c-77c268f62eed') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '9786e1ec-1aef-4fee-9c31-f5ec7db88913')
            AND EXISTS (SELECT 1 FROM NarrativeThreads WHERE Id = '2a59fd7c-3f4f-4b58-9104-a5715c370b4d');
            """",
            """"
            INSERT INTO NarrativeEventConnections (Id, CampaignId, SourceNarrativeEventId, TargetNarrativeEventId, ThreadId, Visibility)
            SELECT 'a3ded8c4-f30c-433b-ba08-f00f83d1788f', '00000000-0000-0000-0000-000000000001', '4fe26086-3144-4141-992c-77c268f62eed', '4ccffd48-0494-47ae-83c3-7ba21597fdf9', '2a59fd7c-3f4f-4b58-9104-a5715c370b4d', 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEventConnections WHERE Id = 'a3ded8c4-f30c-433b-ba08-f00f83d1788f')
            AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '4fe26086-3144-4141-992c-77c268f62eed') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '4ccffd48-0494-47ae-83c3-7ba21597fdf9')
            AND EXISTS (SELECT 1 FROM NarrativeThreads WHERE Id = '2a59fd7c-3f4f-4b58-9104-a5715c370b4d');
            """",
            """"
            INSERT INTO NarrativeEventConnections (Id, CampaignId, SourceNarrativeEventId, TargetNarrativeEventId, ThreadId, Visibility)
            SELECT '07448646-e6f1-45a4-83b9-f4be862b0098', '00000000-0000-0000-0000-000000000001', '26e71f20-85d2-40f6-ae91-e189a8ad78c7', 'eaa79e6d-f049-4f34-9b9d-2ff1486aadf9', '1ed2cd7f-31bf-4327-9eb9-ff7c22bccb00', 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEventConnections WHERE Id = '07448646-e6f1-45a4-83b9-f4be862b0098')
            AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '26e71f20-85d2-40f6-ae91-e189a8ad78c7') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = 'eaa79e6d-f049-4f34-9b9d-2ff1486aadf9')
            AND EXISTS (SELECT 1 FROM NarrativeThreads WHERE Id = '1ed2cd7f-31bf-4327-9eb9-ff7c22bccb00');
            """",
            """"
            INSERT INTO NarrativeEventConnections (Id, CampaignId, SourceNarrativeEventId, TargetNarrativeEventId, ThreadId, Visibility)
            SELECT '4d6e34df-ec2d-4fbf-acf7-2af483bf5348', '00000000-0000-0000-0000-000000000001', '9786e1ec-1aef-4fee-9c31-f5ec7db88913', 'eaa79e6d-f049-4f34-9b9d-2ff1486aadf9', 'c770dd2b-b815-4fa9-99f4-57338e860362', 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEventConnections WHERE Id = '4d6e34df-ec2d-4fbf-acf7-2af483bf5348')
            AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '9786e1ec-1aef-4fee-9c31-f5ec7db88913') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = 'eaa79e6d-f049-4f34-9b9d-2ff1486aadf9')
            AND EXISTS (SELECT 1 FROM NarrativeThreads WHERE Id = 'c770dd2b-b815-4fa9-99f4-57338e860362');
            """",
            """"
            INSERT INTO NarrativeEventConnections (Id, CampaignId, SourceNarrativeEventId, TargetNarrativeEventId, ThreadId, Visibility)
            SELECT '3e065072-5b7c-45fb-b3ef-e3690390b60c', '00000000-0000-0000-0000-000000000001', '4ccffd48-0494-47ae-83c3-7ba21597fdf9', 'eaa79e6d-f049-4f34-9b9d-2ff1486aadf9', 'cf7bb4b6-acc0-41c6-9774-bf048a9f3d59', 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEventConnections WHERE Id = '3e065072-5b7c-45fb-b3ef-e3690390b60c')
            AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '4ccffd48-0494-47ae-83c3-7ba21597fdf9') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = 'eaa79e6d-f049-4f34-9b9d-2ff1486aadf9')
            AND EXISTS (SELECT 1 FROM NarrativeThreads WHERE Id = 'cf7bb4b6-acc0-41c6-9774-bf048a9f3d59');
            """",
            """"
            INSERT INTO NarrativeEventConnections (Id, CampaignId, SourceNarrativeEventId, TargetNarrativeEventId, ThreadId, Visibility)
            SELECT 'df365953-7a14-4356-98ec-80973a3f5db8', '00000000-0000-0000-0000-000000000001', '0320f766-c0df-419c-ac5e-6b0f8b870b92', '4ccffd48-0494-47ae-83c3-7ba21597fdf9', 'cf7bb4b6-acc0-41c6-9774-bf048a9f3d59', 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEventConnections WHERE Id = 'df365953-7a14-4356-98ec-80973a3f5db8')
            AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '0320f766-c0df-419c-ac5e-6b0f8b870b92') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '4ccffd48-0494-47ae-83c3-7ba21597fdf9')
            AND EXISTS (SELECT 1 FROM NarrativeThreads WHERE Id = 'cf7bb4b6-acc0-41c6-9774-bf048a9f3d59');
            """",
            """"
            INSERT INTO NarrativeEventConnections (Id, CampaignId, SourceNarrativeEventId, TargetNarrativeEventId, ThreadId, Visibility)
            SELECT '9fa47077-a83a-4837-8769-31e74934beb2', '00000000-0000-0000-0000-000000000001', '0083b759-7f7d-43d5-9f45-be172a453d5c', '9786e1ec-1aef-4fee-9c31-f5ec7db88913', '18017b6e-1b4e-4900-9e61-25306dbfca6e', 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEventConnections WHERE Id = '9fa47077-a83a-4837-8769-31e74934beb2')
            AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '0083b759-7f7d-43d5-9f45-be172a453d5c') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '9786e1ec-1aef-4fee-9c31-f5ec7db88913')
            AND EXISTS (SELECT 1 FROM NarrativeThreads WHERE Id = '18017b6e-1b4e-4900-9e61-25306dbfca6e');
            """",
            """"
            INSERT INTO NarrativeEntityLinks (Id, CampaignId, OwnerType, OwnerId, EntityType, EntityId, Role, Notes, IsPrimary, Visibility)
            SELECT '82b5047d-0968-4e6d-82e1-01b46932672e', '00000000-0000-0000-0000-000000000001', 1, '26e71f20-85d2-40f6-ae91-e189a8ad78c7', 0, 'seekers', NULL, NULL, 0, 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEntityLinks WHERE Id = '82b5047d-0968-4e6d-82e1-01b46932672e') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '26e71f20-85d2-40f6-ae91-e189a8ad78c7');
            """",
            """"
            INSERT INTO NarrativeEntityLinks (Id, CampaignId, OwnerType, OwnerId, EntityType, EntityId, Role, Notes, IsPrimary, Visibility)
            SELECT 'c57ed7e4-0727-4cf0-8f69-9617bfe28be9', '00000000-0000-0000-0000-000000000001', 1, '26e71f20-85d2-40f6-ae91-e189a8ad78c7', 3, '67ec2b91-9429-47ae-9399-8a65c7073d7e', NULL, NULL, 0, 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEntityLinks WHERE Id = 'c57ed7e4-0727-4cf0-8f69-9617bfe28be9') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '26e71f20-85d2-40f6-ae91-e189a8ad78c7');
            """",
            """"
            INSERT INTO NarrativeEntityLinks (Id, CampaignId, OwnerType, OwnerId, EntityType, EntityId, Role, Notes, IsPrimary, Visibility)
            SELECT 'f64ef2e6-a657-487d-a7e1-315669c0e4e8', '00000000-0000-0000-0000-000000000001', 1, '26e71f20-85d2-40f6-ae91-e189a8ad78c7', 2, 'ced96c5d-670a-42ed-b736-9bb04164d20f', NULL, NULL, 0, 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEntityLinks WHERE Id = 'f64ef2e6-a657-487d-a7e1-315669c0e4e8') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '26e71f20-85d2-40f6-ae91-e189a8ad78c7');
            """",
            """"
            INSERT INTO NarrativeEntityLinks (Id, CampaignId, OwnerType, OwnerId, EntityType, EntityId, Role, Notes, IsPrimary, Visibility)
            SELECT 'd67cecd6-0fe9-493d-9108-5bec2903fe9b', '00000000-0000-0000-0000-000000000001', 1, '9786e1ec-1aef-4fee-9c31-f5ec7db88913', 0, 'witnesses', NULL, NULL, 0, 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEntityLinks WHERE Id = 'd67cecd6-0fe9-493d-9108-5bec2903fe9b') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '9786e1ec-1aef-4fee-9c31-f5ec7db88913');
            """",
            """"
            INSERT INTO NarrativeEntityLinks (Id, CampaignId, OwnerType, OwnerId, EntityType, EntityId, Role, Notes, IsPrimary, Visibility)
            SELECT '5d51b46a-dc29-4569-aacb-16007db00ad0', '00000000-0000-0000-0000-000000000001', 1, '9786e1ec-1aef-4fee-9c31-f5ec7db88913', 1, '1f710eca-bcd1-47ad-aed7-f7fbd391ff2c', NULL, NULL, 0, 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEntityLinks WHERE Id = '5d51b46a-dc29-4569-aacb-16007db00ad0') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '9786e1ec-1aef-4fee-9c31-f5ec7db88913');
            """",
            """"
            INSERT INTO NarrativeEntityLinks (Id, CampaignId, OwnerType, OwnerId, EntityType, EntityId, Role, Notes, IsPrimary, Visibility)
            SELECT '9a3b7e10-fb92-4631-9ae4-e5051898b54e', '00000000-0000-0000-0000-000000000001', 1, '9786e1ec-1aef-4fee-9c31-f5ec7db88913', 2, '6403e2f2-5bc3-4a15-8b54-748b492869e5', NULL, NULL, 0, 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEntityLinks WHERE Id = '9a3b7e10-fb92-4631-9ae4-e5051898b54e') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '9786e1ec-1aef-4fee-9c31-f5ec7db88913');
            """",
            """"
            INSERT INTO NarrativeEntityLinks (Id, CampaignId, OwnerType, OwnerId, EntityType, EntityId, Role, Notes, IsPrimary, Visibility)
            SELECT '9cd1337c-1cca-4138-9519-4395937a3355', '00000000-0000-0000-0000-000000000001', 1, '9786e1ec-1aef-4fee-9c31-f5ec7db88913', 2, '92220b6d-3523-4d91-85e8-491c20d9ed12', NULL, NULL, 0, 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEntityLinks WHERE Id = '9cd1337c-1cca-4138-9519-4395937a3355') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '9786e1ec-1aef-4fee-9c31-f5ec7db88913');
            """",
            """"
            INSERT INTO NarrativeEntityLinks (Id, CampaignId, OwnerType, OwnerId, EntityType, EntityId, Role, Notes, IsPrimary, Visibility)
            SELECT '4e84e9b5-e55b-4211-b348-3ca442dd769f', '00000000-0000-0000-0000-000000000001', 1, '4ccffd48-0494-47ae-83c3-7ba21597fdf9', 0, 'cult', NULL, NULL, 0, 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEntityLinks WHERE Id = '4e84e9b5-e55b-4211-b348-3ca442dd769f') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '4ccffd48-0494-47ae-83c3-7ba21597fdf9');
            """",
            """"
            INSERT INTO NarrativeEntityLinks (Id, CampaignId, OwnerType, OwnerId, EntityType, EntityId, Role, Notes, IsPrimary, Visibility)
            SELECT 'c97fd916-95c1-40a8-80ef-427bbce59a89', '00000000-0000-0000-0000-000000000001', 1, '4ccffd48-0494-47ae-83c3-7ba21597fdf9', 1, '929d26ed-789d-4694-97c0-27ac7340bf12', NULL, NULL, 0, 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEntityLinks WHERE Id = 'c97fd916-95c1-40a8-80ef-427bbce59a89') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '4ccffd48-0494-47ae-83c3-7ba21597fdf9');
            """",
            """"
            INSERT INTO NarrativeEntityLinks (Id, CampaignId, OwnerType, OwnerId, EntityType, EntityId, Role, Notes, IsPrimary, Visibility)
            SELECT 'e64414a2-ff42-4357-8f36-2c4810faab36', '00000000-0000-0000-0000-000000000001', 1, '4ccffd48-0494-47ae-83c3-7ba21597fdf9', 1, '941d9464-6097-4983-b19b-5b77e37064ef', NULL, NULL, 0, 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEntityLinks WHERE Id = 'e64414a2-ff42-4357-8f36-2c4810faab36') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '4ccffd48-0494-47ae-83c3-7ba21597fdf9');
            """",
            """"
            INSERT INTO NarrativeEntityLinks (Id, CampaignId, OwnerType, OwnerId, EntityType, EntityId, Role, Notes, IsPrimary, Visibility)
            SELECT '79b5e444-cda8-403a-a22c-285504d5e911', '00000000-0000-0000-0000-000000000001', 1, '4ccffd48-0494-47ae-83c3-7ba21597fdf9', 2, '2d1a8b50-3459-456a-baab-f938e29ae276', NULL, NULL, 0, 1
            WHERE NOT EXISTS (SELECT 1 FROM NarrativeEntityLinks WHERE Id = '79b5e444-cda8-403a-a22c-285504d5e911') AND EXISTS (SELECT 1 FROM NarrativeEvents WHERE Id = '4ccffd48-0494-47ae-83c3-7ba21597fdf9');
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
            // data only: not reversible (the previous values are listed in NARRATIVE-RECONCILIATION-CHANGES.md)
        }
    }
}
