#!/usr/bin/env python3
"""Run validation checks and generate VALIDATION-REPORT.md from their results."""

from __future__ import annotations

import argparse
import datetime as dt
import importlib
import json
import re
import subprocess
import sys
import time
import unittest
from pathlib import Path

from validation.differential import run as run_differential
from validation.exhaustive import run as run_exhaustive
from validation.mutations import run as run_mutations
from validation.product_comparison import run as run_products
from validation.product_mutations import run as run_product_mutations


ROOT = Path(__file__).resolve().parent.parent
REPORT = ROOT / "validation" / "VALIDATION-REPORT.md"


def command(arguments: list[str]) -> dict:
    started = time.perf_counter()
    process = subprocess.run(arguments, cwd=ROOT, text=True, capture_output=True, check=False)
    result = {
        "command": " ".join(arguments),
        "returncode": process.returncode,
        "runtime_seconds": round(time.perf_counter() - started, 3),
        "stdout": process.stdout,
        "stderr": process.stderr,
    }
    if process.returncode:
        raise RuntimeError(f"{result['command']} failed\n{process.stdout}\n{process.stderr}")
    return result


def unittest_count(module_name: str) -> int:
    module = importlib.import_module(module_name)
    return unittest.defaultTestLoader.loadTestsFromModule(module).countTestCases()


def test_block_count(files: list[Path]) -> int:
    return sum(len(re.findall(r"\btest\s*\(", path.read_text(encoding="utf-8"))) for path in files)


def git_value(*arguments: str, default: str = "unavailable") -> str:
    process = subprocess.run(["git", *arguments], cwd=ROOT, text=True, capture_output=True, check=False)
    return process.stdout.strip() if process.returncode == 0 and process.stdout.strip() else default


def run(level: str) -> dict:
    cases = json.loads((ROOT / "validation" / "cases.json").read_text(encoding="utf-8"))
    production_files = sorted((ROOT / "tests").glob("*.test.js"))
    production = command(["npm", "test"])
    syntax = command(["npm", "run", "check"])
    oracle = command([sys.executable, "-m", "unittest", "validation.oracle.test_oracle"])
    regression_modules = ["validation.test_protocol", "validation.test_mutations",
                          "validation.test_product_protocol", "validation.test_product_comparison"]
    regressions = command([sys.executable, "-m", "unittest", *regression_modules])
    differential = run_differential(cases)
    if differential["failures"]:
        raise RuntimeError("curated differential validation failed")
    products = run_products(cases)
    if products["failures"]:
        raise RuntimeError("independent product comparison failed: " + json.dumps(products["failures"]))
    exhaustive = run_exhaustive(level)
    if exhaustive["failures"]:
        raise RuntimeError("bounded exhaustive validation failed")
    property_process = command(["node", "validation/properties.mjs", "--level", level, "--json"])
    properties = json.loads(property_process["stdout"])
    if properties["failures"]:
        raise RuntimeError("metamorphic/property validation failed")
    mutations = run_mutations()
    product_mutations = run_product_mutations()
    mutations["records"].extend(product_mutations["records"])
    for key in ("checks", "detected", "undetected"):
        mutations[key] += product_mutations[key]
    mutations["categories"]["oracle_operation_mutant"] = {
        key: product_mutations[key] for key in ("checks", "detected")}
    mutations["runtime_seconds"] = round(mutations["runtime_seconds"] + product_mutations["runtime_seconds"], 3)
    if mutations["undetected"]:
        raise RuntimeError("mutation/sensitivity campaign has undetected changes")
    certificate = command([sys.executable, "-m", "unittest", "validation.verifier.test_verifier"])
    return {
        "level": level,
        "generated_at": dt.datetime.now(dt.timezone.utc).astimezone().isoformat(timespec="seconds"),
        "git_commit": git_value("rev-parse", "HEAD"),
        "git_status": git_value("status", "--porcelain", default="clean"),
        "production": {"files": len(production_files), "named_test_blocks": test_block_count(production_files), "runtime_seconds": production["runtime_seconds"], "status": "pass"},
        "syntax": {"runtime_seconds": syntax["runtime_seconds"], "status": "pass"},
        "oracle": {"unit_tests": unittest_count("validation.oracle.test_oracle"), "runtime_seconds": oracle["runtime_seconds"], "status": "pass"},
        "regressions": {"unit_tests": sum(unittest_count(module) for module in regression_modules), "runtime_seconds": regressions["runtime_seconds"], "status": "pass"},
        "differential": differential,
        "products": products,
        "exhaustive": exhaustive,
        "properties": properties,
        "mutations": mutations,
        "certificate": {"tests": unittest_count("validation.verifier.test_verifier"), "runtime_seconds": certificate["runtime_seconds"], "status": "pass", "scope": "HH_n, degrees 0 through 3"},
    }


