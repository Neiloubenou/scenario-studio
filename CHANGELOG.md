# Changelog

## 3.0.0 · 7 October 2026
* New English tool `apps/v3`: overview per behavior, behavior dashboard, scenario file, flowchart tree, ODD view, data import and export.
* Behavior codes aligned on the Abstract Scenario Manager (HW-AF, HW-LCC, HW-ORM, HW-ORE, HW-SOS, HW-SIL, URB-CWY, URB-SI, URB-TI, HUB-GEN…).
* 18 pass / fail criteria from Jama, each tied to the hazards it protects; risk of a failure taken from HIRE v2.
* 11 ODD variants from the I-35 L1-L5 ODD report with their exposure; rain and glare deferred.
* Test results import (CSV or JSON) and deterministic demo results.
* Generated docs: behaviors, scenarios, criteria, ODD variants. New test suite `tests/test-v3.mjs`.

## 2.1 · 7 October 2026
* Every scenario × behavior link justified by HIRE v2 rows; view of the catalogue gaps; RMP-14 and five links added from the HIRE.
* Simple version (`apps/simple`): behavior + list of scenarios → links → tests.

## 2.0 · 7 October 2026
* 9 scenarios added from the Foretellix / SAFE library (convoys, lane hugger, curve with neighbour, exits and merges).
* Engine: convoys, lane hugger, take exit, 13th exclusion rule.

## 1.0 · 7 October 2026
* Catalogue of 111 scenarios linked to 21 behaviors, slot engine with 12 exclusion rules, manual reference 36/36.
