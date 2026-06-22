# The Colony Campaign Tracker

A local campaign management tool for **The Colony**, a Pathfinder 2e campaign built around competing factions, ideological conflict, societal stress, and long-term consequences.

The application models how people, organizations, and communities respond to pressure over time.

It is not intended to determine which faction is correct.

It is intended to model how beliefs, values, influence, and circumstances interact within a living society.

---

## Core Philosophy

The Colony is not a static setting. It is a living system.

Every action taken by Darkwing changes the state of the colony. Every change creates consequences. Every consequence creates new tensions.

The application exists to help the GM track those changes and understand how the colony evolves over the course of a campaign.

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

## Overview

Provides dashboards, analytics, and historical views of the colony.

Pages:

- Dashboard

---

## World

Defines what exists.

World entities represent the baseline state of the colony.

Pages:

- Factions
- Characters
- Relationships

---

## Campaign

Defines what changes.

Campaign systems record the evolution of the colony over time.

Pages:

- Colony State
- Sessions
- Party

---

## Application Screens

| Screen           | Purpose                                                   |
| ---------------- | --------------------------------------------------------- |
| Dashboard        | Colony overview, stress, major alliances, major conflicts |
| Factions         | Manage factions and social classes                        |
| Characters       | Create and manage NPCs and party members                  |
| Character Detail | Values graph, pressure, conviction, drift analysis        |
| Relationships    | Directional relationship matrix                           |
| Colony State     | Stress, timeline, Party positions                         |
| Sessions         | Campaign session management and event creation            |
| Session Log      | Campaign history and notes                                |

---

## Campaign Truths

These assumptions are foundational and should not change without deliberate intent.

- Every faction is correct about something.
- Every faction is blind to something.
- No faction possesses the complete answer.
- The campaign has no predetermined solution.
- The colony itself functions as the primary antagonist.
- Monsters are symptoms, not root causes.
- The central question is not whether the compromise is wrong.
- The central question is what should replace it.

---

For the full simulation model — values, beliefs, influence, legitimacy, pressure, drift, sessions, events, effects, cascades, and snapshots — see [ARCHITECTURE.md](ARCHITECTURE.md).
