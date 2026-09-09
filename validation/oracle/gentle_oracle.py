"""Small, independent low-degree Hochschild (co)homology oracle.

This module deliberately favors definitions over speed.  It shares no code with
the JavaScript implementation.  Paths are tuples of arrow identifiers and are
written in left-to-right travel order.
"""

from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction
from itertools import product
from math import isqrt
from typing import Iterable


class PresentationError(ValueError):
    """The input is not a finite-dimensional monomial gentle presentation."""


@dataclass(frozen=True)
class Path:
    source: str
    target: str
    arrows: tuple[str, ...]


def _relation_key(pair: Iterable[str]) -> tuple[str, str]:
    a, b = tuple(pair)
    return a, b


class Field:
    """Exact arithmetic in Q (characteristic 0) or the prime field F_p."""

    def __init__(self, characteristic: int = 0):
        if not isinstance(characteristic, int) or characteristic < 0:
            raise ValueError("characteristic must be 0 or a prime")
        if characteristic == 1:
            raise ValueError("characteristic must be 0 or a prime")
        if characteristic:
            for divisor in range(2, isqrt(characteristic) + 1):
                if characteristic % divisor == 0:
                    raise ValueError("positive characteristic must be prime")
        self.characteristic = characteristic

    def value(self, number: int | Fraction) -> int | Fraction:
        if not self.characteristic:
            return Fraction(number)
        if isinstance(number, Fraction):
            return (number.numerator * pow(number.denominator, -1, self.characteristic)) % self.characteristic
        return int(number) % self.characteristic

    def inverse(self, number: int | Fraction) -> int | Fraction:
        if not self.characteristic:
            return 1 / number
        return pow(int(number) % self.characteristic, -1, self.characteristic)


def matrix_rank(rows: list[list[int | Fraction]], field: Field) -> int:
    """Gaussian rank over an exact field; the input matrix is not modified."""

    if not rows:
        return 0
    matrix = [[field.value(entry) for entry in row] for row in rows]
    row_count, column_count = len(matrix), len(matrix[0])
    pivot_row = 0
    for column in range(column_count):
        pivot = next((r for r in range(pivot_row, row_count) if matrix[r][column]), None)
        if pivot is None:
            continue
        matrix[pivot_row], matrix[pivot] = matrix[pivot], matrix[pivot_row]
        scale = field.inverse(matrix[pivot_row][column])
        matrix[pivot_row] = [field.value(x * scale) for x in matrix[pivot_row]]
        for row in range(row_count):
            if row == pivot_row or not matrix[row][column]:
                continue
            coefficient = matrix[row][column]
            matrix[row] = [field.value(x - coefficient * y) for x, y in zip(matrix[row], matrix[pivot_row])]
        pivot_row += 1
        if pivot_row == row_count:
            break
    return pivot_row


def multiply_matrices(left: list[list[int]], right: list[list[int]], field: Field) -> list[list[int | Fraction]]:
    """Return left @ right for row-major matrices, including empty maps."""

    if not left:
        return []
    shared = len(left[0])
    columns = len(right[0]) if right else 0
    if len(right) != shared:
        raise ValueError("matrix shapes do not compose")
    return [
        [field.value(sum(left[i][k] * right[k][j] for k in range(shared))) for j in range(columns)]
        for i in range(len(left))
    ]


