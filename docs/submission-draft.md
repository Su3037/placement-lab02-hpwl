# Submission draft (not posted)

> Draft for Issue #25 “Placement - Lab 02”. **Not posted.** Post only when the owner says so.

---

**Placement Lab 02: Half-perimeter wirelength (HPWL)**

- Repository: https://github.com/Su3037/placement-lab02-hpwl
- Website: https://su3037.github.io/placement-lab02-hpwl/ (English: https://su3037.github.io/placement-lab02-hpwl/?lang=en)
- Film (5:08, Chinese captions, zh/en subtitles): https://su3037.github.io/placement-lab02-hpwl/media/film.zh.mp4
- Slides: [PDF zh](https://su3037.github.io/placement-lab02-hpwl/slides/hpwl-slides.zh.pdf) ·
  [PDF en](https://su3037.github.io/placement-lab02-hpwl/slides/hpwl-slides.en.pdf) · editable PPTX in the repository
- Python exercises: https://su3037.github.io/placement-lab02-hpwl/downloads/hpwl-python.zip

**What is included**

- A Chinese-first lesson with a full English edition: outcomes, background, illustrated definitions, a worked
  example (teacher starter 52, weighted 116), pseudocode, common mistakes and limitations.
- A code-drawn film. Every frame is rendered from the same JavaScript model and board as the website, via a
  random-access `renderAt(t)` page and FFmpeg. Examples go from two pins to a multi-pin net, an extreme-pin move
  (11 → 13 → 14), an interior move that leaves the selected net unchanged, the six-net teacher example
  (52 → 14 free-point comparison), weights (116 / 30), the HPWL-0 collapse counterexample, and a fixed-pad
  bound (48 for points, 49 with 1×1 footprints).
- An interactive lab (drag, keyboard, touch; free vs fixed-pad mode; pin scan; contribution table; undo) with a
  “Try this frame” button that loads the exact coordinates of the paused film frame.
- Eight graded challenges with hints and progress tracking, a six-question concept check, 13 slides as PDF and
  PPTX, and a Python track (starter, independent reference, checker with 19 cases).
- Reproducibility: `docs/REPRODUCIBILITY.md` lists the commands for the site, data, stills, sample, full film and
  slides. Tests: 32 JS unit tests, 5 Python tests (including a 300-case JS/Python cross-check), 48 browser checks
  and 25 media checks; a clean-clone rebuild reproduces the data byte for byte and re-renders a film range at
  PSNR 54 dB against the committed video.

**Limitations**

- The film is silent (captions only, no narration or music).
- The MP4 is reproducible in the pinned environment; byte-identical video across operating systems or encoder
  versions is not promised.
- The 52 → 14 compact reference moves the fixed pads, so it is presented as a free-point comparison; the
  fixed-pad target uses an original 49 layout.
- No in-browser Python; the Python exercises are a download.
- The course folder's licence file was missing at the inspected commit, so teacher files are not redistributed;
  only the small numeric example is re-typed and credited.

Credits: course material by the instructor (yongfu-li/eda-learning); render-contract idea adapted from
GateUltra/vlsi-course-director (MIT). Details in `docs/source-audit.md` and `docs/reference-adaptation.md`.
