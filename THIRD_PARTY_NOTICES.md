# Third-party notices

| Component | Where | Licence | Source |
|---|---|---|---|
| Noto Sans SC (subset, Regular/Bold) | `site/fonts/NotoSansSC-*.woff2` | SIL OFL 1.1 (`site/fonts/OFL-NotoSansSC.txt`) | npm `@expo-google-fonts/noto-sans-sc@0.4.4`, SHA-256 in `media-source/fonts.sha256` |
| JetBrains Mono (subset, Regular/Bold) | `site/fonts/JetBrainsMono-*.woff2` | SIL OFL 1.1 (`site/fonts/OFL-JetBrainsMono.txt`) | npm `@expo-google-fonts/jetbrains-mono@0.4.1` |
| Noto Serif SC (subset, Regular/SemiBold) | `site/fonts/NotoSerifSC-*.woff2` | SIL OFL 1.1 (`site/fonts/OFL-NotoSerifSC.txt`) | npm `@expo-google-fonts/noto-serif-sc@0.4.4` |
| Newsreader (subset, Regular/Medium/Italic) | `site/fonts/Newsreader-*.woff2` | SIL OFL 1.1 (`site/fonts/OFL-Newsreader.txt`) | npm `@expo-google-fonts/newsreader@0.4.1` |
| Noto Sans (subset, Regular/SemiBold/Italic) | `site/fonts/NotoSans-*.woff2` | SIL OFL 1.1 (`site/fonts/OFL-NotoSans.txt`) | npm `@expo-google-fonts/noto-sans@0.4.2` |
| Music of the 科普 film: “We Never (Remix)（若如初见）”, Hi Noise / 秋成 | mixed into `site/media/story.{zh,en}.mp4` only; the recording is **not** in the repository | used by the owner, credited in the film's end card and on the page | owner's private copy; onsets for cutting in `content/music/wenever.json` (timings only, no audio) |
| Narration voices: macOS built-in Tingting (zh_CN) and Samantha (en_US) | `media-source/voice/*.m4a`, mixed into `concise` and `lab` films | generated on the owner's Mac with `say` (macOS 26.5.2, recorded in `media-source/voice/system.txt`) | Apple system voices |
| Teacher example data (numbers only) | `fixtures/hpwl-fixtures.json` → `teacher` | not relicensed; credited | yongfu-li/eda-learning @ `003bcd4`, `courses/learn_placement/.../tiny_place.json` (see `docs/source-audit.md`) |
| Render-contract idea | `scripts/render.mjs`, `site/render.html` | MIT (see `NOTICE.md`) | GateUltra/vlsi-course-director @ `dca1c25` |
| Playwright (dev only, not shipped) | `package.json` | Apache-2.0 | npm `playwright@1.63.0` |
| FFmpeg / libx264 (build tool, not shipped) | used by `scripts/render.mjs` | LGPL/GPL | system package 6.1.1 |

Subsetting is a modification the OFL allows. The subsets keep their family names; none uses a Reserved Font Name
(Noto's licence reserves only “Source”). The score of the 精讲, 进阶 and 实验演示 films is original (`scripts/music.py`,
NumPy synthesis, from the owner's course). No stock images or characters are used.
