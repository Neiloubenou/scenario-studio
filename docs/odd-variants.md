# ODD variants

Drawn from the L1-L5 ODD report of I-35 South (crawl_i_35_rest_south, crawl_i_35_south). One condition changes at a time from the nominal case. Exposure is the share of route miles (road) or hours (weather) where the condition holds.

| ID | Variant | ODD element | Exposure | Status | Road values set |
|---|---|---|---|---|---|
| V00 | Nominal | baseline | 68.3 % | simulated | none |
| V01 | Narrow lane 3.35 m | Lane Width (TORC-ODD-76) | 3.74 % | simulated | laneWidthM=3.35 |
| V02 | Wide lane 3.9 m | Lane Width (TORC-ODD-76) | 10.6 % | simulated | laneWidthM=3.9 |
| V03 | Gentle curve R≈830 m | Curvature (TORC-ODD-360) | 0.92 % | simulated | curvature=0.0012 |
| V04 | Curve at ODD limit R≈455 m | Curvature (TORC-ODD-360) | 0.3 % | simulated | curvature=0.0022 |
| V05 | Downhill −3.5 % | Slope (TORC-ODD-79) | 1.72 % | simulated | grade=-3.5 |
| V06 | Uphill +3.5 % | Slope (TORC-ODD-79) | 1.97 % | simulated | grade=3.5 |
| V07 | Fresh breeze gusts 10 m/s | Wind (TORC-FLD-1559) | 1.36 % | simulated | windGustMps=10 |
| V08 | Light rain | Rain (TORC-ODD-27) | 10.81 % | deferred (perception, milestone 2) | none |
| V09 | Heavy rain | Rain (TORC-ODD-27) | 0.24 % | deferred (perception, milestone 2) | none |
| V10 | Low sun glare | Sun Angle (TORC-ODD-36) | n/a | deferred (perception, milestone 2) | none |

Lane count share on the route: 1 lanes 3.72 %, 2 lanes 49.7 %, 3 lanes 39.06 %, 4 lanes 7.52 %.
