# Independent adversarial audit

## Scope

Remediation update (2026-09-09): F1–F3 have now been fixed at the user's request. Valid field representations are canonicalized in public formula APIs, the worker uses its parsed field, and UI imports/custom input normalize valid values. Bridge batches require complete ordered IDs, metadata and degree rows. The APS detector requires the independently known baseline -2; campaign reporting distinguishes oracle mutants, operation alternatives and output sensitivity. The original counterexamples below are retained as historical audit evidence. Statements about unchanged production and intentionally failing probes describe the audit baseline, not the remediated workspace. The four reproduction commands now pass as regression checks, and the current validation report records the post-fix run.

Audit date: 2026-09-09. Baseline commit: `0eca504f5b8a2a59c7554ba7370fdd3952e3afb0`, with pre-existing modified and untracked files. This audit concerns the actual workspace sources, including the untracked validation framework, not just that commit. Existing changes were preserved. Production was inspected read-only and remains unchanged.

Read README, METHODOLOGY, AUDIT, TRACEABILITY, VALIDATION-REPORT, MUTATIONS, AI-AUDIT, the mathematical engine/linear/structure/derived modules, worker, oracle, generator, differential bridge, verifier, mutation implementations and relevant mathematical tests. Inspected the characteristic import/custom-input path in the app. This was a bounded adversarial audit, not a complete verification of every UI, export, or derived-classification branch.

Added two standalone probe files after confirming an issue. They use no new dependencies. Finding modes intentionally exit nonzero on the current source. They are not silently added to or substituted for the existing suites.

## Validation claims examined

The framework claims exact low-degree HH homology/cohomology and HC comparisons for 18 curated algebras over 0, 2, 3, 5; exhaustive presentations with 1–2 vertices and at most two arrows; metamorphic invariance; 17 killed mathematical mutants; and bounded semantic reconstruction of homology certificates. The application additionally advertises a full cohomology ring and exact formula fallback.

Fresh executions during this audit:

| Check | Observed result |
|---|---|
| `npm test` | Seven test files passed |
| `python3 -m validation.differential --json` | 936 comparisons, no failures |
| `python3 -m validation.exhaustive --level extended --json` | 108 raw, 25 valid, 11 canonical; 715 comparisons, no failures |
| `node validation/properties.mjs --count 20 --json` | 100 transformation comparisons, no failures |
| `python3 -m unittest validation.verifier.test_verifier` | Five tests passed |
| New Python controls | Six hand-derived algebras in four fields; unrelated certificate rejected |
| New JavaScript controls | 60 circuit/field/multiplicity checks and nonzero operation witnesses passed |

The previous full 300-example property run was not repeated. No report-generation command was used, so the prior report was not overwritten. Passing checks above coexist with F1 below.

## Common-mode risks

The Python oracle has separate path enumeration, multiplication, exact arithmetic and row-major elimination. It imports no production mathematics. This is meaningful implementation independence, supported by the hand controls below. Nevertheless, it adopts the same relative normalization, travel convention, rotation formula and rank-based definition of dimensions. Agreement of dimensions cannot distinguish a global differential sign, an opposite-algebra convention, or every erroneous basis map.

The certificate verifier imports `GentleAlgebra`, `Field`, `matrix_rank` and `multiply_matrices` from that oracle. It is independent of JavaScript, but is not an independent third mathematical implementation. The production bar and Bardzell calculations share multiplication and linear algebra. Ribbon constructors ultimately share `ribbon`; APS, fixture generation and the Gauss sum share extracted windings/intersections.

The differential suites submit numeric characteristics. Metamorphic transformations rename/reorder presentations but do not transform equivalent field representations. Thus the shared assumption that characteristics already have a canonical representation misses F1. The property signature records formula and materialized dimensions separately: invariance of both does not assert their equality. It also deliberately omits ring products/equalities, comparing generator degrees instead.

## Counterexamples found

