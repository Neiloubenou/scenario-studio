"""Write the reference docs (docs/*.md) from apps/v3/studio.json and stats_demo.json."""
import json, collections
from pathlib import Path
R = Path(__file__).resolve().parents[1]
D = json.loads((R / "apps/v3/studio.json").read_text())
S = json.loads((R / "apps/v3/stats_demo.json").read_text())
docs = R / "docs"; docs.mkdir(exist_ok=True)
fmt = lambda n: f"{n:,}"
tot = lambda code: [sum(S[f"{s['id']}@{code}"]["tot"][k] for s in D["scenarios"] if code in s["links"] and f"{s['id']}@{code}" in S) for k in ("valid", "rej", "deferred")]

L = ["# Behaviors", "", "Codes of the Abstract Scenario Manager. Intent = what the SDT is asked to do when a scenario is generated for this behavior.", "",
     "| Code | Behavior | Use case | Intent | Jama definition | Scenarios | Tests | Excluded | Deferred |", "|---|---|---|---|---|---|---|---|---|"]
for b in D["behaviors"]:
    n = sum(1 for s in D["scenarios"] if b["code"] in s["links"]); v, x, d = tot(b["code"])
    L.append(f"| {b['code']} | {b['name']} | {b['use_case']} | {b['intent']} | {b['jama']['id'] if b['jama'] else 'not exported'} | {n} | {fmt(v)} | {fmt(x)} | {fmt(d)} |")
(docs / "behaviors.md").write_text("\n".join(L) + "\n")

L = ["# Pass / fail criteria", "", "Selected per scenario and behavior from the SDT intent and the scene. A failed criterion takes the worst HIRE v2 rating of the hazards it protects.", "",
     "| ID | Criterion | Metric | Threshold | Requirement | Protects |", "|---|---|---|---|---|---|"]
for c in D["criteria"].values():
    L.append(f"| {c['id']} | {c['name']} | {c['metric']} | {c['threshold']} | {c['req']} | {', '.join(c['hazards'])} |")
use = collections.Counter(c for s in D["scenarios"] for l in s["links"].values() for c in l["criteria"])
L += ["", "Use across the 252 scenario × behavior links: " + ", ".join(f"{k} {v}" for k, v in sorted(use.items())) + ".", "",
      "## Hazards", "", "| ID | Hazard | Torc ID |", "|---|---|---|"] + [f"| {h['id']} | {h['name']} | {h['torc'] or 'to map'} |" for h in D["hazards"].values()]
(docs / "criteria.md").write_text("\n".join(L) + "\n")

L = ["# ODD variants", "", f"Drawn from the L1-L5 ODD report of I-35 South ({', '.join(D['odd']['routes'])}). One condition changes at a time from the nominal case. Exposure is the share of route miles (road) or hours (weather) where the condition holds.", "",
     "| ID | Variant | ODD element | Exposure | Status | Road values set |", "|---|---|---|---|---|---|"]
for v in D["odd"]["variants"]:
    L.append(f"| {v['id']} | {v['name']} | {v['odd']} | {str(v['exposure']) + ' %' if v['exposure'] is not None else 'n/a'} | {'simulated' if v['sim'] else 'deferred (perception, milestone 2)'} | {', '.join(f'{k}={x}' for k, x in v['set'].items()) or 'none'} |")
L += ["", "Lane count share on the route: " + ", ".join(f"{k} lanes {v} %" for k, v in D["odd"]["lane_share"].items()) + "."]
(docs / "odd-variants.md").write_text("\n".join(L) + "\n")

L = ["# Scenario catalogue", "", "121 scenarios (SERYTI catalogue v3, English titles). Behaviors use the Abstract Scenario Manager codes. HIRE level: justified, indirect, or review.", ""]
fam = None
for s in D["scenarios"]:
    if s["family"] != fam:
        fam = s["family"]; L += ["", f"## {fam} · {D['families'][fam]['name']}", "", "| ID | Scenario | Behaviors | HIRE | Criteria | Generable |", "|---|---|---|---|---|---|"]
    L.append(f"| {s['id']} | {s['title']} | {', '.join(s['links'])} | {', '.join(sorted({l['level'] for l in s['links'].values()}))} | {', '.join(sorted({c for l in s['links'].values() for c in l['criteria']}))} | {'yes' if s['generable'] else 'milestone 2'} |")
(docs / "scenarios.md").write_text("\n".join(L) + "\n")
so = D["sotif"]; t2s = collections.defaultdict(list)
for s_ in D["scenarios"]:
    for t in s_["tcs"]: t2s[t].append(s_["id"])
L = ["# SOTIF analysis", "", "Chain: functional insufficiency (FI) → triggering condition (TC) → hazard and HIRE risk → scenario → concrete tests → results.",
     "Sources: Full Mapping TC × FI × Hazard × AV3.0, TC catalogue V3_1, FI list V1, STPA QA review (27 Jul 2026).", "",
     "## Functional insufficiencies", "", "| FI | Block | Insufficiency | Hazards | TCs | Scenarios | Status |", "|---|---|---|---|---|---|---|"]
for f in so["fis"].values():
    tcs = [t for t in so["tcs"].values() if f["id"] in t["fis"]]; sc = sorted({x for t in tcs for x in t2s[t["id"]]})
    st = "latent" if f["latent"] and not tcs else ("no scenario" if not sc else "covered")
    L.append(f"| {f['id']} | {f['block']} | {f['name']} | {', '.join(f['hazards'])} | {len(tcs)} | {len(sc)} | {st} |")
gap = [t for t in so["tcs"].values() if not t2s[t["id"]]]
L += ["", f"## Triggering conditions without a scenario ({len(gap)} of {len(so['tcs'])})", "", "| TC | Layer | Element | Condition | Hazards | FIs |", "|---|---|---|---|---|---|"]
L += [f"| {t['id']} | {t['layer']} | {t['element']} | {t['text']} | {', '.join(t['hazards'])} | {', '.join(t['fis'])} |" for t in gap]
L += ["", "## STPA context groups", "", "| Context group | UCAs | Without loss scenario |", "|---|---|---|"]
miss = collections.Counter(u["group"] for u in so["stpa"]["missing"])
L += [f"| {g['name']} | {g['total']} | {miss.get(g['name'], 0)} |" for g in so["stpa"]["groups"]]
(docs / "sotif.md").write_text("\n".join(L) + "\n")
print("docs written")
