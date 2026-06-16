# Colony Tracker

A local web application for tracking faction relationships, character motivations, social dynamics, and ideological pressure within *The Colony* TTRPG campaign.

The application models how factions and individuals respond to uncertainty, stress, and competing values over time. It replaces the original Excel workbook with a live, interactive tool capable of simulating ideological compatibility, tracking faction influence, modeling character drift, and visualizing the evolving state of the colony.

---

# Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 22, NgRx Signal Store, SCSS |
| Backend | ASP.NET Core 10 Web API |
| Database | SQLite via EF Core 10 |
| Tests | Vitest |
| Dev Environment | Docker Compose |

---

# Project Structure

```text
colony-tracker/
├── client/
├── server/
├── docker-compose.yml
├── docker-compose.full.yml
└── README.md
```

---

# Running the Application

## Dev Mode (Recommended)

Runs the API in Docker while Angular runs locally with hot reload.

### Start API

```bash
docker compose up -d
```

### Start Angular

```bash
cd client
npm install
npm start
```

Available at:

- Frontend: http://localhost:4200
- API: http://localhost:5000

---

## Full Docker Mode

```bash
docker compose -f docker-compose.full.yml up --build
```

---

## Fully Local

### API

```bash
cd server
dotnet run
```

### Angular

```bash
cd client
npm install
npm start
```

---

# Running Tests

```bash
cd client

npm run test:unit
npm run test:unit:watch
```

Unit tests validate:

- Relationship scoring
- Value weighting
- Ternary normalization
- Character drift calculations
- Stress scaling
- Compatibility calculations
- Relationship labels

---

# Core Concepts

## Values

The Colony is modeled around three competing societal values:

| Value | Meaning |
|---------|---------|
| Truth | Knowledge, remembrance, transparency |
| Stability | Continuity, survival, order |
| Agency | Choice, consent, self-determination |

These values are represented as a ternary graph.

Every faction, social class, character, and special actor occupies a position within this value space.

Values always normalize to:

```text
Truth + Stability + Agency = 1.0
```

---

## Emergent Values

Certain concepts emerge naturally from combinations of primary values:

| Combination | Emergent Value |
|-------------|----------------|
| Truth + Agency | Justice |
| Truth + Stability | Accountability |
| Stability + Agency | Prosperity |

These are not stored directly.

They emerge from a position within the ternary graph.

---

## Beliefs

While values represent what a faction or character ultimately prioritizes, beliefs represent the practical conclusions that emerge from those values.

Values answer:

> What matters?

Beliefs answer:

> What should we do about it?

The application models three belief axes that derive directly from Values:

| Value | Belief | Question |
|----------|----------|----------|
| Truth | Knowledge | Should the truth be concealed or revealed? |
| Stability | Change | Should the current system be preserved or altered? |
| Agency | Ritual | Is the ritual justified? |

This means:

- Truth-focused actors care most about disclosure versus concealment.
- Stability-focused actors care most about preserving or changing systems.
- Agency-focused actors care most about whether participation is voluntary or imposed.

---

### Emergent Beliefs

Unless explicitly overridden, a faction amd character's beliefs should naturally emerge from its values.

Examples:

#### High Truth

```text
Truth      0.70
Stability  0.20
Agency     0.10
```

Tends toward:

```text
Knowledge = Revealed
```

---

#### High Stability

```text
Truth      0.15
Stability  0.75
Agency     0.10
```

Tends toward:

```text
Change = No
```

---

#### High Agency

```text
Truth      0.15
Stability  0.25
Agency     0.60
```

Tends toward:

```text
Ritual = Bad
```

because participation imposed by the ritual conflicts with self-determination.

---

### Overrides

Values should remain the primary source of truth.

However, beliefs may be manually overridden.

This allows for exceptions such as:

- hypocrites
- extremists
- reformers
- pragmatists
- conflicted individuals

Examples:

A Truth-focused character may still support secrecy.

A Stability-focused faction may advocate dramatic change.

A highly Agency-focused individual may support the ritual for personal reasons.

These exceptions are often narratively interesting and should remain possible.

---

### Values Matter More Than Beliefs

Beliefs are downstream from values.

Two factions may hold identical beliefs for entirely different reasons.

Example:

Both the Keepers and Witnesses may believe the ritual should continue.

However:

- Keepers support it because Stability is paramount.
- Witnesses support it because Truth requires remembering its cost.

Because the underlying values differ, the factions may still strongly disagree despite reaching similar conclusions.

For this reason, relationship calculations place greater emphasis on value alignment than belief alignment.

---

## Factions

Factions represent ideological responses to the colony's central compromise.

Factions answer:

> What do you believe?

Examples:

- Keepers
- Witnesses
- Seekers
- Shattered
- Cult of the Unknown
- EGRESS Institute
- Aspis

Every faction occupies a unique ideological position within value space and maintains directional relationships toward every other faction.

---

## Social Classes

Social Classes represent lived experience rather than ideology.

Social Classes answer:

> What happened to you?

Examples:

