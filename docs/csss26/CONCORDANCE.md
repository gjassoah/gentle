# Concordance: arXiv:2311.08003v4 → CSSS26

CSSS26: C. Chaparro, S. Schroll, A. Solotar, M. Suárez-Álvarez, *The Hochschild (co)homology of gentle
algebras*, J. Algebra 708 (2026) 138–231, doi:10.1016/j.jalgebra.2026.04.058. The preprint arXiv:2311.08003v4
(18 August 2024) has a different title (*The Hochschild cohomology and the Tamarkin–Tsygan calculus of gentle
algebras*). Pages below are journal pages of CSSS26. Every row marked "checked" was read on the rendered CSSS26 page or
confirmed by an independent audit that read CSSS26 directly.

## Results used by the application

| v4 locator | CSSS26 locator | Used for | Change between versions | Status |
|---|---|---|---|---|
| Definition 2.1 | Definition 2.1, pp. 141–142 | gentle conditions (a)–(d), finite dimensionality (e) | none in content | checked (audit, item 4) |
| §2.1, equation (1) | §2, equation (2), p. 143 | Bardzell resolution, generators Γₙ | equation numbers shift by one throughout (CSSS26 (n+1) = v4 (n)) | checked (audit, item 2) |
| Proposition 3.1 | Proposition 3.1, equation (3), p. 144 | the complex computing HH* from the Bardzell resolution | none | checked (audit, item 2) |
| — | Conventions, p. 141: "Paths will be written from right to left (as compositions of functions)" | the application writes paths in travel order (left to right); a signed transport between the conventions is verified in `codex/audit05/conventions.mjs` | none | checked (audit, item 1) |
| Theorem 3.12 | Theorem 3.12, pp. 158–159 | families HI–HVIII, steps and characteristic cases | none | checked (audit, item 2) |
| Corollary 3.13 | Corollary 3.13, p. 159 | families III and V absent for finite-dimensional input | none | checked (audit) |
| Theorem 4.4, Corollary 4.5 | Theorem 4.4, p. 169; Corollary 4.5, p. 170 | Hochschild homology in all degrees | none in content | checked (audit, item 2) |
| equation (32) | equation (33), p. 174 | normalized Connes operator | the second sum changes sign ((−1)^{ni} with a minus in v4, +(−1)^{p(i+1)} in CSSS26); that term contains a factor 1 and vanishes in the normalized complex used by the code, so the computation is unaffected | checked on the rendered page |
| Proposition 4.11 | Proposition 4.11, equation (36), p. 175 | Connes map on basis classes, B(C_lt′, C_lt) = (m/r)⟦C⟧ | proof signs changed with (33); statement unchanged | checked (audit) |
| Propositions 4.12, 4.13 | Propositions 4.12, 4.13, p. 180 | de Rham homology, coker B | none | checked (audit) |
| Theorem 4.14 | Theorem 4.14, p. 181 | HC_m ≅ coker B_{m−1} ⊕ ⨁_{i≥1} H^{dR}_{m−2i} | **changed**: v4 prints coker B_m ⊕ ⨁_{i≥0} H^{dR}_{m−2i}; the code already implements the CSSS26 form | checked (audit, item 2) |
| §5.1, Table 1 | §5.1, Table 1, pp. 184–187 | cup product of basis classes | none | checked (audit, item 5: every finite cell) |
| Proposition 5.5, Remark 5.6 | Proposition 5.5, Remark 5.6, p. 189 | generating set of HH* | none | checked (audit) |
| Theorem 5.8 | Theorem 5.8, pp. 190–191 | ring presentation | none | checked (audit) |
| Remark 5.9 | Remark 5.9, p. 193 | one loop with a² = 0 in characteristic 2: k[c,t]/(c²) | none | checked (audit) |
| "(5.5)" (cited by the application) | equation (44), p. 194 | sign of the cap product (−1)^{(p+q)q} | the application's locator "(5.5)" exists in neither version; the formula is v4 (43) = CSSS26 (44) | checked (audit, item 3) |
| Theorem 5.17 | Theorem 5.17, p. 205 | cap products of basis classes | none in content | extraction |
| Remark 5.18 | Remark 5.18, pp. 206–207 | cap tables for one loop | none | checked (audit, item 5) |
| §2.2, Theorem 2.2 [AK19] | — (removed) | the Lie derivative L_f = I_f B − (−1)^p B I_f | CSSS26 has no §2.2 and no Lie-derivative formula; the application's normalization is its own, documented convention, tested by [L_f, I_g] = I_{[f,g]} | checked (audit, item 3) |
| §6.1 | §6.1, p. 211 | Gerstenhaber bracket | none | checked (audit, item 3) |
| Proposition 6.2 | Proposition 6.2, p. 214 | [(c,c), v] = deg_c(v)·v | reworded | checked (audit) |
| Theorem 6.6, Theorem 6.7 | Theorem 6.6, p. 218; Theorem 6.7, p. 219 | HH¹ as a Lie algebra (the code computes the bracket table directly) | restated | extraction |
| §7 | §7, pp. 221–227 | ribbon graph, boundary components, winding numbers | valency n / 2n-gon renamed k / 2k-gon | checked (audit, item 4) |
| Theorem 7.1, Corollary 7.2 | Theorem 7.1, p. 225; Corollary 7.2, p. 227 | degrees of generators from boundary data | none in content | checked (audit) |
| Remark 7.4 (AAG invariant) | — (removed) | the AAG invariant φ_A | cite Avella-Alaminos and Geiss directly: [AG08] *J. Pure Appl. Algebra* 212 (2008) 228–243, MR 2355048 | the computed pairs agree with every value stated in AG08 (Example 7, Remark 18, §7 families; `tests/aag.test.js`) |
| Theorem 7.5, Remark 7.6, Corollary 7.7 | Theorem 7.4, p. 228 (7.5); 7.6, 7.7 removed | not used by the application | — | — |
