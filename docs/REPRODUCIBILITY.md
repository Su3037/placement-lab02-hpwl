# Reproducibility · 复现

All commands run from the repository root. Paths are project-relative; nothing reads private folders, editor
timelines, secret services or generated audio. The film is **silent** (Chinese captions burned in, VTT for both languages).

## 0. Environment

| Tool | Version used for the committed outputs | Needed for |
|---|---|---|
| Node.js | 22.23.4 | everything in JS (tests, clock, renderer, slides) |
| Playwright (npm) | 1.63.0, pinned in `package.json` / `package-lock.json` | browser tests, frame rendering, slides |
| Chromium | Playwright's build 1243 (`chromium.version()` is recorded in each `*.render.json`) | same |
| FFmpeg / ffprobe | 6.1.1 (Ubuntu 24.04 package) | encoding and media checks |
| Python | 3.13 (3.9+ is enough for the exercises) | Python tests, PPTX, zip, font subsetting |
| python-pptx / pypdf | 1.0.2 / 6.x | PPTX build, PDF check |
| fontTools + brotli | 4.55.0 (only to re-subset fonts) | `scripts/subset_fonts.py` |

Clean setup on a new machine (network step, run once):

```sh
npm ci                                   # installs playwright@1.63.0 from the lockfile
npx playwright install --with-deps chromium
pip install python-pptx==1.0.2 pypdf     # only for slides/PPTX and the PDF check
sudo apt-get install ffmpeg              # or your OS's FFmpeg 6.x
```

Fonts are **committed** as subsets in `site/fonts/` (SIL OFL 1.1, licences beside them; hashes in
`media-source/fonts.json`), so no font download is needed for any build below. Only when lesson text gains new
characters: `sh scripts/fetch-fonts.sh` (network; checks the npm tarball SHA-256 in `media-source/fonts.sha256`)
then `python3 scripts/subset_fonts.py`.

## 1. Static website

The site is plain static files in `site/` (no bundler). Serve it with any static server:

```sh
node scripts/serve.mjs 8800 /placement-lab02-hpwl/   # same subpath as GitHub Pages, with HTTP Range for video
# or: python3 -m http.server -d site 8800            # root path also works (all links are relative)
```

GitHub Pages publishes `site/` unchanged (`.github/workflows/pages.yml`).

## 2. Data, clock, captions, grading

```sh
node scripts/build.mjs --no-slides     # fixtures -> site/data, clock + VTT + transcripts, Python zip
npm test                               # node --test tests/*.test.mjs  +  python3 -m unittest tests/test_python.py
```

- `fixtures/hpwl-fixtures.json` is the single data source (teacher data transcribed + original examples) with
  hand-computed goldens.
- `scripts/build-clock.mjs` turns `content/script.json` into `site/data/clock.json` with the reading-time rule
  printed in that file (decision D-07). The clock records the script's SHA-256.
- `scripts/crosscheck-gen.mjs` (seed 20261117, 300 cases) is run by the Python test to compare JS and Python.

## 3. Stills and the short sample

```sh
node scripts/render.mjs --stills                     # one PNG per cue mid-point -> build/stills/
node scripts/render.mjs --stills 12.3,118.2          # chosen times
node scripts/render.mjs --sample                     # cues extreme_move + interior_move -> site/media/sample.zh.mp4 (41.1 s)
```

## 4. Full film

```sh
node scripts/render.mjs --full                       # -> site/media/film.zh.mp4 + film.zh.render.json (about 6 min wall time, 4 pages)
node scripts/check-media.mjs                         # ffprobe, full decode, VTT, decoded-frame vs renderAt PSNR, source hashes
```

How a frame is made: `site/render.html` loads the fixtures, script and clock, waits for fonts, then exposes
`window.renderAt(t)`. The renderer calls it for `t = frameIndex / 30` (random access, any order, several pages in
parallel), screenshots 1920×1080 JPEG q95, and FFmpeg encodes H.264 (`-crf 20 -preset slow -tune animation`,
yuv420p). `*.render.json` records frame count, fps, clock hash, SHA-256 of every source file, Node/Playwright/
Chromium/FFmpeg versions, wall time and page errors. A browser screen recording is never used.

**What is promised.** In the pinned environment the semantic state for a time is identical in any call order
(`tests/timeline.test.mjs`), and screenshots are pixel-identical in any order (`tests/browser.mjs`). Decoded
MP4 frames match a fresh `renderAt` of the same t (PSNR ≥ 32 dB, `scripts/check-media.mjs`). **Not promised:**
byte-identical MP4 files across operating systems, Chromium builds or encoder versions.

An English-captioned variant can be rendered with `--lang en` (same timeline); it is not committed.

## 5. Slides and exports

```sh
node scripts/build-slides.mjs      # site/slides/hpwl-slides.{zh,en}.pdf, slide JPGs, manifest, PPTX figures
python3 scripts/build_pptx.py      # site/slides/hpwl-slides.{zh,en}.pptx (editable text, notes, page numbers)
python3 scripts/build-python-zip.py
```

## 6. Clean-checkout rebuild

```sh
sh scripts/clean-rebuild.sh        # clones HEAD into a temp dir, rebuilds data/slides, runs tests,
                                   # re-renders a 4 s range and compares it with the committed film
```

## 7. Tests

```sh
npm test                         # unit: domain, grading, timeline + Python reference/checker/crosscheck
node tests/browser.mjs           # 40+ browser checks (subpath + root, lab, handoff, challenges, mobile, determinism)
node tests/browser.mjs --base https://su3037.github.io/placement-lab02-hpwl/   # against the deployment
node scripts/check-media.mjs     # encoded media
```
