# ANF3 Laboratory Records — Digital Record Cabinet Design Specification

**Design authority:** Applies to the non-game application only.  
**Design thesis:** A calm, tactile, professional laboratory record cabinet that mirrors the physical filing model without turning operational work into a game.  
**Asset source:** `design-assets/manifest.json`.

---

## 1. Design outcome

The product should feel recognizable to an ANF3 laboratory user within five seconds:

- It is a record system, not a generic SaaS dashboard.
- Buildings/locations are recognized by binder color.
- Workflows are recognized by binder spine labels.
- Selecting a binder is a clear navigation action.
- Once inside a binder, the UI becomes a fast, restrained 2D document workspace.

The cabinet metaphor stops at navigation and orientation. Record search, filtering, details, tables, PDF preview, calendar, tools, and error handling remain semantic 2D interfaces.

---

## 2. Locked semantic model

### 2.1 Color

Binder color communicates only building/location.

| Token | Main | Soft | Approved semantic |
|---|---:|---:|---|
| `--binder-b10` | `#68B9E8` | `#E8F5FC` | Building 10 |
| `--binder-b12` | `#B087DC` | `#F2EAF9` | Building 12 |
| `--binder-b16` | `#63D3AB` | `#E7F8F2` | Building 16 |
| `--binder-other` | `#F2A65A` | `#FFF0DE` | Other Locations: Building 11 and 19 |
| `--binder-reserve` | `#ED8FA3` | `#FCECEF` | Disabled reserve: `Coming Soon` |

Do not use these four main colors for success/warning/error status. Status uses a separate restrained palette and always includes text/icon.

### 2.2 Text hierarchy on a binder

Every binder control renders dynamic semantic HTML, not text baked into SVG:

1. Workflow, e.g. `PRW & PW` — largest and strongest.
2. Building, e.g. `Building 10` — secondary.
3. Record count or freshness — compact metadata.
4. Optional status label — only when actionable.

Accessible name example: `Open PRW and PW records, Building 10, 142 records`.

### 2.3 Shelf organization

Recommended default:

- One shelf/group per confirmed building/location, with pagination or scrolling when the visual capacity is exceeded.
- Binders on a shelf are workflows available for that building.
- Do not show an empty fake binder for an unavailable workflow.
- `Other Locations` uses orange and is split into Other-Water, Other-Air, Other-CA, and Other-CV binders. The displayed record retains exact Building 11, Building 19, or unknown source text where supplied.
- Pink is a disabled reserve representation labeled `Coming Soon`; it has no count, record API, or route.

The full source of truth is `docs/CABINET_WORKFLOW_MATRIX.md`: 4 destinations for B10, 4 for B12, 5 for B16, and 4 for Other Locations = 17 active destinations. Never infer a new binder from a color, workbook tab, or unsupported combination.

The architecture must support configuration-driven shelf/binder data rather than hardcoded scene geometry for each workflow.

---

## 3. SVG asset package contract

The supplied package is mandatory input, not a suggestion:

- `design-assets/manifest.json` — machine-readable authority.
- `binder-blue-b10.svg`
- `binder-violet-b12.svg`
- `binder-mint-b16.svg`
- `binder-orange-other.svg`
- `binder-pink-coming-soon.svg`
- `cabinet-shell-light.svg`
- `cabinet-shell-dark.svg`
- `cabinet-composition-audited.svg`
- `cabinet-mobile-reference.svg`
- workflow and CV method icons listed in the manifest
- custom ANF3 icons listed in the manifest.

### How Luna must use the assets

- Use cabinet and binder SVGs directly for CSS/no-WebGL/mobile fallbacks, or faithfully translate their proportions/material language into Three.js geometry.
- Use `cabinet-composition-audited.svg` to establish Gate C composition and verify destination density.
- Keep workflow/building/count/status as HTML overlays so they remain searchable, readable, localizable, and accessible.
- For icons, prefer inline SVG/React components so theme color can be controlled. Do not duplicate them with an inconsistent icon style.
- If an additional visual is required and no suitable asset exists, create an original SVG and register it in `manifest.json` before use.
- Do not add stock imagery, watermarks, remote image URLs, external SVG scripts, embedded base64 raster blobs, or generative filler.
- Pink may appear only as the disabled `Coming Soon` reserve defined in the manifest.

### SVG quality gate

Every asset must:

- parse as valid XML;
- retain a responsive `viewBox`;
- have no external resource request;
- avoid embedded production data;
- render correctly on a transparent or declared background;
- have a role recorded in the manifest;
- keep titles/descriptions when used as a standalone informative image;
- be optimized only if visual and accessibility output remain unchanged.

---

## 4. Page architecture

### 4.1 Global shell

Use one compact utility header. It contains:

- ANF3 product mark/name;
- breadcrumb/current location;
- global record search;
- health indicator opening a detailed status popover;
- `Cabinet | List` view toggle on home;
- theme control;
- one overflow menu for lower-frequency tools at constrained widths.

Do not add a sidebar, persistent bottom navigation, duplicate mobile nav, command-palette decoration, or oversized hero.

### 4.2 Home — Cabinet view

Desktop composition:

- Fixed front or very shallow three-quarter camera.
- Cabinet is centered and uses most of the productive viewport without hiding the header.
- Four active groups have stable positions and labels: Building 10, Building 12, Building 16, and Other Locations; Reserve is visually subordinate.
- Binders sit on the shelf baseline with small controlled variation only; no random layout.
- Binder spines are readable at rest.
- A small supporting rail/panel may show recent records, pending owner-approved work, or today’s sampling, but must not compete with the cabinet.

Cabinet control behavior:

- Hover/focus: translate forward 10–14 px equivalent, increase local shadow, reveal no essential hidden text.
- Pressed: 1–2 px inward response.
- Activate: brief 180–260 ms pull-forward/open cue, then route.
- Keyboard Enter/Space works.
- Touch opens on first tap.
- No free camera orbit, zoom, pan, drag-reorder, or physics.

The cabinet is not a flattened image map. Each binder is a real semantic button/link backed by configuration data.

### 4.3 Home — List view

List view provides identical destinations and data:

- group rows by building;
- show a vertical color accent plus building text;
- show workflow, count, freshness, and route;
- support keyboard and screen readers;
- remember view preference locally without storing production data.

List view is the accessibility and speed peer, not a degraded fallback.

### 4.4 Tablet and mobile

At 768 px:

- Prefer CSS 2.5D or a simplified fixed scene.
- Preserve shelf grouping and readable binder labels.
- Do not squeeze a wide desktop cabinet or require horizontal page scrolling.

At 375/320 px:

- Use CSS binder rows or a controlled horizontal binder strip inside each building section.
- Display workflow and building text outside/alongside the decorative SVG.
- Touch targets are at least 44×44 px.
- No hover-only information.
- Do not load Three.js by default.

### 4.5 Record workspace

Desktop:

- Left region: filters and results.
- Right region: current record metadata, freshness, actions, samples, PDF.
- Stable split sizing; list and detail scroll independently where appropriate.
- Worksheet numbers use mono typography.
- High-value fields appear first; raw arbitrary key/value dumping is not acceptable as the final UX.

Mobile:

- List → dedicated detail route.
- Back behavior preserves query/filter/scroll.
- Actions use a compact sticky action area only when it does not cover content.
- PDF can open in a dedicated view if embedded browser support is poor.

### 4.6 Tools and calendar

Use a quiet utility directory, not a colorful card wall. Existing external links remain clearly labeled external destinations. Calendar embeds must have a usable loading/error state and must not dominate home.

Games links/routes remain exactly as baseline; no design work here.

---

## 5. Typography

Retain self-hosted fonts already proven in the repository:

- Bai Jamjuree 600: restrained display/page headings.
- IBM Plex Sans Thai 400/500/600: Thai/Latin interface and body.
- IBM Plex Mono 500: worksheet numbers, dates, codes, compact technical metadata.

Rules:

- No remote font request.
- Thai line height 1.45–1.65 depending on size.
- Body minimum 16 px on mobile; compact metadata may be 12–13 px with sufficient contrast.
- Avoid uppercase for long Thai/English labels.
- No negative letter spacing.
- Binder workflow labels must pass actual-fit tests for the longest approved names.

---

## 6. Core tokens

