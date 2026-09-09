# Domain-specific mutation campaign

Run `python3 -m validation.mutations` to execute these checks. The campaign contains seven actual Python-oracle mutants, two alternate operation calculations and eight output-sensitivity checks. It does not mutate production implementations and run an unchanged test suite against them, so the total is not a production mutation kill rate. The generated validation report records detection counts by these categories.

| Check | Category | Changed calculation and detector |
|---|---|---|
| chain-internal-sign | Oracle mutant | Reverse internal boundary signs; Q-oriented-square ranks change |
| chain-omitted-terminal | Oracle mutant | Omit cyclic terminal term; Q-dual-number ranks change |
| chain-terminal-sign | Oracle mutant | Reverse terminal boundary sign; Q-dual-number ranks change |
| cochain-internal-sign | Oracle mutant | Reverse internal coboundary signs; loop-with-tail ranks change |
| cochain-omitted-terminal | Oracle mutant | Omit right action; inward-fork ranks change |
| cochain-terminal-sign | Oracle mutant | Reverse right-action sign; Q-A3 ranks change |
| reversed-path-composition | Output sensitivity | Compare a*b to b*a in the unmodified A3 table |
| reversed-relation-membership | Output sensitivity | Compare membership of (a,b) and (b,a) in the unmodified relation set |
| permitted-forbidden-successor | Output sensitivity | Negate the allowed-successor membership Boolean for the dual loop |
| characteristic-two-as-zero | Output sensitivity | Substitute correct characteristic-zero dimensions for characteristic two |
| homological-degree-shift | Output sensitivity | Shift the computed triangle dimension vector |
| primitive-circuit-as-rotations | Output sensitivity | Multiply the computed triangle HH_2 dimension by three |
| connes-missing-cyclic-summand | Oracle mutant | Drop a rotation; exact dual-number rank of B_0 changes |
| gerstenhaber-commutator-sign | Operation alternative | Add reverse production insertion; compare with the production bracket |
| cap-sign-omission | Operation alternative | Compare signed cap with unsigned contraction on a nonzero fixture |
| surface-orientation-reversal | Output sensitivity | Assert APS baseline genus 1 and boundary [[2,-2]], then reject [[2,2]] |
| flipped-arf-invariant | Output sensitivity | Flip the returned bit; compare with Gauss reduction of production winding/intersection data |

The APS expected winding is independently fixed by the boundary sum 4−4g−2b=−2 for a genus-one surface with one boundary. A baseline value +2 or 0 fails the campaign before a detection can be counted. `python3 -m unittest validation.test_mutations` tests this failure path, including the original adversarial fixture substitution.

The six changed differentials may fail square-zero; their rank-subtraction values are sensitivity witnesses, not necessarily dimensions of another homology theory. The Arf check independently reduces the supplied quadratic form but shares production geometric inputs. Undetected changes remain reported as validation gaps; checks must not be removed to improve the count.
