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

        // Characters, factions, Assets and locations live in canonical files (ADVENTURE-BOOK-PLAN.md
        // §9, §10). If files exist, a fresh database links to them instead of seeding its own;
        // otherwise the defaults below become files on the first save.
        if (db.Canon is { } canon && canon.All().Count > 0)
        {
            var order = 0;
            foreach (var entry in canon.All())
            {
                ICanonEntity link = entry.Kind switch
                {
                    "npc" or "pc" => new Character(),
                    "faction" => new Faction { SortOrder = order++ },
                    "asset" => new Asset(),
                    "location" => new Location(),
                    "goal" => new FactionGoal(),
                    _ => throw new InvalidOperationException($"unknown canon kind {entry.Kind}"),
                };
                link.GetType().GetProperty(nameof(ICanonEntity.Id))!.SetValue(link, Guid.NewGuid().ToString());
                link.CanonId = entry.Id;
                ColonyTracker.Api.Services.Canon.CanonMapping.Hydrate(link, entry, refs: null, canon);   // references stay canonical until saved
                db.Add(link);
            }
            AddSingletons(db);
            db.SaveChanges();
            return;
        }

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
                Summary ="\"The ritual works.\" or \"Don't gamble with lives\" or \"Good intentions don't stop disasters.\"",
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
                Summary ="\"If we must pay the price, we cannot forget it.\"",
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
                Summary ="Just because it works doesn't mean it's right.",
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
                Summary ="\"If survival demands this, perhaps it shouldn't survive.\"",
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
                Summary ="Every cage is just a puzzle waiting to be solved.",
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
                Summary ="The ritual misunderstands the relationship.",
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
                Summary ="The system exists. Use it.",
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
                Summary ="I still have to eat tomorrow.",
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
                Summary ="I didn't choose this.",
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
                Summary ="\"If we don't carry this, who will?\"",
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
                Summary ="Why does it feel like someone isn't here?",
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
                Summary ="Remember me.",
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
                FactionId = "shattered",
                SocialClassId = "heirs",
                TruthValue = 0.25, StabilityValue = 0.10, AgencyValue = 0.65,
                DoubtDirection = DoubtDirection.C,
                Conviction = 25,
                Pressure = 80
            }
        };

        db.Characters.AddRange(characters);
        AddSingletons(db);
        db.SaveChanges();
    }

    private static void AddSingletons(AppDbContext db)
    {
        db.ColonyStates.Add(new ColonyState
        {
            Id = "singleton",
            Act = 1,
            Week = 1,
            PartyBeliefC = BeliefPosition.Neutral,
            PartyBeliefA = BeliefPosition.Neutral,
            PartyBeliefB = BeliefPosition.Positive,
            // Desires Truth, Maintains Stability, Sacrifices Agency
            PartyTruthValue = D, PartyStabilityValue = M, PartyAgencyValue = S
        });

        db.RulesConfigs.Add(new RulesConfig { Id = "singleton" });
    }
}
