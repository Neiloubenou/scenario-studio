"""Build the English data model of Scenario Studio v3 (data/studio.json).
Inputs: catalogue/catalog_full.json (SERYTI catalogue + HIRE v2 justification), the I-35 ODD report,
en_text.py (English titles). Behavior codes follow Matthieu's Abstract Scenario Manager."""
import json, sys, collections
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from en_text import EN, FAMILIES

CAT = json.load(open(sys.argv[1] if len(sys.argv) > 1 else str(HERE.parents[1] / "catalogue/catalog_full.json")))
ODD = json.load(open(sys.argv[2] if len(sys.argv) > 2 else str(HERE.parents[1] / "inputs/torc/L1-L5_ODD_report_final.json")))
OUT = Path(sys.argv[3] if len(sys.argv) > 3 else HERE / "studio.json")

# ---------------- behaviors (Matthieu codes) ----------------
MAP = {"HW-CRU": "HW-LCC", "HW-FOL": "HW-AF", "HW-LC": "HW-LC", "HW-ONR": "HW-ORM", "HW-OFR": "HW-ORE", "HW-CSS": "HW-SOS", "HW-ESL": "HW-SIL", "HW-ELM": "HW-ELM",
       "URB-CRU": "URB-LCC", "URB-FOL": "URB-AF", "URB-LC": "URB-LC", "URB-XWK": "URB-CWY", "URB-TRN": "URB-TI", "URB-STR": "URB-SI", "URB-SIL": "URB-SIL", "URB-ELM": "URB-ELM",
       "HUB-LSD": "HUB-GEN", "HUB-DCK": "HUB-GEN", "HUB-PUL": "HUB-GEN", "HUB-AVD": "HUB-GEN", "HUB-EST": "HUB-GEN"}
NAMES = {"HW-AF": "Lane-Centered Adaptive Follow", "HW-ELM": "Emergency Lateral Motion", "HW-LC": "Lane Changes / Overtaking", "HW-LCC": "Lane-Centered Cruise",
         "HW-ORE": "Off-Ramp Exit", "HW-ORM": "On-Ramp Merge", "HW-SIL": "Emergency Stop in Lane", "HW-SOS": "Controlled Stop on Shoulder",
         "URB-AF": "Lane-Centered Adaptive Follow", "URB-CWY": "Crosswalk Yield", "URB-ELM": "Emergency Lateral Motion", "URB-LC": "Lane Changes / Overtaking",
         "URB-LCC": "Lane-Centered Cruise", "URB-SI": "Going Straight through Protected / Unprotected Intersection", "URB-SIL": "Stop in Lane",
         "URB-TI": "Protected / Unprotected Turn at Intersection", "HUB-GEN": "General Hub Behavior"}
ORDER = list(NAMES)
old_beh = {b["code"]: b for b in CAT["behaviors"]}
behaviors = []
for code in ORDER:
    olds = [o for o, n in MAP.items() if n == code]
    ob = old_beh[olds[0]]
    j = next((old_beh[o].get("jama") for o in olds if old_beh[o].get("jama")), None)
    behaviors.append(dict(code=code, name=NAMES[code], use_case={"HW": "Highway", "URB": "Urban", "HUB": "Hub"}[code.split("-")[0]],
                          intent=ob["default"]["intent"], sides=ob["default"].get("sides"), legacy=olds,
                          jama=dict(id=j["id"], name=j["name"], text=j["text"][:900]) if j else None))

# ---------------- hazards ----------------
HZ = {"H1": ("Side collision", None), "H2": ("Front collision", "TORC-HAZ-31"), "H3": ("Rear-end by follower", "TORC-HAZ-28"),
      "H4": ("Intent not communicated", None), "H5": ("Loss of stability / control", None), "H6": ("Access / operational", None)}
hazards = {k: dict(id=k, name=v[0], torc=v[1]) for k, v in HZ.items()}

