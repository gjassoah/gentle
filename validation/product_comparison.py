#!/usr/bin/env python3
"""Independent bar-operation values and basis-independent image ranks.

Every kernel-basis pair is tested, so bilinearity extends the value comparison
from the enumerated pairs to all cocycles/cycles in these bounded spaces.
"""
from __future__ import annotations

import argparse
from fractions import Fraction
import json
from pathlib import Path
import re
import subprocess
import time

from validation.oracle.gentle_oracle import GentleAlgebra, OracleCalculus, matrix_rank

ROOT = Path(__file__).resolve().parents[1]
CHARACTERISTICS = (0, 2, 3, 5)
OPERATIONS = ("cup", "insertion", "bracket", "cap")
KINDS = {"co": "cochain", "ho": "chain"}


def target(operation, p, q):
    return ("ho", q - p) if operation == "cap" else ("co", p + q - (operation != "cup"))


def specifications(ranks=False):
    return [dict(case_id=f"{op}-{p}-{q}", operation=op, p=p, q=q)
            for op in OPERATIONS if not (ranks and op == "insertion")
            for p in range(4) for q in range(4)
            if target(op, p, q)[1] <= 3 and (not ranks or target(op, p, q)[1] >= 0)]


def path_record(path):
    return dict(source=path.source, target=path.target, arrows=list(path.arrows))


def path_key(path):
    if (not isinstance(path, dict) or set(path) != {"source", "target", "arrows"}
            or not isinstance(path["source"], str) or not isinstance(path["target"], str)
            or not isinstance(path["arrows"], list) or any(not isinstance(a, str) for a in path["arrows"])):
        raise ValueError("invalid canonical path record")
    return path["source"], path["target"], tuple(path["arrows"])


def encode(calculus, kind, degree, vector):
    algebra = calculus.algebra
    return [dict(input=[path_record(algebra.paths[k]) for k in terms],
                 output=path_record(algebra.paths[output]), coefficient=str(calculus.field.value(c)))
            for (terms, output), c in zip(calculus.space(KINDS[kind], degree), vector, strict=True) if c]


def decode(calculus, kind, degree, terms):
    """Strict sparse response parser; absent coordinates are exactly zero."""
    if not isinstance(terms, list):
        raise ValueError("operation terms must be a list")
    algebra = calculus.algebra
    positions = {(tuple((algebra.paths[k].source, algebra.paths[k].target, algebra.paths[k].arrows) for k in t),
                  (algebra.paths[o].source, algebra.paths[o].target, algebra.paths[o].arrows)): i
                 for i, (t, o) in enumerate(calculus.space(KINDS[kind], degree))}
    out = [calculus.field.value(0) for _ in positions]
    seen = set()
    for term in terms:
        if not isinstance(term, dict) or set(term) != {"input", "output", "coefficient"} or not isinstance(term["input"], list):
            raise ValueError("invalid canonical operation term")
        key = tuple(path_key(p) for p in term["input"]), path_key(term["output"])
        if key not in positions or key in seen:
            raise ValueError("unknown or duplicate canonical operation coordinate")
        seen.add(key)
        coefficient = term["coefficient"]
        if not isinstance(coefficient, str) or not re.fullmatch(r"-?(0|[1-9][0-9]*)(/[1-9][0-9]*)?", coefficient):
            raise ValueError("invalid exact coefficient")
        value = calculus.field.value(Fraction(coefficient))
        if not value or str(value) != coefficient:
            raise ValueError("coefficient is zero or not canonical in the selected field")
        out[positions[key]] = value
    return out


def span_keys(cases):
    return sorted({(c["operation"], *target(c["operation"], c["p"], c["q"])) for c in cases},
                  key=lambda k: (k[0], k[2]))


