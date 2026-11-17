# Concise · Half-perimeter wirelength

Narration transcript (matches the voice-over). Times match site/data/films/concise.clock.en.json.

## The problem

### Opening `k01` (00:00:00.000)

- In a few minutes: half-perimeter wirelength, HPWL, from the definition to the code.
- Placement decides where each cell goes, and nets connect the cells.

### Why estimate `k02` (00:00:12.508)

- Real wires are only drawn at routing time, and that is expensive.
- So during placement we use a fast, comparable estimate instead: HPWL.
- The thin dashed lines only show who connects to whom; they are not wires.

## Two pins

### Two pins `k03` (00:00:28.332)

- Start with two pins: P at (1, 1), Q at (5, 4). Four across, three up.
- HPWL = 4 + 3 = 7: the Manhattan distance, not the straight-line 5.
- Chip wires mostly run horizontally and vertically; this L is one of many equal-length paths.

## Multi-pin box

### Multi-pin box `k04` (00:00:48.755)

- A four-pin net, N1: read the pins one by one and keep the smallest and largest x and y.
- P sets the start; Q raises max x and max y; R raises max y again; S is inside and changes nothing.
- Width 7 − 1 = 6, height 6 − 1 = 5, so HPWL = 11.

## Moving a pin

### Move an extreme pin `k05` (00:01:12.010)

- Drag the extreme pin Q to the right: max x goes from 7 to 9, and HPWL from 11 to 13.
- Now pull Q down: once it passes y = 1, Q becomes the minimum y and HPWL becomes 14.
- Every frame recomputes the numbers from the same coordinates.

### Move an interior pin `k06` (00:01:32.618)

- Now move the interior pin S: while it stays in the green region, N1 stays at 14.
- But S is also on net N2: N2 drops from 4 to 2, and the total from 18 to 16.
- An unchanged net does not mean an unchanged total.

## The teacher's example

### The teacher's example `k07` (00:01:49.023)

- The teacher's example has six cells and six nets; ABCD is one four-pin net with a single box.
- Net by net: AB, CD, AC and BD are 8 each, ABCD is 16, and EF is 4.
- Total = 8 × 4 + 16 + 4 = 52.

## In code

### Pseudocode `k08` (00:02:10.092)

- In code, validate first: unknown pins, empty nets and missing coordinates are errors.
- Then, for each net, take the min and max of x and y, and add width plus height to the total.
- One pass over all pins; the cost grows linearly with the pin count.

### Summary `k09` (00:02:27.681)

- Remember: HPWL is width plus height, half the box perimeter, and a multi-pin net counts one box.
- Moving an extreme pin changes the box; an interior move leaves that net alone but may change others.
- The advanced film covers its limits, such as why an HPWL of zero is not a good placement.
