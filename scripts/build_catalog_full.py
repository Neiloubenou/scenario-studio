"""Full abstract-scenario catalogue for all 21 Torc behaviors (PROPOSED, SERYTI).
Abstracts are unique situations; each links to one or more behaviors (n:m)."""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
import json, sys, copy
sys.path.insert(0, str(Path(__file__).resolve().parent))
import lc_data as D

S = json.load(open(ROOT / "data/derived/studio_data.json"))
V2 = json.load(open(ROOT / "data/derived/catalog.json"))
REQS = {r["id"]: r for r in json.load(open(ROOT / "data/derived/sdt_reqs.json")) if r.get("id") and r["id"].startswith("TORC-")}
REQS["TORC-SYSRQ-15232"] = {"id": "TORC-SYSRQ-15232", "name": "EMV Pull-to-Shoulder", "desc": "LEO/EMV follows continuously for at least 20 s, suitable shoulder available: Pull-to-Shoulder completed within 70 s (rationale mentions 90 s, open point). Source: CRAWL_EMV_Handling_SYSREQ_vSep3 (local snapshot of the Scenario Studio repo).", "status": "snapshot"}
REQS["TORC-FSR-3752"] = {"id": "TORC-FSR-3752", "name": "HICD Stop-in-Lane MRM-E", "desc": "HICD Stop-in-Lane MRM request in Mode 2/3: transition to Stop-in-Lane MRC within TIME_TO_MRC_MRME_REMOTE_STOP (value not in the row). Source: CrawlFSRs Stop in Lane (local snapshot).", "status": "snapshot"}

# ---------- behaviors ----------
CODE = {}
for b in S["behaviors"]:
    pre = {"Highway": "HW", "Urban": "URB", "Hub": "HUB"}[b["use_case"]]
    short = {"Lane-Centered Cruise": "CRU", "Lane-Centered Adaptive Follow": "FOL", "Lane Changes / Overtaking": "LC", "On-Ramp Merge": "ONR", "Off-Ramp Exit": "OFR",
             "Controlled Stop on Shoulder": "CSS", "Emergency Stop in Lane": "ESL", "Emergency Lateral Motion": "ELM", "Crosswalk Yield": "XWK",
             "Protected/Unprotected Turn at Intersection": "TRN", "Going Straight through Protected/Unprotected Intersection": "STR", "Stop in Lane": "SIL",
             "Low-Speed Driving": "LSD", "Docking / Parking": "DCK", "Pull-Out / Departure": "PUL", "Asset Avoidance / Shared-Space Crawl": "AVD", "Emergency Stop": "EST"}[b["name"]]
    CODE[f"{pre}-{short}"] = b["id"]
JAMA_DEF = {"HW-CRU": "TORC-SYSRQ-10155", "HW-FOL": "TORC-SYSRQ-14122", "HW-LC": "TORC-SYSRQ-14123", "HW-ONR": "TORC-SYSRQ-14124", "HW-OFR": "TORC-SYSRQ-14125", "HW-ESL": "TORC-SYSRQ-14126", "HW-CSS": "TORC-SYSRQ-14127"}
BEH_DEFAULT = {"CRU": {"intent": "keep_lane"}, "FOL": {"intent": "keep_lane"}, "LC": {"intent": "lane_change"}, "ONR": {"intent": "lane_change", "sides": ["left"]},
               "OFR": {"intent": "lane_change", "sides": ["right"]}, "CSS": {"intent": "stop_on_shoulder"}, "ESL": {"intent": "stop_in_lane"}, "ELM": {"intent": "emergency_lateral"},
               "SIL": {"intent": "stop_in_lane"}, "EST": {"intent": "stop_in_lane"}}
behaviors = []
for b in S["behaviors"]:
    code = [k for k, v in CODE.items() if v == b["id"]][0]
    d = dict(b, code=code, default=BEH_DEFAULT.get(code.split("-")[1], {"intent": "keep_lane"}))
    j = JAMA_DEF.get(code)
    if j:
        r = REQS[j]
        d["jama"] = {"id": j, "name": r["name"], "status": r.get("status"), "text": r["desc"]}
    behaviors.append(d)

# ---------- helpers ----------
def act(slot, mode, kinds, **k):
    d = dict(slot=slot, mode=mode, kinds=kinds); d.update(k); return d
def man(t, **p): return [{"type": "none"}, dict(type=t, **p)]
def only(t, **p): return [dict(type=t, **p)]
def cfg(lanes=[2, 3], start=["rightmost"], speed=[22, 29], actors=(), road=None, sides=["left"], uc="Highway", ramp=False):
    r = dict(types=["highway" if uc == "Highway" else "surface_street"], laneCounts=lanes, egoStartLanes=start)
    if road: r.update(road)
    if ramp: r["rampOnRight"] = True
    return dict(road=r, ego=dict(lengthM=22, widthM=2.6, heightM=4.1, speedMps=speed, intent="keep_lane", sides=sides),
                actors=list(actors), rules={}, options=dict(includeEmptyBaseline=False, maxExpansion=20000))
FAM = {
 "LV": ("Véhicule leader dans la voie du SDT", "Ce que fait le véhicule devant : plus lent, freine, s'arrête, accélère."),
 "CI": ("Insertion devant le SDT (cut-in)", "Un véhicule entre dans la voie du SDT devant lui."),
 "ADJ": ("Véhicules adjacents", "Un véhicule dans une voie voisine se rapproche, dérive ou dépasse."),
 "LC-NOM": ("Changement de voie nominal", "Le SDT change de voie parce qu'il le veut."),
 "LC-TGT": ("Trafic dans la voie cible", "Ce qui rend le gap de la voie cible sûr ou non."),
 "LC-CUR": ("Événement dans la voie d'origine pendant le changement de voie", ""),
 "RMP": ("Bretelles : insertion, sortie, entrecroisement", ""),
 "LC-RD": ("Changement de voie imposé par la route", "Fin de voie, travaux, sortie, marquage, courbe, carte."),
 "RD": ("Route et infrastructure", "Largeur de voie, limite de vitesse, accotement, vent, pente."),
 "EMV": ("Véhicules d'urgence", ""),
 "LC-OOD": ("Événements hors ODD demandant un changement de voie", ""),
 "OBJ": ("Objets et usagers inattendus sur la chaussée", ""),
 "AB": ("Comportements anormaux des autres usagers", ""),
 "LC-ABT": ("Annulation et fallback pendant le changement de voie", ""),
 "FB": ("Fallback et MRM (DDT-F)", ""),
 "URB": ("Situations urbaines (intersections, piétons, cyclistes)", ""),
 "HUB": ("Situations de hub (cour, quai, zones partagées)", ""),
}
NEW = []
def A(id, fam, title, desc, beh, config=None, nhtsa=(), tcs=(), jama=(), hz=(), perc=False, intent=None, uc=("Highway",), note=None, fixed=None):
    NEW.append(dict(id=id, family=fam, name=title, title=title, description=desc, behaviors=[CODE[b] for b in beh], beh_codes=list(beh),
                    configuration=config, nhtsa=list(nhtsa), tcs=list(tcs), jama=list(jama), hazards=list(hz), perception_dependent=perc,
                    intent=intent or {}, use_cases=list(uc), gen_note=note, fixed=fixed or {}, applicability={"roadTypes": ["highway" if uc[0] == "Highway" else "surface_street"]} if config else {},
                    source="SERYTI catalogue v1 (PROPOSED)", status="PROPOSED", version=1, hire=[], requirements=[]))
GEOM = "Génération pas encore disponible : la géométrie d'intersection, de bretelle de sortie ou de cour n'est pas modélisée par le moteur (jalon 2)."

