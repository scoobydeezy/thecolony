---
id: handout.material-concordance
slug: material-concordance
name: The Witnesses — Material Concordance
status: draft
audience: players
provenance:
  - doc: The Witnesses — Material Concordance
    heading: Cataloguing Standard & Field Reference — v1.1
---

[Download player-only Markdown](/docs/player-handouts/material-concordance.md)

[Download player-only Markdown](/docs/player-handouts/material-concordance.md)

[Download player-only Markdown](/docs/player-handouts/material-concordance.md)

:::player-facing
## 1. Quick reference

A complete entry has the following form:

```text
I: H.200.3.041
N: Teacup, 1 of 2
M: CER.GLZ / PNT
S: SM / H84 / D91
K: 00=bowl; 01=handle; 02=foot

C01: 01.EX.UP  / BRK:CRK.HL1R / L14
C02: 02.EX.BOT / BRK:CHP1     / W3
C03: 00.IN     / SUR:RES0     / A8
U: DRK~ [C03]; REPAIRED! [C01]
P: HAB.PR / INT.041
E: 200.3
X: SET.219; ACC.041; DOC.217
Z: Ø

Notes: [Plain-language object description; specific observations
        that clarify coded fields; references worth examining.]
```

| Field | Function | Question it answers |
|---|---|---|
| `I` | Inventory identifier | Which object record is this? |
| `N` | Name and documented set membership | What is it called, and is it part of a known set? |
| `M` | Material and making techniques | What is it made of, and how was it made? |
| `S` | Scale and measurements | How large is it? |
| `K` | Component key | What do the numbered parts refer to? |
| `C01`, `C02`… | Individual condition observations | Exactly what wear or damage is visible, and where? |
| `U` | Usage assessment | What use is evidenced or inferred? |
| `P` | Provenance / intake route | Where did the collection receive it from, and through what process? |
| `E` | Entry date | When was it accessioned? |
| `X` | Cross-references | What other records should be consulted? |
| `Z` | Recorded Resonance incidents | What unusual mnemonic behavior has been observed? |
| **Notes** | Readable description and supplementary evidence | What needs explaining beyond the standardized fields? |

**There is no `T` (conservation treatment) field.** The Witnesses preserve collected objects in enchanted cases and stores that arrest ordinary subsequent deterioration. They do not routinely restore their condition. Old damage, repairs, residue, and wear remain as received. The preservation enchantment does **not** remove mnemonic Weight or guarantee suppression of Incursions.

---

## 2. Identification, size, and set membership

### `I` — Inventory identifier

Current records use the shape `H.<entry-date>.<record-number>`, for example `H.200.3.041`.

- `H` marks the Hall of Remembrance inventory series in the current sample catalogue.
- `200.3` is the accession-date notation, repeated under `E`.
- `041` distinguishes this record within the series.

**Do not infer historical ownership, relationship, or a common intake from similarities between inventory numbers.** An inventory suffix and an `INT` reference can coincide in existing records, but the intake is established by `P` and related records—not by an assumed rule about suffixes.

The exact calendar semantics of `200.3` remain to be defined. Until then, treat it as a date in the Witnesses' archival reckoning; do not call the second component a month without a separate ruling.

### `N` — Name and set membership

Use the plainest defensible noun, qualifiers needed to distinguish the object, and any documented membership in a set.

- `Child's mitten, red; mate unlocated`
- `Teacup, 1 of 2`
- `Thimble, hand-fitted brass, 1 of 25`

**`1 of N` means a documented N-piece set**—a manufactured pairing, household set, or tool kit. The other pieces need not be in the Hall or appear among the twelve encounter objects. Set membership is **not** proof of common personal ownership across separate accessions or proof of a shared active Source.

### `S` — Size and measurements

The current sample uses size labels `XS`, `SM`, and `LG`; `MD` and `XL` may be used for future entries when needed. These are archival scale labels, **not** Pathfinder creature-size rules.

Measurements are in **millimeters**, unless the entry explicitly specifies another unit.

