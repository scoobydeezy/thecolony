# Colony Campaign Tracker

A local web application for tracking faction relationships in *The Colony* TTRPG campaign. Replaces the Excel workbook with a live, interactive tool that calculates directional relationship scores, applies colony stress, supports manual overrides, and lets you configure the scoring rules yourself.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 22, NgRx Signal Store, SCSS |
| Backend | ASP.NET Core 10 Web API |
| Database | SQLite via EF Core 10 |
| Tests | Vitest (frontend scoring engine) |
| Dev environment | Docker Compose |

## Project Structure

```
colony-tracker/
├── client/                  # Angular 22 frontend
├── server/                  # ASP.NET Core 10 Web API
├── docker-compose.yml       # Dev mode: API in Docker, run Angular locally
├── docker-compose.full.yml  # Full stack: both API and Angular in containers
└── README.md
```

---

## Running the Application

### Dev mode (default)

Runs the API in Docker. Run the Angular dev server locally for hot reload.

**Terminal 1 — start the API:**

```bash
docker compose up -d
```

**Terminal 2 — start the Angular dev server:**

```bash
cd client
npm install
npm start
```

- Frontend (hot reload): <http://localhost:4200>
- API: <http://localhost:5000>
- Angular proxies `/api/*` to the backend automatically.

### Full stack via Docker

Runs both the API and the Angular app in containers.

```bash
docker compose -f docker-compose.full.yml up --build
```

- Frontend: <http://localhost:4200>
- API: <http://localhost:5000>

### Fully local (no Docker)

**Start the API:**
```bash
cd server
dotnet run
```
The API starts on `http://localhost:5000`, creates `colony.db`, and seeds faction data on first run.

**Start the frontend:**
```bash
cd client
npm install
npm start
```

---

## Running Tests

Unit tests cover the scoring engine: belief matching, value weights, buffer positions (Neutral ritual, Controlled knowledge), stress scaling, directional asymmetry, and relationship labels.

```bash
cd client
npm run test:unit          # run once
npm run test:unit:watch    # watch mode
```

---

## Key Concepts

### Relationship Scoring

Relationships are **directional** — Faction A's score toward B may differ from B's score toward A. The source faction's `desires` value determines which belief axis is weighted most heavily.

| Source Desires | Weighted Axis |
|---|---|
| Stability | Change (×2) |
| Truth | Knowledge (×2) |
| Agency | Ritual (×2) |

### Buffer Positions

- **Neutral ritual** — does not score a match or conflict with any other ritual stance.
- **Controlled knowledge** — does not score a match or conflict with any other knowledge stance.

These positions moderate the faction's relationship to that axis without committing to either side.

### Colony Stress

Stress (0–10) intensifies all relationships. Negative scores grow faster than positive ones under stress, modelling how pressure accelerates conflict more than it strengthens alliances.

### Darkwing

The party is modelled as a special actor (Darkwing) with their own belief positions and values. All active factions calculate a directional score toward Darkwing using the same rules.

---

## Application Screens

| Screen | Purpose |
|---|---|
| **Dashboard** | Colony stress, Darkwing position, most hostile relationships, strongest alliances |
| **Factions** | CRUD for all factions and social classes |
| **Relationships** | Color-coded directional matrix; click any cell for score breakdown |
| **Colony State** | Edit stress, act/week, session summary, Darkwing position |
| **Session Log** | Record what happened each session |
| **Rules Config** | Edit all scoring rules, weights, stress multipliers, and label thresholds |

---

# Design Philosophy

This application is not intended to model objective morality, faction power, or political alignment.

It models **perceived ideological compatibility under pressure**.

The scoring system is designed to support the themes of *The Colony* campaign:

* certainty
* responsibility
* compromise
* unintended consequences
* societal stress

The goal is not to determine which faction is "correct."

The goal is to model how factions react to one another as circumstances change.

---

# Core Modeling Assumptions

The application is built around several assumptions.

These assumptions are intentionally opinionated and should be preserved unless there is a strong reason to change them.

## Factions Are Defined By Values

A faction's most important properties are:

* desires
* maintains
* sacrifices

These values represent what the faction ultimately prioritizes.

Actionable beliefs emerge from values.

Values are therefore weighted more heavily than policy positions.

Example:

Two factions may agree that the ritual should continue.

If one believes this because stability matters and another believes it because truth matters, they may still strongly disagree.

---

## Social Classes Are Not Ideologies

Social classes represent lived experience rather than political belief.

Classes answer:

> What happened to you?

Factions answer:

> What do you believe?

Because of this distinction, members of a social class may be attracted toward multiple factions.

The application may eventually support faction affinity or recruitment tendencies for social classes.

---

## Relationships Are Directional

Faction relationships are intentionally asymmetric.

Faction A's opinion of Faction B may differ from Faction B's opinion of Faction A.

This reflects the fact that different factions care about different disagreements.

Example:

A stability-focused faction may view revolutionaries as an existential threat.

The revolutionaries may view that same faction as merely one obstacle among many.

These relationships should not automatically be forced into symmetry.

---

## Values Determine What Matters

The same disagreement does not matter equally to every faction.

Each faction weights one belief axis more heavily based on its primary desired value.

| Desired Value | Weighted Belief Axis |
| ------------- | -------------------- |
| Stability     | Change               |
| Truth         | Knowledge            |
| Agency        | Ritual               |

Meaning:

* Stability-focused factions care most about preserving or changing systems.
* Truth-focused factions care most about concealment versus disclosure.
* Agency-focused factions care most about whether participation is voluntary or imposed.

These mappings intentionally connect values to actionable beliefs.

---

## Stress Reveals Priorities

Colony Stress is one of the most important variables in the application.

Stress is intended to model what happens when ideological disagreements acquire real consequences.

At low stress levels:

* factions tolerate disagreement
* nuance survives
* compromise is easier

At high stress levels:

* differences become sharper
* alliances become more rigid
* hostility escalates

Negative reactions increase faster than positive reactions.

This is intentional.

Pressure tends to accelerate conflict more readily than cooperation.

---

## The Colony Is A Living System

The application assumes that faction relationships are not static.

Relationships should evolve over time as:

* colony stress changes
* Darkwing intervenes
* factions gain or lose influence
* compromises become harder to maintain

The goal is not to create a fixed political map.

The goal is to simulate an evolving society.

---

# Campaign Truths

The application is built to support the narrative themes of *Results Pending*.

Several campaign truths should be considered foundational:

* Every faction is correct about something.
* Every faction is blind to something.
* No faction possesses the complete answer.
* The campaign has no predetermined solution.
* The colony itself functions as the primary antagonist.
* Monsters and supernatural phenomena are symptoms, not root causes.
* The central question is not whether the compromise is wrong.
* The central question is what should replace it.

Whenever new features are added, preference should be given to mechanics that reinforce uncertainty, consequence, and difficult tradeoffs rather than mechanics that identify a single "correct" faction or solution.

---

# Future Design Direction

Potential future features:

* faction influence tracking
* faction recruitment tendencies
* district-level politics
* settlement resources
* event simulation
* consequence chains
* historical timeline tracking
* observer notebook integration
* automated colony-state forecasting

All future systems should build upon the same core principle:

> The application models how people respond to pressure, not whether they are objectively right.
