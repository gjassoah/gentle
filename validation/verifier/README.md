# HH homology certificate prototype

The JavaScript generator exports exact low-degree data from the production complex:

```sh
node validation/certificate.mjs \
  --case "dual numbers" --characteristic 2 --degree 1 \
  --output /tmp/dual-hh1.json
```

An arbitrary compatible presentation can be supplied with `--input algebra.json`. The prototype is deliberately restricted to degrees 0 through 3 and algebras within the oracle's 20-path bound.

The verifier imports no production JavaScript. It reconstructs the algebra, chain bases, and Hochschild boundaries with the Python oracle; compares those with the certificate; verifies `b_n b_(n+1) = 0`; recomputes the homology dimension by exact rank; and checks supplied representatives are cycles forming a basis modulo boundaries.

```sh
python3 -m validation.verifier.verify /tmp/dual-hh1.json
npm run validate:certificate
```

The verifier tests deliberately corrupt the claimed dimension, a boundary-matrix entry, and a representative. This prototype certifies only the consistency of an individual bounded computation with the independently implemented definitions. It is not a proof-assistant certificate and makes no claim about the complete application.
