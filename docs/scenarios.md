# Scenario catalogue

121 scenarios (SERYTI catalogue v3, English titles). Behaviors use the Abstract Scenario Manager codes. HIRE level: justified, indirect, or review.


## LV · Lead vehicle

| ID | Scenario | Behaviors | HIRE | Criteria | Generable |
|---|---|---|---|---|---|
| LV-01 | Free road, no lead vehicle | HW-LCC, URB-LCC | justified | C01, C07, C08, C10, C18 | yes |
| LV-02 | Slower lead at constant speed | HW-LCC, HW-AF, URB-AF | justified | C01, C07, C08, C10 | yes |
| LV-03 | Lead vehicle decelerates moderately | HW-AF, URB-AF | justified | C01, C07, C08, C10 | yes |
| LV-04 | Lead vehicle brakes hard | HW-AF, HW-SIL, HW-ELM, URB-AF | justified | C01, C06, C07, C08, C10, C12 | yes |
| LV-05 | Stopped lead vehicle (queue tail, stalled vehicle) | HW-LCC, HW-AF, HW-SIL, HW-ELM, HW-LC, URB-AF | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10, C12 | yes |
| LV-06 | Lead vehicle accelerates away | HW-AF, URB-AF | justified | C01, C07, C08, C10, C18 | yes |
| LV-07 | Stop-and-go traffic | HW-AF, URB-AF | justified | C01, C07, C08, C10 | yes |
| LV-08 | Erratic lead vehicle | HW-AF | justified | C01, C07, C08, C10 | yes |
| LV-09 | Motorcycle as lead vehicle | HW-LCC, HW-AF | justified | C01, C07, C08, C10 | yes |
| LV-10 | Truck lead hiding the road ahead | HW-AF, HW-SIL | justified | C01, C07, C08, C10, C12 | yes |
| LV-11 | Lead vehicle cuts out and clears the lane | HW-LCC, HW-AF | justified | C01, C07, C08, C10, C18 | yes |

## CI · Cut-in

| ID | Scenario | Behaviors | HIRE | Criteria | Generable |
|---|---|---|---|---|---|
| CI-01 | Cut-in from the left, sufficient gap | HW-LCC, HW-AF, URB-AF | justified | C01, C06, C07, C08, C10 | yes |
| CI-02 | Tight cut-in from the left | HW-LCC, HW-AF, HW-SIL | justified | C01, C06, C07, C08, C10, C12 | yes |
| CI-03 | Cut-in from the right | HW-LCC, HW-AF | justified | C01, C06, C07, C08, C10 | yes |
| CI-04 | Cut-in by a slower vehicle | HW-LCC, HW-AF | justified | C01, C06, C07, C08, C10 | yes |
| CI-05 | Cut-in by a semi-trailer | HW-LCC, HW-AF | justified | C01, C06, C07, C08, C10 | yes |
| CI-06 | Merge from the on-ramp ahead of the SDT | HW-LCC, HW-AF | justified | C01, C06, C07, C08, C10 | yes |
| CI-07 | Brake check after a cut-in | HW-AF, HW-SIL | justified | C01, C07, C08, C10, C12 | yes |
| CI-08 | Two vehicles cut in one after the other | HW-LCC, HW-AF | justified | C01, C06, C07, C08, C10 | yes |

## ADJ · Adjacent vehicles

| ID | Scenario | Behaviors | HIRE | Criteria | Generable |
|---|---|---|---|---|---|
| ADJ-01 | Adjacent vehicle drifting toward the SDT | HW-LCC, HW-AF, HW-ELM | justified | C01, C06, C07, C08, C10, C12, C18 | yes |
| ADJ-02 | Adjacent semi with swaying trailer | HW-LCC, HW-AF | justified | C01, C06, C07, C08, C10, C18 | yes |
| ADJ-03 | Motorcycle lane splitting | HW-LCC, HW-AF | justified | C01, C06, C07, C08, C10, C18 | yes |
| ADJ-04 | Fast and close overtake | HW-LCC, HW-AF | justified | C01, C06, C07, C08, C10, C18 | yes |
| ADJ-05 | Slow convoy in the adjacent lane | HW-LCC, HW-AF, HW-LC | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10, C18 | yes |
| ADJ-06 | Adjacent lane hugger | HW-LCC, HW-AF, HW-LC | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10, C18 | yes |
| ADJ-07 | Stopped queue in the adjacent lane | HW-LCC, HW-AF, HW-LC | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10, C18 | yes |

