"""Verify the detector itself rejects a wrong APS baseline."""
import copy
import unittest
from unittest.mock import patch

from validation import mutations


class MutationDetectorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixtures = mutations.fixture_values()

    def test_known_orientation_and_reversed_output(self):
        detected, evidence = mutations.check_aps_orientation(self.fixtures["aps"])
        self.assertTrue(detected)
        self.assertIn("[[2, -2]]", evidence)
        self.assertIn("[[2, 2]]", evidence)

    def test_wrong_baseline_sign_fails_entire_campaign(self):
        wrong = copy.deepcopy(self.fixtures)
        wrong["aps"]["signature"]["boundaries"][0][1] = 2
        with patch.object(mutations, "fixture_values", return_value=wrong):
            with self.assertRaisesRegex(ValueError, "APS baseline"):
                mutations.run()

    def test_zero_missing_or_wrong_surface_is_not_a_kill(self):
        for update in ({"boundaries": [[2, 0]]}, {"boundaries": []}, {"genus": 2}):
            wrong = copy.deepcopy(self.fixtures["aps"])
            wrong["signature"].update(update)
            with self.subTest(update=update), self.assertRaisesRegex(ValueError, "APS baseline"):
                mutations.check_aps_orientation(wrong)


if __name__ == "__main__":
    unittest.main()