| Code | Measurement | Example |
|---|---|---|
| `L` | Length | `L139` = 139 mm |
| `W` | Width | `W72` = 72 mm |
| `H` | Height | `H84` = 84 mm |
| `D` | Diameter in the current sample records | `D91` = 91 mm |
| `A` | Area | `A35` = 35 mm² |
| `N` | Count | `N4` = four occurrences |

For a measurement not defined here (such as depth), spell it out in Notes or establish a new controlled code; do not silently overload an existing code.

### `K` — Object-specific component key

Each entry numbers **its own** components; the same number can mean something different in the next record.

```text
K: 00=bowl; 01=handle; 02=foot
K: 00=shell; 01=rim
K: 00=body; 01=thumb; 02=cuff
```

`00` ordinarily denotes the main body, but the written `K` line is authoritative. **Never assume `01` means “handle” across all records.**

---

## 3. Condition records — complete notation

A condition line records **one observation** and follows this structure:

```text
C##: [component].[face/region...] / [FAMILY]:[TYPE][.QUALIFIER][GRADE][R] / [extent]
```

For example:

```text
C01: 01.EX.UP / BRK:CRK.HL1R / L14
C02: 02.EX.BOT / BRK:CHP1 / W3
C03: 00.IN / SUR:RES0 / A8
```

### Read it from left to right

`C01: 01.EX.UP / BRK:CRK.HL1R / L14`

1. `C01`: observation 01, independently referenceable from another field.
2. `01.EX.UP`: component 01; exterior; upper portion.
3. `BRK`: the **breakage** condition family.
4. `CRK`: a **crack**.
5. `.HL`: **hairline** qualifier.
6. `1`: **minor** severity grade.
7. `R`: **visible historical repair**.
8. `L14`: 14 mm observed length.

The qualifier and extent are optional. The **grade is part of the condition code**, not a separate `G1` field. `R` is also part of the condition code, not `REP:Y` or a separate treatment entry.

### 3.1. Location / orientation

| Code | Meaning | Code | Meaning |
|---|---|---|---|
| `EX` | Exterior | `IN` | Interior |
| `FR` | Front | `BK` | Back |
| `UP` | Upper portion | `LOW` | Lower portion |
| `TOP` | Top | `BOT` | Bottom |
| `L` | Left | `R` | Right |
| `CTR` | Center | `EDGE` | Edge or perimeter |
| `JNT` | Joint / seam / join | `ALL` | Entire component |

Use positions in whatever combination provides an unambiguous location: `00.IN.TOP`, `01.EX.UP`, `03.JNT`, `02.EDGE`. The component and any face or region may be omitted only when the meaning remains clear from the entry's component key and Notes.

**`EX` is canonical.** Do not use the older draft code `OUT`.

### 3.2. Condition families and types

All objects use the same four condition families, even though not every condition applies to every material.

| Family | Meaning | Type | Expansion |
|---|---|---|---|
| `BRK` | Breakage or lost material | `CRK` | Crack |
| | | `CHP` | Chip |
| | | `TRN` | Tear |
| | | `SPL` | Split |
| | | `PUN` | Puncture |
| | | `LOS` | Missing material |
| | | `MIS` | Missing component |
| `WEAR` | Friction, handling, use | `ABR` | Abrasion |
| | | `SCR` | Scratch |
| | | `POL` | Polish from handling/friction |
| | | `FRY` | Fraying |
| `FORM` | Change of shape | `DNT` | Dent |
| | | `WRP` | Warp |
| | | `BND` | Bend |
| | | `DEF` | Other deformation |
| `SUR` | Deposits or surface alteration | `STA` | Stain |
| | | `RES` | Residue |
| | | `DIS` | Discoloration |
| | | `FAD` | Fading |
| | | `COR` | Corrosion |

These are **Witnesses-specific invented abbreviations**, not a claim that real conservation institutions use the exact same code strings.

### 3.3. Qualifiers, grades, repairs

