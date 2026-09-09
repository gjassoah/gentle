# Focused AI-assisted source audit

This review was performed after the deterministic framework was in place. Statements below are not treated as evidence unless tied to a reproducible machine check.

| Audit focus | Code inspected | Plausible failure considered | Reproducible determination |
|---|---|---|---|
| Hochschild signs | `Calculus.differential` in `src/engine.js` | internal or terminal sign/term error | Independent Python chain/cochain formulas agree on curated and exhaustive suites; six mutants are killed |
| Positive characteristic | `field`, `reducer`, `kernel`, `quotient`; sign construction in `differential`/`connes` | accidental characteristic-zero rank or characteristic-2 sign handling | Differential comparison covers 0, 2, 3, 5; dual numbers force different char-2 dimensions; no discrepancy |
| Primitive/complete circuits | `structure`, `cohomologyFamilies`, `homologyFormula` | rotations or powers counted as primitive circuits | Triangle low-degree oracle and dedicated mutant detect triple counting; no discrepancy in checked degrees |
| Cup/bracket/cap/B conventions | `cup`, `insertion`, `bracket`, `cap`, `contraction`, `lie`, `connes` | wrong grading or Koszul sign | Existing identity tests cover commutativity, skew symmetry, Jacobi, derivation, associativity and Cartan; B is independently reimplemented. Cup/bracket/cap still lack a full second implementation |
| APS/ribbon invariant | `ribbonFromQuiver`, `ribbon`, `connectedInvariant`, `symplecticReduction` | boundary orientation, tree dependence, wrong Arf bit | APS §9 orientation fixture, two tree orders, 100-example metamorphic suite, and exact Gauss sum kill the targeted mutants. No independent ribbon-to-surface oracle exists |
| Serialization/relabeling | path keys, `describeVector`, derived signature sorting | labels/order alter mathematical output | Deterministic metamorphic suite checks vertex/arrow renaming, all input orders, component order and JSON round-trip; no discrepancy |

## Findings

No new production-mathematics bug was found within the implemented bounds, so no production code was changed. The existing worktree already contained representative-documentation edits predating this audit; they are not attributed to this validation work.

One generated example showed that the literal `allowedProducts` and `equalities` strings in `ringPresentation` change when arrow order selects a different spanning-forest complement. This is a change of derivation generators, not a change in the graded ring. The metamorphic comparison therefore uses component type and generator type/degree data, while HH dimensions and the basis-independent HH¹ Lie invariants are compared separately. Treating the raw presentation strings as canonical would be an invalid test.

The two material unresolved risks are the absence of a second implementation for cup/bracket/cap and the absence of an independent APS ribbon/surface extraction. Their existing algebraic identities, fixtures and mutants are useful consistency evidence but not implementation independence.

This is an AI-assisted source review converted into deterministic tests where practical. The prose review itself is not correctness evidence.