| ID | Severity | Smallest witness used | Result |
|---|---|---|---|
| F1 | CRITICAL | One vertex, one loop x, relation x²=0, characteristic string `"02"`, report degree 0 | Report marked `checked` contains the wrong full HH* ring and families |
| F2 | MEDIUM | Ground field k; bridge result list replaced with `[]` | Differential harness accepts zero returned computations with no failures |
| F3 | MEDIUM | Existing APS fixture with its boundary winding sign reversed | Mutation campaign still scores 17/17 and calls the orientation mutant killed |

Only F1 is a demonstrated incorrect production mathematical result. F2 and F3 are reproducible validation failures, not evidence that the current bridge or APS implementation produces the injected errors.

## Bugs confirmed

**F1 — accepted field representation selects the wrong cohomology and ring formulas (CRITICAL).**

Locations: `src/linear.js:field`, `src/structure.js:cohomologyFamilies` and `ringPresentation`, `src/worker.js:structuralData`, `formulaReport`, and the `compute` handler. The field parser accepts digit strings with leading zeros and converts them to `BigInt`. The family and exceptional-ring branches instead compare `String(characteristic)` with the literal `'2'`. The worker forwards the original value to those functions while reporting the normalized field.

Minimal presentation (labels are required by production validation):

```json
{"vertices":[{"id":"v0","label":"0"}],"arrows":[{"id":"a0","label":"x0","source":"v0","target":"v0"}],"relations":[["a0","a0"]]}
```

Send `type: "compute"`, this quiver, `characteristic: "02"`, `degree: 0`. This is also reachable through imported field settings and the custom-characteristic input, which retain strings.

Independent derivation: for A=k[x]/(x²), an arbitrary derivation sends x to a+bx. The only constraint is D(x²)=2ax=0. In characteristic two both a and b are free; commutativity makes inner derivations zero. Hence HH¹ has dimension two, with D(x)=1 and xD(x)=x. The normalized cochain differentials vanish in characteristic two. The cup powers of D send tensors of x's to 1, and xD^n sends them to x, giving HH*=k[x,D]/(x²), |x|=0, |D|=1.

Actual output has `mode: "checked"`, `characteristic: "2"`, but `familyHH1: 1` and a nonexceptional ring with generators x in degree 0, d in degree 1 and t in degree 2. Its relations kill x·d and d². This predicts only one degree-one class and misses the nonzero square of D. The materialized HH¹ calculation correctly returns 2. Degree-zero dimension checks do not check the advertised full ring. Requesting degree one ordinarily catches the mismatch and reports an error; this does not protect a degree-zero full-ring report.

Reproduce (intentional assertion failure, exit 1):

```sh
node validation/independent-audit.mjs characteristic
```

A second witness is the disjoint union of the dual numbers and an oriented A12 path algebra, with the same field string and degree 4. The bar calculation hits its existing 900-vector guard; the worker then returns `mode: "formulas"`, characteristic `"2"`, and HH cohomology dimensions `[3,1,1,1,1]` instead of `[3,2,2,2,2]`. Direct-product cohomology splits; A12 contributes one central unit and no positive-degree cohomology. This is an actual incorrect fallback dimension result, not just a presentation discrepancy. No claim is made that this larger fallback witness is minimal.

```sh
node validation/independent-audit.mjs fallback
```

The severity follows the requested definition: an incorrect research ring can be returned with successful displayed checks while existing validation passes. No correction was applied, preserving the counterexample for review. A prospective small correction is to pass the validated characteristic `calculus.F.p` consistently, with regression coverage for reports, ring output and fallback.

## Validation gaps

**F2 — missing bridge responses are accepted (MEDIUM).**

Locations: `validation/differential.py:run` and `validation/exhaustive.py:run`. Both use `zip(requests, results)` without checking matching lengths; returned row counts, row degree fields and job metadata are also not validated before positional comparison.

The required claim is that every advertised algebra/field/degree was compared. Replacing the bridge result list by `[]` gives the curated k test four advertised runs, 16 field-degree pairs, zero comparisons, and `failures: []`. The exhaustive harness similarly advertises 33 quick runs and 132 field-degree pairs with zero comparisons and no failures. The test below replaces only the bridge boundary in memory and asserts that missing results must be rejected. The real bridge was not edited and currently returns its expected results.

```sh
python3 -m validation.independent_audit empty-bridge
```

