from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
import json, sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
import lc_data as D

S = json.load(open(ROOT / "data/derived/studio_data.json"))
old = {a["id"]: a for a in S["abstracts"]}
LC = [b["id"] for b in S["behaviors"] if b["use_case"] == "Highway" and b["name"].startswith("Lane Changes")][0]

def act(slot, mode, kinds, **k):
    d = dict(slot=slot, mode=mode, kinds=kinds)
    d.update(k)
    return d
none = [{"type": "none"}]
def brake(dec, st): return [{"type": "none"}, {"type": "brake", "decelMps2": dec, "startS": st}]
TRUCK = dict(lengthM=22, widthM=2.6, heightM=4.1)
HWY = dict(types=["highway"])

def cfg(intent="lane_change", sides=["left"], lanes=[2, 3], start=["rightmost"], speed=[25, 31], actors=[], road=None, ego=None, ramp=False):
    r = dict(HWY, laneCounts=lanes, egoStartLanes=start)
    if road: r.update(road)
    if ramp: r["rampOnRight"] = True
    e = dict(TRUCK, speedMps=speed, intent=intent, sides=sides)
    if ego: e.update(ego)
    return dict(road=r, ego=e, actors=actors, rules={}, options=dict(includeEmptyBaseline=False, maxExpansion=20000))

