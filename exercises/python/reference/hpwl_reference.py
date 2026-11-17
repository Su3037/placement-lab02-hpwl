"""Independent Python reference for HPWL (written separately from site/js/domain.js).

Point-pin model: a net is a list of cell ids; positions map id -> {"x": float, "y": float}.
Policy (same contract as the website):
  * empty net, unknown pin, duplicate pin, non-finite coordinate -> ValueError (never a silent 0)
  * singleton net -> HPWL 0
  * weights are only used when passed explicitly
"""
from __future__ import annotations

import math
from typing import Dict, List, Mapping, Optional, Sequence

Positions = Mapping[str, Mapping[str, float]]
TOLERANCE = 1e-9


def approx_equal(a: float, b: float, tol: float = TOLERANCE) -> bool:
    return abs(a - b) <= tol * max(1.0, abs(a), abs(b))


def _coords(pin: str, positions: Positions):
    if pin not in positions:
        raise ValueError(f"unknown pin {pin!r}")
    p = positions[pin]
    try:
        x, y = p["x"], p["y"]
    except (KeyError, TypeError):
        raise ValueError(f"pin {pin!r} needs x and y") from None
    for v in (x, y):
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
            raise ValueError(f"pin {pin!r} has a non-finite coordinate")
    return float(x), float(y)


def validate(nets: Sequence[Sequence[str]], positions: Positions) -> None:
    if len(nets) == 0:
        raise ValueError("empty netlist")
    for i, net in enumerate(nets):
        if len(net) == 0:
            raise ValueError(f"net #{i} is empty")
        if len(set(net)) != len(net):
            raise ValueError(f"net #{i} repeats a pin")
        for pin in net:
            _coords(pin, positions)


def bbox(net: Sequence[str], positions: Positions) -> Dict[str, float]:
    if len(net) == 0:
        raise ValueError("empty net")
    if len(set(net)) != len(net):
        raise ValueError("net repeats a pin")
    xs: List[float] = []
    ys: List[float] = []
    for pin in net:
        x, y = _coords(pin, positions)
        xs.append(x)
        ys.append(y)
    lo_x, hi_x, lo_y, hi_y = min(xs), max(xs), min(ys), max(ys)
    return {"min_x": lo_x, "max_x": hi_x, "min_y": lo_y, "max_y": hi_y,
            "width": hi_x - lo_x, "height": hi_y - lo_y}


def hpwl(net: Sequence[str], positions: Positions) -> float:
    b = bbox(net, positions)
    return b["width"] + b["height"]


def total_hpwl(nets: Sequence[Sequence[str]], positions: Positions,
               weights: Optional[Sequence[float]] = None) -> float:
    validate(nets, positions)
    if weights is not None:
        if len(weights) != len(nets):
            raise ValueError("one weight per net is required")
        for w in weights:
            if isinstance(w, bool) or not isinstance(w, (int, float)) or not math.isfinite(w) or w < 0:
                raise ValueError("weights must be finite and >= 0")
    total = 0.0
    for i, net in enumerate(nets):
        total += (1.0 if weights is None else float(weights[i])) * hpwl(net, positions)
    return total


def interior_pins(net: Sequence[str], positions: Positions) -> List[str]:
    """Pins that attain none of the four extremes (min/max x, min/max y). Ties count as extreme."""
    b = bbox(net, positions)
    out = []
    for pin in net:
        x, y = _coords(pin, positions)
        if x not in (b["min_x"], b["max_x"]) and y not in (b["min_y"], b["max_y"]):
            out.append(pin)
    return out