The oracle bound is not a field-serialization test. The certificate's integer field schema likewise does not exercise F1. Operation equivariance under arbitrary basis changes is not established by the metamorphic suite's dimension/Lie-invariant signatures. This audit exercised cyclic rotation via arrow order and known named operations, but did not add a general equivariant operation comparator for arbitrary labels, parallel-arrow bases or serialization collisions.

**Exhaustive enumeration assessment:** within the stated 1–2 vertex, 0–2 arrow mathematical presentation bound, the generator is exhaustive. Its endpoint Cartesian product includes loops, repeated endpoints and parallel arrows. It iterates all composable quadratic-relation subsets. Canonicalization minimizes over every vertex permutation and arrow permutation, preserving endpoints and relations. Its transition-DAG finite-dimensionality condition is appropriate for quadratic monomial algebras. Within this bound the path count is at most five, so the oracle's 20-path limit cannot silently remove a valid presentation.

An independent classification gives two one-vertex classes (k and the dual numbers) and nine two-vertex classes: k×k; dual×k; one arrow; loop with outgoing tail; loop with incoming tail; dual×dual; Kronecker; two-cycle with one zero composite; two-cycle with both zero composites. Two loops at one vertex cannot give another finite gentle class: the permitted successor choices force a permitted cycle. These are precisely the eleven keys returned. No omitted valid class or generated invalid mathematical presentation was found. This says nothing about all identifier strings or broader configurable bounds.

## Characteristic-specific findings

For the hand controls, the compared tuple is `(dim A, dim HH_0, dim HH^0, dim HH_1, dim HH^1)`:

| Algebra | Characteristic | Hand result |
|---|---|---|
| k | 0,2,3,5 | (1,1,1,0,0) |
| k×k | 0,2,3,5 | (2,2,2,0,0) |
| One arrow 0→1 | 0,2,3,5 | (3,2,1,0,0) |
| Dual numbers | 0,3,5 | (2,2,2,1,1) |
| Dual numbers | 2 | (2,2,2,2,2) |
| Radical-square-zero two-cycle | 0,2,3,5 | (4,2,1,1,1) |
| Kronecker (two parallel arrows) | 0,2,3,5 | (4,2,1,0,3) |

These 120 expected scalar quantities were checked against each of the two implementations. Derivations behind the table:

- HH_0=A/[A,A], HH^0=Z(A). Nonloop arrows are commutators with their source idempotents. Commuting with arrows forces equal vertex coefficients on each connected component.
- For k or k×k the relative radical is zero. For the single arrow there is no positive-degree cyclic tensor, and its one-dimensional arrow-scaling derivation space is entirely inner.
- For dual numbers, let u_n=1[x|…|x], v_n=x[x|…|x]. Then b(u_n)=(1+(-1)^n)v_(n-1) and b(v_n)=0. The cochain endpoint formula similarly alternates zero and multiplication by 2x. This gives the stated ranks independently of Gaussian elimination.
- For the two-cycle, C_1 has basis a[b], b[a], and im b_2 is spanned by their sum, including in characteristic two. Two arrow scalings modulo the one-dimensional inner space give HH¹=1.
- For Kronecker there are no cyclic positive chains; the four-dimensional endomorphism space of the arrow span, modulo simultaneous scalar inner derivations, gives HH¹=3.

Named nonzero controls also check [D,x]=x and [D,T]=-2T for D(x)=x, T(x,x)=1 over Q; T cup T is nonzero. For the two-cycle, z=e0[a|b]-e1[b|a] is a cycle. With D(a)=a, D(b)=0, signed cap gives -a[b], a nonzero HH_1 class. The code checks that chain vector directly, avoiding a guessed quotient-basis sign. This distinguishes zero or global-sign operation substitutes that some identities alone would allow.

Canonical numeric characteristics passed these controls. Accepted alternate characteristic strings were not adequately covered: F1 is precisely a failure there. No invalid division was found. The audit did not test all primes up to the production bound.

## Circuit-specific findings

