# Battle Presentation

## Board hierarchy

The battle board prioritizes authoritative state in this order:

1. Opponent identity, lock state, deck and graveyard counts.
2. Turn, deadline, initiative, orders, planned orders, stake, and latency.
3. Three horizontally related fronts.
4. Opponent cards, front scene and rules, then player cards.
5. Scrollable hand and action controls.
6. Collapsible event drawer and transient battlefield announcements.

Desktop uses three simultaneous lanes. Tablet and mobile preserve lane width and provide horizontal navigation instead of compressing cards into unreadable columns.

## Front presentation

Each enabled front has unique scene art, a dark readability layer, name, summary, live power, control status, capacity, and restrictions. The front detail interaction exposes the complete rule. Ownership uses label, border, and color.

An unrevealed front uses only `hidden.webp`, a generic title, reveal timing, and legal deployment feedback. Its real name, scene, effect, and power are absent from the visible DOM. Reveal presentation removes fog, introduces the scene and name, announces the effect, and remains deterministic in replay.

## Card presentation

Battle cards show portrait, name, cost, current power, base-power difference, generated state, movement, silence, protection, and markers. Hover or long press opens full abilities and modifier sources. Planned cards remain visibly provisional and are not confused with authoritative board cards.

The supported presentation vocabulary includes draw, select, deploy, reveal, power up, power down, cost change, move, swap, copy, generate, return, discard, death, revival, protection, silence, lock, and final effect.

## Resolution sequence

Authoritative events are presented in increasing `sequence` order. State synchronization is never delayed by a failed animation. Repeated numeric changes from one source may merge into one visual cue while retaining the latest authoritative event. Fast and instant modes alter duration only; they do not alter event order.

At match end the client stops input, finishes required events, locks the three fronts, shows final powers and control, presents the outcome, then opens the result route. A generic modal never interrupts final resolution.

## Result information

The result includes outcome and reason, players and decks, stake, duration, all three final fronts, final cards, control, 16 statistics per player, deterministic highlights, three to five turning points when available, and the public event timeline. The documented MVP score is calculated from final power, positive contribution, triggers, movement, controlled-front survival, and death penalty with deterministic tie breakers.

## Privacy boundary

Private hands, deck order, reconnect credentials, room password, and unpublished room state are never included in result exports. Online timeline storage projects each public event to sequence, turn, type, public player/front/card identifiers, and optional magnitude only.
