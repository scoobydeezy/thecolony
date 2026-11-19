---
id: rule.faction-goals
slug: faction-goals
name: Faction Goals and Champions
version: 1
status: draft
summary: Goals express ambitions, champions make them eligible, and the established world determines completion.
provenance:
  - { doc: Faction Goals, heading: I. Goal Model }
  - { doc: Faction Goals, heading: III. Direct Play and the App }
---

## Achieve and Maintain

An **Achieve** goal changes something. Its ordinary stages are **Planning → Progressing → Accomplished**. The app stores Planning as Plotting. A successful operation advances one stage at most; ordinary failure leaves the stage unchanged.

With **Auto-Resolve On**, a final success applies the goal's target and Accomplished Effects. With it **Off**, the goal becomes **Ready to Resolve**, a GM task with no automatic timer. Accept resolves it now; Defer leaves its outcome for play. Other goals keep moving. Use Defer where the culmination needs a played scene.

A **Maintain** goal is a defensive assignment, not a progress track. It is active once its Earliest Act arrives, while its champion is capable and in the faction, and the faction controls the non-Destroyed target Asset, or its target Character is alive. Damaged and Contested Assets can still be defended. An active assignment competes to guard only when threatened, under :ref[The Colony Turn]{#rule.colony-turn}.

## Champions and Eligibility

A champion has at most one unfinished assignment, Achieve or Maintain. Dormant, not-yet-eligible, and Ready to Resolve assignments still occupy that commitment. Accomplishment, failure, or retirement frees the champion.

An Achieve goal can move only while its champion is alive, capable, and in the faction, its Earliest Act has arrived, and it is neither complete nor waiting for resolution nor flagged **Target already holds**. Without a capable champion it is **Dormant**.

Capability means being able to pursue or direct the work. Injury or confinement does not automatically prevent leadership through agents; unconsciousness or complete isolation does. Establish capability from what happened, not as a discretionary modifier to the roll.

Do not add eligibility gates for political support, undiscovered routes, unseen preparation, narrative spotlight, or the Party's knowledge. Visibility can be Open, Known, or Secret; it affects knowledge and threatened defenses, not whether the goal can act.

A defector leaves the faction's goals behind without a champion. Reassignment is explicit and manual. An unassigned goal stays Dormant, rather than failing merely because nobody owns it.

## Completion and Retirement

When an Effect changes an Achieve goal's target from false to true, that goal becomes Accomplished whoever caused the change. No roll ratifies an outcome already established in play. Attribution records the cause; it does not automatically grant Momentum or credit.

Accomplishment is permanent history. A later reversal changes the world but does not undo that history. If a target already holds without a qualifying transition, flag it **Target already holds** and keep it out of the draw until edited or retired.

**Retire** an ambition that has become impossible or meaningless. Obsolescence is flagged for the GM, never silently resolved. Goals without machine-readable targets need explicit resolution.

## Effects and World Conditions

A goal may have Effects when it reaches Progressing and when it reaches Accomplished. Only its own advances write those Effects; completion by another source does not retroactively invent milestones or their Effects. Accepted resolution applies its Accomplished Effects.

**World Conditions own what becomes true at the table.** A condition may describe the goal at each stage and contribute Stress. It is not another progress tracker, and a goal's narrative description is not an unrecorded mechanical Effect.

The app holds live statuses, assignments, targets, conditions, and Events. Record injuries, transfers, agreements, departures, and other direct changes there. Do not keep a competing manual goal ledger in the book.

:::design
Reconciled against BOARD-GAME-REVIEW.md §§18.2–18.3, 18.11–18.13. The retired goal World State fields and retired advance Effects that establish conditions are not restored here.
:::
