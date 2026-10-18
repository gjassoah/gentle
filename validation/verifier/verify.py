#!/usr/bin/env python3
"""Independent verifier for low-degree HH homology certificates."""

from __future__ import annotations

import argparse
import json
import sys
from fractions import Fraction
from pathlib import Path

from validation.oracle.gentle_oracle import Field, GentleAlgebra, matrix_rank, multiply_matrices


def scalar(text: str, field: Field):
    value = Fraction(text)
    return field.value(value)


def normalized_matrix(data: dict, field: Field) -> list[list[int | Fraction]]:
    entries = data.get("entries")
    if not isinstance(entries, list) or len(entries) != data.get("rows"):
        raise ValueError("matrix row count mismatch")
    if any(not isinstance(row, list) or len(row) != data.get("columns") for row in entries):
        raise ValueError("matrix column count mismatch")
    return [[scalar(entry, field) for entry in row] for row in entries]


def path_record(path) -> dict:
    return {"source": path.source, "target": path.target, "arrows": list(path.arrows)}


def basis_records(algebra: GentleAlgebra, degree: int) -> list[dict]:
    return [
        {"tensor": [path_record(algebra.paths[i]) for i in terms], "leading": path_record(algebra.paths[leading])}
        for terms, leading in algebra.space("chain", degree)
    ]


def apply(matrix, vector, field: Field):
    return [field.value(sum(entry * coefficient for entry, coefficient in zip(row, vector))) for row in matrix]


def verify(certificate: dict) -> dict:
    checks = []
    if certificate.get("schema") != "gentle-hh-homology-certificate-v1":
        raise ValueError("unsupported certificate schema")
    degree = certificate.get("degree")
    if not isinstance(degree, int) or not 0 <= degree <= 3:
        raise ValueError("certificate degree is outside the prototype range")
    characteristic = certificate.get("characteristic")
    field = Field(characteristic)
    algebra = GentleAlgebra(certificate.get("algebra"), path_limit=20)
    checks.append("algebra reconstructed independently")

    expected_bases = {
        "c_next": basis_records(algebra, degree + 1),
        "c": basis_records(algebra, degree),
        "c_previous": basis_records(algebra, degree - 1),
    }
    if certificate.get("bases") != expected_bases:
        raise ValueError("certificate chain bases do not match the independently reconstructed algebra")
    checks.append("chain bases match the reconstructed normalized complex")

    b_next = normalized_matrix(certificate["matrices"]["b_next"], field)
    b = normalized_matrix(certificate["matrices"]["b"], field)
    expected_next = [[field.value(x) for x in row] for row in algebra.differential("chain", degree + 1)]
    expected_b = [[field.value(x) for x in row] for row in algebra.differential("chain", degree)]
    if b_next != expected_next or b != expected_b:
        raise ValueError("certificate boundary matrices do not match the independently reconstructed differentials")
    checks.append("boundary matrices match the defining Hochschild formula")

    composition = multiply_matrices(b, b_next, field)
    if any(any(row) for row in composition):
        raise ValueError("b_n b_(n+1) is nonzero")
    checks.append("b_n b_(n+1) = 0")
    chain_dimension = len(expected_bases["c"])
    boundary_rank = matrix_rank(b_next, field)
    outgoing_rank = matrix_rank(b, field)
    dimension = chain_dimension - outgoing_rank - boundary_rank
    if certificate.get("claimed_dimension") != dimension:
        raise ValueError("claimed homology dimension is incorrect")
    checks.append("dimension equals dim(C_n) - rank(b_n) - rank(b_(n+1))")

    representatives = certificate.get("representatives")
    if representatives is not None:
        vectors = [[scalar(entry, field) for entry in vector] for vector in representatives]
        if any(len(vector) != chain_dimension for vector in vectors):
            raise ValueError("representative length mismatch")
        if any(any(apply(b, vector, field)) for vector in vectors):
            raise ValueError("a supplied representative is not a cycle")
        boundary_columns = [[row[column] for row in b_next] for column in range(len(b_next[0]) if b_next else certificate["matrices"]["b_next"]["columns"])]
        combined_columns = boundary_columns + vectors
        combined_rows = [[column[row] for column in combined_columns] for row in range(chain_dimension)]
        if matrix_rank(combined_rows, field) != boundary_rank + len(vectors):
            raise ValueError("representatives are dependent modulo boundaries")
        if len(vectors) != dimension:
            raise ValueError("representatives do not span homology modulo boundaries")
        checks.append("representatives are cycles and form a basis modulo boundaries")
    return {"valid": True, "degree": degree, "characteristic": characteristic, "dimension": dimension, "checks": checks}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("certificate", type=Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    try:
        result = verify(json.loads(args.certificate.read_text(encoding="utf-8")))
    except Exception as error:
        result = {"valid": False, "error": str(error)}
    print(json.dumps(result, indent=None if args.json else 2, sort_keys=True))
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    sys.exit(main())
