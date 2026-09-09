# ANF3 Laboratory Records — design brief

Everything a design or motion session needs, and nothing it does not. **No
Google Sheets URLs, no real laboratory records, no controlled templates** are
in this folder — the full project contains all three and must not be uploaded
to a general chat.

## What this is

A read-only workspace a pharmacist uses at a lab bench: find a worksheet, read
what the System DB holds, preview it, print it from a controlled Word template.
It runs on Windows PCs inside a GMP microbiology laboratory (GPO, Bangkok).
The interface is Thai, with English technical terms kept in English.

It is not a marketing site. Its users are doing regulated work while standing
up, often in a hurry, sometimes in gloves. Legibility and calm beat delight.

## What is in this folder

| | |
|---|---|
| `screens/` | 16 screenshots — every main page, light and dark, at 1440×900 @2x |
| `css/tokens.css` | **The locked design system.** Every colour, space, font, easing and duration in the product resolves through a token here |
| `css/styles.css` | The application layout |
| `css/games.css` | The two training simulations |
| `motion/DeskScene.tsx` | The 3D shelf of box files (react-three-fiber). This is where motion lives today |
| `motion/theme.ts` | How the 3D scene reads its colours out of `tokens.css` at runtime |
| `motion/LabScene.tsx` | The 3D bench inside the games |
| `gates/contrast.mjs` | Measures every rendered colour pair and every token's sRGB gamut. **Run it** — `node gates/contrast.mjs` works inside this folder on its own |

## The rules a change has to survive

These are not preferences. Two of them are enforced by a script that fails the
build, and one is a safety rule.

1. **Every colour comes from `tokens.css`.** No inline hex, `oklch()`, `rgb()`
   or bare `font-family` anywhere else. Want a new colour? Add a named token.

2. **`gates/contrast.mjs` must pass.** It measures each rendered pair against
   its WCAG threshold *and* rejects any colour outside the sRGB gamut. A
   palette that looks good in a mockup but sits outside sRGB will be clamped by
   the browser into something else entirely — this catches that.
   ```
   node gates/contrast.mjs
   ```
   The full project has a second gate, `validate_styles.mjs`, which fails when
   a class name in the markup has no CSS rule behind it. It needs the component
   source, so it cannot run from this folder — but any CSS written here has to
   survive it once the change lands in the real repository.

3. **Binder colour means a building, and nothing else.** Blue is Building 10,
   violet Building 12, mint Building 16, amber Other Locations, pink is a
   reserved spare with no records behind it. Never decorative, never
   reassigned, never a gradient across two of them. Someone reads these colours
   to find a physical binder on a physical shelf.

4. **The binder hue is the loudest thing on screen.** Every neutral stays under
   0.02 chroma so the binder colours carry the page.

5. **Motion is `transform` and `opacity` only**, on the easings and durations
   named in `tokens.css`, and every animation needs a
   `prefers-reduced-motion: reduce` fallback. Focus rings appear instantly —
   never transition `outline`. Animating layout properties (width, top, margin)
   makes an eight-year-old lab PC stutter, and this software is used while
   somebody is holding a plate.

6. **Both themes, always.** Light and dark are both in daily use — the bench is
   bright, the office is not.

7. **No AI-slop patterns.** No eyebrow label above a heading, no card inside a
   card, no card with a thick coloured side stripe, no three-column
   icon-above-heading grid, no italic headings, no emoji as iconography.

8. **Never invent data.** A record count, a date, a worksheet number shown in a
   mockup must be marked as placeholder. In this domain a fabricated number in
   a screenshot can end up in a discussion about real records.

## Where a redesign would genuinely help

Honest list, most valuable first:

1. **The record workspace** (`screens/*-records.png`) — the page people spend
   their day in. The list, the filters and the detail sheet are functional but
   plain, and the relationship between "what I searched", "what I ticked" and
   "what I am about to print" could be much clearer.
2. **The shelf** (`screens/*-shelf.png`) — the 3D binders are the identity of
   the product. Currently they sit still. Opening a binder, moving along the
   shelf, and the tab switch are all candidates for motion that means
   something rather than decorates.
3. **Empty and loading states** — several pages show a plain box of text.
4. **The games** (`screens/*-games.png`, `*-game-play.png`) — the one place a
   little delight is appropriate, since nobody is under time pressure there.

## Where NOT to spend effort

- The print preview and the PDF pages themselves — the document layout is a
  controlled template, not a design surface.
- Anything that would add a colour meaning. The colour vocabulary is full.
- Density for its own sake. Empty space here is deliberate.
