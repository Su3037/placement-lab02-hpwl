#!/bin/sh
# Rebuild from a clean clone of the committed HEAD in a temporary directory and compare with the committed outputs.
set -eu
SRC="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git clone -q "$SRC" "$TMP/repo"
cd "$TMP/repo"
echo "== clean clone at $(git rev-parse --short HEAD) in $TMP/repo"
node scripts/build.mjs
for f in site/data/fixtures.json site/data/films/*.json site/media/*.vtt media-source/transcripts/*.md site/slides/manifest.json site/downloads/hpwl-python.zip; do
  if cmp -s "$f" "$SRC/$f"; then echo "same  $f"; else echo "DIFF  $f"; exit 1; fi
done
npm test >/dev/null && echo "unit tests pass in the clean clone"
node scripts/render.mjs --film advanced --lang zh --range 40 44 --out build/rebuild-range.mp4 >/dev/null
PSNR=$(ffmpeg -i build/rebuild-range.mp4 -i "$SRC/site/media/advanced.zh.mp4" -lavfi "[1:v]trim=start=40:end=44,setpts=PTS-STARTPTS[b];[0:v][b]psnr" -f null - 2>&1 | sed -n 's/.*average:\([0-9.inf]*\).*/\1/p' | tail -1)
echo "re-rendered advanced.zh 40-44 s vs committed film: PSNR $PSNR dB"
case "$PSNR" in inf) ;; *) awk -v p="$PSNR" 'BEGIN{exit !(p>=35)}' || { echo "PSNR too low"; exit 1; } ;; esac
echo "clean rebuild OK"