# ---------- LV ----------
A("LV-01", "LV", "Route libre, aucun leader", "Le SDT roule seul dans sa voie : comportement par défaut, vitesse et centrage.", ["HW-CRU", "URB-CRU"], cfg(lanes=[2, 3, 4], start=["rightmost", "middle"]), jama=["TORC-SYSRQ-10155", "TORC-SYSRQ-10154", "TORC-SYSRQ-10161", "TORC-SYSRQ-10167", "TORC-SYSRQ-14118"], hz=["H1", "H5"])
A("LV-02", "LV", "Leader plus lent à vitesse constante", "Le SDT rattrape un véhicule plus lent dans sa voie et passe en suivi.", ["HW-CRU", "HW-FOL", "URB-FOL"], cfg(actors=[act("A", "required", ["car", "tractor_trailer"], distanceM=[40, 80, 150], speedMps=[15, 20, 25])]), nhtsa=[25], jama=["TORC-SYSRQ-14122", "TORC-SYSRQ-14066"], hz=["H2"])
A("LV-03", "LV", "Leader qui décélère modérément", "Le leader ralentit sans urgence ; le SDT ajuste sa distance.", ["HW-FOL", "URB-FOL"], cfg(actors=[act("A", "required", ["car", "tractor_trailer"], distanceM=[25, 50], speedMps=[25], maneuvers=only("brake", decelMps2=[1.5, 3], startS=[1, 3]))]), nhtsa=[26], jama=["TORC-SYSRQ-14122", "TORC-SYSRQ-14066"], hz=["H2"])
A("LV-04", "LV", "Leader qui freine fort", "Le leader freine brutalement ; le SDT doit éviter la collision avant.", ["HW-FOL", "HW-ESL", "HW-ELM", "URB-FOL"], cfg(actors=[act("A", "required", ["car", "tractor_trailer"], distanceM=[20, 40], speedMps=[25], maneuvers=only("brake", decelMps2=[5, 7, 9], startS=[1]))]), nhtsa=[26], tcs=["TC-CRAWL-185"], jama=["TORC-SYSRQ-14066"], hz=["H2"])
A("LV-05", "LV", "Leader arrêté (fin de bouchon, véhicule arrêté)", "Un véhicule est arrêté dans la voie du SDT.", ["HW-CRU", "HW-FOL", "HW-ESL", "HW-ELM", "HW-LC", "URB-FOL"], cfg(actors=[act("A", "required", ["car", "tractor_trailer"], distanceM=[60, 120, 200], speedMps=[0])]), nhtsa=[27], tcs=["TC-CRAWL-182"], jama=["TORC-SYSRQ-14066", "TORC-SYSRQ-14123"], hz=["H2"], intent={"HW-LC": "lane_change"})
A("LV-06", "LV", "Leader qui accélère et s'éloigne", "Le leader repart ; le SDT reprend sa vitesse sans à-coup.", ["HW-FOL", "URB-FOL"], cfg(actors=[act("A", "required", ["car"], distanceM=[20, 40], speedMps=[18, 22], maneuvers=only("accelerate", accelMps2=[1, 2], startS=[1]))]), nhtsa=[24], jama=["TORC-SYSRQ-14122"], hz=["H2", "H3"])
A("LV-07", "LV", "Accordéon (stop-and-go)", "Trafic dense qui ralentit et repart.", ["HW-FOL", "URB-FOL"], cfg(speed=[10, 15], actors=[act("A", "required", ["car", "tractor_trailer"], distanceM=[15, 30], speedMps=[10, 15], maneuvers=only("brake", decelMps2=[2, 4], startS=[2, 5])), act("C", "optional", ["car"], distanceM=[10, 20], speedMps=[10, 15])]), nhtsa=[26], tcs=["TC-CRAWL-173"], hz=["H2", "H3"])
A("LV-08", "LV", "Leader au comportement erratique", "Le leader freine et accélère de façon imprévisible.", ["HW-FOL"], cfg(actors=[act("A", "required", ["car", "pickup"], distanceM=[30, 60], speedMps=[22, 27], maneuvers=only("brake", decelMps2=[2, 6], startS=[1, 4]))]), nhtsa=[26], tcs=["TC-CRAWL-181", "TC-CRAWL-175"], hz=["H2"])
A("LV-09", "LV", "Moto en leader", "Petit véhicule devant, difficile à suivre et à détecter.", ["HW-CRU", "HW-FOL"], cfg(actors=[act("A", "required", ["motorcycle"], distanceM=[30, 60], speedMps=[22, 27])]), nhtsa=[25], tcs=["TC-CRAWL-200"], hz=["H2"], perc=True)
A("LV-10", "LV", "Leader camion qui masque la vue", "Un semi devant cache un véhicule arrêté plus loin.", ["HW-FOL", "HW-ESL"], cfg(actors=[act("A", "required", ["tractor_trailer"], distanceM=[20, 40], speedMps=[25]), act("O", "optional", ["stopped_vehicle"], distanceM=[120, 200], lanes=["origin"])]), nhtsa=[27], tcs=["TC-CRAWL-186"], hz=["H2"], perc=True)
# ---------- CI ----------
A("CI-01", "CI", "Cut-in depuis la gauche, gap suffisant", "Un véhicule de la voie de gauche se rabat devant le SDT avec un écart correct.", ["HW-CRU", "HW-FOL", "URB-FOL"], cfg(actors=[act("B", "required", ["car", "pickup"], distanceM=[15, 30, 50], speedMps=[25, 29], maneuvers=only("cut_in", startS=[1, 2]))]), nhtsa=[19], tcs=["TC-CRAWL-171"], jama=["TORC-SYSRQ-14066", "TORC-SYSRQ-14122"], hz=["H2"])
A("CI-02", "CI", "Cut-in serré depuis la gauche", "Le véhicule se rabat très près devant le SDT.", ["HW-CRU", "HW-FOL", "HW-ESL"], cfg(actors=[act("B", "required", ["car", "pickup"], distanceM=[5, 10], speedMps=[25, 27], maneuvers=only("cut_in", startS=[0.5, 1]))]), nhtsa=[19], tcs=["TC-CRAWL-175"], jama=["TORC-SYSRQ-14066"], hz=["H2"])
A("CI-03", "CI", "Cut-in depuis la droite", "Un véhicule de la voie de droite se rabat devant le SDT (SDT en voie du milieu ou de gauche).", ["HW-CRU", "HW-FOL"], cfg(lanes=[3], start=["middle", "leftmost"], actors=[act("G", "required", ["car", "pickup"], offsetM=[15, 30], speedMps=[25, 29], maneuvers=only("cut_in", startS=[1, 2]))]), nhtsa=[19], jama=["TORC-SYSRQ-14066"], hz=["H2"])
A("CI-04", "CI", "Cut-in d'un véhicule plus lent", "Le véhicule qui se rabat roule moins vite que le SDT.", ["HW-CRU", "HW-FOL"], cfg(actors=[act("B", "required", ["car", "pickup"], distanceM=[15, 30], speedMps=[15, 20], maneuvers=only("cut_in", startS=[1]))]), nhtsa=[19, 25], hz=["H2"])
A("CI-05", "CI", "Cut-in d'un semi-remorque", "Un ensemble long se rabat devant le SDT.", ["HW-CRU", "HW-FOL"], cfg(actors=[act("B", "required", ["tractor_trailer"], distanceM=[10, 25], speedMps=[24, 27], maneuvers=only("cut_in", startS=[1, 3]))]), nhtsa=[19], tcs=["TC-CRAWL-187"], hz=["H2"])
A("CI-06", "CI", "Insertion depuis la bretelle devant le SDT", "Un véhicule de la voie d'accélération s'insère dans la voie de droite où roule le SDT.", ["HW-CRU", "HW-FOL"], cfg(ramp=True, actors=[act("G", "required", ["car", "pickup", "tractor_trailer"], offsetM=[0, 20, 40], speedMps=[18, 24], maneuvers=only("cut_in", startS=[1, 3]))]), nhtsa=[19], tcs=["TC-CRAWL-052", "TC-CRAWL-265"], hz=["H1", "H2"])
A("CI-07", "CI", "Brake-check après un rabattement", "Un véhicule qui vient de se rabattre freine brutalement devant le SDT.", ["HW-FOL", "HW-ESL"], cfg(actors=[act("A", "required", ["car"], distanceM=[8, 15], speedMps=[25], maneuvers=only("brake", decelMps2=[6, 8], startS=[0.5]))]), nhtsa=[26], tcs=["TC-CRAWL-175"], hz=["H2"])
# ---------- ADJ ----------
A("ADJ-01", "ADJ", "Véhicule adjacent qui dérive vers le SDT", "Un véhicule le long du SDT sort de sa voie vers lui.", ["HW-CRU", "HW-FOL", "HW-ELM"], cfg(actors=[act("D", "required", ["car", "pickup"], offsetM=[-15, -5, 5], speedMps=[25, 27], maneuvers=only("drift", startS=[1, 2]))]), nhtsa=[20], tcs=["TC-CRAWL-171"], jama=["TORC-SYSRQ-14128", "TORC-SYSRQ-10180", "TORC-SYSRQ-14065"], hz=["H1"], intent={"HW-ELM": "emergency_lateral"})
A("ADJ-02", "ADJ", "Semi adjacent dont la remorque louvoie", "La remorque d'un camion voisin oscille vers la voie du SDT.", ["HW-CRU", "HW-FOL"], cfg(actors=[act("D", "required", ["tractor_trailer"], offsetM=[-20, -5, 10], speedMps=[24, 26], maneuvers=only("drift", startS=[1]))]), nhtsa=[20], tcs=["TC-CRAWL-192"], jama=["TORC-SYSRQ-14128"], hz=["H1"])
A("ADJ-03", "ADJ", "Moto qui remonte les files", "Une moto rapide passe entre les voies le long du SDT.", ["HW-CRU", "HW-FOL"], cfg(actors=[act("D", "required", ["motorcycle"], offsetM=[-30, -10], speedMps=[30, 35])]), nhtsa=[20], tcs=["TC-CRAWL-200", "TC-CRAWL-201"], jama=["TORC-SYSRQ-14128"], hz=["H1"], perc=True)
A("ADJ-04", "ADJ", "Dépassement rapide et serré", "Un véhicule dépasse le SDT très vite et très près.", ["HW-CRU", "HW-FOL"], cfg(actors=[act("D", "required", ["car", "pickup"], offsetM=[-25, -10], speedMps=[33, 40])]), nhtsa=[20], tcs=["TC-CRAWL-179"], jama=["TORC-SYSRQ-10180", "TORC-SYSRQ-14128"], hz=["H1"])
# ---------- RMP ----------
A("RMP-01", "RMP", "Insertion : gap accepté en fin de voie d'accélération", "Le SDT est sur la voie d'accélération et doit trouver un gap dans la voie de droite.", ["HW-ONR"], cfg(road=dict(distanceToMandatoryM=[150, 250, 400]), actors=[act("B", "optional", ["car", "tractor_trailer"], distanceM=[10, 30, 60], speedMps=[25, 29]), act("D", "optional", ["car", "tractor_trailer"], distanceM=[10, 30], speedMps=[27, 31])]), nhtsa=[19], tcs=["TC-CRAWL-099", "TC-CRAWL-100"], jama=["TORC-SYSRQ-14124", "TORC-SYSRQ-13836"], hz=["H1", "H3"])
A("RMP-02", "RMP", "Insertion : voie d'accélération courte", "La voie d'accélération est trop courte pour atteindre la vitesse du flux.", ["HW-ONR"], cfg(speed=[15, 20], road=dict(distanceToMandatoryM=[60, 100, 150]), actors=[act("D", "optional", ["car"], distanceM=[20, 50], speedMps=[27])]), nhtsa=[19], tcs=["TC-CRAWL-099"], jama=["TORC-SYSRQ-14124"], hz=["H1", "H3"])
A("RMP-03", "RMP", "Insertion : voie principale saturée", "Pas de gap : le SDT doit s'arrêter ou attendre en fin de voie d'accélération (sortie « merge aborted » de SYSRQ-14124).", ["HW-ONR"], cfg(speed=[15, 20], road=dict(distanceToMandatoryM=[150, 250]), actors=[act("B", "required", ["car", "tractor_trailer"], distanceM=[3, 8], speedMps=[15, 20]), act("D", "required", ["car", "tractor_trailer"], distanceM=[3, 8], speedMps=[15, 20])]), tcs=["TC-CRAWL-173"], jama=["TORC-SYSRQ-14124"], hz=["H1", "H3"])
A("RMP-04", "RMP", "Insertion : véhicule lent ou arrêté devant sur la bretelle", "Le véhicule devant sur la voie d'accélération hésite ou s'arrête.", ["HW-ONR"], cfg(speed=[15, 20], road=dict(distanceToMandatoryM=[200]), actors=[act("A", "required", ["car"], distanceM=[20, 40], speedMps=[0, 8])]), nhtsa=[27], jama=["TORC-SYSRQ-14124"], hz=["H2"])
A("RMP-05", "RMP", "Insertion : un véhicule de la voie principale se décale", "Un véhicule de la voie de droite passe à gauche pour laisser entrer le SDT.", ["HW-ONR"], cfg(road=dict(distanceToMandatoryM=[200, 350]), lanes=[3], actors=[act("B", "required", ["car"], distanceM=[0, 15], speedMps=[25], maneuvers=only("cut_out", startS=[1, 2]))]), jama=["TORC-SYSRQ-14124"], hz=["H1"])
A("RMP-06", "RMP", "Sortie : file d'attente sur la bretelle", "Une file remonte de la bretelle de sortie jusqu'à la voie de décélération.", ["HW-OFR", "HW-FOL"], cfg(speed=[15, 22], actors=[act("A", "required", ["car", "tractor_trailer"], distanceM=[50, 100, 200], speedMps=[0, 5])]), nhtsa=[27], tcs=["TC-CRAWL-180"], jama=["TORC-SYSRQ-14125"], hz=["H2"], intent={"HW-OFR": "keep_lane"})
A("RMP-07", "RMP", "Sortie manquée faute de gap", "Trafic dense dans la voie de sortie : le SDT ne peut pas l'atteindre et doit recalculer son itinéraire (sortie de SYSRQ-14125).", ["HW-OFR"], cfg(lanes=[3], start=["middle"], road=dict(distanceToMandatoryM=[300, 600]), actors=[act("B", "required", ["car", "tractor_trailer"], distanceM=[3, 8], speedMps=[22, 25]), act("D", "required", ["car", "tractor_trailer"], distanceM=[3, 8], speedMps=[22, 25])], sides=["right"]), jama=["TORC-SYSRQ-14125"], hz=["H1", "H3"])
A("RMP-08", "RMP", "Sortie : virage serré de la bretelle", "La bretelle a un rayon faible : vitesse à adapter avant le virage.", ["HW-OFR"], cfg(speed=[15, 20, 25], road=dict(curvature=[0.005, 0.01, 0.02], grade=[-4, 0])), nhtsa=[4, 8], tcs=["TC-CRAWL-098", "TC-CRAWL-129"], jama=["TORC-SYSRQ-14120", "TORC-SYSRQ-14121", "TORC-SYSRQ-10172"], hz=["H5"], intent={"HW-OFR": "keep_lane"})
A("RMP-09", "RMP", "Véhicule qui coupe le musoir au dernier moment", "Un véhicule traverse la voie du SDT pour attraper la sortie.", ["HW-OFR", "HW-CRU", "HW-FOL"], cfg(lanes=[2, 3], actors=[act("B", "required", ["car", "pickup"], distanceM=[5, 20], speedMps=[25, 29], maneuvers=only("cut_in", startS=[0.5, 1]))]), nhtsa=[19], tcs=["TC-CRAWL-102", "TC-CRAWL-146"], hz=["H2"], intent={"HW-OFR": "keep_lane"})
A("RMP-10", "RMP", "Sortie : rampe en marche arrière ou véhicule qui recule", "Un véhicule recule sur la bretelle ou l'accotement.", ["HW-OFR", "HW-CSS"], None, nhtsa=[16], tcs=["TC-CRAWL-181"], hz=["H2"], note="Génération pas encore disponible : vitesse négative (marche arrière) non modélisée.")
# ---------- RD ----------
A("RD-09", "RD", "Voie plus étroite que 3,5 m", "La largeur de voie passe sous le seuil d'entrée de Cruise et de Stay in Lane (3,5 m).", ["HW-CRU", "HW-FOL"], cfg(road=dict(laneWidthM=[3.2, 3.35, 3.5]), actors=[act("D", "optional", ["car", "tractor_trailer"], offsetM=[-10, 0], speedMps=[25])]), nhtsa=[7, 8], tcs=["TC-CRAWL-027", "TC-CRAWL-044"], jama=["TORC-SYSRQ-10155", "TORC-SYSRQ-10154", "TORC-SYSRQ-10178"], hz=["H1"])
A("RD-10", "RD", "Changement de limite de vitesse", "La limite baisse (zone, travaux, panneau temporaire) ; le SDT doit la respecter.", ["HW-CRU", "HW-FOL"], cfg(road=dict(speedLimitMps=[20, 25, 29])), tcs=["TC-CRAWL-123", "TC-CRAWL-126", "TC-CRAWL-127"], jama=["TORC-SYSRQ-14118", "TORC-SYSRQ-10167"], hz=["H2"], perc=True)
A("RD-11", "RD", "Pas d'accotement (pont, viaduc)", "Aucune place pour s'arrêter hors de la voie au moment où l'arrêt est demandé.", ["HW-CSS", "HW-ESL"], cfg(road=dict(shoulderWidthM=[0, 1.0, 3.0]), actors=[act("C", "optional", ["car", "tractor_trailer"], distanceM=[20, 50], speedMps=[25])]), tcs=["TC-CRAWL-053"], jama=["TORC-SYSRQ-14127", "TORC-SYSRQ-14126"], hz=["H3"])
A("RD-12", "RD", "Rafale de vent latéral", "Section exposée avec vent fort et rafales.", ["HW-CRU", "HW-FOL", "HW-LC"], cfg(road=dict(windGustMps=[10, 15, 20])), nhtsa=[4], tcs=["TC-CRAWL-225", "TC-CRAWL-227", "TC-CRAWL-228"], jama=["TORC-SYSRQ-10154", "TORC-SYSRQ-10178"], hz=["H1", "H5"])
A("RD-13", "RD", "Forte descente avec charge lourde", "Pente descendante qui allonge les distances d'arrêt.", ["HW-CRU", "HW-FOL", "HW-ESL"], cfg(road=dict(grade=[-6, -4]), actors=[act("A", "optional", ["car"], distanceM=[40, 80], speedMps=[22], maneuvers=man("brake", decelMps2=[4], startS=[2]))]), nhtsa=[4], tcs=["TC-CRAWL-039", "TC-CRAWL-001"], jama=["TORC-SYSRQ-14120"], hz=["H2", "H5"])
# ---------- EMV ----------
A("EMV-03", "EMV", "Véhicule d'urgence dans la congestion", "Une ambulance remonte un trafic lent : il faut former un passage.", ["HW-FOL", "HW-CSS"], cfg(speed=[8, 12], actors=[act("A", "required", ["car", "tractor_trailer"], distanceM=[10, 20], speedMps=[8, 12]), act("C", "required", ["ambulance", "fire"], distanceM=[20, 50], speedMps=[15, 20])]), tcs=["TC-CRAWL-272"], hz=["H6", "H3"])
A("EMV-04", "EMV", "Policier qui suit le SDT plus de 20 s", "Un LEO suit le SDT gyrophares allumés : arrêt sur l'accotement demandé.", ["HW-CSS"], cfg(road=dict(shoulderWidthM=[3.0, 3.6]), actors=[act("C", "required", ["police"], distanceM=[20, 40], speedMps=[22, 29])]), tcs=["TC-CRAWL-195"], jama=["TORC-SYSRQ-15232", "TORC-SYSRQ-14127"], hz=["H6"])
A("EMV-05", "EMV", "Véhicule d'urgence arrêté dans la voie", "Un véhicule de secours bloque la voie du SDT.", ["HW-LC", "HW-ESL", "HW-FOL"], cfg(actors=[act("A", "required", ["police", "fire", "ambulance"], distanceM=[100, 200], speedMps=[0]), act("D", "optional", ["car"], distanceM=[20, 50], speedMps=[27])]), nhtsa=[27], tcs=["TC-CRAWL-196", "TC-CRAWL-198"], jama=["TORC-SYSRQ-14123"], hz=["H2"], intent={"HW-LC": "lane_change"})
A("EMV-06", "EMV", "Poursuite policière qui dépasse le SDT", "Un véhicule de police dépasse à grande vitesse.", ["HW-CRU", "HW-FOL"], cfg(actors=[act("D", "required", ["police"], offsetM=[-40, -20], speedMps=[40, 45])]), tcs=["TC-CRAWL-195"], jama=["TORC-SYSRQ-14128"], hz=["H1", "H6"])
# ---------- OBJ ----------
A("OBJ-01", "OBJ", "Petit débris franchissable dans la voie", "Un débris bas dans la voie du SDT : le chevaucher ou l'éviter.", ["HW-CRU", "HW-FOL"], cfg(actors=[act("O", "required", ["tire_debris"], distanceM=[50, 100, 200], lanes=["origin"])]), nhtsa=[37], tcs=["TC-CRAWL-210", "TC-CRAWL-215"], hz=["H2", "H5"], perc=True)
A("OBJ-02", "OBJ", "Chargement perdu ou gros débris dans la voie", "Un objet infranchissable bloque la voie du SDT.", ["HW-ESL", "HW-ELM", "HW-LC", "HW-FOL"], cfg(actors=[act("O", "required", ["lost_cargo", "stopped_vehicle"], distanceM=[40, 80, 150], lanes=["origin"]), act("D", "optional", ["car"], distanceM=[20, 50], speedMps=[27])]), nhtsa=[36, 37], tcs=["TC-CRAWL-210", "TC-CRAWL-271"], jama=["TORC-SYSRQ-14123", "TORC-SYSRQ-14126"], hz=["H2"], intent={"HW-LC": "lane_change"})
A("OBJ-03", "OBJ", "Véhicule en panne qui déborde de l'accotement", "Un véhicule arrêté sur l'accotement empiète dans la voie de droite.", ["HW-CRU", "HW-FOL", "HW-LC"], cfg(road=dict(shoulderWidthM=[3.0]), actors=[act("S", "required", ["stopped_vehicle", "tractor_trailer"], distanceM=[100, 200], lateralOffsetM=[-0.5, -0.3, 0], speedMps=[0])]), tcs=["TC-CRAWL-183"], jama=["TORC-SYSRQ-14128", "TORC-SYSRQ-10180"], hz=["H1"])
A("OBJ-04", "OBJ", "Animal sur la chaussée", "Cerf ou bétail sur la voie (hors ODD validé).", ["HW-ESL", "HW-ELM", "HW-FOL"], cfg(actors=[act("O", "required", ["deer", "livestock"], distanceM=[50, 100, 150], speedMps=[0, 3], lanes=["origin"])]), nhtsa=[10, 11], tcs=["TC-CRAWL-253", "TC-CRAWL-254"], hz=["H2", "H5"], perc=True)
A("OBJ-05", "OBJ", "Piéton sur l'autoroute", "Une personne sortie d'un véhicule en panne marche près de la voie.", ["HW-CRU", "HW-FOL", "HW-ESL", "HW-CSS"], cfg(road=dict(shoulderWidthM=[3.0]), actors=[act("S", "required", ["stopped_vehicle"], distanceM=[150], lateralOffsetM=[0.5], speedMps=[0]), act("O", "required", ["pedestrian"], distanceM=[140, 160], speedMps=[0, 1.5], lanes=["origin"])]), nhtsa=[13], tcs=["TC-CRAWL-202", "TC-CRAWL-203"], hz=["H2"], perc=True)
A("OBJ-06", "OBJ", "Objet qui apparaît soudainement près du SDT", "Débris tombé d'un véhicule ou projeté, découvert tard.", ["HW-FOL", "HW-ESL", "HW-ELM"], cfg(actors=[act("O", "required", ["lost_cargo", "tire_debris"], distanceM=[20, 40], lanes=["origin"])]), nhtsa=[36], tcs=["TC-CRAWL-207", "TC-CRAWL-271"], hz=["H2"], perc=True)
# ---------- AB ----------
A("AB-01", "AB", "Conducteur à contresens", "Un véhicule arrive en sens inverse dans la voie du SDT.", ["HW-ESL", "HW-ELM", "HW-CSS"], None, nhtsa=[22], tcs=["TC-CRAWL-178"], hz=["H2"], note="Génération pas encore disponible : vitesse en sens inverse non modélisée.")
A("AB-02", "AB", "Suiveur trop proche (tailgater)", "Un véhicule colle le SDT : tout freinage devient risqué.", ["HW-CRU", "HW-FOL", "HW-ESL", "HW-CSS"], cfg(actors=[act("C", "required", ["car", "pickup"], distanceM=[3, 8, 15], speedMps=[27, 29])]), nhtsa=[23], tcs=["TC-CRAWL-176"], hz=["H3"])
A("AB-03", "AB", "Véhicule qui roule sur l'accotement", "Un véhicule double par l'accotement.", ["HW-CRU", "HW-CSS"], cfg(road=dict(shoulderWidthM=[3.0, 3.6]), actors=[act("S", "required", ["car", "pickup"], distanceM=[0, 20], lateralOffsetM=[0.3], speedMps=[25, 30])]), tcs=["TC-CRAWL-177"], hz=["H1"])
# ---------- FB ----------
A("FB-01", "FB", "Dégradation système, accotement disponible", "Une dégradation impose de quitter la voie et de s'arrêter sur l'accotement.", ["HW-CSS"], cfg(road=dict(shoulderWidthM=[3.0, 3.6], degradation=["sensor_loss", "localization_loss", "compute_derating"]), actors=[act("B", "optional", ["car"], distanceM=[40], speedMps=[25]), act("C", "optional", ["car"], distanceM=[30], speedMps=[25])]), nhtsa=[2], jama=["TORC-SYSRQ-14127", "TORC-SYSRQ-14130"], hz=["H3"])
A("FB-02", "FB", "Dégradation sans accotement disponible", "La dégradation impose un arrêt alors qu'aucun accotement n'est utilisable.", ["HW-ESL"], cfg(road=dict(shoulderWidthM=[0, 1.0], degradation=["sensor_loss", "compute_derating"]), actors=[act("C", "optional", ["car", "tractor_trailer"], distanceM=[20, 40], speedMps=[25])]), nhtsa=[2], jama=["TORC-SYSRQ-14126", "TORC-SYSRQ-14130"], hz=["H3"])
A("FB-03", "FB", "Accotement occupé au point d'arrêt prévu", "Un véhicule est déjà arrêté là où le SDT voulait s'arrêter (sortie « shoulder blocked » de SYSRQ-14127).", ["HW-CSS"], cfg(road=dict(shoulderWidthM=[3.0, 3.6]), actors=[act("S", "required", ["stopped_vehicle", "tractor_trailer"], distanceM=[50, 150, 300], lateralOffsetM=[0.3], speedMps=[0])]), jama=["TORC-SYSRQ-14127"], hz=["H1", "H2"])
A("FB-04", "FB", "Arrêt en voie avec un suiveur rapide", "Le SDT s'arrête en voie alors qu'un véhicule arrive vite derrière.", ["HW-ESL"], cfg(actors=[act("C", "required", ["car", "tractor_trailer"], distanceM=[30, 60, 100], speedMps=[25, 29])]), nhtsa=[23], jama=["TORC-SYSRQ-14126", "TORC-SYSRQ-14130"], hz=["H3"])
A("FB-05", "FB", "Évitement latéral d'urgence, voie adjacente libre", "Obstacle découvert tard, la voie voisine est libre.", ["HW-ELM"], cfg(actors=[act("O", "required", ["lost_cargo", "stopped_vehicle"], distanceM=[30, 50, 70], lanes=["origin"])]), nhtsa=[33, 34], hz=["H2", "H5"])
A("FB-06", "FB", "Évitement latéral d'urgence, voie adjacente occupée", "Obstacle découvert tard, un véhicule occupe la voie voisine.", ["HW-ELM"], cfg(actors=[act("O", "required", ["lost_cargo", "stopped_vehicle"], distanceM=[30, 50], lanes=["origin"]), act("D", "required", ["car"], distanceM=[5, 20], speedMps=[27]), act("B", "optional", ["car"], distanceM=[20], speedMps=[25])]), nhtsa=[33], hz=["H1", "H2"])
A("FB-07", "FB", "Commande d'arrêt en voie à distance (HICD)", "Un opérateur demande un arrêt en voie (MRM-E).", ["HW-ESL", "URB-SIL"], cfg(road=dict(degradation=["hicd_remote_stop"]), actors=[act("C", "optional", ["car"], distanceM=[30], speedMps=[25])]), jama=["TORC-FSR-3752", "TORC-SYSRQ-14126"], hz=["H3"])
A("FB-08", "FB", "Reprise de la circulation après un arrêt sur l'accotement", "Le SDT repart de l'accotement et s'insère dans le trafic.", ["HW-CSS"], None, jama=["TORC-SYSRQ-14127"], hz=["H1", "H3"], note="Génération pas encore disponible : départ arrêté depuis l'accotement non modélisé.")
# ---------- URB ----------
U = ("Urban",)
A("URB-01", "URB", "Feu vert, traversée tout droit", "Le SDT traverse une intersection à feux au vert.", ["URB-STR"], None, uc=U, note=GEOM, hz=["H2"])
A("URB-02", "URB", "Véhicule qui grille le feu rouge", "Un véhicule transversal passe au rouge pendant que le SDT traverse.", ["URB-STR", "URB-TRN"], None, nhtsa=[5], tcs=["TC-CRAWL-264"], uc=U, note=GEOM, hz=["H1"])
A("URB-03", "URB", "Stop à 4 voies, ordre d'arrivée ambigu", "Plusieurs véhicules arrivent en même temps à un stop.", ["URB-STR", "URB-TRN"], None, nhtsa=[6, 31], tcs=["TC-CRAWL-018"], uc=U, note=GEOM, hz=["H1"])
A("URB-04", "URB", "Tourne-à-gauche non protégé, trafic en face", "Le SDT tourne à gauche face à un flux opposé.", ["URB-TRN"], None, nhtsa=[28, 30], uc=U, note=GEOM, hz=["H1"])
A("URB-05", "URB", "Tourne-à-droite avec piéton sur le passage", "Un piéton traverse la rue dans laquelle le SDT tourne.", ["URB-TRN", "URB-XWK"], None, nhtsa=[12, 29], tcs=["TC-CRAWL-202"], uc=U, note=GEOM, hz=["H2"])
A("URB-06", "URB", "Tourne-à-droite : remorque qui coupe le trottoir, cycliste à droite", "Le balayage de la remorque menace un cycliste ou le trottoir.", ["URB-TRN"], None, nhtsa=[14], tcs=["TC-CRAWL-203"], uc=U, note=GEOM, hz=["H1"])
A("URB-07", "URB", "Trafic transversal à une intersection sans feux", "Un véhicule transversal ne cède pas.", ["URB-STR"], None, nhtsa=[31], tcs=["TC-CRAWL-143"], uc=U, note=GEOM, hz=["H1"])
A("URB-08", "URB", "Piéton qui attend ou s'engage sur un passage", "Un piéton au bord ou sur le passage piéton.", ["URB-XWK"], None, nhtsa=[12, 13], tcs=["TC-CRAWL-202", "TC-CRAWL-203"], uc=U, note=GEOM, hz=["H2"])
A("URB-09", "URB", "Piéton masqué par un véhicule garé", "Un piéton surgit de derrière un véhicule stationné.", ["URB-XWK", "URB-CRU"], None, nhtsa=[13], tcs=["TC-CRAWL-206"], uc=U, note=GEOM, hz=["H2"], perc=True)
A("URB-10", "URB", "Cycliste dans la voie", "Le SDT rattrape un cycliste roulant dans sa voie.", ["URB-CRU", "URB-FOL", "URB-LC"], cfg(uc="Urban", speed=[11, 15], actors=[act("A", "required", ["cyclist"], distanceM=[20, 40], speedMps=[5, 7])]), nhtsa=[15], tcs=["TC-CRAWL-202"], uc=U, hz=["H2"], intent={"URB-LC": "lane_change"})
A("URB-11", "URB", "Véhicule qui sort d'une place de stationnement", "Un véhicule garé à droite déboîte devant le SDT.", ["URB-CRU", "URB-FOL"], cfg(uc="Urban", speed=[11, 15], ramp=True, actors=[act("G", "required", ["car", "pickup"], offsetM=[5, 15, 30], speedMps=[2, 5], maneuvers=only("cut_in", startS=[0.5, 1.5]))]), nhtsa=[18], uc=U, hz=["H2"])
A("URB-12", "URB", "Véhicule en double file qui bloque la voie", "Un véhicule arrêté occupe la voie du SDT.", ["URB-LC", "URB-SIL", "URB-FOL"], cfg(uc="Urban", speed=[11, 15], actors=[act("O", "required", ["stopped_vehicle"], distanceM=[40, 80], lanes=["origin"]), act("D", "optional", ["car"], distanceM=[10, 30], speedMps=[13])]), nhtsa=[27], uc=U, hz=["H2"], intent={"URB-LC": "lane_change"})
A("URB-13", "URB", "Bus qui s'arrête à un arrêt", "Le bus devant s'arrête pour prendre des passagers.", ["URB-FOL", "URB-LC"], cfg(uc="Urban", speed=[11, 15], actors=[act("A", "required", ["bus"], distanceM=[20, 40], speedMps=[10], maneuvers=only("brake", decelMps2=[1.5, 3], startS=[2]))]), nhtsa=[26], uc=U, hz=["H2"], intent={"URB-LC": "lane_change"})
A("URB-14", "URB", "Véhicule d'urgence à une intersection", "Un véhicule d'urgence traverse ou arrive en sens inverse à une intersection.", ["URB-STR", "URB-TRN", "URB-SIL"], None, tcs=["TC-CRAWL-198"], uc=U, note=GEOM, hz=["H1", "H6"])
A("URB-15", "URB", "Véhicule venant d'en face qui empiète sur la voie", "Un véhicule en sens inverse franchit la ligne centrale.", ["URB-CRU", "URB-ELM"], None, nhtsa=[22], uc=U, note="Génération pas encore disponible : circulation en sens inverse non modélisée.", hz=["H2"])
A("URB-16", "URB", "Véhicule qui tourne devant le SDT et ralentit", "Le véhicule devant ralentit pour tourner.", ["URB-FOL"], cfg(uc="Urban", speed=[11, 15], actors=[act("A", "required", ["car", "pickup"], distanceM=[15, 30], speedMps=[11], maneuvers=only("brake", decelMps2=[2, 3.5], startS=[1, 2]))]), nhtsa=[17, 26], uc=U, hz=["H2"])
# ---------- HUB ----------
H = ("Hub",)
A("HUB-01", "HUB", "Tracteur de cour qui croise le trajet", "Un yard tractor traverse devant le SDT à basse vitesse.", ["HUB-LSD", "HUB-AVD"], None, nhtsa=[31], uc=H, note=GEOM, hz=["H1", "H2"])
A("HUB-02", "HUB", "Piéton travaillant dans la cour", "Un opérateur à pied près du trajet du SDT.", ["HUB-LSD", "HUB-AVD", "HUB-EST"], None, nhtsa=[12, 13], uc=H, note=GEOM, hz=["H2"])
A("HUB-03", "HUB", "Mise à quai en marche arrière avec obstacle", "Un obstacle se trouve derrière la remorque pendant la mise à quai.", ["HUB-DCK"], None, nhtsa=[9, 16], uc=H, note=GEOM, hz=["H3"])
A("HUB-04", "HUB", "Désalignement au quai", "La remorque arrive en angle par rapport au quai.", ["HUB-DCK"], None, uc=H, note=GEOM, hz=["H5"])
A("HUB-05", "HUB", "Départ du quai avec trafic transversal", "Le SDT quitte le quai alors qu'un véhicule circule dans l'allée.", ["HUB-PUL"], None, nhtsa=[31], uc=H, note=GEOM, hz=["H1"])
A("HUB-06", "HUB", "Remorque garée qui empiète sur l'allée", "Une remorque mal garée réduit l'espace de passage.", ["HUB-AVD", "HUB-LSD"], None, nhtsa=[37], uc=H, note=GEOM, hz=["H1"])
A("HUB-07", "HUB", "Chariot élévateur qui croise", "Un chariot traverse ou recule devant le SDT.", ["HUB-AVD", "HUB-LSD", "HUB-EST"], None, nhtsa=[31], uc=H, note=GEOM, hz=["H2"])
A("HUB-08", "HUB", "File d'attente au portail de sortie", "Des véhicules attendent au portail au moment du départ.", ["HUB-PUL"], None, nhtsa=[27], uc=H, note=GEOM, hz=["H2"])
A("HUB-09", "HUB", "Virage serré dans la cour", "Le balayage de la remorque frôle un obstacle.", ["HUB-LSD"], None, uc=H, note=GEOM, hz=["H1"])