class GentleAlgebra:
    """Finite-dimensional path algebra modulo quadratic monomial relations."""

    def __init__(self, presentation: dict, path_limit: int = 20):
        self.presentation = presentation
        vertices = presentation.get("vertices")
        arrows = presentation.get("arrows")
        relation_data = presentation.get("relations")
        if not isinstance(vertices, list) or not isinstance(arrows, list) or not isinstance(relation_data, list):
            raise PresentationError("vertices, arrows and relations must be lists")
        self.vertices = tuple(vertex["id"] for vertex in vertices)
        if not self.vertices or len(set(self.vertices)) != len(self.vertices):
            raise PresentationError("vertex identifiers must be nonempty and distinct")
        self.arrows = {arrow["id"]: (arrow["source"], arrow["target"]) for arrow in arrows}
        if len(self.arrows) != len(arrows):
            raise PresentationError("arrow identifiers must be distinct")
        vertex_set = set(self.vertices)
        if any(source not in vertex_set or target not in vertex_set for source, target in self.arrows.values()):
            raise PresentationError("every arrow must join existing vertices")
        try:
            self.relations = {_relation_key(relation) for relation in relation_data}
        except (TypeError, ValueError):
            raise PresentationError("relations must be arrow pairs") from None
        for first, second in self.relations:
            if first not in self.arrows or second not in self.arrows:
                raise PresentationError("relations must use existing arrows")
            if self.arrows[first][1] != self.arrows[second][0]:
                raise PresentationError("relations must be composable")
        self._check_gentle_and_finite()
        self.paths = self._enumerate_paths(path_limit)
        self.path_index = {(path.source, path.target, path.arrows): i for i, path in enumerate(self.paths)}
        self.radical = tuple(i for i, path in enumerate(self.paths) if path.arrows)
        self.idempotent = {path.source: i for i, path in enumerate(self.paths) if not path.arrows}
        self.multiplication = self._multiplication_table()

    def _check_gentle_and_finite(self) -> None:
        arrow_items = list(self.arrows.items())
        for vertex in self.vertices:
            if sum(source == vertex for source, _ in self.arrows.values()) > 2:
                raise PresentationError("more than two outgoing arrows")
            if sum(target == vertex for _, target in self.arrows.values()) > 2:
                raise PresentationError("more than two incoming arrows")
        allowed_successors: dict[str, list[str]] = {}
        for arrow, (_, target) in arrow_items:
            candidates = [other for other, (source, _) in arrow_items if source == target]
            forbidden = [other for other in candidates if (arrow, other) in self.relations]
            allowed = [other for other in candidates if (arrow, other) not in self.relations]
            if len(forbidden) > 1 or len(allowed) > 1:
                raise PresentationError("gentle successor condition fails")
            allowed_successors[arrow] = allowed
        for arrow, (source, _) in arrow_items:
            candidates = [other for other, (_, target) in arrow_items if target == source]
            forbidden = [other for other in candidates if (other, arrow) in self.relations]
            allowed = [other for other in candidates if (other, arrow) not in self.relations]
            if len(forbidden) > 1 or len(allowed) > 1:
                raise PresentationError("gentle predecessor condition fails")
        active: set[str] = set()
        finished: set[str] = set()

        def visit(arrow: str) -> None:
            if arrow in active:
                raise PresentationError("an allowed transition cycle makes the algebra infinite-dimensional")
            if arrow in finished:
                return
            active.add(arrow)
            for successor in allowed_successors[arrow]:
                visit(successor)
            active.remove(arrow)
            finished.add(arrow)

        for arrow in self.arrows:
            visit(arrow)

    def _enumerate_paths(self, path_limit: int) -> tuple[Path, ...]:
        paths = [Path(vertex, vertex, ()) for vertex in self.vertices]

        def extend(path: Path) -> None:
            paths.append(path)
            if len(paths) > path_limit:
                raise PresentationError(f"oracle path limit {path_limit} exceeded")
            for arrow, (source, target) in self.arrows.items():
                if source == path.target and (path.arrows[-1], arrow) not in self.relations:
                    extend(Path(path.source, target, path.arrows + (arrow,)))

        for arrow, (source, target) in self.arrows.items():
            extend(Path(source, target, (arrow,)))
        return tuple(paths)

    def _multiplication_table(self) -> tuple[tuple[int | None, ...], ...]:
        table = []
        for left in self.paths:
            row = []
            for right in self.paths:
                if left.target != right.source:
                    row.append(None)
                    continue
                if left.arrows and right.arrows and (left.arrows[-1], right.arrows[0]) in self.relations:
                    row.append(None)
                    continue
                arrows = left.arrows + right.arrows
                row.append(self.path_index.get((left.source, right.target, arrows)))
            table.append(tuple(row))
        return tuple(table)

    def tensor_tuples(self, degree: int) -> tuple[tuple[int, ...], ...]:
        if degree < 0:
            return ()
        if degree == 0:
            return ((),)
        return tuple(
            terms
            for terms in product(self.radical, repeat=degree)
            if all(self.paths[terms[i]].target == self.paths[terms[i + 1]].source for i in range(degree - 1))
        )

    def space(self, kind: str, degree: int) -> tuple[tuple[tuple[int, ...], int], ...]:
        if degree < 0:
            return ()
        items = []
        if degree == 0:
            endpoint_pairs = [((), vertex, vertex) for vertex in self.vertices]
        else:
            endpoint_pairs = [
                (terms, self.paths[terms[0]].source, self.paths[terms[-1]].target)
                for terms in self.tensor_tuples(degree)
            ]
        for terms, source, target in endpoint_pairs:
            for output, path in enumerate(self.paths):
                parallel = path.source == source and path.target == target
                cyclic = path.source == target and path.target == source
                if (kind == "cochain" and parallel) or (kind == "chain" and cyclic):
                    items.append((terms, output))
        return tuple(items)

    def differential(self, kind: str, degree: int, mutant: str | None = None) -> list[list[int]]:
        """Definition-level differential from degree n to n+1 (cochain) or n-1 (chain)."""

        source = self.space(kind, degree)
        target_degree = degree + 1 if kind == "cochain" else degree - 1
        target = self.space(kind, target_degree)
        source_index = {item: i for i, item in enumerate(source)}
        target_index = {item: i for i, item in enumerate(target)}
        matrix = [[0 for _ in source] for _ in target]

        def add(row: int | None, column: int | None, coefficient: int) -> None:
            if row is not None and column is not None:
                matrix[row][column] += coefficient

        if kind == "chain":
            if degree <= 0:
                return matrix
            for column, (terms, leading) in enumerate(source):
                left = self.multiplication[leading][terms[0]]
                add(target_index.get((terms[1:], left)) if left is not None else None, column, 1)
                for i in range(degree - 1):
                    joined = self.multiplication[terms[i]][terms[i + 1]]
                    if joined is not None:
                        sign = (-1) ** (i + 1)
                        if mutant == "chain_internal_sign":
                            sign = -sign
                        merged = terms[:i] + (joined,) + terms[i + 2 :]
                        add(target_index.get((merged, leading)), column, sign)
                if mutant != "omit_terminal":
                    right = self.multiplication[terms[-1]][leading]
                    sign = (-1) ** degree
                    if mutant == "terminal_sign":
                        sign = -sign
                    add(target_index.get((terms[:-1], right)) if right is not None else None, column, sign)
            return matrix

        # Evaluate the cochain coboundary on every target tensor.  This is
        # intentionally written from the defining formula, not transposed from
        # the chain implementation.
        for row, (terms, wanted_output) in enumerate(target):
            n = degree
            for candidate, path in enumerate(self.paths):
                product_index = self.multiplication[terms[0]][candidate]
                if product_index == wanted_output:
                    add(row, source_index.get((terms[1:], candidate)), 1)
            for i in range(n):
                joined = self.multiplication[terms[i]][terms[i + 1]]
                if joined is not None:
                    merged = terms[:i] + (joined,) + terms[i + 2 :]
                    sign = (-1) ** (i + 1)
                    if mutant == "cochain_internal_sign":
                        sign = -sign
                    add(row, source_index.get((merged, wanted_output)), sign)
            if mutant != "omit_terminal":
                for candidate in range(len(self.paths)):
                    product_index = self.multiplication[candidate][terms[-1]]
                    if product_index == wanted_output:
                        sign = (-1) ** (n + 1)
                        if mutant == "terminal_sign":
                            sign = -sign
                        add(row, source_index.get((terms[:-1], candidate)), sign)
        return matrix

    def connes(self, degree: int, mutant: str | None = None) -> list[list[int]]:
        """Normalized Connes B: C_n -> C_{n+1}, directly by cyclic rotations."""

        source, target = self.space("chain", degree), self.space("chain", degree + 1)
        target_index = {item: i for i, item in enumerate(target)}
        matrix = [[0 for _ in source] for _ in target]
        for column, (terms, leading) in enumerate(source):
            if not self.paths[leading].arrows:
                continue
            all_terms = (leading,) + terms
            rotation_count = degree if mutant == "missing_cyclic_summand" else degree + 1
            for i in range(rotation_count):
                rotated = all_terms[i:] + all_terms[:i]
                local_unit = self.idempotent[self.paths[rotated[0]].source]
                row = target_index[(rotated, local_unit)]
                matrix[row][column] += (-1) ** (degree * i)
        return matrix

    def cyclic_space(self, degree: int) -> tuple[tuple[int, int], ...]:
        if degree < 0:
            return ()
        return tuple((chain_degree, i) for chain_degree in range(degree, -1, -2) for i in range(len(self.space("chain", chain_degree))))

    def cyclic_differential(self, degree: int) -> list[list[int]]:
        source, target = self.cyclic_space(degree), self.cyclic_space(degree - 1)
        target_index = {item: i for i, item in enumerate(target)}
        matrix = [[0 for _ in source] for _ in target]
        chain_maps = {k: self.differential("chain", k) for k in range(max(0, degree) + 1)}
        connes_maps = {k: self.connes(k) for k in range(max(0, degree))}
        for column, (chain_degree, local_column) in enumerate(source):
            if chain_degree > 0:
                for local_row, coefficient in enumerate(row[local_column] for row in chain_maps[chain_degree]):
                    matrix[target_index[(chain_degree - 1, local_row)]][column] += coefficient
            if chain_degree < degree:
                for local_row, coefficient in enumerate(row[local_column] for row in connes_maps[chain_degree]):
                    matrix[target_index[(chain_degree + 1, local_row)]][column] += coefficient
        return matrix

    def dimensions(self, characteristic: int, max_degree: int = 3) -> dict:
        field = Field(characteristic)
        homology, cohomology, cyclic_homology = [], [], []
        chain_differentials = [self.differential("chain", n) for n in range(max_degree + 2)]
        cochain_differentials = [self.differential("cochain", n) for n in range(max_degree + 1)]
        for degree in range(max_degree + 1):
            chain_size = len(self.space("chain", degree))
            cochain_size = len(self.space("cochain", degree))
            homology.append(
                chain_size
                - matrix_rank(chain_differentials[degree], field)
                - matrix_rank(chain_differentials[degree + 1], field)
            )
            incoming_cochain = cochain_differentials[degree - 1] if degree else []
            cohomology.append(
                cochain_size
                - matrix_rank(cochain_differentials[degree], field)
                - matrix_rank(incoming_cochain, field)
            )
            cyclic_size = len(self.cyclic_space(degree))
            cyclic_homology.append(
                cyclic_size
                - matrix_rank(self.cyclic_differential(degree), field)
                - matrix_rank(self.cyclic_differential(degree + 1), field)
            )
        return {
            "characteristic": characteristic,
            "max_degree": max_degree,
            "algebra_dimension": len(self.paths),
            "hh_homology": homology,
            "hh_cohomology": cohomology,
            "cyclic_homology": cyclic_homology,
        }

    def check_square_zero(self, characteristic: int, max_degree: int = 3) -> bool:
        field = Field(characteristic)
        for kind in ("chain", "cochain"):
            if kind == "chain":
                for degree in range(2, max_degree + 2):
                    first = self.differential(kind, degree)
                    second = self.differential(kind, degree - 1)
                    if any(any(row) for row in multiply_matrices(second, first, field)):
                        return False
            else:
                for degree in range(max_degree):
                    first = self.differential(kind, degree)
                    second = self.differential(kind, degree + 1)
                    if any(any(row) for row in multiply_matrices(second, first, field)):
                        return False
        for degree in range(max_degree + 1):
            first, second = self.cyclic_differential(degree + 1), self.cyclic_differential(degree)
            if any(any(row) for row in multiply_matrices(second, first, field)):
                return False
        return True


def compute(presentation: dict, characteristic: int, max_degree: int = 3, path_limit: int = 20) -> dict:
    algebra = GentleAlgebra(presentation, path_limit=path_limit)
    result = algebra.dimensions(characteristic, max_degree)
    result["square_zero"] = algebra.check_square_zero(characteristic, max_degree)
    return result
