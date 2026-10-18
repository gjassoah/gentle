# Help

## Part 1. Using the calculator

### 1. Entering an algebra

Each algebra tab contains a quiver, quadratic zero relations, a field characteristic and a degree bound. New tab opens an empty presentation. Duplicate copies the current presentation into a new tab. Load example replaces the current presentation and is undoable.

| Tool or control | Action |
|---|---|
| Select | Select a vertex or arrow to edit its label. Drag a vertex to move it; drag empty drawing area to pan. |
| Vertex | Select a point of the drawing area to add a vertex. |
| Arrow | Select the source, then the target. Select the same vertex twice for a loop. |
| Relation | Select two successive arrows in travel order. Their product is displayed using the Paths setting. Select a loop twice to impose its square as a relation. |
| Delete | Select a vertex or arrow to remove it. Removing a vertex also removes its incident arrows; relations involving a removed arrow are removed. |
| Label: Apply | Rename the selected vertex or arrow. Labels must be nonempty and distinct within the vertex or arrow list. The label field accepts at most 32 characters. |
| × beside a zero relation | Remove that relation. |
| Undo / Redo | Restore or repeat an edit to the presentation, labels, layout, field or degree settings. |
| Arrange | Place the vertices in an automatic layout. |
| Zoom in / Zoom out / Fit / Reset | Change the view, fit the quiver, or restore the initial view. |

The middle mouse button pans the drawing area. Ctrl/Cmd with the mouse wheel and a two-finger pinch zoom around the pointer or gesture. With Select chosen, an arrow key moves a focused vertex by ten drawing units, subject to the drawing bounds.

In Algebra, Edit as text opens the presentation editor. Apply replaces the presentation in one undoable step and retains the positions of vertices whose labels survive. Cancel discards the text draft. One statement is written per line; for example:

```text
convention: left
name: A zero relation
vertices: 1, 2, 3
α: 1 -> 2
β: 2 -> 3
β α = 0
```

For “convention: right”, the same relation is “α β = 0”. A “convention:” line fixes the interpretation of products independently of the current Paths setting. Without it, that setting applies. “vertices:” includes isolated vertices; arrow endpoints also introduce vertices. The parser accepts → as well as ->, and a space, · or * between the two arrows of a relation. # starts a comment outside a quoted label. Double-quoted labels use JSON string syntax and preserve spaces and special characters.

Open JSON accepts a quiver export, a results export containing a quiver, or a session export. A quiver opens in a new algebra tab; a session adds its algebra tabs. Imported reports are not restored: their computations must be run again. Files are limited to 4 MB. Text and file imports accept at most 80 vertices, 160 arrows and 320 relations. The Algebra card reports whether the presentation is finite-dimensional gentle.

Copy link to this algebra is in the algebra-tab toolbar and in Export. The link records the presentation, including the name, labels and vertex positions, the field characteristic and the degree bound. Opening it adds an algebra tab. It does not select a path convention or restore computations. Anyone holding the link can read the presentation. The encoded URL fragment is limited to 16 000 characters; JSON is available for larger presentations.

### 2. Settings

| Setting | Meaning |
|---|---|
| Field characteristic | 0 uses exact rational arithmetic over $\mathbb Q$; a prime $p$ uses $\mathbb F_p$. Other prime accepts primes at most 2147483647. The field affects groups and operations. Coefficients from non-prime field extensions are not accepted. |
| Paths | Right to left uses left modules and the writing convention of CSSS26; left to right uses right modules and travel order. It changes displays, text presentations and exports without recomputing. Representatives are transported with the prescribed signs; coordinates in the transported bases are unchanged. The setting applies throughout the workspace. |
| Compute through degree | An integer $n$ from 0 to 128 sets the displayed calculation range $0,\ldots,n$. Adjacent differentials are included. Changing it requires a new calculus calculation. It does not change the all-degree formulas or the surface and derived invariants. |
| Theme | System follows the system setting; Light and Dark select a theme. |

Adding or removing vertices, arrows or relations, changing vertex or arrow labels, applying a text presentation, or changing the field or degree bound requires Compute calculus to be run again. Changing the algebra name or moving or arranging vertices leaves the report current. Path convention and theme are stored separately from algebra tabs.

### 3. Computing and reading results

Compute calculus constructs the exact complexes in the selected degree range and performs the checks listed at the end of Overview. Cancel computation stops the current calculation. Switching algebra tabs also stops a pending calculation in the tab being left.