def validate_results(requests, results):
    if not isinstance(results, list) or len(results) != len(requests):
        raise ValueError("bridge response count does not match request count")
    for i, (request, result) in enumerate(zip(requests, results, strict=True)):
        if not isinstance(result, dict):
            raise ValueError("invalid product bridge response")
        for key, value in (("request_id", f"request-{i}"), ("type", request["type"]), ("characteristic", request["characteristic"])):
            if type(result.get(key)) is not type(value) or result[key] != value:
                raise ValueError(f"bridge {key} mismatch")
        if type(result.get("algebra_dimension")) is not int or result["algebra_dimension"] < 1:
            raise ValueError("invalid algebra dimension")
        rows = result.get("cases")
        if not isinstance(rows, list) or len(rows) != len(request["cases"]):
            raise ValueError("bridge operation case count mismatch")
        calculus = OracleCalculus(GentleAlgebra(request["presentation"]), request["characteristic"])
        for spec, row in zip(request["cases"], rows, strict=True):
            kind, degree = target(spec["operation"], spec["p"], spec["q"])
            if not isinstance(row, dict):
                raise ValueError("invalid operation response row")
            for key, value in {**{k: spec[k] for k in ("case_id", "operation", "p", "q")}, "kind": kind, "degree": degree}.items():
                if type(row.get(key)) is not type(value) or row[key] != value:
                    raise ValueError(f"bridge operation {key} mismatch")
            if request["type"] == "productValues":
                decode(calculus, kind, degree, row.get("terms"))
            else:
                for key in ("left_dimension", "right_dimension", "target_dimension", "rank"):
                    if type(row.get(key)) is not int or row[key] < 0:
                        raise ValueError(f"invalid operation {key}")
                if row["rank"] > min(row["target_dimension"], row["left_dimension"] * row["right_dimension"]):
                    raise ValueError("impossible operation rank")
        if request["type"] == "productRanks":
            expected_keys = span_keys(request["cases"])
            spans = result.get("spans")
            if not isinstance(spans, list) or len(spans) != len(expected_keys):
                raise ValueError("bridge span count mismatch")
            for (op, kind, degree), row in zip(expected_keys, spans, strict=True):
                if (not isinstance(row, dict) or row.get("operation") != op or row.get("kind") != kind
                        or type(row.get("degree")) is not int or row["degree"] != degree
                        or type(row.get("dimension")) is not int or row["dimension"] < 0):
                    raise ValueError("invalid span row")
    return results


def production_results(requests):
    process = subprocess.run(["node", str(ROOT / "validation/production_bridge.mjs")],
                             input=json.dumps({"requests": [{**r, "request_id": f"request-{i}"} for i, r in enumerate(requests)]}),
                             text=True, capture_output=True, cwd=ROOT, check=False)
    if process.returncode:
        raise RuntimeError(f"product bridge failed:\n{process.stderr}")
    response = json.loads(process.stdout)
    if not isinstance(response, dict) or "results" not in response:
        raise ValueError("bridge response must contain results")
    return validate_results(requests, response["results"])


def value_cases(calculus):
    cases, expected = [], []
    for spec in specifications():
        op, p, q = spec["operation"], spec["p"], spec["q"]
        right_kind = "chain" if op == "cap" else "cochain"
        for i, left in enumerate(calculus.group("cochain", p).cycles):
            for j, right in enumerate(calculus.group(right_kind, q).cycles):
                cases.append({**spec, "case_id": f"{spec['case_id']}-{i}-{j}",
                              "left": encode(calculus, "co", p, left),
                              "right": encode(calculus, "ho" if op == "cap" else "co", q, right)})
                expected.append(calculus.operation(op, p, left, q, right))
    return cases, expected


def rank_results(calculus):
    rows, spans = [], {}
    for spec in specifications(ranks=True):
        op, p, q = spec["operation"], spec["p"], spec["q"]
        kind, degree = target(op, p, q)
        left = calculus.group("cochain", p)
        right = calculus.group("chain" if op == "cap" else "cochain", q)
        output = calculus.group(KINDS[kind], degree)
        coordinates = [output.project(calculus.operation(op, p, f, q, g)) for f in left.basis for g in right.basis]
        rows.append({**spec, "kind": kind, "degree": degree, "left_dimension": left.dimension,
                     "right_dimension": right.dimension, "target_dimension": output.dimension,
                     "rank": matrix_rank(coordinates, calculus.field)})
        spans.setdefault((op, kind, degree), []).extend(coordinates)
    return rows, [dict(operation=op, kind=kind, degree=n, dimension=matrix_rank(spans[(op, kind, n)], calculus.field))
                  for op, kind, n in span_keys(specifications(ranks=True))]


