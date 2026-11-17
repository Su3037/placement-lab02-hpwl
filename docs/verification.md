# Verification · 验证记录

Every result below was produced by running the command shown, in the cloud work environment on 2026-11-17
(Node 22.23.4, Playwright 1.63.0 / Chromium build 1243, FFmpeg 6.1.1, Python 3.13.18). Nothing was skipped
unless it says so. Reports: `build/*.json` (not committed; regenerate with the commands).

## Summary

| Command | Result |
|---|---|
| GitHub Actions `ci` (runs 1–2: unit, data rebuild diff, browser, media) | success on Ubuntu 24.04 |
| `npm test` (node --test) | **32 / 32** pass: domain 17, grading 6, timeline 9 |
| `npm test` (python unittest) | **5 / 5** pass: goldens, reference passes 19/19 cases, starter fails until implemented, silent-skip caught, JS↔Python agree on 300 seeded cases (seed 20261117) |
| `node tests/browser.mjs` (local server, subpath `/placement-lab02-hpwl/` and root) | **48 / 48** pass |
| `node scripts/check-media.mjs` | **25 / 25** pass |
| `sh scripts/clean-rebuild.sh` at commit `03a39a5` | pass: generated data, VTT, slide manifest and Python zip byte-identical to the committed ones; unit tests pass in the clone; re-rendered 116–120 s vs committed film **PSNR 54.3 dB** (threshold 35) |
| Deployment: `node tests/browser.mjs --base https://su3037.github.io/placement-lab02-hpwl/` | **47 / 47** pass on the live site (GitHub Actions `pages` run 44015443846, job `verify`, 2026-11-17; the root-path check runs only locally) |

Not done / not claimed: byte-identical MP4 across machines; audio review (the film is silent, no audio track);
English-captioned MP4 (not rendered; English is shipped as WebVTT and a caption bar); screen-reader testing with
real assistive technology (only ARIA attributes and keyboard paths are tested).

Encoded frames were also inspected by eye (`media-source/frames/`, 10 frames across the film) and the sample was
checked frame by frame around the extremum switch (Q passing y = 1).

## Requirement → file → test crosswalk

Numbers refer to the acceptance list in section 7 of the handoff prompt.

| # | Requirement | Implementation | Test |
|---|---|---|---|
| 1 | Teacher 52 / 14, weighted 116 / 30 | `fixtures/hpwl-fixtures.json`, `site/js/domain.js` | `tests/domain.test.mjs` “teacher goldens”, “every golden placement…”; `tests/test_python.py::test_fixture_goldens`; browser “worked table totals 52 / 116”, “lab starts at 52” |
| 2 | Singleton / empty net, unknown ids, missing / non-finite coordinates, ties, negative coordinates, tolerance | `validate`, `netBox`, `approxEqual` in `domain.js`; decision D-03, D-11 | domain “validation…”, “singleton nets…”, “negative coordinates…”, “ties at extrema…”, “tolerance…”; Python cases in `exercises/python/fixtures/cases.json` |
| 3 | Translation and pin-order invariance; duplicate pins policy | `domain.js` | domain “translation invariance and pin-order invariance (seeded)”, “validation…” (DUPLICATE_PIN) |
| 4 | Extreme move changes the box; strict interior move keeps the selected net | `moveCell`, `netBox` | domain “extreme-pin move…”; timeline “minimum-y pin switches…”, “interior move: N1 is constant…”; grading “c4…” |
| 5 | Fixed pad cannot move in fixed mode; mode change carries coordinates and constraints | `isLocked`, `setMode`, `lab.js` | domain “fixed-anchor mode…”; browser “fixed-anchor mode blocks moving A”, “mode switch keeps coordinates and constraints” |
| 6 | JS / Python numeric agreement on seeded fixtures | `scripts/crosscheck-gen.mjs`, `exercises/python/reference/` | `tests/test_python.py::test_js_python_agree` (300 cases) |
| 7 | Shared board and frame→lab equality (coordinates, mode, net, constraints, metrics) | `board.js`, `timeline.js#labHandoff`, `player.js` | timeline “handoff carries actual interpolated coordinates…”; browser “try-this-frame transfers the exact interpolated coordinates”, “handoff keeps fixture, net and mode”, “handoff of a fixed-anchor frame…”, “lab recomputes after handoff…” |
| 8 | Deterministic, out-of-order `renderAt(t)` including cue boundaries; same-environment pixels | `timeline.js#stateAt`, `site/render.html` | timeline “random access…”, “cue boundaries are half-open…”; browser “renderAt(t) same semantic state / pixel-identical in any order” |
| 9 | Short render / decode smoke test, full video checks, caption bounds, slide numbering, missing-resource errors | `scripts/render.mjs`, `scripts/check-media.mjs` | `check-media.mjs` (table below); timeline “captions…”; browser “missing film shows an explicit error”, “missing data shows a load error…” |
| 10 | Keyboard / touch, phone readability, reduced motion, root + subpath, refresh, clean checkout | `lab.js`, `site.css` | browser “keyboard…”, “touch pointer drag…”, “English page loads at 390 px” (reduced motion, touch), “no horizontal page overflow”, “body text ≥ 16 px”, “root path load…”, “refresh with #lab works”; `scripts/clean-rebuild.sh` |
| — | 6–8 challenges with category, difficulty, two-stage hints, actual-state grading, studied vs independent | `grade.js`, `content.js`, `app.js` | `tests/grade.test.mjs` (multiple valid answers for c4, c5, c6); browser c1, c5, hints, progress |
| — | Fixed-anchor bounds 48 / 49 | film cue `fixed_anchor`, `teacher.placements.fixed49` | domain “fixed-anchor lower bounds 48… 49… by brute force” |

