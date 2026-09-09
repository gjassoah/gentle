import copy
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from validation.verifier.verify import verify


ROOT = Path(__file__).resolve().parents[2]


class CertificateVerifierTests(unittest.TestCase):
    @staticmethod
    def generate(case, characteristic, degree):
        process = subprocess.run(
            ["node", "validation/certificate.mjs", "--case", case, "--characteristic", str(characteristic), "--degree", str(degree)],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=True,
        )
        return json.loads(process.stdout)

    @classmethod
    def setUpClass(cls):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "dual-hh1.json"
            subprocess.run(
                ["node", "validation/certificate.mjs", "--case", "dual numbers", "--characteristic", "2", "--degree", "1", "--output", str(target)],
                cwd=ROOT,
                check=True,
            )
            cls.certificate = json.loads(target.read_text(encoding="utf-8"))

    def test_production_certificate_is_verified_independently(self):
        result = verify(self.certificate)
        self.assertTrue(result["valid"])
        self.assertEqual(result["dimension"], 2)

    def test_supported_degrees_and_fields(self):
        for case, characteristic, degree in (("A3", 0, 0), ("dual numbers", 3, 2), ("radical-square-zero 2-cycle", 2, 3)):
            with self.subTest(case=case, characteristic=characteristic, degree=degree):
                self.assertTrue(verify(self.generate(case, characteristic, degree))["valid"])

    def test_corrupted_dimension_is_rejected(self):
        corrupt = copy.deepcopy(self.certificate)
        corrupt["claimed_dimension"] += 1
        with self.assertRaisesRegex(ValueError, "dimension"):
            verify(corrupt)

    def test_corrupted_matrix_is_rejected(self):
        corrupt = copy.deepcopy(self.certificate)
        corrupt["matrices"]["b_next"]["entries"][0][0] = "1"
        with self.assertRaisesRegex(ValueError, "matrices"):
            verify(corrupt)

    def test_corrupted_representative_is_rejected(self):
        corrupt = copy.deepcopy(self.certificate)
        corrupt["representatives"][0] = ["0"] * len(corrupt["representatives"][0])
        with self.assertRaisesRegex(ValueError, "dependent"):
            verify(corrupt)


if __name__ == "__main__":
    unittest.main()
