# Source audit · 来源审计

## Assignment

- Issue: <https://github.com/yongfu-li/eda-learning/issues/25> — “Placement - Lab 02”, assignee Su3037, opened
  2026-11-10, no body and no comments at inspection (snapshot `issue-25.json`, `issue-25-comments.json` in the pack).
- Topic established by the pack's cross-check of `courses/learn_placement/docs/MODULES.md`, the module README and
  the platform lab page: **Half-perimeter wirelength (HPWL)**, module `module01-01-hpwl-metrics`, lab `hpwl-metrics`.
  The module id's “01-01” is a stable id, not the course display order “Lab 02”.

## Teacher material (pinned commit `003bcd49e3794e6cfd2680181cdbd347d673ad07`, 2026-10-20)

| File | Used for | Notes |
|---|---|---|
| `module01-01-hpwl-metrics/README.md`, `EXAMPLES.md`, `CHECKLIST.md` | outcomes, pseudocode, goldens 52 / 14, “collapsed point ≠ usable place” | |
| `transcript.md`, `slides.md`, `outline.yaml`, `assets/STEPS.md` | teaching sequence and pitfalls (fixed pads, clique vs bbox, weights) | Our narration is newly written |
| `quiz.json` | topics for concept checks | Questions are newly written |
| `examples/tiny_place.json`, `common/tiny_place.json` | cells, nets, weights `[1,1,1,1,5,1]`, fixed pads `[A,D]`, starter, golden (“compact”), overlap | Values transcribed into `fixtures/hpwl-fixtures.json` |
| `common/placementutil.py`, `platform/assets/placement-core.js`, `platform/tools/hpwl-metrics/hpwl-metrics.js` | reference behaviour of `hpwl` / `totalHpwl` / `timingWeightedHpwl` and the existing browser challenges | Upstream `hpwl` **skips unknown pin ids** and returns 0 for an empty net; this project raises errors instead (D-03) |
| `docs/MODULES.md`, `SCOPE.md`, `TWO_TRACKS.md` | scope (one algorithm per lab, tiny instance), two tracks | Our Python track = Track A, the site lab = Track B |

Recomputed here (independently of the pack's `verify-hpwl.py`): starter per-net `[8,8,8,8,16,4]` = 52, compact
`[2,2,2,2,4,2]` = 14, weighted 116 / 30, collapsed 0, overlap layout 24 (weighted 48). The compact reference changes
both fixed pads A (0,0)→(2,2) and D (8,8)→(4,4).

### Licence discrepancy

`courses/learn_placement/README.md` states CC BY 4.0, but `courses/learn_placement/LICENSE` returned 404 at the
pinned commit (recorded in `source-manifest.json`) and the repository has no top-level licence in its metadata.
This project therefore **does not redistribute teacher files**. It re-types the small numeric example (facts:
coordinates and net lists), credits the source, and writes all explanations, code, figures and media itself. The
README's stated intention is not treated as a verified blanket grant.

## Peer repositories

See `docs/reference-adaptation.md`. Only GateUltra/vlsi-course-director (MIT) and muranfei/eda-floorplanning-topic02
(MIT) carry a licence in the pack index; no code from any peer repository is included verbatim.

## Fonts

Noto Sans SC (Adobe/Google, OFL 1.1) and JetBrains Mono (OFL 1.1), obtained from the npm packages
`@expo-google-fonts/noto-sans-sc@0.4.4` and `@expo-google-fonts/jetbrains-mono@0.4.1` (tarball SHA-256 in
`media-source/fonts.sha256`), subset by `scripts/subset_fonts.py`. Licence texts: `site/fonts/OFL-*.txt`.