Use a restrained 4 px spacing base.

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --radius-control: 4px;
  --radius-panel: 6px;
  --binder-b10: #68B9E8;
  --binder-b10-soft: #E8F5FC;
  --binder-b12: #B087DC;
  --binder-b12-soft: #F2EAF9;
  --binder-b16: #63D3AB;
  --binder-b16-soft: #E7F8F2;
  --binder-other: #F2A65A;
  --binder-other-soft: #FFF0DE;
  --binder-reserve: #ED8FA3;
  --binder-reserve-soft: #FCECEF;
}
```

Define complete light/dark semantic surface, text, border, focus, success, warning, error, and disabled tokens in code. Do not overload binder colors.

---

## 7. Motion and Three.js

### 7.1 Motion principles

- Motion explains selection, depth, loading, or state change.
- Default duration 150–260 ms; scene entry may use up to 420 ms.
- Use transform/opacity where possible.
- Avoid continuous floating, cursor-following, random wobble, particles, dramatic parallax, and decorative loops.

### 7.2 Reduced motion

When `prefers-reduced-motion: reduce`:

- render binders in final positions immediately;
- remove pull/tilt transitions;
- keep focus/selected states through border/color/text;
- provide all routes and information;
- do not initialize a heavy scene solely for decoration.

### 7.3 Three.js budget

- Lazy-load after the semantic shell.
- Fixed camera.
- Minimal lighting and materials; no expensive postprocessing.
- Geometry/material references come from supplied SVGs.
- Dispose geometries/materials/listeners correctly.
- Pause rendering when not visible if the scene is event-driven.
- A canvas must never be the only DOM target for binder navigation.

---

## 8. Component specifications

### Binder control

States: default, hover, focus-visible, pressed, selected, loading, disabled, unavailable.

- Default: readable label and building.
- Hover/focus: forward depth; focus ring remains outside the object silhouette.
- Selected/loading: preserve label; show small progress/status text outside the binder.
- Disabled/unavailable: do not use low-opacity alone; explain why.

### Search

- One recognizable search field; no command-palette theater.
- Debounced requests, clear button, visible active filters.
- Results announce count changes to assistive technology.
- Empty state distinguishes no match from unavailable service.

### Health indicator

Summary label must be honest: `All services ready`, `Read-only cache`, or `Service issue`.

Expanded state lists:

- Local app/Flask
- Air System DB
- Water System DB
- CV System DB
- Last successful fetch time

Do not collapse all health into `navigator.onLine`.

### Record result

Show worksheet number, workflow, building, sampling date, product/location where available, and freshness. Avoid rendering database field names as the primary UI.

### PDF actions

Preview, Print, Download, Save to Desktop are distinct. Disabled actions have a visible explanation. CV Rinse opens a required method selector: Pour Plate resolves through the CV-owned Rinse-PW/PRW adapter to `pw-prw-template.docx`; Membrane Filtration resolves through the CV-owned Rinse-WFI/PUS adapter to `wfi-pus-template.docx`. Missing/unknown method blocks generation. The route metadata stays CV-owned while the approved template family is shared with Water.

---

## 9. Empty, loading, error, and offline states

Create purposeful states, using supplied SVG icons where appropriate:

- Cabinet has no configured binder: configuration message, not fake content.
- Search no matches: suggest clearing filters.
- Domain unavailable: show cached read-only results when present and retry.
- Local PDF service unavailable: record detail stays readable; PDF actions disabled.
- Offline: cached read-only label with last successful time.
- WebGL unavailable: automatically use complete SVG/CSS cabinet or List view.

No dead spinner longer than the request timeout. Every error must offer a safe next action.

---

## 10. Accessibility acceptance

- All routes usable without pointer.
- Logical heading/landmark structure.
- Focus order follows visual order.
- Focus never disappears behind canvas or sticky UI.
- Modal focus trap/restore tested.
- Minimum 4.5:1 normal-text contrast; graphical/control boundaries at least 3:1 where required.
- Binder color always repeated in text.
- Screen reader has a list-equivalent model even when visual 3D is active.
- Zoom to 200% works without loss of content/function.
- Thai labels are human-readable and not fragmented into excessive Thai-English jargon.

---

## 11. Anti-slop prohibitions

Do not use:

- gradients as a generic page decoration (subtle material shading inside supplied SVG/3D objects is allowed);
- glass cards or blurred translucent dashboards;
- neon/cyber/space-tech styling;
- repeated rounded cards for every section;
- generic AI sparkles, floating orbs, random isometric objects;
- emoji icons;
- placeholder illustrations;
- fake charts or metrics;
- excessive badges/pills;
- tooltips containing essential information;
- labels visible only on hover;
- a 3D room users must navigate.

---

## 12. Visual validation matrix

Capture and inspect:

| View | Width | Modes/states |
|---|---:|---|
| Home cabinet | 1440 | light, dark, focus, hover |
| Home cabinet/list | 1024 | light |
| Home simplified | 768 | light, dark |
| Home mobile | 375 and 320 | light, long labels, touch |
| Record workspace | 1440 and 375 | result selected, no result |
| Service degraded | 1440 and 375 | cached read-only |
| No WebGL | 1440 | SVG/CSS parity |
| Reduced motion | 1440 | static parity |

Reject screenshots with clipped Thai marks, unreadable spines, hidden actions, horizontal overflow, inconsistent icon strokes, missing focus, or cabinet objects that appear clickable but are not.

---

# v7.1 — The records room

## Why the interface changed

The v7.0 workspace was a sage-and-grey React shell with a small 3D "foyer" of
abstract folders. Two problems: it was hard to read (low-contrast neutrals, a
display face doing body work), and it was generic — nothing in it said *ANF3*
rather than "some records app". The rebuild fixes both by taking the design
from the artefact the software stands for.

## The artefact

The ANF3 records are A4 lever-arch box files on a white melamine shelf. Each
spine is printed in four bands:

1. a coloured band carrying the short code — `PRW & PW`, `AIR SAMPLING`, `CA`,
   `CA & NITROGEN`, `WFI`;
2. a white card carrying the Thai title over its English subtitle;
3. a coloured band carrying the building and `ANF3`;
4. bare coloured board, with a chrome finger ring.

The board colour is the building: Building 10 pale blue, Building 12 lilac with
a plum band, Building 16 mint with a sage band, Other Locations amber, Reserve
pink and unlabelled. Those are the colours in `tokens.css`, sampled from
photographs — not a palette invented to look pharmaceutical.

## The system

- **Macrostructure: Index-First.** The page is a finding aid. The shelf is how
  you handle what the index points at, never the only way in.
- **Nav: N3 side-rail**, typographic, no icon tiles, collapsing to a strip
  under `60rem`. **Footer: Ft4 dense colophon**, stating the data boundaries
  and the training boundary in one mono paragraph.
- **Type — three faces, three jobs.** Newsreader titles; IBM Plex Sans Thai
  reads and carries Thai record content; IBM Plex Mono carries exactly one
  role, machine data.
- **Colour.** Warm oat paper, near-black ink, one oxide-red accent that only
  marks state. Building hues are structural — a hue means a building, and it
  appears on spines, index codes and row markers only.
- **Depth is weight and rule, not shadow.** One whisper shadow on the record
  sheet; one lift shadow on the palette. Corners stay at 2–3 px.

## Motion

Three moments, and nothing else:

1. the binder coming off the shelf onto the bench;
2. the state stamp pressing onto a record that came back fresh from the
   System DB;
3. the shelf chip stepping forward when its building is selected.

All on `--ease-out`, all `transform`/`opacity` only, all with a reduced-motion
fallback. Focus rings appear instantly and are never transitioned.

## Accessibility position

The canvas is `aria-hidden`. Every drawer, binder, lamp and tray it draws also
exists as a real, focusable control in the index beside it, and the two share
one piece of state, so hovering either highlights both. When WebGL is absent,
the viewport is under 760 px, or the visitor has asked for reduced motion, the
flat CSS cabinet renders instead and nothing is lost.

## Standard applied

The visual layer was rebuilt against the Hallmark anti-AI-slop rule set
(`github.com/Nutlope/hallmark`): macrostructure and nav/footer archetypes
picked deliberately, the 58-gate slop test run against the output, and the
picks recorded in `.hallmark/log.json` and in the stamp at the top of
`apps/web/src/tokens.css`. The gates that changed the most here were the
eyebrow ban, the side-stripe card ban, the AI-nav fingerprint, pure `#fff`,
token discipline, and "3D must be manipulable or it does not earn its bundle".


---

# v7.1a — The workbench pass

The first v7.1 home screen was airy: a display headline, two floating panels,
and a quarter of the viewport left empty. That is a marketing shape applied to
an operational tool, and it read as generated. This pass sets the dials the way
the product actually wants them — **operational, density 8, motion 2** — and
rebuilds the home screen around them.

## What changed

- **No hero.** The display headline is gone. The screen opens on a 52 px
  toolbar: the name, a building tab strip, and the count. `--text-display` was
  cut from 3.5 rem to 2.125 rem across the whole app.
- **The screen fills the viewport.** `100dvh`, three rows (toolbar, body,
  status line), and the two body panels scroll independently. The page itself
  never scrolls, so there is no dead space to leave at the bottom.
- **The accordion became a tab strip.** Buildings are picked in the toolbar,
  which mirrors the shelf-edge labels in the scene and removes a whole level of
  nesting from the index.
- **One focal point.** The shelf is the largest, most contrasted thing on the
  screen; the index is a supporting list of hairline rows; the status line is
  the quietest thing on it.

## The render

The scene looked like untextured plastic because it was: `meshStandardMaterial`
with `metalness` and nothing to reflect renders flat, and every surface was a
single flat colour. Fixed with:

- **Image-based lighting** from `RoomEnvironment` through a `PMREMGenerator`.
  It ships inside three, so it costs no download, and it is what makes the
  chrome finger ring read as chrome.
- **ACES filmic tone mapping** with the exposure tuned per theme, and
  `PCFSoftShadowMap`.
- **Procedural grain** generated on a canvas and used as a roughness and bump
  map on the board, the melamine and the bench — the difference between a
  photograph of a shelf and a vector drawing of one.
- **A camera that fits.** `FitCamera` computes the distance from the panel's
  actual aspect ratio and anchors the bottom of the frame to the bench edge, so
  the shelf is framed correctly whether the panel is a tall column on a laptop
  or a short band on a stacked phone layout.
- The bench lamp and in-tray were **cut**. At this framing they were always
  half-objects at the edge, and the theme toggle and the in-tray already exist
  as real controls in the DOM.

