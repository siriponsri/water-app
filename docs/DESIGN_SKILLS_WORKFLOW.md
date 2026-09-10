# Design skill workflow for future Codex runs

The project is Vanilla HTML/CSS/JS. Do not convert it to React/Next unless the owner explicitly authorizes a rebuild. Read `DESIGN.md` before visual edits.

## Required order

1. Product brief and repository preflight.
2. Frontend craft: write the design rationale before code.
3. Hallmark: choose visual language and macrostructure inside existing implementation boundaries.
4. Implement HTML/CSS/JS using locked tokens.
5. Render screenshots at desktop and 320/375/414/768 widths when a local browser is available.
6. Design Taste critique for hierarchy, typography, spacing, realistic content, task clarity, responsive behavior, and accessibility.
7. Hallmark/no-slop audit for generic AI patterns.
8. Fix issues, render again, rerun automated checks, then stamp the artifact.

## Skill sources required by the project owner

- Hallmark: https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/SKILL.md
- Repaint: https://github.com/LucasSantana-Dev/repaint/blob/main/SKILL.md
- No Slop UI: https://github.com/LeoStehlik/no-slop-ui/blob/master/SKILL.md
- Design Taste: https://github.com/arez-xd/ux-ui-design-taste/blob/main/skills/design-taste/SKILL.md

If a skill is not installed in the Codex session, state that clearly, read the source link, and apply the relevant visual rules without claiming installation.

## Non-negotiable local rules

- Preserve Water, Air, and CV data boundaries.
- No decorative gradients/glass, invented metrics, fake charts, eyebrow labels, or transform hover.
- Use named CSS tokens only for new colours and fonts.
- All controls: keyboard path, visible focus, honest loading/error/success, 44 px target.
- Games remain training-only and local-only.
- Browser reachability checks never claim they connected Wi-Fi.