For a radical-square-zero r-cycle, a length-m closed tensor word has m=rk arrows. Rotation has r distinct positions, not m distinct primitive circuits. In degree m-1, the sign per shift is (-1)^(m-1); consistency around its r rotations requires (-1)^(r(m-1))=1 in the field. Under that condition each distinct rotation appears k times in B. Thus the induced map has rank one exactly when k is nonzero in the field. This distinguishes characteristic dividing r from characteristic dividing the multiplicity k.

The new controls test r=1,2,3 and k=1,…,5 over Q,F2,F3,F5, using actual materialized homology and B. All 60 checks pass, including primitive r=3 in characteristic 3 (k=1 gives nonzero B), and repeated cycles with p dividing k. The largest target homology degree is 15. No large Python tensor products are used at those degrees. Arrow/relation/vertex reversal preserves low-degree dimensions, and `structure` reports one primitive circuit of length r.

For dual numbers specifically, B(v_(2j))=(2j+1)u_(2j+1); B(v_(2j+1))=0 before reduction, while characteristic two reduces every alternating sign to plus. Thus B_2 vanishes in characteristic 3, and B_4 in characteristic 5. The controls and existing tests distinguish these from a map identically zero. No circuit-counting error was found for canonical characteristics in this scope. Arbitrary intersecting complete circuits and much higher degrees were not independently classified. F1 places odd-circuit cohomology families in the wrong degrees for the alternate characteristic-two spelling.

## APS/ribbon findings

The small topological constructions are consistent: for k, two singleton permitted threads form an interval, whose thickening is a disk with two marked sectors; for dual numbers one permitted loop thread visits the vertex twice, giving an annulus with boundary pairs (0,1) and (1,0). In the repository's TT convention these have windings 1 and -1; APS reverses those boundary values. Disconnected components are handled separately before signatures are sorted.

Inspected permitted-thread extraction, missing trivial incidences, sigma/alpha boundary orbits, tree contraction, local turns, intersection matrix, winding parity and quadratic reduction. No independent high-genus surface/line-field reconstruction was completed, and no production APS counterexample was established.

The Gauss sum independently checks the reduction of a supplied quadratic form, not its geometric construction: its inputs are production `curves[].winding` and `intersection`, and it uses the same q(γ)=w(γ)/2+1 rule. A common error in those inputs remains outside that check. This limitation should accompany the phrase “independently checked Arf invariant.” F3 gives a concrete failure of the separate orientation mutation detector.

