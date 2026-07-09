# Campaign Faction Tracker

A local campaign management tool for faction-driven tabletop RPG campaigns.

Build a living world, then watch it react.

Define factions with ideologies, goals, and assets. Populate them with characters who have their own values, doubts, and breaking points. Then run sessions — recording the events of each week and the consequences that follow. The simulation tracks how faction power and legitimacy shift, how characters drift under pressure, how relationships sour or solidify as stress rises. The dashboard surfaces it all: influence timelines, relationship trends, power balances, and a session-by-session record of how the world changed.

The point is not to plan outcomes. The point is to create conditions and see what emerges.

---

## Core Philosophy

Every action the party takes changes the state of the world. Every change creates consequences. Every consequence creates new tensions.

The application exists to help the GM track those changes and understand how the world evolves over the course of a campaign.

> The application models perceived ideological compatibility under pressure.

The goal is not to identify a correct solution. The goal is to understand the consequences of imperfect choices.

---

## Technology Stack

| Layer            | Technology         |
| ---------------- | ------------------ |
| Frontend         | Angular 22         |
| State Management | NgRx Signal Stores |
| UI Components    | Web Awesome        |
| Styling          | SCSS               |
| Backend          | ASP.NET Core 10    |
| Database         | SQLite             |
| ORM              | EF Core            |
| Testing          | Vitest             |
| Development      | Docker Compose     |

---

## Project Structure

```text
colony-tracker/
├── client/
├── server/
├── docker-compose.yml
├── docker-compose.full.yml
└── README.md
```

---

## Running the Application

## Dev Mode (Recommended)

Runs the API in Docker while Angular runs locally with hot reload.

```bash
docker compose up -d
```

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

```bash
cd server
dotnet run
```

```bash
cd client
npm install
npm start
```

---

## Running Tests

```bash
cd client
npm run test:unit
npm run test:unit:watch
```

Unit tests cover:

- Relationship scoring
- Value weighting
- Ternary normalization
- Character drift calculations
- Stress scaling
- Compatibility calculations
- Relationship labels

---

## Application Structure

The application is divided into three major domains.

### Overview

Provides dashboards, analytics, and historical views of the world.

Pages:

- Dashboard

---

### World

Defines what exists.

World entities represent the baseline state of the setting.

Pages:

- Factions
- Characters
- Assets

---

### Campaign

Defines what changes.

Campaign systems record the evolution of the world over time.

Pages:

- Sessions
- Relationships
- Party

---

### Settings

Define the rules of the simulation.

Tweak weights and create session rules that generate new emergent behavior.

Pages:

- Values
- Relationship Rules
- Power Rules
- Session Effects
- Stress Triggers

---

## Application Screens

| Screen           | Purpose                                                          |
| ---------------- | ---------------------------------------------------------------- |
| Dashboard        | World overview, stress, timeline, major alliances and conflicts  |
| Factions         | Create and view factions                                         |
| Faction Detail   | View and edit faction details and goals                          |
| Characters       | Create and manage NPCs and party members                         |
| Character Detail | Values graph, pressure, conviction, drift analysis               |
| Assets           | Manage in-world resources and infrastructure with scoring impact |
| Sessions         | Campaign session management and event creation                   |
| Relationships    | Directional relationship matrix                                  |
| The Party        | Configure details about your adventuring party                   |

---

For the full simulation model — values, beliefs, influence, assets, faction goals, legitimacy, pressure, drift, sessions, events, effects, cascades, and snapshots — see [ARCHITECTURE.md](ARCHITECTURE.md).