## LC-NOM · Nominal lane change

| ID | Scenario | Behaviors | HIRE | Criteria | Generable |
|---|---|---|---|---|---|
| LC-NOM-01 | Lane change into a free target lane | HW-LC, URB-LC | justified | C01, C02, C03, C04, C05, C06, C10 | yes |
| LC-NOM-02 | Lane change into a gap with surrounding traffic | HW-LC, URB-LC | justified | C01, C02, C03, C04, C05, C06, C10 | yes |
| LC-NOM-03 | Overtake a slow lead vehicle | HW-LC | justified | C01, C02, C03, C04, C05, C06, C10 | yes |
| LC-NOM-04 | Return to the lane after overtaking | HW-LC | justified | C01, C02, C03, C04, C05, C06, C10 | yes |

## LC-TGT · Target lane traffic

| ID | Scenario | Behaviors | HIRE | Criteria | Generable |
|---|---|---|---|---|---|
| LC-TGT-01 | Lane change with fast rear approach | HW-LC, URB-LC | justified | C01, C02, C03, C04, C05, C06, C10 | yes |
| LC-TGT-02 | Lane change with simultaneous merge from the far lane | HW-LC | justified | C01, C02, C03, C04, C05, C06, C10 | yes |
| LC-TGT-03 | Lane change with closing gap | HW-LC, HW-ORM | justified | C01, C02, C03, C04, C05, C06, C10, C15 | yes |
| LC-TGT-04 | Lane change with target lead braking | HW-LC | justified | C01, C02, C03, C04, C05, C06, C10 | yes |
| LC-TGT-05 | Lane change with vehicle alongside the trailer | HW-LC | justified | C01, C02, C03, C04, C05, C06, C10 | yes |
| LC-TGT-06 | Lane change with motorcycle in the blind spot | HW-LC | justified | C01, C02, C03, C04, C05, C06, C10 | yes |
| LC-TGT-07 | Lane change next to a large or unstable vehicle | HW-LC, HW-LCC, HW-AF | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10, C18 | yes |

## LC-CUR · Origin lane event during the lane change

| ID | Scenario | Behaviors | HIRE | Criteria | Generable |
|---|---|---|---|---|---|
| LC-CUR-01 | Lane change with origin lead braking | HW-LC, URB-LC | justified | C01, C02, C03, C04, C05, C06, C10 | yes |
| LC-CUR-02 | Evasive lane change after lead cut-out | HW-LC, HW-AF, HW-SIL, HW-ELM, HW-LCC | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10, C12, C18 | yes |
| LC-CUR-03 | Lane change with tailgating follower | HW-LC | justified | C01, C02, C03, C04, C05, C06, C10 | yes |

## RMP · Ramps: merge, exit, weave

| ID | Scenario | Behaviors | HIRE | Criteria | Generable |
|---|---|---|---|---|---|
| RMP-01 | Merge: gap accepted at the end of the acceleration lane | HW-ORM | justified | C01, C02, C03, C04, C05, C06, C10, C15 | yes |
| RMP-02 | Merge: short acceleration lane | HW-ORM | justified | C01, C02, C03, C04, C05, C06, C10, C15 | yes |
| RMP-03 | Merge: saturated main lane | HW-ORM | justified | C01, C02, C03, C04, C05, C06, C10, C15 | yes |
| RMP-04 | Merge: slow or stopped vehicle ahead on the ramp | HW-ORM | justified | C01, C02, C03, C04, C05, C06, C10, C15 | yes |
| RMP-05 | Merge: a main-lane vehicle moves over | HW-ORM | justified | C01, C02, C03, C04, C05, C06, C10, C15 | yes |
| RMP-06 | Exit: queue on the off-ramp | HW-ORE, HW-AF | justified | C01, C07, C08, C10, C16 | yes |
| RMP-07 | Missed exit for lack of gap | HW-ORE | justified | C01, C02, C03, C04, C05, C06, C10, C16 | yes |
| RMP-08 | Exit: tight ramp curve | HW-ORE | justified | C01, C07, C08, C10, C11, C16, C18 | yes |
| RMP-09 | Vehicle crossing the gore at the last moment | HW-ORE, HW-LCC, HW-AF | justified | C01, C06, C07, C08, C10, C16 | yes |
| RMP-10 | Exit: vehicle reversing on the ramp | HW-ORE, HW-SOS | indirect | C01, C02, C03, C05, C07 | milestone 2 |
| RMP-11 | Lead vehicle takes the exit | HW-LCC, HW-AF | justified | C01, C07, C08, C10 | yes |
| RMP-12 | Convoy merging from the on-ramp | HW-LCC, HW-AF, HW-LC | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10 | yes |
| RMP-13 | SDT merges while a vehicle exits through the acceleration lane | HW-ORM | justified | C01, C02, C03, C04, C05, C06, C10, C15 | yes |
| RMP-14 | Merge: curved and graded on-ramp | HW-ORM | justified | C01, C02, C03, C04, C05, C06, C10, C11, C15 | yes |

