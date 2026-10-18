import json
import unittest
from fractions import Fraction
from pathlib import Path

from validation.oracle.gentle_oracle import (
    Field,
    GentleAlgebra,
    OracleCalculus,
    PresentationError,
    QuotientSpace,
    compute,
    matrix_rank,
)


ROOT = Path(__file__).resolve().parents[2]
CASES = json.loads((ROOT / "validation" / "cases.json").read_text(encoding="utf-8"))
BY_NAME = {case["name"]: case for case in CASES}


class OracleTests(unittest.TestCase):
    def test_exact_rational_and_prime_field_rank(self):
        matrix = [[2, 1], [1, 1]]
        self.assertEqual(matrix_rank(matrix, Field(0)), 2)
        self.assertEqual(matrix_rank(matrix, Field(2)), 2)
        self.assertEqual(Field(0).value(Fraction(1, 3)), Fraction(1, 3))
        self.assertEqual(Field(5).value(3) * Field(5).inverse(2) % 5, 4)
        with self.assertRaises(ValueError):
            Field(4)

    def test_path_basis_and_multiplication_are_definition_level(self):
        algebra = GentleAlgebra(BY_NAME["A3"])
        self.assertEqual(len(algebra.paths), 6)
        a = next(i for i, path in enumerate(algebra.paths) if path.arrows == ("a",))
        b = next(i for i, path in enumerate(algebra.paths) if path.arrows == ("b",))
        ab = algebra.multiplication[a][b]
        self.assertEqual(algebra.paths[ab].arrows, ("a", "b"))
        zero_algebra = GentleAlgebra(BY_NAME["A3 with zero composite"])
        a = next(i for i, path in enumerate(zero_algebra.paths) if path.arrows == ("a",))
        b = next(i for i, path in enumerate(zero_algebra.paths) if path.arrows == ("b",))
        self.assertIsNone(zero_algebra.multiplication[a][b])

    def test_known_low_degree_dimensions(self):
        self.assertEqual(compute(BY_NAME["field"], 0, 3)["hh_homology"], [1, 0, 0, 0])
        self.assertEqual(compute(BY_NAME["A3"], 0, 3)["hh_cohomology"], [1, 0, 0, 0])
        dual_zero = compute(BY_NAME["dual numbers"], 0, 3)
        dual_two = compute(BY_NAME["dual numbers"], 2, 3)
        self.assertEqual(dual_zero["hh_homology"], [2, 1, 1, 1])
        self.assertEqual(dual_zero["hh_cohomology"], [2, 1, 1, 1])
        self.assertEqual(dual_zero["cyclic_homology"], [2, 0, 2, 0])
        self.assertEqual(dual_two["hh_homology"], [2, 2, 2, 2])
        self.assertEqual(dual_two["hh_cohomology"], [2, 2, 2, 2])

    def test_both_differentials_square_to_zero(self):
        for name in ("A3", "dual numbers", "radical-square-zero 2-cycle", "parallel then split relation"):
            algebra = GentleAlgebra(BY_NAME[name])
            for characteristic in (0, 2, 3):
                self.assertTrue(algebra.check_square_zero(characteristic, 3), (name, characteristic))

    def test_invalid_or_unbounded_presentations_are_rejected(self):
        infinite = json.loads(json.dumps(BY_NAME["dual numbers"]))
        infinite["relations"] = []
        with self.assertRaises(PresentationError):
            GentleAlgebra(infinite)
        with self.assertRaises(PresentationError):
            GentleAlgebra(BY_NAME["oriented square with one zero turn"], path_limit=4)