# ---------- additions inspired by Foretellix SAFE / VMAD-SG1-11-06 (2020) ----------
A("ADJ-05", "ADJ", "Convoi lent dans la voie adjacente", "Le SDT longe ou dépasse une file de véhicules lents dans la voie voisine (Foretellix « slow neighbors »). Risque : un véhicule du convoi déboîte devant le SDT.", ["HW-CRU", "HW-FOL", "HW-LC"], cfg(actors=[act("D", "required", ["car", "tractor_trailer"], offsetM=[-10, 30, 80], speedMps=[8, 15, 20], count=[3, 5], gapM=[10, 20])]), nhtsa=[19, 20], jama=["TORC-SYSRQ-14128", "TORC-SYSRQ-10180"], hz=["H1"])
A("ADJ-06", "ADJ", "Véhicule adjacent qui serre la ligne (lane hugger)", "Un véhicule voisin roule collé au marquage côté SDT sans sortir de sa voie (Foretellix « lane hugger ») : moins d'espace latéral et moins de temps pour voir un cut-in.", ["HW-CRU", "HW-FOL", "HW-LC"], cfg(actors=[act("D", "optional", ["car", "tractor_trailer"], offsetM=[-10, 0, 10], speedMps=[25], maneuvers=only("hug", lateralM=[0.3, 0.5, 0.8], startS=[1])), act("B", "optional", ["car", "tractor_trailer"], distanceM=[10, 30], speedMps=[25], maneuvers=only("hug", lateralM=[0.3, 0.5, 0.8], startS=[1]))]), nhtsa=[20], jama=["TORC-SYSRQ-14128", "TORC-SYSRQ-10180"], hz=["H1"])
A("ADJ-07", "ADJ", "File de véhicules arrêtés dans la voie adjacente", "Le SDT passe le long d'une file arrêtée dans la voie voisine (file de sortie, accident, bouchon d'une seule voie) (Foretellix « stopped vehicles »).", ["HW-CRU", "HW-FOL", "HW-LC"], cfg(actors=[act("B", "required", ["car", "tractor_trailer"], distanceM=[20, 80, 150], speedMps=[0], count=[3, 6], gapM=[2, 4])]), nhtsa=[19], jama=["TORC-SYSRQ-14128"], hz=["H1", "H2"], intent={"HW-LC": "lane_change"})
A("RD-14", "RD", "Courbe avec véhicule dans la voie voisine", "Le SDT suit une courbe pendant qu'un véhicule roule devant ou à côté dans la voie voisine ; un semi voisin peut déporter sa remorque vers l'intérieur (Foretellix « to side on curve »).", ["HW-CRU", "HW-FOL", "HW-LC"], cfg(speed=[20, 25, 29], road=dict(curvature=[0.001, 0.0017, 0.003]), actors=[act("B", "optional", ["car", "tractor_trailer"], distanceM=[10, 30], speedMps=[22, 25]), act("D", "optional", ["tractor_trailer"], offsetM=[-10, 5], speedMps=[22, 25], maneuvers=man("hug", lateralM=[0.3, 0.5], startS=[1]))]), nhtsa=[4, 8, 20], jama=["TORC-SYSRQ-10172", "TORC-SYSRQ-14120", "TORC-SYSRQ-14128"], hz=["H1", "H5"])
A("RMP-11", "RMP", "Le leader quitte l'autoroute par la sortie", "Le véhicule devant le SDT ralentit et prend la bretelle de sortie à droite ; le SDT continue tout droit (Foretellix « cut-out to highway exit »).", ["HW-CRU", "HW-FOL"], cfg(ramp=True, speed=[22, 25, 29], actors=[act("A", "required", ["car", "pickup", "tractor_trailer"], distanceM=[20, 40, 60], speedMps=[22, 25], maneuvers=only("take_exit", decelMps2=[1, 2.5], startS=[1, 3]))]), nhtsa=[26], jama=["TORC-SYSRQ-14122"], hz=["H2"])
A("RMP-12", "RMP", "Convoi qui s'insère depuis la bretelle", "Plusieurs véhicules s'insèrent depuis la voie d'accélération devant ou à côté du SDT ; les écarts permettent au SDT de s'aligner dans le convoi (Foretellix « cars merge at highway entry »).", ["HW-CRU", "HW-FOL", "HW-LC"], cfg(ramp=True, actors=[act("G", "required", ["car", "pickup", "tractor_trailer"], offsetM=[0, 30, 60], speedMps=[18, 22], count=[2, 3, 4], gapM=[15, 30], maneuvers=only("cut_in", startS=[1, 3]))]), nhtsa=[19], tcs=["TC-CRAWL-052", "TC-CRAWL-265"], jama=["TORC-SYSRQ-14122"], hz=["H1", "H2"])
A("RMP-13", "RMP", "Insertion du SDT pendant qu'un véhicule sort par la voie d'accélération", "Le SDT s'insère depuis la bretelle ; un véhicule de la voie de droite traverse la voie d'accélération pour sortir (entrecroisement, Foretellix « DUT merges at highway entry »).", ["HW-ONR"], cfg(speed=[20, 25], road=dict(distanceToMandatoryM=[200, 350]), actors=[act("B", "required", ["car", "pickup", "tractor_trailer"], distanceM=[10, 30, 60], speedMps=[20, 25], maneuvers=only("cut_in", startS=[1, 2]))]), nhtsa=[19], tcs=["TC-CRAWL-099"], jama=["TORC-SYSRQ-14124", "TORC-SYSRQ-13836"], hz=["H1", "H2"])
A("CI-08", "CI", "Deux véhicules se rabattent l'un après l'autre", "Deux véhicules de la voie de gauche se rabattent successivement devant le SDT (variante convoi du cut-in Foretellix).", ["HW-CRU", "HW-FOL"], cfg(actors=[act("B", "required", ["car", "pickup"], distanceM=[15, 30], speedMps=[25, 29], count=[2], gapM=[10, 20], maneuvers=only("cut_in", startS=[1, 2]))]), nhtsa=[19], jama=["TORC-SYSRQ-14066", "TORC-SYSRQ-14122"], hz=["H2"])
A("LV-11", "LV", "Le leader change de voie et libère la voie (cut-out)", "Le véhicule suivi quitte la voie du SDT sans obstacle derrière : le SDT doit reprendre sa vitesse sans à-coup (Foretellix « cut out »).", ["HW-CRU", "HW-FOL"], cfg(speed=[22, 25, 29], actors=[act("A", "required", ["car", "pickup", "tractor_trailer"], distanceM=[15, 30, 50], speedMps=[20, 25], maneuvers=only("cut_out", startS=[1, 3]))]), jama=["TORC-SYSRQ-14122", "TORC-SYSRQ-10167"], hz=["H2"])