| Result group and view | Content and prerequisite |
|---|---|
| Overview | Algebra dimension, center, global dimension, complete circuits, dimensions by degree and the checks of the calculation; requires a current calculus report. |
| Groups: Cohomology, Homology, Cyclic | Quotient bases and representatives in the displayed degrees; requires a completed bar calculation. A report from circuit formulas instead displays dimensions. |
| Operations: Products and operators | Operations on linear combinations of displayed classes; requires a completed bar calculation. |
| Operations: Lie algebra | Bracket table, center, derived series and solvability of $HH^1(A)$; Compute Lie structure runs a separate calculation after a current calculus report exists. |
| Operations: Higher degrees | Cohomology or homology in a requested degree from 0 to 128 using the Bardzell resolution; requires a current calculus report. |
| Structure: Presentation | Paths, complete circuits, a spanning-forest complement and the path-count matrix; requires a current calculus report. |
| Structure: All degrees & ring | Cohomology families, ring relations, homology and Connes families, and dimension queries up to degree 100000; requires a current calculus report. These formulas do not depend on the displayed degree bound. |
| Surface & derived invariant: Surface | Surface models, ribbon graph, boundary data and AAG invariant; available without Compute calculus. |
| Surface & derived invariant: Complete derived invariant | Compute derived invariant runs directly from the presentation. Check derived equivalence compares with another open algebra tab over the same characteristic; no calculus report is needed. |

In Groups, select a degree and expand a basis class to read its representative. Cohomology classes are cocycles modulo coboundaries; homology classes are cycles modulo boundaries. A displayed cochain lists its nonzero values; all unlisted values are zero. Degree-zero cohomology is displayed as central elements. In a cyclic representative, $C_k$ identifies the chain summand of the cyclic total complex. Coordinates refer to the displayed quotient basis; the families and ring presentation use the paper's generators, and Higher degrees uses the Bardzell basis. These bases are not interchangeable by name. Reordering or reimporting a presentation can change quotient coordinates, so representatives belong with their presentation.

The bar calculation permits at most 200 algebra basis paths, 900 basis vectors per chain space, 150000 enumerated tuples per space and 1.1 million entries per differential. If a chain-space limit is reached, the report gives dimensions from the exact circuit formulas and marks bar representatives as unavailable. Structure and the formula views remain available; individual later calculations are subject to their limits. An algebra with more than 200 basis paths is rejected by the calculus calculation. An uncomputed group is not reported as zero. The full $HH^1(A)$ bracket table is limited to dimension 35. The derived invariant does not use these calculus bounds.

Surface drawings depend on the genus, number of marked boundary components and number of punctures; marked points are omitted. Their displayed $\alpha_i,\beta_i$ are separate from the computed ribbon-cycle basis $\gamma_j$. Surface uses boundary winding $m-n$; Complete derived invariant uses the APS orientation $n-m$.

### 4. Operations

In Operations — Products and operators, choose an operation and the input degrees, enter coefficients in the displayed bases, and select Calculate. Coefficients are integers or fractions such as -2 and 3/5; decimals and polynomial expressions are not accepted. A denominator must be nonzero in the chosen field. Input degrees lie in the current displayed range. An output group is computed on demand if necessary, subject to the same limits.

| Operation | Inputs | Output |
|---|---|---|
| Cup product | $f\in HH^p(A)$, $g\in HH^q(A)$ | $f\smile g\in HH^{p+q}(A)$ |
| Gerstenhaber bracket | $f\in HH^p(A)$, $g\in HH^q(A)$ | $[f,g]\in HH^{p+q-1}(A)$ |
| Cap product | $f\in HH^p(A)$, $z\in HH_n(A)$ | A class in $HH_{n-p}(A)$; written $z\cap f$ for left modules and $f\cap z$ for right modules. The input cards follow this order. |
| Connes operator | $z\in HH_n(A)$ | $Bz\in HH_{n+1}(A)$ |
| Lie derivative | $f\in HH^p(A)$, $z\in HH_n(A)$ | $L_fz\in HH_{n-p+1}(A)$ |

The result gives coordinates modulo boundaries, a representative and the output basis. Calculation history records successful operations for the current algebra, including input coordinates and result representatives. History remains available when switching algebra tabs and is included in results JSON and the LaTeX report. Recomputing the calculus or making an edit that requires recomputation clears that history.

### 5. Exporting and browser storage

Export in the header provides Copy link to this algebra and four file exports.

| Export | Contents |
|---|---|
| All algebra tabs · JSON | Every open presentation, including vertex positions, with its field and degree settings, plus the active tab identifier. Computations and operation histories are not saved. |
| Current quiver · JSON | The current presentation, vertex positions, field characteristic and degree bound. |
| Results, representatives & operations · JSON | The current presentation and report, representatives, checks, recorded operations, additional queries and any computed derived invariant and valid comparison. Requires a current calculus report. |
| Mathematical report · LaTeX (.tex) | A standalone document containing the presentation, settings, groups and available representatives, recorded operations, families, ring and surface data, additional computations and checks. Requires a current calculus report. Compile with LuaLaTeX. |