| Part | Meaning | Example |
|---|---|---|
| `.HL` | Hairline (established qualifier) | `BRK:CRK.HL1R` |
| `0` | Trace / superficial | `SUR:RES0` |
| `1` | Minor | `BRK:CHP1` |
| `2` | Moderate | `FORM:DNT2` |
| `3` | Severe | `BRK:TRN3` |
| `R` | Visible pre-accession repair | `BRK:TRN1R` |
| No `R` | No visible repair recorded for that observation | `BRK:CHP1` |

Severity is distinct from extent: a short but structurally serious fracture can have a high grade, and a long superficial scratch can have a low grade.

Other qualifiers may be added to the controlled vocabulary when needed, but **only `.HL` appears as a settled qualifier in the current twelve-entry catalogue**. Record uncommon descriptive detail in Notes rather than inventing an unexplained suffix.

Uncertain repair identification should be stated in Notes or as a qualified observational claim, not silently encoded with an unapproved extra suffix.

### 3.4. Extent syntax

Write a measurement or count after the last slash when it helps identify the observation:

```text
/ L19   = 19 mm of measured length
/ W3    = 3 mm of measured width
/ A425  = 425 mm² of observed area
/ N4    = four recorded occurrences
```

Extent can be omitted if it adds nothing useful. Grade and extent are different fields of evidence.

---

## 4. Materials and manufacture — `M`

`M` is a slash-delimited list of material identifiers and observed manufacturing or finishing techniques. Codes can contain a period where the current vocabulary includes a more specific subtype or compound descriptor. It is **not** an owner identifier.

### Material identifiers used in the current twelve records

| Code | Meaning | Code | Meaning |
|---|---|---|---|
| `TEX.WOL` | Wool textile | `TEX.LIN` | Linen textile |
| `CER.GLZ` | Glazed ceramic | `MET.BRS` | Brass |
| `MET.FER` | Ferrous metal / iron | `MET.PEW` | Pewter |
| `MET.TIN` | Tin / tinware | `GLS` | Glass |
| `GLS.BLOW` | Blown glass (combined material/method code) | `WD.CARV` | Carved wood (combined material/method code) |
| `LEA` | Leather | `ORG.CORK` | Cork |
| `MET.PIN` | Metal pin/fastener | `WIRE` | Wire component |

### Technique / finish identifiers used in the current twelve records

| Code | Meaning | Code | Meaning |
|---|---|---|---|
| `KNIT` | Knitted | `STCH` | Stitched |
| `PNT` | Painted | `CAST` | Cast |
| `ETCH` | Etched | `FORG` | Forged |
| `FILE` | Filed / file-finished | `WAX` | Waxed / wax treated |
| `STAMP` | Stamped | `HINGE` | Hinge construction |
| `EMB` | Embroidered | `WIRE` | Wire construction or binding |

Some established entries use compound forms (such as `WD.CARV` and `GLS.BLOW`). Retain them in existing records; the Concordance need not pretend its centuries of vocabulary are perfectly uniform.

---

## 5. Usage — `U`

The `U` field records **documented or inferred use**, not necessarily an owner's identity. A use code or brief label may reference the condition observations or Notes on which it depends.

### Confidence markers

| Marker | Meaning | Interpretation |
|---|---|---|
| `!` | Verified / explicitly documented | A record actually substantiates the claim |
| `~` | Supported inference | Evidence favors it, but it is not established fact |
| `?` | Tentative / uncertain | Plausible hypothesis requiring corroboration |
| `Ø` | No entry / none recorded | An absence of a record, **not proof of absence** |

Examples from the catalogue:

```text
U: DRK~ [C03]; REPAIRED! [C01]
U: NEEDLEWORK~ [C01]; DEVOTION? [NOTE]
U: PLAY~ [C01]
U: NOM
```

### `NOM` — Nominal

**`U: NOM` expands to “Nominal.”** This is the established usage label on the iron key. It is a standalone classification, **not** a forgotten code and not equivalent to `Ø`. Do not silently treat it as evidence of a particular owner, personal use, or a special hidden purpose. If a future record needs a more precise usage assessment, add it explicitly with supporting evidence.

