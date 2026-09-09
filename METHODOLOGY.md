# Mathematical methods and scope

This application implements computations associated with [Chaparro–Schroll–Solotar–Suárez-Álvarez, arXiv:2311.08003v4](https://arxiv.org/html/2311.08003v4). The table below distinguishes direct computations from descriptions by the paper's formulas.

| Paper | Application implementation |
|---|---|
| Definition 2.1 | All local gentle conditions, quadratic monomial relations, and finite-dimensionality validation |
| §2.1, Proposition 3.1 | Bardzell's quadratic monomial resolution, explicitly implemented |
| Theorem 3.12 | All homogeneous cohomology families; dimensions checked against both resolutions in the displayed range |
| Theorem 4.4 / Corollary 4.5 | Homology from chain complexes and all-degree complete-circuit formulas |
| Proposition 4.11 | Normalized bar Connes operator and all-degree circuit coefficient formulas |
| Propositions 4.12–4.13 | De Rham dimensions, Connes ranks, and a description of the kernel/cokernel families |
| Theorem 4.14 | Cyclic homology from the actual cyclic total complex; independently checked against the degeneration formula |
| §5.1 / Theorem 5.8 | Cochain-level cup product; a finite ring presentation, including the characteristic-two dual-number exception |
| §5.3 / Theorem 5.17 | Cap evaluation with the sign in equation (5.5), followed by homology projection |
| §6 | Gerstenhaber insertions and full HH¹ bracket table, center and derived series |
| §7 | Combinatorial marked ribbon graph; boundary, winding, genus and AAG data; generator-degree correspondence |

## Input and coefficient fields

An input is a finite quiver with distinct vertex labels, distinct arrow labels, and a set of composable length-two monomial zero relations. Parallel arrows and loops are supported. At most two arrows enter or leave a vertex. Every arrow has at most one allowed and one forbidden successor, and at most one allowed and one forbidden predecessor.

Finite dimensionality is checked by testing the directed graph of **allowed arrow transitions** for a cycle. An allowed transition cycle produces arbitrarily long nonzero paths and is rejected. All surviving paths, including the vertex idempotents, form the algebra basis. A multiplication table records concatenation or zero. Components are handled independently where the paper assumes connectedness.

Characteristic zero uses reduced `BigInt` rational numbers. Positive characteristic uses `BigInt` arithmetic modulo a verified prime p, with 2 ≤ p ≤ 2147483647. Fractions require invertible denominators. There is no floating-point linear algebra. All structure constants lie in the prime field. Scalar extension gives dimensions and operations over other fields of the same characteristic, but this interface does not accept coefficients outside the prime field.

## Conventions and bases

The application writes and multiplies paths in **left-to-right travel order**: α·β means follow α, then β. The paper writes the same travel path as βα. All tensor formulas below use the application's multiplication convention. Paper representatives cannot be substituted for row-reduced coordinates without translating the conventions and basis.

Let E be the vertex algebra and J the radical, spanned by the positive-length surviving paths. The cochain space in degree n is Hom over E-bimodules from J tensor over E n times to A. Its elementary basis consists of a composable radical-path tuple and a parallel output path. In degree zero, it consists of the closed surviving paths. The chain space has basis a₀[a₁|…|aₙ] whose full path is cyclic, with a₁,…,aₙ in J and a₀ in A.

The standard normalized Hochschild differentials are assembled from the multiplication table. The first and last terms act on the output in cohomology; the last chain term rotates the last tensor factor past a₀. Internal multiplication terms carry alternating signs. For the small resolution, tuples are consecutive arrows whose adjacent products are relations, and there are only the endpoint differential terms.

Quotient bases are obtained by exact kernel computation and extension of an independent boundary basis to a cycle basis. Their order is deterministic for the stored input order. Renaming, reordering or reimporting a presentation can change its named coordinates; always keep the representatives and the quiver together.

### Operations

For f of degree p, g of degree q, and z = a₀[a₁|…|aₙ]:

- Cup: f(a₁,…,aₚ) g(aₚ₊₁,…,aₚ₊q).
- Insertions: sum over slots i = 0,…,p−1, with sign (−1)^((q−1)i), followed by the usual graded commutator. An inserted idempotent gives zero under normalized cochain evaluation. Degree-zero radical outputs may be inserted.
- Cap: (−1)^(p(n+p)) a₀ f(a₁,…,aₚ)[aₚ₊₁|…|aₙ]. The factor is the sign of the paper's equation (5.5). A cap with p > n is zero.
- Connes: sum of all cyclic rotations of [a₀,…,aₙ], with the local vertex idempotent inserted first and coefficient (−1)^(ni). If a₀ is an idempotent the normalized result is zero.
- Lie derivative: define I_f to be **unsigned** cap evaluation and L_f = I_f B − (−1)^p B I_f. The test suite verifies [L_f,I_g] = I_[f,g] on homology with the graded endomorphism commutator. This is an explicit normalization; it should not be confused with the signed contraction symbol used in §2.2 of the paper.

Operations evaluate actual cocycles/cycles. Projection first verifies that the result is a cycle, then gives coordinates modulo boundaries. Output degrees outside the displayed range are computed on demand. This is not a heuristic based only on dimensions.

## Cyclic and de Rham homology

The degree-n cyclic total complex is the direct sum of C_n, C_(n−2), C_(n−4), and so on. Its differential combines b with B; the B term from the top summand is omitted. Both the degree n−1 and n+1 total spaces are included before taking homology. No division by n is used, so positive characteristics are supported.

The independent circuit formula is particularly simple for finite-dimensional gentle algebras. Each primitive complete circuit of length r and each k ≥ 1 satisfying (−1)^((kr+1)r) = 1 supplies a pair of homology classes in degrees kr−1 and kr. Connes maps the lower one to k times the upper one. Vertex classes supply degree-zero homology and are killed by B. There are no cocomplete permitted circuits in this finite-dimensional setting.

De Rham homology is ker B_n / im B_(n−1). A circuit pair survives in it precisely when k vanishes in the field. The cyclic dimension is the dimension of coker B_(n−1), plus the de Rham dimensions in degrees n−2, n−4, etc. The edge index here follows the E²-page description in §4.3. Where both adjacent homology groups are in the displayed range, the actual Connes matrix and de Rham basis coordinates are also computed and included in JSON exports.

## All-degree cohomology and the ring

The finite-dimensional case has component units (I), maximal closed permitted paths (II), spanning-forest complement arrow derivations (IV), maximal forbidden paths parallel to permitted paths with distinct end arrows (VI), and complete-circuit families (VII–VIII). Families III and V are absent. A circuit's step is r if r is even or the characteristic is two, and 2r otherwise. The families start at the step and one above the step.

The ring panel lists the finite set of generators from I/II/IV/VI and the first element of each VII family. Its presentation records exactly the surviving quadratic monomials and their identifications as in Theorem 5.8. Each disconnected component has its own unit and the full ring is their direct product. An isolated dual-number component in characteristic two is k[c,t]/(c²), with degrees zero and one; the arrow derivation is c·t, rather than a further independent generator.

The all-degree formulas describe unbounded mathematical families. The query control accepts n up to 100000 as a practical UI limit. It does not materialize bar representatives or evaluate symbolic polynomials in that degree.

## Marked ribbon graph and surface

Ribbon vertices are maximal permitted paths, together with trivial threads supplying missing incidences. A half-edge is an occurrence of a quiver vertex in a thread: repeated visits remain distinct. Each quiver vertex occurs exactly twice, giving the edge-pairing involution α. The linear visit order around a thread gives the cyclic permutation σ, and the closing sector is marked. For an isolated quiver vertex there are two trivial threads.

Boundary components are orbits of σ∘α. For each boundary, count its marked sectors n and unmarked sectors m. This gives its AAG pair (n,m) and its winding m−n in the boundary convention of §7. The thickened ribbon graph has Euler characteristic |G₀|−|G₁|. The total genus follows from χ = 2c−2g−b. The interface lists all cyclic orders and pairings, rather than asserting that an arbitrary planar graph drawing is a surface embedding. Interactive curves, intersections, and geometric cup/cap animations are not implemented.

Global dimension is infinite precisely when a complete forbidden circuit exists; otherwise it is the longest finite forbidden path length (zero for a semisimple algebra).

## Complete derived invariant (Amiot–Plamondon–Schroll)

The second source is [Amiot, Plamondon and Schroll, *A complete derived invariant for gentle algebras via winding numbers and Arf invariants*](https://doi.org/10.1007/s00029-022-00822-x). The implementation uses Theorem 7.4, the local winding rule of Lemma 3.18, and the quadratic refinement of Lemma 7.5. It applies to finite-dimensional gentle algebras, including infinite global dimension. Connected components are classified individually; the invariant of a disconnected algebra is the sorted multiset of component signatures. Comparison concerns bounded derived categories over a common ground field. Different selected characteristics yield an unavailable comparison, not a claim of equivalence or inequivalence over a common field.

For each component the signature retains genus and the sorted boundary pairs `(n,w)`, including punctures with `n=0`. Here `n` counts ○-marked points; the alternating •-marked points are implicit. **APS uses the opposite boundary orientation to the TT Surface panel: `w = n−m`.** The sum of boundary windings is `4−4g−2(b+p)`. Retaining puncture windings implements the full line-field classification of Theorem 7.3 and the proof of Theorem 7.4, even though the displayed boundary permutation condition in Theorem 7.4 abbreviates its index range to the marked boundaries.

The remaining data are:

- Genus zero: no additional invariant.
- Genus one: the nonnegative gcd of handle windings and all `w(boundary)+2`, with gcd of all zeros equal to zero.
- Genus at least two: whether an odd winding occurs; if all are even, whether a boundary winding is `0 mod 4`; otherwise the Arf invariant when all boundary windings are `2 mod 4`.

### From the quiver to winding and intersection data

Remark 7.6 of APS notes that the paper's methods do not give an algorithm for extracting a geometric symplectic basis from a quiver. The following ribbon-graph procedure is this implementation's algorithm for that step; it is not pseudocode supplied by the paper.

1. Construct the marked ribbon graph described above and choose a spanning tree. Each non-tree edge followed by the tree return path is an embedded simple cycle. These fundamental cycles give an integral basis of the punctured surface's first homology.
2. At each thread vertex, read the arriving and departing half-edges in the linear thread order. A turn contributes `+1` if the departing position precedes the arriving position and `−1` otherwise. This implements the marked-point left/right rule of Lemma 3.18. Sum these contributions around each cycle. Reversing a cycle negates its winding and does not change the classification.
3. Contract the spanning tree, splicing the ribbon cyclic orders at each contracted edge. The remaining cyclic word is a bouquet of the fundamental cycles. Two distinct chord endpoints alternate exactly when their mod-two intersection is one. Check that the intersection matrix has rank `2g` and the cycle basis has size `2g+b+p−1`.
4. For genus one, take the gcd of the windings of nonseparating fundamental cycles (those with a nonzero intersection row) and the boundary corrections `w+2`. This is the handle-basis gcd: after capping boundary holes, these cycles generate integral torus homology; changing a representative around a hole changes the winding by multiples of its `w+2`. Separating fundamental cycles must be omitted—using their uncorrected winding would give spurious factors of two.
5. Winding parity is a homomorphism on mod-two homology, so testing the fundamental cycle basis detects the odd branch. In the Arf branch, set `q(γᵢ)=w(γᵢ)/2+1 mod 2`. Evaluate it on arbitrary binary combinations with `q(x+y)=q(x)+q(y)+x·y`. Symplectic elimination tracks these combinations and computes the product sum of quadratic values on symplectic pairs. Check that the refinement vanishes on the radical before passing to the capped surface. This avoids treating a vector-space basis as a geometric symplectic basis.
6. Repeat with a reverse-order spanning tree and require the same signature. Only canonical component data enter the comparison; cycle names and basis-dependent matrices are exported as calculation evidence.

The derived calculation runs independently of Hochschild degree bounds. It constructs maximal permitted threads directly from allowed successors, so it is independent of the calculus engine’s 200-path limit. Inputs are bounded by the editor/import limits of 80 vertices, 160 arrows and 320 relations. A limit or failed consistency check produces an explicit error and no equivalence verdict. The output includes the cycle walks, local turns, windings, intersection matrix, quadratic reduction when relevant, and check results. The separate derived LaTeX export includes the compared presentations and their invariants; the calculus LaTeX export also includes derived data once computed.

### Validation and representatives

In positive degree, a displayed cochain `[a₁|…|aₙ] ↦ b` sends the normalized tensor of inputs `a₁,…,aₙ` to the output path or idempotent `b`; unlisted inputs map to zero. Thus `[ε|ε] ↦ e(1)` differs from `[ε|ε] ↦ ε` because the outputs differ. Chains use `a₀[a₁|…|aₙ]`, with `a₀` written before the bracket.

The tests reproduce the first pair of APS §9: one-boundary genus-one surfaces with two marked points and winding `−2`, but gcd invariants 0 and 2. Additional ribbon fixtures cover both parity branches. Two genus-two ribbon graphs with ordered threads `[0,1,2,3,4]` and respectively `[0,1,2,3,4]` or `[0,3,4,1,2]` have the same boundary pair `(2,−6)` but Arf invariants 1 and 0. Enumerating the quadratic form's Gauss sum independently checks these Arf values. Generated presentations test independence from identifiers, order and spanning-tree choices; these tests do not constitute an independent mathematical certification of the new ribbon algorithm.

Representative terms now export structured input and output paths, including the distinction between idempotents and positive-length paths. For dual numbers in characteristic two, each positive degree has the cochains `[ε|…|ε] ↦ e(1)` and `[ε|…|ε] ↦ ε`, and the chains `e(1)[ε|…|ε]` and `ε[ε|…|ε]`. The interface emphasizes the cochain output or leading chain factor. In degree zero, a cochain with central value ε has input `e(1)`, not ε; this domain-label error has also been corrected.

Arrow labels can themselves resemble idempotents or products. For example, an arrow named `e(1)` previously made two different characteristic-two representatives print identically. Ambiguous paths now use explicit notation such as `path("e(1)")`, `path("a·b")` for one arrow, and `path("a", "b")` for a two-arrow path. Cochain coefficients are displayed with the output value, after the mapping arrow. Every exported term also records its chain-space coordinate. Before returning a basis, the engine checks that its printed representatives are distinct and that their serialized coordinates reproduce the computed vectors.

## Standard surface drawings

The Surface tab draws each connected component separately in the template of APS p. 23, immediately above Theorem 7.3. The parameter b counts ordinary boundary components; p counts punctures (the unmarked boundary cycles in the ribbon description). Handles lie on the left, boundary collars at the upper right, and puncture ends below. No marked points are drawn. The hole in each handle is represented by a lens-shaped opening, not an additional boundary component.

The αᵢ and βᵢ are standard geometric longitude/meridian pairs. A βᵢ return segment is dashed to denote the hidden sheet, so a crossing with that segment is a projection crossing rather than an additional intersection on the surface. After capping boundary circles and filling punctures, these curves give a symplectic basis; the boundary-parallel and puncture-parallel cⱼ are drawn separately. Their labels belong to the standard schematic model. These pictures do not supply a homeomorphism identifying the drawn α/β curves with the algorithm's γ ribbon-cycle basis or assign winding numbers to the drawn α/β curves.

The diagrams are resolution-independent SVGs, with a pre-generated static catalog and a cached fallback outside its range. Their generation depends only on (g,b,p), not the quiver labels, field or cohomological degree. The Surface tab obtains component types directly from maximal permitted threads, avoiding the materialized calculus limits. See README for the generator command and range options.

The diagram catalog includes green light/dark variants selected with the application theme. Genus-zero components use centered boundary and puncture arrangements and mirrored end caps. Positive-genus components retain the APS ordering, with a smooth elliptical cap on the first handle. These changes affect the schematic drawing only.

Degree-zero cohomology representatives are displayed directly as central elements under the canonical identification HH⁰(A) = Z(A). In particular, the dual numbers have the displayed basis e(1), ε in every characteristic. The repeated input idempotent of the corresponding degree-zero cochain maps is retained in structured JSON data but omitted from the primary representative display and plain-text/LaTeX representative strings.

## Checks, resource limits and research use

Each successful materialized computation checks the differential-square and mixed-complex identities in the computed spaces, dimension agreement of the two resolutions, and agreement with the circuit formulas. Connes ranks and de Rham coordinates are cross-checked where their adjacent displayed groups are available. Both adjacent differentials are always present before a Hochschild or cyclic group is reported. The test suite checks additional calculus identities and known characteristic-dependent examples. These checks share some implementation components; they are not independent proof certificates.

Resource guards: 200 algebra paths, 900 vectors per complex space, 150000 tuple-enumeration steps per space, 1.1 million entries per differential, and materialized degree at most 128. The full HH¹ bracket table has a separate dimension-35 guard. Prime-field, matrix and resource errors are visible, and partial results are not converted into zero invariants. If the overall bar report hits a resource limit, the worker returns exact circuit-formula dimensions with a prominent limitation message and null representatives; it does not claim the bar checks passed. The ring and surface data remain available. Individual operation failures remain errors. Calculations run in a cancellable worker.

This application implements the listed invariant computations but is not independently mathematically certified. The symbolic ring/family basis is distinct from the materialized bar basis. A polynomial-expression parser, unlimited symbolic operations in arbitrary degree, interactive surface curves, and coefficient-field extensions remain outside this version. Periodic/negative cyclic homology, which are not computed in the source paper here, are not included. Save the JSON report, engine version, and representatives alongside any research calculation.
