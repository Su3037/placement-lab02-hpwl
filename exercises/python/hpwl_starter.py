"""HPWL Python track — starter. Fill in each TODO, then run:  python3 check.py

Model: point pins. A net is a list of cell ids, positions maps id -> {"x": .., "y": ..}.
HPWL(net) = (max x - min x) + (max y - min y)  -- width + height of the pins' bounding box.
Rules your code must follow (the checker tests them):
  * an empty net, an unknown pin id, a repeated pin or a non-finite coordinate raises ValueError
    (never return a reassuring 0 for broken input)
  * a single-pin net has HPWL 0
  * a multi-pin net is ONE bounding box (do not sum all pin pairs)
  * weights are used only when passed
"""
from __future__ import annotations

import math
from typing import Dict, List, Mapping, Optional, Sequence

Positions = Mapping[str, Mapping[str, float]]


def validate(nets: Sequence[Sequence[str]], positions: Positions) -> None:
    """Task 4: raise ValueError for an empty netlist, empty net, repeated pin, unknown pin or non-finite x/y."""
    # TODO
    raise NotImplementedError


def bbox(net: Sequence[str], positions: Positions) -> Dict[str, float]:
    """Task 1: return {"min_x","max_x","min_y","max_y","width","height"} for one net."""
    # TODO
    raise NotImplementedError


def hpwl(net: Sequence[str], positions: Positions) -> float:
    """Task 1: width + height of bbox(net)."""
    # TODO
    raise NotImplementedError


def total_hpwl(nets: Sequence[Sequence[str]], positions: Positions,
               weights: Optional[Sequence[float]] = None) -> float:
    """Tasks 2 and 3: sum of HPWL over nets; with weights, sum of weight * HPWL. Validate first."""
    # TODO
    raise NotImplementedError


def interior_pins(net: Sequence[str], positions: Positions) -> List[str]:
    """Task 5: pins that attain NONE of min x, max x, min y, max y (a tie counts as attaining)."""
    # TODO
    raise NotImplementedError
