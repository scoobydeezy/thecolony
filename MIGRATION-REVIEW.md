# Campaign migration review — 18 November 2026

The Starlight draft now covers all **33 events and encounters**, all **four Burden phases**, and the remaining creature, Source, hazard, rule, and handout material brought in with those chapters. The nineteen overview and setting pages from the previous pass remain the book’s introduction. This is a compiled campaign draft, not a claim of balanced, playtested encounters or finished physical components.

The twelve current source exports were treated as the baseline and left unchanged. Campaign Synopsis remains retired into Campaign Vision and Campaign Outline. No commits were made. The book can build without the exports; explicit provenance checks and the designer’s source viewer still use them.

## History recovered and its limits

Reviewed the available excerpts from sixteen campaign chats. Each event and encounter has a lookup record in `adventure/sources/remaining-reconciliation.yaml`, including direct mentions, related context, and the decision applied. The service returned bounded recent turns with no older cursor. Some long assistant messages were truncated; linked stat-block attachments and prior simulation files were unavailable. A lookup with no direct mention means the current source and related context governed; it does **not** establish that no earlier discussion exists.

Explicit user decisions take precedence over assistant refinements. Older proposals were not restored merely because a search found them. Particularly consequential reconciliations:

- **Duskwood:** recovered the Black Claw Gorge encounter, two Vemeraks, kobold harriers and gatewrights, the first 150-HP trigger, and engineers moving before using the lever. Tarn remains sincere; the tentative Serevan connection is not canon.
- **Vara:** on the stopped branch, the attempted Reading after the Confluence fails to settle the burden. Vara remains remembered. An assistant suggestion about how her name behaves is not substituted for the user’s description.
- **The Observer:** closes Act II. On the stopped branch the eclipse has already begun at the Confluence; on the successful branch his full revelation precedes it. His identity and history remain unresolved, without Shyka hints or a newly invented mastermind role.
- **Act III:** five fronts, one result per front, the same result feeding Asset condition and finale capability. Perrik and Kelda remain relationship-led participants. No revived nine-condition board or extra integrity roll.
- **Identity:** six Keystones, including the Dawn Charter for Choice; Context remains local. Reconstruction uses viable paths, not a universal pair of mandatory locks. Acceptance and the agreed Final Reading do not acquire a surprise final roll.
- **The ending:** Sundara is not silently made a Keeper. Surviving relationships and capabilities matter; optional routes do not become compulsory merely to supply an ending.

## Provisional decisions to review

These are authoring choices made while you were away, not recovered approvals. They are also marked in the relevant owning entries or scenes.

| Area | Draft decision | Review needed |
|---|---|---|
| Duskwood | Retained the recovered roster, trigger, level/HP/AC summary, and gate component HP. Completed missing kobold attacks, saves, abilities, gate AC/Hardness and counterplay provisionally. Vemeraks link to their published profile. | Recover the unavailable attachment if possible; tune the new numbers against the actual party. The published Vemerak profile is still a session-prep dependency. |
| A Life | If left unresolved, safe separation or containment can prevent immediate recurrence without granting automatic Restoration. | Confirm the intended unattended consequence. |
| Containment | Once the documented prerequisites are satisfied, routing can be performed outside initiative; it adds no invented sequence of mandatory checks. | Confirm how much technical procedure should be played out. |
| Shape of Someone | The Face’s missing Source values use level 16, Class III. | Approve or replace these Source values. |
| Sunny | A fully Dispersed troop returns after three full rounds; optional Break from the Horde is disabled pending a complete profile. Individual Sundara reconstructions retain their source procedure. | Playtest pressure and recovery timing. |
| Milltown | Level-12 draft collision numbers are DC 32 Reflex and 4d6 full damage. The source’s four degrees remain intact: critical failure is full damage, dropped civilian, and possible one-tile displacement. Each debris piece can hit each PC once per card. A two-action brace is an optional provisional response. | Tune the numerical hazard and brace; the simulation’s DC 22 is not treated as final. |
| Milltown components | Added visible starting barrier positions and a nine-step repeating Floodwarden sequence, preserving the separate Straight/L/U pieces and unchanged eighteen-card Flood Deck. U protection is temporary and never counts as rescue. | Physical playtest. This new sequence does not reproduce the unavailable simulations. |
| Floodwarden | An autonomous routine reference supplies the required turn behavior; no invented mandatory combat opponent. | An attackable creature profile is still needed if the Party fights it. |
| Tangled Web | Spider Focus uses provisional Source level 14; the source’s Class IV remains provisional. The true network is 02 + 03 + 04. Coherence interrupts the false divine Form; it is not HP Dispersal or automatic Anchoring. | Approve the Source numbers. Choose the fourth crafted object and recipient from the actual party; no unearned soul Anchor is assumed. |
| Open Door | Completed the under-specified hazard with a level-12/DC-34/counteract-rank-6 draft and recovery degrees. Hospitality and Choice remain the encounter’s subject. | Playtest the exits, recovery costs and failure paths. |
| Totality deadlines | Announce concrete fictional thresholds before they expire. Tactical rounds do not silently advance an invented universal city clock. | Set front-specific timings during campaign preparation; no universal clock was inferred. |
| Serevan unavailable | Do not resurrect or forcibly preserve him. Keep the Last Secret recoverable through earned records or Keeper history, with a scene-specific adaptation. | This departs from the source’s assumed Serevan confrontation. Approve the contingency before that branch is needed. |
| Unvisited Sunny | A separate Sundara recognition can use Tom or surviving material evidence after Aletheia becomes coherent. | Confirm the connective scene. It gives no retroactive front success, resurrected NPC, or reversed loss. |

## Ownership and player material

Scenes own chronology, board procedures, evidence, choices, and consequences. Creature, Source and hazard entries own their mechanics. General procedures have rule owners. Source-derived statistics use the existing derived-value markup; the finale’s special **Institutional Class** track is explicitly distinct from the Book’s unchanged Class V.

Five handouts now have player-only Markdown downloads: Hall display labels, Celia’s field procedure, the Spider Focus card, the Ledger records and dossiers, and the Material Concordance. Downloads contain only explicitly player-facing blocks, excluding GM notes, the sealed solution, navigation and reference drawers. The GM handout page itself is not a player-safe share link.

The coverage inventory retains draft work as **in progress** until meaning-changing provisional decisions are reviewed. Coverage is a record of where material went, not a readiness certificate. The remaining-reconciliation ledger records reviewed source ranges and their destinations so the book need not depend on undocumented migration scripts.

## Remaining preparation

- Starting level and advancement schedule remain open by your instruction. The source’s repeated six-PC level-12 tuning assumption is not an advancement plan. Treasure and rewards need a campaign pass.
- Balance the new and existing encounters with the actual characters, including linked published creatures. Most source stat blocks were transferred, not independently redesigned or playtested.
- Produce and test the physical boards, cards, templates and tokens. Sunny’s grave board, Milltown’s tile/deck specifications, and the other encounter procedures are preserved as text, not fabricated components.
- Resolve earlier review points: canonical city map, Ledger starting location, Broken Bell description, legacy faction mottos, exceptional Source-destruction/Scar consequences, and loss of control of a front Asset. Current source policy leaves that last case to a recorded fictional ruling.
- A glossary owner index now exists, but a comprehensive alphabetical vocabulary index remains an editorial improvement.
- Recover older chats and attachments if they become available. No claim of exhaustive historical recovery or pixel-level browser review is made.

Validation results for this pass are recorded in `ADVENTURE-BOOK-CHANGES.md` after the final builds.
