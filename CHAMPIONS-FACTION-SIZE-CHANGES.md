# People from Faction Size; one assignment per champion (BOARD-GAME-REVIEW §18.8)

**Status:** uncommitted on `main`. No faction, character, champion or count was changed to fit anything.

## 1. Audit: AdditionalMemberCount → Faction Size
**Before:**
- `Faction.AdditionalMemberCount` (int, default 0) meant **unnamed members only**. People added it to the named characters.
- It was stored as a column, edited with the ±1 / ±10 buttons in Design mode, and Live-locked.
- As of yesterday it appears in the factions CSV and can change through an `additionalMembers` Effect.

**In your data:** it was **0 for all 11 factions**, and no membership Effect had been recorded.

**Migration (`People_FactionSize`):** a column rename to `FactionSize`, which now means **total** membership.
- Because every value was 0, no count is reinterpreted or changed. This was verified on a copy: the counts are identical after migrating.
- **The consequence:** until you enter sizes, every faction's People is just its leader's 5, so no faction qualifies People. That is the formula on unbalanced data, not something to correct.

**Other paths:**
- **CSV:** the factions CSV column is `FactionSize`. A file without it keeps the value. An old `AdditionalMemberCount` column is ignored, because it meant something else.
- **Effects:** the Effect is **Faction Size ±n** (`factionSize`, never below 0). Replay still reads yesterday's `additionalMembers` name; none were recorded.
- **Elsewhere:** the snapshot field is `factionSize`. The campaign import copies `FactionSize`, and the Live lock now covers it.

## 2. People
- **Formula:** `power.ts`: People = leader bonus (5, alive and a member) + ⌊Faction Size ÷ 20⌋, qualifying at 10. Named characters only matter as the leader (and as champions).
- **Settings:** `membersPerPoint` (20) replaces `unnamedPerPoint`. The Power Rules tab is updated.
- **Faction page:** "Faction size N (+P People)", with ±1 / ±10 in Design. The People detail reads "leader +5 · 40 members +2". On the faction cards, Members shows "named / size".

## 3. One active assignment per champion
- **Rule:** `goals.ts` has `occupiesChampion`, `championLoads` and `championOptions`.
- **Champion dropdown:** it lists living members of the goal's faction who champion no other active goal or assignment, plus the goal's current champion, always.
  - Characters with other assignments are omitted, not shown disabled.
  - The list updates as assignments change.
  - Dead characters are no longer offered as new champions.
- **Champion Change Effect** (sessions effect editor): the same filtering, against the projected state at the viewed point.
- **Goal card:** a "Champion shared" badge appears on legacy duplicates, naming the other goals. It is informational only.
- **Server (`ChampionRules`, used by goal Create and Update; the CSV import goes through Update):** refuses, with 409 and a message, any **new** occupancy: a new goal, a changed champion, or a goal reactivated from a terminal status whose champion holds another active assignment. An unchanged champion on an unchanged active goal is accepted, so unrelated edits to legacy duplicates work.

## 4. Existing assignments
- **Unchanged.** A freshly migrated copy has an identical champion and status for every goal.
- **One legacy duplicate:** Julian Arrett, on *Sunset the Order* and *Stop the Ritual*. It is preserved and badged.

## 5. Verification

| Check | Result |
|---|---|
| vitest | 208/208 |
| `ng test` | 210/210 |
| tsc | clean |
| Development build | succeeds |
| `server.Tests` | 25/25 |
| e2e, fresh copy of the live DB | 68/68 |

- **People tests:**
  - named characters add nothing (3 or 12 named → 0);
  - the brief's example (3 named, a leader, size 40 → 7);
  - the boundaries 0–19, 20–39, 40, 60, 80, 99, 100, 119, 200, 219;
  - qualifying with very few named characters;
  - the leader killed, missing, departed, absent, replaced, or an outsider;
  - adding or removing named characters never changes People;
  - monotone in size;
  - size Effects replay;
  - the eight channel combinations;
  - an Events chain: leader death, recruitment, an Asset taken.
- **Champion tests (client):**
  - Achieve and Maintain block each other;
  - the current champion is kept;
  - clearing or terminal status releases;
  - Dormant still occupies;
  - Stalled counts as active;
  - duplicates are reported;
  - unassigned goals are valid and Dormant.
- **Champion tests (server):** new duplicates are refused, of either type; unassigned and terminal goals are fine; an unrelated edit to a duplicate is accepted; reassigning onto a busy champion is refused; reactivation is validated; release on Retired or cleared.
- **e2e against the API:**
  - an unrelated edit to the legacy duplicate succeeds;
  - reassignment and creation with a busy champion are refused (409);
  - an unassigned goal is accepted;
  - retire, then reassign the released champion;
  - `factionSize` is in the API;
  - a Faction Size Effect replays.
- **Snapshot golden:** the field is renamed (all 0).
- **Power golden:** recalculated. People no longer qualifies anywhere (all sizes 0), so Power drops by one wherever People had counted.
- **Simulator (`colony_sim.py` `power='stars'`):** People = leader + ⌊size ÷ 20⌋. `export.py` reads `FactionSize`.

## 6. Remaining concerns
1. **Champion changes in Live campaigns are recorded as `championChange` Effects, not as edits.** The server cannot check those against the rule without replaying history, so Live enforcement is the client dropdown only. The stored `ChampionId` is Live-locked, and Design edits are validated on the server.
2. **Champions are freed by an explicit change or a terminal status.** The existing M4 rule still unassigns a champion who defects (a defector leaves the goal with the faction) or whose goal is Retired.
3. **Past sessions** recompute People under the new rule; saved turns keep the Power they used.

## Addendum: multi-file exports as one ZIP (bug fix)

**Problem:**
- **Factions** (factions + faction-goals) and **Characters** (characters + profiles + details + relationships) started several downloads from one click. Browsers allow one: the rest were refused, which is the "dink".
  - The factions goals file started while the first file's save dialog was open.
  - The three character files started only after fetching their data, outside the click.
- Every download also revoked its URL immediately, which can cancel a file waiting on a save dialog.

**Fix:**
- **`core/utils/zip.ts`:** a minimal stored (uncompressed) ZIP writer.
- **`csv-export.ts`:** `toCsv`; `downloadBlob`, which revokes the URL after 60 s; `downloadCsvZip`.
- **Factions export:** `factions-export.zip` (`factions.csv`, `faction-goals.csv`).
- **Characters export:** `characters-export.zip` (`characters.csv` plus whichever of `character-profiles.csv`, `character-details.csv` and `character-relationships.csv` have data). It is one download, after the fetch.
- **Single-file cases** are still a plain `.csv`. The sessions and narrative JSON exports use `downloadBlob` too.
- **Import is unchanged:** unzip, then import each CSV as before.

**Verification:**
- `zip.spec.ts`: the CRC-32 check value, and names, sizes and checksums re-read through the central directory.
- A generated archive passes `unzip -t` and Python `zipfile.testzip()`, and extracts with macOS `ditto` with UTF-8 names and contents intact.

| Check | Result |
|---|---|
| vitest | 210/210 |
| `ng test` | 212/212 |
| Development build | succeeds |
