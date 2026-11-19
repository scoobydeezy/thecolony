# Review of the source-doc conversion (commit 2320b6e), 2026-11-19

Four independent reviews (narrative chapters; Parts I–II, rules and entries; creatures, hazards and Sources; tooling code), plus builds, tests and a visual pass. Fixed items are in ADVENTURE-BOOK-CHANGES.md (2026-11-19); this file lists what is **still open**. Paths are under `adventure/src/content/` unless shown otherwise.

**Overall:** stat transfer is close to exact (31 creatures and 22 Sources match the sources field by field). Act I, the five Act III fronts, and Parts I–II respect every ruling, with no retired mechanics revived. The problems are about structure: where a few path-specific facts happen, Reading-path versions the sources don't support, provisional numbers the GM can't see are provisional, and rule-entry hygiene.

## 1. Decisions (answered 2026-11-19)

| # | Ruling | Status |
|---|---|---|
| D1 | Restore the Clearing House `.yaml`; factions become `.md`. | Done |
| D2 | Handouts come later; this is an integration pass. | No change |
| D3 | Don't mark anything provisional. | Done: labels removed from GM text |
| D4 | The second Reading happens while the Party is in the Assembly with the factions; they don't interrupt it. | Done: The Confluence, Eclipse |
| D5 | Not a defect: the Pépé Sylvya thread is the records investigation by design. | Dropped |
| D6 | Serevan is an Elf. | Already correct (the trait derives from the NPC entry); design note updated |
| D7 | Pépé is a Keeper. | Done: swapped with Iven Quill to keep the 18 combinations unique |
| D8 | The formula supersedes the source's arithmetic. | Already correct (DC 32) |
| D9 | The party is expected to be level 12 or 13, possibly higher. | Done: four passages and the progression page |
| D10 | The Keeper host is corporeal. | Done: Aletheia |
| D11 | Ignore the provisional decisions. | No change |

## 2. Content and tooling defects

**All fixed on 2026-11-19** (see ADVENTURE-BOOK-CHANGES.md). Left as they are, on purpose:
- Act II has no Apparent Answer: the Outline's Act II doesn't give one.
- Six creatures keep empty `strikes:` because their attacks aren't Strikes (Old Town Corpus, Aletheia Echo, Caretaker Bed, Vara Reading, Veiled Shambler Troop, Monument of the First Keeper).
- The memory hazards have no `level` (the source gives none). The Monument's ray emitter stays a hazard (the schema has no object type).
- The Phase IV Companies' Backlash numbers stay on the phase page, because no Source entry owns them.
- The Calling: "What the order is will be expanded later" (the UFO mission order, by your ruling).
- `serve.mjs` on Windows (`spawn('npm')`, the dotfile regex): only matters if the book is run on Windows again.

## 3. Open

- **Answer the Reckoning (the Shattered front goal) was recreated** as `goals/answer-the-reckoning.yaml`, from the 2026-11-16 reconciliation migration. The migration inserts that goal and its "Old Town Response" World Condition, but no database backup since then contains either row, so it was removed, or never applied, before 2026-11-17. If you deleted it on purpose, delete the file. If it belongs, its "Old Town Response" condition also needs a file.
- `counterfeit-weaver.md` repeats its trait and ability-modifier lines in the body.
