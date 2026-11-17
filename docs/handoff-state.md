# Handoff state · 交接状态

_Last updated: 2026-11-17._

## Where the work lives

- Working copy (cloud work environment): `/home/user/placement-lab02-hpwl`. The Mac paths named in the brief were
  not reachable from this session; the evidence pack was extracted at `/home/user/pack/placement-lab02-claude-pack/`
  and read from there.
- Public repository: <https://github.com/Su3037/placement-lab02-hpwl> (created empty by the owner; this project
  pushed `main`).
- Pages: <https://su3037.github.io/placement-lab02-hpwl/>, deployed by `.github/workflows/pages.yml` (source:
  GitHub Actions).

## Done

Phase 1 (all phases in `docs/implementation-plan.md`), then the owner's style request (2026-11-17): keep the owner's
course house style and standards, add the classmate's code-drawn production method, keep the owner's 科普 film
style, and give some films Chinese and English voiceover. Delivered: house-style page, films and slides; four films
(科普 cut to We Never, 精讲 narrated, 进阶 silent, 实验演示 narrated walkthrough of the real page), each in zh and en;
per-language clocks from measured voice takes (decisions D-19 to D-24). Evidence in `docs/verification.md`:
unit 35/35 + Python 5/5, browser 62/62, media 151/151, clean-clone rebuild OK (PSNR 55.6 dB).

Voice takes were rendered on the owner's Mac (macOS 26.5.2) with the basic Tingting and Samantha voices and pushed
to branch `voice-takes` (commit 38d01a7), then merged into `main`. The music track lives only in the owner's private
folder (`/mnt/project-files/private-music/wenever.m4a`) and is never committed.

## Deployment status

- [x] Pages enabled with source “GitHub Actions”; each push to `main` deploys and the `verify` job runs
  `tests/browser.mjs --base https://su3037.github.io/placement-lab02-hpwl/` against the live site.
- Latest deploy: see the `pages` workflow run for the newest `main` commit.

## Next actions

1. Owner review of the four films, the restyled page and the slides.
2. Optional: install an Enhanced or Premium zh_CN and en_US voice on the Mac, run
   `zsh scripts/voice/render-voice-mac.sh`, then `node scripts/build-films.mjs` and re-render `concise` and `lab`
   (and re-record the walkthrough first, since its timing changes).
3. Submission: `docs/submission-draft.md` is a draft only. Nothing has been posted to Issue #25 and the teacher
   has not been contacted; that waits for the owner's explicit instruction.

## Rules that still apply

No posting to Issue #25 or messaging the teacher without explicit instruction; no force-push; no changes to other
repositories; teacher files are not redistributed (only the transcribed numeric example).

## Notes

- The cloud work environment cannot reach `*.github.io` (egress proxy refuses it), so the deployment check runs in
  GitHub Actions instead: the `verify` job of `pages.yml` runs `tests/browser.mjs --base` against the live site
  after each deploy and uploads `deployment-browser-report`.
