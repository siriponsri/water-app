# ANF3 Cabinet Audit — Building × Workflow Evidence and Owner Decisions

**Audit date:** 2026-09-02  
**Status:** Owner-confirmed source of truth for cabinet information architecture  
**Scope:** Non-game record cabinet, workflow routing, and SVG asset package

---

## 1. Why the previous package was insufficient

The first handoff correctly changed the home concept from an abstract desk to a building-colored cabinet, but it underrepresented real work. It visually implied approximately one binder or one domain per building, while the physical cabinet and workbook evidence show that each building contains several distinct workflows.

The corrected hierarchy is:

`Building / Location → Workflow binder → Record list → Record detail / template route`

It is not:

- one building = one binder;
- one color = one workflow;
- one global CV binder detached from building;
- one hardcoded Three.js object per currently known route.

---

## 2. Evidence inspected

### Physical binder photographs

- Blue binders, Building 10: `PRW & PW`, `AIR SAMPLING`, `CA`.
- Violet binders, Building 12: `PRW & PW`, `AIR SAMPLING`, `CA`.
- Mint binders, Building 16: `CA & NITROGEN`, `AIR SAMPLING`, `WFI`, `PRW & PW`.
- Pink binders have no approved production workflow labels; owner confirms they are reserve binders shown as `Coming Soon`.

### Application and schema evidence

- React workflows: `pw-prw`, `wfi-pus`, `compressed-air`, `em-air`, `cv`.
- Air records contain Buildings 10, 11, 12, and 16.
- CA data contains Buildings 10, 11, 12, and 16; Nitrogen is evidenced at Building 16.
- PW/PRW records contain Buildings 10, 11, 12, 16, and 19; Building 19 is PRW evidence.
- WFI records are evidenced at Building 16.
- CV source contains Buildings 10, 12, and 16.
- CV methods include Contact Plate, Rinse-PW, and Rinse-WFI with Pour Plate and Membrane Filtration test methods.

### Owner confirmations, 2026-09-02

1. Blue = Building 10.
2. Violet = Building 12.
3. Mint = Building 16.
4. Orange = Other Buildings / Other Locations.
5. Pink = reserve visual only with text `Coming Soon`.
6. Building 11 and Building 19 are grouped under Orange `Other Locations`.
7. One Cleaning Validation binder is shown per building; method selection occurs inside the binder.
8. Template routing:
   - Contact Plate → CV template.
   - Rinse + Pour Plate → CV-owned Rinse-PW/PRW adapter over `pw-prw-template.docx`.
   - Rinse + Membrane Filtration → CV-owned Rinse-WFI/PUS adapter over `wfi-pus-template.docx`.
9. CV Rinse route keys, adapters, and audit metadata remain separate from Water; the approved Water template file identity is intentionally shared.

These owner confirmations supersede all earlier provisional wording about the pink reserve and CV Rinse document generation.

---

## 3. Corrected production cabinet matrix

| Cabinet group | Color | Binder | Evidence/status | Destination |
|---|---|---|---|---|
| Building 10 | Blue | PRW & PW | Physical + data | `pw-prw`, building B10 |
| Building 10 | Blue | Air Sampling | Physical + data | `em-air`, building B10 |
| Building 10 | Blue | CA | Physical + data | `compressed-air`, building B10 |
| Building 10 | Blue | Cleaning Validation | CV data + owner decision | `cv`, building B10 |
| Building 12 | Violet | PRW & PW | Physical + data | `pw-prw`, building B12 |
| Building 12 | Violet | Air Sampling | Physical + data | `em-air`, building B12 |
| Building 12 | Violet | CA | Physical + data | `compressed-air`, building B12 |
| Building 12 | Violet | Cleaning Validation | CV data + owner decision | `cv`, building B12 |
| Building 16 | Mint | PRW & PW | Physical + data | `pw-prw`, building B16 |
| Building 16 | Mint | WFI | Physical + data | `wfi-pus`, building B16 |
| Building 16 | Mint | Air Sampling | Physical + data | `em-air`, building B16 |
| Building 16 | Mint | CA & Nitrogen | Physical + data | `compressed-air`, building B16 with gas filter/all |
| Building 16 | Mint | Cleaning Validation | CV data + owner decision | `cv`, building B16 |
| Other Locations | Orange | Building 11 · Air Sampling | Data evidence | `em-air`, building B11/Other store |
| Other Locations | Orange | Building 11 · CA | Data evidence | `compressed-air`, building B11/Other store |
| Other Locations | Orange | Building 19 · PRW | Data evidence | `pw-prw`, building B19/Other store |
| Reserve | Pink | Coming Soon | Owner decision | Disabled; no record route |

### Important Other Locations rule

`Other Locations` is a UI group, not a license to discard exact building identity. The system must preserve `Building 11` and `Building 19` as distinct filter/data values even though both currently share unsegmented worksheet numbering and `_OT` storage routing.

---

## 4. Cleaning Validation routing matrix

The cabinet shows one CV binder per Building 10/12/16. Opening it starts a controlled selection flow:

| Step | Choice | Next step / template |
|---|---|---|
| 1 | Contact Plate | Use CV template |
| 1 | Rinse | Require Test Method selection |
| 2 | Pour Plate | Use CV Rinse-PW/PRW adapter over `pw-prw-template.docx` |
| 2 | Membrane Filtration | Use CV Rinse-WFI/PUS adapter over `wfi-pus-template.docx` |

No implicit method guessing is allowed. If the record already has a normalized test method, preselect it but still display the route before generation. If it is missing/ambiguous, disable generation and require user selection. The selected route must be logged in the local document-generation request metadata without changing the controlled source record silently.

---

## 5. Gaps and non-cabinet data

The workbooks contain supporting/legacy concepts that do not automatically become home binders:

- RO water;
- Building 11/19 historical or low-volume data;
- special Water prefixes `PQ-OLD`, `PQ-OCL`, `RA6`, `WP-PQ`;
- CA risk/OSD studies and hidden reference tabs;
- tools, inventory, calendar, document code, stock links;
- CV/CEHT distinctions requiring record metadata rather than speculative new binders.

These remain searchable/accessible through their approved workflow or support area. Luna must not create additional production binders solely because a workbook tab or isolated value exists. New binder activation is configuration-driven and owner-approved.

---

## 6. Scale-up findings

The current cabinet must not hardcode 16 individual destination positions into business logic. It needs:

- a building registry;
- a workflow registry;
- an availability matrix;
- a template-routing registry;
- a layout engine that paginates/scrolls shelves when capacity is exceeded;
- disabled reserve slots that do not create fake routes;
- an Other Locations subgroup retaining exact building identity;
- one shared semantic model for Cabinet, List, Search, API filters, and SVG/Three.js rendering.

Adding a future building should require configuration + approved color/asset + tests, not a rewrite of `FoyerScene.tsx`.

---

## 7. Audit conclusion

The corrected design must expose exactly 16 currently approved active binder destinations plus one pink `Coming Soon` reserve representation. A single visual binder may open a second-level location selector where the matrix requires it, but every destination above must remain reachable and unambiguous. Keep the screen readable through shelf grouping, controlled density, responsive alternatives, and configuration-driven layout.

The cabinet is navigation. The operational workspace remains 2D and reuses the strong parts of the existing application.