def render(data: dict) -> str:
    d, e, p, m, c = data["differential"], data["exhaustive"], data["properties"], data["mutations"], data["certificate"]
    products = data["products"]
    dirty = data["git_status"] != "clean"
    lines = [
        "# Validation report",
        "",
        "> AI-assisted, machine-checked validation. This report records reproducible evidence; it is not a formal proof of correctness of the complete implementation.",
        "",
        f"- Generated: `{data['generated_at']}`",
        f"- Git commit: `{data['git_commit']}`",
        f"- Worktree dirty during run: `{'yes' if dirty else 'no'}`",
        f"- Validation level: `{data['level']}`",
        "",
        "## Executed evidence",
        "",
        "| Method | Actual result | Runtime |",
        "|---|---:|---:|",
        f"| Existing production suite | {data['production']['files']} files, {data['production']['named_test_blocks']} named test blocks, PASS | {data['production']['runtime_seconds']:.3f}s |",
        f"| JavaScript syntax checks | PASS | {data['syntax']['runtime_seconds']:.3f}s |",
        f"| Independent oracle unit suite | {data['oracle']['unit_tests']} tests, PASS | {data['oracle']['runtime_seconds']:.3f}s |",
        f"| Bridge protocol and mutation detector regressions | {data['regressions']['unit_tests']} tests, PASS | {data['regressions']['runtime_seconds']:.3f}s |",
        f"| Curated production/oracle differential | {d['cases']} algebras; {d['scalar_comparisons']} scalar comparisons; 0 failures | {d['runtime_seconds']:.3f}s |",
        f"| Independent cup/insertion/bracket/cap oracle | {products['value_pairs']} input pairs; {products['coefficient_comparisons']} coefficients; {products['rank_comparisons']} map ranks; {products['span_comparisons']} spans; 0 failures | {products['runtime_seconds']:.3f}s |",
        f"| Bounded exhaustive differential | {e['canonical_presentations']} canonical algebras; {e['scalar_comparisons']} scalar comparisons; 0 failures | {e['runtime_seconds']:.3f}s |",
        f"| Metamorphic/property suite | seed {p['seed']}; {p['generated_examples']} generated examples; {p['metamorphic_comparisons']} comparisons; 0 failures | {p['runtime_seconds']:.3f}s |",
        f"| Mutation and sensitivity checks | {m['detected']}/{m['checks']} changes detected; {m['undetected']} undetected | {m['runtime_seconds']:.3f}s |",
        f"| Independent certificate verifier | {c['tests']} tests including corruptions, PASS | {c['runtime_seconds']:.3f}s |",
        "",
        "## Exact coverage",
        "",
        f"The curated suite contains {d['cases']} serialized algebras and runs {d['algebra_field_runs']} algebra/field jobs. It compares `dim(A)`, `dim HH_n`, `dim HH^n`, and `dim HC_n` for characteristics {d['characteristics']} and every degree {d['degrees'][0]} through {d['degrees'][1]}. This is {d['field_degree_pairs']} field-degree pairs and {d['scalar_comparisons']} scalar equalities.",
        "",
        f"The independent product comparison uses {products['cases']} curated algebras over characteristics {products['characteristics']}, for {products['algebra_field_runs']} algebra/field jobs. Input degrees are 0 through 3; nonnegative outputs are bounded by 3. Across {products['degree_pairs']} operation/degree pairs it compares all pairs of independent cocycle/cycle basis vectors, including boundaries, using canonical path records rather than shared array indices. Bilinearity therefore covers every cocycle/cycle input in these bounded spaces. Zero negative-degree outputs are also compared. Cup, bracket and cap image ranks and the spans of their images for each operation/output degree use independently constructed quotient bases. Insertion is compared on cochains, since it does not generally descend by itself to cohomology. See `validation/oracle/README.md` for conventions and explicit reference values.",
        "",
        f"The exhaustive generator covers exactly {e['bounds']['minimum_vertices']}–{e['bounds']['maximum_vertices']} vertices, 0–{e['bounds']['maximum_arrows']} labelled arrows, and every subset of composable quadratic relations. It generated {e['raw_presentations']} raw presentations, retained {e['valid_presentations']} finite gentle presentations, and deduplicated these to {e['canonical_presentations']} classes under vertex and arrow relabelling. Characteristics {e['characteristics']} and degrees {e['degrees'][0]}–{e['degrees'][1]} give {e['field_degree_pairs']} field-degree pairs and {e['scalar_comparisons']} scalar comparisons.",
        "",
        f"The property suite uses deterministic seed `{p['seed']}`. Each of its {p['generated_examples']} generated valid presentations is checked under {p['transformations_per_example']} transformations: vertex and arrow relabelling, arrow/relation/vertex or component order, and JSON round-trip. Materialized degrees are {p['materialized_degrees']}; formula degrees are {p['formula_degrees']}. The production report also checks differential and mixed-complex identities.",
        "",
        "Differential batches require one ordered, identified response per request, matching field/degree metadata, every requested degree row, and nonnegative integer dimensions. Empty, truncated, duplicate, extra, reordered and malformed responses are rejected. Counts come from the validated responses actually compared.",
        "",
        f"The mutation/sensitivity campaign includes {m['categories']['oracle_mutant']['checks']} actual mutations in the Python oracle, {m['categories']['operation_alternative']['checks']} alternate operation calculations, and {m['categories']['output_sensitivity']['checks']} output-sensitivity checks. These categories are not a production mutation kill rate. The APS orientation baseline must have genus one and boundary data [[2, -2]] before the sign-reversed output is tested; an incorrect baseline fails validation.",
        "",
        f"An additional {m['categories']['oracle_operation_mutant']['checks']} actual Python operation mutations are detected by the new canonical comparison: swapped cup factors, an incorrect insertion exponent, the reversed bracket commutator sign, and an omitted cap sign. Every mutation witness first requires an unchanged oracle/production baseline agreement. This is sensitivity of the independent comparison, not a production mutation kill rate.",
        "",
        "The certificate prototype exports the serialized algebra, field, three adjacent chain bases, exact production boundary matrices, claimed dimension, representatives, engine version, commit, and dirty-state metadata. The Python verifier reconstructs the normalized complex from the algebra, compares matrices, checks `b_n b_(n+1)=0`, recomputes the dimension, and verifies representatives modulo boundaries. Corrupted dimensions, matrices, and representatives are rejected.",
        "",
        "## Nature of the evidence",
        "",
        "- Mathematical theorems and definitions are attributed in `docs/METHODOLOGY.md` and `validation/TRACEABILITY.md`; they are not proved here.",
        "- Oracle, differential, identity, mutation, and certificate results are deterministic machine checks using exact arithmetic.",
        "- “Exhaustive” means exhaustive only inside the finite presentation bound stated above.",
        "- Property testing is deterministic sampling, not exhaustive verification.",
        "- The focused AI-assisted review in `validation/AI-AUDIT.md` is not evidence by itself; only its reproducible tests count here.",
        "",
        "## Bugs and unresolved issues",
        "",
        "The independent audit found three reproducible issues, now fixed with regressions: F1 (CRITICAL) accepted characteristic strings such as `\"02\"` selected incorrect cohomology families/rings and fallback dimensions; F2 (MEDIUM) missing bridge responses were accepted; F3 (MEDIUM) the APS orientation sensitivity check rewarded either baseline sign. See `validation/INDEPENDENT-AUDIT.md` for the original counterexamples and remediation status.",
        "",
        "Production regressions check that 2, `\"2\"`, `\"02\"` and `\"0002\"` give identical checked reports and formula fallback, including the dual-number degree-one dimension 2 and its exceptional characteristic-two ring. Public formula APIs validate and canonicalize fields, and worker calculations use the parsed field. Valid custom/imported UI field values are normalized; invalid drafts remain editable and are rejected by computation.",
        "",
        "Unresolved validation gaps:",
        "",
        "- the independent cup, insertion, bracket and cap oracle is bounded to the stated input/output degrees, curated algebras and four characteristics; it is not arbitrary-degree certification;",
        "- the APS ribbon-to-surface extraction has no independent second implementation; its Gauss sum independently reduces a quadratic form built from production windings/intersections, not an independently reconstructed geometric form;",
        "- the oracle and certificate prototype stop at algebra dimension 20 and degree 3;",
        "- the Chromium/CDP integration scripts and the CSSS26 checks of `validation/csss26/` (published examples, convention transport, Bardzell comparisons, linear algebra, surface properties) are not part of this report; `npm run verify:full` runs them together with this suite; and",
        "- no claim is made for arbitrary presentations, degrees, fields beyond Q/prime fields, or the complete browser application.",
        "",
        "## Reproduction",
        "",
        "```sh",
        "npm run verify        # unit tests, checks, this suite (extended), CSSS26 checks, build",
        "npm run verify:full   # also the browser tests",
        "npm test",
        "npm run validate:quick",
        "npm run validate:extended",
        "npm run validate:certificate",
        "npm run validate:regressions",
        "```",
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--level", choices=("quick", "extended"), default="quick")
    parser.add_argument("--json", action="store_true", help="also print the underlying result data")
    parser.add_argument("--no-write", action="store_true",
                        help="run the checks without rewriting VALIDATION-REPORT.md (routine verification)")
    args = parser.parse_args()
    try:
        data = run(args.level)
        if not args.no_write:
            REPORT.write_text(render(data), encoding="utf-8")
    except Exception as error:
        print(f"validation failed: {error}", file=sys.stderr)
        return 1
    if args.json:
        print(json.dumps(data, indent=2, sort_keys=True))
    else:
        print(f"validation passed ({args.level})" if args.no_write else f"wrote {REPORT.relative_to(ROOT)} ({args.level})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
