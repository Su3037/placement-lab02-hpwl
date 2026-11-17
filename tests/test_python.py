"""Python-side tests: reference vs hand-written goldens, starter/checker behaviour, JS<->Python agreement.

  node scripts/crosscheck-gen.mjs build/crosscheck.json 300 20261117
  python3 -m unittest tests/test_python.py
"""
import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PY = ROOT / "exercises" / "python"
sys.path.insert(0, str(PY / "reference"))
import hpwl_reference as ref  # noqa: E402


class Goldens(unittest.TestCase):
    def test_fixture_goldens(self):
        data = json.loads((ROOT / "fixtures" / "hpwl-fixtures.json").read_text())
        for key, g in data["goldens"].items():
            if not isinstance(g, dict) or "perNet" not in g:
                continue
            fid, pname = key.split(".")
            f = data["fixtures"][fid]
            nets = [n["pins"] for n in f["nets"]]
            pos = f["placements"][pname]
            self.assertEqual([ref.hpwl(n, pos) for n in nets], g["perNet"], key)
            self.assertEqual(ref.total_hpwl(nets, pos), g["total"], key)
            if "weighted" in g:
                self.assertEqual(ref.total_hpwl(nets, pos, [n["weight"] for n in f["nets"]]), g["weighted"], key)


class Checker(unittest.TestCase):
    def run_check(self, module):
        return subprocess.run([sys.executable, "-I", str(PY / "check.py"), "--module", str(module), "--json"],
                              capture_output=True, text=True)

    def test_reference_passes_all(self):
        r = self.run_check(PY / "reference" / "hpwl_reference.py")
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertEqual(json.loads(r.stdout)["passed"], 19)

    def test_starter_fails_until_implemented(self):
        r = self.run_check(PY / "hpwl_starter.py")
        self.assertEqual(r.returncode, 1)
        self.assertEqual(json.loads(r.stdout)["passed"], 0)

    def test_silent_skip_is_caught(self):
        # An implementation that skips unknown pins (like the upstream helper) must fail task 4.
        bad = ROOT / "build" / "bad_skip.py"
        bad.parent.mkdir(exist_ok=True)
        bad.write_text((PY / "reference" / "hpwl_reference.py").read_text().replace(
            'raise ValueError(f"unknown pin {pin!r}")', 'return 0.0, 0.0'))
        r = self.run_check(bad)
        self.assertEqual(r.returncode, 1)
        self.assertIn('"name": "unknown pin raises",\n   "pass": false', r.stdout)


class CrossCheck(unittest.TestCase):
    def test_js_python_agree(self):
        path = ROOT / "build" / "crosscheck.json"
        if not path.exists():
            subprocess.run(["node", str(ROOT / "scripts" / "crosscheck-gen.mjs"), str(path), "300", "20261117"], check=True)
        data = json.loads(path.read_text())
        self.assertEqual(len(data["cases"]), 300)
        for i, c in enumerate(data["cases"]):
            per = [ref.hpwl(n, c["positions"]) for n in c["nets"]]
            for a, b in zip(per, c["perNet"]):
                self.assertTrue(ref.approx_equal(a, b), (i, a, b))
            self.assertTrue(ref.approx_equal(ref.total_hpwl(c["nets"], c["positions"]), c["total"]), i)
            self.assertTrue(ref.approx_equal(ref.total_hpwl(c["nets"], c["positions"], c["weights"]), c["weightedTotal"]), i)


if __name__ == "__main__":
    unittest.main()
