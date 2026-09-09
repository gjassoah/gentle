"""Regression tests for complete, identifiable differential-test responses."""
import copy
import json
import subprocess
import unittest
from unittest.mock import patch

from validation import differential, exhaustive

FIELD = {"vertices": [{"id": "v", "label": "v"}], "arrows": [], "relations": []}


class BridgeProtocolTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.requests = [{"presentation": FIELD, "characteristic": p, "maxDegree": 1} for p in (0, 2)]
        cls.results = differential.production_results(cls.requests)

    def test_real_bridge_and_actual_counts(self):
        self.assertEqual([r["request_id"] for r in self.results], ["request-0", "request-1"])
        result = differential.run([FIELD], characteristics=(0, 2), max_degree=1)
        self.assertEqual((result["algebra_field_runs"], result["field_degree_pairs"], result["scalar_comparisons"]), (2, 4, 14))
        self.assertEqual(result["failures"], [])

    def test_both_harnesses_reject_missing_results(self):
        for module, args in ((differential, ([FIELD],)), (exhaustive, ())):
            with self.subTest(harness=module.__name__), patch.object(module, "production_results", return_value=[]):
                with self.assertRaisesRegex(ValueError, "response count"):
                    module.run(*args)

    def test_missing_extra_duplicate_reordered_and_malformed_responses(self):
        a, b = self.results
        for batch in (None, {}, [], [a], [a, b, b], [a, a], [b, a], [a, None]):
            with self.subTest(batch=batch), self.assertRaises(ValueError):
                differential.validate_results(self.requests, batch)

    def test_response_metadata_and_dimensions(self):
        for key, value in (("request_id", "unknown"), ("characteristic", 3), ("characteristic", False),
                           ("max_degree", 0), ("max_degree", True), ("algebra_dimension", 0), ("algebra_dimension", "1")):
            batch = copy.deepcopy(self.results)
            batch[0][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                differential.validate_results(self.requests, batch)

    def test_incomplete_duplicate_reordered_and_malformed_degree_rows(self):
        rows = self.results[0]["rows"]
        for changed in (None, [], rows[:1], rows + rows[:1], [rows[0], rows[0]], list(reversed(rows)), [rows[0], None]):
            batch = copy.deepcopy(self.results)
            batch[0]["rows"] = changed
            with self.subTest(rows=changed), self.assertRaises(ValueError):
                differential.validate_results(self.requests, batch)
        for key in ("hh_homology", "hh_cohomology", "cyclic_homology"):
            for bad in (None, -1, "0", False):
                batch = copy.deepcopy(self.results)
                batch[0]["rows"][1][key] = bad
                with self.subTest(key=key, value=bad), self.assertRaises(ValueError):
                    differential.validate_results(self.requests, batch)

    def test_transport_rejects_bad_envelopes(self):
        for response in ([], {}, {"results": []}):
            completed = subprocess.CompletedProcess([], 0, json.dumps(response), "")
            with self.subTest(response=response), patch.object(differential.subprocess, "run", return_value=completed):
                with self.assertRaises(ValueError):
                    differential.production_results(self.requests)


if __name__ == "__main__":
    unittest.main()