Usage phrases in the present catalogue include `WORN`, `REPAIRED`, `DRK`, `NEEDLEWORK`, `DEVOTION`, `PLAY`, `HEAVY HANDWORK`, `SERVING`, `OPTICAL WORK`, `FREQUENT DOOR USE`, `PERSONAL CARRY`, `MEAL STORAGE`, and `FLOWER KEEPING`. These are *readable labels* rather than a closed universal vocabulary; the confidence marker and cited evidence are what make them archival claims.

### Evidence references

- `[C01]` points to condition observation 01 **of this item**.
- `[C01,C03]` cites multiple observations.
- `[NOTE]` points to the object's Notes.
- Evidence in a related record must be cited by its actual document or accession reference, not by a naked `C01` from another object.

**A shared usage interpretation does not prove a common owner.**

---

## 6. Provenance, intake, and dates — `P` and `E`

`P` records documented **collection provenance / acquisition channel**, often followed by an intake docket. It does not necessarily establish the object's original maker, owner, or site of everyday use.

### Fully established codes

| Code | Expansion | Use |
|---|---|---|
| `HAB` | **House of Abiding** | Standard institutional prefix; **replaces the draft prefix `HA`** |
| `HAB.PR` | **House of Abiding — Post-Reading** | Acquired / transferred through a post-Reading House of Abiding process |
| `HAB.Pre` | **House of Abiding — Pre-Reading** | Recovered through a pre-Reading House of Abiding process |
| `CULT.DON` | **Cult Donation** | The Cult of the Unknown's regular donation channel, including items delivered from its Offering Chest |
| `INT.###` | Intake docket identifier | Record of a particular receipt or transfer event |

Examples:

```text
P: HAB.PR / INT.041
P: HAB.Pre / INT.008
P: CULT.DON / INT.113
```

**Important:** `HAB.PR` and `HAB.Pre` describe *when or under which Reading-related process the House of Abiding handled the object*. They do **not** guarantee who owned it. `CULT.DON` identifies a donation route, not necessarily the place an item was made or used. A single Cult delivery may combine objects from unrelated people and offerings.

### Additional site/channel abbreviations in the existing catalogue

The following codes appear in the twelve current entries. Their **exact long-form expansions have not been locked in the source catalogue**; preserve these code strings until their full place names and classifications are established rather than guessing.

| Code | Object(s) | Presently supported context |
|---|---|---|
| `MK.LDG` | Mitten; top | A child's market-side lodging |
| `RX.BAY` | Glove | A workplace/bay associated with heavy handwork; full institutional name unconfirmed |
| `AH.KIT` | Spoon | A food-service/kitchen intake context; exact site expansion unconfirmed |
| `MK.ST` | Spectacles | A market-associated source code; exact expansion unconfirmed |
| `LB.HSE` | Handkerchief | A house-associated source code; precise place name unconfirmed |
| `PQ.EA` | Hinge | Pilgrim Quarter east craft annex / communal entry context |

Use the quoted source code in records pending an authoritative local glossary. Do **not** rewrite these as newly canonized locations without approving those expansions.

### `E` — Entry date

`E: 200.3` is an archival entry date. It is separate from original creation, use, loss, donation, and Reading dates. Equal `E` values do **not** imply equal ownership or even the same intake; consult `P` and accession documents.

---

## 7. Cross-references — `X`

`X` is an **index of leads**, not a list of confirmed relationships. A link says *there is a relevant record*, not *this pair of objects belonged to the same person*.

