# Popular science · How long is one cable?

Caption transcript of the music-cut film (no narration). Times match site/data/films/story.clock.en.json.

## One cable

### The grid `s01` (00:00:00.000)

- The streets run straight and square. To link these four shops with fibre,
- how much do you need at the very least?

### One box `s02` (00:00:10.750)

- Draw the smallest box: width + height. No route is shorter.

## I · The box

### The same problem on a chip `s03` (00:00:17.410)

- Chip placement asks this question at every step.
- Cells are the shops; a net is a group that must be linked.
- The wires are not drawn yet, but their length is needed now.

### Half-perimeter wirelength `s04` (00:00:32.030)


### Two pins `s05` (00:00:40.600)

- Two pins: four across, three up.
- HPWL = 7: Manhattan distance, not the straight-line 5.

### Four pins, one box `s06` (00:00:49.060)

- Four pins, one box: 11.

## II · Moving pins

### Drag an edge pin `s07` (00:00:53.300)

- Drag Q on the edge and the box grows: 11 → 13.
- Below P's height, the lowest pin changes: 14.

### Drag an inside pin `s08` (00:01:03.150)

- Move S inside the box: N1 stays the same.

### Six nets `s09` (00:01:08.200)

- The teacher's example: six nets, one box each.
- 8, 8, 8, 8, 16, 4.
- Total: 52.

## III · The lowest score

### The score can go lower `s10` (00:01:20.160)

- A compact arrangement: 14.
- Push harder and stack them all on one point: 0.
- Give each cell a 1 × 1 footprint: all 15 pairs overlap.

### The lowest score `s11` (00:01:37.190)

- The lowest score, and the least usable layout.

## IV · An honest bound

### Pin down the pads `s12` (00:01:42.500)

- Fix the pads A and D where they are.
- Require footprints not to overlap, and the honest best is 49.
- Points could reach 48; the extra 1 is the room the squares need.

### Why not lower `s13` (00:01:59.270)

- A and D are 8 + 8 apart: the nets that reach them add up to at least 48.
- That bound is proved, not guessed.

## V · On a chip

### On a real chip `s14` (00:02:14.160)

- A real chip has millions of nets.
- Every step of a placer recomputes all of their boxes.
- So the estimate must be cheap: one pass and you have it.
- It is cheap but incomplete: it ignores congestion and timing.
- It is a lower-bound estimate of wire length, to be used with constraints.
- When a net has 100 pins, can one box still be trusted?

### To the lab `s15` (00:02:50.600)

- Head to the lab and drag the pins yourself.
- Music: We Never (Remix) · Hi Noise / Qiucheng
