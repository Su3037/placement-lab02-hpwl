"""Subset the OFL fonts to the glyphs this project uses (deterministic; run after scripts/fetch-fonts.sh).

  python3 scripts/subset_fonts.py

Collects every character from content/, site/ (html/js/json/vtt), exercises/python/README*.md, plus printable
ASCII and a few symbols, then writes site/fonts/*.woff2 and media-source/fonts.json (hashes + glyph count).
"""
import hashlib
import json
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "build" / "fontsrc"
OUT = ROOT / "site" / "fonts"
FONTS = {
    "NotoSansSC-Regular.woff2": SRC / "expo-google-fonts-noto-sans-sc-0.4.4/package/400Regular/NotoSansSC_400Regular.ttf",
    "NotoSansSC-Bold.woff2": SRC / "expo-google-fonts-noto-sans-sc-0.4.4/package/700Bold/NotoSansSC_700Bold.ttf",
    "JetBrainsMono-Regular.woff2": SRC / "expo-google-fonts-jetbrains-mono-0.4.1/package/400Regular/JetBrainsMono_400Regular.ttf",
    "JetBrainsMono-Bold.woff2": SRC / "expo-google-fonts-jetbrains-mono-0.4.1/package/700Bold/JetBrainsMono_700Bold.ttf",
    "NotoSerifSC-Regular.woff2": SRC / "expo-google-fonts-noto-serif-sc-0.4.4/package/400Regular/NotoSerifSC_400Regular.ttf",
    "NotoSerifSC-SemiBold.woff2": SRC / "expo-google-fonts-noto-serif-sc-0.4.4/package/600SemiBold/NotoSerifSC_600SemiBold.ttf",
    "Newsreader-Regular.woff2": SRC / "expo-google-fonts-newsreader-0.4.1/package/400Regular/Newsreader_400Regular.ttf",
    "Newsreader-Italic.woff2": SRC / "expo-google-fonts-newsreader-0.4.1/package/400Regular_Italic/Newsreader_400Regular_Italic.ttf",
    "Newsreader-Medium.woff2": SRC / "expo-google-fonts-newsreader-0.4.1/package/500Medium/Newsreader_500Medium.ttf",
    "NotoSans-Regular.woff2": SRC / "expo-google-fonts-noto-sans-0.4.2/package/400Regular/NotoSans_400Regular.ttf",
    "NotoSans-Italic.woff2": SRC / "expo-google-fonts-noto-sans-0.4.2/package/400Regular_Italic/NotoSans_400Regular_Italic.ttf",
    "NotoSans-SemiBold.woff2": SRC / "expo-google-fonts-noto-sans-0.4.2/package/600SemiBold/NotoSans_600SemiBold.ttf",
}
EXTRA = "".join(chr(c) for c in range(0x20, 0x7F)) + "×÷−–—…·•→←↑↓≤≥≠≈√²³°±✓✗“”‘’（）【】《》，。、；：？！「」『』□■▶▷◀◁⏸↺↻🔒"


def collect():
    chars = set(EXTRA)
    pats = ["content/**/*", "site/**/*.css", "site/**/*.html", "site/**/*.js", "site/data/*.json", "site/media/*.vtt", "exercises/python/README*.md"]
    for pat in pats:
        for p in sorted(ROOT.glob(pat)):
            if p.is_file():
                chars.update(p.read_text(encoding="utf-8", errors="ignore"))
    return "".join(sorted(ch for ch in chars if ch.isprintable()))


def main():
    text = collect()
    OUT.mkdir(parents=True, exist_ok=True)
    record = {"glyphText": len(text), "fonts": {}}
    for name, src in FONTS.items():
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        font = subset.load_font(str(src), opts)
        sub = subset.Subsetter(opts)
        sub.populate(text=text)
        sub.subset(font)
        dest = OUT / name
        subset.save_font(font, str(dest), opts)
        record["fonts"][name] = {"source": str(src.relative_to(ROOT)), "sourceSha256": hashlib.sha256(src.read_bytes()).hexdigest(),
                                 "sha256": hashlib.sha256(dest.read_bytes()).hexdigest(), "bytes": dest.stat().st_size}
    (ROOT / "media-source" / "fonts.json").write_text(json.dumps(record, indent=1, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(record, indent=1))


if __name__ == "__main__":
    main()
