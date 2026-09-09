# ANF3 Digital Record Cabinet — SVG Package v2

This is the project-original, ready-to-use vector package governed by `manifest.json`. It contains 39 SVG assets and no external runtime dependency.

## Production semantics

| Binder | Meaning | Active behavior |
|---|---|---|
| `binder-blue-b10.svg` | Building 10 | Workflow routes for B10 |
| `binder-violet-b12.svg` | Building 12 | Workflow routes for B12 |
| `binder-mint-b16.svg` | Building 16 | Workflow routes for B16 |
| `binder-orange-other.svg` | Other Locations | Each control still carries exact B11 or B19 filter |
| `binder-pink-coming-soon.svg` | Reserve | Disabled, text `Coming Soon`, no route/API/count |

`binder-neutral-template.svg` is a future-configuration geometry reference and is not production-enabled.

The active matrix is `4 + 4 + 5 + 3 = 16` destinations. `cabinet-composition-audited.svg` is the Gate C visual cross-check; `docs/CABINET_WORKFLOW_MATRIX.md` remains the business source of truth.

## Asset families

- Binders: five approved semantics plus one neutral future template.
- Cabinet: compact legacy-compatible shells, recommended four-group modular shells, reusable light/dark shelf modules.
- Workflow icons: PRW/PW, WFI, Air Sampling, Compressed Air, Nitrogen, Cleaning Validation.
- CV method icons: Contact Plate, Rinse, Pour Plate, Membrane Filtration.
- System/UI icons: cabinet, binder, building, records, search, print, sync, offline, Other Locations, Coming Soon, controlled template route, exact building filter, service health.
- References: audited desktop composition, mobile density, scale-up flow, and CV method selector/template isolation.

## Required implementation rules

1. Read and validate `manifest.json` before importing assets.
2. Generate production binder controls from typed Building/Workflow/Binder registries, never from hand-positioned business logic.
3. Keep workflow, exact building, record count, freshness, status, focus, and actions in semantic React/HTML. Static text inside `type: reference` assets is documentation only.
4. Use the SVG binders directly for CSS/no-WebGL/mobile or translate their proportions/materials into restrained Three.js geometry.
5. Every active visual binder has a DOM link/button and equivalent List destination. Canvas or a flat SVG image map cannot be the only interaction layer.
6. Other Locations must not erase identity: B11 and B19 remain separate filters/labels although backend storage may be `_OT`.
7. Pink is disabled reserve only. Never attach an active route, count, click handler, or invented workflow.
8. CV document routing follows `docs/CV_TEMPLATE_ROUTING_CONTRACT.md`; SVG icons communicate the choice but never select a filesystem template.
9. New assets require a unique manifest ID, file, type, viewBox, semantic, theme and production/approval state.

## Technical quality

- Preserve responsive `viewBox`, standalone XML and title/description metadata.
- No external URL/script/image, base64 raster, production data, stock art or watermark.
- Inline icons or convert them into React components so stroke can follow theme; when used as `<img>`, provide accessible adjacent text.
- Test transparent/light/dark rendering, 1×/2× raster smoke, 320/375/768/1440 layouts, reduced motion and no-WebGL.
- Optimization is permitted only when `title`, `desc`, `viewBox`, visual output and accessibility survive.

## CV template separation reminder

`icon-pour-plate.svg` and `icon-membrane-filtration.svg` represent CV choices when displayed in the CV selector. The selected method resolves through a CV-owned route key and adapter to the owner-approved `pw-prw-template.docx` or `wfi-pus-template.docx` family. This shared template identity is intentional; the CV route metadata remains separate from Water.
