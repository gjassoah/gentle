#!/usr/bin/env python3
"""Actual oracle-operation mutations detected through canonical bridge outputs.

Only the mutated implementation changes. Inputs, the production bridge and the
strict entry-by-entry comparator are exactly those of product_comparison.
"""
from __future__ import annotations

import json
import time

from validation.oracle.gentle_oracle import GentleAlgebra, OracleCalculus
from validation.product_comparison import (ROOT, decode, encode, production_results,
                                           specifications, target, validate_results, value_failure)

MUTATIONS = (
    ("cup_swap", "cup", "A3", "reverse the two evaluated algebra factors"),
    ("insertion_sign", "insertion", "dual numbers", "use (-1)^(qi) in place of (-1)^((q-1)i)"),
    ("bracket_sign", "bracket", "dual numbers", "add instead of subtract the signed reverse insertion"),
    ("cap_sign", "cap", "radical-square-zero 2-cycle", "omit (-1)^(p(n+p))"),
)


def run():
    started = time.perf_counter()
    cases = {case["name"]: case for case in json.loads((ROOT / "validation/cases.json").read_text())}
    requests, witnesses = [], []
    for mutant, operation, name, error in MUTATIONS:
        algebra = GentleAlgebra(cases[name])
        normal, changed = OracleCalculus(algebra), OracleCalculus(algebra, mutant=mutant)
        witness = None
        for spec in specifications():
            if spec["operation"] != operation:
                continue
            p, q = spec["p"], spec["q"]
            right_kind = "chain" if operation == "cap" else "cochain"
            for left in normal.group("cochain", p).cycles:
                for right in normal.group(right_kind, q).cycles:
                    expected = normal.operation(operation, p, left, q, right)
                    mutated = changed.operation(operation, p, left, q, right)
                    if expected != mutated:
                        witness = ({**spec, "left": encode(normal, "co", p, left),
                                    "right": encode(normal, "ho" if operation == "cap" else "co", q, right)}, expected, mutated)
                        break
                if witness:
                    break
            if witness:
                break
        if witness is None:
            raise ValueError(f"no cocycle/cycle witness detects {mutant}")
        spec, expected, mutated = witness
        requests.append(dict(type="productValues", presentation=cases[name], characteristic=0, cases=[spec]))
        witnesses.append((mutant, error, normal, expected, mutated))
    results = validate_results(requests, production_results(requests))
    records = []
    for request, result, (mutant, error, calculus, expected, changed) in zip(requests, results, witnesses, strict=True):
        spec, actual = request["cases"][0], result["cases"][0]
        kind, degree = target(spec["operation"], spec["p"], spec["q"])
        observed = decode(calculus, kind, degree, actual["terms"])
        if observed != expected:
            # Never count a broken baseline as a killed mutant.
            raise ValueError(f"product mutation baseline discrepancy: {value_failure(request['presentation'], 0, spec, calculus, expected, actual)}")
        detected = changed != observed
        records.append(dict(mutant=mutant, category="oracle_operation_mutant", mathematical_error=error,
                            detector="independent canonical operation comparison",
                            status="detected" if detected else "undetected",
                            evidence=dict(case=request["presentation"]["name"], characteristic=0,
                                          presentation=request["presentation"], **spec,
                                          expected=encode(calculus, kind, degree, expected),
                                          mutant=encode(calculus, kind, degree, changed), production=actual["terms"])))
    detected = sum(r["status"] == "detected" for r in records)
    return dict(suite="independent operation mutation comparison", checks=len(records), detected=detected,
                undetected=len(records)-detected, records=records,
                runtime_seconds=round(time.perf_counter()-started, 3))


if __name__ == "__main__":
    result = run()
    print(json.dumps(result, indent=2, sort_keys=True))
    raise SystemExit(bool(result["undetected"]))
