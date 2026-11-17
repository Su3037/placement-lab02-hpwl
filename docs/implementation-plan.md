# Implementation plan · 实施计划

Reconstructed from the handoff prompt (`Claude_Placement_Lab02_HPWL_Reproducible_EN.md` in the evidence pack) and
carried out in this order. Status as of 2026-11-17: all phases done; see `docs/verification.md` for evidence.

| Phase | Work | Output | Status |
|---|---|---|---|
| 0 | Inspect tools and the pack; reproduce 52 / 14 / 116 / 30 independently | `docs/source-audit.md` | done |
| 1 | Peer study: what earlier projects do, what to improve | `docs/reference-adaptation.md` | done |
| 2 | Domain model with validation policy, traces, modes, footprints; hand-computed fixtures | `site/js/domain.js`, `fixtures/`, `tests/domain.test.mjs` | done |
| 3 | Shared board (one `geometry()` for drawing and drag inversion) | `site/js/board.js` | done |
| 4 | Script (17 cues, zh/en) → final silent reading-time clock; `stateAt(t)` random access | `content/script.json`, `scripts/build-clock.mjs`, `site/js/timeline.js`, `tests/timeline.test.mjs` | done |
| 5 | Scene composition and render page contract (`window.ready`, `window.renderAt`) | `site/js/scene.js`, `site/render.html` | done |
| 6 | Renderer (Playwright → JPEG frames → FFmpeg), render record; stills and 41 s sample | `scripts/render.mjs`, `site/media/sample.zh.*` | done |
| 7 | Website: lesson text zh/en, player with caption bar, chapters, transcript, “Try this frame”; lab; challenges; quiz | `site/index.html`, `site/js/{app,player,lab,grade,content}.js` | done |
| 8 | Full film, media checks (decode, PSNR vs `renderAt`, frame-map exactness, captions) | `site/media/film.zh.*`, `scripts/check-media.mjs` | done |
| 9 | Slides from the same Board: PDF, JPG viewer, editable PPTX with notes | `scripts/build-slides.mjs`, `scripts/build_pptx.py`, `site/slides/` | done |
| 10 | Python track: starter, independent reference, checker, 19 cases; JS↔Python crosscheck | `exercises/python/`, `tests/test_python.py` | done |
| 11 | Browser suite (subpath + root, lab, handoff, challenges, phone, reduced motion, determinism, missing resources) | `tests/browser.mjs` | done |
| 12 | Docs, licences, CI and Pages workflows; clean-clone rebuild | `docs/`, `.github/workflows/`, `scripts/clean-rebuild.sh` | done |
| 13 | Publish to `Su3037/placement-lab02-hpwl`, Pages, test the deployment; submission draft (not posted) | `docs/submission-draft.md` | see `docs/handoff-state.md` |

Improvements over the earlier projects studied (details in `docs/reference-adaptation.md`): one JS domain and board
for site, film and slides; random-access `renderAt(t)` with a tested frame map; “Try this frame” that hands over
the interpolated coordinates of the frame on screen; a documented silent reading-time clock instead of invented
speech timing; validation that refuses partial scores; fixed-anchor target (49) that respects the pads.
