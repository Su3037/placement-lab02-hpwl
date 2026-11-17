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

All phases in `docs/implementation-plan.md`. Local evidence in `docs/verification.md`: unit 32/32 + Python 5/5,
browser 48/48, media 25/25, clean-clone rebuild OK (PSNR 54.3 dB on a re-rendered range).

## Deployment status

- [x] `main` pushed (commit 567515b and later)
- [x] Pages enabled with source “GitHub Actions” by the owner; `pages` run 44015443846 deployed
- [x] `node tests/browser.mjs --base https://su3037.github.io/placement-lab02-hpwl/` passes against the deployment (47/47, `verify` job); page also opened in a desktop browser: app ready, lab total 52, film duration 308.03 s

## Next actions

1. Owner review of the site, film and slides.
2. Submission: `docs/submission-draft.md` is a draft only. Nothing has been posted to Issue #25 and the teacher
   has not been contacted; that waits for the owner's explicit instruction.

## Rules that still apply

No posting to Issue #25 or messaging the teacher without explicit instruction; no force-push; no changes to other
repositories; teacher files are not redistributed (only the transcribed numeric example).

## Notes

- The cloud work environment cannot reach `*.github.io` (egress proxy refuses it), so the deployment check runs in
  GitHub Actions instead: the `verify` job of `pages.yml` runs `tests/browser.mjs --base` against the live site
  after each deploy and uploads `deployment-browser-report`.
