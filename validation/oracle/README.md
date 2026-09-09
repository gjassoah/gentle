# Low-degree reference oracle

`gentle_oracle.py` is a deliberately small, transparent Python 3 implementation. It imports no production JavaScript and does not copy the optimized Bardzell or complete-circuit formulas.

For a finite-dimensional quadratic monomial gentle presentation it independently:

- enumerates the path basis and multiplication table in left-to-right travel order;
- constructs the E-relative normalized Hochschild chain and cochain spaces;
- evaluates both differentials directly from their definitions;
- computes exact ranks over Q with `fractions.Fraction` and over prime fields with modular integers;
- computes HH homology and cohomology dimensions;
- constructs Connes B and the cyclic mixed-complex totalization; and
- checks chain, cochain, and cyclic differentials square to zero.

The interchange format is the production JSON presentation restricted to:

```json
{"vertices":[{"id":"v","label":"v"}],"arrows":[],"relations":[]}
```

Extra presentation fields are ignored. `validation/production_bridge.mjs` accepts a batch of these presentations and returns only basis-independent dimensions for comparison.

The intended scope is `dim(A) <= 20` and degrees 0 through 3. The implementation is intentionally inefficient and unoptimized. It is evidence from a second implementation, not a proof assistant or a claim of complete correctness.

Run:

```sh
python3 -m unittest validation.oracle.test_oracle
python3 -m validation.differential
python3 -m validation.exhaustive --level quick
```