def value_failure(case, characteristic, spec, calculus, expected, actual):
    kind, degree = target(spec["operation"], spec["p"], spec["q"])
    return dict(case=case.get("name", "unnamed"), characteristic=characteristic,
                quantity="operation values", operation=spec["operation"], p=spec["p"], q=spec["q"],
                presentation=case, left=spec["left"], right=spec["right"],
                oracle=encode(calculus, kind, degree, expected), production=actual["terms"])


def run(cases=None, characteristics=CHARACTERISTICS):
    started = time.perf_counter()
    if cases is None:
        cases = json.loads((ROOT / "validation/cases.json").read_text())
    requests, jobs = [], []
    for case in cases:
        algebra = GentleAlgebra(case)
        for characteristic in characteristics:
            calculus = OracleCalculus(algebra, characteristic)
            values, expected_values = value_cases(calculus)
            expected_ranks, expected_spans = rank_results(calculus)
            base = dict(presentation=case, characteristic=characteristic)
            requests.extend([{**base, "type": "productValues", "cases": values},
                             {**base, "type": "productRanks", "cases": specifications(ranks=True)}])
            jobs.append((calculus, expected_values, expected_ranks, expected_spans))
    results = validate_results(requests, production_results(requests))
    counts = {op: dict(degree_pairs=sum(s["operation"] == op for s in specifications()),
                      value_pairs=0, coefficient_comparisons=0, rank_comparisons=0, span_comparisons=0) for op in OPERATIONS}
    for j, (calculus, expected_values, expected_ranks, expected_spans) in enumerate(jobs):
        request, rank_request = requests[2*j:2*j+2]
        actual, actual_ranks = results[2*j:2*j+2]
        if actual["algebra_dimension"] != len(calculus.algebra.paths) or actual_ranks["algebra_dimension"] != len(calculus.algebra.paths):
            return {"failures": [dict(quantity="algebra dimension", request=request)]}
        for spec, expected, row in zip(request["cases"], expected_values, actual["cases"], strict=True):
            kind, degree = target(spec["operation"], spec["p"], spec["q"])
            observed = decode(calculus, kind, degree, row["terms"])
            if expected != observed:
                return {"failures": [value_failure(request["presentation"], request["characteristic"], spec, calculus, expected, row)]}
            counts[spec["operation"]]["value_pairs"] += 1
            counts[spec["operation"]]["coefficient_comparisons"] += len(expected)
        for expected, row in zip(expected_ranks, actual_ranks["cases"], strict=True):
            if expected != row:
                return {"failures": [dict(quantity="bilinear map rank", case=request["presentation"], characteristic=request["characteristic"], oracle=expected, production=row)]}
            counts[expected["operation"]]["rank_comparisons"] += 1
        for expected, row in zip(expected_spans, actual_ranks["spans"], strict=True):
            if expected != row:
                return {"failures": [dict(quantity="aggregate image span", case=request["presentation"], characteristic=request["characteristic"], oracle=expected, production=row)]}
            counts[expected["operation"]]["span_comparisons"] += 1
    return dict(suite="independent product oracle", cases=len(cases), characteristics=list(characteristics),
                input_degrees=[0, 3], output_degrees=[0, 3], algebra_field_runs=len(jobs),
                degree_pairs=sum(v["degree_pairs"] for v in counts.values()), operations=counts,
                value_pairs=sum(v["value_pairs"] for v in counts.values()),
                coefficient_comparisons=sum(v["coefficient_comparisons"] for v in counts.values()),
                rank_comparisons=sum(v["rank_comparisons"] for v in counts.values()),
                span_comparisons=sum(v["span_comparisons"] for v in counts.values()),
                failures=[], runtime_seconds=round(time.perf_counter()-started, 3))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    result = run()
    print(json.dumps(result, indent=None if args.json else 2, sort_keys=True))
    return bool(result["failures"])


if __name__ == "__main__":
    raise SystemExit(main())
