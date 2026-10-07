"""Justify every abstract -> behavior link with HIRE v2 (1,156 HARA) and the 138 HFS.
Post-processes catalog_full.json in place. All results PROPOSED."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
import json, re, collections, openpyxl
P = ROOT
cat = json.load(open(P / "catalogue/catalog_full.json"))

def beh_code(uc, name):
    n = re.sub(r"\s+", " ", name.lower().replace(" / ", "/")).strip()
    pre = {"Highway": "HW", "Urban": "URB", "Hub": "HUB"}.get(uc)
    if pre is None: return "STATE"
    for k, v in [("cruise", "CRU"), ("adaptive follow", "FOL"), ("lane change", "LC"), ("on-ramp", "ONR"), ("off-ramp", "OFR"), ("controlled stop on shoulder", "CSS"),
                 ("emergency stop in lane", "ESL"), ("emergency lateral", "ELM"), ("crosswalk", "XWK"), ("turn at intersection", "TRN"), ("going straight", "STR"),
                 ("stop in lane", "SIL"), ("low-speed", "LSD"), ("docking", "DCK"), ("pull-out", "PUL"), ("asset avoidance", "AVD"), ("emergency stop", "EST")]:
        if k in n:
            if pre == "HW" and v == "SIL": v = "ESL"   # 2 rows "Highway Stop in Lane": closest Torc behavior is Emergency Stop in Lane
            return f"{pre}-{v}"
    raise ValueError(name)

wb = openpyxl.load_workbook(P / "inputs/torc/2026_SDT_HIRE_from_HAZOP_v2.xlsx", read_only=True)
H = []
for r in wb["HIRE"].iter_rows(min_row=2, values_only=True):
    if not r[0]: continue
    H.append(dict(id=r[0].strip(), uc=r[2], beh=r[3], code=beh_code(r[2], r[3]), odd=r[4], man=r[5], ctx=r[6], gw=r[7], mal=r[8], ev=r[9], hz=r[10], S=r[11], E=r[13], C=r[15], mrm=r[18] or "", jama=r[19], src=r[21]))
wb = openpyxl.load_workbook(P / "inputs/torc/Hazardous_Functional_Scenarios_V1.xlsx", read_only=True)
HFS = []
for r in wb["HFS Catalogue"].iter_rows(min_row=2, values_only=True):
    if r[0]: HFS.append(dict(id=r[0], uc=r[1], code=beh_code(r[1], r[2]), hz=r[3], hzname=r[4], narrative=r[5], odd=r[9], nhara=r[12], mrm=r[16]))
HZN = {h["hz"]: h["hzname"] for h in HFS}
hfs_of = collections.defaultdict(list)
for h in HFS: hfs_of[(h["code"], h["hz"])].append(h["id"])

# ---- what each abstract exposes ----
ODD_RULES = [
    ("Shoulder — absent (no shoulder)", lambda r, k, a: any(v < 2 for v in r.get("shoulderWidthM", []))),
    ("Slope — steep grade (up to ±8 %)", lambda r, k, a: any(v != 0 for v in r.get("grade", []))),
    ("Curvature — sharp curve (up to 0.25 1/m)", lambda r, k, a: any(v > 0 for v in r.get("curvature", []))),
    ("Wind — strong crosswind / gusts", lambda r, k, a: bool(r.get("windGustMps"))),
    ("Lane Width — narrow (down to 2.5 m)", lambda r, k, a: any(v < 3.5 for v in r.get("laneWidthM", []))),
    ("Lane Boundary — degraded / absent markings", lambda r, k, a: bool(r.get("markingQuality"))),
    ("Work Zones", lambda r, k, a: "cones" in k),
    ("Vehicles — dense traffic / cut-in", lambda r, k, a: "cut_in" in a["mans"]),
    ("[Out-of-ODD] Disabled / stopped vehicle in lane or shoulder", lambda r, k, a: "stopped_vehicle" in k or a["stopped"]),
    ("[Out-of-ODD] Road workers / people in roadway", lambda r, k, a: "pedestrian" in k),
    ("VRU present", lambda r, k, a: bool({"pedestrian", "cyclist"} & k)),
    ("[Out-of-ODD] Crash scene / accident debris ahead", lambda r, k, a: "crash_scene" in k),
    ("Foreign Object Debris (FOD) in lane", lambda r, k, a: bool({"tire_debris", "lost_cargo"} & k)),
    ("[Out-of-ODD] Tire debris / blown tire / lost cargo", lambda r, k, a: bool({"tire_debris", "lost_cargo"} & k)),
    ("[Out-of-ODD] Animal on roadway", lambda r, k, a: bool({"deer", "livestock"} & k)),
    ("[Out-of-ODD] EMV present (shoulder / in-lane)", lambda r, k, a: bool({"police", "ambulance", "fire", "tow", "txdot"} & k)),
    ("[Out-of-ODD] Sudden object intrusion", lambda r, k, a: a["close_obj"]),
]
NOT_MODELLED = {"Rain — Light / Moderate (wet road)", "Rain — Heavy / standing water", "Sun Angle — low sun / glare", "Air Temperature — high (up to 110 °F)"}
LATERAL = {"lane_change", "move_over", "emergency_lateral", "stop_on_shoulder"}
DEF_INTENT = {b["code"]: b["default"]["intent"] for b in cat["behaviors"]}

def scene(a, code):
    c = a.get("configuration")
    if not c: return None
    r, acts = c["road"], [x for x in c["actors"] if x["mode"] != "off"]
    kinds = {k for x in acts for k in x["kinds"]}
    mans = {m["type"] for x in acts for m in x.get("maneuvers", [])}
    slots = {x["slot"] for x in acts}
    stopped = any(x["slot"] in "ABS" and set(x.get("speedMps", [1])) == {0} for x in acts)
    close_obj = any(x["slot"] == "O" and min(x.get("distanceM", [999])) <= 40 for x in acts)
    info = dict(mans=mans, stopped=stopped, close_obj=close_obj)
    odd = [name for name, f in ODD_RULES if f(r, kinds, info)]
    intent = (a.get("intent") or {}).get(code) or DEF_INTENT.get(code, "keep_lane")
    hz = set()
    if "A" in slots or ("O" in slots) or ({"cut_in"} & mans) or intent in ("lane_change", "move_over") and "B" in slots: hz.add("H2")
    if slots & set("BDEFGS") or intent in LATERAL or {"drift", "hug"} & mans: hz.add("H1")
    if "C" in slots or intent in ("stop_in_lane", "stop_on_shoulder") or "brake" in mans or stopped or "O" in slots: hz.add("H3")
    if intent in LATERAL or intent in ("stop_in_lane", "stop_on_shoulder"): hz.add("H4")
    if code.endswith("ONR") and (r.get("curvature") or r.get("grade")): hz.add("H5")
    if odd and any(o.startswith(("Slope", "Curvature", "Wind", "Lane Width", "Lane Boundary")) for o in odd) or intent == "emergency_lateral" or r.get("degradation"): hz.add("H5")
    cmd = set()
    if "A" in slots or "O" in slots or "C" in slots or {"cut_in", "brake", "take_exit"} & mans or stopped or intent in ("stop_in_lane", "stop_on_shoulder") or code.endswith(("ONR", "OFR")) or r.get("curvature") or r.get("grade") or r.get("speedLimitMps"): cmd.add("Deceleration command")
    if "A" in slots or "C" in slots or {"cut_out", "accelerate"} & mans or intent in ("lane_change", "move_over") or code.endswith("ONR") or r.get("speedLimitMps") or r.get("grade"): cmd.add("Acceleration command")
    if intent in LATERAL or slots & set("BDEFGSO") or {"drift", "hug", "cut_in"} & mans or any(r.get(k) for k in ("curvature", "windGustMps", "laneWidthM", "markingQuality", "mapMismatch")) or not slots: cmd.add("Steering command")
    if intent in LATERAL: cmd.add("Turn Signal command")
    if intent in ("stop_in_lane", "stop_on_shoulder", "emergency_lateral") or r.get("degradation"): cmd |= {"Hazard Lights command", "Brake Lights command"}
    if "brake" in mans or stopped or "O" in slots: cmd.add("Brake Lights command")
    return dict(odd=odd, hz=sorted(hz), intent=intent, cmd=sorted(cmd))

by_code = collections.defaultdict(list)
for h in H: by_code[h["code"]].append(h)
LEVEL_ORDER = ["justifié", "justifié indirectement", "à relire"]
links_out = []
for a in cat["abstracts"]:
    a["hire_links"] = {}
    declared = set(a.get("hazards") or [])
    for code in a["beh_codes"]:
        rows = by_code.get(code, [])
        sc = scene(a, code)
        derived = set(sc["hz"]) if sc else set()
        cmds = set(sc["cmd"]) if sc else None
        man = lambda h: h["man"].replace(" (MRM)", "").replace(" (maintain 0)", "")
        if cmds is not None:
            d_rows = [h for h in rows if h["hz"] in declared and man(h) in cmds]
            s_rows = [h for h in rows if h["hz"] in (declared | derived) and man(h) in cmds and h not in d_rows]
        else:  # not generable yet: hazard only
            d_rows = []
            s_rows = [h for h in rows if h["hz"] in declared]
        odd = sc["odd"] if sc else []
        odd_hire = sorted({h["odd"] for h in rows})
        odd_match = [o for o in odd if o in odd_hire]
        odd_missing = [o for o in odd if o not in odd_hire]
        if d_rows: level = "justifié"
        elif s_rows: level = "justifié indirectement"
        else: level = "à relire"
        sup = d_rows or s_rows
        hz_all = sorted({h['hz'] for h in d_rows + s_rows})
        # rows on the abstract's own ODD condition first, then nominal
        sup = sorted(sup, key=lambda h: (h["odd"] not in odd_match, h["odd"] != "Nominal (dry / day / clear)", h["id"]))
        hz_used = sorted({h["hz"] for h in sup})
        why = (f"Le HIRE de {code} relie une déviation de commande sollicitée par la scène ({', '.join(sorted({man(h) for h in sup}))}) au hazard de l'abstract ({', '.join(hz_used)})" if level == "justifié"
               else ("Abstract pas encore générable : lien fondé sur le hazard seul (" + ", ".join(hz_used) + ")") if cmds is None
               else f"Le hazard déclaré n'est pas relié dans le HIRE aux commandes sollicitées ; la scène expose aussi {', '.join(hz_used)}, relié(s) à {', '.join(sorted({man(h) for h in sup}))}" if level == "justifié indirectement"
               else ("Aucune ligne HIRE pour ce behavior" if not rows else "Le HIRE de ce behavior ne contient que " + ", ".join(sorted({h['hz'] for h in rows})) + " ; l'abstract porte " + (", ".join(sorted(declared | derived)) or "aucun hazard")))
        L = dict(level=level, why=why, hz=hz_used, rows=[h["id"] for h in sup], n=len(sup), hfs=sorted({i for z in hz_used for i in hfs_of[(code, z)]}),
                 odd_match=odd_match, odd_missing=odd_missing, scene_hz=sorted(derived), cmd=sorted(cmds) if cmds is not None else [], hz_all=hz_all)
        a["hire_links"][code] = L
        links_out.append((a["id"], code, L))

# ---- gaps: HIRE (behavior x hazard) and (behavior x ODD condition) with no abstract ----
abs_by_code = collections.defaultdict(list)
for a in cat["abstracts"]:
    for code in a["beh_codes"]: abs_by_code[code].append(a)
gaps = []
combos = collections.defaultdict(list)
for h in H: combos[(h["code"], h["hz"])].append(h)
for (code, hz), rows in sorted(combos.items()):
    if code == "STATE": continue
    cov = [a["id"] for a in abs_by_code[code] if hz in a["hire_links"][code]["hz_all"]]
    gaps.append(dict(kind="hazard", code=code, uc=rows[0]["uc"], key=hz, label=f"{hz} {HZN.get(hz, '')}", n=len(rows), mrm=sum(1 for h in rows if h["mrm"]), covered_by=cov,
                     hfs=hfs_of[(code, hz)], mals=sorted({h["mal"] for h in rows})[:12], cmds=sorted({h["man"].replace(" (MRM)", "") for h in rows}), candidates=[]))
oddc = collections.defaultdict(list)
for h in H:
    if h["code"] != "STATE" and h["odd"] not in ("Nominal (dry / day / clear)", "Any (condition-independent)"): oddc[(h["code"], h["odd"])].append(h)
for (code, odd), rows in sorted(oddc.items()):
    cov = [a["id"] for a in abs_by_code[code] if odd in a["hire_links"][code]["odd_match"]]
    uc_ok = {"HW": "Highway", "URB": "Urban", "HUB": "Hub"}[code.split("-")[0]]
    cand = [a["id"] for a in cat["abstracts"] if a.get("configuration") and uc_ok in a.get("use_cases", []) and code not in a["beh_codes"] and odd in (scene(a, a["beh_codes"][0]) or {}).get("odd", [])]
    gaps.append(dict(kind="odd", code=code, uc=rows[0]["uc"], key=odd, label=odd, n=len(rows), mrm=sum(1 for h in rows if h["mrm"]), covered_by=cov,
                     hfs=[], mals=sorted({h["mal"] for h in rows})[:12], not_modelled=odd in NOT_MODELLED, candidates=cand))
state_rows = [h for h in H if h["code"] == "STATE"]

cat["hire2"] = {h["id"]: {k: h[k] for k in ("uc", "beh", "code", "odd", "man", "gw", "mal", "ev", "hz", "S", "E", "C", "mrm", "jama")} for h in H}
cat["hfs"] = {h["id"]: {k: h[k] for k in ("uc", "code", "hz", "hzname", "narrative", "nhara", "mrm")} for h in HFS}
cat["hire_gaps"] = gaps
cat["hazard_names"] = HZN
json.dump(cat, open(P / "catalogue/catalog_full.json", "w"), ensure_ascii=False)

C = collections.Counter(L["level"] for _, _, L in links_out)
print("links", len(links_out), dict(C))
print("by behavior:")
bb = collections.defaultdict(collections.Counter)
for _, code, L in links_out: bb[code][L["level"]] += 1
for k in sorted(bb): print(" ", k, dict(bb[k]))
hg = [g for g in gaps if g["kind"] == "hazard"]; og = [g for g in gaps if g["kind"] == "odd"]
print("hazard combos", len(hg), "uncovered", sum(1 for g in hg if not g["covered_by"]))
print("odd combos", len(og), "uncovered", sum(1 for g in og if not g["covered_by"]), "of which not modelled", sum(1 for g in og if not g["covered_by"] and g["not_modelled"]))
print("state rows", len(state_rows))
print("à relire:", [(i, c) for i, c, L in links_out if L["level"] == "à relire"])
