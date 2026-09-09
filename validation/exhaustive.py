#!/usr/bin/env python3
"""Bounded exhaustive validation for presentations with at most two arrows."""

from __future__ import annotations

import argparse
import json
import sys
import time
from itertools import permutations, product
from pathlib import Path

from validation.differential import production_results, validate_results
from validation.oracle.gentle_oracle import GentleAlgebra, PresentationError


ROOT = Path(__file__).resolve().parent.parent


def canonical_key(presentation: dict) -> tuple:
    """Brute-force a canonical key under vertex and arrow relabelling."""

    vertices = [vertex["id"] for vertex in presentation["vertices"]]
    arrows = presentation["arrows"]
    vertex_at = {vertex: i for i, vertex in enumerate(vertices)}
    arrow_at = {arrow["id"]: i for i, arrow in enumerate(arrows)}
    relations = {(arrow_at[a], arrow_at[b]) for a, b in presentation["relations"]}
    keys = []
    for vertex_images in permutations(range(len(vertices))):
        for new_order in permutations(range(len(arrows))):
            old_to_new = {old: new for new, old in enumerate(new_order)}
            endpoints = tuple(
                (vertex_images[vertex_at[arrows[old]["source"]]], vertex_images[vertex_at[arrows[old]["target"]]])
                for old in new_order
            )
            relabelled_relations = tuple(sorted((old_to_new[a], old_to_new[b]) for a, b in relations))
            keys.append((len(vertices), endpoints, relabelled_relations))
    return min(keys)


def enumerate_presentations(max_vertices: int = 2, max_arrows: int = 2) -> tuple[list[dict], dict]:
    raw = 0
    valid = 0
    canonical: dict[tuple, dict] = {}
    for vertex_count in range(1, max_vertices + 1):
        vertices = [{"id": f"v{i}", "label": str(i)} for i in range(vertex_count)]
        endpoint_types = list(product(range(vertex_count), repeat=2))
        for arrow_count in range(max_arrows + 1):
            for endpoints in product(endpoint_types, repeat=arrow_count):
                arrows = [
                    {"id": f"a{i}", "label": f"a{i}", "source": f"v{source}", "target": f"v{target}"}
                    for i, (source, target) in enumerate(endpoints)
                ]
                composable = [
                    (left, right)
                    for left in range(arrow_count)
                    for right in range(arrow_count)
                    if endpoints[left][1] == endpoints[right][0]
                ]
                for mask in range(1 << len(composable)):
                    raw += 1
                    relations = [[f"a{left}", f"a{right}"] for bit, (left, right) in enumerate(composable) if mask & (1 << bit)]
                    presentation = {"vertices": vertices, "arrows": arrows, "relations": relations}
                    try:
                        GentleAlgebra(presentation)
                    except PresentationError:
                        continue
                    valid += 1
                    canonical.setdefault(canonical_key(presentation), presentation)
    return list(canonical.values()), {"raw_presentations": raw, "valid_presentations": valid, "canonical_presentations": len(canonical)}


def run(level: str = "quick") -> dict:
    started = time.perf_counter()
    characteristics = (0, 2, 3) if level == "quick" else (0, 2, 3, 5, 7)
    max_degree = 3
    presentations, counts = enumerate_presentations()
    requests = [
        {"presentation": presentation, "characteristic": characteristic, "maxDegree": max_degree}
        for presentation in presentations
        for characteristic in characteristics
    ]
    actual_results = validate_results(requests, production_results(requests))
    failures = []
    scalar_comparisons = 0
    for request, actual in zip(requests, actual_results, strict=True):
        algebra = GentleAlgebra(request["presentation"])
        expected = algebra.dimensions(request["characteristic"], max_degree)
        key = canonical_key(request["presentation"])
        scalar_comparisons += 1
        if actual["algebra_dimension"] != expected["algebra_dimension"]:
            failures.append({"canonical_key": key, "characteristic": request["characteristic"], "quantity": "dim(A)", "oracle": expected["algebra_dimension"], "production": actual["algebra_dimension"]})
        for degree, row in enumerate(actual["rows"]):
            for quantity, expected_values in (("hh_homology", expected["hh_homology"]), ("hh_cohomology", expected["hh_cohomology"]), ("cyclic_homology", expected["cyclic_homology"])):
                scalar_comparisons += 1
                if row[quantity] != expected_values[degree]:
                    failures.append({"canonical_key": key, "presentation": request["presentation"], "characteristic": request["characteristic"], "degree": degree, "quantity": quantity, "oracle": expected_values[degree], "production": row[quantity]})
    return {
        "suite": "bounded exhaustive differential",
        "level": level,
        "bounds": {"minimum_vertices": 1, "maximum_vertices": 2, "maximum_arrows": 2, "all_quadratic_relation_subsets": True},
        **counts,
        "deduplication": "vertex and arrow relabelling",
        "characteristics": list(characteristics),
        "degrees": [0, max_degree],
        "algebra_field_runs": len(actual_results),
        "field_degree_pairs": sum(len(result["rows"]) for result in actual_results),
        "scalar_comparisons": scalar_comparisons,
        "failures": failures,
        "runtime_seconds": round(time.perf_counter() - started, 3),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--level", choices=("quick", "extended"), default="quick")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    result = run(args.level)
    print(json.dumps(result, indent=None if args.json else 2, sort_keys=True))
    return 1 if result["failures"] else 0


if __name__ == "__main__":
    sys.exit(main())
