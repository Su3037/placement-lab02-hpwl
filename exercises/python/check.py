"""Checker for the HPWL Python track.

  python3 check.py                                   # checks hpwl_starter.py
  python3 check.py --module reference/hpwl_reference.py
  python3 check.py --task 2                           # only one task

Exit code 0 only when every selected case passes. Uses a tolerance of 1e-9 (relative to magnitude),
never display rounding.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TOL = 1e-9


def load(path: Path):
    spec = importlib.util.spec_from_file_location("student_hpwl", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def close(a, b):
    return abs(a - b) <= TOL * max(1.0, abs(a), abs(b))


def fix_nan(positions):
    return {k: {kk: (float("nan") if vv == "nan" else vv) for kk, vv in v.items()} for k, v in positions.items()}


def run_case(mod, case, teacher):
    fn = case["fn"]
    exp = case["expect"]
    try:
        if fn == "hpwl":
            got = mod.hpwl(case["net"], case["positions"])
        elif fn == "bbox":
            got = mod.bbox(case["net"], case["positions"])
        elif fn == "interior":
            got = list(mod.interior_pins(case["net"], case["positions"]))
        elif fn == "total":
            w = teacher["weights"] if case.get("weighted") else None
            got = mod.total_hpwl(teacher["nets"], teacher[case["placement"]], w)
        elif fn == "total_raw":
            got = mod.total_hpwl(case["nets"], fix_nan(case["positions"]))
        else:
            return False, f"unknown case kind {fn}"
    except NotImplementedError:
        return False, "not implemented yet"
    except ValueError as e:
        return (exp == "ValueError"), f"raised ValueError({e})"
    except Exception as e:  # noqa: BLE001 - report any student error
        return False, f"raised {type(e).__name__}: {e}"
    if exp == "ValueError":
        return False, f"returned {got!r}; broken input must raise ValueError"
    if isinstance(exp, dict):
        ok = isinstance(got, dict) and all(k in got and close(float(got[k]), float(v)) for k, v in exp.items())
        return ok, f"got {got!r}"
    if isinstance(exp, list):
        return got == exp, f"got {got!r}"
    ok = isinstance(got, (int, float)) and math.isfinite(got) and close(float(got), float(exp))
    return ok, f"got {got!r}"


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--module", default=str(HERE / "hpwl_starter.py"))
    ap.add_argument("--task", type=int)
    ap.add_argument("--json", action="store_true", help="print a JSON summary")
    args = ap.parse_args(argv)
    data = json.loads((HERE / "fixtures" / "cases.json").read_text(encoding="utf-8"))
    mod = load(Path(args.module))
    results = []
    for case in data["cases"]:
        if args.task and case["task"] != args.task:
            continue
        ok, info = run_case(mod, case, data["teacher"])
        results.append({"task": case["task"], "name": case["name"], "pass": ok, "info": info})
        if not args.json:
            print(f"[{'PASS' if ok else 'FAIL'}] task {case['task']}: {case['name']} - expected {case['expect']!r}; {info}")
    passed = sum(r["pass"] for r in results)
    if args.json:
        print(json.dumps({"passed": passed, "total": len(results), "results": results}, indent=1))
    else:
        print(f"\n{passed}/{len(results)} checks passed")
    return 0 if passed == len(results) and results else 1


if __name__ == "__main__":
    sys.exit(main())
