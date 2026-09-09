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
    regression_modules = ["validation.test_protocol", "validation.test_mutations"]
    regressions = command([sys.executable, "-m", "unittest", *regression_modules])
    differential = run_differential(cases)
    if differential["failures"]:
        raise RuntimeError("curated differential validation failed")
    exhaustive = run_exhaustive(level)
    if exhaustive["failures"]:
        raise RuntimeError("bounded exhaustive validation failed")
    property_process = command(["node", "validation/properties.mjs", "--level", level, "--json"])
    properties = json.loads(property_process["stdout"])
    if properties["failures"]:
        raise RuntimeError("metamorphic/property validation failed")
    mutations = run_mutations()
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
        "exhaustive": exhaustive,
        "properties": properties,
        "mutations": mutations,
        "certificate": {"tests": unittest_count("validation.verifier.test_verifier"), "runtime_seconds": certificate["runtime_seconds"], "status": "pass", "scope": "HH_n, degrees 0 through 3"},
    }


def render(data: dict) -> str:
    d, e, p, m, c = data["differential"], data["exhaustive"], data["properties"], data["mutations"], data["certificate"]
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
        f"| Bounded exhaustive differential | {e['canonical_presentations']} canonical algebras; {e['scalar_comparisons']} scalar comparisons; 0 failures | {e['runtime_seconds']:.3f}s |",
        f"| Metamorphic/property suite | seed {p['seed']}; {p['generated_examples']} generated examples; {p['metamorphic_comparisons']} comparisons; 0 failures | {p['runtime_seconds']:.3f}s |",
        f"| Mutation and sensitivity checks | {m['detected']}/{m['checks']} changes detected; {m['undetected']} undetected | {m['runtime_seconds']:.3f}s |",
        f"| Independent certificate verifier | {c['tests']} tests including corruptions, PASS | {c['runtime_seconds']:.3f}s |",
        "",
        "## Exact coverage",
        "",
        f"The curated suite contains {d['cases']} serialized algebras and runs {d['algebra_field_runs']} algebra/field jobs. It compares `dim(A)`, `dim HH_n`, `dim HH^n`, and `dim HC_n` for characteristics {d['characteristics']} and every degree {d['degrees'][0]} through {d['degrees'][1]}. This is {d['field_degree_pairs']} field-degree pairs and {d['scalar_comparisons']} scalar equalities.",
        "",
        f"The exhaustive generator covers exactly {e['bounds']['minimum_vertices']}–{e['bounds']['maximum_vertices']} vertices, 0–{e['bounds']['maximum_arrows']} labelled arrows, and every subset of composable quadratic relations. It generated {e['raw_presentations']} raw presentations, retained {e['valid_presentations']} finite gentle presentations, and deduplicated these to {e['canonical_presentations']} classes under vertex and arrow relabelling. Characteristics {e['characteristics']} and degrees {e['degrees'][0]}–{e['degrees'][1]} give {e['field_degree_pairs']} field-degree pairs and {e['scalar_comparisons']} scalar comparisons.",
        "",
        f"The property suite uses deterministic seed `{p['seed']}`. Each of its {p['generated_examples']} generated valid presentations is checked under {p['transformations_per_example']} transformations: vertex and arrow relabelling, arrow/relation/vertex or component order, and JSON round-trip. Materialized degrees are {p['materialized_degrees']}; formula degrees are {p['formula_degrees']}. The production report also checks differential and mixed-complex identities.",
        "",
        "Differential batches require one ordered, identified response per request, matching field/degree metadata, every requested degree row, and nonnegative integer dimensions. Empty, truncated, duplicate, extra, reordered and malformed responses are rejected. Counts come from the validated responses actually compared.",
        "",
        f"The mutation/sensitivity campaign includes {m['categories']['oracle_mutant']['checks']} actual mutations in the Python oracle, {m['categories']['operation_alternative']['checks']} alternate operation calculations, and {m['categories']['output_sensitivity']['checks']} output-sensitivity checks. These categories are not a production mutation kill rate. The APS orientation baseline must have genus one and boundary data [[2, -2]] before the sign-reversed output is tested; an incorrect baseline fails validation.",
        "",
        "The certificate prototype exports the serialized algebra, field, three adjacent chain bases, exact production boundary matrices, claimed dimension, representatives, engine version, commit, and dirty-state metadata. The Python verifier reconstructs the normalized complex from the algebra, compares matrices, checks `b_n b_(n+1)=0`, recomputes the dimension, and verifies representatives modulo boundaries. Corrupted dimensions, matrices, and representatives are rejected.",
        "",
        "## Nature of the evidence",
        "",
        "- Mathematical theorems and definitions are attributed in `METHODOLOGY.md` and `validation/TRACEABILITY.md`; they are not proved here.",
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
        "- cup, Gerstenhaber bracket, and cap do not yet have a complete implementation-independent oracle; their evidence is identity-, fixture-, and mutation-based;",
        "- the APS ribbon-to-surface extraction has no independent second implementation; its Gauss sum independently reduces a quadratic form built from production windings/intersections, not an independently reconstructed geometric form;",
        "- the oracle and certificate prototype stop at algebra dimension 20 and degree 3;",
        "- the optional Chromium/CDP integration scripts are outside `npm test` and were not run by this headless mathematical validation; and",
        "- no claim is made for arbitrary presentations, degrees, fields beyond Q/prime fields, or the complete browser application.",
        "",
        "## Reproduction",
        "",
        "```sh",
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
    args = parser.parse_args()
    try:
        data = run(args.level)
        REPORT.write_text(render(data), encoding="utf-8")
    except Exception as error:
        print(f"validation failed: {error}", file=sys.stderr)
        return 1
    if args.json:
        print(json.dumps(data, indent=2, sort_keys=True))
    else:
        print(f"wrote {REPORT.relative_to(ROOT)} ({args.level})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