A("RMP-14", "RMP", "Insertion : bretelle d'accès en courbe et en pente", "La bretelle d'accès tourne et monte ou descend avant la voie d'accélération : le SDT doit tenir sa trajectoire et sa vitesse avant de s'insérer (trou révélé par le HIRE v2 : HW On-Ramp Merge, H5 perte de stabilité).", ["HW-ONR"], cfg(speed=[12, 15, 20], road=dict(curvature=[0.005, 0.01], grade=[-4, 0, 4], distanceToMandatoryM=[250]), actors=[act("A", "optional", ["car", "tractor_trailer"], distanceM=[30, 60], speedMps=[15, 20]), act("D", "optional", ["car", "tractor_trailer"], distanceM=[20, 40], speedMps=[27])]), nhtsa=[4, 8], tcs=["TC-CRAWL-098", "TC-CRAWL-039"], jama=["TORC-SYSRQ-14124", "TORC-SYSRQ-14120", "TORC-SYSRQ-10172"], hz=["H5", "H1"])

# ---------- existing Lane Change abstracts, re-linked to other behaviors ----------
EXTRA_LINKS = {
 "LC-REF-01": ["HW-CRU", "HW-FOL"], "LC-OOD-01": ["HW-CRU", "HW-FOL"], "LC-OOD-02": ["HW-CRU", "HW-FOL", "HW-CSS"], "LC-OOD-04": ["HW-ESL", "HW-FOL", "HW-CSS"],
 "LC-CUR-02": ["HW-FOL", "HW-ESL", "HW-ELM", "HW-CRU"], "LC-RD-01": ["HW-CRU"], "LC-RD-02": ["HW-CRU", "HW-FOL"], "LC-RD-03": ["HW-ONR"],
 "LC-RD-04": ["HW-OFR"], "LC-RD-05": ["HW-CRU", "HW-FOL"], "LC-RD-06": ["HW-CRU", "HW-FOL"], "LC-RD-07": ["HW-CRU", "HW-FOL"], "LC-RD-08": ["HW-CRU"],
 "LC-ABT-02": ["HW-CSS", "HW-ESL"], "LC-TGT-03": ["HW-ONR"], "LC-TGT-07": ["HW-CRU", "HW-FOL"],
 "LC-NOM-01": ["URB-LC"], "LC-NOM-02": ["URB-LC"], "LC-TGT-01": ["URB-LC"], "LC-CUR-01": ["URB-LC"],
}
INTENT = {"LC-REF-01": {"HW-CRU": "move_over", "HW-FOL": "move_over"}, "LC-OOD-01": {"HW-CRU": "move_over", "HW-FOL": "move_over"},
          "LC-OOD-02": {"HW-CRU": "lane_change", "HW-FOL": "lane_change"}, "LC-CUR-02": {}, "LC-RD-01": {"HW-CRU": "lane_change"}, "LC-RD-04": {}}
