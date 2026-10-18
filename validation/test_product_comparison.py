"""End-to-end product comparison and mutation-baseline regressions."""
import copy
import json
import unittest
from unittest.mock import patch

from validation import product_comparison, product_mutations
from validation.oracle.gentle_oracle import GentleAlgebra, OracleCalculus


class ProductComparisonTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cases = {c['name']: c for c in json.loads((product_comparison.ROOT / 'validation/cases.json').read_text())}

    def test_real_comparison_has_value_rank_and_span_evidence(self):
        result = product_comparison.run([self.cases['dual numbers'], self.cases['Kronecker']], characteristics=(0, 2))
        self.assertEqual(result['failures'], [])
        self.assertEqual(result['algebra_field_runs'], 4)
        self.assertEqual(result['rank_comparisons'], 4 * 32)
        self.assertEqual(result['span_comparisons'], 4 * 12)
        self.assertGreater(result['coefficient_comparisons'], 0)
        self.assertTrue(all(v['value_pairs'] for v in result['operations'].values()))

    def test_image_ranks_and_spans_ignore_changes_of_quotient_basis(self):
        calculus = OracleCalculus(GentleAlgebra(self.cases['Kronecker']))
        before = product_comparison.rank_results(calculus)
        group = calculus.group('cochain', 1)
        old = copy.deepcopy(group.basis)
        group.basis = [[2*x for x in old[2]], [x+y for x,y in zip(old[0], old[1])], old[1]]
        self.assertEqual(product_comparison.rank_results(calculus), before)

    def test_each_actual_mutation_is_detected(self):
        result = product_mutations.run()
        self.assertEqual((result['checks'], result['detected'], result['undetected']), (4, 4, 0))
        for record in result['records']:
            self.assertEqual(record['evidence']['expected'], record['evidence']['production'])
            self.assertNotEqual(record['evidence']['expected'], record['evidence']['mutant'])

    def test_wrong_production_baseline_cannot_count_as_mutation_detection(self):
        real = product_mutations.production_results
        def corrupted(requests):
            response = real(requests)
            response[0]['cases'][0]['terms'] = []
            return response
        with patch.object(product_mutations, 'production_results', side_effect=corrupted):
            with self.assertRaisesRegex(ValueError, 'baseline discrepancy'):
                product_mutations.run()


if __name__ == '__main__':
    unittest.main()
