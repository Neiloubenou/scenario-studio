from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
import json, sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
import lc_data as D
import openpyxl

SRC = str(ROOT / "inputs/torc") + "/"
ref = json.load(open(ROOT / "data/derived/ref.json"))
TC, FI = ref["tc"], ref["fi"]

# Behavior Table (Jama, M. Pittavino 2026-03-21)
BT = [
    ("Highway", "Lane-Centered Cruise", "DDT", "S,TC"),
    ("Highway", "Lane-Centered Adaptive Follow", "DDT", "S,E"),
    ("Highway", "Lane Changes / Overtaking", "DDT", "S,TC,E,C"),
    ("Highway", "On-Ramp Merge", "DDT", "S,TC,E,C"),
    ("Highway", "Off-Ramp Exit", "DDT", "S,C"),
    ("Highway", "Controlled Stop on Shoulder", "DDT-F", "S,TC"),
    ("Highway", "Emergency Stop in Lane", "DDT-F", "S"),
    ("Highway", "Emergency Lateral Motion", "DDT-F", "S,TC"),
    ("Urban", "Lane-Centered Cruise", "DDT", "S,TC"),
    ("Urban", "Lane-Centered Adaptive Follow", "DDT", "S,TC"),
    ("Urban", "Lane Changes / Overtaking", "DDT", "S,TC"),
    ("Urban", "Crosswalk Yield", "DDT", "S,TC,C"),
    ("Urban", "Protected/Unprotected Turn at Intersection", "DDT", "S,TC,C"),
    ("Urban", "Going Straight through Protected/Unprotected Intersection", "DDT", "S,TC,C"),
    ("Urban", "Stop in Lane", "DDT / DDT-F", "S,TC"),
    ("Urban", "Emergency Lateral Motion", "DDT-F", "S,TC,C"),
    ("Hub", "Low-Speed Driving", "DDT", "S,TC"),
    ("Hub", "Docking / Parking", "DDT", "S,E"),
    ("Hub", "Pull-Out / Departure", "DDT", "S,E,C"),
    ("Hub", "Asset Avoidance / Shared-Space Crawl", "DDT", "S,E"),
    ("Hub", "Emergency Stop", "DDT", "S,TC,E"),
]
CAT = {"S": "Safety", "TC": "Traffic compliance", "E": "Efficiency", "C": "Courtesy"}
PFX = {"Highway": "HW", "Urban": "URB", "Hub": "HUB"}
def slug(s):
    import re
    return re.sub(r"[^A-Z0-9]+", "-", s.upper()).strip("-")
behaviors = []
for uc, name, ddt, cats in BT:
    behaviors.append(dict(id=f"BEH-{PFX[uc]}-{slug(name)}"[:40], use_case=uc, name=name, ddt=ddt,
                          categories=[CAT[c] for c in cats.split(",")], source="Jama Behavior Table (2026-03-21)"))
LC_BEH = [b["id"] for b in behaviors if b["use_case"] == "Highway" and b["name"].startswith("Lane Changes")][0]