JSON exports include the selected path convention, a displayed projection in that convention, the application version and the export time. The underlying structured quiver records remain in travel order. Opening a JSON export restores its presentations and field/degree settings; computations and the exported path-convention selection are not restored automatically. The Complete derived invariant view separately exports its invariant and current comparison as JSON or LaTeX without a calculus calculation. Each standard surface drawing has a Download SVG control.

Computations run in the browser. Open presentations and their field and degree settings are saved in local storage. Path convention and theme are also saved there. Reports, operation history, undo history, comparisons, closed-tab history and drawing zoom are kept only in the current page session. After a reload the active tab is computed again if its presentation is valid; other tabs require Compute. Browser storage can be unavailable or cleared; file exports are separate copies.

The workspace supports 40 open algebra tabs. Close tab removes an algebra from the saved workspace. Reopen closed tab restores the most recently closed tab from the current session; up to ten closed tabs are retained in that history. Opening a session appends its tabs, subject to the open-tab limit.

### 6. Keyboard and pointer reference

| Keys or gesture | Focus or context | Action |
|---|---|---|
| Ctrl/Cmd + Z | Workspace, outside input, select, textarea and dialog controls | Undo. |
| Ctrl/Cmd + Shift + Z | Same | Redo. |
| V / N / A / R / D | Quiver editor, outside text and select controls, with no Ctrl/Cmd/Alt modifier | Choose Select / Vertex / Arrow / Relation / Delete. |
| Delete | Quiver editor with an item selected, outside text and select controls | Delete the selected item. |
| Escape | Quiver editor, outside text and select controls | Choose Select and clear the pending tool selection. |
| Tab / Shift + Tab | Workspace | Move focus through controls and diagram items. |
| Enter / Space | Drawing area with Vertex selected | Add a vertex at the next free grid position. |
| Enter / Space | Focused vertex or arrow | Activate the item using the current tool. |
| Arrow keys | Focused vertex with Select chosen | Move the vertex ten drawing units, subject to the drawing bounds. |
| Enter | Label input | Apply the label. |
| Escape | Presentation textarea | Cancel the text draft. |
| Left / Right | Focused algebra tab | Select the previous / next tab, wrapping at the ends. |
| Home / End | Focused algebra tab | Select the first / last algebra tab. |
| Delete | Focused algebra tab | Close that algebra tab. |
| Left / Right | Focused main result tab | Select the previous / next result group, wrapping at the ends. |
| Home / End | Focused main result tab | Select the first / last result group. |
| Escape | Open Theme choices | Close the choices and return focus to Theme. |
| Escape | Open dialog | Close the dialog. |
| Ctrl/Cmd + wheel | Drawing area | Zoom around the pointer. |
| Two-finger pinch | Drawing area | Zoom and pan. |
| Drag empty area with Select, or drag with middle mouse button | Drawing area | Pan. |
| Double-click a selected item with Select | Drawing area | Focus and select its label text. |

## Part 2. Definitions and theorems

