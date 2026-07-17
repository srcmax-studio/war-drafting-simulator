# Rules

## Deck and draw

- A legal deck contains exactly twelve different `cardId` values.
- Initial hand size is three; each turn begins with one draw.
- An empty deck stops drawing and causes no fatigue damage.

## Turns

Standard matches last six turns. On turn N, each player receives N military orders. A plan may deploy multiple cards whose adjusted costs fit the budget. Plans can be replaced or undone until locked. The server locks any remaining legal plan when its deadline expires.

## Fronts and power

Three unique fronts are selected by seeded random. Fronts reveal from left to right during the first three turns. Default capacity is four cards per player per front. Deployment, movement, summoning, copying and return effects all respect effective capacity. Final front power combines card state, ongoing abilities and front modifiers.

## Initiative and result

The first initiative holder is seeded. Later initiative goes to the player controlling more fronts, then higher total power, then remains unchanged. The initiative player reveals first. Two controlled fronts win. If each player controls one and the third ties, total power decides; equal totals draw.

## Banner and withdrawal

Stake starts at 1 and can only be 1, 2, 4 or 8. Each player may raise once; the next turn applies the doubled value. Turn six doubles the active value. Withdrawal loses the currently active stake, never a pending value. All changes are structured events.