- Civilians
- Burdened
- Heirs
- Fractured
- Forgotten

Members of a social class may belong to any faction. Social classes have default values, but it is not a strong ideological position, so they do not have derived beliefs.

---

## Characters

Characters represent individuals within the colony.

A character may be:

- NPC
- Party Member
- Faction Leader

Characters have:

- Identity
- Occupation
- Faction
- Social Class
- Personal Values
- Influence
- Pressure
- Conviction
- Doubt Direction

Unlike factions, characters are not defined solely by ideology.

The tension between a character's faction, class, and personal values is often the most important narrative information.

---

## Influence

Influence represents a character's ability to shape events.

Range:

```text
0 - 100
```

High influence characters:

- sway factions
- create events
- affect colony stability

Example:

- Faction leaders

---

## Pressure

Pressure represents external strain placed upon a character.

Sources may include:

- Colony stress
- Faction setbacks
- Narrative events

Range:

```text
0 - 100
```

Pressure increases the likelihood of ideological drift.

---

## Conviction

Conviction measures resistance to change.

Range:

```text
0 - 100
```

High conviction:

- difficult to influence

Low conviction:

- easily swayed

---

## Doubt

Every character possesses a Doubt Direction.

A character's doubt represents the value they gravitate toward when their existing worldview begins to fail.

Possible directions:

- Truth
- Stability
- Agency

Examples:

A Keeper may privately doubt Stability and drift toward Truth.

A Witness may doubt Truth and drift toward Stability.

---

## Drift

Characters do not automatically change factions.

Instead, pressure causes gradual value drift.

The application tracks:

```text
Drift Score = Pressure - Conviction
```

This provides a visible measure of ideological instability.

Drift reveals:

- likely defections
- future alliances
- personal crises

---

## Relationship Scoring

Relationships are directional.

Faction A's opinion of Faction B may differ from B's opinion of A.

The scoring engine compares:

- value alignment
- belief alignment
- weighted priorities
- colony stress
- manual modifiers

Directional asymmetry is intentional.

Different factions care about different disagreements.

---

## Colony Stress

Colony Stress represents overall societal strain. It is likely to increase over the course of a campaign.

Range:

```text
0 - 10
```

Low Stress:

- compromise is easier
- factions tolerate disagreement

High Stress:

- hostility increases
- alliances harden
- ideological differences become magnified

Negative relationships escalate faster than positive ones.

This is intentional.

Pressure tends to accelerate conflict more readily than cooperation.

---

## The Party

The Party is modeled as a special actor within the colony.

The Party has:

- values
- beliefs
- faction relationships

All factions calculate directional relationships toward The Party using the same scoring rules used elsewhere in the application.

---

# Application Screens

| Screen | Purpose |
|---|---|
| Dashboard | Colony overview, stress, major alliances, major conflicts |
| Factions | Manage factions and social classes |
| Characters | Create and manage NPCs and party members |
| Character Detail | Values graph, pressure, conviction, drift analysis |
| Relationships | Directional relationship matrix |
| Colony State | Stress, timeline, Party positions |
| Session Log | Campaign history and notes |

---

# Design Philosophy

This application is not intended to determine who is morally correct.

It models:

> Perceived ideological compatibility under pressure.

The application supports the themes of *The Colony*:

- certainty
- doubt
- responsibility
- compromise
- consequence
- societal stress

The goal is not to identify a "right" answer.

The goal is to explore how individuals and systems react when multiple good things come into conflict.

---

# Core Modeling Assumptions

## Values Generate Beliefs

The Colony is built on emergent conflict arising from a character or group's Values.

Values -> Beliefs -> Actions -> Consequences


## Factions Are Defined By Values

Factions are ideological entities.

Their positions emerge from how they prioritize:

- Truth
- Stability
- Agency

---

## Social Classes Are Defined By Circumstance

Social Classes describe lived experience.

They are not ideologies.

---

## Characters Exist Between Systems

Characters are influenced by:

- faction
- class
- personal values

The most interesting characters exist in tension with at least one of those forces.

---

## Relationships Are Directional

No relationship is assumed to be symmetrical.

Perception matters.

---

## Stress Reveals Priorities

Stress does not create values.

Stress reveals them.

---

## The Colony Is A Living System

Relationships, influence, pressure, and ideological alignment should evolve continuously.

The application is intended to model a society in motion.

---

# Campaign Truths

Several assumptions should be treated as foundational:

- Every faction is correct about something.
- Every faction is blind to something.
- No faction possesses the complete answer.
- The campaign has no predetermined solution.
- The colony itself functions as the primary antagonist.
- Monsters are symptoms, not root causes.
- The central question is not whether the compromise is wrong.
- The central question is what should replace it.

---

# Future Design Direction

Potential future systems:

- Districts
- Resources
- Event Engine
- Consequence Chains
- Observer Notebook
- Faction Recruitment
- Character Relationships
- Succession & Leadership
- Automated Colony Forecasting

All future systems should build upon the same principle:

> The application models how people respond to pressure, not whether they are objectively right.