# ---------------- pass / fail criteria ----------------
JR = CAT["jama_reqs"]
CRIT = [
 ("C01", "No collision", "Longitudinal distance to every OMV", "> 0 m", "TORC-SYSRQ-14066", ["H2", "H3", "H1"]),
 ("C02", "Lead gap after lane change", "Range to new lead / ego speed", "≥ 1.5 s", "TORC-SYSRQ-13836", ["H2"]),
 ("C03", "Rear gap after lane change", "Range to new follower / follower speed", "≥ 1.0 s", "TORC-SYSRQ-13836", ["H3"]),
 ("C04", "Deceleration imposed on the lag vehicle", "Peak deceleration of the target-lane follower", "≤ 3 m/s² (≤ 30 m/s), 5 m/s² (≥ 45 m/s)", "TORC-SYSRQ-10649", ["H3"]),
 ("C05", "Turn signal before lateral motion", "Signal lead time", "≥ 3 s", "TORC-SYSRQ-10197", ["H4", "H1"]),
 ("C06", "Lateral buffer to OMVs", "Minimum lateral distance in the lateral consideration zone", "≥ 0.3 m", "TORC-SYSRQ-14128", ["H1"]),
 ("C07", "Stay in lane", "Time with any tractor point outside the lane boundaries", "≤ 2 s consecutive", "TORC-SYSRQ-10154", ["H1", "H5"]),
 ("C08", "Lane centering", "Time outside the centering bounds", "≤ 5 s consecutive", "TORC-SYSRQ-10161", ["H1"]),
 ("C09", "Legal speed limit", "Speed vs posted limit", "≤ posted limit", "TORC-SYSRQ-14118", ["H2", "H5"]),
 ("C10", "Maximum SDT speed", "Ego speed", "≤ 29.05 m/s (65 mph)", "TORC-SYSRQ-14073", ["H5"]),
 ("C11", "Lateral acceleration in curves", "Peak lateral acceleration", "≤ g·(e + f − 0.15·G)", "TORC-SYSRQ-10172", ["H5"]),
 ("C12", "Hazard lights when stopped", "Hazard lights state when v < 1 m/s on highway", "active", "TORC-SYSRQ-14130", ["H3", "H4"]),
 ("C13", "Stop fully on the shoulder", "Final position and speed", "standstill, whole combination on the shoulder", "TORC-SYSRQ-14127", ["H1", "H3"]),
 ("C14", "Pull to shoulder for a following LEO", "Time from 20 s of LEO following to stop", "≤ 70 s (90 s open point)", "TORC-SYSRQ-15232", ["H1", "H3"]),
 ("C15", "Merge within the merge zone", "Merge completed, or merge aborted safely", "before the end of the acceleration lane", "TORC-SYSRQ-14124", ["H1", "H2"]),
 ("C16", "Exit within the exit zone", "Exit lane reached, or reroute", "before the gore", "TORC-SYSRQ-14125", ["H1"]),
 ("C17", "Move over or slow down for a stopped EMV", "Lane vacated, or speed", "≤ limit − 20 mph", "Texas Transportation Code §545.157", ["H1"]),
 ("C18", "Minimum highway speed", "Ego speed when unobstructed", "≥ min(curvature, rollover, legal, traffic speed) − 10 m/s", "TORC-SYSRQ-10167", ["H3"]),
]
criteria = {c[0]: dict(id=c[0], name=c[1], metric=c[2], threshold=c[3], req=c[4], hazards=c[5],
                       req_text=(JR.get(c[4]) or {}).get("text", "")[:400]) for c in CRIT}
LATERAL = {"lane_change", "move_over"}
EMVK = {"police", "ambulance", "fire", "tow", "txdot"}

def criteria_for(a, code, intent):
    c = a.get("configuration")
    out = ["C01"]
    if not c:
        return out + ({"lane_change": ["C02", "C03", "C05"], "stop_in_lane": ["C12"]}.get(intent, ["C07"]))
    r, acts = c["road"], [x for x in c["actors"] if x["mode"] != "off"]
    slots = {x["slot"] for x in acts}; mans = {m["type"] for x in acts for m in x.get("maneuvers", [])}; kinds = {k for x in acts for k in x["kinds"]}
    if intent in LATERAL: out += ["C02", "C03", "C04", "C05", "C06"]
    elif intent == "keep_lane": out += ["C07", "C08"]
    elif intent == "emergency_lateral": out += ["C06", "C12"]
    elif intent == "stop_on_shoulder": out += ["C05", "C06", "C12", "C13"]
    elif intent == "stop_in_lane": out += ["C12"]
    if code.endswith("ORM"): out.append("C15")
    if code.endswith("ORE"): out.append("C16")
    if intent == "keep_lane" and (slots & set("BDEFGS") or {"drift", "hug"} & mans): out.append("C06")
    if code.startswith("HW"): out.append("C10")
    if r.get("speedLimitMps"): out.append("C09")
    if r.get("curvature") or r.get("grade"): out.append("C11")
    if any(x["slot"] == "S" and set(x["kinds"]) & EMVK for x in acts): out.append("C17")
    if any(x["slot"] == "C" and "police" in x["kinds"] for x in acts) and intent == "stop_on_shoulder": out.append("C14")
    if intent == "keep_lane" and code.startswith("HW") and ((not slots & {"A", "O"} and "cut_in" not in mans) or "cut_out" in mans or "accelerate" in mans): out.append("C18")
    return list(dict.fromkeys(out))

