# Behaviors

Codes of the Abstract Scenario Manager. Intent = what the SDT is asked to do when a scenario is generated for this behavior.

| Code | Behavior | Use case | Intent | Jama definition | Scenarios | Tests | Excluded | Deferred |
|---|---|---|---|---|---|---|---|---|
| HW-AF | Lane-Centered Adaptive Follow | Highway | keep_lane | TORC-SYSRQ-14122 | 54 | 52,734 | 12,102 | 26,208 |
| HW-ELM | Emergency Lateral Motion | Highway | emergency_lateral | not exported | 10 | 2,760 | 312 | 1,152 |
| HW-LC | Lane Changes / Overtaking | Highway | lane_change | TORC-SYSRQ-14123 | 39 | 61,814 | 15,678 | 30,894 |
| HW-LCC | Lane-Centered Cruise | Highway | keep_lane | TORC-SYSRQ-10155 | 47 | 45,261 | 11,927 | 23,340 |
| HW-ORE | Off-Ramp Exit | Highway | lane_change | TORC-SYSRQ-14125 | 6 | 4,420 | 396 | 1,860 |
| HW-ORM | On-Ramp Merge | Highway | lane_change | TORC-SYSRQ-14124 | 9 | 22,368 | 4,000 | 12,264 |
| HW-SIL | Emergency Stop in Lane | Highway | stop_in_lane | TORC-SYSRQ-14126 | 20 | 6,474 | 598 | 2,676 |
| HW-SOS | Controlled Stop on Shoulder | Highway | stop_on_shoulder | TORC-SYSRQ-14127 | 16 | 7,052 | 756 | 2,952 |
| URB-AF | Lane-Centered Adaptive Follow | Urban | keep_lane | not exported | 12 | 6,704 | 288 | 2,544 |
| URB-CWY | Crosswalk Yield | Urban | keep_lane | not exported | 3 | 0 | 0 | 0 |
| URB-ELM | Emergency Lateral Motion | Urban | emergency_lateral | not exported | 1 | 0 | 0 | 0 |
| URB-LC | Lane Changes / Overtaking | Urban | lane_change | not exported | 7 | 12,663 | 3,225 | 5,940 |
| URB-LCC | Lane-Centered Cruise | Urban | keep_lane | not exported | 5 | 187 | 21 | 36 |
| URB-SI | Going Straight through Protected / Unprotected Intersection | Urban | keep_lane | not exported | 5 | 0 | 0 | 0 |
| URB-SIL | Stop in Lane | Urban | stop_in_lane | not exported | 3 | 46 | 2 | 12 |
| URB-TI | Protected / Unprotected Turn at Intersection | Urban | keep_lane | not exported | 6 | 0 | 0 | 0 |
| HUB-GEN | General Hub Behavior | Hub | keep_lane | not exported | 9 | 0 | 0 | 0 |
