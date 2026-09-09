import json
import unittest
from fractions import Fraction
from pathlib import Path

from validation.oracle.gentle_oracle import Field, GentleAlgebra, PresentationError, compute, matrix_rank


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


if __name__ == "__main__":
    unittest.main()