## LC-RD · Road-imposed lane change

| ID | Scenario | Behaviors | HIRE | Criteria | Generable |
|---|---|---|---|---|---|
| LC-RD-01 | Mandatory lane change at a lane drop | HW-LC, HW-LCC | justified | C01, C02, C03, C04, C05, C06, C10 | yes |
| LC-RD-02 | Lane change in a work zone lane closure | HW-LC, HW-LCC, HW-AF | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10 | yes |
| LC-RD-03 | Lane change in a weave section | HW-LC, HW-ORM | justified | C01, C02, C03, C04, C05, C06, C10, C15 | yes |
| LC-RD-04 | Mandatory lane change for an exit | HW-LC, HW-ORE | justified | C01, C02, C03, C04, C05, C06, C10, C16 | yes |
| LC-RD-05 | Lane change to yield to merging traffic | HW-LC, HW-LCC, HW-AF | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10 | yes |
| LC-RD-06 | Lane change with degraded lane markings | HW-LC, HW-LCC, HW-AF | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10, C18 | yes |
| LC-RD-07 | Lane change on a curve or grade | HW-LC, HW-LCC, HW-AF | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10, C11, C18 | yes |
| LC-RD-08 | Lane change with map lane mismatch | HW-LC, HW-LCC | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10, C18 | yes |

## RD · Road and infrastructure

| ID | Scenario | Behaviors | HIRE | Criteria | Generable |
|---|---|---|---|---|---|
| RD-09 | Lane narrower than 3.5 m | HW-LCC, HW-AF | justified | C01, C06, C07, C08, C10, C18 | yes |
| RD-10 | Speed limit change | HW-LCC, HW-AF | justified | C01, C07, C08, C09, C10, C18 | yes |
| RD-11 | No shoulder (bridge, viaduct) | HW-SOS, HW-SIL | justified | C01, C05, C06, C10, C12, C13 | yes |
| RD-12 | Crosswind gust | HW-LCC, HW-AF, HW-LC | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10, C18 | yes |
| RD-13 | Steep downhill with heavy load | HW-LCC, HW-AF, HW-SIL, HW-SOS | justified | C01, C05, C06, C07, C08, C10, C11, C12, C13 | yes |
| RD-14 | Curve with a vehicle in the next lane | HW-LCC, HW-AF, HW-LC | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10, C11, C18 | yes |

## EMV · Emergency vehicles

| ID | Scenario | Behaviors | HIRE | Criteria | Generable |
|---|---|---|---|---|---|
| EMV-03 | Emergency vehicle in congestion | HW-AF, HW-SOS | justified | C01, C05, C06, C07, C08, C10, C12, C13 | yes |
| EMV-04 | Police vehicle following the SDT for more than 20 s | HW-SOS | indirect | C01, C05, C06, C10, C12, C13, C14 | yes |
| EMV-05 | Emergency vehicle stopped in the lane | HW-LC, HW-SIL, HW-AF | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10, C12 | yes |
| EMV-06 | Police pursuit passing the SDT | HW-LCC, HW-AF | justified | C01, C06, C07, C08, C10, C18 | yes |

