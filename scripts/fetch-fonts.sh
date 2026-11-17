#!/bin/sh
# NETWORK STEP (optional): fetch the full OFL fonts used to make the committed subsets in site/fonts/.
# Only needed when lesson text changes and new glyphs must be added. Verifies the npm tarball hashes.
set -eu
cd "$(dirname "$0")/.."
mkdir -p build/fontsrc && cd build/fontsrc
npm pack @expo-google-fonts/noto-sans-sc@0.4.4 @expo-google-fonts/jetbrains-mono@0.4.1 >/dev/null
sha256sum -c ../../media-source/fonts.sha256
for f in expo-google-fonts-noto-sans-sc-0.4.4 expo-google-fonts-jetbrains-mono-0.4.1; do mkdir -p $f && tar xzf $f.tgz -C $f; done
echo "fonts ready in build/fontsrc"