C = {
 "LC-NOM-01": cfg(sides=["left", "right"], lanes=[2, 3, 4], start=["rightmost", "middle"]),
 "LC-NOM-02": cfg(actors=[act("A", "required", ["car"], distanceM=[30, 60], speedMps=[25]),
                          act("B", "required", ["car"], distanceM=[10, 30, 60], speedMps=[25, 31]),
                          act("C", "required", ["car"], distanceM=[20, 40], speedMps=[25]),
                          act("D", "required", ["car", "tractor_trailer"], distanceM=[10, 30, 60], speedMps=[25, 31, 35])]),
 "LC-NOM-03": cfg(actors=[act("A", "required", ["car", "tractor_trailer"], distanceM=[30, 60, 100], speedMps=[15, 20]),
                          act("B", "optional", ["car"], distanceM=[30, 60], speedMps=[31]),
                          act("D", "optional", ["car"], distanceM=[20, 50], speedMps=[31])]),
 "LC-NOM-04": cfg(sides=["right"], start=["leftmost"], actors=[act("D", "required", ["car", "tractor_trailer"], distanceM=[5, 15, 30], speedMps=[20, 25]),
                          act("B", "optional", ["car"], distanceM=[40], speedMps=[25])]),
 "LC-TGT-01": cfg(actors=[act("D", "required", ["car"], distanceM=[20, 50, 100], speedMps=[33, 38, 42]),
                          act("B", "optional", ["car"], distanceM=[40], speedMps=[31])]),
 "LC-TGT-02": cfg(lanes=[3, 4], speed=[25], actors=[act("A", "optional", ["car"], distanceM=[40], speedMps=[25]),
                          act("B", "required", ["car"], distanceM=[30], speedMps=[25]),
                          act("C", "optional", ["car"], distanceM=[30], speedMps=[25]),
                          act("D", "required", ["car"], distanceM=[30], speedMps=[25]),
                          act("E", "required", ["car", "pickup"], offsetM=[-40, -20, -5, 10], speedMps=[25, 28], maneuvers=[{"type": "lane_change_into_target", "startS": [0, 1.5]}]),
                          act("F", "optional", ["car"], distanceM=[30], speedMps=[28])]),
 "LC-TGT-03": cfg(actors=[act("D", "required", ["car"], distanceM=[15, 30], speedMps=[25], maneuvers=[{"type": "accelerate", "accelMps2": [1, 2.5], "startS": [0.5, 1.5]}]),
                          act("B", "required", ["car"], distanceM=[40], speedMps=[25])]),
 "LC-TGT-04": cfg(actors=[act("B", "required", ["car", "tractor_trailer"], distanceM=[20, 40], speedMps=[25], maneuvers=[{"type": "brake", "decelMps2": [3, 6, 9], "startS": [1, 2]}]),
                          act("D", "required", ["car"], distanceM=[20, 40], speedMps=[25])]),
 "LC-TGT-05": cfg(actors=[act("D", "required", ["car", "pickup"], offsetM=[-40, -20, -10, 0], speedMps=[25, 26])]),
 "LC-TGT-06": cfg(actors=[act("D", "required", ["motorcycle"], offsetM=[-40, -18, -8, 0], speedMps=[25, 28])]),
 "LC-TGT-07": cfg(road=dict(laneWidthM=[3.4, 3.66]), actors=[act("B", "required", ["wide_load", "tractor_trailer"], distanceM=[20, 40], speedMps=[22, 25]),
                          act("D", "optional", ["car"], distanceM=[40], speedMps=[28])]),
 "LC-CUR-01": cfg(actors=[act("A", "required", ["car", "tractor_trailer"], distanceM=[20, 40], speedMps=[25], maneuvers=[{"type": "brake", "decelMps2": [3, 6], "startS": [0.5, 2]}]),
                          act("B", "optional", ["car"], distanceM=[40], speedMps=[28]),
                          act("D", "optional", ["car"], distanceM=[30], speedMps=[31])]),
 "LC-CUR-02": cfg(intent="keep_lane", sides=[], actors=[act("A", "required", ["car", "tractor_trailer"], distanceM=[25], speedMps=[25], maneuvers=[{"type": "cut_out", "startS": [1]}]),
                          act("O", "required", ["stopped_vehicle", "lost_cargo"], distanceM=[60, 100, 150], lanes=["origin"]),
                          act("D", "optional", ["car"], distanceM=[30], speedMps=[31])]),
 "LC-CUR-03": cfg(actors=[act("C", "required", ["car", "pickup"], distanceM=[3, 8, 15], speedMps=[25, 28]),
                          act("B", "required", ["car"], distanceM=[30], speedMps=[25]),
                          act("D", "required", ["car"], distanceM=[30, 60], speedMps=[28])]),
 "LC-RD-01": cfg(road=dict(distanceToMandatoryM=[150, 400, 800]), actors=[act("B", "optional", ["car"], distanceM=[20, 50], speedMps=[25]),
                          act("D", "optional", ["car", "tractor_trailer"], distanceM=[20, 50], speedMps=[28])]),
 "LC-RD-02": cfg(road=dict(distanceToMandatoryM=[150, 300]), actors=[act("O", "required", ["cones"], distanceM=[150, 300], lanes=["origin"]),
                          act("B", "optional", ["car"], distanceM=[30], speedMps=[22]),
                          act("D", "optional", ["car"], distanceM=[30], speedMps=[25])], speed=[22, 27]),
 "LC-RD-03": cfg(lanes=[3, 4], actors=[act("E", "required", ["car"], offsetM=[-15, 10], speedMps=[25, 31], maneuvers=[{"type": "lane_change_into_target", "startS": [0.5, 2]}]),
                          act("F", "optional", ["car"], distanceM=[30], speedMps=[28], maneuvers=[{"type": "lane_change_into_target", "startS": [1]}]),
                          act("B", "optional", ["car"], distanceM=[40], speedMps=[25]),
                          act("D", "optional", ["car"], distanceM=[30], speedMps=[28])]),
 "LC-RD-04": cfg(sides=["right"], lanes=[3, 4], start=["middle", "leftmost"], road=dict(distanceToMandatoryM=[300, 800, 1500]),
                 actors=[act("B", "optional", ["car"], distanceM=[30], speedMps=[25]), act("D", "optional", ["car", "tractor_trailer"], distanceM=[20, 50], speedMps=[28])]),
 "LC-RD-05": cfg(ramp=True, actors=[act("G", "required", ["car", "pickup"], offsetM=[-20, 0, 15], speedMps=[18, 25], maneuvers=[{"type": "cut_in", "startS": [1, 3]}]),
                          act("D", "optional", ["car"], distanceM=[30], speedMps=[31])]),
 "LC-RD-06": cfg(sides=["left", "right"], start=["rightmost", "middle"], road=dict(markingQuality=["good", "faded", "missing", "double_exposure"])),
 "LC-RD-07": cfg(road=dict(curvature=[0, 0.001, 0.0022, 0.004], grade=[-6, 0, 6]), actors=[act("B", "optional", ["car"], distanceM=[40], speedMps=[25]),
                          act("D", "optional", ["car"], distanceM=[30], speedMps=[28])]),
 "LC-RD-08": cfg(road=dict(mapMismatch=["none", "lane_missing", "extra_lane", "shifted_lane"])),
 "LC-ABT-01": cfg(lanes=[3], actors=[act("E", "optional", ["car"], offsetM=[0, 10], speedMps=[27], maneuvers=[{"type": "lane_change_into_target", "startS": [2, 3, 4]}]),
                          act("D", "optional", ["car"], distanceM=[30], speedMps=[27], maneuvers=[{"type": "accelerate", "accelMps2": [2], "startS": [2, 3]}]),
                          act("B", "optional", ["car"], distanceM=[40], speedMps=[25], maneuvers=brake([5], [2, 3])),
                          act("C", "optional", ["car"], distanceM=[30], speedMps=[25])]),
 "LC-ABT-02": cfg(road=dict(shoulderWidthM=[0, 3.0], degradation=["sensor_loss", "localization_loss", "compute_derating"]),
                  actors=[act("B", "optional", ["car"], distanceM=[40], speedMps=[25]), act("C", "optional", ["car"], distanceM=[30], speedMps=[25]),
                          act("D", "optional", ["car"], distanceM=[30], speedMps=[28])]),
 "LC-OOD-01": cfg(intent="move_over", road=dict(shoulderWidthM=[3.0, 3.6]), actors=[act("S", "required", ["police", "tow", "txdot"], distanceM=[100, 200, 400], lateralOffsetM=[0, 0.8], speedMps=[0]),
                          act("D", "optional", ["car"], distanceM=[20, 60], speedMps=[31]),
                          act("B", "optional", ["car"], distanceM=[40], speedMps=[25])]),
 "LC-OOD-02": cfg(sides=["right"], start=["middle", "leftmost"], actors=[act("C", "required", ["ambulance", "police"], distanceM=[30, 100], speedMps=[35, 40]),
                          act("D", "optional", ["car"], distanceM=[20], speedMps=[25])]),
 "LC-OOD-03": cfg(actors=[act("O", "required", ["tire_debris", "lost_cargo"], distanceM=[30, 80, 150], lanes=["target"]),
                          act("D", "optional", ["car"], distanceM=[30], speedMps=[28])]),
 "LC-OOD-04": cfg(actors=[act("O", "required", ["crash_scene"], distanceM=[150, 300], lanes=["origin"]),
                          act("S", "optional", ["police", "ambulance"], distanceM=[150], lateralOffsetM=[0], speedMps=[0]),
                          act("B", "optional", ["car"], distanceM=[30], speedMps=[22]), act("D", "optional", ["car"], distanceM=[30], speedMps=[25])],
                 road=dict(shoulderWidthM=[3.0])),
}
FIXED = {"LC-OOD-01": {"fullyOnShoulder": True}}

