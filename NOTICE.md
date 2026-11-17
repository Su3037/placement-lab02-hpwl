# Notice

The random-access render contract (`window.ready` + `window.renderAt(t)`, frame `i` at `t = i/fps`, FFmpeg encode,
JSON render record) and the domain / board / timeline / scene / lab layering were adapted from
GateUltra/vlsi-course-director (commit `dca1c25`), which is distributed under this licence:

> MIT License
>
> Copyright (c) 2026 GateUltra and contributors
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
> documentation files (the "Software"), to deal in the Software without restriction, including without limitation
> the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
> to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of
> the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
> THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
> CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
> IN THE SOFTWARE.

The implementation here (`scripts/render.mjs`, `site/render.html`, `site/js/*`) was written for this project in
Node/ES modules; no file from that repository is included verbatim. Details: `docs/reference-adaptation.md`.
