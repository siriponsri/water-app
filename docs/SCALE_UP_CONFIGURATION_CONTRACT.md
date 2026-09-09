# Scale-up Configuration Contract

## Goal

Allow ANF3 to add buildings, workflows, binder instances, subtypes, and template routes without redesigning the application shell or duplicating business rules.

## 1. Registries

Maintain one typed source for:

- `buildings`
- `workflows`
- `binderInstances`
- `subtypeFilters`
- `templateRoutes`
- `assetRegistry`
- `featureCapabilities`

Cabinet, List, Search, route generation, API query construction, accessibility labels, analytics counts, and tests derive from these registries.

## 2. Add-building procedure

Adding a building requires:

1. Owner-approved ID, label, exact source values, storage/numbering class, color semantics, and visibility.
2. Asset or approved reuse rule in SVG manifest.
3. Workflow availability entries.
4. API filter allowlist update.
5. Storage/numbering decision; do not assume a new segmented number.
6. Test fixtures and route/a11y/visual tests.
7. Owner approval before production activation.

No new building may be inferred only from a free-text record value.

## 3. Add-workflow procedure

Requires workflow ID, domain, display names, icon, record API contract, PDF capability/template route, allowed buildings, and tests. A disabled `Coming Soon` reserve may preview capacity but must not masquerade as an implemented workflow.

## 4. Layout algorithm

- Sort groups and binders by configuration order.
- Calculate safe binder capacity from viewport and minimum label width.
- Do not scale below minimum readable spine width.
- Overflow becomes controlled pages or shelf scroll with previous/next controls and position announcement.
- Preserve current group/page when returning from records.
- Mobile uses grouped list/CSS binder cards derived from the same instances.

## 5. Other Locations

Orange is a group color. Each binder retains exact `buildingFilter` such as Building 11 or Building 19. Future other buildings can be added here until the owner promotes them to a dedicated color/shelf.

Storage `_OT` and unsegmented numbering are current backend behavior, not the visible building identity. Do not replace exact building text with `Other` in record data.

## 6. Capability flags

Each binder/workflow may declare:

- search
- fresh get
- PDF preview
- print
- download
- save to Desktop
- subtype selector
- template router
- cached read

UI actions are generated from capabilities and backend health, not hidden through ad hoc conditionals.

## 7. Configuration validation

Build/test must reject:

- duplicate building/workflow/binder IDs;
- active binder without route/workflow;
- route to unknown workflow;
- asset missing from manifest;
- pink reserve marked active;
- duplicate color meaning conflict;
- CV route without valid template map;
- Other binder without exact building filter;
- workflow enabled where source/API cannot support it.
- CV Rinse route key and adapter must remain distinct from Water; resolving to the owner-approved shared `pw-prw-template.docx` or `wfi-pus-template.docx` file family is intentional.

## 8. Versioning

Configuration has a schema version and a visible implementation version in diagnostics. Breaking changes require migration and cache-version review. Read caches include configuration/schema version to prevent stale routing after updates.
