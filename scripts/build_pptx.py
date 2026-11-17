"""Editable PPTX from content/slides.json: text boxes for titles/bullets, speaker notes, visible page numbers,
and the figure images rendered by scripts/build-slides.mjs (the same board code as the site and film).

  python3 scripts/build_pptx.py
"""
import json
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.util import Emu, Pt

ROOT = Path(__file__).resolve().parents[1]
DECK = json.loads((ROOT / "content" / "slides.json").read_text(encoding="utf-8"))
BG, FG, MUTED, GOLD = RGBColor(0x0B, 0x10, 0x16), RGBColor(0xE6, 0xED, 0xF5), RGBColor(0x8A, 0xA0, 0xB6), RGBColor(0xFF, 0xD1, 0x66)
PX = 12700 * 0.6  # 1600 px wide deck mapped to 12192000 EMU (13.333 in)


def px(v):
    return Emu(int(v * 12192000 / 1600))


def build(lang):
    prs = Presentation()
    prs.slide_width, prs.slide_height = px(1600), px(900)
    blank = prs.slide_layouts[6]
    n = len(DECK["slides"])
    font = "Noto Sans SC"
    for i, s in enumerate(DECK["slides"]):
        t = s[lang]
        slide = prs.slides.add_slide(blank)
        bg = slide.background.fill
        bg.solid()
        bg.fore_color.rgb = BG
        title = slide.shapes.add_textbox(px(70), px(40), px(1460), px(100)).text_frame
        title.word_wrap = True
        r = title.paragraphs[0].add_run()
        r.text = t["title"]
        r.font.size, r.font.bold, r.font.name = Pt(36 if i else 48), True, font
        r.font.color.rgb = GOLD if i == 0 else FG
        fig = ROOT / "build" / "slides" / lang / f"fig-{i + 1:02d}.png"
        has_fig = fig.exists()
        body = slide.shapes.add_textbox(px(70), px(160), px(760 if has_fig else 1460), px(640)).text_frame
        body.word_wrap = True
        for j, b in enumerate(t["bullets"]):
            p = body.paragraphs[0] if j == 0 else body.add_paragraph()
            run = p.add_run()
            run.text = ("" if i == 0 else "• ") + b
            run.font.size, run.font.name = Pt(22), font
            run.font.color.rgb = FG if i else MUTED
            p.space_after = Pt(10)
        if has_fig:
            slide.shapes.add_picture(str(fig), px(840), px(150), width=px(700))
        foot = slide.shapes.add_textbox(px(70), px(840), px(1460), px(40)).text_frame
        fr = foot.paragraphs[0].add_run()
        fr.text = f"Placement · Lab 02 · HPWL        {i + 1} / {n}"
        fr.font.size, fr.font.name = Pt(14), font
        fr.font.color.rgb = MUTED
        slide.notes_slide.notes_text_frame.text = t["notes"]
    out = ROOT / "site" / "slides" / f"hpwl-slides.{lang}.pptx"
    prs.save(out)
    print(out.relative_to(ROOT), n, "slides")


if __name__ == "__main__":
    for lang in ("zh", "en"):
        build(lang)