class ProductReferenceTests(unittest.TestCase):
    """Definition-level and CSSS26 values, without production representatives.

    For the dual numbers the normalized relative bar complex is the Bardzell
    complex itself: the only radical path is a.  Thus the paper's (a^n, a)
    and <<a^n>> are literally a-valued and idempotent-valued bar cochains.
    Kronecker's aa, ab, ba mean (input arrow, output arrow), not products.
    """

    characteristics = (0, 2, 3, 5)

    @staticmethod
    def elementary(algebra, kind, inputs, output):
        """Build a vector by arrow tuples, independent of path enumeration."""
        matches = [
            i
            for i, (terms, value) in enumerate(algebra.space(kind, len(inputs)))
            if tuple(algebra.paths[j].arrows for j in terms) == tuple(inputs)
            and algebra.paths[value].arrows == output
        ]
        if len(matches) != 1:
            raise AssertionError("reference basis element is not unique")
        vector = [0] * len(algebra.space(kind, len(inputs)))
        vector[matches[0]] = 1
        return vector

    def dual(self, algebra, kind, degree, output):
        return self.elementary(algebra, kind, [("a",)] * degree, output)

    def assert_vector(self, calculus, actual, expected):
        self.assertEqual(actual, [calculus.field.value(x) for x in expected])

    def assert_class(self, calculus, kind, degree, actual, expected):
        group = calculus.group(kind, degree)
        self.assertEqual(group.project(actual), group.project(expected))

    def test_csss26_remark_5_3_dual_number_cup(self):
        algebra = GentleAlgebra(BY_NAME["dual numbers"])
        for characteristic in self.characteristics:
            calculus = OracleCalculus(algebra, characteristic)
            cochain = lambda degree, output: self.dual(algebra, "cochain", degree, output)
            x = cochain(0, ("a",))
            self.assert_vector(calculus, calculus.cup(0, x, 0, x), [0, 0])
            for m in (1, 2):
                even_degree = m if characteristic == 2 else 2 * m
                t = cochain(even_degree, ())
                xt = cochain(even_degree, ("a",))
                self.assert_vector(calculus, calculus.cup(0, x, even_degree, t), xt)
                # The displayed pair (a^(2m),a) in Remark 5.3 is a
                # coboundary in odd characteristic, although not the zero
                # cochain.  Characteristic two retains its nonzero class.
                xt_class = calculus.group("cochain", even_degree).project(xt)
                self.assertEqual(any(xt_class), characteristic == 2)
                for n in (1, 2):
                    other_even = n if characteristic == 2 else 2 * n
                    odd_degree = n if characteristic == 2 else 2 * n - 1
                    s = cochain(other_even, ())
                    u = cochain(odd_degree, ("a",))
                    with self.subTest(characteristic=characteristic, m=m, n=n):
                        self.assert_vector(
                            calculus, calculus.cup(even_degree, t, other_even, s),
                            cochain(even_degree + other_even, ()),
                        )
                        self.assert_vector(
                            calculus, calculus.cup(even_degree, t, odd_degree, u),
                            cochain(even_degree + odd_degree, ("a",)),
                        )
                        self.assert_vector(calculus, calculus.cup(0, x, odd_degree, u), [0, 0])
                        self.assert_vector(
                            calculus,
                            calculus.cup(odd_degree, u, odd_degree, u), [0, 0],
                        )

    def test_csss26_remark_5_18_finite_dimensional_cap_tables(self):
        algebra = GentleAlgebra(BY_NAME["dual numbers"])
        for characteristic in self.characteristics:
            calculus = OracleCalculus(algebra, characteristic)
            cochain = lambda degree, output: self.dual(algebra, "cochain", degree, output)
            chain = lambda degree, leading: self.dual(algebra, "chain", degree, leading)
            x = cochain(0, ("a",))
            self.assert_vector(calculus, calculus.cap(0, x, 0, chain(0, ())), chain(0, ("a",)))
            self.assert_vector(calculus, calculus.cap(0, x, 0, chain(0, ("a",))), [0, 0])
            for n in range(1, 5):
                for m in range(5):
                    # Restrict each table entry to the parity for which
                    # its displayed row/column is a homology class.
                    leading_paths = ((), ("a",)) if characteristic == 2 else (
                        ((),) if m % 2 else (("a",),)
                    )
                    if m == 0 and characteristic != 2:
                        leading_paths = ((), ("a",))
                    outputs = ((), ("a",)) if characteristic == 2 else (
                        (("a",),) if n % 2 else ((),)
                    )
                    for leading in leading_paths:
                        c = chain(m, leading)
                        zero = [] if n > m else [0, 0]
                        x_cap = calculus.cap(0, x, m, c)
                        expected_x = chain(m, ("a",)) if not leading else [0, 0]
                        self.assert_vector(calculus, x_cap, expected_x)
                        if characteristic != 2 and m % 2:
                            # The table says zero in homology: a[a|...|a]
                            # is nonzero as a chain, but is a boundary.
                            self.assert_class(calculus, "chain", m, x_cap, [0, 0])
                        for output in outputs:
                            with self.subTest(characteristic=characteristic, m=m, n=n,
                                              leading=leading, output=output):
                                result = calculus.cap(n, cochain(n, output), m, c)
                                expected = zero
                                if n <= m and not (leading and output):
                                    expected = chain(m - n, leading or output)
                                self.assert_vector(calculus, result, expected)
                                if n <= m:
                                    self.assert_class(calculus, "chain", m - n, result, expected)

    def test_csss26_remark_6_5_kronecker_brackets(self):
        algebra = GentleAlgebra(BY_NAME["Kronecker"])
        pair = lambda source, target: self.elementary(algebra, "cochain", [(source,)], (target,))
        aa, ab, ba, bb = pair("a", "a"), pair("a", "b"), pair("b", "a"), pair("b", "b")
        for characteristic in self.characteristics:
            calculus = OracleCalculus(algebra, characteristic)
            self.assert_vector(calculus, calculus.bracket(1, aa, 1, ab), [-x for x in ab])
            self.assert_vector(calculus, calculus.bracket(1, aa, 1, ba), ba)
            commutator = calculus.bracket(1, ba, 1, ab)
            self.assert_vector(calculus, commutator, [x - y for x, y in zip(aa, bb)])
            # The paper gives 2aa in HH^1.  Its cochain is aa-bb,
            # and aa+bb is an inner derivation (also in characteristic 2).
            self.assert_class(calculus, "cochain", 1, commutator, [2 * x for x in aa])
            self.assert_class(calculus, "cochain", 1, [x + y for x, y in zip(aa, bb)], [0] * len(aa))

    def test_csss26_proposition_6_2_and_remark_6_5_dual_brackets(self):
        algebra = GentleAlgebra(BY_NAME["dual numbers"])
        for characteristic in self.characteristics:
            calculus = OracleCalculus(algebra, characteristic)
            cochain = lambda degree, output: self.dual(algebra, "cochain", degree, output)
            u, t, x = cochain(1, ("a",)), cochain(2, ()), cochain(0, ("a",))
            self.assert_vector(calculus, calculus.bracket(1, u, 2, t), [-2 * v for v in t])
            self.assert_vector(calculus, calculus.bracket(1, u, 0, x), x)
            if characteristic == 2:
                derivation = cochain(1, ())
                self.assert_vector(calculus, calculus.bracket(1, derivation, 0, x), cochain(0, ()))

    def test_normalization_insertion_signs_and_cap_sign(self):
        algebra = GentleAlgebra(BY_NAME["dual numbers"])
        for characteristic in self.characteristics:
            calculus = OracleCalculus(algebra, characteristic)
            cochain = lambda degree, output: self.dual(algebra, "cochain", degree, output)
            u, double_u, t = cochain(1, ("a",)), cochain(2, ("a",)), cochain(2, ())
            self.assert_vector(calculus, calculus.insertion(2, double_u, 2, double_u), [0, 0])
            self.assert_vector(calculus, calculus.insertion(2, t, 1, u), [2 * v for v in t])
            self.assert_vector(calculus, calculus.insertion(2, t, 1, cochain(1, ())), [0, 0])
            self.assert_vector(calculus, calculus.insertion(1, u, 0, cochain(0, ())), [0, 0])
            c = self.dual(algebra, "chain", 2, ())
            expected = self.dual(algebra, "chain", 1, ("a",))
            self.assert_vector(calculus, calculus.cap(1, u, 2, c), [-v for v in expected])

    def test_cup_factor_order_on_acyclic_cocycles(self):
        algebra = GentleAlgebra(BY_NAME["A3"])
        cochain = lambda inputs, output: self.elementary(algebra, "cochain", inputs, output)
        a, b = cochain([("a",)], ("a",)), cochain([("b",)], ("b",))
        ab = cochain([("a", "b")], ("a", "b"))
        first, second = [x + y for x, y in zip(a, ab)], [x + y for x, y in zip(b, ab)]
        expected = cochain([("a",), ("b",)], ("a", "b"))
        for characteristic in self.characteristics:
            calculus = OracleCalculus(algebra, characteristic)
            # Arrow-counting derivations are cocycles, though inner here.
            calculus.group("cochain", 1).project(first)
            calculus.group("cochain", 1).project(second)
            self.assert_vector(calculus, calculus.cup(1, first, 1, second), expected)
            self.assert_vector(calculus, calculus.cup(1, second, 1, first), [0] * len(expected))

    def test_cap_sign_on_a_cycle(self):
        algebra = GentleAlgebra(BY_NAME["radical-square-zero 2-cycle"])
        first = self.elementary(algebra, "chain", [("a",), ("b",)], ())
        second = self.elementary(algebra, "chain", [("b",), ("a",)], ())
        cycle = [x - y for x, y in zip(first, second)]
        derivation = self.elementary(algebra, "cochain", [("a",)], ("a",))
        expected = self.elementary(algebra, "chain", [("b",)], ("a",))
        for characteristic in self.characteristics:
            calculus = OracleCalculus(algebra, characteristic)
            calculus.group("chain", 2).project(cycle)
            calculus.group("cochain", 1).project(derivation)
            result = calculus.cap(1, derivation, 2, cycle)
            self.assert_vector(calculus, result, [-v for v in expected])
            self.assertTrue(any(calculus.group("chain", 1).project(result)))

    def test_projection_with_rational_coefficients_and_noncycles(self):
        field = Field(0)
        group = QuotientSpace(3, [[1, 1, 0]], [[0], [0], [2]], field)
        self.assertEqual(group.project([Fraction(1, 7), Fraction(-1, 7), Fraction(3, 7)]),
                         [Fraction(-1, 7)])
        with self.assertRaises(ValueError):
            group.project([0, 1, 0])
        # Boundary pivots can occur after quotient pivots in ambient order.
        group = QuotientSpace(3, [], [[0], [0], [1]], field)
        self.assertEqual(group.project([1, 2, 3]), [1, 2])

    def test_quotient_projection_kills_boundaries_and_recovers_own_basis(self):
        for name in ("dual numbers", "Kronecker", "parallel then split relation"):
            algebra = GentleAlgebra(BY_NAME[name])
            for characteristic in self.characteristics:
                calculus = OracleCalculus(algebra, characteristic)
                for kind in ("chain", "cochain"):
                    for degree in range(4):
                        group = calculus.group(kind, degree)
                        with self.subTest(name=name, characteristic=characteristic, kind=kind, degree=degree):
                            for boundary in group.boundaries:
                                self.assertEqual(group.project(boundary), [0] * group.dimension)
                            for i, representative in enumerate(group.basis):
                                self.assertEqual(group.project(representative),
                                                 [int(i == j) for j in range(group.dimension)])


if __name__ == "__main__":
    unittest.main()