abstracts = []
# reference abstract from the milestone-1 chain (DEMO-SHOULDER-01 values)
ref_hire = ["HW_ Lane Changes / Overtaking_No Steering_04", "HW_ Lane Changes / Overtaking_Insufficient Steering_04", "HW_ Lane Changes / Overtaking_No Deceleration_01", "HW_ Lane Changes / Overtaking_No Turn Signal_01"]
base_ood1 = old["LC-OOD-01"]
abstracts.append(dict(
    id="LC-REF-01", version=1, family="LC-OOD", name="sut_lane_change_for_stopped_vehicle_on_shoulder",
    torc_ref="DEMO-SHOULDER-01 · référence jalon 1",
    description="Un véhicule est arrêté entièrement sur l'accotement droit pendant que le SDT roule dans la voie de droite. Des véhicules devant et derrière peuvent être présents. La réponse du SDT est observée, jamais scriptée.",
    behaviors=[LC], source="Référence jalon 1 (valeurs de la démo DEMO-SHOULDER-01)", status="REFERENCE",
    lc_type="Mandatory (move-over)", phases="initialization > observation", static_odd="Shoulder Presence (TORC-ODD-81)",
    variants="Véhicules devant / derrière présents ou non ; 2 ou 3 voies ; distance et décalage du véhicule arrêté",
    rule="Se décaler dans la voie de gauche si elle est sûre, sinon ralentir. Oracle candidat, pas encore un critère de réussite.",
    tasks=["T1", "T2", "T4", "T5", "T6"], kpis=["K-SAF-01", "K-SAF-05", "K-CMP-04"], modifiers=[], odd_status="In-ODD",
    hazard_contexts=["Lateral clearance", "Longitudinal speed", "Signal intent for maneuver"], perception_dependent=False,
    hire=ref_hire, tcs=base_ood1["tcs"], fis=base_ood1["fis"], env="TorSim, perception parfaite", foretellix="",
    requirements=[{"id": "À confirmer", "title": "Exigences EMV de la matrice de septembre (15-222, 15-227, 15-228…)", "fixes": "highway ; véhicule entièrement sur l'accotement", "criterion": "À reprendre de l'exigence"}],
    applicability={"roadTypes": ["highway"]}, fixed={"fullyOnShoulder": True},
    expected_counts={"potential": 36, "valid": 36, "rejected": 0},
    configuration=dict(road=dict(types=["highway"], laneCounts=[2, 3], egoStartLanes=["rightmost"], shoulderWidthM=[3.6]),
                       ego=dict(speedMps=[20], lengthM=18, widthM=2.6, heightM=4, intent="move_over", sides=["left"]),
                       actors=[act("A", "optional", ["car"], distanceM=[30], speedMps=[15]), act("C", "optional", ["car"], distanceM=[30], speedMps=[15]),
                               act("S", "required", ["stopped_vehicle"], distanceM=[40, 60, 80], lateralOffsetM=[0, 0.8], speedMps=[0])],
                       rules={}, options=dict(includeEmptyBaseline=False, maxExpansion=20000))))
for s in D.S:
    o = old[s["id"]]
    a = {k: o[k] for k in ["id", "version", "family", "name", "torc_ref", "description", "behaviors", "source", "status", "lc_type", "phases", "static_odd", "variants", "rule", "tasks", "kpis", "modifiers", "odd_status", "hazard_contexts", "perception_dependent", "hire", "tcs", "fis", "env", "foretellix"]}
    a["requirements"] = []
    if s["id"] == "LC-OOD-01": a["perception_dependent"] = False
    a["applicability"] = {"roadTypes": ["highway"]}
    a["fixed"] = FIXED.get(s["id"], {})
    a["configuration"] = C[s["id"]]
    abstracts.append(a)

out = dict(S)
out["abstracts"] = abstracts
out.pop("parameters", None)
json.dump(out, open(ROOT / "data/derived/catalog.json", "w"), ensure_ascii=False)
print(len(abstracts))