NHTSA_LC = {"LC-NOM-02": [19], "LC-NOM-03": [19, 25], "LC-NOM-04": [19], "LC-TGT-01": [19], "LC-TGT-02": [19], "LC-TGT-03": [19], "LC-TGT-04": [19, 26], "LC-TGT-05": [19, 20], "LC-TGT-06": [19, 20],
            "LC-TGT-07": [20], "LC-CUR-01": [26], "LC-CUR-02": [27, 33], "LC-CUR-03": [23], "LC-RD-01": [19], "LC-RD-02": [37], "LC-RD-03": [19], "LC-RD-04": [19], "LC-RD-05": [19],
            "LC-RD-06": [7, 8], "LC-RD-07": [4, 8], "LC-OOD-01": [37], "LC-OOD-02": [23], "LC-OOD-03": [37], "LC-OOD-04": [37], "LC-ABT-01": [19], "LC-ABT-02": [2], "LC-REF-01": [37]}
LC_JAMA = ["TORC-SYSRQ-14123", "TORC-TXT-14209", "TORC-SYSRQ-10197", "TORC-SYSRQ-10640", "TORC-SYSRQ-13836", "TORC-SYSRQ-10651", "TORC-SYSRQ-13830", "TORC-SYSRQ-10628"]
JAMA_LC_EXTRA = {"LC-ABT-01": ["TORC-SYSRQ-10647", "TORC-SYSRQ-10652", "TORC-SYSRQ-10629"], "LC-TGT-01": ["TORC-SYSRQ-10649"], "LC-TGT-03": ["TORC-SYSRQ-10649", "TORC-SYSRQ-10647"],
                 "LC-NOM-02": ["TORC-SYSRQ-10649", "TORC-SYSRQ-13828"], "LC-TGT-04": ["TORC-SYSRQ-13828", "TORC-SYSRQ-13835"], "LC-CUR-01": ["TORC-SYSRQ-13835"], "LC-TGT-05": ["TORC-SYSRQ-14128", "TORC-SYSRQ-10182"],
                 "LC-TGT-06": ["TORC-SYSRQ-14128"], "LC-TGT-07": ["TORC-SYSRQ-14128"], "LC-NOM-01": ["TORC-SYSRQ-10648"], "LC-OOD-01": ["TORC-SYSRQ-15232"], "LC-REF-01": [], "LC-ABT-02": ["TORC-SYSRQ-14127", "TORC-SYSRQ-14126"],
                 "LC-RD-07": ["TORC-SYSRQ-14120", "TORC-SYSRQ-14121", "TORC-SYSRQ-10172"], "LC-RD-06": ["TORC-SYSRQ-14113", "TORC-SYSRQ-10154"]}

