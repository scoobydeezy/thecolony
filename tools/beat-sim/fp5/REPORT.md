# Faction Phase candidate rules: simulation report (2026-10-21)

**Method:** `fp5-sim.ts` runs full 12-session campaigns on the real client engine.
- **Turns:** a Colony Turn before Sessions 2–12. Acts: S1–4 are Act I, S5–8 Act II, S9–12 Act III.
- **Unchanged (shipped code):** Power, Momentum, the Opening and Character Phase, goal detection, advance Effects, World Conditions and replay. Only the Faction Phase's allocation and roll differ.
- **Starting world:** `world-2026-10-21.json`, the 2026-10-20 balancing plan as intended. It has the Unclaimed Object's planned id and every goal's advance Effects.
- **Scope:** 1,000 campaigns per configuration. There's no play: no party and no GM, so Ready to Resolve goals wait.
- **Priority values:** P = Critical 3, Major 2, Minor 1.

| Rule | Allocation | Roll |
|---|---|---|
| **REF** (today, fp-4) | tokens by priority (3/2/1), draw Power-many; a goal may roll several times | 2d6 + Momentum − 1 (if any active defence) ≥ 9 |
| **A** (passive Maintain) | one token per eligible Achieve goal; draw Power-many | 2d6 + P + Momentum ≥ DC + P of the highest active defending Maintain goal |
| **B** (shared Power) | one token per eligible Achieve goal **and per active Maintain goal**; a Maintain goal defends only if drawn | as A |
| **B2** (shared, when threatened) | as B, but a Maintain goal enters the draw only while another faction has an eligible goal on its target | as A |

In every rule, a natural 12 always succeeds (+1 Momentum signal) and a natural 2 always fails (−1).

## Results (per campaign: 11 Faction Phases)

| Config | Rolls / phase | Power spent on Maintain | Idle turns¹ | Success, undefended | Success, defended | Rolls defended | Advances | Accomplished |
|---|---|---|---|---|---|---|---|---|
| REF (fp-4) | 8.5 | 0% | 21% | 34% | 19% | 35% | 26.7 | 10.9 |
| A, DC 9 | 6.6 | 0% | 27% | 55% | 28% | 35% | 32.9 | 14.1 |
| **A, DC 10** | 7.6 | 0% | 20% | 41% | 18% | 35% | **27.4** | **11.1** |
| A, DC 11 | 8.6 | 0% | 15% | 29% | 10% | 35% | 21.3 | 8.1 |
| A, DC 12 | 9.4 | 0% | 13% | 19% | 6% | 35% | 15.1 | 5.3 |
| B, DC 9 | 5.3 | 55% | **34%** | 57% | 31% | 24% | 29.2 | 11.3 |
| B, DC 10 | 5.8 | 53% | 30% | 44% | 20% | 24% | 23.8 | 8.7 |
| B, DC 11 | 6.3 | 51% | 26% | 32% | 11% | 24% | 18.5 | 6.4 |
| B2, DC 9 | 6.3 | 27% | 26% | 56% | 30% | 29% | 32.6 | 13.4 |
| **B2, DC 10** | 6.9 | 26% | 20% | 42% | 19% | 29% | **26.7** | **10.3** |
| B2, DC 11 | 7.6 | 25% | 16% | 30% | 11% | 29% | 20.6 | 7.3 |

¹ A faction with Power > 0 that made no Achieve roll that turn, because it had no eligible goal or its whole draw went to guarding.

**Accomplished per faction per campaign:**

| Config | Aspis | Cult | EGRESS | Order | Dawn | Shattered | Witnesses |
|---|---|---|---|---|---|---|---|
| REF | 1.22 | 0.39 | 1.15 | 2.74 | 3.54 | 0.09 | 1.78 |
| A, DC 10 | 1.28 | 0.52 | 0.91 | 2.73 | 3.52 | 0.27 | 1.86 |
| B, DC 9 | 0.86 | 0.75 | 0.92 | 2.81 | 3.70 | 0.65 | 1.61 |
| B2, DC 10 | 0.96 | 0.65 | 0.90 | 2.73 | 3.46 | 0.32 | 1.25 |

**Contested Assets (final holder):**

| Asset | REF | A, DC 10 | B2, DC 10 | B, DC 9 |
|---|---|---|---|---|
| The Ledger: Witnesses keep it | 93% | 92% | 80% | 69% |
| Claims Registry: Aspis keep it | 95% | 98% | 93% | 88% |
| Book of Names: the Order keeps it | 3% | 9% | 13% | 4% |

## Reading

- **A at DC 10 and B2 at DC 10 both keep today's pace** (about 27 advances and 10–11 Accomplishments per campaign). DC 9 is about 20% faster; DC 11 about 20% slower.
- **B, shared Power for every Maintain goal, is the weakest.** About half of all Power goes to guarding targets nobody is attacking. At a pace-matched DC 9, a third of faction turns make no attempt at all. Factions with several assignments and little Power (Aspis, Witnesses, EGRESS) fall furthest behind.
- **B2, shared Power only when threatened, is the consistent rule that works.** About a quarter of Power goes to defence, idle turns match A, and defence becomes a cost the defender pays. Contested holdings change hands more often (the Ledger 20% vs 8%), because a guard isn't always posted. The price: the Witnesses complete fewer of their own goals (1.25 vs 1.86) while they spend Power guarding the Ledger and House.
- **Under A, defence is constant and strong.** An assignment at Major or Critical adds 2–3 to the DC every turn for free, so held Keystones rarely move (the Ledger 92%).
- **Priority reach rates are not reported.** There are only 3 Critical Achieve goals (two of them Act I narrative goals belonging to Power 3 factions), so the rates measure which faction owns each priority, not the priority itself.
- **The Order's Power falls from 3 to about 1.4 in every rule.** It is the main target (Book, Hall, Bell).

