# Scenario Studio

SERYTI tool for Torc Robotics, L4 SDT on DO-Crawl I-35 South.

For each **behavior**, Scenario Studio shows:
* the **scenarios** linked to it, each with its **HIRE** risk (S, E, C);
* the **pass / fail criteria** taken from Jama;
* the **ODD variants** of each scenario, weighted by real I-35 exposure;
* every **concrete test** generated, with the absurd combinations excluded and their reason;
* the **results**: how many tests pass or fail, and the risk carried by each failure;
* the **SOTIF analysis** behind them: functional insufficiencies (FI), triggering conditions (TC) and STPA, traced down to the tests.

From a behavior, the tool can also **generate new scenarios** from its HIRE rows, its triggering conditions, public references or a plain description.

Status: milestone 1. Links, values and criteria are PROPOSED and must be reviewed with Torc. The pass / fail results shown by default are **DEMO values**, not simulation output.

## Open the tool

Open `apps/v3/index.html` in a browser. It is a single self-contained page: no server, no install.

| View | What it shows |
|---|---|
| **Overview** | One card per behavior (17, codes of the Abstract Scenario Manager): scenarios, tests, pass rate, failures, worst failure risk. |
| **Behavior** | Key figures, then the scenarios sorted by failures and HIRE risk, plus failures by criterion, results by ODD variant and exclusion reasons. Clicking a scenario opens its file: scene to scale, HIRE and risk, criteria, ODD variants, tests with their OpenSCENARIO template. |
| **Generate** | Pick a behavior and a source (HIRE, triggering conditions, Foretellix & NHTSA, plain description). The tool drafts scenarios with actors, HIRE rows and risk, Jama criteria, ODD variants and a test count. Accepted drafts join the catalogue, the dashboards and the tree. |
| **SOTIF analysis** | 42 FIs, 277 TCs, STPA context groups and hazard failure modes. For each FI: AV3.0 causes, TCs, scenarios, tests and results, and whether it is tested, has a scenario without test, has no scenario, or is latent. |
| **Tree** | Flowchart from a behavior (behavior → scenarios → ODD variants → results) or from an FI (FI → TCs → scenarios → results). |
| **ODD** | Variants drawn from the I-35 L1-L5 ODD report with their exposure, behavior × variant matrix, ODD elements (specification vs observed). |
| **Data** | Import of TorSim results, demo or empty results, exports (project JSON, tests CSV, OpenSCENARIO zip). |

### Import test results

CSV or JSON, one row per concrete test:

```
concrete_id,status,criterion
SCN-7b1e89443c704cfd,pass,
SCN-2678fe366db5173f,fail,C03
```

`status` is pass, fail or not_run. `criterion` (C01 to C18) is optional and tells which criterion failed. Concrete IDs are deterministic: the same scenario, behavior, ODD variant and values always give the same ID.

## How it works

1. **Behaviors.** 17 behaviors of the Behavior Table, with the Jama definition when it is exported (Highway). Each behavior sets the SDT intent: keep lane, change lane, stop on the shoulder, stop in lane, lateral avoidance.
2. **Scenarios.** 121 scenarios (SERYTI catalogue, Foretellix style), linked n:m to the behaviors (252 links). Each scenario describes its actors by slot (A lead, B target lead, C follower, D target follower, E and F far lane, G other side, S shoulder, O object), with types, positions, speeds and maneuvers.
3. **HIRE.** Each link is justified by HIRE v2 rows: the scene stresses an SDT command (deceleration, steering, signal…) whose deviation the HIRE ties to the hazard of the scenario. Worst S, E, C per hazard is kept.
4. **Pass / fail criteria.** 18 criteria from Jama (gap 1.5 s and 1 s, lateral buffer 0.3 m, signal 3 s, stay in lane, legal and maximum speed, curve acceleration, hazard lights, shoulder stop, merge and exit zones…), chosen from the intent and the scene. A failed criterion takes the HIRE risk of the hazards it protects.
5. **ODD variants.** 11 variants from the I-35 ODD report, one condition at a time: narrow and wide lanes, curves, grades, wind. Rain and sun glare are listed but deferred while perception is assumed perfect.
6. **Concrete tests.** Every combination of values is generated; 13 rules exclude absurd ones (overlap at start, missing lane, speed outside the envelope, undrivable curve…) and keep the reason.
7. **Results.** Imported per concrete ID, then aggregated per scenario, variant, behavior, TC and FI.
8. **Generation.** For a behavior, every HIRE combination hazard × SDT command × ODD condition can become a draft: a template places the actors (lead braking for H2 deceleration, follower for H3, adjacent vehicle for H1 steering…) and the ODD condition adds its road value or object. TCs, Foretellix and NHTSA references and free text go through a matcher to the closest catalogue scenario. With Claude available in the page, a description is turned into actors and values, then checked by the engine. Drafts stay PROPOSED until accepted.
9. **SOTIF analysis.** The Full Mapping links each TC to its FIs, hazards and STPA context group; each scenario lists the TCs it tests. The chain FI → TC → scenario → tests → results shows which FIs are really exercised and where the gaps are.

