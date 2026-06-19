using ColonyTracker.Api.Models;

namespace ColonyTracker.Api.Data;

public static class SeedData
{
    // Derived from original Desires(0.6) / Maintains(0.25) / Sacrifices(0.15) ratio
    private const double D = 0.60; // Desires weight
    private const double M = 0.25; // Maintains weight
    private const double S = 0.15; // Sacrifices weight

    public static void Seed(AppDbContext db)
    {
        if (db.Factions.Any()) return;

        var factions = new List<Faction>
        {
            new()
            {
                Id = "keepers",
                Name = "Keepers",
                Represents = "Preservation",
                Type = GroupType.Faction,
                CoreTenet = "Stability is a responsibility.",
                CertainOf = "The ritual works",
                RightAbout = "The threat is real. The burden must be contained.",
                AfraidOf = "Collapse",
                WrongAbout = "The current system is the only possible solution",
                SingleSentence = "\"The ritual works.\" or \"Don't gamble with lives\" or \"Good intentions don't stop disasters.\"",
                BeliefC = BeliefPosition.Positive,
                BeliefA = BeliefPosition.Negative,
                BeliefB = BeliefPosition.Negative,
                // Desires Stability, Maintains Truth, Sacrifices Agency
                StabilityValue = D, TruthValue = M, AgencyValue = S,
                Active = true
            },
            new()
            {
                Id = "witnesses",
                Name = "Witnesses",
                Represents = "Remembrance",
                Type = GroupType.Faction,
                CoreTenet = "Every sacrifice deserves remembrance.",
                CertainOf = "Forgetting creates moral decay.",
                RightAbout = "The colony is losing sight of its cost. The burden must be acknowledged.",
                AfraidOf = "Comfort built on amnesia.",
                WrongAbout = "Remembrance itself creates change.",
                SingleSentence = "\"If we must pay the price, we cannot forget it.\"",
                BeliefC = BeliefPosition.Positive,
                BeliefA = BeliefPosition.Positive,
                BeliefB = BeliefPosition.Negative,
                // Desires Truth, Maintains Stability, Sacrifices Agency
                TruthValue = D, StabilityValue = M, AgencyValue = S,
                Active = true
            },
            new()
            {
                Id = "seekers",
                Name = "Seekers",
                Represents = "Reform",
                Type = GroupType.Faction,
                CoreTenet = "No solution should be beyond reconsideration.",
                CertainOf = "The current system is wrong",
                RightAbout = "The compromise is unacceptable",
                AfraidOf = "Complacency",
                WrongAbout = "Every problem has a solution",
                SingleSentence = "Just because it works doesn't mean it's right.",
                BeliefC = BeliefPosition.Negative,
                BeliefA = BeliefPosition.Negative,
                BeliefB = BeliefPosition.Positive,
                // Desires Agency, Maintains Stability, Sacrifices Truth
                AgencyValue = D, StabilityValue = M, TruthValue = S,
                Active = true
            },
            new()
            {
                Id = "shattered",
                Name = "Shattered",
                Represents = "Revolt",
                Type = GroupType.Faction,
                CoreTenet = "The system is illegitimate.",
                CertainOf = "Any compromise built on sacrifice is corrupt",
                RightAbout = "The system is morally abhorrent",
                AfraidOf = "Becoming complicit",
                WrongAbout = "Destruction produces solutions",
                SingleSentence = "\"If survival demands this, perhaps it shouldn't survive.\"",
                BeliefC = BeliefPosition.Negative,
                BeliefA = BeliefPosition.Positive,
                BeliefB = BeliefPosition.Positive,
                // Desires Agency, Maintains Truth, Sacrifices Stability
                AgencyValue = D, TruthValue = M, StabilityValue = S,
                Active = true
            },
            new()
            {
                Id = "institute",
                Name = "EGRESS Institute",
                Represents = "Transcendence",
                Type = GroupType.Faction,
                CoreTenet = "The answer lies beyond current assumptions",
                CertainOf = "The solution has not yet been discovered",
                RightAbout = "New solutions may exist",
                AfraidOf = "Intellectual stagnation",
                WrongAbout = "Knowledge alone solves human problems",
                SingleSentence = "Every cage is just a puzzle waiting to be solved.",
                BeliefC = BeliefPosition.Neutral,
                BeliefA = BeliefPosition.Neutral,
                BeliefB = BeliefPosition.Positive,
                // Desires Truth, Maintains Stability, Sacrifices Agency
                TruthValue = D, StabilityValue = M, AgencyValue = S,
                Active = true
            },
            new()
            {
                Id = "cult",
                Name = "Cult of the Unknown",
                Represents = "Belief",
                Type = GroupType.Faction,
                CoreTenet = "The hidden force is misunderstood",
                CertainOf = "The truth is being concealed",
                RightAbout = "The Keepers suppress information. Your understanding is incomplete.",
                AfraidOf = "Ignorance",
                WrongAbout = "The entity is benevolent",
                SingleSentence = "The ritual misunderstands the relationship.",
                BeliefC = BeliefPosition.Negative,
                BeliefA = BeliefPosition.Neutral,
                BeliefB = BeliefPosition.Positive,
                // Desires Truth, Maintains Agency, Sacrifices Stability
                TruthValue = D, AgencyValue = M, StabilityValue = S,
                Active = true
            },
            new()
            {
                Id = "aspis",
                Name = "Aspis",
                Represents = "Exploitation",
                Type = GroupType.Faction,
                CoreTenet = "Reality should be leveraged",
                CertainOf = "Every system can be exploited.",
                RightAbout = "The colony's systems have practical value",
                AfraidOf = "Idealists disrupting stability",
                WrongAbout = "Everything can be commodified",
                SingleSentence = "The system exists. Use it.",
                BeliefC = BeliefPosition.Neutral,
                BeliefA = BeliefPosition.Negative,
                BeliefB = BeliefPosition.Negative,
                // Desires Stability, Maintains Agency, Sacrifices Truth
                StabilityValue = D, AgencyValue = M, TruthValue = S,
                Active = true
            },
            // Social Classes
            new()
            {
                Id = "civilians",
                Name = "Civilians",
                Represents = "Endurance",
                Type = GroupType.SocialClass,
                CoreTenet = "Life must continue",
                CertainOf = "Tomorrow still comes",
                RightAbout = "Somebody has to keep society functioning",
                AfraidOf = "Instability",
                WrongAbout = "Survival is sufficient",
                SingleSentence = "I still have to eat tomorrow.",
                // Desires Stability, Maintains Agency, Sacrifices Truth
                StabilityValue = D, AgencyValue = M, TruthValue = S,
                Active = true
            },
            new()
            {
                Id = "heirs",
                Name = "Heirs",
                Represents = "Inherited Moral Debt",
                Type = GroupType.SocialClass,
                CoreTenet = "We inherited this burden",
                CertainOf = "The old generation failed them",
                RightAbout = "The compromise was imposed on them",
                AfraidOf = "Becoming the next generation of caretakers",
                WrongAbout = "The past can simply be discarded",
                SingleSentence = "I didn't choose this.",
                // Desires Agency, Maintains Truth, Sacrifices Stability
                AgencyValue = D, TruthValue = M, StabilityValue = S,
                Active = true
            },
            new()
            {
                Id = "burdened",
                Name = "Burdened",
                Represents = "Original Sin",
                Type = GroupType.SocialClass,
                CoreTenet = "Someone must carry the knowledge",
                CertainOf = "Ignorance would be worse.",
                RightAbout = "Most citizens underestimate the burden.",
                AfraidOf = "Becoming the thing they hate.",
                WrongAbout = "Knowledge necessarily grants wisdom.",
                SingleSentence = "\"If we don't carry this, who will?\"",
                // Desires Stability, Maintains Truth, Sacrifices Agency
                StabilityValue = D, TruthValue = M, AgencyValue = S,
                Active = true
            },
            new()
            {
                Id = "fractured",
                Name = "Fractured",
                Represents = "Oppressed",
                Type = GroupType.SocialClass,
                CoreTenet = "Something is missing",
                CertainOf = "The official story is incomplete",
                RightAbout = "They perceive cracks others ignore",
                AfraidOf = "Being silenced",
                WrongAbout = "Their conclusions are often distorted by incomplete information",
                SingleSentence = "Why does it feel like someone isn't here?",
                // Desires Truth, Maintains Agency, Sacrifices Stability
                TruthValue = D, AgencyValue = M, StabilityValue = S,
                Active = true
            },
            new()
            {
                Id = "forgotten",
                Name = "Forgotten",
                Represents = "Sacrifice",
                Type = GroupType.SocialClass,
                CoreTenet = "The price paid for survival",
                CertainOf = "Others deserve to live",
                RightAbout = "The colony survives because of sacrifice",
                AfraidOf = "Meaninglessness",
                WrongAbout = "Their sacrifice alone can solve the deeper problem",
                SingleSentence = "Remember me.",
                // Desires Agency, Maintains Stability, Sacrifices Truth
                AgencyValue = D, StabilityValue = M, TruthValue = S,
                Active = true
            }
        };

        db.Factions.AddRange(factions);

        var characters = new List<Character>
        {
            new()
            {
                Id = "mira-voss",
                Name = "Mira Voss",
                CharacterType = CharacterType.PartyMember,
                Ancestry = "Human",
                Heritage = "Versatile",
                Class = "Investigator",
                Background = "Scholar",
                Level = 5,
                Gender = "Woman",
                Age = 34,
                Occupation = "Researcher",
                Summary = "A former Institute archivist who left when she discovered records of the first ritual negotiations had been altered. She trusts evidence but fears what the evidence is leading her toward.",
                Goals = "Recover the original ritual documents. Understand what the colony actually agreed to.",
                Fears = "That the truth will require a sacrifice no one will consent to.",
                Notes = "Has a contact inside the Burdened who sends her fragments of testimony.",
                FactionId = "institute",
                SocialClassId = "burdened",
                TruthValue = 0.55, StabilityValue = 0.30, AgencyValue = 0.15,
                DoubtDirection = DoubtDirection.B,
                Conviction = 65,
                Pressure = 30
            },
            new()
            {
                Id = "castor-vael",
                Name = "Castor Vael",
                CharacterType = CharacterType.NPC,
                Gender = "Man",
                Age = 58,
                Occupation = "Ritual Keeper",
                Summary = "A senior Keeper who genuinely believes the ritual is the only barrier between the colony and annihilation. He is not cruel — he is exhausted.",
                Goals = "Preserve the ritual until someone smarter than him finds a better solution.",
                Fears = "That he has been wrong for thirty years and has spent that time enforcing something monstrous.",
                Notes = "Drinks too much. Attends Witness ceremonies anonymously.",
                FactionId = "keepers",
                SocialClassId = "burdened",
                TruthValue = 0.20, StabilityValue = 0.65, AgencyValue = 0.15,
                DoubtDirection = DoubtDirection.A,
                Conviction = 40,
                Pressure = 55
            },
            new()
            {
                Id = "sable-ren",
                Name = "Sable Ren",
                CharacterType = CharacterType.NPC,
                Gender = "Nonbinary",
                Age = 27,
                Occupation = "Dock Worker",
                Summary = "Fractured-class, grew up with gaps in their memory they can't explain. Drawn to the Cult for answers but suspicious of the Cult's answers.",
                Goals = "Find out what is missing from their past.",
                Fears = "That they are one of the forgotten — or that someone they love is.",
                Notes = "Knows more than they admit. Will help the party if they are honest with her.",
                FactionId = "cult",
                SocialClassId = "fractured",
                TruthValue = 0.50, StabilityValue = 0.15, AgencyValue = 0.35,
                DoubtDirection = DoubtDirection.C,
                Conviction = 35,
                Pressure = 70
            },
            new()
            {
                Id = "delegate-orin",
                Name = "Delegate Orin",
                CharacterType = CharacterType.NPC,
                Gender = "Man",
                Age = 45,
                Occupation = "Merchant",
                Summary = "An Aspis-aligned trader who profits from colony stability and will quietly undermine any faction that threatens it — including the Keepers if they grow too rigid.",
                Goals = "Keep trade flowing. Keep no faction powerful enough to disrupt commerce.",
                Fears = "Idealists of any kind.",
                Notes = "Friendly surface, calculating underneath. Useful while interests align.",
                FactionId = "aspis",
                SocialClassId = "civilians",
                TruthValue = 0.10, StabilityValue = 0.70, AgencyValue = 0.20,
                DoubtDirection = DoubtDirection.B,
                Conviction = 80,
                Pressure = 15
            },
            new()
            {
                Id = "tessara",
                Name = "Tessara",
                CharacterType = CharacterType.NPC,
                Gender = "Woman",
                Age = 19,
                Occupation = "Captain",
                Summary = "A young Shattered cell leader who believes the party represents the first outside force in a generation willing to listen. She is brave, reckless, and not entirely wrong.",
                Goals = "Destroy the ritual. Accept no compromise.",
                Fears = "Growing old inside a system she helped preserve.",
                Notes = "High pressure, low conviction. Most likely to drift — in either direction.",
                FactionId = "shattered",
                SocialClassId = "heirs",
                TruthValue = 0.25, StabilityValue = 0.10, AgencyValue = 0.65,
                DoubtDirection = DoubtDirection.C,
                Conviction = 25,
                Pressure = 80
            }
        };

        db.Characters.AddRange(characters);

        db.ColonyStates.Add(new ColonyState
        {
            Id = "singleton",
            Act = 1,
            Week = 1,
            ColonyStress = 3,
            PartyBeliefC = BeliefPosition.Neutral,
            PartyBeliefA = BeliefPosition.Neutral,
            PartyBeliefB = BeliefPosition.Positive,
            // Desires Truth, Maintains Stability, Sacrifices Agency
            PartyTruthValue = D, PartyStabilityValue = M, PartyAgencyValue = S
        });

        db.RulesConfigs.Add(new RulesConfig { Id = "singleton" });

        db.SaveChanges();
    }
}