out_abs = []
for a in V2["abstracts"]:
    a = copy.deepcopy(a)
    codes = ["HW-LC"] + EXTRA_LINKS.get(a["id"], [])
    a["beh_codes"] = codes
    a["behaviors"] = [CODE[c] for c in codes]
    a["intent"] = INTENT.get(a["id"], {})
    a["nhtsa"] = NHTSA_LC.get(a["id"], [])
    a["jama"] = LC_JAMA + JAMA_LC_EXTRA.get(a["id"], [])
    a["title"] = a["name"].replace("sut_", "").replace("_", " ")
    a["use_cases"] = ["Highway"] + (["Urban"] if "URB-LC" in codes else [])
    a["hazards"] = sorted({h["hz"] for hid in a["hire"] for h in [S["hire"].get(hid)] if h})
    for x in a["configuration"]["ego"]["speedMps"] and [a["configuration"]["ego"]] or []:
        x["speedMps"] = sorted({min(v, 29) for v in x["speedMps"]})
    a["configuration"]["ego"]["intent"] = "keep_lane"
    out_abs.append(a)
for a in NEW:
    if a["configuration"]:
        a["configuration"]["ego"]["speedMps"] = sorted({min(v, 29) for v in a["configuration"]["ego"]["speedMps"]})
    # HIRE links: Highway lane change rows only exist for HW-LC; others link by hazard family later
    out_abs.append(a)