Figures today: 222,483 concrete tests, 49,305 excluded combinations, 109,878 deferred tests (rain, glare).

## Repository

| Path | Content |
|---|---|
| `apps/v3/` | **Current tool.** `index.html` (built page), `engine.mjs` (concrete generation and exclusion rules), `core.mjs` (ODD variants, results, risk), `gen.mjs` (scenario generation from a behavior), `app.js`, `app_gen.js` and `shell.html` (interface), `build_data.py`, `build_stats.mjs`, `build.py`, `studio.json` (data model), `stats_demo.json`. |
| `apps/simple/`, `apps/full/` | Previous versions (French): simple chain behavior → list → links → tests, and the full catalogue editor. |
| `engine/slot-engine.mjs` | French engine used by the previous versions. |
| `catalogue/` | `catalog_full.json` (source catalogue with HIRE justification), `counts.json`, Excel catalogue v3, Lane Change library in Foretellix format. |
| `inputs/torc/` | Torc sources: HIRE v1 and v2, HFS, HAZOP ODD v2, Full Mapping TC FI, E2 Scenario Justification, Jama export « Driver Out 2026 SDT Requirements », L1-L5 ODD report of I-35 South, STPA QA review. |
| `inputs/references/` | Foretellix / SAFE public scenario library (VMAD-SG1-11-06, 2020). |
| `reference/stage1-chain/` | Manual reference of milestone 1 (36 expected tests) and its check with Torc's original engine. |
| `scripts/` | Catalogue, HIRE justification, counts, Excel, previous apps, docs. |
| `tests/` | Reference, full catalogue and v3 checks; `tests/e2e/` drives the built page in a browser. |
| `docs/` | `behaviors.md`, `scenarios.md`, `criteria.md`, `odd-variants.md`, `sotif.md` (generated), meeting notes. |

## Build and test

Python 3 with `openpyxl` and `xlrd`, Node 18 or later.

```
npm test             # reference 36/36, full catalogue, v3 checks
npm run test:e2e     # every path of the page in Chromium (Playwright), 83 checks
npm run build:v3     # data model, demo results, page
npm run build:docs   # docs/*.md
npm run build        # everything, from the catalogue to the docs
```

## Data model (`apps/v3/studio.json`)

| Object | Key fields | Relation |
|---|---|---|
| behavior | code, name, use_case, intent, jama | 17 behaviors |
| scenario | id, family, title, desc, configuration (road, SDT, actors), links | n:m with behaviors |
| link | intent, level, rows (HIRE v2 IDs), worst, by_hazard, criteria, risk | one per scenario × behavior |
| criterion | id, name, metric, threshold, req (Jama), hazards | a failure takes the HIRE risk of its hazards |
| ODD variant | id, set (road values), exposure, sim | from the I-35 ODD report |
| concrete test | `SCN-<hash>`, parameters, expected | scenario × behavior × variant × values |
| result | concrete_id, status, criterion | imported from TorSim or real drives |
| FI | id, block, name, hazards, causes (AV3.0), mrm, latent | reached through TCs |
| TC | id, layer, element, text, hazards, fis, stpa | listed by the scenarios that test it |
| STPA | context groups (UCAs per guideword), UCAs without loss scenario, QA findings | linked to TCs by context group |
| draft | scenario fields + source (HIRE, TC, reference, text), template, estimate, status | becomes a scenario `GEN-<behavior>-NNN` when accepted |

The SDT response is never scripted in the OpenSCENARIO files: only the other actors are, the ADS behavior is observed.

## Open points

* SDT speed cap: 29.05 m/s in Jama (TORC-SYSRQ-14073) vs 30.4 m/s in the ODD Operating Speed Range.
* Torc hazard IDs known only for H2 (TORC-HAZ-31, front impact) and H3 (TORC-HAZ-28, rear impact).
* Import of the Abstract Scenario Manager catalogue (286 scenarios) once its export is available.
* Exact OpenSCENARIO format expected by TorSim.
* Thresholds to confirm: Adaptive Follow time gap, shoulder stop time, EMV pull to shoulder (70 s or 90 s).
* Generated scenarios live in the page session: export them (Generate, « Export generated scenarios ») to keep them.
* 169 TCs and 3 FIs have no scenario yet; 7 FIs are latent (no world TC).
* Urban intersections, reverse maneuvers, wrong-way and hub yard scenarios: generation planned for milestone 2.

This repository contains Torc data and must stay private.
