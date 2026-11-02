# JanMitra — Dummy / Demo Data Specification

> **Document version:** 1.0  
> **Generated:** 2026-09-30

> **Rule:** Dummy complaints must use **realistic civic scenario data** — never
> "test complaint", "abc", "garbage test". For images, document whether they are
> actual publicly licensed/sample images, generated demo images, or project-owned
> images. **Never falsely represent synthetic/demo evidence as real citizen
> evidence.**

---

## 1. Citizens (Demo)
| Name | Email | Phone | Password | Role |
|------|-------|-------|----------|------|
| Aarav Sharma | aarav@janmitra.example | 9876543210 | JanMitra123 | Citizen (demo) |
| Priya Patel | priya@janmitra.example | — | — | Citizen |
| Meera Singh | meera@janmitra.example | — | — | Citizen (safety demo) |

Admin demo accounts (admin frontend LoginPage):
| Email | Password | Role |
|-------|----------|------|
| admin@janmitra.demo | Demo@1234 | SYSTEM_ADMIN |
| dept@janmitra.demo | Demo@1234 | DEPARTMENT_ADMIN |
| officer@janmitra.demo | Demo@1234 | OFFICER |

> **Inconsistency:** README lists `admin@janmitra.local` but LoginPage uses `admin@janmitra.demo`. Documented in `41_KNOWN_ISSUES.md`.

## 2. Departments (Express seed)
| Name | Code | Category mapping |
|------|------|------------------|
| Municipal Roads Department | ROADS | Pothole, Road Damage |
| Sanitation & Health | SANITATION | Garbage/Sanitation |
| Public Safety | SAFETY | Public Safety (SAFETY_HAZARD) |

## 3. Officers (Demo)
- Ramesh Kumar — Roads dept, OFFICIAL.
- (2–3 more per dept for workload testing.)

## 4. Police Stations (Safe Places) [S]
- Bhopal police stations (e.g., TT Nagar, MP Nagar) as POLICE type in `safe_places`.

## 5. Categories (seeded — actual)
| name | icon |
|------|------|
| Damaged Public Infrastructure | domain_disabled |
| Garbage / Sanitation | delete_outline |
| Other | category |
| Pothole | report_problem |
| Public Safety | security |
| Road Damage | add_road |
| Stray Animals | pets |
| Streetlight | lightbulb_outline |
| Unauthorized Construction | engineering |
| Water / Drainage | water_drop |

## 6. Complaints (Realistic Scenarios)
`seed_demo_complaints` RPC creates 15 Bhopal complaints. Example realistic data:

| # | Category | Title | Description | Severity | Location (Bhopal) |
|---|----------|-------|-------------|----------|-------------------|
| 1 | Pothole | Large pothole near MP Nagar gate 2 | "Deep pothole causing two-wheelers to skid during rain, opposite the bus stop." | HIGH | 23.2315, 77.4123 |
| 2 | Garbage/Sanitation | Garbage pile not collected for 5 days | "Household waste accumulated near the community bin in E-7 sector, foul smell and stray dogs." | MEDIUM | 23.2080, 77.4450 |
| 3 | Streetlight | Streetlight non-functional on Link Road | "Three consecutive streetlights opposite Arera Colony park are not working; unsafe at night." | MEDIUM | 23.2150, 77.4080 |
| 4 | Water/Drainage | Drainage overflow near market | "Overflowing drain flooding the approach road to the weekly market, mosquito breeding." | HIGH | 23.2400, 77.4300 |
| 5 | Road Damage | Broken road shoulder | "Crumbled asphalt on the shoulder causing vehicles to drop off near the railway crossing." | MEDIUM | 23.2250, 77.4200 |
| 6 | Pothole | Potholes on service lane | "Cluster of potholes on the service lane parallel to the main road, damaging vehicles." | HIGH | 23.2180, 77.4150 |
| 7 | Stray Animals | Aggressive stray dogs | "Pack of stray dogs near the school gate, chasing children in the morning." | HIGH | 23.2120, 77.4350 |
| 8 | Unauthorized Construction | Encroachment on footpath | "Shop extension blocking the footpath forcing pedestrians onto the road." | MEDIUM | 23.2280, 77.4180 |
| 9 | Public Safety | Exposed electrical wire | "Low-hanging live wire near the transformer, risk of electrocution during rain." | CRITICAL | 23.2350, 77.4250 |
| 10 | Damaged Public Infrastructure | Broken bus shelter | "Shattered glass panels of the bus shelter near the college, injury risk." | MEDIUM | 23.2050, 77.4400 |
| 11–15 | (varied) | realistic titles/descriptions | | | Bhopal coords |

## 7. Evidence Images
- **Type:** Document whether images are:
  - Actual publicly licensed/sample images (e.g., Wikimedia Commons, Unsplash with civic-relevant photos).
  - Generated demo images (synthetic).
  - Project-owned images.
- **Never** present synthetic/demo evidence as real citizen evidence.
- Seed demo images should be clearly labeled as demo in metadata or filename prefix `demo_`.

## 8. AI Results (Demo)
- `complaint_ai_verification` rows: mix of PASS/REVIEW/FAIL across demo complaints for testing the AI Review Queue.

## 9. Assignments (Demo)
- `complaint_assignments` linking demo complaints to demo officers/departments.

## 10. Notifications (Demo)
- Trigger-generated notifications for each status transition on demo complaints.

## 11. SLA States (Demo)
- Mix of on_track, due_soon, at_risk, breached, escalated, resolved across demo complaints (via `advance_demo_complaints` RPC stepping through the workflow).

## 12. Gamification (Demo)
- Demo citizen Aarav: points (e.g., 250), level 2 (Active Citizen), badges (First Report, Civic Watcher).
- Leaderboard with 10–20 demo citizens at varying points.

## 13. Safety Alerts (Demo)
- 1–2 active SOS alerts with location + trusted contacts for testing the Safety Alerts page + buzzer.

## 14. Demo Mode Control
- `is_demo_mode` / `toggle_demo_mode` RPCs (admin Settings).
- `seed_demo_complaints` (15 Bhopal complaints).
- `advance_demo_complaints` (advance workflow step).
- `useDemoModeRunner` hook (admin) auto-advances demo workflow.
