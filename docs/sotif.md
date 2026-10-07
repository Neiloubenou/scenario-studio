# SOTIF analysis

Chain: functional insufficiency (FI) → triggering condition (TC) → hazard and HIRE risk → scenario → concrete tests → results.
Sources: Full Mapping TC × FI × Hazard × AV3.0, TC catalogue V3_1, FI list V1, STPA QA review (27 Jul 2026).

## Functional insufficiencies

| FI | Block | Insufficiency | Hazards | TCs | Scenarios | Status |
|---|---|---|---|---|---|---|
| FI-AIM-01 | AI model | Performance degradation under data drift (runtime distribution departs from training: seasonal appearance, resurfacing, new signage). | H1, H2 | 3 | 0 | no scenario |
| FI-AIM-02 | AI model | Concept drift: learned input-output relationship no longer valid after operational change. |  | 0 | 0 | latent |
| FI-AIM-03 | AI model | Susceptibility to adversarial-like physical patterns (stickers, imagery, projected patterns). | H1, H2, H3, H5 | 5 | 0 | no scenario |
| FI-AIM-04 | AI model | Overconfident output on out-of-distribution input (no uncertainty flag raised). | H2, H3 | 1 | 3 | covered |
| FI-LOC-01 | Localization & Map | Incorrect global pose (GNSS+IMU fusion error). | H1, H2 | 1 | 1 | covered |
| FI-LOC-02 | Localization & Map | Local frame drift over time. | H1, H2 | 1 | 1 | covered |
| FI-LOC-03 | Localization & Map | Coordinate-system misalignment between components (Sensing / PCP / VI). |  | 0 | 0 | latent |
| FI-LOC-04 | Localization & Map | Offline map incorrect or stale vs reality. | H1, H2 | 4 | 2 | covered |
| FI-LOC-05 | Localization & Map | Incorrect lane assignment (ego located in wrong lane of the carriageway). | H1, H2 | 10 | 5 | covered |
| FI-PCP-01 | Perception | Lane markings not detected (no lane data provided to VI). | H1, H2, H3 | 22 | 3 | covered |
| FI-PCP-02 | Perception | Lane markings detected with insufficient precision or inconsistent performance. | H1, H2, H3 | 23 | 3 | covered |
| FI-PCP-03 | Perception | Non-standard / unconventional markings not recognized. | H1 | 1 | 1 | covered |
| FI-PCP-04 | Perception | Incorrect lane position / geometry estimate delivered (lateral position, curvature). | H1, H2, H3, H5 | 21 | 9 | covered |
| FI-PCP-05 | Perception | False positive lanes accepted (fake / shadow / skid-mark lanes). | H1, H2, H3 | 41 | 6 | covered |
| FI-PCP-06 | Perception | Actor / object not detected (OMV, VRU, static obstacle missed). | H1, H2, H3, H5, H6 | 82 | 68 | covered |
| FI-PCP-07 | Perception | Actor provided too late (perception latency in collision-critical situation). | H1, H2, H5 | 9 | 11 | covered |
| FI-PCP-08 | Perception | Incorrect actor position (adjacent / opposite / crossing). | H1, H2, H3, H5 | 29 | 31 | covered |
| FI-PCP-09 | Perception | Incorrect actor velocity (longitudinal / lateral). | H1, H2, H3, H5 | 32 | 40 | covered |
| FI-PCP-10 | Perception | Incorrect object classification (incl. EMV not recognized / non-EMV taken for EMV). | H1, H2, H3, H5, H6 | 22 | 9 | covered |
| FI-PCP-11 | Perception | False positive actors / objects (ghost targets). | H1, H2, H3, H5 | 42 | 7 | covered |
| FI-PCP-12 | Perception | Unstable / intermittent detection under intermittent occlusion. | H1, H2, H3, H5, H6 | 23 | 25 | covered |
| FI-PCP-13 | Perception | Speed limit not detected or incorrect value provided. | H2, H5 | 10 | 3 | covered |
| FI-PCP-14 | Perception | Traffic sign / signal not detected or misclassified (incl. temporary signage). | H1, H2, H3, H5, H6 | 50 | 12 | covered |
| FI-PCP-15 | Perception | Incorrect ego state / local pose estimate. |  | 0 | 0 | latent |
| FI-PCP-16 | Perception | Incorrect trailer position / configuration (or trailer in wrong coordinate frame). | H1, H2, H5 | 7 | 5 | covered |
| FI-PCP-17 | Perception | Degradation under specific environmental conditions not compensated (rain, fog, night, glare, shadows, low contrast). | H1, H2, H3, H4, H5, H6 | 50 | 16 | covered |
| FI-PCP-18 | Perception | Out-of-distribution / unseen object class not handled safely (no safe default). | H1, H2, H3 | 10 | 6 | covered |
| FI-SEN-01 | Sensing | A sensor stream provides no data (dropout / outage). | H3, H6 | 2 | 0 | no scenario |
| FI-SEN-02 | Sensing | Sensor data of insufficient quality (resolution, SNR, range) for the downstream task. | H1, H2, H3, H5 | 16 | 3 | covered |
| FI-SEN-03 | Sensing | Sensor configuration / calibration incorrect (wrong parameters, drift). | H1, H2 | 5 | 2 | covered |
| FI-SEN-04 | Sensing | Sensor mounting misaligned / data in unexpected coordinate frame (incl. factory mispositioning). | H1, H2 | 4 | 2 | covered |
| FI-SEN-05 | Sensing | IMU data incorrect, absent or insufficient (ego-motion estimation input). |  | 0 | 0 | latent |
| FI-SEN-06 | Sensing | GNSS data incorrect or absent. | H1, H2 | 1 | 1 | covered |
| FI-SEN-07 | Sensing | Vehicle Control feedback data incorrect or absent (ego actuation state unknown to planner). |  | 0 | 0 | latent |
| FI-SEN-08 | Sensing | Trailer not (fully) covered by sensing: no or partial trailer data in the sensor set. |  | 0 | 0 | latent |
| FI-VI-01 | Vehicle Intent | Plans trajectory following an incorrect ego lane (propagates FI-PCP-04 / FI-LOC-05). | H1, H2, H3, H5 | 21 | 9 | covered |
| FI-VI-02 | Vehicle Intent | Plans trajectory leaving the ego lane to satisfy constraints (false-positive avoidance, MC constraints). | H1, H2 | 7 | 4 | covered |
| FI-VI-03 | Vehicle Intent | Does not plan / freezes when required inputs are missing (no lane lines -> no trajectory). |  | 0 | 0 | latent |
| FI-VI-04 | Vehicle Intent | Wrong prediction of other actor motion / intent (adjacent, opposite, VRU). | H1, H2, H3, H5, H6 | 48 | 55 | covered |
| FI-VI-05 | Vehicle Intent | Incorrect traffic-rule application (right-of-way, speed rule, move-over, gap acceptance). | H1, H2, H3, H5, H6 | 51 | 23 | covered |
| FI-VI-06 | Vehicle Intent | Replanning too late for a dynamic change (cut-in, intrusion, lane shift). | H1, H2, H3, H5 | 31 | 40 | covered |
| FI-VI-07 | Vehicle Intent | Incorrect assumption on own capability envelope (braking / steering limits vs load, adhesion, grade). | H1, H2, H3, H5 | 44 | 13 | covered |