The DC and the priority values are balancing choices for the GM. This report only measures them.

## Addendum: B2 with the Secret rule, DC 8–10 (same day)

**B2S** is B2 plus one rule: a **Secret** goal is unknown to the defender, so it does not make its target threatened.
- A guard posted because of another, known threat still defends against a Secret attack.
- Known goals count as visible to the defender.
- Ten goals are Secret. Five of them attack a defended target: *Abide* (the House of Abiding), *Connect* (Claims Registry), *Freeze the Fund* and *Empty the Reform Treasury* (both on the Fund), and *Open the Book of Names*.

Raw results: `results-secret-2026-10-21.json`, 1,000 campaigns each.

| Config | Rolls / phase | Power spent guarding | Idle turns | Advances (I / II / III) | Accomplished + Ready, of 25 |
|---|---|---|---|---|---|
| REF (fp-4) | 8.5 | — | 21% | 26.7 (7.0 / 11.1 / 8.6) | 11.1 (44%) |
| A, DC 8 | 5.8 | 0% | 34% | 37.1 (9.0 / 17.5 / 10.6) | 16.9 (68%) |
| A, DC 9 | 6.6 | 0% | 27% | 32.9 (8.2 / 14.5 / 10.3) | 14.4 (58%) |
| A, DC 10 | 7.6 | 0% | 20% | 27.4 (7.1 / 10.9 / 9.4) | 11.2 (45%) |
| B2, DC 8 | 5.7 | 27% | 32% | 37.1 (9.0 / 16.3 / 11.9) | 16.8 (67%) |
| B2, DC 9 | 6.3 | 27% | 26% | 32.6 (8.2 / 13.2 / 11.1) | 13.9 (56%) |
| B2, DC 10 | 6.9 | 26% | 20% | 26.7 (7.1 / 10.1 / 9.5) | 10.5 (42%) |
| **B2S, DC 8** | 5.5 | 12% | 35% | 39.0 (9.4 / 18.5 / 11.1) | 18.5 (74%) |
| **B2S, DC 9** | 6.3 | 11% | 28% | 35.4 (8.7 / 15.7 / 11.0) | 16.0 (64%) |
| **B2S, DC 10** | 7.2 | 11% | 21% | 30.0 (7.5 / 12.3 / 10.2) | 12.6 (50%) |

**Attacks on guardable targets** (another faction holds an active assignment on the target):

| Config | Secret: share defended | Secret: success | Known: share defended | Known: success |
|---|---|---|---|---|
| B2, DC 9 | 91% | 33% | 74% | 36% |
| **B2S, DC 9** | **25%** | **57%** | 88% | 31% |
| B2S, DC 8 | 23% | 71% | 90% | 44% |
| A, DC 9 | 100% | 29% | 100% | 27% |

**Held at the end by the original holder:**

| Asset (holder) | A, DC 9 | B2, DC 9 | B2S, DC 9 | B2S, DC 8 |
|---|---|---|---|---|
| Civic Improvement Fund (Dawn) | 14% | 27% | **1%** | 0% |
| Claims Registry (Aspis) | 95% | 88% | **54%** | 33% |
| The Ledger (Witnesses) | 79% | 61% | 63% | 39% |
| Book of Names (Order) | 2% | 3% | 2% | 0% |

**Accomplished per faction:**

| Config | Aspis | Cult | EGRESS | Order | Dawn | Shattered | Witnesses |
|---|---|---|---|---|---|---|---|
| B2, DC 9 | 1.55 | 1.03 | 1.72 | 2.93 | 3.69 | 0.63 | 1.80 |
| B2S, DC 9 | 1.74 | 1.48 | 2.22 | 2.93 | 3.67 | 0.61 | 2.49 |
| B2S, DC 8 | 1.94 | 2.05 | 2.67 | 2.98 | 3.79 | 1.05 | 2.81 |

**Reading**
- **Secrecy now matters.** Under B2S a Secret attack meets a guard only 25% of the time (only when a known threat also drew one), against 88% for known attacks. Its success rate nearly doubles (57% vs 31% at DC 9).
- **Defence spending halves** (11–12% of Power), because the most-threatened holdings are threatened only secretly.
- **The losers are holdings attacked only by Secret goals.** Dawn's Fund is hit by two Secret goals and is almost never kept. Aspis's Claims Registry, hit by the Cult's Secret *Connect*, falls from 88% kept to 54%. The Cult, EGRESS and the Witnesses gain.
- **DC 8 runs the plan dry.** Act II advances jump, Act III barely moves (about 11 at both DC 8 and DC 9), and idle turns reach 35%: factions finish their goals before the campaign ends. DC 9 is about 30% faster than today and leaves about a third of the plan open at the end; DC 10 is today's pace.