## LC-OOD · Out-of-ODD events requiring a lane change

| ID | Scenario | Behaviors | HIRE | Criteria | Generable |
|---|---|---|---|---|---|
| LC-OOD-01 | Move over for a stopped EMV on the shoulder | HW-LC, HW-LCC, HW-AF | justified | C01, C02, C03, C04, C05, C06, C10, C17 | yes |
| LC-OOD-02 | Yield the lane to an approaching EMV | HW-LC, HW-LCC, HW-AF, HW-SOS | justified | C01, C02, C03, C04, C05, C06, C10, C12, C13, C14 | yes |
| LC-OOD-03 | Lane change with an object in the target lane | HW-LC | justified | C01, C02, C03, C04, C05, C06, C10 | yes |
| LC-OOD-04 | Lane change at a crash scene | HW-LC, HW-SIL, HW-AF, HW-SOS, HW-LCC | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10, C12, C13, C17 | yes |
| LC-REF-01 | Vehicle stopped on the shoulder (reference case) | HW-LC, HW-LCC, HW-AF | justified | C01, C02, C03, C04, C05, C06, C10 | yes |

## OBJ · Unexpected objects and road users

| ID | Scenario | Behaviors | HIRE | Criteria | Generable |
|---|---|---|---|---|---|
| OBJ-01 | Small drivable debris in the lane | HW-LCC, HW-AF | justified | C01, C07, C08, C10 | yes |
| OBJ-02 | Lost cargo or large debris in the lane | HW-SIL, HW-ELM, HW-LC, HW-AF, HW-SOS | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10, C12, C13 | yes |
| OBJ-03 | Broken-down vehicle overlapping from the shoulder | HW-LCC, HW-AF, HW-LC | justified | C01, C02, C03, C04, C05, C06, C07, C08, C10, C18 | yes |
| OBJ-04 | Animal on the roadway | HW-SIL, HW-ELM, HW-AF, HW-LCC | justified | C01, C06, C07, C08, C10, C12 | yes |
| OBJ-05 | Pedestrian on the highway | HW-LCC, HW-AF, HW-SIL, HW-SOS | justified | C01, C05, C06, C07, C08, C10, C12, C13 | yes |
| OBJ-06 | Object appearing suddenly near the SDT | HW-AF, HW-SIL, HW-ELM, HW-LCC | justified | C01, C06, C07, C08, C10, C12 | yes |

## AB · Abnormal behavior of other road users

| ID | Scenario | Behaviors | HIRE | Criteria | Generable |
|---|---|---|---|---|---|
| AB-01 | Wrong-way driver | HW-SIL, HW-ELM, HW-SOS | indirect | C01, C07, C12 | milestone 2 |
| AB-02 | Tailgating follower | HW-LCC, HW-AF, HW-SIL, HW-SOS | justified | C01, C05, C06, C07, C08, C10, C12, C13, C18 | yes |
| AB-03 | Vehicle driving on the shoulder | HW-LCC, HW-SOS | justified | C01, C05, C06, C07, C08, C10, C12, C13, C18 | yes |

## LC-ABT · Abort and fallback during a lane change

| ID | Scenario | Behaviors | HIRE | Criteria | Generable |
|---|---|---|---|---|---|
| LC-ABT-01 | Lane change abort and return | HW-LC | justified | C01, C02, C03, C04, C05, C06, C10 | yes |
| LC-ABT-02 | Lane change interrupted by DDT fallback | HW-LC, HW-SOS, HW-SIL | justified | C01, C02, C03, C04, C05, C06, C10, C12, C13 | yes |

## FB · Fallback and MRM (DDT fallback)

