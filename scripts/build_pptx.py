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
# house palette (same as the films): near-black blue-green, ivory, muted sage, gold, teal rule
BG, FG, MUTED, GOLD, TEAL = RGBColor(0x0A, 0x1B, 0x21), RGBColor(0xEE, 0xEA, 0xDD), RGBColor(0x8F, 0xA3, 0xA3), RGBColor(0xDD, 0xBD, 0x78), RGBColor(0x4F, 0x8F, 0x84)
PX = 12700 * 0.6  # 1600 px wide deck mapped to 12192000 EMU (13.333 in)


def px(v):
    return Emu(int(v * 12192000 / 1600))


def build(lang):
    prs = Presentation()
    prs.slide_width, prs.slide_height = px(1600), px(900)
    blank = prs.slide_layouts[6]
    n = len(DECK["slides"])
    font = "Noto Sans SC"
    serif = "Noto Serif SC"
    for i, s in enumerate(DECK["slides"]):
        t = s[lang]
        slide = prs.slides.add_slide(blank)
        bg = slide.background.fill
        bg.solid()
        bg.fore_color.rgb = BG
        rule = slide.shapes.add_shape(1, 0, 0, px(1600), px(5))
        rule.fill.solid(); rule.fill.fore_color.rgb = TEAL; rule.line.fill.background()
        title = slide.shapes.add_textbox(px(76), px(300) if i == 0 else px(46), px(1448), px(110)).text_frame
        title.word_wrap = True
        r = title.paragraphs[0].add_run()
        r.text = t["title"]
        r.font.size, r.font.bold, r.font.name = Pt(36 if i else 54), False, serif
        if i == 0:
            title.paragraphs[0].alignment = 2  # centre
        else:
            bar = slide.shapes.add_shape(1, px(76), px(128), px(74), px(3))
            bar.fill.solid(); bar.fill.fore_color.rgb = GOLD; bar.line.fill.background()
        r.font.color.rgb = GOLD if i == 0 else FG
        fig = ROOT / "build" / "slides" / lang / f"fig-{i + 1:02d}.png"
        has_fig = fig.exists()
        body = slide.shapes.add_textbox(px(76), px(430) if i == 0 else px(178), px(1448) if i == 0 else px(760 if has_fig else 1448), px(400)).text_frame
        body.word_wrap = True
        for j, b in enumerate(t["bullets"]):
            p = body.paragraphs[0] if j == 0 else body.add_paragraph()
            run = p.add_run()
            run.text = ("" if i == 0 else "• ") + b
            if i == 0:
                p.alignment = 2
            run.font.size, run.font.name = Pt(22), font
            run.font.color.rgb = FG if i else MUTED
            p.space_after = Pt(10)
        if has_fig:
            slide.shapes.add_picture(str(fig), px(850), px(178), width=px(680))
        foot = slide.shapes.add_textbox(px(76), px(846), px(1448), px(40)).text_frame
        fr = foot.paragraphs[0].add_run()
        fr.text = f"Placement Lab 02 · {'半周长线长 HPWL' if lang == 'zh' else 'Half-perimeter wirelength'}        p{i + 1}/{n}"
        fr.font.size, fr.font.name = Pt(14), font
        fr.font.color.rgb = MUTED
        slide.notes_slide.notes_text_frame.text = t["notes"]
    out = ROOT / "site" / "slides" / f"hpwl-slides.{lang}.pptx"
    prs.save(out)
    print(out.relative_to(ROOT), n, "slides")


if __name__ == "__main__":
    for lang in ("zh", "en"):
        build(lang)
