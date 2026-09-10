# Design skills bundled with this project

Four third-party skills are vendored here so that any agent working in this
repository — Claude Code, Codex, Cursor — is held to the same standard the v7.1
interface was built to. Claude Code picks them up automatically from
`.claude/skills/`.

| Folder | Upstream | Licence | What it is for |
|---|---|---|---|
| `hallmark/` | [Nutlope/hallmark](https://github.com/Nutlope/hallmark) | MIT | The primary rule set. 21 macrostructures, nav/footer archetypes, a 58-gate slop test, and the `audit` / `redesign` / `study` verbs. **This is the one v7.1 was built against.** |
| `repaint/` | [LucasSantana-Dev/repaint](https://github.com/LucasSantana-Dev/repaint) | Apache-2.0 | Interaction quality: feedback, forgiving input, keyboard, recovery, accessibility and SEO, with a screenshot audit loop. |
| `no-slop-ui/` | [LeoStehlik/no-slop-ui](https://github.com/LeoStehlik/no-slop-ui) | MIT | A short, blunt reviewer's checklist for restraint. |
| `design-taste/` | [arez-xd/ux-ui-design-taste](https://github.com/arez-xd/ux-ui-design-taste) | MIT | Senior-designer judgment on components and pages: hierarchy, spacing, when to stop. |

Each folder keeps its upstream `LICENSE`. Nothing here has been edited; to
update one, re-copy it from upstream rather than patching it in place.

## Which to reach for

- **Building or rebuilding a page or a whole surface** → `hallmark`, then run
  its slop test before you hand back. Record the macrostructure and theme picks
  in `.hallmark/log.json` at the project root, as v7.1 did.
- **Reviewing what is already there** → `no-slop-ui` for the fast pass,
  `hallmark audit` for the ranked punch list.
- **A component that feels right but behaves poorly** — no focus states, no
  error recovery, no keyboard path → `repaint`.
- **"It is fine but it looks generated"** → `design-taste`.

## The rules this project already commits to

These come out of the v7.1 build and are not negotiable here, whichever skill
you are following (see `CLAUDE.md` and `DESIGN.md` § v7.1):

1. Every colour and every font resolves through a token in
   `apps/web/src/tokens.css`. Never inline a hex, an `oklch()`, or a font name.
2. No eyebrow labels above headings. No card inside a card. No card with a
   thick coloured side stripe. No three-column icon-above-heading grid. No
   italic headings.
3. Animate `transform` and `opacity` only, on the named easings and durations,
   always with a `prefers-reduced-motion` fallback. Focus rings appear
   instantly and are never transitioned.
4. Binder colour means a building and nothing else. Do not use a building hue
   decoratively, and do not use the reserve pink for Other Locations.
5. Invent no metrics, no record counts, and no controlled-label wording.