| ID | Scenario | Behaviors | HIRE | Criteria | Generable |
|---|---|---|---|---|---|
| FB-01 | System degradation, shoulder available | HW-SOS | justified | C01, C05, C06, C10, C12, C13 | yes |
| FB-02 | System degradation, no usable shoulder | HW-SIL | justified | C01, C10, C12 | yes |
| FB-03 | Shoulder occupied at the planned stop point | HW-SOS | justified | C01, C05, C06, C10, C12, C13 | yes |
| FB-04 | Stop in lane with a fast follower | HW-SIL | justified | C01, C10, C12 | yes |
| FB-05 | Emergency lateral avoidance, adjacent lane free | HW-ELM | justified | C01, C06, C10, C12 | yes |
| FB-06 | Emergency lateral avoidance, adjacent lane occupied | HW-ELM | justified | C01, C06, C10, C12 | yes |
| FB-07 | Remote stop-in-lane command (HICD) | HW-SIL, URB-SIL | justified | C01, C10, C12 | yes |
| FB-08 | Resume driving after a shoulder stop | HW-SOS | indirect | C01, C07 | milestone 2 |

## URB · Urban situations

| ID | Scenario | Behaviors | HIRE | Criteria | Generable |
|---|---|---|---|---|---|
| URB-01 | Green light, going straight | URB-SI | indirect | C01, C07 | milestone 2 |
| URB-02 | Red-light runner | URB-SI, URB-TI | indirect | C01, C07 | milestone 2 |
| URB-03 | All-way stop, ambiguous arrival order | URB-SI, URB-TI | indirect | C01, C07 | milestone 2 |
| URB-04 | Unprotected left turn with oncoming traffic | URB-TI | indirect | C01, C07 | milestone 2 |
| URB-05 | Right turn with pedestrian on the crosswalk | URB-TI, URB-CWY | indirect | C01, C07 | milestone 2 |
| URB-06 | Right turn: trailer sweeps the curb, cyclist on the right | URB-TI | indirect | C01, C07 | milestone 2 |
| URB-07 | Cross traffic at an uncontrolled intersection | URB-SI | indirect | C01, C07 | milestone 2 |
| URB-08 | Pedestrian waiting at or entering a crosswalk | URB-CWY | indirect | C01, C07 | milestone 2 |
| URB-09 | Pedestrian hidden by a parked vehicle | URB-CWY, URB-LCC | indirect | C01, C07 | milestone 2 |
| URB-10 | Cyclist in the lane | URB-LCC, URB-AF, URB-LC | justified | C01, C02, C03, C04, C05, C06, C07, C08 | yes |
| URB-11 | Vehicle pulling out of a parking space | URB-LCC, URB-AF | justified | C01, C06, C07, C08 | yes |
| URB-12 | Double-parked vehicle blocking the lane | URB-LC, URB-SIL, URB-AF | justified | C01, C02, C03, C04, C05, C06, C07, C08, C12 | yes |
| URB-13 | Bus stopping at a bus stop | URB-AF, URB-LC | justified | C01, C02, C03, C04, C05, C06, C07, C08 | yes |
| URB-14 | Emergency vehicle at an intersection | URB-SI, URB-TI, URB-SIL | indirect | C01, C07, C12 | milestone 2 |
| URB-15 | Oncoming vehicle crossing the center line | URB-LCC, URB-ELM | indirect | C01, C07 | milestone 2 |
| URB-16 | Vehicle ahead turning and slowing | URB-AF | justified | C01, C07, C08 | yes |

## HUB · Hub situations

| ID | Scenario | Behaviors | HIRE | Criteria | Generable |
|---|---|---|---|---|---|
| HUB-01 | Yard tractor crossing the path | HUB-GEN | indirect | C01, C07 | milestone 2 |
| HUB-02 | Worker on foot in the yard | HUB-GEN | indirect | C01, C12 | milestone 2 |
| HUB-03 | Reverse docking with an obstacle | HUB-GEN | indirect | C01, C07 | milestone 2 |
| HUB-04 | Misalignment at the dock | HUB-GEN | indirect | C01, C07 | milestone 2 |
| HUB-05 | Leaving the dock with cross traffic | HUB-GEN | indirect | C01, C07 | milestone 2 |
| HUB-06 | Parked trailer encroaching on the aisle | HUB-GEN | indirect | C01, C07 | milestone 2 |
| HUB-07 | Forklift crossing | HUB-GEN | indirect | C01, C12 | milestone 2 |
| HUB-08 | Queue at the exit gate | HUB-GEN | indirect | C01, C07 | milestone 2 |
| HUB-09 | Tight turn in the yard | HUB-GEN | indirect | C01, C07 | milestone 2 |