# Parameter library
P = {
 "sdt_speed": dict(label="Vitesse SDT", unit="mph", kind="num", min=45, max=75, levels=4, src="Speed Limit TORC-ODD-84", status="ODD"),
 "lc_side": dict(label="Côté du changement", unit="", kind="enum", values=["left", "right"], src="", status="proposed"),
 "lane_count": dict(label="Nombre de voies", unit="", kind="enum", values=[2, 3, 4], src="Lane Count TORC-ODD-356", status="ODD"),
 "origin_lane": dict(label="Voie d'origine", unit="", kind="enum", values=["rightmost", "middle", "leftmost"], src="", status="proposed"),
 "front_gap": dict(label="Gap avant (B)", unit="s", kind="num", min=0.5, max=6, levels=3, src="L4 gap, non caractérisé", status="GAP"),
 "rear_gap": dict(label="Gap arrière (D)", unit="s", kind="num", min=0.5, max=6, levels=3, src="L4 gap, non caractérisé", status="GAP"),
 "d_rel_speed": dict(label="Vitesse relative D", unit="mph", kind="num", min=-20, max=30, levels=3, src="L4 cinématique, non caractérisée", status="GAP"),
 "a_rel_speed": dict(label="Vitesse relative A", unit="mph", kind="num", min=-25, max=-5, levels=3, src="", status="proposed"),
 "closing_speed": dict(label="Vitesse d'approche de D", unit="mph", kind="num", min=0, max=30, levels=4, src="L4 cinématique, non caractérisée", status="GAP"),
 "d_accel": dict(label="Accélération de D", unit="m/s²", kind="num", min=0.5, max=3, levels=3, src="", status="proposed"),
 "d_reaction": dict(label="Délai de réaction de D", unit="s", kind="num", min=0, max=3, levels=3, src="", status="proposed"),
 "actor_decel": dict(label="Décélération de l'acteur", unit="m/s²", kind="num", min=1, max=8, levels=4, src="", status="proposed"),
 "phase_at_trigger": dict(label="Phase au déclenchement", unit="", kind="enum", values=["prepare", "early_execute", "late_execute"], src="", status="proposed"),
 "e_variant": dict(label="Variante de E", unit="", kind="enum", values=["hold_sdt_speed", "accelerate", "decelerate", "no_signal"], src="Miro Concrete B", status="proposed"),
 "e_lc_start": dict(label="Départ de E vs SDT", unit="s", kind="num", min=-2, max=3, levels=3, src="", status="proposed"),
 "e_long_offset": dict(label="Décalage longitudinal de E", unit="m", kind="num", min=-30, max=30, levels=5, src="", status="proposed"),
 "d_pos_trailer": dict(label="Position de D le long de la remorque", unit="m", kind="num", min=-25, max=5, levels=4, src="", status="proposed"),
 "actor_kind": dict(label="Type d'acteur", unit="", kind="enum", values=["car", "pickup", "tractor_trailer"], src="TC-CRAWL L4", status="proposed"),
 "moto_lateral_offset": dict(label="Décalage latéral moto", unit="m", kind="num", min=-1, max=1, levels=3, src="", status="proposed"),
 "lateral_excursion": dict(label="Excursion latérale de l'acteur", unit="m", kind="num", min=0, max=1, levels=3, src="", status="proposed"),
 "lane_width": dict(label="Largeur de voie", unit="m", kind="num", min=2.75, max=4.0, levels=3, src="Lane Width TORC-ODD-76", status="ODD"),
 "distance_to_actor": dict(label="Distance à A", unit="m", kind="num", min=10, max=80, levels=3, src="", status="proposed"),
 "reveal_distance": dict(label="Distance de découverte de l'obstacle", unit="m", kind="num", min=20, max=150, levels=4, src="", status="proposed"),
 "target_lane_free": dict(label="Voie cible libre", unit="", kind="enum", values=["yes", "no"], src="", status="proposed"),
 "c_headway": dict(label="Temps inter-véhicule de C", unit="s", kind="num", min=0.3, max=1.5, levels=3, src="", status="proposed"),
 "distance_to_mandatory": dict(label="Distance au point obligatoire", unit="m", kind="num", min=100, max=1600, levels=4, src="Carte, par site", status="proposed"),
 "traffic_volume": dict(label="Débit", unit="veh/h", kind="num", min=300, max=1950, levels=3, src="TCDS (rapport ODD)", status="ODD"),
 "marking_conflict": dict(label="Marquage temporaire en conflit", unit="", kind="enum", values=["yes", "no"], src="Work Zones TORC-FLD-1569", status="GAP"),
 "closure_in_map": dict(label="Fermeture dans la carte", unit="", kind="enum", values=["yes", "no"], src="", status="proposed"),
 "light": dict(label="Lumière", unit="", kind="enum", values=["day", "night"], src="", status="proposed"),
 "weave_length": dict(label="Longueur de l'entrecroisement", unit="m", kind="num", min=200, max=800, levels=3, src="", status="proposed"),
 "weaving_actors": dict(label="Acteurs qui s'entrecroisent", unit="", kind="num", min=0, max=6, levels=3, integer=True, src="", status="proposed"),
 "ramp_rel_speed": dict(label="Vitesse relative du véhicule de bretelle", unit="mph", kind="num", min=-30, max=0, levels=3, src="", status="proposed"),
 "marking_quality": dict(label="État du marquage", unit="", kind="enum", values=["good", "faded", "missing", "double_exposure", "shadow"], src="Lane Boundary TORC-FLD-1588", status="GAP"),
 "curvature": dict(label="Courbure", unit="1/m", kind="num", min=0, max=0.0022, levels=3, src="Curvature TORC-ODD-360", status="ODD"),
 "grade": dict(label="Pente", unit="%", kind="num", min=-6, max=6, levels=3, src="Slope TORC-ODD-79", status="ODD"),
 "sight_distance": dict(label="Distance de visibilité", unit="m", kind="num", min=50, max=400, levels=3, src="", status="proposed"),
 "mismatch_type": dict(label="Écart carte / réalité", unit="", kind="enum", values=["lane_missing", "extra_lane", "shifted_lane"], src="", status="proposed"),
 "lateral_progress": dict(label="Avancement latéral au déclenchement", unit="%", kind="num", min=0, max=100, levels=5, integer=True, src="", status="proposed"),
 "trigger_type": dict(label="Déclencheur", unit="", kind="enum", values=["d_accelerates", "e_merges", "b_brakes"], src="", status="proposed"),
 "degradation_type": dict(label="Dégradation", unit="", kind="enum", values=["sensor_loss", "localization_loss", "compute_derating"], src="", status="proposed"),
 "shoulder_present": dict(label="Accotement présent", unit="", kind="enum", values=["yes", "no"], src="Shoulder Presence TORC-ODD-81", status="GAP"),
 "detection_distance": dict(label="Distance de détection", unit="m", kind="num", min=50, max=400, levels=3, src="", status="proposed"),
 "emv_kind": dict(label="Type d'EMV", unit="", kind="enum", values=["police", "ambulance", "fire", "txdot", "tow"], src="", status="proposed"),
 "emv_closing": dict(label="Vitesse d'approche de l'EMV", unit="mph", kind="num", min=10, max=50, levels=3, src="", status="proposed"),
 "object_size": dict(label="Taille de l'objet", unit="m", kind="num", min=0.1, max=2, levels=3, src="FOD TORC-ODD-844", status="GAP"),
 "dist_from_merge": dict(label="Distance au point d'insertion", unit="m", kind="num", min=0, max=150, levels=3, src="", status="proposed"),
 "closure_side": dict(label="Côté de la fermeture", unit="", kind="enum", values=["left", "right", "center"], src="", status="proposed"),
}
BASE = ["sdt_speed", "lc_side", "lane_count", "origin_lane"]
G = {  # per abstract: extra params, overrides, lanes needed on side, slots, perception flag, oracle
 "LC-NOM-01": dict(p=[], slots=[], perc=False, oracle="free"),
 "LC-NOM-02": dict(p=["front_gap", "rear_gap", "d_rel_speed"], slots=["A", "B", "C", "D"], perc=False, oracle="gap"),
 "LC-NOM-03": dict(p=["a_rel_speed", "distance_to_actor", "front_gap", "rear_gap"], slots=["A", "B", "D"], perc=False, oracle="gap"),
 "LC-NOM-04": dict(p=["rear_gap", "d_rel_speed"], slots=["D"], perc=False, oracle="gap", ov={"d_rel_speed": dict(min=-10, max=10)}),
 "LC-TGT-01": dict(p=["rear_gap", "closing_speed", "phase_at_trigger"], slots=["B", "D"], perc=False, oracle="gap_closing"),
 "LC-TGT-02": dict(p=["e_variant", "e_lc_start", "e_long_offset"], slots=["A", "B", "C", "D", "E", "F"], perc=False, oracle="merge", side_lanes=2),
 "LC-TGT-03": dict(p=["rear_gap", "d_accel", "d_reaction"], slots=["B", "D"], perc=False, oracle="closing_gap"),
 "LC-TGT-04": dict(p=["front_gap", "rear_gap", "actor_decel", "phase_at_trigger"], slots=["B", "D"], perc=False, oracle="lead_brake"),
 "LC-TGT-05": dict(p=["d_pos_trailer", "actor_kind"], slots=["D"], perc=False, oracle="alongside"),
 "LC-TGT-06": dict(p=["d_pos_trailer", "moto_lateral_offset"], slots=["D"], perc=True, oracle="alongside"),
 "LC-TGT-07": dict(p=["lateral_excursion", "lane_width"], slots=["B", "D"], perc=False, oracle="rule"),
 "LC-CUR-01": dict(p=["actor_decel", "distance_to_actor", "phase_at_trigger", "target_lane_free"], slots=["A", "B", "D"], perc=False, oracle="origin_brake"),
 "LC-CUR-02": dict(p=["reveal_distance", "target_lane_free"], slots=["A", "O", "D"], perc=False, oracle="evasive"),
 "LC-CUR-03": dict(p=["c_headway"], slots=["C", "B", "D"], perc=False, oracle="rule"),
 "LC-RD-01": dict(p=["distance_to_mandatory", "traffic_volume"], slots=["B", "D", "C"], perc=False, oracle="mandatory", ov={"lc_side": dict(values=["left"]), "origin_lane": dict(values=["rightmost"])}),
 "LC-RD-02": dict(p=["distance_to_mandatory", "marking_conflict", "closure_in_map", "light"], slots=["B", "D", "S", "O"], perc=True, oracle="mandatory"),
 "LC-RD-03": dict(p=["weave_length", "weaving_actors", "traffic_volume"], slots=["E", "F", "B", "D"], perc=False, oracle="rule"),
 "LC-RD-04": dict(p=["distance_to_mandatory", "traffic_volume"], slots=["B", "D"], perc=False, oracle="mandatory", ov={"lc_side": dict(values=["right"]), "distance_to_mandatory": dict(min=200, max=2000)}),
 "LC-RD-05": dict(p=["ramp_rel_speed", "target_lane_free"], slots=["E", "B", "D"], perc=False, oracle="courtesy", ov={"lc_side": dict(values=["left"]), "origin_lane": dict(values=["rightmost"])}),
 "LC-RD-06": dict(p=["marking_quality", "light"], slots=[], perc=True, oracle="rule"),
 "LC-RD-07": dict(p=["curvature", "grade", "sight_distance"], slots=["B", "D"], perc=False, oracle="rule"),
 "LC-RD-08": dict(p=["mismatch_type"], slots=[], perc=True, oracle="rule"),
 "LC-ABT-01": dict(p=["lateral_progress", "trigger_type"], slots=["A", "B", "C", "D", "E"], perc=False, oracle="abort"),
 "LC-ABT-02": dict(p=["lateral_progress", "degradation_type", "shoulder_present"], slots=["B", "C", "D"], perc=False, oracle="fallback"),
 "LC-OOD-01": dict(p=["detection_distance", "emv_kind", "target_lane_free"], slots=["S", "B", "D"], perc=True, oracle="move_over", ov={"lc_side": dict(values=["left"]), "origin_lane": dict(values=["rightmost"])}),
 "LC-OOD-02": dict(p=["emv_closing", "traffic_volume"], slots=["C", "B", "D"], perc=True, oracle="rule", ov={"lc_side": dict(values=["right"])}),
 "LC-OOD-03": dict(p=["object_size", "dist_from_merge"], slots=["O"], perc=True, oracle="rule"),
 "LC-OOD-04": dict(p=["closure_side", "traffic_volume"], slots=["S", "O", "B", "D"], perc=True, oracle="rule"),
}