Literature was inspected at [CSSS v4](https://arxiv.org/html/2311.08003v4) and [APS preprint v3](https://arxiv.org/html/1904.02555v3). CSSS §5.3 equation (5.5) supplies the signed-cap exponent, and Proposition 4.11 distinguishes length from period in the Connes coefficient. These agree with the tested convention after using left-to-right travel order. The accessible APS preprint has different numbering from the repository's cited published theorem numbers; this audit does not claim to have independently verified every numbered attribution or the complete geometric algorithm.

## Certificate-verifier findings

The verifier proves more than internal linear-algebra consistency: it reconstructs path records, chain bases and the defining boundary from the serialized algebra and compares supplied matrices over the field. Supplied representatives are checked as cycles, independent modulo boundaries, and spanning the claimed homology. Representatives may be omitted, in which case only the dimension/boundary part is checked; metadata does not establish provenance.

An attempted unrelated certificate for Q[x]/(x²), degree 1, retained genuine chain bases but set all boundaries to zero and claimed the whole chain space with its standard basis. It is internally a chain complex with internally consistent dimension/representatives, but mathematically has HH_1 dimension two instead of one. The verifier rejected it with “boundary matrices do not match the independently reconstructed differentials.”

```sh
python3 -m validation.independent_audit controls
```

Thus it supplies bounded semantic verification conditional on the Python oracle's mathematics. It is neither merely a b²/rank checker nor a third independent oracle. No semantic certificate forgery was found in the attempted case. Resource-exhaustion attacks and malformed nonmathematical metadata were outside scope.

## Mutation-testing findings

**F3 — the orientation detector can reward the wrong baseline (MEDIUM).**

Location: `validation/mutations.py:run`, the `surface-orientation-reversal` record. Its criterion is `winding != -winding`. It does not assert the expected APS value -2. Feed it the existing fixture with that value changed to +2: the full campaign still reports 17/17, and its orientation evidence reads “APS winding 2; mutant gives -2.” This is a controlled substitution at the fixture-return boundary, not a claim that production currently returns +2.

```sh
python3 -m validation.independent_audit mutation
```

Every listed mutant was inspected:

| Mutants | What is actually exercised |
|---|---|
| chain internal sign, omitted terminal, terminal sign; cochain internal sign, omitted terminal, terminal sign | Six real branches in the Python oracle; changed rank-derived dimensions compared with the unmutated oracle |
| reversed path composition | Compares a*b with b*a in an unmodified oracle multiplication table |
| reversed relation membership | Compares pair membership with reversed-pair membership; does not modify relation lookup |
| permitted/forbidden successor | Compares a membership Boolean with its negation; does not run a mutated finite-dimensionality traversal |
| characteristic two as zero | Compares correct dual-number dimensions in two fields |
| homological degree shift | Shifts an already computed dimension vector and appends None |
| primitive circuit as rotations | Multiplies the expected nonzero dimension by three |
| missing Connes summand | Real oracle rotation-count branch; B_0 becomes zero |
| Gerstenhaber commutator sign | Manually adds reverse production insertion and compares with production bracket |
| cap sign omission | Compares production cap with production contraction on a nonzero witness |
| surface orientation reversal | Checks w != -w, with the reproducible weakness above |
| flipped Arf | Flips a production bit and compares against Gauss reduction of the same production form |

These are not 17 production mutants run against an unchanged detector suite. Several are useful mathematical sensitivity examples, but calling the total a production mutation kill rate overstates its meaning. The original derived test asserts -2 and would detect an actual global orientation flip; F3 is therefore a campaign-quality gap, not an undetected global APS production bug. No syntax-error mutants were involved. The six differential mutants can break square-zero, so rank subtraction for them need not even describe homology; their “dimensions” are failure witnesses, not alternate valid results.

At most five proposed higher-value additions: (1) actual production odd-circuit period mutation tested with characteristic `"02"`; (2) empty/truncated bridge batch and omitted degree rows; (3) production B scaled by -1, tested by named B(x)=1[x] over Q; (4) actual primitive coefficient r versus k mutation, tested by r=3,k=1,p=3 and r=1,k=3,p=3; (5) mutate a ribbon local-turn or intersection rule before both Arf reducers, then compare to a separately derived geometric fixture. These are proposals, not claimed executed mutants.

## Tests added

Added `validation/independent-audit.mjs`, `validation/independent_audit.py`, and this report. No production code or existing test was changed. The finding commands deliberately fail until their underlying issue is corrected:

```sh
node validation/independent-audit.mjs characteristic
node validation/independent-audit.mjs fallback
python3 -m validation.independent_audit empty-bridge
python3 -m validation.independent_audit mutation
```

Passing independent control commands:

```sh
node validation/independent-audit.mjs controls
python3 -m validation.independent_audit controls
```

## Remaining uncertainty

The independent controls do not establish arbitrary cup/bracket/cap operations, arbitrary surface orientation conventions, completeness of APS signatures, every accepted serialization or high-degree circuit family. Existing invariance tests cannot replace those checks. Finite characteristic arithmetic was inspected and small exact ranks checked; arbitrary large coefficients/primes were not exhaustively tested. Browser execution was not performed; worker messages were exercised using the production worker handler, and the UI input path was inspected.

The oracle appears independently implemented, but no authorship/provenance inference can establish independent mathematical assumptions. The scoped enumerator is exhaustive for mathematical presentations, while its response-checking harness has F2. The verifier rejects the attempted unrelated chain complex but shares its semantic reconstruction with the oracle. None of these conclusions should be generalized beyond the stated bounds.

## Overall assessment

Reproducible mathematical errors found; see findings.

Three confirmed findings: one CRITICAL production error (F1, with two output witnesses) and two MEDIUM validation gaps (F2–F3). The minimal mathematical counterexample is the characteristic-two dual-number algebra supplied with the accepted field string `"02"`. Existing successful checks did not establish correctness of its full-ring report.

All three findings are resolved in the subsequent remediation. This does not change the historical audit outcome or establish correctness outside its tested scope.