## Browser checks (`tests/browser.mjs`)

| | Check |
|---|---|
| PASS | subpath load without errors |
| PASS | all sections present |
| PASS | worked table totals 52 / 116 |
| PASS | lab starts at 52 |
| PASS | net selector selects EF |
| PASS | keyboard moves B by the snap step |
| PASS | keyboard focus stays on B after re-render |
| PASS | displayed total = domain total of the lab state |
| PASS | mouse drag moves C to (3,5) via the shared geometry |
| PASS | undo restores C |
| PASS | touch pointer drag moves E |
| PASS | fixed-anchor mode blocks moving A |
| PASS | mode switch keeps coordinates and constraints |
| PASS | scan log reports pin 2 of 4 |
| PASS | c1 passes with the right numbers |
| PASS | c1 tracked as independent |
| PASS | c5 rejects the HPWL-0 collapse |
| PASS | c5 passes with the compact layout |
| PASS | c5 tracked as studied answer |
| PASS | two-stage hints |
| PASS | quiz gives feedback |
| PASS | try-this-frame transfers the exact interpolated coordinates |
| PASS | handoff keeps fixture, net and mode |
| PASS | lab shows the intermediate-frame notice |
| PASS | lab recomputes after handoff with the same function |
| PASS | handoff of a fixed-anchor frame carries mode, anchors and footprint flag |
| PASS | English caption bar follows the frame |
| PASS | caption bar is empty in the silent tail after a cue |
| PASS | video duration matches the clock (±1 frame) |
| PASS | refresh with #lab works |
| PASS | slide viewer shows page 1 with notes |
| PASS | no page errors after interaction |
| PASS | English page loads at 390 px |
| PASS | no horizontal page overflow at 390 px |
| PASS | body text at least 16 px on phone |
| PASS | lab board fits the phone width |
| PASS | root path load without errors |
| PASS | missing film shows an explicit error |
| PASS | lab still works without the film |
| PASS | missing data shows a load error instead of a blank page |
| PASS | renderAt(12.300) same semantic state in any order |
| PASS | renderAt(12.300) pixel-identical in any order |
| PASS | renderAt(107.500) same semantic state in any order |
| PASS | renderAt(107.500) pixel-identical in any order |
| PASS | renderAt(114.934) same semantic state in any order |
| PASS | renderAt(114.934) pixel-identical in any order |
| PASS | renderAt(222.832) same semantic state in any order |
| PASS | renderAt(222.832) pixel-identical in any order |

## Media checks (`scripts/check-media.mjs`)

| | Check | Detail |
|---|---|---|
| PASS | film: h264 1920x1080 yuv420p | {"codec_name":"h264","width":1920,"height":1080,"pix_fmt":"yuv420p","r |
| PASS | film: frame count 9241 | 9241 |
| PASS | film: duration matches clock window | 308.033333 |
| PASS | film: full decode without errors |  |
| PASS | film: mp4 hash matches render record |  |
| PASS | film: rendered from the current sources |  |
| PASS | film: clock is the current clock |  |
| PASS | sample: h264 1920x1080 yuv420p | {"codec_name":"h264","width":1920,"height":1080,"pix_fmt":"yuv420p","r |
| PASS | sample: frame count 1234 | 1234 |
| PASS | sample: duration matches clock window | 41.133333 |
| PASS | sample: full decode without errors |  |
| PASS | sample: mp4 hash matches render record |  |
| PASS | sample: rendered from the current sources |  |
| PASS | captions zh: valid, ordered, inside the film |  |
| PASS | captions en: valid, ordered, inside the film |  |
| PASS | film frame 0 (t=0.000) matches renderAt(t) | PSNR 43.4 dB |
| PASS | film frame 3225 (t=107.500) matches renderAt(t) | PSNR 40.0 dB |
| PASS | film frame 3456 (t=115.200) matches renderAt(t) | PSNR 40.2 dB |
| PASS | film frame 3852 (t=128.400) matches renderAt(t) | PSNR 40.3 dB |
| PASS | film frame 6745 (t=224.833) matches renderAt(t) | PSNR 41.5 dB |
| PASS | film frame 7854 (t=261.800) matches renderAt(t) | PSNR 40.1 dB |
| PASS | film frame 9240 (t=308.000) matches renderAt(t) | PSNR 42.8 dB |
| PASS | frame map is exact: frame f matches t=f/fps better than t=(f+6)/fps during motion | same 39.7 dB vs shifted 24.9 dB |
| PASS | slides zh: 13 PDF pages with visible page numbers | 13 pages |
| PASS | slides en: 13 PDF pages with visible page numbers | 13 pages |
