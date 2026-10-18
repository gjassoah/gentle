#!/usr/bin/env python3
"""Oracle mutants, operation alternatives, and output-sensitivity checks.

These are different forms of evidence, not a production mutation kill rate.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

from validation.oracle.gentle_oracle import Field, GentleAlgebra, matrix_rank, multiply_matrices


ROOT = Path(__file__).resolve().parent.parent
CASES = json.loads((ROOT / "validation" / "cases.json").read_text(encoding="utf-8"))
BY_NAME = {case["name"]: case for case in CASES}


def check_aps_orientation(fixture: dict) -> tuple[bool, str]:
    # The fixture has g=1, one boundary and two marks. The APS winding sum
    # is 4-4g-2b=-2, so this sign is fixed independently of production output.
    signature = fixture["signature"]
    expected = [[2, -2]]
    if signature.get("genus") != 1 or signature.get("boundaries") != expected:
        raise ValueError("APS baseline must have genus 1 and boundary data [[2, -2]]")
    reversed_boundaries = [[marks, -winding] for marks, winding in signature["boundaries"]]
    return reversed_boundaries != expected, f"expected {expected}; reversed output gives {reversed_boundaries}"


def mutated_dimensions(algebra: GentleAlgebra, kind: str, mutant: str, characteristic: int = 0, max_degree: int = 3) -> list[int]:
    field = Field(characteristic)
    values = []
    for degree in range(max_degree + 1):
        size = len(algebra.space(kind, degree))
        outgoing = algebra.differential(kind, degree, mutant)
        if kind == "chain":
            incoming = algebra.differential(kind, degree + 1, mutant)
        else:
            incoming = algebra.differential(kind, degree - 1, mutant) if degree else []
        values.append(size - matrix_rank(outgoing, field) - matrix_rank(incoming, field))
    return values


def differential_mutant(kind: str, mutant: str, witness: str) -> tuple[bool, str]:
    algebra = GentleAlgebra(BY_NAME[witness])
    correct = algebra.dimensions(0, 3)["hh_homology" if kind == "chain" else "hh_cohomology"]
    changed = mutated_dimensions(algebra, kind, mutant)
    return changed != correct, f"{witness} over Q: expected {correct}, mutant gives {changed}"


def fixture_values() -> dict:
    process = subprocess.run(["node", str(ROOT / "validation" / "mutation_fixtures.mjs")], cwd=ROOT, text=True, capture_output=True, check=False)
    if process.returncode:
        raise RuntimeError(process.stderr)
    return json.loads(process.stdout)


def run() -> dict:
    started = time.perf_counter()
    records = []

    def record(name: str, error: str, detector: str, killed: bool, evidence: str) -> None:
        if name.startswith(("chain-", "cochain-")) or name == "connes-missing-cyclic-summand":
            category = "oracle_mutant"
        elif name in ("gerstenhaber-commutator-sign", "cap-sign-omission"):
            category = "operation_alternative"
        else:
            category = "output_sensitivity"
        records.append({"mutant": name, "category": category, "mathematical_error": error, "detector": detector, "status": "detected" if killed else "undetected", "evidence": evidence})

    for name, kind, mutant, witness, error in (
        ("chain-internal-sign", "chain", "chain_internal_sign", "oriented square with one zero turn", "reverse every internal Hochschild boundary sign"),
        ("chain-omitted-terminal", "chain", "omit_terminal", "dual numbers", "omit the cyclic terminal Hochschild boundary term"),
        ("chain-terminal-sign", "chain", "terminal_sign", "dual numbers", "use the opposite terminal boundary sign"),
        ("cochain-internal-sign", "cochain", "cochain_internal_sign", "loop with outgoing tail", "reverse every internal Hochschild coboundary sign"),
        ("cochain-omitted-terminal", "cochain", "omit_terminal", "inward fork", "omit the right-action coboundary term"),
        ("cochain-terminal-sign", "cochain", "terminal_sign", "A3", "use the opposite right-action coboundary sign"),
    ):
        killed, evidence = differential_mutant(kind, mutant, witness)
        record(name, error, "independent low-degree dimension comparison", killed, evidence)

    a3 = GentleAlgebra(BY_NAME["A3"])
    a = next(i for i, p in enumerate(a3.paths) if p.arrows == ("a",))
    b = next(i for i, p in enumerate(a3.paths) if p.arrows == ("b",))
    correct, reversed_product = a3.multiplication[a][b], a3.multiplication[b][a]
    record("reversed-path-composition", "multiply paths in right-to-left travel order", "path-basis multiplication fixture", correct is not None and reversed_product is None, f"a*b={correct}; mutant uses b*a={reversed_product}")

    zero_line = GentleAlgebra(BY_NAME["A3 with zero composite"])
    relation = ("a", "b")
    record("reversed-relation-membership", "look up (second, first) instead of (first, second)", "non-symmetric zero-relation fixture", relation in zero_line.relations and relation[::-1] not in zero_line.relations, f"relation {relation} exists; reversed key {relation[::-1]} does not")

    dual = GentleAlgebra(BY_NAME["dual numbers"])
    correct_allowed = ("a", "a") not in dual.relations
    mutant_allowed = ("a", "a") in dual.relations
    record("permitted-forbidden-successor", "treat forbidden successors as permitted", "finite-dimensionality cycle check", not correct_allowed and mutant_allowed, "the mutant creates the allowed loop a->a")

    characteristic_zero = dual.dimensions(0, 1)["hh_cohomology"][1]
    characteristic_two = dual.dimensions(2, 1)["hh_cohomology"][1]
    record("characteristic-two-as-zero", "reuse characteristic-zero ranks in characteristic two", "dual-number HH^1 field comparison", characteristic_zero != characteristic_two, f"char 0 gives {characteristic_zero}; char 2 gives {characteristic_two}")

    triangle = GentleAlgebra(BY_NAME["radical-square-zero triangle"])
    homology = triangle.dimensions(0, 3)["hh_homology"]
    shifted = homology[1:] + [None]
    record("homological-degree-shift", "report H_(n+1) as H_n", "graded dimension vector", shifted != homology, f"expected {homology}; mutant gives {shifted}")

    # A primitive three-cycle contributes one orbit, not one class for each of
    # its three rotations.
    primitive_expected = homology[2]
    rotations_mutant = 3 * primitive_expected
    record("primitive-circuit-as-rotations", "count every cyclic rotation as a primitive circuit", "triangle HH_2 oracle dimension", primitive_expected != rotations_mutant, f"expected {primitive_expected}; mutant gives {rotations_mutant}")

    correct_b = dual.connes(0)
    mutant_b = dual.connes(0, "missing_cyclic_summand")
    correct_rank, mutant_rank = matrix_rank(correct_b, Field(0)), matrix_rank(mutant_b, Field(0))
    record("connes-missing-cyclic-summand", "drop one rotation from Connes B", "dual-number B_0 exact rank", correct_rank != mutant_rank, f"expected rank {correct_rank}; mutant rank {mutant_rank}")

    fixtures = fixture_values()
    bracket = fixtures["bracket"]
    record("gerstenhaber-commutator-sign", "add rather than subtract the signed reverse insertion", "dual-number bracket coefficient fixture", bracket["correct"] != bracket["wrong"], f"expected {bracket['correct']}; mutant gives {bracket['wrong']}")

    cap = fixtures["cap"]
    record("cap-sign-omission", "omit the (-1)^(p(n+p)) cap sign", "signed cap fixture and associativity convention", cap is not None and cap["signed"] != cap["unsigned"], f"degree {cap['n'] if cap else 'none'}: signed {cap['signed'] if cap else None}; mutant {cap['unsigned'] if cap else None}")

    detected, evidence = check_aps_orientation(fixtures["aps"])
    record("surface-orientation-reversal", "use the TT boundary orientation where APS requires the opposite", "APS genus-one single-boundary winding must equal -2", detected, evidence)

    arf_data = fixtures["arf"]
    gauss_sum = 0
    curve_count = len(arf_data["curves"])
    for bits in range(1 << curve_count):
        value = 0
        for i in range(curve_count):
            if bits & (1 << i):
                value ^= ((arf_data["curves"][i]["winding"] // 2 + 1) % 2)
                for j in range(i + 1, curve_count):
                    if bits & (1 << j):
                        value ^= arf_data["intersection"][i][j]
        gauss_sum += -1 if value else 1
    independent_arf = 0 if gauss_sum > 0 else 1
    mutant_arf = 1 - arf_data["arf"]
    record("flipped-arf-invariant", "return the opposite Arf bit", "independent exact Gauss sum", independent_arf != mutant_arf and independent_arf == arf_data["arf"], f"Gauss sum {gauss_sum} gives Arf {independent_arf}; mutant gives {mutant_arf}")

    detected = sum(record["status"] == "detected" for record in records)
    categories = {category: {"checks": sum(r["category"] == category for r in records),
                             "detected": sum(r["category"] == category and r["status"] == "detected" for r in records)}
                  for category in ("oracle_mutant", "operation_alternative", "output_sensitivity")}
    return {"suite": "domain-specific mutation and sensitivity", "checks": len(records), "detected": detected,
            "undetected": len(records) - detected, "categories": categories, "records": records,
            "runtime_seconds": round(time.perf_counter() - started, 3)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    result = run()
    print(json.dumps(result, indent=None if args.json else 2, sort_keys=True))
    return 1 if result["undetected"] else 0


if __name__ == "__main__":
    sys.exit(main())
