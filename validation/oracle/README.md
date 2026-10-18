# Low-degree reference oracle

`gentle_oracle.py` is a deliberately small, transparent Python 3 implementation. It imports no production JavaScript and does not copy the optimized Bardzell or complete-circuit formulas.

For a finite-dimensional quadratic monomial gentle presentation it independently:

- enumerates the path basis and multiplication table in left-to-right travel order;
- constructs the E-relative normalized Hochschild chain and cochain spaces;
- evaluates both differentials directly from their definitions;
- computes exact ranks over Q with `fractions.Fraction` and over prime fields with modular integers;
- computes HH homology and cohomology dimensions and its own quotient bases;
- projects cycles and cocycles to those quotient coordinates, rejecting noncycles;
- evaluates cup, insertion, Gerstenhaber bracket, and cap directly on normalized bar vectors;
- constructs Connes B and the cyclic mixed-complex totalization; and
- checks chain, cochain, and cyclic differentials square to zero.

The interchange format is the production JSON presentation restricted to:

```json
{"vertices":[{"id":"v","label":"v"}],"arrows":[],"relations":[]}
```

Extra presentation fields are ignored. `validation/production_bridge.mjs` accepts batches of these presentations. Its original requests return basis-independent dimensions. The additional `productValues` requests exchange exact coefficients keyed by canonical paths (source vertex, target vertex, arrow-ID tuple), and `productRanks` requests return the ranks and combined image dimensions of cup, bracket, and cap in production's own quotient bases. No array-index correspondence between the implementations is assumed.

`OracleCalculus(algebra, characteristic)` supplies the product API:

```python
calculus = OracleCalculus(GentleAlgebra(presentation), characteristic=0)
calculus.cup(p, f, q, g)
calculus.insertion(p, f, q, g)
calculus.bracket(p, f, q, g)
calculus.cap(p, f, n, chain)
coordinates = calculus.group("cochain", p).project(f)
```

Vectors are dense lists in `algebra.space("cochain", degree)` or `algebra.space("chain", degree)` order. A space entry is `(tensor_path_indices, output_path_index)`; in a chain the second component denotes its leading coefficient. Quotient groups expose `cycles`, `boundaries`, `basis`, and `dimension`. The oracle performs its own exact elimination and never consumes a production basis.

For travel-order inputs, cup evaluates the two consecutive blocks and multiplies their outputs. Insertion uses the signs `(-1)**((q-1)*i)` and discards idempotent outputs inside a normalized tensor. The bracket is the shifted commutator with exponent `(p-1)*(q-1)`. Cap contracts the first `p` tensor factors, multiplies the leading coefficient by the cochain value, and uses `(-1)**(p*(n+p))`; it vanishes for `p > n`.

The explicit reference tests use CSSS26 Remark 5.3 (both dual-number cup tables), Remark 5.18 (both finite-dimensional cap tables), Remark 6.5 (dual-number and Kronecker brackets), and Proposition 6.2 (`[(a,a),t] = -2t`). They distinguish cochains from their classes: in odd characteristic `a cup t` is a nonzero coboundary, and the Kronecker cochain `[ba,ab] = aa-bb` represents `2aa` because `aa+bb` is inner. The final table of Remark 5.18 concerns the infinite-dimensional polynomial algebra and is outside this oracle's finite-dimensional scope.

The intended scope is `dim(A) <= 20` and degrees 0 through 3. The implementation is intentionally inefficient and unoptimized. It is evidence from a second implementation, not a proof assistant or a claim of complete correctness.

Run:

```sh
python3 -m unittest validation.oracle.test_oracle
python3 -m validation.differential
python3 -m validation.product_comparison
python3 -m validation.exhaustive --level quick
python3 -m validation.report --level extended --no-write
```
