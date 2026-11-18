---
# yaml-language-server: $schema=../../../schemas/encounter.schema.json
id: encounter.revolutionaries
slug: revolutionaries
name: Revolutionaries
summary: The tunnel reenacts a rescue that ended when the Keeper chose not to leave.
function: "Identity: Choice"
synopsis: The tunnel preserves the rescue operation's signals, roles, urgency, and command to extract a Keeper, but not the remembered choice that ended the operation. Its Wound assigns living entrants historical roles and repeatedly tries to complete the evacuation. Darkwing must reconstruct the fact that Dawn reached the Keeper, the route worked, and the Keeper knowingly refused to leave.
part: part.act-2
chapter: the-manor-routes
order: 8
event: event.the-way-out
leadsTo:
  - to: encounter.the-burden
    thread: thread.the-dusk-of-the-dawn
links:
  - npc.miriel-stoutfoot
  - asset.dawn-charter
variesBy:
  - branch.the-reading
variants:
  - key: succeeds
    when:
      - path.the-reading-succeeds
    summary: The Party reenacts the rescue it chose not to perform.
    synopsis: "Miriel discovers her grandparents' letters and an operational copy of the Dawn Charter; the evidence proves that the historical rescue succeeded at everything except bringing the Keeper out. When the Party reopens the sealed breach into the empty Ritual Chamber, the tunnel's Wound recognizes Miriel, descendant of both the Keeper and the rescue captain, as the person to be extracted. Six remembered rescuers manifest in the historical team's roles, each unmistakably resembling a member of Darkwing but with subtly wrong anatomy, and begin hauling her toward the river. Pulling her back is the same mistake with a different answer: neither end of the tug is victory. When Miriel demands that the contest stop, Darkwing wins only by voluntarily abandoning it; the remembered Captain orders the stand-down and Choice is Restored. The truth surfaces in full: after encountering enough lives in the Book, the Keeper chose to finish the Reading, and Miriel's grandfather ordered his people to respect that choice. The Party learns that honoring a Keeper's choice does not require accepting the system that made the choice necessary."
  - key: stopped
    when:
      - path.the-reading-is-stopped
    summary: The tunnel recognizes Vara and tries to complete the rescue the Party just performed.
    synopsis: "Miriel discovers her grandparents' letters and an operational copy of the Dawn Charter; the evidence proves that the historical rescue succeeded at everything except bringing the Keeper out. When the Party reopens the sealed breach into the Ritual Chamber, the tunnel's Wound recognizes living Vara as the Keeper to be extracted. Six remembered rescuers manifest in the historical team's roles, each unmistakably resembling a member of Darkwing but with subtly wrong anatomy, and begin hauling Vara toward the river. Pulling her back toward the Chamber is the same mistake with a different answer: neither end of the tug is victory. When Vara demands that the contest stop, Darkwing wins only by voluntarily abandoning it; the remembered Captain orders the stand-down and Choice is Restored. The truth surfaces in full: the Keeper chose to stay, and Miriel's grandfather respected her choice. The encounter forces the Party to confront whether stopping Vara's Reading preserved her agency or substituted the Party's choice for hers."
status: draft
provenance:
  - doc: Campaign Outline
    heading: Manor Route 4 — Dawn Assembly
  - doc: Encounters
    heading: 9. Revolutionaries — Dawn Route
---

