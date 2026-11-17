# Half-perimeter wirelength: an estimate and its limits

Caption transcript of the silent film. Times match site/data/clock.json.

## 00 · Opening

### Half-perimeter wirelength (HPWL) `title` (00:00:00.000)

- Placement decides where each cell sits on the chip.
- Cells are joined by nets. Move a cell and its connections get longer or shorter.

## 01 · Problem and conventions

### Estimate before routing `problem` (00:00:14.000)

- Real wires are only drawn during routing, which is expensive.
- During placement we need a fast, comparable wirelength estimate: HPWL.
- The thin dashed lines only show who connects to whom. They are not wires.

### Coordinate convention `coords` (00:00:32.100)

- Pins are points. Units are abstract grid units; x grows right and y grows up.
- This is a simplification: real cells have area and pins sit at offsets.

## 02 · Two pins

### Two pins on one row `two_h` (00:00:45.100)

- P is at (1, 2), Q at (6, 2). Their bounding box is 5 wide and 0 high.
- HPWL = width + height = 5 + 0 = 5.

### Two pins: Manhattan distance `two_manhattan` (00:00:53.900)

- New positions: P (1, 1), Q (5, 4). Four across, three up.
- HPWL = 4 + 3 = 7. For two pins it is the Manhattan distance, not the straight-line 5.
- Chip wires mostly run horizontally and vertically. The L shape is just one of many equal-length paths.

## 03 · Multi-pin bounding box

### Scan the pins one by one `multi_scan` (00:01:13.500)

- Four-pin net N1 = {P, Q, R, S}. Read the pins one by one and keep the smallest and largest x and y.
- P sets the start; Q raises max x and max y; R raises max y again; S is inside and changes nothing.
- Width = 7 − 1 = 6, height = 6 − 1 = 5, HPWL = 6 + 5 = 11.

### Why “half perimeter” `half_name` (00:01:33.100)

- The box perimeter is 2 × (6 + 5) = 22; half of it is width + height = 11.
- So HPWL is not the perimeter 22, not the all-pairs sum 35, and not the length of a real wire.

## 04 · Moving a pin

### Move an extreme pin `extreme_move` (00:01:47.500)

- Drag the extreme pin Q right: max x goes from 7 to 9, width 6 → 8, HPWL 11 → 13.
- Pull Q down to y = 0: past y = 1 the minimum y switches from P to Q, height 5 → 6, HPWL = 14.
- Every frame recomputes the numbers from the same coordinates, so the picture and the arithmetic stay in step.

### Move an interior pin `interior_move` (00:02:08.433)

- Now move the interior pin S. While it stays inside the other pins' box (green), N1 stays 14.
- But S is also on the two-pin net N2: N2 drops from 4 to 2 and the total from 18 to 16.
- “The selected net did not change” is not “the total did not change”.

## 05 · The teacher's six-cell example

### tiny_place: the starter placement `teacher_starter` (00:02:28.633)

- The teacher's example: six cells A–F and six nets; ABCD is one four-pin net with one bounding box.
- Net by net: AB, CD, AC and BD are 8 each, ABCD is 16, EF is 4.
- Total = 8 × 4 + 16 + 4 = 52.

### Tied extremes `ties` (00:02:48.533)

- ABCD's minimum x is reached by both A and C: they are tied extreme pins.
- (Free-point mode) Move A right by 2: C still holds x = 0, ABCD stays 16; AB 8 → 6, AC 8 → 10, total still 52.

## 06 · Comparing two placements

### Two placements compared `compact` (00:03:03.533)

- The teacher's compact reference: same nets, total HPWL = 2 + 2 + 2 + 2 + 4 + 2 = 14.
- 52 → 14 is 38 coordinate units less. It compares two placements; it is not an optimization run or a measured routing saving.
- The data marks A and D as fixed pads, yet the compact layout moves them: this is a free-point measurement only.

### Optional extension: weighted HPWL `weights` (00:03:28.133)

- Optional: give each net a weight, e.g. ABCD weighs 5 and the others 1.
- Weighted sums: starter 116, compact 30. Weights change the objective, not the definition of HPWL.

## 07 · A low score is not a good placement

### Stack every point `collapse` (00:03:42.833)

- Stack all six points in one place and every box shrinks to a point: HPWL = 0.
- The lowest score, yet not a usable placement: real cells have area and would overlap.
- Give each cell a 1 × 1 footprint: all 15 pairs overlap.

### Fixed-anchor mode `fixed_anchor` (00:04:03.133)

- Fix A (0, 0) and D (8, 8): ABCD is at least 16, and AB + BD and AC + CD are each at least 16.
- The point-model bound is 48; with non-overlapping 1 × 1 footprints EF ≥ 1, so the bound becomes 49.
- Before comparing HPWL, check that the constraints hold.

## 08 · Pseudocode

### Pseudocode `pseudocode` (00:04:21.833)

- First validate: unknown pins, empty nets and non-finite coordinates raise errors instead of a silent 0.
- Then for each net: find min and max x and y, add width plus height to the total.
- One pass over all pins; the cost grows linearly with the number of pins.

## 09 · Summary

### Summary `takeaway` (00:04:42.733)

- HPWL = width + height, half the box perimeter; a multi-pin net counts one box.
- Moving an extreme pin changes the box; an interior move keeps that net but may change others.
- A lower HPWL alone does not prove a placement legal or usable. The lab below continues from any frame.