# ---------- Foretellix SAFE library (VMAD-SG1-11-06, Nov 2020) mapping ----------
FX_LIB = {
 "2": {"title": "Cut in", "desc": "Un véhicule d'une voie voisine se rabat devant le DUT.", "torc": "Applicable"},
 "3": {"title": "Interceptor", "desc": "Conflit de trajectoires dans une intersection (au moins 3 branches).", "torc": "Hors autoroute : utile pour l'urbain (jalon 2)"},
 "4.1.1": {"title": "DUT merges at highway entry", "desc": "Le DUT s'insère depuis la bretelle ; un véhicule sort de l'autoroute par la voie d'insertion.", "torc": "Applicable"},
 "4.1.2": {"title": "Cut-out to highway exit", "desc": "Le leader du DUT sort de l'autoroute par la bretelle.", "torc": "Applicable"},
 "4.1.3": {"title": "Cars merge at highway entry", "desc": "Plusieurs véhicules s'insèrent depuis la bretelle ; le DUT s'aligne dans le convoi.", "torc": "Applicable"},
 "5": {"title": "Cut out", "desc": "Le leader change de voie, parfois en révélant un obstacle ; variante platoon.", "torc": "Applicable, sauf la partie platoon (Torc ne fait pas de platooning)"},
 "6": {"title": "Oncoming", "desc": "Véhicule en sens inverse sur route bidirectionnelle à 2 voies.", "torc": "Non applicable sur I-35 (chaussées séparées) ; contresens traité par AB-01"},
 "7": {"title": "Slow neighbors", "desc": "Le DUT longe un convoi lent dans la voie adjacente.", "torc": "Applicable"},
 "8": {"title": "Lane hugger", "desc": "Un véhicule adjacent roule près du marquage côté DUT.", "torc": "Applicable"},
 "9": {"title": "To side on curve", "desc": "Véhicule adjacent devant dans une courbe ; vitesse adaptée à la courbure.", "torc": "Applicable"},
 "10": {"title": "Stopped vehicles", "desc": "Convoi de véhicules arrêtés dans la voie du DUT ou la voie adjacente.", "torc": "Applicable"},
 "11": {"title": "Lead vehicle", "desc": "Suivi d'un leader et ses variantes.", "torc": "Applicable"},
 "12": {"title": "DUT speed limit change", "desc": "Changement de limite de vitesse (baisse ou hausse).", "torc": "Applicable"},
 "13": {"title": "DUT merge at lane end", "desc": "Fin de voie ; véhicule derrière dans la voie voisine.", "torc": "Applicable"},
 "14": {"title": "Stationary objects", "desc": "Flaques, cônes, piétons, camion en travers.", "torc": "Applicable ; flaques non modélisées au jalon 1 (adhérence)"},
}
FX_MAP = {
 "2": {"couvert": ["CI-01", "CI-02", "CI-03", "CI-04", "CI-05", "CI-08"], "partiel": ["RMP-09"]},
 "3": {"partiel": ["URB-02", "URB-03", "URB-07"]},
 "4.1.1": {"couvert": ["RMP-13"], "partiel": ["RMP-01", "LC-RD-03"]},
 "4.1.2": {"couvert": ["RMP-11"]},
 "4.1.3": {"couvert": ["RMP-12"], "partiel": ["CI-06", "LC-RD-05"]},
 "5": {"couvert": ["LV-11", "LC-CUR-02"], "partiel": ["RMP-05", "CI-08"]},
 "6": {"partiel": ["URB-15", "AB-01"]},
 "7": {"couvert": ["ADJ-05"]},
 "8": {"couvert": ["ADJ-06"], "partiel": ["ADJ-01"]},
 "9": {"couvert": ["RD-14"], "partiel": ["LC-RD-07", "RMP-08"]},
 "10": {"couvert": ["ADJ-07", "LV-05"], "partiel": ["LV-07"]},
 "11": {"couvert": ["LV-02", "LV-03", "LV-04", "LV-06", "LV-07", "LV-08"]},
 "12": {"couvert": ["RD-10"]},
 "13": {"couvert": ["LC-RD-01"]},
 "14": {"couvert": ["OBJ-01", "OBJ-02", "OBJ-05"], "partiel": ["OBJ-04", "OBJ-06", "LC-RD-02", "LC-OOD-04"]},
}
_by = {a["id"]: a for a in out_abs}
for a in out_abs: a["foretellix"] = []
for ref, lv in FX_MAP.items():
    for level, ids in lv.items():
        for i in ids:
            assert i in _by, i
            _by[i]["foretellix"].append({"ref": ref, "level": level})
