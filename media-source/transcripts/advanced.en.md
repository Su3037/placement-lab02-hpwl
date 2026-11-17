# Advanced · The limits of HPWL

Caption transcript of the silent film. Times match site/data/films/advanced.clock.en.json.

## I · Why half

### Advanced: the limits of HPWL `a01` (00:00:00.000)

- The concise film gave the definition. This one asks why, and what if.
- Each section answers one question with an actual computation.

### Why “half perimeter” `a02` (00:00:13.000)

- The box perimeter is 2 × (6 + 5) = 22; half of it is width + height = 11.
- So HPWL is not the perimeter 22, not the all-pairs sum 35, and not the length of a real wire.

## II · Ties and fixed pads

### Tied extremes `a03` (00:00:28.289)

- ABCD's minimum x is reached by both A and C: they are tied extreme pins.
- (Free-point mode) Move A right by 2: C still holds x = 0, ABCD stays 16; AB 8 → 6, AC 8 → 10, total still 52.

### Two placements compared `a04` (00:00:44.244)

- The teacher's compact reference: same nets, total HPWL = 2 + 2 + 2 + 2 + 4 + 2 = 14.
- 52 → 14 is 38 coordinate units less. It compares two placements; it is not an optimization run or a measured routing saving.
- The data marks A and D as fixed pads, yet the compact layout moves them: this is a free-point measurement only.

## III · Weights

### Optional extension: weighted HPWL `a05` (00:01:10.556)

- Optional: give each net a weight, e.g. ABCD weighs 5 and the others 1.
- Weighted sums: starter 116, compact 30. Weights change the objective, not the definition of HPWL.

## IV · Score versus legality

### Stack every point `a06` (00:01:26.178)

- Stack all six points in one place and every box shrinks to a point: HPWL = 0.
- The lowest score, yet not a usable placement: real cells have area and would overlap.
- Give each cell a 1 × 1 footprint: all 15 pairs overlap.

### Fixed-anchor mode `a07` (00:01:47.711)

- Fix A (0, 0) and D (8, 8): ABCD is at least 16, and AB + BD and AC + CD are each at least 16.
- The point-model bound is 48; with non-overlapping 1 × 1 footprints EF ≥ 1, so the bound becomes 49.
- Before comparing HPWL, check that the constraints hold.

## V · Summary

### Summary `a08` (00:02:07.467)

- HPWL = width + height, half the box perimeter; a multi-pin net counts one box.
- Moving an extreme pin changes the box; an interior move keeps that net but may change others.
- A lower HPWL alone does not prove a placement legal or usable. The lab below continues from any frame.
