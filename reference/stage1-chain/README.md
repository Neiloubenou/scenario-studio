# Stage 1 chain: behavior > abstract (+HIRE) > concretes > OSC

Uses the existing Scenario Studio engine (`dist/combination-engine.mjs`) unchanged.

Run from this folder, pointing to the engine of the scenario-studio-source checkout:

    node scripts/run-chain.mjs vendor/combination-engine.mjs reference/behavior.json reference/abstract.json out
    node scripts/compare-reference.mjs vendor/combination-engine.mjs reference/abstract.json reference/expected.json out/set.json

- `reference/behavior.json`: the behavior (Lane Changes / Overtaking, Highway).
- `reference/abstract.json`: the abstract, its HIRE links and its engine configuration (the DEMO-SHOULDER-01 values).
- `reference/expected.json`: what the tool must produce, written by hand before running it.
- `out/set.json`: the engine result, every case carrying its behavior, abstract, version and HIRE trace.
- `out/osc/*.osc`: OpenSCENARIO DSL 2.0 authoring templates (not parser-validated). The SDT response is never scripted.

Status on 2026-10-07: 11/11 checks pass. All values are illustrative demo values, not requirement thresholds.
