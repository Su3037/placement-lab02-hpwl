"""Mix one film's soundtrack from its clock.  python3 scripts/mix_audio.py <film> <lang> <out.wav>

  story     the author's licensed track (We Never (Remix), Hi Noise / 秋成). It is NOT in the repository:
            set HPWL_MUSIC_WENEVER, or place it at /mnt/project-files/private-music/wenever.m4a or
            build/private/wenever.m4a. 0.6 s fade-in, 3 s fade-out, gain 0.9. The film's cues were cut to it.
  concise,  the measured voice takes (media-source/voice/*.m4a), each placed at the line's voiceAt time from
  lab       site/data/films/<film>.clock.<lang>.json, over the original NumPy score ducked to about -33 dBFS.
  advanced  the original NumPy score only (silent reading film).

The last line printed is JSON describing the mix (sources and their SHA-256), recorded next to the MP4.
"""
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import music  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
SR = music.SR


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def decode(path):
    """Decode any audio file to float stereo at SR with ffmpeg."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype="<f4").reshape(-1, 2).astype(np.float64)


def fit(x, n):
    return x[:n] if len(x) >= n else np.concatenate([x, np.zeros((n - len(x), 2))])


def music_track():
    for p in [os.environ.get("HPWL_MUSIC_WENEVER"), "/mnt/project-files/private-music/wenever.m4a", str(ROOT / "build/private/wenever.m4a")]:
        if p and Path(p).is_file():
            return Path(p)
    raise SystemExit("story needs the licensed music track: set HPWL_MUSIC_WENEVER (see scripts/mix_audio.py)")


def main(film, lang, out):
    clock = json.loads((ROOT / f"site/data/films/{film}.clock.{lang}.json").read_text())
    dur = clock["duration"]
    n = int(round(dur * SR))
    info = {"film": film, "lang": lang, "duration": dur}
    if clock["kind"] == "music":
        src = music_track()
        x = fit(decode(src), n) * 0.9
        fi, fo = int(0.6 * SR), int(3.0 * SR)
        x[:fi] *= np.linspace(0, 1, fi)[:, None]
        x[-fo:] *= np.linspace(1, 0, fo)[:, None]
        meta = json.loads((ROOT / f"content/music/{clock['music']}.json").read_text())
        info.update(audio="music", track=f"{meta['track']} · {meta['artist']}", sourceSha256=sha(src), inRepository=False)
    else:
        cues = [s["start"] for s in clock["segments"]]
        mood = {"concise": "calm", "advanced": "curious", "lab": "steady"}.get(film, "calm")
        bed = music.score(dur, cues, mood=mood, seed=7)
        if clock["kind"] == "voice":
            bed *= 10 ** (-9 / 20)  # duck the score under the narration
            voice = np.zeros((n, 2))
            takes = []
            for seg in clock["segments"]:
                for line in seg["lines"]:
                    if "voice" not in line:
                        raise SystemExit(f"{film}.{lang}: line without a voice take in {seg['id']}")
                    v = decode(ROOT / line["voice"])
                    a = int(round(line["voiceAt"] * SR))
                    m = min(len(v), n - a)
                    voice[a:a + m] += v[:m]
                    takes.append({"file": line["voice"], "at": line["voiceAt"], "sha256": sha(ROOT / line["voice"])})
            peak = np.max(np.abs(voice)) or 1
            voice *= 0.89 / peak  # about -1 dBFS peak
            x = fit(bed, n) + voice
            info.update(audio="voice+score", takes=len(takes), takesSha256=hashlib.sha256(json.dumps(takes).encode()).hexdigest(),
                        voices=clock.get("voices"))
        else:
            x = fit(bed, n)
            info.update(audio="score")
    peak = np.max(np.abs(x))
    if peak > 0.98:
        x *= 0.98 / peak
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    music.write_wav(out, x)
    info["wavSha256"] = sha(out)
    print(json.dumps(info, ensure_ascii=False))


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    main(*sys.argv[1:])