hire_rows = []
wb = openpyxl.load_workbook(SRC + "2026_SDT_HIRE_from_HAZOP_v1.xlsx", read_only=True, data_only=True)
for r in list(wb["HIRE"].iter_rows(values_only=True))[1:]:
    if r[2] == "Highway" and "Lane Change" in str(r[3]):
        hire_rows.append(dict(id=r[0], ctx=r[6], gw=r[7], mal=r[8], ev=r[9], hz=r[10], S=r[11], E=r[13], C=r[15], srat=r[12], crat=r[16]))

def split(s): return [x.strip() for x in s.split(",") if x.strip()]
abstracts = []
for s in D.S:
    g = G[s["id"]]
    tcs = split(s["tcs"])
    abstracts.append(dict(
        id=s["id"], version=1, family=s["fam"], name=s["name"], torc_ref=s["torc"], description=s["desc"],
        behaviors=[LC_BEH], source="SERYTI Lane Change library v0", status="PROPOSED",
        lc_type=s["lc_type"], actors=s["actors"], slots=g["slots"], phases=s["phases"], static_odd=s["static"],
        variants=s["variants"], rule=s["wanted"], tasks=split(s["tasks"].replace(" (fallback planner)", "")),
        kpis=split(s["kpis"]), modifiers=split(s["mods"]), odd_status=s["odd"], hazard_contexts=s["ctx"],
        perception_dependent=g["perc"], oracle=g["oracle"], side_lanes=g.get("side_lanes", 1),
        parameters=[dict(key=k, **{kk: vv for kk, vv in g.get("ov", {}).get(k, {}).items()}) for k in BASE + g["p"]],
        hire=[h["id"] for h in hire_rows if h["ctx"] in s["ctx"]],
        tcs=tcs, fis=sorted({f for t in tcs for f in TC[t]["fi"]}),
        env=s["env"], foretellix=s["fx"]))

data = dict(
    meta=dict(generator="scenario-studio 0.1", corridor="DO-Crawl I-35 South", built="2026-10-07"),
    behaviors=behaviors, abstracts=abstracts, parameters=P,
    hire={h["id"]: h for h in hire_rows},
    tc={t: dict(layer=TC[t]["layer"], element=TC[t]["element"], tc=TC[t]["tc"], haz=TC[t]["haz"]) for a in abstracts for t in a["tcs"]},
    fi={f: FI[f] for a in abstracts for f in a["fis"]},
    kpis={k[0]: dict(cat=k[1], metric=k[2], definition=k[3], unit=k[4], threshold=k[5]) for k in D.KPIS},
    tasks={t[0]: dict(name=t[1], kpis=t[4]) for t in D.TASKS},
    modifiers={m[0]: dict(name=m[1], odd=m[2], effect=m[3]) for m in D.MODIFIERS},
    families={f[0]: dict(name=f[1], desc=f[2]) for f in D.FAMILIES},
)
json.dump(data, open(ROOT / "data/derived/studio_data.json", "w"), ensure_ascii=False)
print(len(behaviors), len(abstracts), len(hire_rows), len(json.dumps(data, ensure_ascii=False)))