# ---------- links added because HIRE v2 has the (behavior x ODD condition) and no abstract covered it ----------
HIRE_ADDED = {"OBJ-04": ["HW-CRU"], "LC-OOD-04": ["HW-CRU"], "OBJ-06": ["HW-CRU"], "RD-13": ["HW-CSS"], "OBJ-02": ["HW-CSS"]}
for a in out_abs:
    a.setdefault("link_origin", {})
    for c in HIRE_ADDED.get(a["id"], []):
        if c not in a["beh_codes"]:
            a["beh_codes"].append(c); a["behaviors"].append(CODE[c]); a["link_origin"][c] = "ajouté depuis le HIRE v2 (condition ODD sans abstract)"
    if a["id"] == "RMP-14": a["link_origin"]["HW-ONR"] = "abstract créé depuis le HIRE v2 (H5 sans abstract)"
# order: families
order = list(FAM.keys())
out_abs.sort(key=lambda a: (order.index(a["family"]) if a["family"] in order else 99, a["id"]))
ids = [a["id"] for a in out_abs]; assert len(ids) == len(set(ids)), "duplicate ids"

NHTSA = {1: "No driver present", 2: "Vehicle failure", 3: "Control loss with prior vehicle action", 4: "Control loss without prior vehicle action", 5: "Running red light", 6: "Running stop sign",
 7: "Road edge departure with prior vehicle maneuver", 8: "Road edge departure without prior vehicle maneuver", 9: "Road edge departure while backing up", 10: "Animal crash with prior vehicle maneuver",
 11: "Animal crash without prior vehicle maneuver", 12: "Pedestrian crash with prior vehicle maneuver", 13: "Pedestrian crash without prior vehicle maneuver", 14: "Pedalcyclist crash with prior vehicle maneuver",
 15: "Pedalcyclist crash without prior vehicle maneuver", 16: "Backing up into another vehicle", 17: "Vehicle(s) turning, same direction", 18: "Vehicle(s) parking, same direction",
 19: "Vehicle(s) changing lanes, same direction", 20: "Vehicle(s) drifting, same direction", 21: "Vehicle(s) making a maneuver, opposite direction", 22: "Vehicle(s) not making a maneuver, opposite direction",
 23: "Following vehicle making a maneuver", 24: "Lead vehicle accelerating", 25: "Lead vehicle moving at lower constant speed", 26: "Lead vehicle decelerating", 27: "Lead vehicle stopped",
 28: "LTAP/OD at signalized junctions", 29: "Vehicle(s) turning right at signalized junctions", 30: "LTAP/OD at non-signalized junctions", 31: "Straight crossing paths at non-signalized junctions",
 32: "Vehicle(s) turning at non-signalized junctions", 33: "Evasive action with prior vehicle maneuver", 34: "Evasive action without prior vehicle maneuver", 35: "Non-collision incident",
 36: "Object crash with prior vehicle maneuver", 37: "Object crash without prior vehicle maneuver"}

cat = dict(V2)
cat["behaviors"] = behaviors
cat["abstracts"] = out_abs
cat["families"] = {k: {"name": v[0], "desc": v[1]} for k, v in FAM.items()}
cat["nhtsa"] = NHTSA
cat["foretellix"] = FX_LIB
cat["jama_reqs"] = {k: {"id": k, "name": v["name"], "status": v.get("status"), "text": (v["desc"] or "")[:1200]} for k, v in REQS.items()}
json.dump(cat, open(ROOT / "catalogue/catalog_full.json", "w"), ensure_ascii=False)
n_links = sum(len(a["behaviors"]) for a in out_abs)
print("abstracts", len(out_abs), "links", n_links, "generable", sum(1 for a in out_abs if a["configuration"]))
from collections import Counter
print(Counter(c for a in out_abs for c in a["beh_codes"]))