# ---------------- HIRE rows and risk ----------------
H2 = CAT["hire2"]
def srank(r): return (int(r["S"][1]) if r.get("S") and r["S"][1:].isdigit() else 0, int(r["E"][1]) if r.get("E") and r["E"][1:].isdigit() else 0, int(r["C"][1]) if r.get("C") and r["C"][1:].isdigit() else 0)
used = set()
by_beh_hz = {}
for i, r in H2.items():
    code = MAP.get(r["code"]) if r["code"] != "STATE" else None
    if not code: continue
    k = (code, r["hz"])
    if k not in by_beh_hz or srank(r) > srank(H2[by_beh_hz[k]]): by_beh_hz[k] = i

# ---------------- ODD ----------------
defs = {e["jama_api_id"]: e for e in ODD["odd_element_definitions"]}
odd_elements = []
for v in ODD["odd_element_values"]:
    a = v.get("aggregated_characteristic") or {}
    e = defs.get(v.get("odd_element_definition_ref"), {})
    dist = (a.get("distribution") or {})
    bins = [dict(label=b.get("category") or (f"{b['bin_start']:g}–{b['bin_end']:g}" if b.get("bin_start") is not None else "n/a"), pct=round(b.get("percent") or 0, 3))
            for b in (dist.get("distribution") or []) if (b.get("percent") or 0) > 0]
    path = e.get("odd_path") or ""
    odd_elements.append(dict(name=v["display_name"], jama=e.get("jama_id"), layer=path.split(" ")[0] if path else "L5", path=path, unit=(a.get("observed_range") or {}).get("unit") or e.get("unit"),
                             spec=e.get("spec_range"), observed=a.get("observed_range"), metric=dist.get("metric"), source=a.get("data_source"), bins=bins[:24]))
odd_elements.insert(0, dict(name="Operating Speed Range", jama=None, layer="L0", path="L0 Ego Configuration > Operating Speed Range", unit="m/s",
                            spec={"min": "0", "max": "30.4", "unit": "m/s"}, observed=None, metric=None, source="Abstract Scenario Manager (Torc); TORC-SYSRQ-14073 caps the SDT at 29.05 m/s", bins=[]))
VARIANTS = [
 dict(id="V00", name="Nominal", desc="Dry, daylight, 3.66 m lanes, straight and flat road.", set={}, exposure=None, dims=[], sim=True, odd="baseline"),
 dict(id="V01", name="Narrow lane 3.35 m", desc="Lane width 2.75–3.5 m on the route.", set={"laneWidthM": 3.35}, exposure=3.74, dims=["laneWidthM"], sim=True, odd="Lane Width (TORC-ODD-76)"),
 dict(id="V02", name="Wide lane 3.9 m", desc="Lane width ≥ 3.75 m on the route.", set={"laneWidthM": 3.9}, exposure=10.6, dims=["laneWidthM"], sim=True, odd="Lane Width (TORC-ODD-76)"),
 dict(id="V03", name="Gentle curve R≈830 m", desc="Curvature 0.001–0.002 1/m.", set={"curvature": 0.0012}, exposure=0.92, dims=["curvature"], sim=True, odd="Curvature (TORC-ODD-360)"),
 dict(id="V04", name="Curve at ODD limit R≈455 m", desc="Curvature at the ODD specification edge, 0.0022 1/m.", set={"curvature": 0.0022}, exposure=0.30, dims=["curvature"], sim=True, odd="Curvature (TORC-ODD-360)"),
 dict(id="V05", name="Downhill −3.5 %", desc="Grade ≤ −3 % on the route.", set={"grade": -3.5}, exposure=1.72, dims=["grade"], sim=True, odd="Slope (TORC-ODD-79)"),
 dict(id="V06", name="Uphill +3.5 %", desc="Grade ≥ +3 % on the route.", set={"grade": 3.5}, exposure=1.97, dims=["grade"], sim=True, odd="Slope (TORC-ODD-79)"),
 dict(id="V07", name="Fresh breeze gusts 10 m/s", desc="Fresh breeze or stronger (Beaufort 5+), share of hours.", set={"windGustMps": 10}, exposure=1.36, dims=["windGustMps"], sim=True, odd="Wind (TORC-FLD-1559)"),
 dict(id="V08", name="Light rain", desc="Light rain < 2.5 mm/h, share of hours.", set={}, exposure=10.81, dims=["rain"], sim=False, odd="Rain (TORC-ODD-27)"),
 dict(id="V09", name="Heavy rain", desc="Heavy rain, share of hours.", set={}, exposure=0.24, dims=["rain"], sim=False, odd="Rain (TORC-ODD-27)"),
 dict(id="V10", name="Low sun glare", desc="Low sun 0–20° in the driving direction (SE and S headings dominate).", set={}, exposure=None, dims=["sun"], sim=False, odd="Sun Angle (TORC-ODD-36)"),
]
nom = 100 - sum(v["exposure"] or 0 for v in VARIANTS[1:] if v["sim"]) - sum(v["exposure"] or 0 for v in VARIANTS if not v["sim"])
VARIANTS[0]["exposure"] = round(nom, 1)
LANE_SHARE = {1: 3.72, 2: 49.70, 3: 39.06, 4: 7.52}