| Prefix | Reference category | Interpretation |
|---|---|---|
| `ACC` | Accession or grouped intake record | Items processed together; potentially unrelated owners |
| `INT` | Intake docket | Receipt/transfer event; may be cited in `P` or `X` |
| `SET` | Documented manufactured / household / tool set | Component membership; other set members may be absent |
| `DOC` | Historical or archival document | Contents must be consulted for what they actually establish |
| `PAT` | Pattern / method comparison record | Similar technique or workmanship; not unique ownership |
| `LOC` | Historical location or site reference | Shared place need not imply shared individual |
| `MAT` | Material / method comparison | Similar materials or techniques need not imply common maker |
| `RES` | Documented Resonance reference | Evidence of an event; its interpretation may remain open |
| `OWN` | Explicit ownership evidence reference | Stronger than co-location, but consult underlying record |

Some of these prefixes are general supported *reference categories*; a specific numbered record is only established when it appears in the catalogue or an authored supporting document. Do not generate ungrounded `OWN` or `RES` evidence to make a puzzle easier.

Examples of how the archive distinguishes **true but different** associations:

- `ACC.041` links the teacup and lunch tin through one House of Abiding intake, **not** a shared owner.
- `ACC.113` links the thimble and flower bottle through one Cult delivery, **not** a shared Forgotten life.
- `PAT.017` links an eight-return sewing technique used on multiple objects; the technique was **not unique to one craftsperson**.
- `LOC.021` identifies a workshop/annex context; its communal hinge and the key to a private cupboard relate to **different fixtures**.
- `SET.140` identifies the 25-piece sewing kit; `SET.219` identifies the teacup's matching saucer. Neither set need be wholly present in the Hall.

**The puzzle's central distinction:** source records can correctly show *where*, *when*, *how*, and *with whom an item was handled*, while still leaving the identity of its original owner unresolved.

---

## 8. Resonance records — `Z`

`Z` references **observed mnemonic behavior**, with its own incident log separate from the condition or provenance fields.

```text
Z: Ø
Z: Z.1548
```

- `Z: Ø` means **no incident is recorded**. It never means that the item has no mnemonic Weight or cannot resonate during Totality.
- `Z.1548`, `Z.012`, `Z.022`, and `Z.031` are **incident identifiers**, not types or ranks of danger.
- The item Notes can give a concise, factual summary of an observed incident (for example, spontaneous spinning) while the incident record may contain more detail.
- A single object can be part of a larger Source network, or only one surviving fragment of a relationship whose other objects are not in this Hall.

Do not use the `Z` field as an automatic answer key to which objects sustain the principal Incursion.

---

## 9. Notes — editorial standard

**Notes combine the object description and all supplemental observational notes into a single field.** There is no separate description field, no GM-explanation field, and no need to repeat information already fully contained in the coded lines.

Good Notes:

- Provide the physical appearance that a viewer could recognize on first sight.
- Expand coded details where necessary: repair-thread color, distinctive stitch, layered paint, unusual residue, etched initials, tool marks.
- Reference a specific `C##` when expanding that observation.
- Mention an actual archived Resonance incident only as an observation, not as its future narrative meaning.
- Point toward a useful `DOC`, `LOC`, `PAT`, or other record without pre-interpreting its conclusion.
- Clearly separate documented facts from tentative provenance (`may have originated`, `possibly associated`).

Avoid Notes that:

- Restate every grade and measurement in prose.
- Name an upcoming manifestation, its threat level, or its true motivation.
- Reveal which three exhibits sustain the main Spider Incursion.
- Assert an owner from a shared stitch, intake date, religious symbol, or site alone.
- Explain why the record exists for the players' benefit.

### Paired examples

**Concise and useful:**

> `C01:` The repair thread is blue; it uses an eight-return binding stitch with an intentionally uneven final crossing. See `DOC.061` for comparable work.

**Not useful:**

> The mitten has a minor repaired tear and its unique maker is connected to the Spider's thimble, which is important in the coming encounter.

The first records evidence; the second duplicates `C01` and leaks GM interpretation.

---

## 10. Archival evidence versus inference

This is the most important rule for both in-world credibility and the Hall encounter.

