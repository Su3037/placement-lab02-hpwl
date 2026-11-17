# Storyboard · 分镜

Four films, each in a Chinese and an English version, 1920×1080, 30 fps. Times come from
`site/data/films/<id>.clock.<lang>.json` (built by `scripts/build-films.mjs`; decisions D-07, D-20 to D-24). Every frame is
`Scene(stateAt(t))`; boards are drawn by the same `Board()` as the lab. Caption text: `content/films/<id>.json`.

## 科普 · 一根光纤有多长 · Popular science · How long is one cable?

music: cut to “We Never (Remix)（若如初见）”, Hi Noise / 秋成; cues start at fixed times in the track. Duration zh 3:09.8, en 3:09.8.

| Ch | Cue | Scene | zh start | en start | Title |
|---|---|---|---|---|---|
| 00 一根光纤 | s01 | city | 0:00.0 | 0:00.0 | 街区 · The grid |
| 00 一根光纤 | s02 | city_box | 0:10.8 | 0:10.8 | 一个盒子 · One box |
| 01 一 · 盒子 | s03 | chip_turn | 0:17.4 | 0:17.4 | 芯片上的同一个问题 · The same problem on a chip |
| 01 一 · 盒子 | s04 | title_story | 0:32.0 | 0:32.0 | 半周长线长 · Half-perimeter wirelength |
| 01 一 · 盒子 | s05 | two_manhattan | 0:40.6 | 0:40.6 | 两个引脚 · Two pins |
| 01 一 · 盒子 | s06 | multi_story | 0:49.1 | 0:49.1 | 四个引脚，一个盒子 · Four pins, one box |
| 02 二 · 拖动 | s07 | extreme_move | 0:53.3 | 0:53.3 | 拖动边上的引脚 · Drag an edge pin |
| 02 二 · 拖动 | s08 | interior_move | 1:03.2 | 1:03.2 | 拖动里面的引脚 · Drag an inside pin |
| 02 二 · 拖动 | s09 | teacher_starter | 1:08.2 | 1:08.2 | 六个线网 · Six nets |
| 03 三 · 最低分 | s10 | compact_collapse | 1:20.2 | 1:20.2 | 分数还能更低 · The score can go lower |
| 03 三 · 最低分 | s11 | collapse_hold | 1:37.2 | 1:37.2 | 最低分 · The lowest score |
| 04 四 · 诚实的下限 | s12 | fixed_anchor | 1:42.5 | 1:42.5 | 钉住焊盘 · Pin down the pads |
| 04 四 · 诚实的下限 | s13 | bound_why | 1:59.3 | 1:59.3 | 为什么到不了更低 · Why not lower |
| 05 五 · 在芯片上 | s14 | chip_wide | 2:14.2 | 2:14.2 | 在真实芯片上 · On a real chip |
| 05 五 · 在芯片上 | s15 | end_story | 2:50.6 | 2:50.6 | 去实验台 · To the lab |

## 精讲 · 半周长线长 HPWL · Concise · Half-perimeter wirelength

voice: narrated; one clock per language from measured voice takes (Tingting / Samantha). Duration zh 3:19.4, en 2:50.4.

| Ch | Cue | Scene | zh start | en start | Title |
|---|---|---|---|---|---|
| 01 问题 | k01 | title | 0:00.0 | 0:00.0 | 开场 · Opening |
| 01 问题 | k02 | problem | 0:15.2 | 0:12.5 | 为什么要估计 · Why estimate |
| 02 两个引脚 | k03 | two_manhattan | 0:33.1 | 0:28.3 | 两个引脚 · Two pins |
| 03 多引脚包围盒 | k04 | multi_scan | 0:57.6 | 0:48.8 | 多引脚包围盒 · Multi-pin box |
| 04 移动引脚 | k05 | extreme_move | 1:24.5 | 1:12.0 | 移动极值引脚 · Move an extreme pin |
| 04 移动引脚 | k06 | interior_move | 1:48.8 | 1:32.6 | 移动内部引脚 · Move an interior pin |
| 05 老师的例子 | k07 | teacher_starter | 2:08.7 | 1:49.0 | 老师的例子 · The teacher's example |
| 06 写成代码 | k08 | pseudocode | 2:31.5 | 2:10.1 | 伪代码 · Pseudocode |
| 06 写成代码 | k09 | takeaway | 2:53.8 | 2:27.7 | 小结 · Summary |

## 进阶 · HPWL 的边界 · Advanced · The limits of HPWL

reading: silent; reading-time clock shared by both languages. Duration zh 2:34.4, en 2:34.4.

| Ch | Cue | Scene | zh start | en start | Title |
|---|---|---|---|---|---|
| 01 一 · 为什么是一半 | a01 | title | 0:00.0 | 0:00.0 | 进阶：HPWL 的边界 · Advanced: the limits of HPWL |
| 01 一 · 为什么是一半 | a02 | half_name | 0:13.0 | 0:13.0 | 为什么叫“半周长” · Why “half perimeter” |
| 02 二 · 并列与固定 | a03 | ties | 0:28.3 | 0:28.3 | 并列的极值 · Tied extremes |
| 02 二 · 并列与固定 | a04 | compact | 0:44.2 | 0:44.2 | 两个布局的比较 · Two placements compared |
| 03 三 · 加权 | a05 | weights | 1:10.6 | 1:10.6 | 可选扩展：加权 HPWL · Optional extension: weighted HPWL |
| 04 四 · 分数与合法 | a06 | collapse | 1:26.2 | 1:26.2 | 把所有点叠在一起 · Stack every point |
| 04 四 · 分数与合法 | a07 | fixed_anchor | 1:47.7 | 1:47.7 | 固定焊盘模式 · Fixed-anchor mode |
| 05 五 · 小结 | a08 | takeaway | 2:07.5 | 2:07.5 | 小结 · Summary |

## 实验演示 · HPWL 实验台 · Lab walkthrough · The HPWL lab

voice: narrated; one clock per language from measured voice takes (Tingting / Samantha). Duration zh 1:14.0, en 1:02.3.

| Ch | Cue | Scene | zh start | en start | Title |
|---|---|---|---|---|---|
| 01 实验台 | w01 | walk | 0:00.0 | 0:00.0 | 打开实验台 · Open the lab |
| 01 实验台 | w02 | walk | 0:08.7 | 0:07.9 | 选择线网 · Pick a net |
| 02 改变布局 | w03 | walk | 0:16.5 | 0:14.3 | 拖动单元 · Drag a cell |
| 02 改变布局 | w04 | walk | 0:24.4 | 0:21.0 | 键盘 · Keyboard |
| 02 改变布局 | w05 | walk | 0:32.7 | 0:28.0 | 逐步扫描 · Step-by-step scan |
| 02 改变布局 | w06 | walk | 0:39.9 | 0:33.8 | 固定焊盘 · Fixed anchors |
| 03 从影片进入 | w07 | walk | 0:48.8 | 0:40.6 | 试试这一帧 · Try this frame |
| 04 挑战与 Python | w08 | walk | 0:56.9 | 0:47.3 | 挑战 · Challenges |
| 04 挑战与 Python | w09 | walk | 1:04.7 | 0:53.5 | Python 练习 · Python practice |
