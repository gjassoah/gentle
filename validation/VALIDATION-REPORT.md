# Validation report

> AI-assisted, machine-checked validation. This report records reproducible evidence; it is not a formal proof of correctness of the complete implementation.

- Generated: `2026-10-18T18:10:31+02:00`
- Git commit: `af0fb91c88a1ce9ffe0887a650a782cd9b4fc545`
- Worktree dirty during run: `yes`
- Validation level: `extended`

## Executed evidence

| Method | Actual result | Runtime |
|---|---:|---:|
| Existing production suite | 13 files, 74 named test blocks, PASS | 3.644s |
| JavaScript syntax checks | PASS | 0.922s |
| Independent oracle unit suite | 14 tests, PASS | 0.149s |
| Bridge protocol and mutation detector regressions | 27 tests, PASS | 3.615s |
| Curated production/oracle differential | 18 algebras; 936 scalar comparisons; 0 failures | 2.406s |
| Independent cup/insertion/bracket/cap oracle | 23995 input pairs; 319133 coefficients; 2304 map ranks; 864 spans; 0 failures | 14.452s |
| Bounded exhaustive differential | 57 canonical algebras; 3705 scalar comparisons; 0 failures | 7.915s |
| Metamorphic/property suite | seed 1592594996; 300 generated examples; 1500 comparisons; 0 failures | 8.085s |
| Mutation and sensitivity checks | 21/21 changes detected; 0 undetected | 1.024s |
| Independent certificate verifier | 5 tests including corruptions, PASS | 0.428s |

## Exact coverage

The curated suite contains 18 serialized algebras and runs 72 algebra/field jobs. It compares `dim(A)`, `dim HH_n`, `dim HH^n`, and `dim HC_n` for characteristics [0, 2, 3, 5] and every degree 0 through 3. This is 288 field-degree pairs and 936 scalar equalities.

The independent product comparison uses 18 curated algebras over characteristics [0, 2, 3, 5], for 72 algebra/field jobs. Input degrees are 0 through 3; nonnegative outputs are bounded by 3. Across 52 operation/degree pairs it compares all pairs of independent cocycle/cycle basis vectors, including boundaries, using canonical path records rather than shared array indices. Bilinearity therefore covers every cocycle/cycle input in these bounded spaces. Zero negative-degree outputs are also compared. Cup, bracket and cap image ranks and the spans of their images for each operation/output degree use independently constructed quotient bases. Insertion is compared on cochains, since it does not generally descend by itself to cohomology. See `validation/oracle/README.md` for conventions and explicit reference values.

The exhaustive generator covers exactly 1–3 vertices, 0–3 labelled arrows, and every subset of composable quadratic relations. It generated 14115 raw presentations, retained 1127 finite gentle presentations, and deduplicated these to 57 classes under vertex and arrow relabelling. Characteristics [0, 2, 3, 5, 7] and degrees 0–3 give 1140 field-degree pairs and 3705 scalar comparisons.

The property suite uses deterministic seed `1592594996`. Each of its 300 generated valid presentations is checked under 5 transformations: vertex and arrow relabelling, arrow/relation/vertex or component order, and JSON round-trip. Materialized degrees are [0, 2]; formula degrees are [0, 3]. The production report also checks differential and mixed-complex identities.

Differential batches require one ordered, identified response per request, matching field/degree metadata, every requested degree row, and nonnegative integer dimensions. Empty, truncated, duplicate, extra, reordered and malformed responses are rejected. Counts come from the validated responses actually compared.

The mutation/sensitivity campaign includes 7 actual mutations in the Python oracle, 2 alternate operation calculations, and 8 output-sensitivity checks. These categories are not a production mutation kill rate. The APS orientation baseline must have genus one and boundary data [[2, -2]] before the sign-reversed output is tested; an incorrect baseline fails validation.

An additional 4 actual Python operation mutations are detected by the new canonical comparison: swapped cup factors, an incorrect insertion exponent, the reversed bracket commutator sign, and an omitted cap sign. Every mutation witness first requires an unchanged oracle/production baseline agreement. This is sensitivity of the independent comparison, not a production mutation kill rate.

The certificate prototype exports the serialized algebra, field, three adjacent chain bases, exact production boundary matrices, claimed dimension, representatives, engine version, commit, and dirty-state metadata. The Python verifier reconstructs the normalized complex from the algebra, compares matrices, checks `b_n b_(n+1)=0`, recomputes the dimension, and verifies representatives modulo boundaries. Corrupted dimensions, matrices, and representatives are rejected.

## Nature of the evidence

- Mathematical theorems and definitions are attributed in `docs/METHODOLOGY.md` and `validation/TRACEABILITY.md`; they are not proved here.
- Oracle, differential, identity, mutation, and certificate results are deterministic machine checks using exact arithmetic.
- “Exhaustive” means exhaustive only inside the finite presentation bound stated above.
- Property testing is deterministic sampling, not exhaustive verification.
- The focused AI-assisted review in `validation/AI-AUDIT.md` is not evidence by itself; only its reproducible tests count here.

## Bugs and unresolved issues

The independent audit found three reproducible issues, now fixed with regressions: F1 (CRITICAL) accepted characteristic strings such as `"02"` selected incorrect cohomology families/rings and fallback dimensions; F2 (MEDIUM) missing bridge responses were accepted; F3 (MEDIUM) the APS orientation sensitivity check rewarded either baseline sign. See `validation/INDEPENDENT-AUDIT.md` for the original counterexamples and remediation status.

Production regressions check that 2, `"2"`, `"02"` and `"0002"` give identical checked reports and formula fallback, including the dual-number degree-one dimension 2 and its exceptional characteristic-two ring. Public formula APIs validate and canonicalize fields, and worker calculations use the parsed field. Valid custom/imported UI field values are normalized; invalid drafts remain editable and are rejected by computation.

Unresolved validation gaps:

- the independent cup, insertion, bracket and cap oracle is bounded to the stated input/output degrees, curated algebras and four characteristics; it is not arbitrary-degree certification;
- the APS ribbon-to-surface extraction has no independent second implementation; its Gauss sum independently reduces a quadratic form built from production windings/intersections, not an independently reconstructed geometric form;
- the oracle and certificate prototype stop at algebra dimension 20 and degree 3;
- the Chromium/CDP integration scripts and the CSSS26 checks of `validation/csss26/` (published examples, convention transport, Bardzell comparisons, linear algebra, surface properties) are not part of this report; `npm run verify:full` runs them together with this suite; and
- no claim is made for arbitrary presentations, degrees, fields beyond Q/prime fields, or the complete browser application.

## Reproduction

```sh
npm run verify        # unit tests, checks, this suite (extended), CSSS26 checks, build
npm run verify:full   # also the browser tests
npm test
npm run validate:quick
npm run validate:extended
npm run validate:certificate
npm run validate:regressions
```
