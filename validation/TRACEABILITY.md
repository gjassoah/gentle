# Mathematical traceability

The implementation follows the sources cited in the repository: Chaparro–Schroll–Solotar–Suárez-Álvarez (CSSS), arXiv:2311.08003v4, and Amiot–Plamondon–Schroll (APS), *Annales Henri Lebesgue* 6 (2023). Definitions or section references are used below when a theorem number was not verified; no theorem number is inferred.

| Feature | Mathematical source/definition | Implementation | Tests | Independent check | Status |
|---|---|---|---|---|---|
| Path/algebra construction | Bound quiver path algebra by quadratic monomial relations; gentle conditions in CSSS §2 | `validate`, `algebra` (`src/engine.js`) | `tests/engine.test.js` | `GentleAlgebra` path enumeration and multiplication; curated/exhaustive comparison | Checked within stated bounds |
| Field arithmetic | Exact Q and prime-field arithmetic | `field` (`src/linear.js`) | exact large rational and prime examples | Python `Fraction` and modular Gaussian elimination | Checked for characteristics 0, 2, 3, 5; exhaustive also 0, 2, 3 |
| Hochschild chain differential | Normalized relative Hochschild boundary | `Calculus.differential('ho',…)` | internal `b²=0` | Direct Python defining formula | Differential dimensions checked degrees 0–3 |
| Hochschild cochain differential | Normalized relative Hochschild coboundary | `Calculus.differential('co',…)` | internal `d²=0` | Direct Python defining formula, separately written from chains | Differential dimensions checked degrees 0–3 |
| HH_* | Homology of the normalized chain complex; CSSS §4 | `Calculus.group('ho',…)` | examples, Bardzell and circuit formulas | Python exact ranks | Curated and exhaustive checks pass |
| HH^* | Cohomology of the normalized cochain complex; CSSS §3 | `Calculus.group('co',…)` | examples, Bardzell and family formulas | Python exact ranks | Curated and exhaustive checks pass |
| Connes B | Normalized cyclic rotation formula; CSSS §4 | `Calculus.connes` | `B²`, mixed identity, known coefficient | Direct Python cyclic-rotation sum | Included in independent HC checks |
| HC_* | Homology of the cyclic mixed-complex totalization; CSSS §4 | `cyclicSpace`, `cyclicDifferential`, `cyclic` | total differential and formula checks | Independent Python total complex | Curated and exhaustive checks pass |
| Cup product | Normalized cochain cup; CSSS §5 | `Calculus.cup` | examples, graded commutativity, derivation | No second implementation | Internally consistency-checked |
| Gerstenhaber bracket | Signed insertions and graded commutator; CSSS §6 | `insertion`, `bracket` | skew symmetry, Jacobi, derivation, HH¹ table | Sign mutants; no complete second implementation | Internally consistency-checked; gap documented |
| Cap product | Signed evaluation, CSSS equation (5.5) as documented in `METHODOLOGY.md` | `cap`, `contraction` | example, associativity, Cartan compatibility | No second implementation | Internally consistency-checked; gap documented |
| Complete circuits/all-degree formulas | CSSS cohomology/homology/cyclic circuit families (§§3–5) | `structure`, `cohomologyFamilies`, `homologyFormula`, `ringPresentation` | bounded bar/Bardzell/cyclic comparisons | Low-degree oracle; primitive/rotation mutant | Checked only in materialized low degrees independently |
| Ribbon/surface construction | Marked ribbon graph and winding description in CSSS §7 | `ribbon`, `ribbonFromQuiver`, `surfaceComponents` | known AAG data, two constructors, relabelling | Metamorphic checks; no independent ribbon oracle | Consistency-checked; gap documented |
| APS derived invariant | APS Theorem 7.4 and cited local winding/quadratic-refinement definitions | `connectedInvariant`, `derivedInvariant`, `compareDerived` | APS §9 pair and every branch | Alternate trees, exact Gauss sum for Arf, metamorphic suite | Strong bounded evidence; ribbon extraction not independently reimplemented |
| Arf invariant | APS quadratic refinement and Arf branch | `symplecticReduction`, `connectedInvariant` | two genus-two fixtures | Exhaustive exact Gauss sum; flipped-Arf mutant | Independently checked on fixtures |

## Convention-sensitive audit

- **Path composition:** both implementations expose left-to-right travel order: `a*b` follows `a` then `b`. The asymmetric A3 multiplication fixture and reversed-composition mutant make this convention observable.
- **Signs:** chain terms are `+`, alternating internal terms, and `(-1)^n` on the cyclic terminal term. Cochains use the analogous endpoint actions and `(-1)^(n+1)` terminal sign. Six sign/omission mutants have separate witnesses.
- **Grading:** chain boundary lowers and cochain coboundary raises degree. HH/HC comparisons include all degrees 0–3 and a degree-shift mutant.
- **Characteristic 2:** signs are reduced only after integer matrix construction. Dual numbers distinguish characteristic 2 from 0; characteristics 2, 3, and 5 are checked independently.
- **Primitive circuits versus powers/rotations:** production uses one complete-circuit orbit and its degree families. The radical-square-zero triangle independently has `dim HH_2 = 1`; counting its rotations gives the killed value 3.
- **Orientation:** the TT surface winding is `m-n`, while APS uses the opposite boundary orientation `n-m`. The APS §9 winding `-2` is a mutation witness.
- **Basis conventions:** production and oracle comparisons use dimensions, not representative names. The certificate verifier does compare bases, but reconstructs their path/tensor records independently before checking matrices.
- **Degree zero:** cochains are closed paths at vertices and chains are cyclic paths. Production representative display tests separately distinguish the domain idempotent from the output.

All independent computations are bounded to path-basis dimension at most 20 and degrees at most 3. This document records traceability and machine checks, not a formal proof of the application.
