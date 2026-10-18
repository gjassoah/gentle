# Validation audit

Audit date: 2026-09-09. The baseline command `npm test` passed all 7 pre-existing test files before validation code was added (0 failures, approximately 1.6 seconds). The worktree already contained user changes to `README.md` and `METHODOLOGY.md`; they were preserved.

## Mathematical subsystems and implementation

| Subsystem | Main implementation | Existing evidence at audit time |
|---|---|---|
| Presentation and finite-dimensional path algebra | `validate`, `algebra` in `src/engine.js` | Validation fixtures; known dimensions; exhaustive relation subsets embedded in `tests/engine.test.js` |
| Exact arithmetic and linear algebra | `field`, `kernel`, `quotient`, `reducer` in `src/linear.js` | Rational/prime-field examples and internal span checks |
| Normalized bar and Bardzell complexes | `Calculus.space`, `differential`, `group` in `src/engine.js` | Differential-square checks; bar/Bardzell dimension agreement |
| HH homology/cohomology | `Calculus.group`, `report` | Known examples in characteristics 0, 2, 3, 5; circuit/small-resolution cross-checks |
| Connes B and cyclic homology | `connes`, `cyclicDifferential`, `cyclic` | B-square, mixed-complex and cyclic differential checks; formula comparisons |
| Cup, bracket, cap, Lie derivative | `cup`, `insertion`, `bracket`, `cap`, `lie` | Graded commutativity, skew symmetry, Jacobi, derivation, cap associativity and Cartan tests |
| Complete circuits and all-degree formulas | `structure`, `cohomologyFamilies`, `homologyFormula`, `ringPresentation` in `src/structure.js` | Bar/Bardzell/cyclic comparisons through bounded degrees |
| Ribbon surface and AAG invariant | `ribbon`, `ribbonFromQuiver`, `surfaceComponents` | Known surfaces, thread/path agreement, generated relabellings |
| APS derived invariant | `derivedInvariant`, `connectedInvariant`, `symplecticReduction` in `src/derived.js` | APS section 9 pair, all classification branches, alternate spanning trees |
| Arf invariant | `symplecticReduction` and quadratic branch in `src/derived.js` | Exact enumeration/Gauss-sum checks on genus-two fixtures |
| Export/worker boundaries | `src/export.js`, `src/worker.js` | Escaping, resource fallback, representative serialization tests |

## Existing cross-checks and properties

- Every materialized group checks adjacent differentials and `d² = 0` or `b² = 0`.
- Bar-complex dimensions are compared with the Bardzell resolution.
- Materialized HH/HC dimensions are compared with complete-circuit formulas.
- Connes ranks and de Rham dimensions are compared where adjacent degrees exist.
- `B² = 0`, `bB + Bb = 0`, and cyclic-total differential square-zero are checked.
- Calculus identities are exercised on basis classes in several small algebras and characteristics.
- Three hundred deterministic ribbon presentations test identifier and input-order invariance.
- The derived invariant is recomputed with forward and reverse spanning trees.
- The genus-two Arf fixtures have an independent finite Gauss-sum calculation.

## Common-mode risks found in the audit

- The bar and Bardzell models share the same path algebra, field implementation, quotient/rank code, and basis conventions.
- Circuit-formula checks share `structure(A)` and production field/convention choices with the materialized calculation.
- Cyclic homology and Connes checks share the same production `B` matrix.
- Most operation identities compare operations implemented by the same `Calculus` class. They are strong consistency tests but not independent definitions.
- Ribbon, surface, winding, and APS classification all share the production ribbon construction. Relabelling and alternate-tree checks do not independently derive the surface.
- Browser tests check integration and presentation, not independent mathematics.

## Validation gaps and disposition

| Gap at audit time | Disposition in this framework |
|---|---|
| No implementation-independent HH oracle | Pure-Python exact low-degree oracle added |
| No external differential comparison | Curated and exhaustive production/oracle comparisons added |
| Existing enumeration was embedded and not quantitatively reported | Standalone bounded enumerator with raw/valid/canonical counts added |
| Generated invariance focused mainly on the derived invariant | Deterministic whole-output metamorphic suite added |
| No domain-specific mutation score | Fifteen isolated mathematical mutants added |
| No independently checked per-computation artifact | Narrow HH homology certificate and verifier prototype added |
| No generated quantitative report | `validation/report.py` generates `VALIDATION-REPORT.md` from executed checks |
| Cup/bracket/cap had no second implementation | Remains an explicit limitation; structural identities and mutation checks provide consistency evidence only |
| APS ribbon extraction had no independent implementation | Remains an explicit limitation; metamorphic, branch fixtures, Euler/intersection checks and independent Arf Gauss sums are retained |

The audit found no reason to change production mathematics. Validation additions are kept outside `src/`.
