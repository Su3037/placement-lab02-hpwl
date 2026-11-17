# Verification · 验证记录

Every result below was produced by running the command shown, in the cloud work environment on 2026-11-17
(Node 22.23.4, Playwright 1.63.0 / Chromium build 1243, FFmpeg 6.1.1, Python 3.13.18). Nothing was skipped
unless it says so. Reports: `build/*.json` (not committed; regenerate with the commands).

## Summary

Results for the four-film, house-style version (commit after `5981241`).

| Command | Result |
|---|---|
| `npm test` (node --test) | **35 / 35** pass: domain, grading, timeline (all four films × zh/en: clocks, random access, cue boundaries, goldens, handoff, captions, music-locked title, lab walkthrough, voice clocks final) |
| `npm test` (python unittest) | **5 / 5** pass, including JS↔Python agreement on 300 seeded cases (seed 20261117) |
| `node tests/browser.mjs` (local server, subpath `/placement-lab02-hpwl/` and root) | **62 / 62** pass |
| `node scripts/check-media.mjs` | **151 / 151** pass: for each of the 8 films, codec, frame count = round(clock × 30), duration, full decode, render record and source hashes, clock hash and kind, AAC soundtrack of the right kind and audible, every voice take in the mix, captions and chapters VTT; decoded frames vs fresh `renderAt(t)` (PSNR ≥ 32 dB, 7 frames per film); exact frame map; slide PDFs with page numbers |
| `sh scripts/clean-rebuild.sh` | pass: generated data, clocks, VTT, transcripts, slide manifest and Python zip byte-identical; unit tests pass in the clone; re-rendered advanced.zh 40–44 s vs committed film **PSNR 55.6 dB** (threshold 35) |

