# AGENTS

Gentle is a browser-based calculus workspace (quivers, complexes, surfaces) with exact arithmetic. See `README.md` for features and `docs/METHODOLOGY.md` for the mathematical scope; read the latter before comparing numerical representatives with the literature.

## Layout

- `src/`, `assets/`, `index.html`: the application, static images and the page.
- `tools/`: `build.mjs` (writes `dist/`), `generate-surfaces.mjs`, `verify.sh` (routine verification), `bench.mjs` (benchmarks).
- `tests/`: Node unit tests (`npm test`) and browser checks (`tests/browser*.mjs`).
- `validation/`: independent validation, see `validation/VALIDATION-REPORT.md` and `npm run validate:*`.
- `docs/METHODOLOGY.md`: shipped at the site root by the build. `docs/csss26/`: the concordance of the application with the published CSSS26.
- `tools/deploy.sh`: builds and copies `dist/` to the server. It publishes the live site: ask Gustavo first each time.
- Working records (Codex task files, notes and answers, audits, source extractions, card reviews and the card source passages) are kept in the private repository `../gentle-private` (`gjassoah/gentle-private`), never here. Codex jobs are run from there with `tools/codex_run.sh`; they work in this directory and write their records there. Never mention errors, misprints or inconsistencies of the papers in this repository.

## Rules

- Follow `~/.claude/instructions/CODE_AND_APP_DEVELOPMENT.md`.
- Before finishing a change run `npm run verify:full` (README, Verification); it runs the browser tests against the build. Cite CSSS by the published version (CSSS26, journal pages), never by arXiv numbering. A change to the computation raises `ENGINE_VERSION` and gets a regression test that fails without it. The server sends `.mjs` as `application/octet-stream`, so modules the pages load must be `.js` files in `src/`. Interface work never changes `src/engine.js`, `linear.js`, `structure.js`, `derived.js`, `worker.js` or `validation/`.
- Keep `METHODOLOGY.md` and `README.md` available at the root of `dist/`; the app links to them.
