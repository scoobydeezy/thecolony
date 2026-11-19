---
id: event.the-morning-after
slug: the-morning-after
name: The Morning After
summary: The Reading's result reshapes the Colony before its deeper cost is clear.
function: Show Branch Consequence
synopsis: >-
  The Reading decision immediately reorganizes the Colony even before anyone understands its supernatural consequences.
  If Vara survives, political legitimacy collapses around a living Keeper every faction wants to influence. If the
  Reading completes, the system appears vindicated while Darkwing and the records remain shaped around a person no one
  remembers.
part: part.act-2
chapter: opening
order: 1
variesBy:
  - branch.the-reading
variants:
  - key: succeeds
    when:
      - path.the-reading-succeeds
    summary: Vara is gone. The Party is subtly shaped around someone no one remembers.
    synopsis: >-
      The Reading was completed, the eclipse passed, and Vara was forgotten by the Colony and by the Party. The Order
      appears vindicated because the inherited system worked exactly as promised. The Party nevertheless finds
      themselves impacted by an absence: possessions, habits, emotional reactions, records, and unexplained obligations
      point toward someone who no longer exists in conscious memory. The Aspis Administrator experiences his first
      post-Reading accounting discontinuity in real time and realizes that the impossible records from his interrupted
      investigation were not clerical errors.
    leadsTo:
      - to: event.the-manor
        thread: thread.pepe-sylvya
    links:
      - npc.serevan-ilvar
      - npc.julian-arrett
      - npc.uldren-harthwright
  - key: stopped
    when:
      - path.the-reading-is-stopped
    summary: Vara lives. Nothing supernatural happens. Politically, everything changes.
    synopsis: >-
      The Party interrupted the Reading, the eclipse recoiled, and Vara survived. No immediate supernatural disaster
      follows, making the Order look catastrophically wrong and Dawn look vindicated. Every faction now has a reason to
      influence, study, protect, recruit, or control the surviving Keeper. Uldren refuses to return Vara to the House of
      Abiding, where the Order can immediately reclaim her and Dawn can turn her into a public symbol. The Witnesses
      know of an apparently ownerless Manor that may provide temporary refuge.
    leadsTo:
      - to: event.the-manor
        thread: thread.the-manor
    links:
      - npc.vara-cairn
      - npc.uldren-harthwright
      - npc.serevan-ilvar
      - npc.julian-arrett
status: draft
provenance:
  - doc: Campaign Outline
    heading: Session 5 — Dawn / The Morning After
readiness:
  status: compiled
---

## Opening State

Resolve the actual Reading outcome before framing the morning. Preserve whether Vara chose to stop or was overruled.

:::branch{when=path.the-reading-is-stopped}
Vara is alive. Nothing immediately supernatural vindicates the Party. The crisis is political: each institution wants her presence to prove its own answer. Uldren seeks a refuge outside both Order custody and Dawn’s public symbolism. Witness records identify an apparently ownerless Manor.
:::

:::branch{when=path.the-reading-succeeds}
Vara is Forgotten; the players remember what their characters cannot. Ask each player what object, habit, promise or emotional residue survives. Perrik recognizes new discontinuities in accounts he understood yesterday. Her belongings move through ordinary custody: Weighted objects to Witness care, other belongings into passage, accounts closed, property reassigned. The impossible records point toward a maintained Manor without a remembered owner.
:::

## Player Choices

Let the Party attend to the people and consequences it actually left behind. Do not erase a prisoner, injury, broken agreement, or rescued person because the next act has started. Perrik’s records and Uldren’s refuge offer are independent ways to keep the Manor lead available.

## Possible Next Developments

:ref[The Manor]{#event.the-manor} opens the investigations. Neither branch grants an immediate conscious restoration of Vara merely from seeing a familiar object.
