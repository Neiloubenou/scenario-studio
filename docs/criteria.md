# Pass / fail criteria

Selected per scenario and behavior from the SDT intent and the scene. A failed criterion takes the worst HIRE v2 rating of the hazards it protects.

| ID | Criterion | Metric | Threshold | Requirement | Protects |
|---|---|---|---|---|---|
| C01 | No collision | Longitudinal distance to every OMV | > 0 m | TORC-SYSRQ-14066 | H2, H3, H1 |
| C02 | Lead gap after lane change | Range to new lead / ego speed | ≥ 1.5 s | TORC-SYSRQ-13836 | H2 |
| C03 | Rear gap after lane change | Range to new follower / follower speed | ≥ 1.0 s | TORC-SYSRQ-13836 | H3 |
| C04 | Deceleration imposed on the lag vehicle | Peak deceleration of the target-lane follower | ≤ 3 m/s² (≤ 30 m/s), 5 m/s² (≥ 45 m/s) | TORC-SYSRQ-10649 | H3 |
| C05 | Turn signal before lateral motion | Signal lead time | ≥ 3 s | TORC-SYSRQ-10197 | H4, H1 |
| C06 | Lateral buffer to OMVs | Minimum lateral distance in the lateral consideration zone | ≥ 0.3 m | TORC-SYSRQ-14128 | H1 |
| C07 | Stay in lane | Time with any tractor point outside the lane boundaries | ≤ 2 s consecutive | TORC-SYSRQ-10154 | H1, H5 |
| C08 | Lane centering | Time outside the centering bounds | ≤ 5 s consecutive | TORC-SYSRQ-10161 | H1 |
| C09 | Legal speed limit | Speed vs posted limit | ≤ posted limit | TORC-SYSRQ-14118 | H2, H5 |
| C10 | Maximum SDT speed | Ego speed | ≤ 29.05 m/s (65 mph) | TORC-SYSRQ-14073 | H5 |
| C11 | Lateral acceleration in curves | Peak lateral acceleration | ≤ g·(e + f − 0.15·G) | TORC-SYSRQ-10172 | H5 |
| C12 | Hazard lights when stopped | Hazard lights state when v < 1 m/s on highway | active | TORC-SYSRQ-14130 | H3, H4 |
| C13 | Stop fully on the shoulder | Final position and speed | standstill, whole combination on the shoulder | TORC-SYSRQ-14127 | H1, H3 |
| C14 | Pull to shoulder for a following LEO | Time from 20 s of LEO following to stop | ≤ 70 s (90 s open point) | TORC-SYSRQ-15232 | H1, H3 |
| C15 | Merge within the merge zone | Merge completed, or merge aborted safely | before the end of the acceleration lane | TORC-SYSRQ-14124 | H1, H2 |
| C16 | Exit within the exit zone | Exit lane reached, or reroute | before the gore | TORC-SYSRQ-14125 | H1 |
| C17 | Move over or slow down for a stopped EMV | Lane vacated, or speed | ≤ limit − 20 mph | Texas Transportation Code §545.157 | H1 |
| C18 | Minimum highway speed | Ego speed when unobstructed | ≥ min(curvature, rollover, legal, traffic speed) − 10 m/s | TORC-SYSRQ-10167 | H3 |

Use across the 252 scenario × behavior links: C01 252, C02 65, C03 65, C04 64, C05 78, C06 148, C07 140, C08 112, C09 2, C10 195, C11 12, C12 47, C13 13, C14 2, C15 9, C16 5, C17 8, C18 43.

## Hazards

| ID | Hazard | Torc ID |
|---|---|---|
| H1 | Side collision | to map |
| H2 | Front collision | TORC-HAZ-31 |
| H3 | Rear-end by follower | TORC-HAZ-28 |
| H4 | Intent not communicated | to map |
| H5 | Loss of stability / control | to map |
| H6 | Access / operational | to map |
