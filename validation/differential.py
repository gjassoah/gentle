#!/usr/bin/env python3
"""Curated differential comparison of production JS and the Python oracle."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

from validation.oracle.gentle_oracle import compute


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CHARACTERISTICS = (0, 2, 3, 5)


def validate_results(requests: list[dict], results: list[dict]) -> list[dict]:
    """Reject incomplete or ambiguous bridge batches before any mathematics is compared."""
    if not isinstance(results, list) or len(results) != len(requests):
        raise ValueError("bridge response count does not match request count")
    for index, (request, result) in enumerate(zip(requests, results, strict=True)):
        if not isinstance(result, dict) or result.get("request_id") != f"request-{index}":
            raise ValueError(f"bridge request ID mismatch at response {index}")
        degree = request.get("maxDegree", 3)
        for key, expected in (("characteristic", request["characteristic"]), ("max_degree", degree)):
            if type(result.get(key)) is not int or result[key] != expected:
                raise ValueError(f"bridge {key} mismatch for request {index}")
        if type(result.get("algebra_dimension")) is not int or result["algebra_dimension"] < 1:
            raise ValueError(f"invalid bridge algebra dimension for request {index}")
        rows = result.get("rows")
        if not isinstance(rows, list) or len(rows) != degree + 1:
            raise ValueError(f"bridge degree row count mismatch for request {index}")
        for n, row in enumerate(rows):
            if not isinstance(row, dict) or type(row.get("degree")) is not int or row["degree"] != n:
                raise ValueError(f"bridge degree order mismatch for request {index}")
            for key in ("hh_homology", "hh_cohomology", "cyclic_homology"):
                if type(row.get(key)) is not int or row[key] < 0:
                    raise ValueError(f"invalid bridge {key} for request {index}, degree {n}")
    return results


def production_results(requests: list[dict]) -> list[dict]:
    identified = [{**request, "request_id": f"request-{i}"} for i, request in enumerate(requests)]
    process = subprocess.run(
        ["node", str(ROOT / "validation" / "production_bridge.mjs")],
        input=json.dumps({"requests": identified}),
        text=True,
        capture_output=True,
        cwd=ROOT,
        check=False,
    )
    if process.returncode:
        raise RuntimeError(f"production bridge failed:\n{process.stderr}")
    response = json.loads(process.stdout)
    if not isinstance(response, dict) or "results" not in response:
        raise ValueError("bridge response must contain a results list")
    return validate_results(requests, response["results"])


def run(cases: list[dict], characteristics=DEFAULT_CHARACTERISTICS, max_degree: int = 3) -> dict:
    started = time.perf_counter()
    requests = [
        {"presentation": case, "characteristic": characteristic, "maxDegree": max_degree}
        for case in cases
        for characteristic in characteristics
    ]
    production = validate_results(requests, production_results(requests))
    failures = []
    scalar_comparisons = 0
    for request, actual in zip(requests, production, strict=True):
        expected = compute(request["presentation"], request["characteristic"], max_degree)
        name = request["presentation"].get("name", "unnamed")
        if actual["algebra_dimension"] != expected["algebra_dimension"]:
            failures.append({"case": name, "characteristic": request["characteristic"], "quantity": "dim(A)", "oracle": expected["algebra_dimension"], "production": actual["algebra_dimension"]})
        scalar_comparisons += 1
        for degree, row in enumerate(actual["rows"]):
            for key, expected_values in (("hh_homology", expected["hh_homology"]), ("hh_cohomology", expected["hh_cohomology"]), ("cyclic_homology", expected["cyclic_homology"])):
                scalar_comparisons += 1
                if row[key] != expected_values[degree]:
                    failures.append({"case": name, "characteristic": request["characteristic"], "degree": degree, "quantity": key, "oracle": expected_values[degree], "production": row[key], "presentation": request["presentation"]})
        if not expected["square_zero"]:
            failures.append({"case": name, "characteristic": request["characteristic"], "quantity": "oracle square-zero check"})
    result = {
        "suite": "curated differential",
        "cases": len(cases),
        "characteristics": list(characteristics),
        "degrees": [0, max_degree],
        "algebra_field_runs": len(production),
        "field_degree_pairs": sum(len(result["rows"]) for result in production),
        "scalar_comparisons": scalar_comparisons,
        "failures": failures,
        "runtime_seconds": round(time.perf_counter() - started, 3),
    }
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    cases = json.loads((ROOT / "validation" / "cases.json").read_text(encoding="utf-8"))
    result = run(cases)
    print(json.dumps(result, indent=None if args.json else 2, sort_keys=True))
    return 1 if result["failures"] else 0


if __name__ == "__main__":
    sys.exit(main())
