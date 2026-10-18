"""Canonical product bridge transport and strict input validation."""
import copy
import json
import subprocess
import unittest
from unittest.mock import patch

from validation import product_comparison
from validation.differential import ROOT


KRONECKER = {
    "vertices": [{"id": "v0", "label": "0"}, {"id": "v1", "label": "1"}],
    "arrows": [{"id": a, "label": a.upper(), "source": "v0", "target": "v1"} for a in ("a", "b")],
    "relations": [],
}


def path(arrow):
    return {"source": "v0", "target": "v1", "arrows": [arrow]}


def term(source, target, coefficient="1"):
    return {"input": [path(source)], "output": path(target), "coefficient": coefficient}


def bridge(requests):
    return subprocess.run(
        ["node", str(ROOT / "validation" / "production_bridge.mjs")],
        input=json.dumps({"requests": requests}), text=True, capture_output=True, cwd=ROOT,
        check=False,
    )


class ProductBridgeProtocolTests(unittest.TestCase):
    def setUp(self):
        self.values = {
            "request_id": "values", "type": "productValues", "presentation": KRONECKER,
            "characteristic": 0,
            "cases": [{"case_id": "aa-ab", "operation": "bracket", "p": 1, "q": 1,
                       "left": [term("a", "a")], "right": [term("a", "b")]}],
        }

    def successful(self, requests):
        result = bridge(requests)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)["results"]

    def test_canonical_paths_survive_reordering_and_relabeling(self):
        reordered = copy.deepcopy(self.values)
        reordered["request_id"] = "reordered"
        reordered["presentation"]["vertices"].reverse()
        reordered["presentation"]["arrows"].reverse()
        for arrow in reordered["presentation"]["arrows"]:
            arrow["label"] = "changed-" + arrow["id"]
        results = self.successful([self.values, reordered])
        expected = [term("a", "b", "-1")]
        self.assertEqual(results[0]["cases"][0]["terms"], expected)
        self.assertEqual(results[1]["cases"][0]["terms"], expected)

    def test_own_basis_rank_and_aggregate_span(self):
        request = {**self.values, "type": "productRanks", "cases": [
            {"case_id": "lie", "operation": "bracket", "p": 1, "q": 1},
            {"case_id": "unit", "operation": "cup", "p": 0, "q": 1},
            {"case_id": "unit-right", "operation": "cup", "p": 1, "q": 0},
        ]}
        result = self.successful([request])[0]
        self.assertEqual([row["rank"] for row in result["cases"]], [3, 3, 3])
        self.assertEqual(result["spans"], [
            {"operation": "bracket", "degree": 1, "kind": "co", "dimension": 3},
            {"operation": "cup", "degree": 1, "kind": "co", "dimension": 3},
        ])

    def test_fractional_input_and_field_reduction(self):
        rational = copy.deepcopy(self.values)
        rational["cases"][0]["left"][0]["coefficient"] = "1/2"
        finite = copy.deepcopy(rational)
        finite.update(request_id="finite", characteristic=5)
        first, second = self.successful([rational, finite])
        self.assertEqual(first["cases"][0]["terms"], [term("a", "b", "-1/2")])
        self.assertEqual(second["cases"][0]["terms"], [term("a", "b", "2")])

    def test_reject_malformed_requests_cases_paths_and_coefficients(self):
        mutations = [
            lambda r: r.update(type="unknown"),
            lambda r: r.update(characteristic=7),
            lambda r: r.update(characteristic=True),
            lambda r: r.update(unexpected=True),
            lambda r: r.update(cases=None),
            lambda r: r["cases"].append(copy.deepcopy(r["cases"][0])),
            lambda r: r["cases"][0].update(p=True),
            lambda r: r["cases"][0].update(q=4),
            lambda r: r["cases"][0].update(p=3, q=3),
            lambda r: r["cases"][0].update(operation="connes"),
            lambda r: r["cases"][0].update(unexpected=True),
            lambda r: r["cases"][0].pop("case_id"),
            lambda r: r["cases"][0].update(left=None),
            lambda r: r["cases"][0]["left"].append(copy.deepcopy(r["cases"][0]["left"][0])),
            lambda r: r["cases"][0]["left"][0].update(coefficient=1),
            lambda r: r["cases"][0]["left"][0].update(coefficient="0.5"),
            lambda r: r["cases"][0]["left"][0].update(coefficient="1/0"),
            lambda r: r["cases"][0]["left"][0].update(input=[]),
            lambda r: r["cases"][0]["left"][0].update(unexpected=True),
            lambda r: r["cases"][0]["left"][0]["input"][0].update(arrows=[]),
            lambda r: r["cases"][0]["left"][0]["input"][0].update(arrows=["missing"]),
            lambda r: r["cases"][0]["left"][0]["input"][0].update(target="v0"),
            lambda r: r["cases"][0]["left"][0]["output"].update(source="v1"),
            lambda r: r["cases"][0]["left"][0]["output"].update(unexpected=True),
        ]
        for index, mutate in enumerate(mutations):
            request = copy.deepcopy(self.values)
            mutate(request)
            with self.subTest(index=index):
                self.assertNotEqual(bridge([request]).returncode, 0)

    def test_reject_noninvertible_denominators_and_rank_only_invalid_cases(self):
        request = copy.deepcopy(self.values)
        request["characteristic"] = 2
        request["cases"][0]["left"][0]["coefficient"] = "1/2"
        self.assertNotEqual(bridge([request]).returncode, 0)
        for operation, p, q in (("insertion", 1, 1), ("bracket", 0, 0), ("cap", 1, 0)):
            request = {**self.values, "type": "productRanks", "cases": [
                {"case_id": "invalid", "operation": operation, "p": p, "q": q}
            ]}
            with self.subTest(operation=operation):
                self.assertNotEqual(bridge([request]).returncode, 0)


class ProductComparisonProtocolTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.requests = [
            {"presentation": KRONECKER, "characteristic": 0, "type": "productValues", "cases": [
                {"case_id": "bracket", "operation": "bracket", "p": 1, "q": 1,
                 "left": [term("a", "a")], "right": [term("a", "b")]},
                {"case_id": "insertion", "operation": "insertion", "p": 1, "q": 1,
                 "left": [term("a", "b")], "right": [term("a", "a")]},
            ]},
            {"presentation": KRONECKER, "characteristic": 0, "type": "productRanks", "cases": [
                {"case_id": "bracket", "operation": "bracket", "p": 1, "q": 1},
                {"case_id": "cup", "operation": "cup", "p": 0, "q": 1},
            ]},
        ]
        cls.results = product_comparison.production_results(cls.requests)

    def test_real_response_and_actual_counts(self):
        self.assertEqual([row["request_id"] for row in self.results], ["request-0", "request-1"])
        field = {"vertices": [{"id": "v", "label": "v"}], "arrows": [], "relations": []}
        result = product_comparison.run([field], characteristics=(0,))
        self.assertEqual(result["algebra_field_runs"], 1)
        self.assertEqual(result["value_pairs"], 4)
        self.assertGreater(result["rank_comparisons"], 0)
        self.assertEqual(result["failures"], [])

    def test_missing_extra_duplicate_reordered_and_malformed_responses(self):
        first, second = self.results
        for batch in (None, {}, [], [first], [first, second, second], [first, first], [second, first], [first, None]):
            with self.subTest(batch=batch), self.assertRaises(ValueError):
                product_comparison.validate_results(self.requests, batch)

    def test_missing_extra_duplicate_reordered_and_malformed_cases(self):
        for index, response in enumerate(self.results):
            rows = response["cases"]
            for changed in (None, {}, [], rows[:1], rows + rows[:1], [rows[0], rows[0]], list(reversed(rows)), [rows[0], None]):
                batch = copy.deepcopy(self.results)
                batch[index]["cases"] = changed
                with self.subTest(response=index, cases=changed), self.assertRaises(ValueError):
                    product_comparison.validate_results(self.requests, batch)

    def test_missing_extra_duplicate_reordered_and_malformed_spans(self):
        rows = self.results[1]["spans"]
        for changed in (None, {}, [], rows[:1], rows + rows[:1], [rows[0], rows[0]], list(reversed(rows)), [rows[0], None]):
            batch = copy.deepcopy(self.results)
            batch[1]["spans"] = changed
            with self.subTest(spans=changed), self.assertRaises(ValueError):
                product_comparison.validate_results(self.requests, batch)

    def test_response_metadata_and_scalar_types(self):
        for key, value in (("request_id", "unknown"), ("type", "productRanks"), ("characteristic", 2),
                           ("characteristic", False), ("algebra_dimension", False), ("algebra_dimension", 0),
                           ("algebra_dimension", "4")):
            batch = copy.deepcopy(self.results)
            batch[0][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                product_comparison.validate_results(self.requests, batch)
        for key, value in (("case_id", "missing"), ("operation", "cap"), ("p", True), ("q", True),
                           ("degree", True), ("kind", "ho")):
            batch = copy.deepcopy(self.results)
            batch[0]["cases"][0][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                product_comparison.validate_results(self.requests, batch)
        for key in ("left_dimension", "right_dimension", "target_dimension", "rank"):
            for bad in (None, -1, "3", False):
                batch = copy.deepcopy(self.results)
                batch[1]["cases"][0][key] = bad
                with self.subTest(key=key, value=bad), self.assertRaises(ValueError):
                    product_comparison.validate_results(self.requests, batch)
        for key, value in (("operation", "cap"), ("kind", "ho"), ("degree", True), ("dimension", True), ("dimension", -1)):
            batch = copy.deepcopy(self.results)
            batch[1]["spans"][0][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                product_comparison.validate_results(self.requests, batch)

    def test_impossible_rank(self):
        for key in ("target_dimension", "left_dimension", "right_dimension"):
            batch = copy.deepcopy(self.results)
            batch[1]["cases"][0][key] = 0
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, "impossible operation rank"):
                product_comparison.validate_results(self.requests, batch)
        batch = copy.deepcopy(self.results)
        batch[1]["cases"][0]["rank"] = 4
        with self.assertRaisesRegex(ValueError, "impossible operation rank"):
            product_comparison.validate_results(self.requests, batch)

    def test_unknown_duplicate_and_malformed_canonical_terms(self):
        mutations = [
            lambda terms: terms.append(copy.deepcopy(terms[0])),
            lambda terms: terms[0].update(input=[]),
            lambda terms: terms[0].update(unexpected=True),
            lambda terms: terms[0]["input"][0].update(arrows=["unknown"]),
            lambda terms: terms[0]["input"][0].update(target="v0"),
            lambda terms: terms[0]["input"][0].update(unexpected=True),
            lambda terms: terms[0]["output"].update(source="v1"),
            lambda terms: terms[0]["output"].update(arrows=None),
        ]
        for index, mutate in enumerate(mutations):
            batch = copy.deepcopy(self.results)
            mutate(batch[0]["cases"][0]["terms"])
            with self.subTest(index=index), self.assertRaises(ValueError):
                product_comparison.validate_results(self.requests, batch)
        for bad in (None, {}, [None]):
            batch = copy.deepcopy(self.results)
            batch[0]["cases"][0]["terms"] = bad
            with self.subTest(terms=bad), self.assertRaises(ValueError):
                product_comparison.validate_results(self.requests, batch)

    def test_bad_or_noncanonical_exact_coefficients(self):
        for bad in (None, 1, False, "0.5", "1/0", "2/2", "01", "+1", "-0", "0", "0/1", "-1/1"):
            batch = copy.deepcopy(self.results)
            batch[0]["cases"][0]["terms"][0]["coefficient"] = bad
            with self.subTest(coefficient=bad), self.assertRaises(ValueError):
                product_comparison.validate_results(self.requests, batch)
        requests = [copy.deepcopy(self.requests[0])]
        requests[0]["characteristic"] = 2
        results = product_comparison.production_results(requests)
        for bad in ("1/2", "-1", "3"):
            changed = copy.deepcopy(results)
            changed[0]["cases"][0]["terms"][0]["coefficient"] = bad
            with self.subTest(coefficient=bad), self.assertRaises(ValueError):
                product_comparison.validate_results(requests, changed)

    def test_transport_and_harness_reject_missing_responses(self):
        for response in ([], {}, {"results": []}):
            completed = subprocess.CompletedProcess([], 0, json.dumps(response), "")
            with self.subTest(response=response), patch.object(product_comparison.subprocess, "run", return_value=completed):
                with self.assertRaises(ValueError):
                    product_comparison.production_results(self.requests)
        field = {"vertices": [{"id": "v", "label": "v"}], "arrows": [], "relations": []}
        with patch.object(product_comparison, "production_results", return_value=[]):
            with self.assertRaisesRegex(ValueError, "response count"):
                product_comparison.run([field], characteristics=(0,))


if __name__ == "__main__":
    unittest.main()