Not done / not claimed: byte-identical MP4 across machines; a listening review of every voice clip (durations and
speech rates were checked; the clips are Apple's basic Tingting and Samantha voices because no Enhanced or Premium
voice is installed on the owner's Mac); the story film's soundtrack cannot be rebuilt from the repository alone
(the licensed track is not committed); screen-reader testing with real assistive technology.

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

- PASS subpath load without errors
- PASS all ten numbered sections present in house order
- PASS lesson has background, definitions, worked example and pseudocode
- PASS four film cards in order 科普 → 精讲 → 进阶 → 实验演示
- PASS worked table totals 52 / 116
- PASS lab starts at 52
- PASS net selector selects EF
- PASS keyboard moves B by the snap step
- PASS keyboard focus stays on B after re-render
- PASS displayed total = domain total of the lab state
- PASS mouse drag moves C to (3,5) via the shared geometry
- PASS undo restores C
- PASS touch pointer drag moves E
- PASS fixed-anchor mode blocks moving A
- PASS mode switch keeps coordinates and constraints
- PASS scan log reports pin 2 of 4
- PASS c1 passes with the right numbers
- PASS c1 tracked as independent
- PASS c5 rejects the HPWL-0 collapse
- PASS c5 passes with the compact layout
- PASS c5 tracked as studied answer
- PASS two-stage hints
- PASS quiz gives feedback
- PASS try-this-frame transfers the exact interpolated coordinates
- PASS handoff keeps fixture, net and mode
- PASS lab shows the intermediate-frame notice
- PASS lab recomputes after handoff with the same function (shown to display precision)
- PASS handoff of a fixed-anchor frame carries mode, anchors and footprint flag
- PASS English caption bar follows the frame
- PASS caption bar is empty in the silent tail after a cue
- PASS video duration matches the clock (±1 frame)
- PASS film card switches video and chapters
- PASS film story.zh rendered
- PASS film story.en rendered
- PASS film concise.zh rendered
- PASS film concise.en rendered
- PASS film advanced.zh rendered
- PASS film advanced.en rendered
- PASS film lab.zh rendered
- PASS film lab.en rendered
- PASS refresh with #lab works
- PASS slide viewer shows page 1 with notes
- PASS no page errors after interaction
- PASS English page loads at 390 px
- PASS no horizontal page overflow at 390 px
- PASS body text at least 16 px on phone
- PASS lab board fits the phone width
- PASS English page plays the English version of the film
- PASS root path load without errors
- PASS missing film shows an explicit error
- PASS lab still works without the film
- PASS missing data shows a load error instead of a blank page
- PASS renderAt(12.300) same semantic state in any order
- PASS renderAt(12.300) pixel-identical in any order
- PASS renderAt(53.300) same semantic state in any order
- PASS renderAt(53.300) pixel-identical in any order
- PASS renderAt(63.434) same semantic state in any order
- PASS renderAt(63.434) pixel-identical in any order
- PASS renderAt(80.159) same semantic state in any order
- PASS renderAt(80.159) pixel-identical in any order
- PASS renderAt(32.842) same semantic state in any order
- PASS renderAt(32.842) pixel-identical in any order

## Media checks (`scripts/check-media.mjs`)

- PASS story.zh: h264 1920x1080 yuv420p
- PASS story.zh: frame count 5695 = round(clock duration x fps)
- PASS story.zh: duration matches the clock
- PASS story.zh: full decode without errors
- PASS story.zh: mp4 hash matches render record
- PASS story.zh: rendered from the current sources
- PASS story.zh: rendered from the current clock (music)
- PASS story.zh: AAC stereo soundtrack (music)
- PASS story.zh: soundtrack is audible
- PASS story.zh captions: valid, ordered, inside the film, ids match the clock
- PASS story.zh chapters: valid, ordered, inside the film, ids match the clock
- PASS story.en: h264 1920x1080 yuv420p
- PASS story.en: frame count 5695 = round(clock duration x fps)
- PASS story.en: duration matches the clock
- PASS story.en: full decode without errors
- PASS story.en: mp4 hash matches render record
- PASS story.en: rendered from the current sources
- PASS story.en: rendered from the current clock (music)
- PASS story.en: AAC stereo soundtrack (music)
- PASS story.en: soundtrack is audible
- PASS story.en captions: valid, ordered, inside the film, ids match the clock
- PASS story.en chapters: valid, ordered, inside the film, ids match the clock
- PASS concise.zh: h264 1920x1080 yuv420p
- PASS concise.zh: frame count 5983 = round(clock duration x fps)
- PASS concise.zh: duration matches the clock
- PASS concise.zh: full decode without errors
- PASS concise.zh: mp4 hash matches render record
- PASS concise.zh: rendered from the current sources
- PASS concise.zh: rendered from the current clock (voice)
- PASS concise.zh: AAC stereo soundtrack (voice+score)
- PASS concise.zh: soundtrack is audible
- PASS concise.zh: every caption line has its voice take in the mix
- PASS concise.zh captions: valid, ordered, inside the film, ids match the clock
- PASS concise.zh chapters: valid, ordered, inside the film, ids match the clock
- PASS concise.en: h264 1920x1080 yuv420p
- PASS concise.en: frame count 5113 = round(clock duration x fps)
- PASS concise.en: duration matches the clock
- PASS concise.en: full decode without errors
- PASS concise.en: mp4 hash matches render record
- PASS concise.en: rendered from the current sources
- PASS concise.en: rendered from the current clock (voice)
- PASS concise.en: AAC stereo soundtrack (voice+score)
- PASS concise.en: soundtrack is audible
- PASS concise.en: every caption line has its voice take in the mix
- PASS concise.en captions: valid, ordered, inside the film, ids match the clock
- PASS concise.en chapters: valid, ordered, inside the film, ids match the clock
- PASS advanced.zh: h264 1920x1080 yuv420p
- PASS advanced.zh: frame count 4631 = round(clock duration x fps)
- PASS advanced.zh: duration matches the clock
- PASS advanced.zh: full decode without errors
- PASS advanced.zh: mp4 hash matches render record
- PASS advanced.zh: rendered from the current sources
- PASS advanced.zh: rendered from the current clock (reading)
- PASS advanced.zh: AAC stereo soundtrack (score)
- PASS advanced.zh: soundtrack is audible
- PASS advanced.zh captions: valid, ordered, inside the film, ids match the clock
- PASS advanced.zh chapters: valid, ordered, inside the film, ids match the clock
- PASS advanced.en: h264 1920x1080 yuv420p
- PASS advanced.en: frame count 4631 = round(clock duration x fps)
- PASS advanced.en: duration matches the clock
- PASS advanced.en: full decode without errors
- PASS advanced.en: mp4 hash matches render record
- PASS advanced.en: rendered from the current sources
- PASS advanced.en: rendered from the current clock (reading)
- PASS advanced.en: AAC stereo soundtrack (score)
- PASS advanced.en: soundtrack is audible
- PASS advanced.en captions: valid, ordered, inside the film, ids match the clock
- PASS advanced.en chapters: valid, ordered, inside the film, ids match the clock
- PASS lab.zh: h264 1920x1080 yuv420p
- PASS lab.zh: frame count 2220 = round(clock duration x fps)
- PASS lab.zh: duration matches the clock
- PASS lab.zh: full decode without errors
- PASS lab.zh: mp4 hash matches render record
- PASS lab.zh: rendered from the current sources
- PASS lab.zh: rendered from the current clock (voice)
- PASS lab.zh: AAC stereo soundtrack (voice+score)
- PASS lab.zh: soundtrack is audible
- PASS lab.zh: every caption line has its voice take in the mix
- PASS lab.zh captions: valid, ordered, inside the film, ids match the clock
- PASS lab.zh chapters: valid, ordered, inside the film, ids match the clock
- PASS lab.en: h264 1920x1080 yuv420p
- PASS lab.en: frame count 1868 = round(clock duration x fps)
- PASS lab.en: duration matches the clock
- PASS lab.en: full decode without errors
- PASS lab.en: mp4 hash matches render record
- PASS lab.en: rendered from the current sources
- PASS lab.en: rendered from the current clock (voice)
- PASS lab.en: AAC stereo soundtrack (voice+score)
- PASS lab.en: soundtrack is audible
- PASS lab.en: every caption line has its voice take in the mix
- PASS lab.en captions: valid, ordered, inside the film, ids match the clock
- PASS lab.en chapters: valid, ordered, inside the film, ids match the clock
- PASS story.zh frame 0 (t=0.000) matches renderAt(t) (PSNR 43.5 dB)
- PASS story.zh frame 323 (t=10.767) matches renderAt(t) (PSNR 43.0 dB)
- PASS story.zh frame 522 (t=17.400) matches renderAt(t) (PSNR 41.7 dB)
- PASS story.zh frame 961 (t=32.033) matches renderAt(t) (PSNR 43.4 dB)
- PASS story.zh frame 2107 (t=70.233) matches renderAt(t) (PSNR 42.7 dB)
- PASS story.zh frame 4043 (t=134.767) matches renderAt(t) (PSNR 40.2 dB)
- PASS story.zh frame 5694 (t=189.800) matches renderAt(t) (PSNR 42.3 dB)
- PASS frame map is exact: frame f matches t=f/fps better than t=(f+6)/fps during motion
- PASS story.en frame 0 (t=0.000) matches renderAt(t) (PSNR 43.5 dB)
- PASS story.en frame 323 (t=10.767) matches renderAt(t) (PSNR 43.0 dB)
- PASS story.en frame 522 (t=17.400) matches renderAt(t) (PSNR 41.4 dB)
- PASS story.en frame 961 (t=32.033) matches renderAt(t) (PSNR 43.3 dB)
- PASS story.en frame 2107 (t=70.233) matches renderAt(t) (PSNR 42.6 dB)
- PASS story.en frame 4043 (t=134.767) matches renderAt(t) (PSNR 40.2 dB)
- PASS story.en frame 5694 (t=189.800) matches renderAt(t) (PSNR 42.3 dB)
- PASS concise.zh frame 0 (t=0.000) matches renderAt(t) (PSNR 42.5 dB)
- PASS concise.zh frame 456 (t=15.200) matches renderAt(t) (PSNR 42.7 dB)
- PASS concise.zh frame 993 (t=33.100) matches renderAt(t) (PSNR 42.5 dB)
- PASS concise.zh frame 1729 (t=57.633) matches renderAt(t) (PSNR 43.0 dB)
- PASS concise.zh frame 2213 (t=73.767) matches renderAt(t) (PSNR 41.7 dB)
- PASS concise.zh frame 4247 (t=141.567) matches renderAt(t) (PSNR 41.8 dB)
- PASS concise.zh frame 5982 (t=199.400) matches renderAt(t) (PSNR 42.0 dB)
- PASS concise.en frame 0 (t=0.000) matches renderAt(t) (PSNR 41.8 dB)
- PASS concise.en frame 375 (t=12.500) matches renderAt(t) (PSNR 42.4 dB)
- PASS concise.en frame 850 (t=28.333) matches renderAt(t) (PSNR 42.7 dB)
- PASS concise.en frame 1463 (t=48.767) matches renderAt(t) (PSNR 43.2 dB)
- PASS concise.en frame 1891 (t=63.033) matches renderAt(t) (PSNR 41.9 dB)
- PASS concise.en frame 3630 (t=121.000) matches renderAt(t) (PSNR 41.7 dB)
- PASS concise.en frame 5112 (t=170.400) matches renderAt(t) (PSNR 42.0 dB)
- PASS advanced.zh frame 0 (t=0.000) matches renderAt(t) (PSNR 42.4 dB)
- PASS advanced.zh frame 390 (t=13.000) matches renderAt(t) (PSNR 42.5 dB)
- PASS advanced.zh frame 849 (t=28.300) matches renderAt(t) (PSNR 40.7 dB)
- PASS advanced.zh frame 1327 (t=44.233) matches renderAt(t) (PSNR 41.0 dB)
- PASS advanced.zh frame 1713 (t=57.100) matches renderAt(t) (PSNR 40.8 dB)
- PASS advanced.zh frame 3287 (t=109.567) matches renderAt(t) (PSNR 40.6 dB)
- PASS advanced.zh frame 4630 (t=154.333) matches renderAt(t) (PSNR 42.1 dB)
- PASS advanced.en frame 0 (t=0.000) matches renderAt(t) (PSNR 41.9 dB)
- PASS advanced.en frame 390 (t=13.000) matches renderAt(t) (PSNR 42.6 dB)
- PASS advanced.en frame 849 (t=28.300) matches renderAt(t) (PSNR 40.7 dB)
- PASS advanced.en frame 1327 (t=44.233) matches renderAt(t) (PSNR 40.9 dB)
- PASS advanced.en frame 1713 (t=57.100) matches renderAt(t) (PSNR 40.8 dB)
- PASS advanced.en frame 3287 (t=109.567) matches renderAt(t) (PSNR 40.6 dB)
- PASS advanced.en frame 4630 (t=154.333) matches renderAt(t) (PSNR 41.9 dB)
- PASS lab.zh frame 0 (t=0.000) matches renderAt(t) (PSNR 42.1 dB)
- PASS lab.zh frame 261 (t=8.700) matches renderAt(t) (PSNR 42.2 dB)
- PASS lab.zh frame 496 (t=16.533) matches renderAt(t) (PSNR 42.2 dB)
- PASS lab.zh frame 732 (t=24.400) matches renderAt(t) (PSNR 42.1 dB)
- PASS lab.zh frame 821 (t=27.367) matches renderAt(t) (PSNR 41.8 dB)
- PASS lab.zh frame 1575 (t=52.500) matches renderAt(t) (PSNR 41.9 dB)
- PASS lab.zh frame 2219 (t=73.967) matches renderAt(t) (PSNR 41.6 dB)
- PASS lab.en frame 0 (t=0.000) matches renderAt(t) (PSNR 42.1 dB)
- PASS lab.en frame 236 (t=7.867) matches renderAt(t) (PSNR 42.2 dB)
- PASS lab.en frame 428 (t=14.267) matches renderAt(t) (PSNR 41.9 dB)
- PASS lab.en frame 631 (t=21.033) matches renderAt(t) (PSNR 42.0 dB)
- PASS lab.en frame 691 (t=23.033) matches renderAt(t) (PSNR 41.7 dB)
- PASS lab.en frame 1326 (t=44.200) matches renderAt(t) (PSNR 41.7 dB)
- PASS lab.en frame 1867 (t=62.233) matches renderAt(t) (PSNR 41.5 dB)
- PASS slides zh: 13 PDF pages with visible page numbers
- PASS slides en: 13 PDF pages with visible page numbers