# ---------------- scenarios ----------------
fam = {k: dict(name=v[0], desc=v[1]) for k, v in FAMILIES.items()}
scenarios = []
for a in CAT["abstracts"]:
    t, d = EN[a["id"]]
    desc = d or a.get("description") or ""
    links = {}
    for oc in a["beh_codes"]:
        code = MAP[oc]
        L = a["hire_links"][oc]
        intent = (a.get("intent") or {}).get(oc) or old_beh[oc]["default"]["intent"]
        prev = links.get(code)
        rows = sorted(set(L["rows"]) | (set(prev["rows"]) if prev else set()), key=lambda i: (tuple(-x for x in srank(H2[i])), i))
        used.update(rows)
        by_hz = {h: by_beh_hz[(code, h)] for h in HZ if (code, h) in by_beh_hz}
        used.update(by_hz.values())
        crit = criteria_for(a, code, intent)
        risk = {}
        for cid in crit:
            cand = [by_hz[h] for h in criteria[cid]["hazards"] if h in by_hz]
            best = max(cand, key=lambda i: srank(H2[i])) if cand else (rows[0] if rows else None)
            risk[cid] = dict(row=best, direct=bool(cand))
        lvl = L["level"] if not prev else ("justifié" if "justifié" in (L["level"], prev["level"]) else L["level"])
        links[code] = dict(intent=intent if not prev else prev["intent"], level={"justifié": "justified", "justifié indirectement": "indirect", "à relire": "review"}[lvl],
                           rows=rows, worst=rows[0] if rows else None, by_hazard=by_hz, criteria=crit, risk=risk, hfs=sorted(set(L["hfs"]) | set(prev["hfs"] if prev else [])),
                           added_from_hire=bool((a.get("link_origin") or {}).get(oc)), legacy=(prev["legacy"] if prev else []) + [oc])
    cfg = a.get("configuration")
    scenarios.append(dict(id=a["id"], family=a["family"], title=t, desc=desc, perception=a.get("perception_dependent", False), generable=bool(cfg),
                          gen_note="Not generable yet: intersection, reverse, wrong-way or yard geometry is planned for milestone 2." if not cfg else None,
                          configuration=cfg, fixed=a.get("fixed") or {}, applicability=a.get("applicability") or {}, version=a.get("version", 1),
                          hazards=a.get("hazards") or [], jama=a.get("jama") or [], nhtsa=a.get("nhtsa") or [], tcs=a.get("tcs") or [],
                          foretellix=a.get("foretellix") or [], links=links))
hire = {i: dict(odd=H2[i]["odd"], man=H2[i]["man"], mal=H2[i]["mal"], ev=(H2[i].get("ev") or "")[:260], hz=H2[i]["hz"], S=H2[i]["S"], E=H2[i]["E"], C=H2[i]["C"], mrm=bool(H2[i]["mrm"])) for i in sorted(used)}
jama = {k: dict(id=k, name=v["name"], text=(v["text"] or "")[:600]) for k, v in JR.items()}
data = dict(meta=dict(name="Scenario Studio", version="3.0", corridor="DO-Crawl I-35 South", built="2026-10-07",
                      sources=["SERYTI catalogue v3 (121 abstracts)", "HIRE v2 (1,156 HARA)", "HFS V1 (138)", "Driver Out 2026 SDT Requirements (Jama export 26/03/2026)", "L1-L5 ODD report (I-35 South)", "Foretellix SAFE VMAD-SG1-11-06"]),
            behaviors=behaviors, hazards=hazards, criteria=criteria, odd=dict(elements=odd_elements, variants=VARIANTS, lane_share=LANE_SHARE, routes=[r["name"] for r in ODD["routes"]]),
            families=fam, scenarios=scenarios, hire=hire, jama=jama, nhtsa=CAT["nhtsa"], foretellix=CAT.get("foretellix", {}))
json.dump(data, open(OUT, "w"), ensure_ascii=False)
print("behaviors", len(behaviors), "scenarios", len(scenarios), "links", sum(len(s["links"]) for s in scenarios), "hire rows", len(hire), "bytes", OUT.stat().st_size)
print(collections.Counter(c for s in scenarios for c in s["links"]))
