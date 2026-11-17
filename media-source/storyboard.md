# Storyboard · 分镜

Silent film, 1920×1080, 30 fps, 308.033 s, 17 cues. Times come from `site/data/clock.json` (reading-time clock,
decision D-07). Every frame is `Scene(stateAt(t))`; the board in each frame is drawn by the same `Board()` as the lab.
Caption text: `content/script.json` (zh burned in; zh/en in WebVTT).

| Ch | Cue | Time (s) | Board | Panel | What the viewer should see |
|---|---|---|---|---|---|
| 00 | title | 0–13.2 | teacher starter (title layout) | title | Topic: how long are the wires? |
| 01 | problem | 14.0–31.3 | teacher starter, fly-lines | notes | Placement needs a fast, comparable wirelength estimate |
| 01 | coords | 32.1–44.3 | two_pin_h with axes | notes | Point pins, abstract grid units, y grows upward |
| 02 | two_h | 45.1–53.1 | two_pin_h: P(1,2), Q(6,2) | net | Box 5 wide, 0 high → HPWL 5 |
| 02 | two_manhattan | 53.9–72.7 | two_pin_manhattan, L-path vs straight line | net | 4 + 3 = 7, Manhattan, not Euclidean 5 |
| 03 | multi_scan | 73.5–92.3 | multi N1, pins scanned one by one, partial boxes grow | scan | min/max update per pin; S interior → N1 = 11 |
| 03 | half_name | 93.1–106.7 | N1 box, perimeter 22, clique 35 | names | HPWL 11 is not the perimeter, the clique sum or a real wire |
| 04 | extreme_move | 107.5–127.6 | Q moves right, then down; extremum labels switch | move | 11 → 13 → 14 |
| 04 | interior_move | 128.4–147.8 | S moves inside N1’s box | move | N1 unchanged, N2 4 → 2, total 18 → 16 |
| 05 | teacher_starter | 148.6–167.7 | teacher starter, net boxes | table | [8,8,8,8,16,4] = 52 |
| 05 | ties | 168.5–182.7 | free mode: A moves right by 2 | table | C still holds min x; ABCD 16; AB 8→6, AC 8→10; total 52 |
| 06 | compact | 183.5–207.3 | starter and compact side by side | compare | 52 → 14 compares two placements (pads moved); not an optimisation run |
| 06 | weights | 208.1–222.0 | ABCD (weight 5) highlighted | weights | Weighted 116 / 30 |
| 07 | collapse | 222.8–242.3 | all cells at one point, footprints, stacked badge | collapse | HPWL 0, yet overlapping and pads moved → not usable |
| 07 | fixed_anchor | 243.1–261.0 | A, D locked; B, C, F move to the 49 layout | fixed | Bound 48 for points, 49 with 1×1 footprints |
| 08 | pseudocode | 261.8–281.9 | — | code | Loop over nets: min/max x, y; add width + height; validate input |
| 09 | takeaway | 282.7–305.5 | summary boards | summary | Extreme vs interior moves; HPWL is an estimate, not routed length |

The last cue holds 2.5 s of silence after the last caption (end 308.033 s).
