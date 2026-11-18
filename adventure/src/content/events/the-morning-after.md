---
# yaml-language-server: $schema=../../../schemas/event.schema.json
id: event.the-morning-after
slug: the-morning-after
name: The Morning After
summary: The Reading's result reshapes the Colony before its deeper cost is clear.
function: Show Branch Consequence
synopsis: The Reading decision immediately reorganizes the Colony even before anyone understands its supernatural consequences. If Vara survives, political legitimacy collapses around a living Keeper every faction wants to influence. If the Reading completes, the system appears vindicated while Darkwing and the records remain shaped around a person no one remembers.
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
    synopsis: "The Reading was completed, the eclipse passed, and Vara was forgotten by the Colony and by the Party. The Order appears vindicated because the inherited system worked exactly as promised. The Party nevertheless finds themselves impacted by an absence: possessions, habits, emotional reactions, records, and unexplained obligations point toward someone who no longer exists in conscious memory. The Aspis Administrator experiences his first post-Reading accounting discontinuity in real time and realizes that the impossible records from his interrupted investigation were not clerical errors."
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
    synopsis: The Party interrupted the Reading, the eclipse recoiled, and Vara survived. No immediate supernatural disaster follows, making the Order look catastrophically wrong and Dawn look vindicated. Every faction now has a reason to influence, study, protect, recruit, or control the surviving Keeper. Uldren refuses to return Vara to the House of Abiding, where the Order can immediately reclaim her and Dawn can turn her into a public symbol. The Witnesses know of an apparently ownerless Manor that may provide temporary refuge.
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
---