| Claim | Supported by | Does not by itself prove |
|---|---|---|
| Two items share an accession batch | `ACC` / `P` / `INT` | Same owner |
| Two items show similar repairs | `C` / `PAT` | Same repairer, much less same owner |
| Two items came from one place | `LOC` / `P` | Same room, custodian, or Source |
| An item belongs to a set | `N` / `SET` | All members remain together or share an Incursion |
| A mark resembles a devotional motif | `C` / Notes / `U: …?` | Divine origin or identity of an Incursion |
| An object moved or reacted in a recorded incident | `Z` / incident log | That it is currently active or hostile |
| Multiple independent records converge on one person's specific workstation | Underlying `DOC` and provenance chains | A full Name or complete restored Identity without further evidence |

A successful archival puzzle should derive relationships from **corroborating independent facts**, not from identical code strings. The Ledger is reliable about what it recorded, but incomplete about what those records *mean*.

---

## 11. Fully worked examples

These are quoted from the companion **v0.2** catalogue to illustrate the notation, without changing its content.

### A. Teacup — repaired ceramic and an indirect provenance lead

```text
I: H.200.3.041
N: Teacup, 1 of 2
M: CER.GLZ / PNT
S: SM / H84 / D91
K: 00=bowl; 01=handle; 02=foot

C01: 01.EX.UP  / BRK:CRK.HL1R / L14
C02: 02.EX.BOT / BRK:CHP1 / W3
C03: 00.IN / SUR:RES0 / A8
U: DRK~ [C03]; REPAIRED! [C01]
P: HAB.PR / INT.041
E: 200.3
X: SET.219; ACC.041; DOC.217
Z: Ø
```

`C01` establishes a repaired hairline crack; `P` establishes post-Reading acquisition through the House of Abiding. `DOC.217` can be consulted for an earlier possible Pilgrim Quarter connection. Neither `P` nor the paired saucer proves the cup's personal owner.

### B. Thimble — a set, a devotional inference, and a distinct intake

```text
I: H.198.7.113
N: Thimble, hand-fitted brass, 1 of 25
M: MET.BRS / CAST / ETCH
S: XS / H22 / D19
K: 00=shell; 01=rim

C01: 00.EX.CTR / WEAR:POL2 / A62
C02: 01.IN / FORM:DNT1 / N1
C03: 00.IN.TOP / SUR:RES0 / A3
U: NEEDLEWORK~ [C01]; DEVOTION? [NOTE]
P: CULT.DON / INT.113
E: 198.7
X: SET.140; ACC.113; PAT.017; DOC.086
Z: Ø
```

`CULT.DON` identifies the Cult donation channel, not the maker. `1 of 25` refers to a sewing kit. The devotional motif is a **hypothesis** supported by observed etching; it does not make the item divine.

### C. Iron key — nominal use, pre-Reading custody, and a lock record

```text
I: H.207.2.008
N: small key, iron
M: MET.FER / FORG / FILE
S: SM / L94 / W31
K: 00=shaft; 01=bit; 02=bow

C01: 02.EX.CTR / WEAR:POL2 / A51
C02: 00.EX.LOW / SUR:COR1 / A22
C03: 01.EDGE / WEAR:ABR1 / L17
U: NOM
P: HAB.Pre / INT.008
E: 207.2
X: LOC.021; DOC.142
Z: Ø
```

`NOM` is Nominal. `HAB.Pre` is a pre-Reading House of Abiding recovery route. `DOC.142` can establish a distinctive lock profile independently of the item's later recovery site.

---

## 12. Quick decoding exercise (optional handout)

**Record:**

```text
K: 00=body; 01=cuff; 02=thumb seam
C01: 02.JNT / BRK:TRN1R / L24
U: REPAIRED! [C01]
```

**Plain-language reading:** A minor tear, 24 mm long, at component 02's joint (thumb seam), with an evident historical repair. The usage/condition annotation cites that observation as verified evidence of prior repair.

The record does **not** identify who made the repair or who owned the object.
:::

:::secret
Give this notation reference freely. Sections on historical inference and worked examples are legitimate player tools. Do not distribute the later designer status and Act III solution commentary.
:::
