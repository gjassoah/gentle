# Mathematical methods and scope

The application computes the Tamarkin–Tsygan calculus of a finite-dimensional gentle algebra following [Chaparro, Schroll, Solotar and Suárez-Álvarez, *The Hochschild (co)homology of gentle algebras*, J. Algebra 708 (2026) 138–231](https://doi.org/10.1016/j.jalgebra.2026.04.058) (cited as CSSS26; earlier version arXiv:2311.08003), and its complete derived invariant following [Amiot, Plamondon and Schroll](https://doi.org/10.1007/s00029-022-00822-x) (cited as APS). The table lists what is computed for each result of CSSS26; the [concordance](https://github.com/gjassoah/gentle/blob/main/docs/csss26/CONCORDANCE.md) records how these locators correspond to the arXiv version.

| CSSS26 | Implementation |
|---|---|
| Definition 2.1 | Gentle conditions, quadratic monomial relations, finite dimensionality |
| §2.1, Proposition 3.1 | Bardzell's resolution |
| Theorem 3.12 | All cohomology families; dimensions compared with both resolutions in the computed range |
| Theorem 4.4, Corollary 4.5 | Homology from the chain complex, and in all degrees from complete circuits |
| Proposition 4.11 | Connes operator on the normalized bar complex, and its coefficients in all degrees |
| Propositions 4.12–4.13 | De Rham dimensions and Connes ranks |
| Theorem 4.14 | Cyclic homology from the cyclic total complex, compared with the degeneration formula |
| §5.1, Theorem 5.8 | Cup product on cochains; presentation of the cohomology ring |
| §5.3, equation (44), Theorem 5.17 | Cap product with its sign |
| §6 | Gerstenhaber bracket; bracket table, centre and derived series of HH¹ |
| §7 | Marked ribbon graph, boundary and winding data, genus; the AAG invariant of [Avella-Alaminos and Geiss](https://doi.org/10.1016/j.jpaa.2007.05.014) |

## Input and fields

The input is a finite quiver, with distinct vertex labels and distinct arrow labels, together with zero relations given by composable pairs of arrows. Loops and parallel arrows are allowed. The gentle conditions are checked locally: at most two arrows start and at most two end at each vertex, and every arrow has at most one allowed and at most one forbidden successor, and likewise for predecessors. The algebra is finite-dimensional exactly when the graph of allowed transitions between arrows has no oriented cycle; inputs failing this test are rejected. The surviving paths, including the idempotents e(i), form the basis of A. Connected components are treated separately where CSSS26 assume connectedness.

The ground field is ℚ or 𝔽ₚ for a prime p ≤ 2³¹ − 1, with exact arithmetic throughout. Since all structure constants lie in the prime field, dimensions and operations hold over every field of the same characteristic, but coefficients must lie in the prime field.

## Conventions

The path convention is a global preference. The default is left modules, as in CSSS26 (p. 141): α followed by β is written β·α. For right modules it is written α·β, in travel order. The separator makes arrow labels unambiguous and does not change multiplication. Relations, typed presentations, representatives and reports follow this preference. Typed presentations declare `convention: left` or `convention: right`; without a declaration they use the current preference. Stored quivers always retain arrow ids in travel order, so changing the preference changes neither the algebra nor its computation. Mathematical displays use native MathML and the bundled Latin Modern Math font. Card statements in the interface and the Help index follow the same path setting; card and Help mathematics is converted from the approved Markdown and LaTeX subset at build time.

Let E be the subalgebra spanned by the idempotents and J the radical. The cochains in degree n are the E-bimodule maps J^{⊗n} → A, with the tensor power taken over E; a basis element sends one composable tuple of radical paths to a parallel path and the other tuples to zero. A displayed cochain [a₁|…|aₙ] ↦ b is such a map; thus [ε|ε] ↦ e(1) and [ε|ε] ↦ ε are different cochains. Chains a₀[a₁|…|aₙ] have a₁, …, aₙ in J and a₀ in A, with cyclic total path. The differentials are the normalized Hochschild differentials; in the Bardzell resolution the tuples are consecutive arrows with zero products, and only the end terms of the differential survive. Classes in HH⁰(A) = Z(A) are displayed as central elements. A label that could be misread, such as an arrow named e(1), is printed as path("e(1)").

Write R(a) for a path written in the opposite order and sₙ = (−1)^{n(n−1)/2}. The display transport Tₙ sends a cochain [a₁|…|aₙ] ↦ b to sₙ [R(aₙ)|…|R(a₁)] ↦ R(b), and a chain a₀[a₁|…|aₙ] to sₙ R(a₀)[R(aₙ)|…|R(a₁)]. The sign multiplies the coefficient in the selected field. This transport satisfies dT = −Td, bT = −Tb and BT = TB. It preserves cup, bracket, cap and the Lie derivative on (co)homology, so coordinates in the transported bases, including operation results and Connes matrices, stay the same.

For a cyclic class of total degree N, the summand Cₖ with k = N−2j is transported by (−1)ʲTₖ. The extra summand sign makes the total differential b+B anticommute with the transport. Its combined coefficient sign is (−1)^{j+k(k−1)/2}, equivalently (−1)^{N(N−1)/2}. The leading chain factor stays leading; only its path notation and the order of the bar factors change. Surface lists are read in the chosen order; the AAG pairs, windings and genus are unchanged. The path-count matrix retains rows indexed by sources and columns by targets in input vertex order.

Quotient bases come from an exact kernel computation and the extension of a basis of boundaries to a basis of cycles. They depend on the order in which vertices and arrows were entered: renaming, reordering or reimporting a presentation can change the coordinates, so keep representatives together with their quiver. The bases of the ring and family panels follow the generators of CSSS26 and differ from these.

## Operations

For f of degree p, g of degree q, and z = a₀[a₁|…|aₙ], the formulas in travel order (right modules) are:

- cup product: (f ∪ g)(a₁, …, a_{p+q}) = f(a₁, …, aₚ) g(a_{p+1}, …, a_{p+q});
- Gerstenhaber bracket: [f, g] = f ∘ g − (−1)^{(p−1)(q−1)} g ∘ f, the graded commutator of f ∘ g = Σᵢ (−1)^{(q−1)i} f(…, g(…), …), the sum over the insertion slots i = 0, …, p−1;
- cap product: f ∩ z = (−1)^{p(n+p)} a₀ f(a₁, …, aₚ)[a_{p+1}| … |aₙ], with the sign of CSSS26 (44), and zero for p > n;
- Connes operator: B(z) = Σᵢ (−1)^{ni} e[aᵢ| … |aₙ|a₀| … |a_{i−1}], with e the idempotent at the start of aᵢ, and B(z) = 0 when a₀ is an idempotent;
- Lie derivative: L_{f} = I_{f} B − (−1)^p B I_{f}, where I_{f} is the cap product without its sign. With this normalization [L_{f}, I_{g}] = I_{[f,g]} on homology. The normalization is the application's own; CSSS26 contains no formula for L_{f}.

For left modules the cap product is the right action z ∩ f. In the path notation of CSSS26 (44), p. 194, (a, x) ∩ (y, b) = (−1)^{(n+p)p}(ab, u) when x = yu, where x has length n and y length p, and is zero otherwise. Products here are written from right to left. The displayed representatives are transported as above; the bracket and Lie derivative retain their graded signs with the chosen order of factors.

Operations are evaluated on representing cocycles and cycles. The result is checked to be a cycle and then expressed in the basis of its group, which is computed on demand when its degree lies outside the computed range.

## Cyclic and de Rham homology

In degree n the cyclic total complex is C_{n} ⊕ C_{n−2} ⊕ C_{n−4} ⊕ …, with differential b + B, and homology is computed from the total spaces in degrees n − 1, n and n + 1. Nothing is divided by n, so every characteristic is allowed.

The formulas used in all degrees are as follows. Every vertex gives a class in HH₀(A) with B = 0. Every primitive complete circuit C of length r gives, for each k ≥ 1 with (−1)^{(kr+1)r} = 1 in the field, classes x_{C,k} in degree kr − 1 and y_{C,k} in degree kr with B(x_{C,k}) = k·y_{C,k}; these are all the classes. De Rham homology is ker B_{n} / im B_{n−1}, and HC_{n} ≅ coker B_{n−1} ⊕ H^{dR}_{n−2} ⊕ H^{dR}_{n−4} ⊕ …. When both adjacent groups are in the computed range, the Connes matrix and a de Rham basis are also computed explicitly.

## Cohomology in all degrees and the ring

For finite-dimensional input the families of CSSS26 Theorem 3.12 are I (units of components), II (maximal closed permitted paths), IV (arrow derivations for the arrows outside a spanning forest), VI (maximal forbidden paths parallel to permitted paths, with distinct end arrows) and VII–VIII (complete circuits); families III and V do not occur. A circuit of length r gives a family with step r if r is even or the characteristic is 2, and 2r otherwise. The ring presentation lists the generators from I, II, IV and VI and the first element of each family VII, the products that survive, and the identifications of CSSS26 Theorem 5.8; the ring of a disconnected algebra is the product of the rings of its components. In characteristic 2 a dual-number component has cohomology ring k[c, t]/(c²) with c in degree 0 and t in degree 1, and its arrow derivation is c·t.

Dimensions in any degree up to 100 000 are evaluated from these formulas without constructing complexes.

## Ribbon graph and surface

The vertices of the ribbon graph are the maximal permitted paths, completed by trivial threads where an incidence is missing; each quiver vertex occurs twice, which defines the edges. The order of the visits along a thread gives the cyclic orders, with the closing sector marked. Boundary components are the orbits of σ∘α, where α pairs the two occurrences of a vertex and σ is the cyclic order. A boundary with n marked and m unmarked sectors contributes the AAG pair (n, m) and has winding m − n in the convention of CSSS26 §7. The genus g follows from χ = |G₀| − |G₁| = 2c − 2g − b. The global dimension of A is infinite exactly when there is a complete forbidden circuit, and is otherwise the length of a longest forbidden path.

The Surface tab draws each component in the standard form of APS p. 23: handles on the left, the b boundary components above and the p punctures below, without marked points; the punctures are the unmarked boundary components of the ribbon graph, and the opening in each handle is not a boundary component. The curves αᵢ, βᵢ form a symplectic basis after the boundaries are capped and the punctures filled; dashed segments lie on the hidden sheet. The drawing depends only on (g, b, p) and is not identified with the cycle basis γⱼ used for the winding data below.

## Complete derived invariant

The invariant is that of APS Theorem 7.4, computed with the winding rule of APS Lemma 3.18 and the quadratic form of APS Lemma 7.5, for every finite-dimensional gentle algebra, including those of infinite global dimension. Each connected component has a signature: its genus and the sorted pairs (n, w) of its boundary components, punctures included with n = 0. Here n counts the ○-marked points and w is the winding in the orientation of APS, w = n − m, which is the negative of the convention of the Surface tab; the windings sum to 4 − 4g − 2(b + p) by APS23, Proposition 3.20(5), p. 13. Keeping the punctures implements the classification of line fields in APS Theorem 7.3 used in the proof of Theorem 7.4. The signature also records:

- for genus 1, the gcd of the windings of the handle curves and of w + 2 over all boundary components (with gcd(0, …, 0) = 0);
- for genus at least 2, whether some winding is odd; if all are even, whether some boundary winding is 0 mod 4; otherwise the Arf invariant.

Two algebras are derived equivalent exactly when their multisets of component signatures agree. Comparison is offered only for two algebras over fields of the same characteristic. The examples APS Λ₁ and Λ₂ (APS §9) have the same boundary data and gcd 0 and 2, so they are not derived equivalent.

APS Remark 7.6 notes that their methods give no algorithm for finding a symplectic basis from the quiver. The application uses the following procedure.

1. Choose a spanning tree of the ribbon graph. The fundamental cycles, a non-tree edge followed by the path back in the tree, form a basis of the first homology of the punctured surface.
2. Each turn at a thread contributes +1 if the departing half-edge precedes the arriving one in the order along the thread and −1 otherwise (APS Lemma 3.18); the winding of a cycle is the sum of its turns.
3. Contracting the tree leaves a bouquet of the fundamental cycles with a cyclic word; two cycles intersect once mod 2 exactly when their endpoints alternate. The intersection matrix is checked to have rank 2g on a basis of 2g + b + p − 1 cycles.
4. For genus 1 the gcd is taken over the windings of the non-separating fundamental cycles and the numbers w + 2; moving a curve across a boundary component changes its winding by a multiple of w + 2. Separating cycles are omitted, since their windings would introduce spurious factors of 2.
5. Since the parity of the winding is additive mod 2, the fundamental cycles detect an odd winding. In the Arf case, q(γ) = w(γ)/2 + 1 mod 2 is extended by q(x + y) = q(x) + q(y) + x·y, checked to vanish on the radical, and the Arf invariant is computed by symplectic elimination.
6. The computation is repeated with a second spanning tree and must give the same signature.

This computation does not depend on the degree bound or on the limits of the calculus; it is bounded by 80 vertices, 160 arrows and 320 relations. A failed check produces an error and no verdict. The output contains the cycles, turns, windings, intersection matrix and quadratic form.

## Checks and limits

Every group is computed together with both adjacent differentials. Each computation checks d² = 0 and the identities of the mixed complex, that the bar and Bardzell resolutions give the same dimensions, and that both agree with the circuit formulas; Connes ranks and de Rham coordinates are compared where the adjacent groups are computed. These checks share code with the computation and do not certify it.

The bar computation is limited to 200 basis paths of A, 900 basis elements per chain space, 150 000 enumerated tuples per space, 1.1 million entries per differential and degree 128; the bracket table of HH¹ to dimension 35. When one of the limits on chain spaces is reached, the dimensions are still computed exactly from the circuit formulas and the representatives are reported as unavailable; an algebra with more than 200 basis paths is rejected with an error. No group is ever reported as zero for lack of computation.

The application does not compute periodic or negative cyclic homology, does not accept coefficients outside the prime field, has no parser for polynomial expressions in the ring, and does not draw curves on the surface interactively. Keep the exported JSON report, which records the versions and the representatives, with any calculation used in research.

## Provenance

The computation engine and the first interface were written by ChatGPT 6 Astra through OpenAI Codex (5–6 September 2026) and validated on 8–9 September 2026 with ChatGPT 5.6 Sol and ChatGPT 6 Astra: by independent low-degree computations, differential, exhaustive, property and mutation testing, and certificates checked by a separate verifier (see the [validation report](https://github.com/gjassoah/gentle/blob/main/validation/VALIDATION-REPORT.md)). The tests reproduce the pair Λ₁, Λ₂ of APS §9 and a genus-two pair with equal boundary data and different Arf invariants, whose Arf invariants are checked by Gauss sums. The interface of version 0.5.0 (October 2026) was written by GPT-6.1 Sol through Codex and reviewed with Claude Opus 5.5. Version 0.6.0 (October 2026, engine 0.5.0) rests the computation on the published CSSS26 instead of the preprint: an audit against CSSS26 by GPT-6 Astra through Codex, reviewed with Claude Opus 5.5, recomputed the examples and tables of CSSS26, found and fixed three defects in the handling of requests and in the naming of paths, and added an independent implementation of the cup and cap products and the Gerstenhaber bracket to the validation suite; the [concordance](https://github.com/gjassoah/gentle/blob/main/docs/csss26/CONCORDANCE.md) records the correspondence between the two versions of CSSS. Version 0.7.0 adds the choice between left and right modules, written by GPT-6 Astra through Codex and reviewed with Claude Opus 5.5; the computation is unchanged. The work was directed by Gustavo Jasso. No person has independently verified the implementation.
