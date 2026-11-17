# Third-party notices

| Component | Where | Licence | Source |
|---|---|---|---|
| Noto Sans SC (subset, Regular/Bold) | `site/fonts/NotoSansSC-*.woff2` | SIL OFL 1.1 (`site/fonts/OFL-NotoSansSC.txt`) | npm `@expo-google-fonts/noto-sans-sc@0.4.4`, SHA-256 in `media-source/fonts.sha256` |
| JetBrains Mono (subset, Regular/Bold) | `site/fonts/JetBrainsMono-*.woff2` | SIL OFL 1.1 (`site/fonts/OFL-JetBrainsMono.txt`) | npm `@expo-google-fonts/jetbrains-mono@0.4.1` |
| Teacher example data (numbers only) | `fixtures/hpwl-fixtures.json` → `teacher` | not relicensed; credited | yongfu-li/eda-learning @ `003bcd4`, `courses/learn_placement/.../tiny_place.json` (see `docs/source-audit.md`) |
| Render-contract idea | `scripts/render.mjs`, `site/render.html` | MIT (see `NOTICE.md`) | GateUltra/vlsi-course-director @ `dca1c25` |
| Playwright (dev only, not shipped) | `package.json` | Apache-2.0 | npm `playwright@1.63.0` |
| FFmpeg / libx264 (build tool, not shipped) | used by `scripts/render.mjs` | LGPL/GPL | system package 6.1.1 |

Subsetting is a modification the OFL allows. The subsets keep their family names (Noto Sans SC, JetBrains Mono);
neither name uses a Reserved Font Name (Noto's licence reserves only “Source”). No music, voice, stock images or characters are used.
