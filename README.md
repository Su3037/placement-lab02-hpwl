# Placement Lab 02 · 半周长线长 HPWL

**Live site:** <https://su3037.github.io/placement-lab02-hpwl/> · English: <https://su3037.github.io/placement-lab02-hpwl/?lang=en>

A self-contained teaching module for **half-perimeter wirelength (HPWL)**, the course's Placement Lab 02
(module `module01-01-hpwl-metrics` of [yongfu-li/eda-learning](https://github.com/yongfu-li/eda-learning),
issue #25). One JavaScript domain model and one SVG board draw the website lab, every frame of the film and every
slide figure, so what the film shows is exactly what the lab computes.

一个关于 **半周长线长（HPWL）** 的完整教学模块：同一套 JS 领域模型和同一个 SVG 棋盘同时绘制网页实验、影片的每一帧和讲义的每一张图。

## What is in it · 内容

| Part | Where |
|---|---|
| Lesson page (Chinese first, full English edition): outcomes, definitions, worked example, pitfalls, limits | `site/index.html`, text in `site/js/content.js` |
| Film, 5:08, silent, code-drawn, Chinese captions burned in; zh/en WebVTT; chapters; transcript | `site/media/film.zh.mp4`, `site/media/*.vtt`, `media-source/transcript.*.md` |
| 41 s sample (extremum switch + interior move) | `site/media/sample.zh.mp4` |
| Interactive lab: drag / keyboard / touch, free vs fixed-anchor mode, 1×1 footprints, pin scan, undo/redo, export, “Try this frame” from the film | `site/js/lab.js`, `site/js/player.js` |
| 8 graded challenges (any valid layout accepted, two-stage hints, studied vs independent progress) and a 6-question concept quiz | `site/js/grade.js`, `site/js/content.js` |
| Slides: 13 pages, PDF + editable PPTX with notes, zh and en | `site/slides/` |
| Python track: starter with TODOs, independent reference, checker with 19 cases | `exercises/python/`, `site/downloads/hpwl-python.zip` |

Numbers taught: teacher starter **52** (weighted 116), compact free-point reference **14** (weighted 30),
collapsed **0** (illegal: 15 overlaps, moved pads), fixed-anchor bounds **48** (points) and **49** (1×1 footprints).

## Quick start

```sh
npm ci && npx playwright install chromium     # once
npm run serve                                 # http://localhost:8800/placement-lab02-hpwl/
npm test                                      # unit tests (JS + Python)
node tests/browser.mjs                        # browser checks
```

Full build, film rendering and verification steps: [`docs/REPRODUCIBILITY.md`](docs/REPRODUCIBILITY.md).

## Architecture

```
fixtures/hpwl-fixtures.json ─┐
content/script.json ── build-clock ─> clock.json (reading-time clock, VTT, transcripts)
                             ▼
site/js/domain.js   pure HPWL, validation, moves, modes, overlaps
site/js/board.js    Board(view) -> SVG (one drawing path)
site/js/timeline.js stateAt(t) -> {board, panel, caption, metrics}   (random access)
site/js/scene.js    Scene(state) -> 1920×1080 frame      site/js/lab.js   interactive lab
site/render.html    window.renderAt(t)  ── scripts/render.mjs ── FFmpeg ──> film.zh.mp4
site/js/slides.js   slides from the same Board           site/js/grade.js challenge grading
```

## Documentation

- [Reproducibility](docs/REPRODUCIBILITY.md) · [Verification results](docs/verification.md)
- [Implementation plan](docs/implementation-plan.md) · [Decision log](docs/decision-log.md) · [Storyboard](media-source/storyboard.md)
- [Source audit](docs/source-audit.md) · [Reference adaptation](docs/reference-adaptation.md)
- [Handoff state](docs/handoff-state.md) · [Submission draft](docs/submission-draft.md)

## Licence and credits

Code: MIT (`LICENSE`). Lesson content and media: CC BY 4.0 (`LICENSE-CONTENT.md`). Fonts: SIL OFL 1.1.
The small numeric example is transcribed from the course material of yongfu-li/eda-learning and credited, not
relicensed. The render contract idea is adapted from GateUltra/vlsi-course-director (MIT, `NOTICE.md`).
See `THIRD_PARTY_NOTICES.md`.