Each entry links to its card, including both path conventions and the source locator. CSSS26 is [Chaparro–Schroll–Solotar–Suárez-Álvarez, J. Algebra 708 (2026), 138–231](https://doi.org/10.1016/j.jalgebra.2026.04.058); APS23 is [Amiot–Plamondon–Schroll, Selecta Math. (N.S.) 29 (2023), Paper No. 30](https://doi.org/10.1007/s00029-022-00822-x); AG08 is [Avella-Alaminos–Geiss, J. Pure Appl. Algebra 212 (2008), 228–243](https://doi.org/10.1016/j.jpaa.2007.05.014).

### Workspace — Algebra and editor

| Card | Content | Source |
|---|---|---|
| [W1](CARDS.md#w1) | Gentle presentation | After CSSS26, Definition 2.1, pp. 141–142. |
| [W2](CARDS.md#w2) | Paths and the sets $\mathcal B$, $\Gamma$ | After CSSS26, §2, p. 143. |
| [W3](CARDS.md#w3) | Path conventions | CSSS26, Conventions, p. 141; application's signed transport, Methods. |
| [W4](CARDS.md#w4) | Field of coefficients | Standard scalar extension; application's prime-field arithmetic. |

### Overview

| Card | Content | Source |
|---|---|---|
| [O1](CARDS.md#o1) | The center | After CSSS26, Proposition 3.3, p. 146; standard identification with $HH^0(A)$. |
| [O2](CARDS.md#o2) | Global dimension | After CSSS26, Corollary 3.14 and proof, p. 160; resolution (2), p. 143. |
| [O3](CARDS.md#o3) | Complete cycles and circuits | After CSSS26, Lemma 3.2 and definitions, pp. 145, 151, 157; basic circuits, §5.2, p. 188. |

### Groups

| Card | Content | Source |
|---|---|---|
| [G1](CARDS.md#g1) | Hochschild cohomology and homology | Standard normalized relative bar complexes. |
| [G2](CARDS.md#g2) | The cohomology of a gentle algebra | After CSSS26, Theorem 3.12, pp. 158–159; notation, pp. 144–147, 151, 157. |
| [G3](CARDS.md#g3) | The homology | After CSSS26, Theorem 4.4, p. 169; Corollary 4.5, p. 170. |
| [G4](CARDS.md#g4) | Cyclic homology and the Connes operator | Standard mixed complex; after CSSS26, Proposition 4.11, p. 175; Propositions 4.12–4.13, p. 180; Theorem 4.14, p. 181. |

### Operations

| Card | Content | Source |
|---|---|---|
| [P1](CARDS.md#p1) | Cup product | Standard. |
| [P2](CARDS.md#p2) | Cap product | Standard normalized bar definition and application's cap convention; after CSSS26, (44), p. 194, for the Bardzell-pair formula. |
| [P3](CARDS.md#p3) | Gerstenhaber bracket | Standard; after CSSS26, Proposition 6.2, p. 214, for arrow derivations. |
| [P4](CARDS.md#p4) | Lie derivative | Application's normalization, Methods. |
| [P5](CARDS.md#p5) | The Lie algebra $HH^1(A)$ | After CSSS26, Theorem 6.6(1)–(2), p. 218; notation from Proposition 6.2, p. 214, and Proposition 5.5, p. 189. |
| [P6](CARDS.md#p6) | Groups in higher degrees | After CSSS26, (2), p. 143; Proposition 3.1, p. 144. |

### Structure

| Card | Content | Source |
|---|---|---|
| [S1](CARDS.md#s1) | Maximal paths | After CSSS26, §3.1, pp. 145, 147. |
| [S2](CARDS.md#s2) | Families in all degrees | After CSSS26, Theorem 3.12, pp. 158–159; basic cycles, p. 188. |
| [S3](CARDS.md#s3) | Dimensions in every degree | After CSSS26, Corollary 3.16 and (20), p. 161; Theorem 3.12, pp. 158–159; Corollary 4.5, p. 170; Proposition 4.11, p. 175; Theorem 4.14, p. 181. |
| [S4](CARDS.md#s4) | The cohomology ring | After CSSS26, Proposition 5.5, p. 189; Theorem 5.8, pp. 190–191; Remark 5.9, p. 193; basic cycles, p. 188. |
| [S5](CARDS.md#s5) | The cup product on the basis | After CSSS26, Table 1, entries (i), (ii), (iii), (v), (vi), pp. 184–187. |

### Surface and derived invariant

| Card | Content | Source |
|---|---|---|
| [D1](CARDS.md#d1) | Ribbon graph and marked surface | After CSSS26, §7, pp. 221–223. |
| [D2](CARDS.md#d2) | Boundary components and cohomology generators | After CSSS26, Theorem 7.1, p. 225; Corollary 7.2, p. 227; Proposition 5.5, p. 189. |
| [D3](CARDS.md#d3) | Homology and curves | After CSSS26, Theorem 7.4 and Fig. 6, pp. 228–229; basis and sign conditions of Theorem 4.4, p. 169; truncation notation, p. 176. |
| [D4](CARDS.md#d4) | The Avella-Alaminos–Geiss invariant | After AG08, §2.2, p. 230; §3 and Remark 6, p. 232; Remark 8, p. 233; Theorem A, p. 229. |
| [D5](CARDS.md#d5) | Standard surface drawings | After APS23, §7.1, p. 23. |
| [D6](CARDS.md#d6) | Winding numbers | After APS23, Definition 3.1, p. 6; Definition 3.7, p. 8; §3.3 and Lemma 3.18, pp. 11–12; Proposition 3.20(5), p. 13; Theorem 4.3, p. 14. |
| [D7](CARDS.md#d7) | The complete derived invariant | After APS23, Theorem 7.3, p. 23; Theorem 7.4, p. 24, and proof, pp. 25–27; Lemma 7.5, p. 25; Remark 6.2, p. 21. |
| [D8](CARDS.md#d8) | The examples $\Lambda_1,\Lambda_2$ | After APS23, §9, pp. 28–29, first pair. |
| [D9](CARDS.md#d9) | Computing the complete derived invariant | Application's procedure, Methods. |

### Checks

| Card | Content | Source |
|---|---|---|
| [C1](CARDS.md#c1) | Computation checks | Application's Methods, computation code and validation report. |

## Integration note — excluded from Help text

This file supplies content for the proposed Help dialog. The current header says Guide and its dialog contains no card index. In the planned dialog, an index entry opens the card; the action label “Show where it is used” uses the card's Shown metadata to select its panel and heading. These controls are not described above as existing interface features.
