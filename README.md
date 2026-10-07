# Scenario Studio

Outil SERYTI pour Torc Robotics, SDT L4 sur DO-Crawl I-35 South.

La chaîne : **behavior → scénarios abstraits (catalogue) → tous les scénarios concrets → OSC**, avec la trace Jama et HIRE à chaque étape.

Statut : jalon 1, valeurs et liens PROPOSED, à relire avec Torc.

## Scenario Studio v3 (English, current version)

`apps/v3/index.html` : the dashboard version asked on 7 October 2026.

* **Overview** : one card per behavior (17, codes of the Abstract Scenario Manager) with tests, pass rate, failures and worst risk.
* **Behavior** : scenarios with HIRE risk (S/E/C), pass/fail criteria from Jama, results by ODD variant, exclusion reasons; a drawer per scenario (summary and scene, HIRE and risk, criteria, ODD variants, tests with OSC).
* **Tree** : flowchart behavior → scenarios → ODD variants → results.
* **ODD** : variants drawn from the I-35 L1–L5 ODD report with their exposure, behavior × variant matrix, ODD elements.
* **Data** : import TorSim results (CSV or JSON: concrete_id, status, criterion), demo results, exports.

Rebuild : `cd apps/v3 && python3 build_data.py && node build_stats.mjs && python3 build.py`.
Results shown by default are DEMO values computed from the candidate oracle, not simulation output.

## Ouvrir les outils

Les deux outils sont des pages HTML autonomes : on les ouvre dans un navigateur, sans serveur.

| Page | Pour quoi faire |
|---|---|
| `apps/simple/index.html` | Version simple, demandée par Matthieu. Tu choisis un behavior, tu colles ou importes une liste de scénarios (Excel : colonne A famille, colonne B scénario), l'outil fait les liens, génère tous les concrets, se compare à la référence manuelle et exporte le projet en JSON et les OSC en zip. |
| `apps/full/index.html` | Version complète. Catalogue de 121 abstracts, éditeur d'acteurs et de valeurs, onglets Jama, HIRE, TC et FI, matrice behavior × catalogue, vue des trous HIRE. |

Dans un navigateur local, l'export de fichiers passe par la plateforme claude.ai : il marche dans l'artifact publié, pas forcément en ouvrant le fichier en local.

## Contenu du dépôt

| Dossier | Contenu |
|---|---|
| `apps/` | Les deux pages et leurs sources (`src/`). |
| `engine/slot-engine.mjs` | Moteur de génération : slots A à O (Miro Torc), 9 manœuvres, 13 règles d'exclusion, oracle candidat Jama, ID déterministes. |
| `catalogue/` | `catalog_full.json` (121 abstracts, 258 liens behavior, justification HIRE de chaque lien), `counts.json`, l'Excel `Catalogue_Scenarios_Abstraits_v3.xlsx`, la bibliothèque Lane Change au format Foretellix. |
| `data/derived/` | Données intermédiaires produites par les scripts (behaviors, HIRE Lane Change, exigences Jama parsées, mapping TC et FI). |
| `inputs/torc/` | Sources Torc : HIRE v1 et v2, HFS, HAZOP ODD v2, Full Mapping TC FI, E2 Scenario Justification, export Jama « Driver Out 2026 SDT Requirements ». |
| `inputs/references/` | Bibliothèque publique Foretellix / SAFE (VMAD-SG1-11-06, 2020). |
| `reference/stage1-chain/` | Référence manuelle du jalon 1 (behavior, abstract, résultat attendu écrit à la main) et sa vérification avec le moteur Torc d'origine (`vendor/combination-engine.mjs`). |
| `scripts/` | Construction du catalogue, de la justification HIRE, des comptes, de l'Excel et des pages. |
| `tests/` | Test de la référence (36 sur 36) et génération complète du catalogue. |
| `docs/meetings/` | Attendus du jalon 1 et transcriptions des réunions avec Matthieu. |

## Modèle de données

| Objet | Champs principaux | Relation |
|---|---|---|
| behavior | id, code (ex. `HW-LC`), name, use_case, jama, default.intent | 21 behaviors de la Behavior Table |
| abstract | id, family, title, configuration (route, SDT, acteurs par slot), beh_codes, intent par behavior, jama, hazards, nhtsa, tcs, foretellix, hire_links | lien n:m avec les behaviors |
| hire_links[code] | level, why, rows (ID HIRE v2), hfs, odd_match, odd_missing | justification d'un lien abstract → behavior |
| concrete | id `SCN-<hash>`, parameters, expected | calculé, jamais stocké à part : sa recette (behavior, abstract, version, valeurs) est dans le manifeste et l'en-tête OSC |
| projet (version simple) | behavior, scenarios[], concretes[], summary[] | schéma `scenario-studio/projet@0.1` |

Le comportement du SDT n'est jamais écrit dans l'OSC : seuls les autres acteurs sont scriptés, la réponse de l'ADS est observée.

## Reconstruire et tester

Prérequis : Python 3 avec `openpyxl` et `xlrd`, Node 18 ou plus.

```
npm test          # référence 36/36 puis génération complète du catalogue
npm run build     # catalogue, justification HIRE, comptes, Excel, pages
```

Étapes amont, si les sources changent :

```
python3 scripts/build_studio_data.py   # behaviors + HIRE Lane Change -> data/derived/studio_data.json
python3 scripts/build_catalog.py       # 28 abstracts Lane Change -> data/derived/catalog.json
python3 scripts/build_lc_catalogue.py  # Excel Lane Change au format Foretellix
```

Référence du jalon 1 avec le moteur Torc d'origine :

```
cd reference/stage1-chain
node scripts/run-chain.mjs vendor/combination-engine.mjs reference/behavior.json reference/abstract.json out
node scripts/compare-reference.mjs vendor/combination-engine.mjs reference/abstract.json reference/expected.json out/set.json
```

## Chiffres au 7 octobre 2026

* 121 abstracts, 98 générables, 23 prévus au jalon 2 (intersections, marche arrière, contresens, cour du hub).
* 258 liens behavior : 218 justifiés par le HIRE v2, 40 justifiés indirectement, 0 sans ligne HIRE.
* 31 520 scénarios concrets retenus, 5 490 combinaisons exclues par les règles.
* Trous HIRE côté autoroute : 7, tous météo ou perception (hors jalon 1).
* Référence manuelle : 36 attendus, 36 obtenus.

## Points ouverts

* Catalogue de Matthieu (environ 104 abstracts) à importer dans la version simple.
* Format OSC exact attendu par TorSim.
* Moteur officiel à choisir entre `engine/slot-engine.mjs` et le moteur Torc d'origine (les ID diffèrent).
* Index et modèle de couverture de la Foretellix « L4 Highway Trucking V-Suite » à demander.

Ce dépôt contient des données Torc : il doit rester privé.
