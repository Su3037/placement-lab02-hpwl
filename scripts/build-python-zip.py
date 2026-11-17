"""Package exercises/python as site/downloads/hpwl-python.zip with fixed timestamps (reproducible bytes)."""
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "exercises" / "python"
OUT = ROOT / "site" / "downloads" / "hpwl-python.zip"
OUT.parent.mkdir(parents=True, exist_ok=True)
files = sorted(p for p in SRC.rglob("*") if p.is_file() and "__pycache__" not in p.parts)
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    for p in files:
        info = zipfile.ZipInfo("python/" + p.relative_to(SRC).as_posix(), date_time=(2026, 11, 17, 0, 0, 0))
        info.external_attr = 0o644 << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(info, p.read_bytes())
print(OUT.relative_to(ROOT), len(files), "files")