## The binder is the interaction

The binder is now modelled as a real lever-arch file — spine, back board, and a
front board hinged on the spine — rather than one box, so it can do three
things:

| State | Behaviour |
|---|---|
| At rest | standing in the row, the last one leaning |
| Fingered (hover / focus / arrow keys) | tips out on the ring, pivoting about its bottom front edge — and **its neighbours lean away to make room** |
| Opened (click / Enter) | pulls clear of the row, turns to face the reader, and the front board swings back on the spine before the route changes |

Hovering a row in the index fingers the binder in the scene, and hovering the
binder highlights the row: one piece of state, two views of it. `←` and `→`
walk the shelf, `Enter` opens what you have landed on, and the opening plays
whether it started from the pointer or the keyboard.

## Sources consulted for this pass

Three.js realistic-render practice — [Three.js Journey](https://threejs-journey.com/lessons/realistic-render)
and [100 Three.js tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips)
(tone mapping, environment maps in place of per-light work, shadow-frustum
fitting, one-frame shadow updates for static scenes).
Layout and density judgment — the vendored `design-taste`, `no-slop-ui` and
`hallmark` skills in `.claude/skills/`, in particular "set the dials first",
"one focal point per view", "cards must be earned", and the ban on hero
sections inside internal tools.


---

# v7.1b — Opening the binder *is* the page transition

There is no page transition in this app in the usual sense. Opening a binder
and arriving at its records are one movement, and closing one is that movement
run backwards.

## The sequence

1. **Click, or Enter on the binder you walked to.** The binder pulls clear of
   the row and turns to face the reader while its front board swings back on
   the spine — the first 62 % of a 620 ms clock.
2. **From 42 %, it comes toward you.** Position and scale ramp on a second
   curve, so by the last frame the block of paper inside fills the canvas.
   This is the "zoom" — it is the binder moving, not the camera, so it never
   fights `FitCamera`.
3. **At 400 ms a paper-coloured veil fades in** over the canvas
   (`.shelf-view.is-opening::after`, `--color-paper-3`), which is the exact
   colour the record page opens on. The cut lands inside a single flat field,
   so there is nothing to see.
4. **The record page settles** — 8 px up, 0.6 % of scale, 420 ms — as if the
   page had just come to rest after the cover dropped open.

The animation is driven from a clock (`progress` advanced by `delta`), not
from a lerp toward a target, so the two stages always land in the same order
and the hand-off to the route change is predictable rather than
frame-rate-dependent.

## Inside the binder

A record page opened from the shelf is not a new screen; it is what that
binder was holding, and it says so:

- the binder's building colour runs down the left edge as its spine, with a
  single-token wash off it — the inside of the cover;
- the crumb reads `BUILDING 16 · CLEANING VALIDATION` in the building's hue;
- the lede carries only what the crumb cannot — the sampling family, the rinse
  method, the gas or water type;
- **Close the binder** puts it back rather than "going back".

`binderForContext()` resolves the binder from the route, so a deep link into a
record is framed identically to a click on the shelf. A bare workflow route
with no building is *not* framed as a binder — it is the workflow across every
building, and pretending otherwise would be a lie about where the record
lives.

## Closing

`Close the binder` navigates home with `state.returning`. The shelf mounts
that binder in the opened pose — out of the row, turned, cover open, scaled up
— and lets it settle back into its slot on the ordinary rest animation. One
piece of state, and the return reads as the reverse of the opening without a
second animation being written for it.

Everything above collapses under `prefers-reduced-motion: reduce`: the veil
stops transitioning, the settle keyframe is cancelled, and the route simply
changes.

## One gate changed

`validate_release.py` used to assert `"gradient(" not in styles`. That blanket
ban was aimed at the purple-hero tell — gradient text, gradient buttons,
multi-hue decorative washes. The spine wash is a single-token surface
gradient, which `design-taste` names as a *good* gradient ("a 2–3 % lightness
shift across a surface makes it feel lit rather than flat"). The gate now
names what it actually protects: no `background-clip: text`, no gradient on
buttons, and at most one colour token inside any gradient.


---

# v7.1c — Two fixes found by looking at the screenshot

## The binder stopped halfway down the page

The spine was a `border-left` on the record *page* element, and the colophon
is rendered by the shell, outside it. So the spine ended in mid-air above a
grey band and the whole thing read as broken chrome rather than as a binder.

The spine now belongs to the **column**, not the page: `useBinderContext()`
resolves the binder from the route once in `Shell`, which puts the building's
colour tokens and an `in-binder` class on `.viewport`. The spine runs the full
height, the colophon goes transparent and takes the building colour on its top
rule — it is the inside of the back cover — and there is no band.

One hook, read in one place, so the shell and the page can never disagree
about which binder you are in.

## The PDF preview was unusable on a small screen

A fixed 38 rem iframe inside a stacked single column is a pinch-and-scroll trap
that also pushes the record's own fields off the screen. A generated worksheet
is a page of A4; anything less than the display cannot show it.

- **Wide (≥ 68 rem):** the inline panel stays, but its height is now
  `clamp(24rem, 62vh, 44rem)` instead of a fixed 38 rem, and a **Full screen**
  action opens the viewer.
- **Narrow:** no inline iframe at all. Generating leaves a short status line
  and promotes **Open preview** to the primary action, which opens the same
  full-screen viewer — `100dvh`, worksheet number and file actions in its bar,
  Escape and a focus trap, body scroll locked while it is up.

The primary action follows the screen: on a wide viewport it is *Preview PDF*,
because the panel is right there; on a narrow one, once a preview exists, it
is *Open preview*, because looking at it is what you want next — not
regenerating it.

## And a real bug in the collapsed rail

Below 60 rem the rail becomes a horizontal strip, and `grid-auto-flow: column`
defaults its tracks to `1fr`, so long labels were squeezed into each other's
tracks and drew on top of one another. Tracks are now `max-content`, the
16 px marker column is dropped in favour of an underline, and the active
section is scrolled into view on every route change.

---

# v7.1d — The palette was drab and the footer was a wall of text

Two things the owner said, both correct, both measurable.

## "ประโยคยาวๆ ส่วนนี้ใส่มาทำไม" — why is that long paragraph there?

Because I applied Hallmark's **Ft4 dense colophon** literally instead of
asking what it was for. The result was eight sentences of 11 px mono at the
bottom of every document page: the template routing, the CV/Water separation,
the training-simulation boundary, even the typefaces. All true, none of it
read, and it made every page end in a grey slab of small print.

Every fact in it already lives somewhere better:

| The old footer said | Where it actually belongs |
|---|---|
| which template each domain renders from | the record page subtitle — "Rinse · Pour Plate" — where the choice is being made |
| CV rinse never enters the Water sequence | the CV binder, before the record list, where that choice is offered |
| the simulations are fictional, not an approval tool | inside the simulations, next to every limit and grade (rule 6) |
| binder colours follow the physical shelf | the shelf itself says it, in colour |
| set in Newsreader / IBM Plex | nothing depends on it |

So the footer keeps only the one fact that has to be true on **every** page —
this workspace reads, it never writes — plus the mark. Two short items on one
line, in the body face at `--color-neutral` (5.7:1, where the old mono
paragraph sat at 3.6:1 and failed AA outright).

## "สีมันดูหม่นหมอง" — the colours look drab

Measured rather than argued. `validation/contrast.mjs` is new: it parses
`tokens.css`, converts every `oklch()` literal to linear sRGB, and reports
WCAG contrast for the pairs the interface really renders. Two findings on the
old palette:

- **Every binder wash scored 1.00–1.03 against paper.** Not "subtle" —
  invisible. The building colour, the one thing on screen that carries
  meaning, was doing nothing on a record page.
- **The colophon and placeholder text failed AA** (3.62 and 3.26).

And oat paper at 93.5% under 97% cards meant the whole interface lived inside
a 4% lightness band. Nothing could stand out because nothing was allowed to.

What changed:

- **Ground up, cards white.** Paper `93.5% → 97.2%`, cards `97% → 99.6%`,
  the recessed panel dropped to `92.6%` so a card lifts and a rail recedes.
- **Ink and secondary text deepened.** Ink `23% → 18%`, muted `46% → 39%`,
  neutral `60% → 51%`. Body text now runs 17.4:1; nothing is below 5:1.
- **Neutrals held under 0.02 chroma** so a building hue has no competition.
- **Binder hues taken up hard.** `--b16` 0.085 → 0.104 chroma, `--other`
  0.100 → 0.115, `--b12` 0.090 → 0.195. The washes moved *down* in lightness
  rather than up in chroma — a tint at 90% can hold real colour, one at 93%
  cannot — and now score 1.14–1.22 against paper instead of 1.00.
- **The room was lit.** Tone-mapping exposure 0.82 → 0.98 by day and
  1.12 → 1.22 by night, key and bounce raised to match; the night cabinet was
  a black void, so its melamine went `34% → 42%` and the worktop `27% → 35%`.
  The binders stay the brightest objects in both.

The checker also fails on any colour outside sRGB, which caught seventeen
tokens on the first pass — chroma I had asked for that the browser would have
silently clipped, making the contrast numbers meaningless. Green is the tight
one: at L46 sRGB tops out near 0.104 chroma, which is why `--b16` sits there
and not higher.

Run it with the rest:

```
node validation/contrast.mjs
```

---

# v7.1e — "No pyvenv.cfg file": the launcher trusted the wrong thing

Reported from the owner's PC: `START-SERVER.bat` printed its banner, then
`No pyvenv.cfg file`, then stopped.

## What actually happened

That message comes from the CPython launcher, not from this project. A
virtual environment is two things: `Scripts\python.exe`, and `pyvenv.cfg`,
which records an **absolute path** to the Python installation it was built
from. Copy, move, zip, restore or sync the folder and `python.exe` survives
while `pyvenv.cfg` no longer resolves — the interpreter cannot find its own
standard library and exits before running a single line of the server.

`START-SERVER.bat` guarded on exactly the wrong file:

```bat
if not exist "%APP_DIR%.venv\Scripts\python.exe" (  ... run INSTALL.bat ... )
```

`python.exe` was present, so the guard passed, INSTALL never ran, and the
launcher went straight to executing a Python that could not start. `INSTALL.bat`
had the same blind spot — its `if not exist ...python.exe` meant that even
running it by hand would *skip* rebuilding the broken environment and go on to
`uv pip install` against it.

So the one thing the owner would naturally try — run the installer again —
could not fix it. That is the real defect; the stale `.venv` was only the
trigger.

## The fix

Both scripts now probe the environment for what it must actually be able to
do, in a `:probe_env` subroutine:

1. `Scripts\python.exe` exists
2. `pyvenv.cfg` exists
3. Python starts (`python -c "import sys"`)
4. — in `START-SERVER.bat` — the server's dependency imports (`import flask`)

- **`INSTALL.bat`** deletes and rebuilds a `.venv` that fails the probe instead
  of installing into it, reports it plainly ("built on another PC"), and
  verifies `import flask` at the end rather than trusting pip's exit code.
- **`START-SERVER.bat`** repairs once by calling `INSTALL.bat`, re-probes, and
  if it still fails prints the three things worth trying — delete `.venv`,
  check internet access, check the folder is not read-only or inside OneDrive —
  instead of a five-word error from the interpreter. It also reports a non-zero
  exit from the server with the port-in-use hint.

`validation/validate_release.py` gained `assert_launcher_repairs_venv()` so the
weak check cannot come back.

**Note:** the release zip has never contained `.venv`, `.tools` or `.uv-cache`;
they are excluded, and `validate_release.py` has listed them as ignored since
v7.0. The broken environment was left over on the machine, not shipped.

---

# v7.1f — The audit: it built, it passed, it was not connected

The owner reported the frontend and backend were not talking. They were not.

## The bug

Vite resolves `.env` files relative to `root`. `root` is `apps/web`;
`.env.production` is at the repo root. So `envDir` defaulted to `apps/web/`,
found no env file, and **every `VITE_*_READ_URL` was dropped from the bundle** —
silently, with no warning, on a build that reported success.

Proven rather than reasoned: `grep -rl "AKfycbz…" dist/` returned nothing.

The result was an app that ran, rendered, routed and printed, and said
"System DB URL is not configured" on all three domains. Every existing gate
passed, because every gate tested source, not the artefact.

Fix: `envDir: '../../'`.

## What else the audit turned up

- **`tsconfig.node.json` was `composite` with no `outDir`**, so `pnpm check`
  emitted `vite.config.js` and `vite.config.d.ts` into the repo root. Vite's
  config resolution can prefer a `.js` over the `.ts`, which means an edit to
  `vite.config.ts` could silently do nothing. Both tsconfigs now emit into
  `node_modules/.tmp/`, and a `.gitignore` was added — the project had none.
- **`<html lang="th">`** while every string in the UI is English. Now `en`.
- **`VITE_CV_READ_URL` is empty.** Not something I can invent; it is the
  owner's deployment URL. `OWNER_MANUAL.md` § 2 makes it the loudest step.

## The new gate

`validation/validate_wiring.mjs` tests the *artefact*, not the intent:

1. `envDir` resolves to the folder that actually holds `.env.production`
2. no stale `vite.config.js`/`.mjs`/`.cjs` beside the `.ts`
3. the `/api` dev proxy exists
4. every `/api/...` path in `App.tsx` has a matching `@app.route` in `pdf_server.py`
5. every PDF workflow the UI can request exists in the server registry
6. with `--built`, every configured URL is present inside `dist/assets/*.js`

Point 6 is the one that would have caught this on day one.

## Backend, verified rather than assumed

Flask was started against the build and every route exercised with curl. All
five templates render; the CV route guard rejects a mismatched method with 422;
a downloaded artefact is a real 2-page PDF. The Apps Script `/exec` URLs are
unreachable from the delivery container, so the System DB read is proven only
as far as "the URL is in the shipped bundle".

## What "only the necessary files" turned out to mean

The delivery zip now excludes build output, generated PDFs and Word files,
screenshots, caches and the unreferenced `llm-wiki/`. Twelve stale root
markdown files moved to `docs/archive/` — moved, not deleted.

One assumption was wrong and the test caught it: `_archived/` looked like dead
weight, but `_archived/frontend-v6/games/` is the hash baseline
`validation/games-baseline.sha256` checks against. Dropping it failed seven
assertions. Only the three unreferenced sibling folders were excluded.

The zip is now verified the only way that means anything: extracted to a clean
directory, all nine checks run there, the server booted from the extraction,
and a PDF generated through it.

---

# v7.1g — Two bugs that made every read fail, found in the browser console

The owner sent a console screenshot. It named both bugs precisely.

## CORS: `credentials: 'include'` against a wildcard origin

```
Access to fetch at 'https://script.google.com/macros/s/…/exec'
from origin 'http://localhost:8000' has been blocked by CORS policy:
The value of the 'Access-Control-Allow-Origin' header in the response
must not be the wildcard '*' when the request's credentials mode is 'include'.
```

A Google Apps Script Web App deployed for "Anyone" answers with
`Access-Control-Allow-Origin: *`. The fetch spec forbids the browser from
accepting a wildcard origin on a credentialed request, so `api.ts` sending
`credentials: 'include'` made **every** System DB read fail —
`net::ERR_FAILED`, the Water and Air tabs empty. The `302 (Found)` in the log
is just the normal Apps Script redirect to `googleusercontent.com`; it was
never the problem.

Nothing about this endpoint needs cookies: it is a public read. Sending the
user's Google session to it was both the cause of the failure and something we
should not have been doing. Now `credentials: 'omit'`.

## The CV building label could never match

`05-cv-user/Code.gs` wrote the building straight from the sheet:

```js
building: String(row.Bld || '').trim(),     // "10"
```

`06-cv-system/Code.gs` filters on exact equality:

```js
.filter(record => !building || String(record.building || '').toLowerCase() === building)
```

and the web app always sends `?building=Building%2016`. `"10" === "building 16"`
is false for every row of every building, forever. The CV tab would have stayed
empty even with a correct URL, a correct token and a successful sync.

New `normalizeCvBuilding_()` maps `10`, `"10"`, `"10.0"`, `" b16 "`, `"B-12"`
and `"Building 10"` all to `Building 10` / `Building 12` / `Building 16`, and
passes anything unrecognised through unchanged so a surprise value stays
visible in the data instead of being silently relabelled. Applied at all four
sites, including the batch key, so grouping and filtering agree.

## WebGL context loss

The same console showed `THREE.WebGLRenderer: Context Lost`. Nothing called
`preventDefault()` on the event, which means the browser will not restore the
context and the shelf becomes a blank rectangle. The canvas now prevents the
default so the context can come back, and if it has not returned in 2.5s the
flat shelf takes over — the fallback that already existed for machines without
WebGL. `PCFSoftShadowMap` also became `PCFShadowMap`: it is deprecated in this
three version and was silently downgrading to exactly that anyway.

## Both are now gates

`validate_wiring.mjs` grew checks 6 and 7: the CV sync must contain
`normalizeCvBuilding_` and must not write a raw `Bld` into `building`; and
`api.ts` must not use `credentials: 'include'`. The `api.ts` check strips
comments first — the comment explaining the bug necessarily quotes it, which
failed the gate on the first run.

## What the owner has to redo

A code fix does not reach a running install by itself. `OWNER_DEPLOYMENT.md`
carries the table: the CORS fix needs a rebuild; the building fix needs the CV
script pasted again **and a re-sync**, because rows already written carry the
unmatchable `"10"`.

---

# v7.1h — A substitution the owner accepted, made impossible to miss

Opening the controlled templates settled the Rinse question, and not the way
I had guessed.

## The forms are pictures

`pw-prw-template.docx` is 10 MB of which 10 MB is four images; `wfi-pus` is two.
Neither contains the words `Spec`, `Limit` or `cfu` as text. The only editable
content is a handful of angle-bracket tokens:

```
pw-prw   <tagNo01> <samplingPoint01> <result1_01> <result2_01> <resultAvg01>
wfi-pus  <tagNo01> <samplingPoint01> <result01>
```

So the two forms differ by **table shape**, and the shape follows the **method**:
Pour Plate prints two plate counts and an average, Membrane Filtration prints
one value. The owner's instinct — switch the form on the method — was right,
and my earlier proposal to switch on the matrix was wrong: it would have put a
single membrane result into a form with two count columns and an average,
leaving two blanks in a controlled document.

The acceptance criterion lives in the artwork, which is why Rinse-PW rendered
on the WFI form prints 10 cfu/100 mL for a sample whose limit is 100 cfu/mL.
The form that is actually needed — WFI's shape, PW's artwork — does not exist,
and cannot be invented here: the artwork is QA-approved.

## The decision, and what was built around it

The owner chose to keep printing on the WFI form while a new one is prepared.
That is theirs to decide. What was not acceptable was for it to be silent, so:

- **`cvTemplateSubstitution()`** in `recordPolicy.ts` is the single place that
  recognises the combination, next to `pdfRouteForRecord` so the two cannot
  drift. It returns the printed criterion and the record's own.
- **A notice above the print controls**, before printing rather than after,
  naming both criteria and saying to read the result against the record.
  Amber, not red: the document is produced deliberately, by an owner decision.
- **A reprint list.** Every worksheet printed under the substitution is
  recorded locally and exported as CSV from Tools. Reconstructing that
  afterwards would mean re-deriving the routing of every rinse record ever
  printed; capturing it at print time costs nothing.

## The seam for the sixth form

Adding it is two edits, both already commented: an entry in
`PDF_WORKFLOW_REGISTRY` in `server/pdf_server.py`, and the route in
`cvTemplateSubstitution`. `OWNER_DEPLOYMENT.md` carries the procedure for
building the file without breaking the tokens.

---

# v7.1i — Two features the owner asked for

## Binder colours the reader can pick

The owner asked for a free colour picker "in case someone doesn't like them".
I said what it costs first: rule 8 says a colour means a building, the shipped
set is transcribed from photographs of the real shelf, and if everyone chooses
their own then "the green binder" means different things to different people.
The owner chose free choice, per browser, having heard that.

There is a stronger reason for the feature than taste, though: red-green colour
vision deficiency affects roughly 8% of men, and this palette's two hardest
pairs — blue/violet and green/amber — are exactly the ones it confuses.
Somebody on that team may not be able to tell two binders apart today.

The design keeps free choice while making a bad outcome hard:

- **The reader picks one hue per building.** The five tokens a building needs —
  identity colour, 3D spine board, printed label band, band ink, page wash —
  are derived in `palette.ts` at the same lightness and chroma targets the
  shipped palette was tuned to. Picking a colour therefore cannot produce an
  unreadable label; the relationships are held by the code, not the person.
- **Out-of-gamut chroma is clamped** by the same bisection `contrast.mjs` uses,
  so the colour applied is the colour specified rather than a clipped one.
- **The band ink flips by measurement**, not by hue: a pale band gets dark ink,
  a dark band pale, whichever actually scores higher.
- **Two things are said out loud** rather than prevented: a hue below 4.5:1
  against the page, and two buildings within 22° of each other — which on this
  shelf means picking up the wrong binder.
- Overrides are written onto `:root` as the same token names everything already
  reads, so CSS and the 3D scene stay in step. `paletteRevision` busts the
  scene's memos; without it the shelf kept the colours it started with.
- `data-palette="custom"` puts a small mark on the Colours button, because a
  screen that no longer matches the room should say so.

Nothing is shared, synced or built in. `Back to the photographed colours`
is always one click away.

## Ticking worksheets to print a batch

The lab prints a run, not a sheet. Each row in the record list gained a
checkbox, outside the row's own hit area so ticking never opens the record and
opening never changes the selection; the header checkbox does select-all with
a proper indeterminate state.

`Print N` renders each ticked worksheet through the **same `/api/pdfs` route
and the same controlled templates** as a single print — no new server surface,
no second code path that could drift from the first — then merges the results
into one document with `pdf-lib` in the browser. That gives one print dialog,
one stack in list order, and one file to save.

Merging happens in the browser rather than on the server because by that point
the pages are already rendered and controlled: nothing about document content
is decided client-side. Rendering is sequential, because the server drives Word
one document at a time and asking for forty at once only queues them; progress
is shown per worksheet and the run can be stopped.

One failure does not lose the batch. A record with no rinse method set is
skipped, named, and the reason given, and the rest still print.

Verified against the running server: three worksheets, two pages each, six
pages in one merged PDF.

---

# v7.1j — Two pages that were never styled, and the sync error explained

## Tools and Calendar had no CSS at all

The owner sent a screenshot of the Tools page rendering as one run-on
paragraph of bold and plain text. The cause was not a broken rule — there was
no rule. `grep -c "tool-list" styles.css` returned **0**. Same for
`.calendar-frame`: the embed rendered at the iframe's own default size, a small
cropped box adrift in an empty page. Both class names were written in `App.tsx`
during the v7.1 rewrite and never given a stylesheet.

That is worth naming plainly: nine validation gates, 38 tests and a release
check all passed on a page that had no layout, because nothing tests that a
class used in markup exists in CSS.

- **Tools** is now two labelled groups — *Owned elsewhere* and *In this
  workspace* — because the distinction that matters to the reader is whether a
  thing leaves the workspace. Cards, not a list: each carries the name, what it
  actually is, and one affordance. The COA App keeps a small `ANF3` network
  badge, since it is the one that can fail for a reason the reader can fix.
- **Calendar** fills the column at `clamp(28rem, 68vh, 52rem)`, gains a
  Month/Schedule switch (the two views the Google embed supports), today's date
  and ISO week, and a link out.

## The blank grey rectangle

Working on the calendar exposed the thing the owner actually saw: when the
Google embed cannot load, it leaves a featureless grey box. That reads as a
broken page, not as "this needs the internet". There is now a fallback — after
six seconds without a load event, or immediately when the browser is offline —
that says which of the two it is, notes that records and PDFs do not depend on
it, and offers the link out.

## `Unknown action` was not a bug in the app

The console the owner sent showed the CORS failure gone and a different error:
the Water Web App replying `Unknown action`. The shipped
`04-water-system/Code.gs` handles `action=search` at line 178 — so the code
answering that URL was **an older deployment**.

This is the standard Apps Script trap: **saving `Code.gs` does not change what
`/exec` serves.** A deployment is pinned to a version; the owner must run
Deploy → Manage deployments → Edit → Version: *New version*.

`api.ts` now translates the System DB's terse strings into what to do:
`Unknown action` gives the redeploy steps verbatim, 401/403 points at
"Who has access: Anyone", 404 points at the URL in `.env.production`.
`OWNER_DEPLOYMENT.md` gained the trap as a red callout in step 2 and two rows
in the troubleshooting table.

The `Cannot read properties of undefined (reading 'startTime')` in the same
console is **not this application**: it comes from `VM13`/`<anonymous>`, a
web-vitals reporter injected by a browser extension. Documented as such so
nobody spends an afternoon on it.

## Training became Games, in Thai

Renamed in the rail and on the Tools card, and the hub is now Thai with
`lang="th"` on the page — it is the one surface people play rather than work
in, and the training-boundary language is clearer in the reader's own language,
not weaker: *"เกมเหล่านี้ **ไม่ใช่** เครื่องมืออนุมัติ"*.

---

# v7.1k — The owner could not rebuild, so the URLs never moved

Two reports that turned out to be one problem: `BUILD-DIST.bat` flashed a black
window and vanished, and the app kept saying the Web App was an older
deployment even after the owner redeployed and pasted new URLs into
`.env.production`.

They are the same fault. The URLs are compiled into the bundle, the rebuild
never ran, so the running app was still calling the *previous* deployment. The
error message was accurate — it was just describing a stale build.

## Why the window vanished

`BUILD-DIST.bat` had **no `pause` on any path**, so every outcome — success,
missing tool, failed build — closed instantly. And the first thing it does is

```bat
where pnpm >nul 2>&1
if errorlevel 1 ( echo [ERROR] ... & exit /b 1 )
```

**Nothing in this project ever installs Node or pnpm.** `INSTALL.bat` sets up
Python, uv and Flask. A laboratory PC has no Node and never will. So the script
could only ever fail there, and could never show why.

## The real fix is not to need it

Rebuilding to change three URLs is the wrong shape. A published Apps Script
`/exec` URL is configuration, not code. There is now **`config.json` beside the
launchers**: Notepad, paste, save, refresh. No Node, no pnpm, no build.

- An empty value falls through to the compiled-in one, so filling in one line
  changes exactly one domain.
- It lives at the app root, **not** in `dist/` — `pnpm build` empties `dist`,
  so a copy there would be silently reset on every rebuild and the owner would
  lose what they pasted. `validate_wiring.mjs` now fails if one appears there.
- Flask serves it through one additive allowlist entry in `serve_static`
  (a change inside `server/`, normally ask-first — flagged in the handoff).
- Read once before the first render, so the first search already uses it.
- Values are gated: each must be a Google `/exec` URL, and none may look like a
  token — this file reaches the browser.

Verified end to end through Flask on a deep-linked route: config.json overrides
the compiled-in endpoint and the app calls the new URL.

`BUILD-DIST.bat` was fixed anyway — it pauses on every path, checks Node and
pnpm separately, and leads with the fact that you probably do not need it.

## A gate for the class of bug that shipped Tools and Calendar unstyled

`validation/validate_styles.mjs` compares every `className` in the TSX against
every rule in the CSS. It would have caught `.tool-list` and `.calendar-frame`
on the day they were written. Running it for the first time found one more:
`.crumb-label` in `GameChrome.tsx`, applied since v7.1 and never styled.

## Thai that reads like a lab, not like a translation

The hub was Thai but written like translated documentation. Rewritten plainly —
*"ดูหลักฐาน อย่าเดาจากสี"* rather than *"ตัดสินด้วยหลักฐาน ไม่ใช่การเทียบสี"* — and the
shared game frame (`GameChrome`) is now Thai too, so the chrome around every
campaign matches the hub. The case content inside the three campaigns is still
English and is the next pass.

---

# v7.1l — The games speak Thai

The owner confirmed the rule: **technical terms stay English, everything else
becomes Thai.** That is not a compromise — it is how a Thai microbiology lab
actually talks. Nobody at the bench says การเพาะเลี้ยงบนอาหารแมคคองกีย์; they say MAC.

## What stayed English, deliberately

Media and reagents (TSB, SDA, MSA, MAC, XLD, RV and their full names), organism
forms (S. aureus-like, CoNS-like, Salmonella-like), Grade A–D, HEPA, RABS,
HVAC, CAPA, QA, EM, Feller correction, airlock, settle/contact plate, active
air, glove print, broth, agar, morphotype, lot, chain of custody, method
suitability, media performance, promotion/inhibition/indication, Certificate of
Analysis — plus every room and sample-point name, and the internal identifier
values (`cannot_resolve`, `confirm-approved`) that are code, not copy.

## What changed

568 strings across `content.ts`, `excursionContent.ts` and the five game
components. The register brief was explicit, because the first attempt was
rejected as อ่านไม่รู้เรื่อง — formal written-Thai translationese. The rewrite is
bench Thai: short clauses, plain verbs, long English sentences split into two
Thai ones rather than mirrored.

```
"Turbidity does not identify an organism."
  → ความขุ่นบอกไม่ได้ว่าเป็นเชื้ออะไร

"Restraint is a finding too. A clean round supported by every reading is not a
 weaker report — it is the correct one."
  → การไม่ตีความเกินก็เป็นผลอย่างหนึ่ง รอบที่ทุกจุดผ่านไม่ได้แปลว่ารายงานอ่อน แต่แปลว่ารายงานถูกต้อง
```

## Meaning had to survive exactly

This is regulated training content, so the translation brief forbade softening:
*presumptive* (สันนิษฐาน / เบื้องต้น) never becomes *confirmed*, *supports*
(หลักฐานรองรับ) never becomes *proves*, and invalid / requires investigation /
release / quarantine stay four distinct outcomes. No regulatory phrase was
invented that the English did not already contain.

One reading was checked rather than trusted. In the Feller case the English
says the corrected estimate "clears" the limit, which is ambiguous — passes, or
exceeds? Running the fixture numbers settled it: 95 positive holes of 400
corrects to **108** against a Grade C limit of **100**. It exceeds, so the
supported action really is to review the utility seal.

Two terms drifted between the content pass and the UI pass and were unified
afterwards: *fixture* → ในโจทย์, *audit trail* → ประวัติการทำงาน.

The remaining English on screen is the keep-list plus a character name
(Dr. Mira Voss) — verified by a sweep over every rendered string.

---

# v7.1m — A port it can always find, and a shelf you can restyle

## The port is chosen, not assumed

A laboratory PC often already has something on 8000. The server bound to it,
failed, and the window closed — telling the user nothing they could act on.

`pdf_server.py` now probes for a free port: the preferred one if it is free,
otherwise the next free port above it, and if the whole range is taken it asks
the OS for any free port rather than refusing to start. The chosen port is
written to `.anf3-port` beside the launchers and removed on shutdown.

Nothing in the app cares which port it landed on — every API call is a relative
path — so only the launcher needs to know. `START-ANF3.bat` reads `.anf3-port`
first, then sweeps 8000–8009, probing `/api/status` (this application's own
route, so another program on the port is never mistaken for ours) and reuses a
running server instead of starting a second copy.

Verified by holding 8000 with a decoy socket: the server reported
*"Port 8000 was busy, so this session uses 8001"*, served the app on 8001, and
generated a PDF through it.

## Six real filing formats

The shelf had one silhouette — correct, since it is the file actually on the
ANF3 shelf, but monotonous to look at daily. `binderShape.ts` adds five more,
and the differences are physical rather than decorative: a lever arch file has
a wide spine and a finger ring because the lever mechanism needs the depth; a
ring binder is narrower with no lever, so no ring, and carries a clear slip-in
spine pocket instead; a box file is squared off, closes with a clasp and takes
unperforated pages; an expanding file has concertina sides and an elastic; a
document wallet is a flat card flap with no mechanism at all.

Each shape drives width, furniture and shelf spacing together, so choosing one
re-lays the shelf the way a different box would really sit on it.

**It is cosmetic and it is bounded.** The building hue, the spine label and the
record behind a binder are identical whichever shape is drawn — rule 8 still
holds. The choice lives in `localStorage`, per browser, and never reaches the
System DB or another machine.

Both this and the colour choice sit in one dialog, now titled *How the shelf
looks*, because that is the one thing they have in common.

The picker's swatch was first drawn as a four-stop gradient across three
tokens, which `validate_release.py` rejected — correctly; the rule exists to
stop decorative gradients. Rebuilt from solid layers.

Sources for the format differences:
- Ring Binder vs Lever Arch File — https://www.mifiastationery.com/news/ring-binder-vs-lever-arch-file-key-differences-explained.html/
- Difference between filing types — https://www.copyclublive.com/blogs/news/what-is-the-difference-between-the-various-types-of-files
- Lever Arch File vs Ring Binder — https://blog.vikingdirect.ie/lever-arch-file-or-ring-binder/

## Colour persistence was already working

Checked rather than assumed: choose a colour, reload the page in the same
browser profile, and the stored value, the applied token and the
`data-palette="custom"` marker all survive. If it looked otherwise it was a
private window or a different browser — `localStorage` is per profile.

---

# v7.1n — What QA actually asked for

QA raised three questions. The owner correctly identified that the third is
already answered elsewhere:

| Question | Answered where |
|---|---|
| Who printed this controlled document? | **here**, new in this version |
| Who used this workspace at all? | **here**, new in this version |
| Who entered the data? | the bound Apps Script sync, on the Sheets side |

## What was built, and what it deliberately is not

The operator gives their employee number once per browser, before the
workspace opens. Every print, download, batch print and workspace open is
recorded with that number, the worksheet number and the controlled route used.

**It is attribution, not authentication, and every surface says so.** Nothing
verifies the number, so what is recorded is *who said they were at the machine*
— exactly what a paper issue logbook records. It is not a 21 CFR Part 11
electronic signature and it does not restrict access. § 11.10(d) and (g) want
authenticated, access-limited entry, which needs an identity system these
machines do not have.

Building it and *calling* it a login would have been worse than building
nothing: QA would see a control that is not there.

What it does give them that they did not have:

- a **server-generated** timestamp — the page cannot set it, which is the part
  of § 11.10(e) this can honestly satisfy
- an **append-only** `activity-log.jsonl` beside the launchers: entries are only
  added, never rewritten, and a torn line is skipped rather than repaired
- the worksheet number and the controlled template behind each printed document
- a CSV export to hand over, and a Thai activity page to read it in the app

## The token stays off the browser

The owner asked for the log in the RPP2 sheets. Writing to Google from the page
would need the sync token in the browser — rule 2, and a real hole. So the
browser posts only to the **local** Flask server, and forwarding to the
spreadsheet's existing `logs` tab is done server-side, off by default, from
`server/log-forward.json` (shipped only as `.example.json`). The token never
reaches the bundle.

Two new gates in `validate_wiring.mjs` enforce it: no browser source may
mention a sync token, and a real `log-forward.json` must never be in the tree.
`grep` over `apps/web/src` and the built bundle returns zero.

The server also rejects any action outside a fixed allow-list, so the log
endpoint cannot become a general write channel from the page.

## The one server rule this bends

`server/` is normally ask-first. The owner asked for this feature explicitly,
and it needs three small additive routes (`POST/GET /api/log`, `/api/log.csv`)
plus `server/activity_log.py`. Nothing existing was changed. Flagged here so
the next reader knows it was deliberate.

---

# v7.1n · The level had to change the game, not the label

The owner's brief was specific about who plays: *"คนเล่นส่วนใหญ่เป็นคนมี
ประสบการณ์ ทำเพื่อทบทวนครับ ถ้าเป็นไปได้มีเกมระดับ beginner สำหรับพนักงานใหม่
ด้วยก็ได้ครับ และลบบางเกมออกที่ดูซ้ำกันเกินไป"* — experienced players
reviewing, a beginner level for new staff, and the duplicate games gone.

## The duplicate was real, and measurable

Laid side by side, the phase lists settle it:

```
CultureCheck : campaign orientation briefing intake planning incubation observation interpretation debrief
Sixth Plate  : campaign orientation briefing hypotheses planning observation evidence conclusion debrief
Excursion    : campaign orientation briefing flagging sequencing capa debrief
```

CultureCheck and The Sixth Plate share six of nine phases and the same
evidence rail. Excursion Trace is a genuinely different investigation. So
CultureCheck went, and its engine, content, types and seven tests went with
it — leaving orphaned code behind is how a "removed" feature comes back.

Two things were deliberately **not** removed. The frozen legacy page
`games/growth-promotion.html` is a different artefact, hash-checked by
`validate_release.py` and `games-baseline.sha256`, and still linked from
`games/index.html`. And the hash route `#/games/growth-promotion` stays as a
redirect to The Sixth Plate — `validate_release.py` asserts that path still
resolves, which is the gate doing its job: removing a game should not 404 a
bookmark. The gate was not weakened to make the change pass.

## `difficulty` was a label

`grep` told the whole story. The field was written into state, exported in the
evidence packet, and used in `gameProfileStorageKey` — and read by **no rule**
anywhere. Choosing "expert" changed nothing a player could feel.

`games/difficulty.ts` now holds one rule set per level and both campaigns read
it: what the media cards say, whether the sequence hint and the excursion
action limits are printed, whether the glossary opens, whether the report
linter warns before submit or waits for the debrief, the action budget, the
critical-error ceiling, the per-error deduction, and whether the best or the
first attempt is kept.

**ทบทวน is the default**, because that is who plays: plan blind, commit blind,
first attempt scores. เริ่มต้น adds the scaffolding for new staff. ยาก takes
it away — at expert the excursion limits are not printed at all, and looking
one up writes an audit entry, which is the honest cost of the hint.

## The test found the hole in my first design

My first cut changed only the ceiling. `difficulty.test.ts` failed with
`expected 46 to be greater than 46`: a ceiling only bites a run that was
already scoring above it, so a *bad* run scored identically at every level —
the same "difficulty is only a label" bug, one layer down. Hence
`criticalPenalty` (0 / 4 / 9 per distinct error) applied after the ceiling in
`applyCriticalCost()`, shared by both engines. The test suite is what keeps
the levels from collapsing back into labels, and it also pins
`budgetFor(2, 'expert') === 2` so the expert penalty can never make a case
unwinnable.

Verified in a real browser against the built bundle, not by reading the diff:
the budget reads 5 / 3 / 2 across the three levels on Case 01, the media
purpose lines count 6 / 6 / 0, and the excursion flagging screen prints 11 of
13 limits at review and 0 at expert with 13 lookup buttons in their place.
Zero console errors.

---

# v7.1o · A name against the record, and a look before the paper

Three things the owner asked for, and the evidence that shaped each.

## The `createdBy` column is the argument for the whole feature

Before writing anything, the real System DB was read: 212 rows of
`records_pw_prw`, column `createdBy`.

```
na          44      kulwanee/Kulwanee   17      Siripon    3
KC/kc       25      วิทยา                 7      คนสวย      2      (blank) 12
```

Free text, no employee code anywhere, mixed script and casing, and a
placeholder used more than any real name. QA cannot answer "who made this
record" from that column however prettily it is displayed — which reframes
the request. The complaint was "Google Sheets is hard to read"; the actual
problem is that the data does not contain the answer. A filter over `na`
still returns `na`.

So the operator now gives a **name and a code**, once per machine. The code is
what makes an entry match a person; the name is what makes the log readable
without a lookup table. Both are stored, and both are written to the sheet —
`username` gets the readable "name (code)" so an existing 5-column `logs` tab
keeps working untouched, and `operatorName`/`operatorCode` are appended as
their own columns, with `ensureLogHeaders_()` widening the header row in place
on the first write. Nothing has to be done to the spreadsheet by hand.

The identity lives in `localStorage` and stays until somebody presses **ลบชื่อ
และรหัสจากเครื่องนี้**, which logs the departure *before* clearing — an
unattributed "somebody left" would be worth nothing. An install from before
v7.1o carries a bare code under the old key; it is migrated and only the name
is asked for.

It is still not a login, and every surface still says so. Nothing verifies
either field, so this remains attribution — a paper issue logbook, not a
21 CFR Part 11 signature, and not access control.

`record_opened` also fires for the first time. It had been declared in the
server's allow-list, in the client's `LogAction` union, and given a Thai
label, but no code ever emitted it: "who read this controlled record" was
simply not recorded. It is now.

## The print preview, and three bugs only a browser could find

The owner chose the heaviest option: a full-screen preview, scroll every page,
untick the worksheets you did not mean to print, then merge. `buildBatch()`
was split into `renderBatch()` (each worksheet its own document, with its page
count) and `mergeParts()` (stitch what is still ticked), so unticking costs
nothing — the pages are already rendered and the server is not asked again.

Three defects surfaced only by driving it, none of which reading the diff
would have caught:

1. **The preview was under the navigation.** It was given `z-index: 60` while
   the side rail sits at `--z-sticky-nav` (300), so the rail covered the left
   224px — exactly where the tick boxes are. `elementFromPoint` at a checkbox
   returned `a.rail-link`, and clicking one navigated to Master data instead.
   Now `--z-modal`, which is also what the token rule required all along.
2. **Every card was squashed to a third of its height.** A 562px frame inside
   a 185px card, clipped by the card's own `overflow: hidden` — which is the
   cause, since it drops a grid item's automatic minimum size to zero. The
   body is a flex column with `flex: none` children now.
3. **The worker could not load at all.** Flask guessed
   `application/octet-stream` for `.mjs`, and a browser refuses a module
   script served that way. Fixed in `serve_static`; without it the preview
   cannot draw a single page.

## Why the pages are drawn, not framed

The obvious preview is an `<iframe>` on a blob URL. It was built that way
first and could not be verified: Playwright's Chromium ships without the PDF
plugin, so every frame was a black rectangle, headless and headed alike.

That is not only a testing problem. Chrome and Edge both honour
`AlwaysOpenPdfExternally`, and on a corporate Windows image where that policy
is set, an `<iframe>` of a PDF downloads the file instead of showing it — the
preview would be an empty box on precisely the machines it is for. Shipping a
screen nobody had ever seen working was not acceptable, so `pdfPreview.ts`
renders each page to a canvas with pdf.js instead. The worksheet in the
screenshot is a real GPO form, drawn and checked here.

**pdfjs-dist is pinned to 4.x deliberately.** Version 6 calls
`Map.prototype.getOrInsertComputed`, which only very recent browsers have; it
threw outright, and a corporate Windows image is exactly where an older Chrome
or Edge is likely to be sitting. Do not bump the major without checking what
the laboratory machines actually run.

The library is imported dynamically, so its 330 kB reaches the browser only
when a preview is opened — the main bundle went from 1,136 kB to 807 kB. That
matters more than usual while the workspace may be served over SMB.

## The silent print is no longer silent

Both `printJS` call sites now pass `onError`. print-js throws inside its own
XHR callback, outside any stack the app controls, so no `try/catch` around the
call could ever have caught it: a failed print showed nothing at all — the
button was pressed and the dialog never appeared. Each now says so and points
at the download instead.

## Server and Apps Script were touched again

Rule 7 is ask-first, and this is the flag. `server/` gained the `.mjs` MIME
case and two new log fields; the air and water system scripts gained
`operatorName`/`operatorCode` and `ensureLogHeaders_()`. All additive, nothing
existing changed, and both `google/app-scripts/*.txt` mirrors were updated
byte-for-byte in the same commit — `test_apps_script_security.mjs` compares
them exactly, and it caught the mismatch when only one side was edited.

---

# v7.1q · The instrument panel, and motion that means something

The brief: make it look less generated and more interesting, add prominent
motion, keep the concept and every feature. Four answers set the dials —
full freedom on layout, motion in all four places, an **instrument-panel**
register, and **office PCs on Intel onboard graphics**. That last answer is
the one that shaped the most code.

## The register, and what it is not

The reference is a laboratory instrument's front panel: machined divisions,
engraved legends, recessed wells where a reading is displayed, indicator
lamps wired to real state, numerals in a column. It is emphatically **not**
skeuomorphism — no brushed-metal textures, no bevelled knobs, no drop
shadows pretending to be depth. What was borrowed is the *discipline*, not
the costume.

Two rules from the density dial (7–8) decide most of it. At that density a
shadow becomes visual mud, so containment is a hairline plus a background
shift, never both plus a shadow — `.sheet` lost its `box-shadow` accordingly.
And selection is shown by **inversion**, once per view: the open record is a
black row, while a row merely *ticked for printing* gets an accent marker
instead. Those were previously the same wash, and telling "what I am reading"
from "what I am about to print" was guesswork.

New tokens, all under the 0.02-chroma ceiling so the binder hue is still the
loudest thing on screen: `--color-well`, `--color-well-edge`, `--inset-well`,
`--tick-ink`, `--tick-pitch`, `--lamp-off`, `--ease-settle`, `--dur-settle`,
`--stagger`.

## Motion, and the machine it has to run on

`--dur-micro` for the route change, because it is the most repeated motion in
the product and a repeated motion has to be nearly invisible or it becomes a
tax on every click. `--dur-short` with a 26 ms stagger for panels arriving.
`--ease-settle` overshoots slightly and comes back, for a figure that changes.

On the shelf, changing building used to swap every binder within one frame,
which read as a glitch. Each binder is now lifted in and set down a beat
after the one to its left, landing with a slight lean that straightens — the
row is followed rather than re-read. The stagger is capped at 0.34 s; past
about half a second it stops being one movement and becomes a queue.

**The quality governor is the honest part.** There is no way to know from
here how an Intel UHD will cope, so the scene measures itself on the machine
it is actually running on and steps down: 2048px shadow map → 1024 → shadows
off, with resolution following. It never steps up, and never reacts in the
first second, because a first frame is slow on every machine including fast
ones. It writes `data-shelf-quality` on the root element so a support call
can ask what a PC actually settled at instead of guessing.

Its first version had the bug backwards: it waited for 45 *frames* before
judging, so the slower the machine, the longer it withheld the help. It now
closes its window on frames **or** 1.5 s, whichever comes first.

**What was measured and what was not.** Frame times here are software
rendering with no GPU — around 1 fps for this scene — so they say nothing
about an Intel UHD, and no number from this environment should be quoted as
if they did. What *was* verified is that the governor fires and demotes
(0 → 1 observed). The fps benefit needs one run on a real laboratory PC.

## Three bugs found by driving it

1. **The route transition ate the print selection.** Keying `<main>` on the
   full pathname remounted the whole workspace when the record key changed,
   so ticking three worksheets and then opening one to check it threw the
   ticks away silently. Keyed on the first two path segments now: moving
   between sections is a change of place and earns the motion; picking a
   record within one is not. `validation/validate_interaction.mjs` exists so
   this cannot come back.

2. **A performance measurement that was measuring nothing.** The probe seeded
   a one-character operator name, which fails the gate's two-character
   minimum — so it profiled the login screen and reported a confident 60 fps.
   It now asserts a canvas is present and the flat fallback is absent before
   it will report a number at all.

3. **The gradient gate had a hole exactly where it mattered.** Its regex
   stopped at the first `)`, which inside `linear-gradient(90deg, var(--a),
   var(--b))` is the one closing `var(--a)` — so the plainest two-colour
   gradient, the precise tell this gate exists to catch, passed straight
   through, while a more nested one was caught. Found by deliberately adding
   slop and watching it pass. Parentheses are matched now, and the token
   count considers only tokens that resolve to `oklch()`, since a length like
   `--tick-pitch` is not a hue and was tripping it falsely.

---

# v7.1r · Tuned to the machine, not to a worry

The earlier answer to "how strong are the PCs" was "office PCs, onboard
graphics", so the shelf was hedged for something like an Intel UHD 620. The
actual machine is a **Core Ultra 5 235U**: Intel Graphics with **4 Xe-cores**
at up to 2.05 GHz, 12 cores / 14 threads, 15 W base and 57 W turbo, with
16 GB of RAM. That is a different class of part, and the hedging was costing
visible quality for no reason.

Two ceilings came up:

- **The 3D shelf renders at the panel's own pixel ratio** (capped at 2)
  instead of 1.5. On a high-DPI laptop panel that is the difference between a
  crisp binder label and a soft one.
- **The print preview renders pages at the device pixel ratio** (1.4 floor,
  2 cap) instead of a flat 1.4. The reader is checking worksheet numbers
  before committing a controlled document to paper; soft is the wrong way for
  that to fail.

**The memory question the audit left open is now answered with a number, not
a shrug.** Twelve worksheets at scale 2 rendered 24 pages and moved the JS
heap from 7.5 MB to 24.9 MB — about 0.7 MB per page. A forty-worksheet batch
is therefore of the order of 60 MB of heap, which is nothing against 16 GB.
No page eviction is needed, and adding it would only have introduced
re-render flicker on scroll-back. (Decoded bitmaps live outside the JS heap,
so the true total is some multiple of this; even at four times it is still
comfortable.)

**What the silicon does not settle, and why the governor stays.** Two things
decide the frame rate on the day and neither is in the part number:

1. This is a **domain-joined** machine (`…gpo.or.th`). Group Policy can
   disable hardware acceleration in Chrome and Edge, and where it is off the
   scene runs on a software rasteriser no matter what the GPU is.
2. It is a **15 W part**. A thin chassis with a conservative power profile
   can hold a much lower sustained clock than the turbo figure suggests, and
   the shelf is a sustained load, not a burst.

`QualityGovernor` covers both, which is precisely what makes it safe to raise
the ceiling rather than a gamble. `tools/ANF3-CHECK-THIS-PC.html` answers the
first question in fifteen seconds on the machine itself — a single offline
file, since a specification sheet cannot report a policy.

---

# v7.1s · What the fleet actually reported

`tools/ANF3-CHECK-THIS-PC.html` was run on a laboratory PC, and every machine
in the building is this model. The result changed three decisions and caught
a mistake made one version earlier.

```
tier          : FAST
gpu           : ANGLE (Intel, Intel(R) Graphics (0x00007D41) Direct3D11 …)
software rend : no
webgl2        : yes          max texture : 16384
browser       : Edge 152
screen        : 1920×1200 @dpr 1.25      memory : 16 GB      cores : 14
bench light   : 16.70 ms / 59.9 fps
bench heavy   : 16.70 ms / 59.9 fps
```

**Hardware acceleration is on.** This was the single biggest unknown — a
domain-joined machine whose browser had been switched to software rendering
by policy would have run the shelf at a few frames a second regardless of the
GPU. It is not, and Direct3D11 through ANGLE is the healthy path.

**The benchmark hit the vsync ceiling at both loads,** light and heavy alike.
That means 60 fps is a *floor* for this machine, not a measurement of its
limit: the probe never managed to stress it. "FAST" is therefore a lower
bound and the real headroom is unknown but larger.

## The mistake v7.1r made, found by the numbers

v7.1r "raised the ceiling" from a hardcoded 1.5 to the panel's own pixel
ratio, capped at 2 — on the assumption that a modern laptop panel reports at
least 1.5. **These report 1.25.** So the change quietly *lowered* rendering
resolution on every machine in the building, turning supersampled output into
plain native output. Raising a ceiling made the picture softer.

Two fixes, both verified by reading `canvas.width` against `clientWidth` at
the fleet's real 1920×1200 @1.25:

1. A **floor** of 1.5 as well as a cap of 2, so a 1.25 panel is supersampled
   and a retina one is not over-drawn.
2. The dpr prop is a **scalar, not a range**. Given `dpr={[min, max]}` r3f
   clamps the device's own ratio into that window, so a range can never
   render above native — the first fix alone still produced 1.25 and the
   supersampling silently did not happen. It reads 1.5 now.

The print preview's scale floor moved to 2 for the same reason: at 1.25 a
worksheet number is rendered at almost exactly its display size with no
margin, and this is the screen where somebody checks that number before
committing a controlled document to paper.

## The pdfjs pin is now a choice, not a constraint

4.x was pinned on the guess that a corporate image would carry an old
browser. The fleet runs **Edge 152**, so that reasoning does not hold. The pin
stays regardless — 4.x is what this was verified against, the PDFs are
generated locally rather than fetched, and 6.x offers nothing this needs — but
it is now documented as a decision rather than a limitation, so a future
reader does not inherit a fear that was never true here.

---

# v7.1t · The quality choice, and a gate that had been lying

## Three settings, not the two asked for

The request was FAST and FULL. What shipped is **auto / full / fast**, because
neither of the two can do the job AUTO does. The fleet is uniform *today*; the
first replacement machine, the first policy change, the first thin chassis
that throttles after twenty minutes all arrive without anyone re-profiling
anything. AUTO measures the machine it is on and is the default. FULL pins the
picture for a machine known to be fast. FAST pins it low — for a PC that
struggles, and equally for somebody who simply does not want movement on
screen while they work.

It lives on a **ตั้งค่าเครื่องนี้** tab in the rail, which also gathers two
settings that were previously reachable only from unrelated pages: the
operator identity (clearable only from the activity log) and the shelf look
(only from the shelf). Everything on that page is a property of the PC in
front of you.

With FULL available as a real option, the things that were being withheld for
a machine that does not exist here are switched on: a 1px lift on a list row
under the pointer, a `scale(0.97)` on a pressed action, the building tab
settling rather than snapping, two more steps of panel stagger. All
transform/opacity, all tied to something the reader did, none running on their
own — and the OS `prefers-reduced-motion` setting still outranks all of it.

## Four bugs the audit found, all of them mine

1. **`.sr-only` was defined only in `games.css`**, which is imported by the
   four game components and nothing else. The settings page used it for a
   fieldset legend, so the label sat on screen as ordinary visible text.

2. **"fast" did not do what its own comment promised.** It changed resolution
   and the shadow map and nothing else — the pointer parallax, which is the
   one motion in the shelf that runs without the reader doing anything, kept
   going, as did the binder arrival stagger. Somebody who chose that setting
   *because* movement bothers them was given the same movement at a lower
   resolution. The scene now takes a `calm` prop: parallax eases to rest and
   the binders are simply on the shelf.

3. **`data-shelf-quality` was never cleared.** It is written only on a
   demotion, so a value from one slow session survived into every later one,
   and the settings page cheerfully reported a demotion that was not
   happening. Cleared on mount.

4. **`gl.shadowMap.enabled = false` was a one-way switch.** Choosing FULL
   afterwards restored the resolution and the shadow map size but not the
   shadows, because that flag is not a reactive prop and nothing set it back.
   It is a small `<ShadowSwitch>` driven by `quality` now.

## The gate that passed on bug 1

`validate_styles.mjs` exists precisely to catch a class with no rule behind
it, and it reported **all clear** on `.sr-only`. It concatenated every
stylesheet under `apps/web/src` and asked whether a rule existed *somewhere* —
which it did, in a file that page never loads.

It now checks reachability, not mere existence: `games.css` is loaded only by
the components under `games/`, so a class used outside that folder must be
defined outside that file. Confirmed by running it against the unfixed tree
and watching it fail on `.sr-only` before the fix went in. A gate that passes
on the bug it was written for is worse than no gate, because it is trusted.

## Cross-tab

`QUALITY_EVENT` is a `CustomEvent` and does not cross tabs — and since
navigating to the settings page unmounts the shelf, a second tab was the
*only* way the shelf's listener could ever have fired. `onQualityChange()`
now listens for `storage` as well, so a bench PC with the shelf in one tab and
settings in another stays in step.