## Triggering conditions without a scenario (169 of 277)

| TC | Layer | Element | Condition | Hazards | FIs |
|---|---|---|---|---|---|
| TC-CRAWL-002 | L0 | Trailer Configuration | Low trailer weight | H5, H2 | FI-VI-07, FI-PCP-16 |
| TC-CRAWL-003 | L0 | Trailer Configuration | Non-uniform trailer weight distribution | H5, H2 | FI-VI-07, FI-PCP-16 |
| TC-CRAWL-007 | L0 | Tires | worn out tires | H5, H2 | FI-VI-07 |
| TC-CRAWL-008 | L0 | Tires | blow-out tires | H5 | FI-VI-07 |
| TC-CRAWL-009 | L0 | Tires | Underinflated tires | H5, H2 | FI-VI-07 |
| TC-CRAWL-011 | L0 | Sensor Suite | Mispositioned sensors due to shock | H1, H2 | FI-SEN-03, FI-SEN-04 |
| TC-CRAWL-013 | L0 | Sensor Suite | Incorrect Sensor calibration | H1, H2 | FI-SEN-03, FI-SEN-04 |
| TC-CRAWL-015 | L0 | Sensor Suite | Initially mispositionned sensors | H1, H2 | FI-SEN-03, FI-SEN-04 |
| TC-CRAWL-016 | L1 | 3-Way Intersection | Unusual/asymmetric intersection leg geometry | H1, H2 | FI-PCP-06, FI-PCP-08, FI-VI-04, FI-VI-05 |
| TC-CRAWL-017 | L1 | 3-Way Intersection | Unexpected 3rd-leg approach angle | H1, H2 | FI-PCP-06, FI-PCP-08, FI-VI-04, FI-VI-05 |
| TC-CRAWL-019 | L1 | 4-Way Intersection | Obstructed sightline at one approach | H1, H2 | FI-PCP-06, FI-PCP-08, FI-VI-04, FI-VI-05 |
| TC-CRAWL-020 | L1 | Skewed Y-Intersection | Acute/obtuse intersection angle misjudged | H1, H2 | FI-PCP-06, FI-PCP-08, FI-VI-04, FI-VI-05 |
| TC-CRAWL-021 | L1 | Skewed Y-Intersection | Yield sign viewed at oblique angle misclassified as stop | H1, H2 | FI-PCP-10, FI-PCP-14 |
| TC-CRAWL-022 | L1 | Intersection Angle | Highly skewed (non-perpendicular) crossing angle | H1, H2 | FI-PCP-06, FI-PCP-08, FI-VI-04, FI-VI-05 |
| TC-CRAWL-023 | L1 | Intersection Angle | Intersection angle reducing sightline to cross traffic | H1, H2 | FI-PCP-06, FI-PCP-08, FI-VI-04, FI-VI-05 |
| TC-CRAWL-026 | L1 | Lane Width | too wide lane width | H1 | FI-PCP-04, FI-VI-01, FI-VI-07 |
| TC-CRAWL-029 | L1 | Lane Cross-slope | high lane slope | H1, H5 | FI-PCP-04, FI-VI-01, FI-VI-07 |
| TC-CRAWL-030 | L1 | Lane Cross-slope | low lane slope | H1, H5 | FI-PCP-04, FI-VI-01, FI-VI-07 |
| TC-CRAWL-033 | L1 | Horizontal Lane Curvature | pronounced curve | H1, H5 | FI-PCP-04, FI-VI-01, FI-VI-07 |
| TC-CRAWL-037 | L1 | Lane Grade | low lane grade | H2, H3, H5 | FI-PCP-04, FI-VI-01, FI-VI-07 |
| TC-CRAWL-038 | L1 | Lane Grade | instability-prone road by irregular grade | H2, H3, H5 | FI-PCP-04, FI-VI-01, FI-VI-07 |
| TC-CRAWL-041 | L1 | Vertical Curve | high vertical curve | H2 | FI-PCP-04, FI-VI-01, FI-VI-07 |
| TC-CRAWL-043 | L1 | Vertical Curve | Sag curve creating perceived road discontinuity | H2 | FI-PCP-04, FI-VI-01, FI-VI-07 |
| TC-CRAWL-045 | L1 | Traffic Travel Lane | lane splits | H1 | FI-PCP-04, FI-LOC-05, FI-VI-01 |
| TC-CRAWL-051 | L1 | Merging Lane | Merge taper ending earlier than expected | H1, H3 | FI-PCP-06, FI-PCP-09, FI-VI-05, FI-VI-06 |
| TC-CRAWL-056 | L1 | Edge Lines | wrong color of lane marking | H1 | FI-PCP-01, FI-PCP-02, FI-PCP-05 |
| TC-CRAWL-057 | L1 | Edge Lines | hidden/obstructed lane markings | H1 | FI-PCP-01, FI-PCP-02, FI-PCP-05, FI-PCP-12 |
| TC-CRAWL-058 | L1 | Edge Lines | invisible lane markings at night | H1 | FI-PCP-01, FI-PCP-02, FI-PCP-05, FI-PCP-17 |
| TC-CRAWL-059 | L1 | Edge Lines | invisible lane markings in damp surface | H1 | FI-PCP-01, FI-PCP-02, FI-PCP-05 |
| TC-CRAWL-062 | L1 | Edge Lines | old faded lane markings | H1 | FI-PCP-01, FI-PCP-02, FI-PCP-05 |
| TC-CRAWL-063 | L1 | Edge Lines | poor quality of lane markings | H1 | FI-PCP-01, FI-PCP-02, FI-PCP-05 |
| TC-CRAWL-069 | L1 | Double solid yellow lines | Faded double yellow line mistaken for single line | H1 | FI-PCP-10, FI-PCP-14 |
| TC-CRAWL-070 | L1 | Double solid yellow lines | Double yellow obscured by debris | H1 | FI-PCP-01, FI-PCP-02, FI-PCP-05, FI-PCP-12 |
| TC-CRAWL-071 | L1 | Double yellow lines - solid one direction, broken other | Asymmetric double yellow misread as fully solid/fully broken | H1 | FI-PCP-10, FI-PCP-14 |
| TC-CRAWL-072 | L1 | Double yellow lines - solid one direction, broken other | Worn broken-side line blending with solid side | H1 | FI-PCP-01, FI-PCP-02, FI-PCP-05, FI-PCP-17 |
| TC-CRAWL-073 | L1 | Yellow Diagonal Stripes | Diagonal stripe marking faded/low contrast | H1 | FI-PCP-01, FI-PCP-02, FI-PCP-05, FI-PCP-17 |
| TC-CRAWL-074 | L1 | Yellow Diagonal Stripes | Diagonal stripes obscured by debris | H1 | FI-PCP-01, FI-PCP-02, FI-PCP-05, FI-PCP-12 |
| TC-CRAWL-075 | L1 | Front and Right Turn Only | Worn/missing turn-only arrow marking | H1, H2 | FI-PCP-01, FI-PCP-02, FI-PCP-05 |
| TC-CRAWL-077 | L1 | Front and Left Turn Only | Worn/missing turn-only arrow marking | H1, H2 | FI-PCP-01, FI-PCP-02, FI-PCP-05 |
| TC-CRAWL-078 | L1 | Front and Left Turn Only | Turn-only lane marking confused with through lane | H1, H2 | FI-PCP-05, FI-PCP-11 |
| TC-CRAWL-080 | L1 | Merge Arrow Lane Marking | Merge arrow obscured by traffic/debris | H1, H3 | FI-PCP-01, FI-PCP-02, FI-PCP-05, FI-PCP-12 |
| TC-CRAWL-081 | L1 | Quality of Road Markings | Inconsistent marking quality across a single segment | H1 | FI-PCP-01, FI-PCP-02, FI-PCP-05 |
| TC-CRAWL-082 | L1 | Quality of Road Markings | Marking quality abruptly changing at jurisdiction boundary | H1 | FI-PCP-01, FI-PCP-02, FI-PCP-05 |
| TC-CRAWL-083 | L1 | Cat's Eyes | Cracked/broken road studs | H1 | FI-PCP-01, FI-PCP-02, FI-PCP-05 |
| TC-CRAWL-084 | L1 | Cat's Eyes | Road studs covered by dirt reducing reflectivity | H1 | FI-PCP-01, FI-PCP-02, FI-PCP-05, FI-PCP-17 |
| TC-CRAWL-085 | L1 | Road deformation (raveling, cracking, rutting, pothole) | manhole | H5, H1 | FI-PCP-11, FI-PCP-17, FI-VI-07 |
| TC-CRAWL-086 | L1 | Road deformation (raveling, cracking, rutting, pothole) | bumpy road | H5, H1 | FI-PCP-11, FI-PCP-17, FI-VI-07 |
| TC-CRAWL-087 | L1 | Road deformation (raveling, cracking, rutting, pothole) | damaged road / instability-prone road | H5, H1 | FI-PCP-11, FI-PCP-17, FI-VI-07 |
| TC-CRAWL-088 | L1 | Road deformation (raveling, cracking, rutting, pothole) | Deep/sharp-edged pothole | H5, H1 | FI-PCP-11, FI-PCP-17, FI-VI-07 |
| TC-CRAWL-089 | L1 | Road deformation (raveling, cracking, rutting, pothole) | Wheel-path rutting causing steering pull | H5, H1 | FI-PCP-11, FI-PCP-17, FI-VI-07 |
| TC-CRAWL-090 | L1 | Road deformation (raveling, cracking, rutting, pothole) | Aggregate loss (raveling) resembling debris | H5, H1 | FI-PCP-10, FI-PCP-14 |
| TC-CRAWL-091 | L1 | Pavement condition | Patchy repair areas resembling debris/stains | H5, H1 | FI-PCP-10, FI-PCP-14 |
| TC-CRAWL-092 | L1 | Pavement condition | Surface texture inconsistent across lane | H5, H1 | FI-PCP-11, FI-PCP-17, FI-VI-07 |
| TC-CRAWL-093 | L1 | Leaves | Leaves obscuring lane markings | H1, H2 | FI-PCP-11, FI-PCP-17, FI-VI-07 |
| TC-CRAWL-094 | L1 | Leaves | Leaf pile mistaken for solid obstacle | H3 | FI-PCP-10, FI-PCP-14 |
| TC-CRAWL-095 | L1 | Damp surface | Damp patch misread as oil stain/shadow | H3 | FI-PCP-05, FI-PCP-11 |
| TC-CRAWL-096 | L1 | Damp surface | Reduced friction not visually obvious (looks dry) | H5, H2 | FI-PCP-11, FI-PCP-17, FI-VI-07 |
| TC-CRAWL-103 | L1 | Asphalt | Resurfaced seam misread as a concrete joint | H5 | FI-PCP-10, FI-PCP-14 |
| TC-CRAWL-104 | L1 | Asphalt | Polished/oil-glazed asphalt causing glare | H5 | FI-PCP-11, FI-PCP-17, FI-VI-07 |
| TC-CRAWL-105 | L1 | Cement Concrete | Worn/filled joint lines reducing material-classification confidence | H5 | FI-PCP-11, FI-PCP-17, FI-VI-07 |
| TC-CRAWL-107 | L1 | Gravel | Loose aggregate/dust kicked up reducing visibility | H5, H1 | FI-PCP-11, FI-PCP-17, FI-VI-07 |
| TC-CRAWL-108 | L1 | Gravel | Highly variable local surface uniformity (ruts vs loose) | H5, H1 | FI-PCP-11, FI-PCP-17, FI-VI-07 |
| TC-CRAWL-109 | L2 | Stop Sign and All-Way Plaque | hidden stop sign | H2, H1 | FI-PCP-14, FI-VI-05, FI-PCP-12 |
| TC-CRAWL-110 | L2 | Stop Sign and All-Way Plaque | missing stop sign | H2, H1 | FI-PCP-14, FI-VI-05 |
| TC-CRAWL-111 | L2 | Stop Sign and All-Way Plaque | broken/damaged stop sign | H2, H1 | FI-PCP-14, FI-VI-05 |
| TC-CRAWL-112 | L2 | Stop Sign and All-Way Plaque | Sign retroreflectivity degraded (invisible at night) | H2, H1 | FI-PCP-14, FI-VI-05, FI-PCP-17 |
| TC-CRAWL-113 | L2 | Stop Sign and All-Way Plaque | Missing all-way plaque changing right-of-way meaning | H2, H1 | FI-PCP-14, FI-VI-05 |
| TC-CRAWL-114 | L2 | Stop Sign and All-Way Plaque | Stop Sign position leading to being misclassified as applicable for ego | H2, H1 | FI-PCP-10, FI-PCP-14 |
| TC-CRAWL-115 | L2 | Stop Sign and All-Way Plaque | Stop Sign position leading to being missclassified as not applicable for ego | H2, H1 | FI-PCP-14, FI-VI-05 |
| TC-CRAWL-116 | L2 | Yield Sign | hidden yield sign | H2, H1 | FI-PCP-14, FI-VI-05, FI-PCP-12 |
| TC-CRAWL-117 | L2 | Yield Sign | missing yield sign | H2, H1 | FI-PCP-14, FI-VI-05 |
| TC-CRAWL-118 | L2 | Yield Sign | broken/damaged yield sign | H2, H1 | FI-PCP-14, FI-VI-05 |
| TC-CRAWL-119 | L2 | Yield Sign | Yield sign viewed at oblique angle misclassified as stop | H2, H1 | FI-PCP-10, FI-PCP-14 |
| TC-CRAWL-120 | L2 | Yield Sign | Yield Sign position to being misclassified as applicable for ego | H2, H1 | FI-PCP-10, FI-PCP-14 |
| TC-CRAWL-121 | L2 | Yield Sign | Yield Sign position leading to being misclassified as not applicable for ego | H2, H1 | FI-PCP-10, FI-PCP-14 |
| TC-CRAWL-122 | L2 | Fasten Seat Belt Sign | Sign not applicable to ADS misclassified as a regulatory sign | H3 | FI-PCP-10, FI-PCP-14 |
| TC-CRAWL-124 | L2 | Posted Speed Limit | missing speed limit sign | H2, H5 | FI-PCP-13, FI-VI-05 |
| TC-CRAWL-125 | L2 | Posted Speed Limit | broken/damaged speed limit sign | H2, H5 | FI-PCP-13, FI-VI-05 |
| TC-CRAWL-128 | L2 | Advisory Speed | Advisory speed plaque illegible/missing | H2, H5 | FI-PCP-13, FI-VI-05 |
| TC-CRAWL-130 | L2 | Advisory Speed | Advisory speed misunderstood as regulatory | H2, H5 | FI-PCP-13, FI-VI-05 |
| TC-CRAWL-131 | L2 | Statutory Speed Limit | Statutory limit wrongly assumed when no posted sign exists | H2, H5 | FI-PCP-13, FI-VI-05 |
| TC-CRAWL-132 | L2 | For official and emergency vehicle use only sign | Restriction sign missed, leading to unauthorized lane use | H6 | FI-PCP-06, FI-PCP-14 |
| TC-CRAWL-133 | L2 | For official and emergency vehicle use only sign | Sign obscured by vegetation | H6 | FI-PCP-14, FI-VI-05, FI-PCP-12 |
| TC-CRAWL-135 | L2 | one way sign | One-way sign missed/obscured, no wrong-way-risk cue | H2 | FI-PCP-06, FI-PCP-14 |
| TC-CRAWL-136 | L2 | Low clearance advance sign | Clearance value illegible/missing | H2 | FI-PCP-14, FI-VI-05 |
| TC-CRAWL-137 | L2 | Low clearance advance sign | Vertical clearance overestimated due to sign uncertainty | H2 | FI-PCP-14, FI-VI-05 |
| TC-CRAWL-138 | L2 | stop ahead sign | Advance warning sign missed, shortening reaction time to the actual stop | H2, H3 | FI-PCP-06, FI-PCP-14 |
| TC-CRAWL-139 | L2 | stop ahead sign | Stop ahead considered as a stop sign | H2, H3 | FI-PCP-14, FI-VI-05 |
| TC-CRAWL-142 | L2 | Bridge may Ice in cold weather sign | Sign missed, no anticipatory caution for localized icing | H5 | FI-PCP-06, FI-PCP-14 |
| TC-CRAWL-149 | L2 | variable message sign | VMS mistaken for regulatory sign | H3, H2 | FI-PCP-10, FI-PCP-14 |
| TC-CRAWL-150 | L2 | variable message sign | VMS display washed out by sun glare / blooming at night | H3, H2 | FI-PCP-14, FI-VI-05, FI-PCP-17 |
| TC-CRAWL-151 | L2 | variable message sign | VMS obstructed by adjacent large vehicle at message display time | H3, H2 | FI-PCP-14, FI-VI-05 |
| TC-CRAWL-154 | L2 | Bridge | Vehicles in below traffic identified as same level as ego | H2, H1 | FI-PCP-06, FI-PCP-11, FI-PCP-05 |
| TC-CRAWL-155 | L2 | Undercrossing | insufficient undercrossing clearance | H2, H1 | FI-PCP-06, FI-PCP-11, FI-PCP-05 |
| TC-CRAWL-156 | L2 | Undercrossing | Shadow cast by undercrossing structure resembling a pavement marking | H2, H1 | FI-PCP-05, FI-PCP-11 |
| TC-CRAWL-157 | L2 | Rest Area | Rest-area entrance/exit misread as a regular exit ramp | H1, H2 | FI-PCP-10, FI-PCP-14 |
| TC-CRAWL-158 | L2 | Rest Area | Ego using Passenger cars entrance | H1, H2 | FI-PCP-06, FI-PCP-11, FI-PCP-05 |
| TC-CRAWL-159 | L2 | Rest Area | Rest Area without exit direction sign | H1, H2 | FI-PCP-06, FI-PCP-11, FI-PCP-05 |
| TC-CRAWL-160 | L2 | Roadside Barriers | Low-reflectivity/rusted barrier invisible at night | H1 | FI-PCP-06, FI-PCP-11, FI-PCP-05, FI-PCP-17 |
| TC-CRAWL-161 | L2 | Roadside Barriers | Damaged/breached barrier section changing the effective boundary | H1 | FI-PCP-06, FI-PCP-11, FI-PCP-05 |
| TC-CRAWL-162 | L2 | Median Barriers | Missing reflective delineator markers on barrier | H1 | FI-PCP-06, FI-PCP-11, FI-PCP-05, FI-PCP-17 |
| TC-CRAWL-163 | L2 | Median Barriers | Damaged/offset barrier section | H1 | FI-PCP-06, FI-PCP-11, FI-PCP-05 |
| TC-CRAWL-164 | L2 | Bridge Railings | bridge railings mistaken for lane markings | H1 | FI-PCP-05, FI-PCP-11 |
| TC-CRAWL-165 | L2 | Bridge Railings | Railing shadow pattern resembling repeated lane markings | H1 | FI-PCP-05, FI-PCP-11 |
| TC-CRAWL-166 | L2 | Crash Cushions | Crash cushion (impact attenuator) misclassified as a normal barrier end | H1, H2 | FI-PCP-10, FI-PCP-14 |
| TC-CRAWL-167 | L2 | Crash Cushions | Deployed/compressed crash cushion after a prior impact | H2 | FI-PCP-06, FI-PCP-11, FI-PCP-05 |
| TC-CRAWL-170 | L4 | Passenger Automobile | Towed Vehicle | H1, H2, H3 | FI-PCP-06, FI-PCP-08, FI-PCP-09, FI-VI-04, FI-VI-06 |
| TC-CRAWL-172 | L4 | Passenger Automobile | Vehicle crossing | H1, H2, H3 | FI-PCP-06, FI-PCP-08, FI-PCP-09, FI-VI-04, FI-VI-06 |
| TC-CRAWL-190 | L4 | Trucks | Noisy vehicle | H1, H2, H5 | FI-PCP-06, FI-PCP-08, FI-PCP-09, FI-VI-04, FI-VI-06 |
| TC-CRAWL-204 | L4 | VRU | VRU in atypical posture (crouching/bending) not matching upright-pose model | H2, H1 | FI-PCP-06, FI-PCP-07, FI-PCP-12, FI-VI-04 |
| TC-CRAWL-205 | L4 | VRU | VRU with low-reflectivity clothing at night | H2, H1 | FI-PCP-06, FI-PCP-07, FI-PCP-12, FI-VI-04, FI-PCP-17 |
| TC-CRAWL-208 | L4 | Other Dynamic Objects | Animal crossing path with unpredictable motion | H2, H5 | FI-VI-04, FI-PCP-06 |
| TC-CRAWL-209 | L4 | Static Objects | Overhanging obstacle | H2, H1 | FI-VI-07, FI-PCP-16 |
| TC-CRAWL-211 | L4 | Static Objects | Movable obstacle on ego path | H2, H1 | FI-PCP-06, FI-PCP-11, FI-PCP-18, FI-VI-02 |
| TC-CRAWL-213 | L4 | Static Objects | too many static objects | H2, H1 | FI-PCP-06, FI-PCP-11, FI-PCP-18, FI-VI-02 |
| TC-CRAWL-216 | L4 | Static Objects | Object appearing static but marginally unstable (could shift) | H2, H1 | FI-PCP-06, FI-PCP-11, FI-PCP-18, FI-VI-02 |
| TC-CRAWL-217 | L5 | Ambient Light Intensity | Low light | H1, H2 | FI-PCP-17, FI-SEN-02 |
| TC-CRAWL-218 | L5 | Ambient Light Intensity | Deep localized shadow pockets during daytime (sudden low-light dropout) | H1, H2 | FI-PCP-17, FI-SEN-02 |
| TC-CRAWL-219 | L5 | Sun Angle | Sun glare | H1, H2 | FI-PCP-17, FI-SEN-02 |
| TC-CRAWL-220 | L5 | Sun Angle | Long low-angle shadows resembling pavement markings | H1, H2 | FI-PCP-05, FI-PCP-11 |
| TC-CRAWL-221 | L5 | Artificial Lighting Source | shadows from artificial lighting source | H1, H2 | FI-PCP-17, FI-SEN-02 |
| TC-CRAWL-222 | L5 | Artificial Lighting Source | glare from artificial lighting source | H1, H2 | FI-PCP-17, FI-SEN-02 |
| TC-CRAWL-223 | L5 | Artificial Lighting Source | reflected light | H1, H2 | FI-PCP-17, FI-SEN-02 |
| TC-CRAWL-224 | L5 | Artificial Lighting Source | Multiple simultaneous light sources overwhelming glare compensation | H1, H2 | FI-PCP-17, FI-SEN-02 |
| TC-CRAWL-226 | L5 | Constant Wind and Gust Combinations | high wind | H1, H5 | FI-VI-07, FI-PCP-17 |
| TC-CRAWL-229 | L5 | Constant Wind and Gust Combinations | Wind effects only inferable indirectly (no direct wind sensor) | H1, H5 | FI-VI-07, FI-PCP-17 |
| TC-CRAWL-230 | L5 | Day Time | Transition period (dawn/dusk) with rapidly changing light levels | H1, H2 | FI-PCP-17, FI-SEN-02 |
| TC-CRAWL-231 | L5 | Night Time | Reliance on active lighting cues only; reduced passive detectability of unlit objects | H1, H2 | FI-PCP-17, FI-SEN-02 |
| TC-CRAWL-235 | L6 | Test Equipment RF Communication | RF interference/dropout affecting test-equipment link | H6 | FI-SEN-01 |
| TC-CRAWL-236 | L6 | Remote Assistant Communication | Communication latency/dropout during a remote-assistance request | H3, H6 | FI-SEN-01 |
| TC-CRAWL-246 | L3 | Work Zones (new element) | Temporarily unpaved / milled surface carrying traffic | H5, H1 | FI-PCP-17, FI-VI-07 |
| TC-CRAWL-247 | L5 | Rain / Precipitation (new element) | Heavy rain reducing effective sensor range | H2, H1 | FI-PCP-17, FI-SEN-02 |
| TC-CRAWL-248 | L5 | Rain / Precipitation (new element) | Standing water / hydroplaning patch on lane | H5 | FI-PCP-17, FI-VI-07 |
| TC-CRAWL-249 | L5 | Rain / Precipitation (new element) | Spray plumes from lead trucks occluding sensors | H2 | FI-PCP-12, FI-SEN-02 |
| TC-CRAWL-250 | L5 | Rain / Precipitation (new element) | Water film on radar radome / camera cover | H2, H1 | FI-SEN-02, FI-SEN-03 |
| TC-CRAWL-252 | L5 | Air Temperature (new element) | Heat shimmer / mirage distorting camera returns on hot asphalt | H2, H1 | FI-PCP-17, FI-PCP-11 |
| TC-CRAWL-255 | L4 | Animals (new element) | Animal carcass as static obstacle in lane | H2, H1 | FI-PCP-06, FI-PCP-18 |
| TC-CRAWL-256 | L6 | Sensor interference (new element) | Radar / lidar mutual interference from other vehicles' active sensors | H3, H2 | FI-PCP-11, FI-SEN-02 |
| TC-CRAWL-257 | L2 | Road furniture (radar) | Radar ghost targets from strong reflectors (gantries, guardrail ends, expansion joints) | H3 | FI-PCP-11 |
| TC-CRAWL-258 | L2 | Billboards / Advertising (new element) | Billboard or trailer-wrap photorealistic image of vehicle / person / sign | H3 | FI-PCP-11, FI-AIM-03 |
| TC-CRAWL-259 | L2 | Billboards / Advertising (new element) | Dynamic advertising displaying traffic-control-like pattern (e.g. red circle on black) | H3 | FI-PCP-14, FI-AIM-03 |
| TC-CRAWL-260 | L2 | Billboards / Advertising (new element) | Imagery on rear of bus / truck misread as road user | H3, H2 | FI-PCP-11, FI-AIM-03 |
| TC-CRAWL-261 | L2 | Defaced signs / malicious (new element) | Stickers / graffiti / partial paint on regulatory sign altering its reading | H2, H5 | FI-PCP-13, FI-PCP-14, FI-AIM-03 |
| TC-CRAWL-262 | L4 | Defaced signs / malicious (new element) | Person deliberately blocking or provoking the SDT | H2, H6 | FI-VI-04, FI-VI-05 |
| TC-CRAWL-263 | L4 | Defaced signs / malicious (new element) | Laser / light projection aimed at SDT sensors | H2, H1 | FI-SEN-02, FI-AIM-03 |
| TC-CRAWL-267 | L5 | [Out-of-ODD] Bridge icing | Localized black ice on bridge deck / overpass during winter cold snap (corridor min -4°F) | H5 | FI-PCP-17, FI-VI-07 |
| TC-CRAWL-268 | L5 | Appearance drift (new element) | Seasonal vegetation change altering scene appearance vs training data | H1 | FI-AIM-01 |
| TC-CRAWL-269 | L1 | Appearance drift (new element) | Resurfaced / unusually dark or light pavement vs training distribution | H1 | FI-AIM-01, FI-PCP-02 |
| TC-CRAWL-270 | L2 | Appearance drift (new element) | New signage standard / format not in training data | H2 | FI-AIM-01, FI-PCP-14 |
| TC-CRAWL-275 | L0 | Ego conspicuity (new element) | Rear / side light units soiled by road grime | H4, H3, H1 | (no FI mapped) |
| TC-CRAWL-276 | L1 | Ego conspicuity (new element) | SDT stopped at ambiguous angle on narrow shoulder (signals unreadable at night) | H4, H3 | (no FI mapped) |
| TC-CRAWL-277 | L4 | Ego conspicuity (new element) | LED signal flicker interacting with following vehicles' cameras (rolling shutter) | H4, H3 | (no FI mapped) |
| TC-CRAWL-004 | L0 | Trailer Configuration | Long trailer overhang |  |  |
| TC-CRAWL-005 | L0 | Trailer Configuration | Multiple/tandem trailers (long combination) |  |  |
| TC-CRAWL-010 | L0 | Tires | Mismatched tire tread depth |  |  |
| TC-CRAWL-028 | L1 | Lane Width | Lane width varying within same segment (taper) |  |  |
| TC-CRAWL-031 | L1 | Lane Cross-slope | Adverse cross-slope (crowned away from curve direction) |  |  |
| TC-CRAWL-035 | L1 | Horizontal Lane Curvature | Compound/reversing curve sequence |  |  |
| TC-CRAWL-040 | L1 | Lane Grade | Sensor pitch offset at grade transition (crest/sag) |  |  |
| TC-CRAWL-048 | L1 | Traffic Travel Lane | Temporary lane shift (construction) not on map |  |  |
| TC-CRAWL-054 | L1 | Shoulder | Vehicle illegally using shoulder as travel lane |  |  |
| TC-CRAWL-066 | L1 | Edge Lines | Marking covered by standing water/glare |  |  |
| TC-CRAWL-076 | L1 | Front and Right Turn Only | Turn-only marking contradicted by absent sign |  |  |
| TC-CRAWL-106 | L1 | Cement Concrete | Water/ice pooling at expansion joints |  |  |
| TC-CRAWL-152 | L2 | Bridge | Abrupt light/dark exposure transition entering the bridge structure |  |  |
| TC-CRAWL-153 | L2 | Bridge | Vertical clearance value close to vehicle height (uncertain fit) |  |  |
| TC-CRAWL-194 | L4 | Trucks | Overhanging/oversized load extending beyond chassis silhouette |  |  |
| TC-CRAWL-233 | L6 | GNSS | Reduced satellite visibility in urban canyon/tree cover |  |  |
| TC-CRAWL-234 | L6 | GNSS | Multipath reflection producing a confidently wrong position fix |  |  |

## STPA context groups

| Context group | UCAs | Without loss scenario |
|---|---|---|
| No Actors | 0 | 0 |
| Same direction / path | 55 | 28 |
| Opposite direction | 12 | 3 |
| Merging in/out of ego lane | 16 | 11 |
| VRUs / emergency vehicles | 56 | 20 |
| Intersections | 52 | 26 |
| Work zones | 9 | 4 |
| Road debris / obstacles | 7 | 6 |
| Adverse weather / road | 6 | 2 |
| Self-imposed loss of control | 14 | 14 |
