# Microbiology Lab Mini-Games — Detailed Implementation Plan

> **Document purpose:** Handoff-ready implementation specification for building two short, Flash-style educational mini-games inside an existing microbiology laboratory web application.
>
> **Games in scope**
> 1. **Growth Promotion Simulation** — scenario-based media / organism / incubation / result-interpretation game.
> 2. **Feller Calculation Challenge** — positive-hole correction simulation for active microbial air sampling / sieve impactors.
>
> **Primary implementation target:** React + TypeScript web application. The domain logic is framework-independent and can be reused in Next.js, Vite, Remix, or an existing React SPA.
>
> **Important:** These games are **training / engagement features**, not the authoritative laboratory-result workflow. They must not silently write to, modify, approve, or calculate production laboratory results.

---

## 0. Executive Summary

The objective is to create two short educational games that can live inside a microbiology laboratory result-entry web app without making the application feel childish or turning training into a conventional quiz.

The design direction should feel like a **professional QC microbiology simulator with arcade interactions**:

- 30–120 second play sessions.
- Immediate visual feedback.
- Knowledge panel always available.
- Explain-after-answer learning.
- Deterministic scoring and calculations.
- Scenario data stored separately from game logic.
- Laboratory / GMP visual language rather than a generic “space-tech” or gaming dashboard.
- Responsive desktop-first UI with usable tablet/mobile layout.
- No dependence on paid APIs.
- No LLM required for gameplay.
- Fully testable offline.
- Synthetic training data only.
- Content and thresholds configurable from local JSON/TypeScript configuration.
- Production lab data and game data must remain logically separated.

The first game teaches the reasoning flow behind **Growth Promotion Testing (GPT)**. The second teaches why a **Feller / positive-hole correction** is necessary and how counted colonies are converted to a probable statistical total when an impactor has a finite number of holes.

---

# 1. Product Goals

## 1.1 Primary goals

The feature should:

1. Give users a short “lab break” inside a microbiology web app.
2. Reinforce core microbiological concepts while the user plays.
3. Teach *why* a rule exists, not only what button is correct.
4. Present technical knowledge in small contextual panels instead of long lessons.
5. Encourage replay through score, streaks, difficulty, and achievements.
6. Be safe to embed beside production laboratory workflows.
7. Be maintainable when SOPs, compendial interpretation, equipment, or local rules change.
8. Allow a trainer / admin to update scenarios without changing game-engine code.
9. Remain deterministic, explainable, and unit-testable.

## 1.2 Secondary goals

Possible later extensions:

- Training history.
- Personal best scores.
- Department leaderboard using aliases.
- Daily challenge.
- Competency mode.
- Supervisor-created scenario packs.
- Additional games: colony counting, dilution challenge, aseptic behavior, Gram-stain interpretation.

These are **not required for V1**.

---

# 2. Non-Goals / Guardrails

The game must **not**:

- Diagnose laboratory deviations.
- Replace an SOP, pharmacopeia, equipment manual, or validated calculation worksheet.
- Recalculate a production sample invisibly.
- Auto-approve a laboratory result.
- Read patient, batch, product, or sample identifiers merely to personalize gameplay.
- Use real production result values as “game questions.”
- Store scores in a regulated result table.
- represent a training score as analyst competency without a separately approved training program.
- hard-code organization-specific acceptance criteria in UI components.
- imply that a single general GPT rule applies to every pharmacopoeial test.
- assume every microbial air sampler has the same number of holes.

If production Feller calculation is later added to the actual laboratory workflow, it should be implemented as a **separately validated feature** even if it reuses the same tested mathematical utility.

---

# 3. Scientific / Domain Foundation

## 3.1 Growth Promotion Testing

The game should be designed around configurable **test profiles**, because growth-promotion requirements differ depending on the test, medium, compendial chapter, and local SOP.

Useful general concepts to teach:

- Each relevant batch/lot of media may require growth-promotion verification according to the applicable method.
- A small challenge inoculum is used.
- For pharmacopoeial microbial-limit growth-promotion examples, an inoculum of **not more than 100 CFU** is a common requirement.
- Solid-media acceptance may depend on quantitative recovery relative to a standardized inoculum / approved comparator.
- Liquid-media acceptance may be based on clearly visible growth comparable to an approved medium/control.
- Organism, medium, incubation temperature, incubation period, and interpretation all matter.
- Negative controls and method-specific controls matter.
- “Growth occurred” alone does not prove a test was executed correctly.

### Important implementation principle

Do not create a universal `if organism == X then temp == Y` rule inside a React component.

Instead:

```text
policy profile
    ↓
scenario
    ↓
game engine
    ↓
UI
```

Every scenario must state which rule/source it is based on.

## 3.2 Feller / Positive-Hole Correction

In a sieve impactor, air passes through a head containing a finite number of holes. At higher microbial loading, more than one viable particle can pass through the **same hole** and impact the agar at approximately the same location. The observed colony count can therefore underestimate the number of viable particles that arrived at the plate.

The Feller positive-hole model statistically corrects the observed number of positive holes / colonies.

For a sampling head containing `N` holes and observed count `r`:

\[
P_r
=
N
\left(
\frac{1}{N}
+
\frac{1}{N-1}
+
\frac{1}{N-2}
+
...
+
\frac{1}{N-r+1}
\right)
\]

Equivalent implementation:

\[
P_r = \sum_{i=0}^{r-1}\frac{N}{N-i}
\]

Where:

- `N` = number of holes in the perforated sampling head.
- `r` = observed colonies / positive holes used for the correction.
- `Pr` = probable statistical total.

Typical device configurations can differ. For example, MBV material describes 300-hole and 400-hole heads. Therefore, **N must be data/configuration**, not an assumed constant.

### Example reference checks

For a 400-hole head:

| Observed `r` | Rounded `Pr` |
|---:|---:|
| 1 | 1 |
| 21 | 22 |
| 50 | 53 |
| 100 | 115 |
| 200 | 277 |
| 300 | 553 |
| 399 | 2228 |
| 400 | 2628 |

For a 300-hole head:

| Observed `r` | Rounded `Pr` |
|---:|---:|
| 50 | 55 |
| 100 | 121 |
| 149 | 205 |
| 200 | 329 |
| 250 | 535 |
| 299 | 1585 |
| 300 | 1885 |

These values are useful as unit-test fixtures.

---

# 4. Shared Product Experience

## 4.1 Entry point

Add a lightweight entry point separate from normal result entry:

```text
Laboratory
├── Results
├── Water
├── Environmental Monitoring
├── Cleaning Validation
└── Lab Playroom   ← new
```

Alternative: a small `Lab Break` action in the app header.

Do not show modal game invitations while an analyst is actively entering or approving a result.

## 4.2 Lab Playroom home

Recommended layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Lab Playroom                                      1,850 XP   │
│ Short microbiology challenges. Training data only.           │
│                                                              │
│ ┌──────────────────────┐  ┌───────────────────────────────┐  │
│ │ 🧫 Growth Promotion  │  │ 🌬 Feller Challenge          │  │
│ │ Media Lab            │  │ Air Sampling                 │  │
│ │                      │  │                               │  │
│ │ Best 1,240           │  │ Best 980                      │  │
│ │ [ Play ]             │  │ [ Play ]                      │  │
│ └──────────────────────┘  └───────────────────────────────┘  │
│                                                              │
│ Knowledge Cards                                              │
│ GPT Basics • Why Positive-Hole Correction? • Air Volume      │
└──────────────────────────────────────────────────────────────┘
```

## 4.3 Shared visual language

Use a **clean pharmaceutical laboratory aesthetic**:

- White / warm neutral base.
- Dark charcoal text.
- Muted clinical green/teal for correct states.
- Salmon/orange for warnings.
- Light yellow for hints / knowledge.
- Red only for incorrect / critical states.
- Agar plates, incubators, media bottles, air-sampler heads, and microorganisms can be illustrated using SVG/CSS.
- Avoid neon sci-fi interfaces.
- Avoid excessive glassmorphism.
- Avoid huge gradients.
- Avoid “AI dashboard” visual clichés.

## 4.4 Session duration

Recommended:

- Quick Play: 45–90 seconds.
- Practice: untimed.
- Challenge: 90–120 seconds.
- Daily challenge: future feature.

## 4.5 Shared game states

Every game should use the same state machine:

```text
idle
  ↓
briefing
  ↓
playing
  ↓
answer_locked
  ↓
explanation
  ↓
next_round
  ↓
summary
```

Never reveal correctness on hover before the answer is submitted.

---

# 5. Game 1 — Growth Promotion Simulation

## 5.1 Working title

**Media Lab — Growth Promotion Challenge**

Other possible names:

- Growth Lab
- Media Rescue
- Culture Quest
- GPT Simulator

Recommended user-facing name: **Media Lab**  
Subtitle: **Growth Promotion Challenge**

This sounds professional enough to live inside a QC application.

---

## 5.2 Learning objectives

After playing, a user should better understand that GPT depends on:

1. Correct medium.
2. Appropriate challenge organism.
3. Correct inoculum condition.
4. Correct incubation temperature.
5. Correct incubation duration.
6. Correct positive/negative control behavior.
7. Correct acceptance interpretation.
8. Method-specific rather than universal rules.

---

## 5.3 Core game fantasy

The player is a microbiologist preparing a batch of culture medium for use.

A “test tray” moves through a small virtual lab:

```text
SELECT MEDIUM
      ↓
SELECT ORGANISM
      ↓
SET INOCULUM
      ↓
SET INCUBATION
      ↓
SIMULATE
      ↓
INTERPRET RESULT
      ↓
RELEASE / HOLD
```

The player earns points for each technically appropriate decision.

---

## 5.4 Main modes

### Mode A — Guided Practice

- No timer.
- Knowledge panel open by default.
- Wrong answers do not immediately end the round.
- “Why?” explanation shown after each decision.
- Best for onboarding.

### Mode B — Quick Shift

- 60–90 second timer.
- Knowledge panel collapsed but accessible.
- 5–7 scenarios.
- Combo multiplier.

### Mode C — Investigation

- Deliberately flawed setup.
- User identifies one or more problems.
- Example: inoculum too high + incorrect incubation.
- Higher score.

V1 should implement **Guided Practice + Quick Shift**. Investigation mode may be included if time permits.

---

# 6. Growth Promotion Gameplay

## 6.1 Round type 1 — Match the setup

Example prompt:

> A new batch of Soybean-Casein Digest Agar requires growth-promotion verification under the selected policy profile.

User chooses:

```text
Organism
[ S. aureus ] [ C. albicans ] [ A. brasiliensis ] [...]

Inoculum
[ ≤100 CFU ] [ 1,000 CFU ] [ 10,000 CFU ]

Incubation
[ option A ] [ option B ] [ option C ]

[ Run Simulation ]
```

The exact organism / condition combinations come from the policy profile.

## 6.2 Round type 2 — Spot the setup defect

Display a virtual worksheet:

```text
Medium:        TSA
Organism:      S. aureus
Inoculum:      1,100 CFU     ⚠
Temperature:   30–35 °C
Duration:      configured profile
```

Question:

> Which parameter makes this setup unsuitable under this scenario?

The player taps the incorrect field.

## 6.3 Round type 3 — Interpret plate recovery

Show:

```text
Reference / standardized inoculum: 52 CFU
Test medium recovery:               47 CFU

Recovery ratio: 0.90×
```

The user chooses:

- Accept
- Hold / investigate
- Insufficient information

The engine evaluates according to the scenario profile.

## 6.4 Round type 4 — Liquid medium observation

Show animated turbidity:

```text
Control medium: clearly visible growth
Test medium:    clearly visible growth
Negative ctrl:  clear
```

Question:

> What is the best interpretation?

This is especially useful to teach that liquid-media interpretation differs from a colony-count comparison.

## 6.5 Round type 5 — Control failure

Example:

```text
Test medium: growth
Positive control: growth
Negative control: growth
```

Correct decision:

> Do not release the interpretation as valid; control failure requires investigation / repeat according to the applicable procedure.

The exact wording should remain SOP-configurable.

---

# 7. Growth Promotion Knowledge Panel

The panel should be contextual, not a long static manual.

## 7.1 Default cards

### Card: “Why GPT?”

> Growth-promotion testing provides evidence that the culture medium can support the expected microorganisms under the defined test conditions.

### Card: “Low inoculum matters”

> A small challenge population tests whether the medium can recover microorganisms without relying on an unrealistically heavy inoculum.

### Card: “Solid vs liquid”

> Solid-media assessment may use quantitative recovery, while some liquid-media tests use clearly visible growth compared with an approved control. The applicable method defines the rule.

### Card: “Controls”

> A failed control can invalidate the interpretation even when the test vessel appears to show the expected growth.

### Card: “One rule does not fit all”

> Medium, organism, inoculum, incubation and acceptance criteria must come from the applicable method / SOP.

## 7.2 Contextual panel behavior

When the user gets an answer wrong:

```text
Why this matters
────────────────────────
The inoculum exceeds the configured limit for this scenario.

Rule in this training profile
≤ 100 CFU

Source
TP / internal training profile XXX
```

Use a compact `View source rule` link or drawer.

---

# 8. Growth Promotion Scenario Data Model

Create scenario content independently from UI.

```ts
export type GrowthPromotionScenario = {
  id: string;
  title: string;
  difficulty: 1 | 2 | 3;
  policyProfileId: string;

  medium: {
    id: string;
    label: string;
    form: "solid" | "liquid";
  };

  challenge: {
    allowedOrganismIds: string[];
    inoculum: {
      minCfu?: number;
      maxCfu?: number;
      label: string;
    };
    incubationRuleId: string;
  };

  interpretation:
    | {
        type: "quantitative-recovery";
        lowerRatio?: number;
        upperRatio?: number;
      }
    | {
        type: "visible-growth";
        requireNegativeControlClear: boolean;
      };

  distractors: {
    organismIds?: string[];
    inoculumValues?: number[];
    incubationRuleIds?: string[];
  };

  knowledgeCardIds: string[];
  sourceRefs: string[];
};
```

## 8.1 Policy profiles

```ts
export type MicrobiologyPolicyProfile = {
  id: string;
  name: string;
  version: string;
  effectiveDate?: string;
  status: "training" | "approved-training";
  sourceRefs: string[];

  organisms: Record<
    string,
    {
      scientificName: string;
      strainLabel?: string;
      category: "bacterium" | "yeast" | "mould" | "other";
    }
  >;

  incubationRules: Record<
    string,
    {
      temperatureLabel: string;
      durationLabel: string;
    }
  >;
};
```

The initial starter pack can contain a pharmacopoeial-inspired training profile, but production deployment should replace/approve it against the organization’s SOP.

---

# 9. Growth Promotion Scoring

Suggested score:

```text
Correct organism                     +100
Correct inoculum                     +100
Correct incubation                   +100
Correct interpretation               +150
Correct control interpretation       +150
Fast answer bonus                    0–50
Perfect round                        +100
Hint used                            -25
```

Combo:

```text
2 correct rounds → ×1.1
3 correct rounds → ×1.2
4 correct rounds → ×1.4
5+ correct rounds → ×1.5 max
```

Do not use punitive negative scores in Practice Mode.

---

# 10. Game 2 — Feller Calculation Challenge

## 10.1 Working title

**Air Count — Feller Challenge**

Alternative names:

- Positive Hole
- Air Sampler Lab
- Feller Formula Frenzy
- Impactor Challenge

Recommended user-facing name:

> **Air Count**  
> *Feller Positive-Hole Challenge*

This keeps the concept understandable even for someone who has forgotten the name “Feller.”

---

# 11. Feller Learning Objectives

After playing, the user should understand:

1. Why the raw colony count can underestimate airborne viable particles.
2. Why a perforated impactor head needs statistical correction.
3. What `N`, `r`, and `Pr` mean.
4. Why the number of holes depends on the sampling head.
5. Why correction becomes larger as occupancy increases.
6. How to use the corrected result in a concentration calculation when sampling volume is known.
7. Why the equipment-specific head configuration must be verified.

---

# 12. Feller Game — Core Visual Concept

The most important design requirement is to make the **collision problem visible**.

A top-down sampling head is displayed:

```text
● ● ● ● ● ● ● ●
● ● ● ● ● ● ● ●
● ● ● ● ● ● ● ●
● ● ● ● ● ● ● ●
```

During the animation:

- Microbial particles descend.
- Some hit unused holes.
- Some pass through a hole already used by another particle.
- The plate displays one visible colony position for the positive hole.
- The simulation shows:

```text
Viable particles arriving        63
Visible positive holes           57
Why the difference?              Multiple hits
```

Then reveal:

```text
Feller corrected probable total ≈ 63
```

The animation is educational only; the deterministic question values should be generated from predefined or seeded scenarios.

---

# 13. Feller Game Modes

## Mode A — “Why Correction?”

Visual simulation.

User predicts:

> Will the corrected count be lower, equal, or higher than the observed count?

Then the game explains occupancy collision.

## Mode B — “Calculate Pr”

Given:

```text
Head: 300 holes
Observed colonies r: 50
```

Player chooses or enters:

```text
Pr = ?
```

Correct rounded answer:

```text
55
```

## Mode C — “Choose the Head”

Given an instrument/setup, user chooses:

```text
[ 300 holes ] [ 400 holes ]
```

Then performs correction.

Do not assume brand/model mappings unless they are explicitly stored in approved equipment configuration.

## Mode D — “From Plate to CFU/m³”

Given:

```text
Corrected Pr = 55
Sampled air volume = 500 L
```

Use:

\[
CFU/m^3 = Pr \times \frac{1000}{sampleVolumeLiters}
\]

Result:

```text
55 × 1000/500 = 110 CFU/m³
```

This mode should be clearly labeled as an extension **after** positive-hole correction.

---

# 14. Feller Game Round Progression

## Level 1 — Intuition

No arithmetic.

Questions:

- Why is correction required?
- Does the corrected count tend to increase or decrease?
- What does `N` mean?

## Level 2 — Read the table

Show a conversion card.

Player finds:

```text
N = 400
r = 50
Pr = ?
```

## Level 3 — Formula builder

Drag blocks:

```text
N
r
Σ
N/(N-i)
```

into the formula structure.

## Level 4 — Calculation

Player enters corrected result.

## Level 5 — Air concentration

Use corrected result + sample volume.

## Level 6 — Saturation warning

Present `r` very near `N`.

Teach that high occupancy makes statistical correction very large and interpretation must respect the equipment method / SOP.

---

# 15. Feller Knowledge Panel

## Card: “The positive-hole problem”

> More than one viable particle can pass through the same aperture. A single positive impact location may therefore represent multiple viable particles.

## Card: “r vs Pr”

- `r` = observed positive holes / counted colonies used for correction.
- `Pr` = statistically probable total after positive-hole correction.

## Card: “N matters”

> `N` is the number of apertures in the sampling head. Different heads may use different values. Never assume the value without the equipment configuration.

## Card: “Why correction grows”

> When few holes are occupied, another particle is likely to hit an unused hole. As occupancy rises, repeated hits become increasingly likely, so the correction grows non-linearly.

## Card: “From corrected count to concentration”

> When the sampled air volume is known, the corrected total can be normalized to a cubic metre according to the applicable sampling procedure.

---

# 16. Feller Calculation Engine — Starter Code

Create:

`src/features/lab-games/domain/feller.ts`

```ts
export type FellerInput = {
  observed: number;
  holes: number;
};

export type FellerResult = {
  observed: number;
  holes: number;
  probableExact: number;
  probableRounded: number;
  occupancy: number;
  correctionFactor: number;
};

/**
 * Feller positive-hole statistical correction.
 *
 * Pr = sum(i = 0..r-1) N / (N - i)
 *
 * r: observed positive holes / colonies
 * N: number of holes in the sampling head
 */
export function calculateFeller({
  observed,
  holes,
}: FellerInput): FellerResult {
  if (!Number.isInteger(holes) || holes <= 0) {
    throw new Error("holes must be a positive integer");
  }

  if (!Number.isInteger(observed) || observed < 0) {
    throw new Error("observed must be a non-negative integer");
  }

  if (observed > holes) {
    throw new Error("observed cannot exceed number of holes");
  }

  if (observed === 0) {
    return {
      observed,
      holes,
      probableExact: 0,
      probableRounded: 0,
      occupancy: 0,
      correctionFactor: 1,
    };
  }

  let probableExact = 0;

  for (let i = 0; i < observed; i += 1) {
    probableExact += holes / (holes - i);
  }

  return {
    observed,
    holes,
    probableExact,
    probableRounded: Math.round(probableExact),
    occupancy: observed / holes,
    correctionFactor: probableExact / observed,
  };
}

export function calculateCfuPerM3(
  probableCount: number,
  sampleVolumeLiters: number
): number {
  if (!Number.isFinite(probableCount) || probableCount < 0) {
    throw new Error("probableCount must be >= 0");
  }

  if (!Number.isFinite(sampleVolumeLiters) || sampleVolumeLiters <= 0) {
    throw new Error("sampleVolumeLiters must be > 0");
  }

  return probableCount * (1000 / sampleVolumeLiters);
}
```

---

# 17. Feller Unit Tests — Starter Code

Create:

`src/features/lab-games/domain/feller.test.ts`

Example using Vitest:

```ts
import { describe, expect, it } from "vitest";
import {
  calculateCfuPerM3,
  calculateFeller,
} from "./feller";

describe("calculateFeller", () => {
  it("returns zero for zero observed colonies", () => {
    expect(
      calculateFeller({
        holes: 400,
        observed: 0,
      }).probableRounded
    ).toBe(0);
  });

  it.each([
    [400, 1, 1],
    [400, 21, 22],
    [400, 50, 53],
    [400, 100, 115],
    [400, 200, 277],
    [400, 300, 553],
    [400, 399, 2228],
    [400, 400, 2628],

    [300, 50, 55],
    [300, 100, 121],
    [300, 149, 205],
    [300, 200, 329],
    [300, 250, 535],
    [300, 299, 1585],
    [300, 300, 1885],
  ])(
    "N=%i r=%i should round to Pr=%i",
    (holes, observed, expected) => {
      const result = calculateFeller({
        holes,
        observed,
      });

      expect(result.probableRounded).toBe(expected);
    }
  );

  it("rejects observed > holes", () => {
    expect(() =>
      calculateFeller({
        holes: 300,
        observed: 301,
      })
    ).toThrow();
  });
});

describe("calculateCfuPerM3", () => {
  it("normalizes a 500 L sample to cubic metre", () => {
    expect(calculateCfuPerM3(55, 500)).toBe(110);
  });

  it("returns the same value for a 1000 L sample", () => {
    expect(calculateCfuPerM3(55, 1000)).toBe(55);
  });
});
```

These tests are a delivery gate. Do not ship the game with an untested formula.

---

# 18. Feller Scenario Generator — Starter Code

Create:

`src/features/lab-games/domain/fellerScenario.ts`

```ts
import { calculateFeller } from "./feller";

export type FellerScenario = {
  id: string;
  holes: number;
  observed: number;
  expectedPr: number;
  sampleVolumeLiters?: number;
  expectedCfuPerM3?: number;
  difficulty: 1 | 2 | 3;
};

export function createFellerScenario(
  id: string,
  holes: number,
  observed: number,
  sampleVolumeLiters?: number
): FellerScenario {
  const result = calculateFeller({
    holes,
    observed,
  });

  const expectedCfuPerM3 =
    sampleVolumeLiters == null
      ? undefined
      : result.probableRounded * (1000 / sampleVolumeLiters);

  return {
    id,
    holes,
    observed,
    expectedPr: result.probableRounded,
    sampleVolumeLiters,
    expectedCfuPerM3,
    difficulty:
      result.occupancy < 0.2
        ? 1
        : result.occupancy < 0.6
          ? 2
          : 3,
  };
}
```

For V1, prefer curated scenario fixtures instead of uncontrolled random questions. Seeded random generation can be added after validation.

---

# 19. Growth Promotion Domain Engine — Starter Code

Create:

`src/features/lab-games/domain/growthPromotion.ts`

```ts
export type GrowthPromotionDecision = {
  organismId: string;
  inoculumCfu: number;
  incubationRuleId: string;
};

export type GrowthPromotionRule = {
  allowedOrganismIds: string[];
  minInoculumCfu?: number;
  maxInoculumCfu?: number;
  allowedIncubationRuleIds: string[];
};

export type GrowthPromotionEvaluation = {
  pass: boolean;
  checks: {
    organism: boolean;
    inoculum: boolean;
    incubation: boolean;
  };
  messages: string[];
};

export function evaluateGrowthPromotionSetup(
  decision: GrowthPromotionDecision,
  rule: GrowthPromotionRule
): GrowthPromotionEvaluation {
  const organism = rule.allowedOrganismIds.includes(
    decision.organismId
  );

  const inoculum =
    (rule.minInoculumCfu == null ||
      decision.inoculumCfu >= rule.minInoculumCfu) &&
    (rule.maxInoculumCfu == null ||
      decision.inoculumCfu <= rule.maxInoculumCfu);

  const incubation =
    rule.allowedIncubationRuleIds.includes(
      decision.incubationRuleId
    );

  const messages: string[] = [];

  if (!organism) {
    messages.push(
      "The selected challenge organism does not match this training profile."
    );
  }

  if (!inoculum) {
    messages.push(
      "The inoculum is outside the configured range for this training profile."
    );
  }

  if (!incubation) {
    messages.push(
      "The incubation condition does not match this training profile."
    );
  }

  return {
    pass: organism && inoculum && incubation,
    checks: {
      organism,
      inoculum,
      incubation,
    },
    messages,
  };
}
```

---

# 20. Quantitative Recovery Evaluation — Starter Code

Create:

`src/features/lab-games/domain/recovery.ts`

```ts
export type RecoveryInput = {
  referenceCfu: number;
  testCfu: number;
  lowerRatio?: number;
  upperRatio?: number;
};

export type RecoveryEvaluation = {
  ratio: number;
  pass: boolean;
  reason: string;
};

export function evaluateRecovery({
  referenceCfu,
  testCfu,
  lowerRatio = 0.5,
  upperRatio = 2,
}: RecoveryInput): RecoveryEvaluation {
  if (!Number.isFinite(referenceCfu) || referenceCfu <= 0) {
    throw new Error("referenceCfu must be > 0");
  }

  if (!Number.isFinite(testCfu) || testCfu < 0) {
    throw new Error("testCfu must be >= 0");
  }

  const ratio = testCfu / referenceCfu;

  const pass =
    ratio >= lowerRatio &&
    ratio <= upperRatio;

  return {
    ratio,
    pass,
    reason: pass
      ? "Recovery is within the configured training range."
      : "Recovery is outside the configured training range.",
  };
}
```

**Important:** `0.5–2.0` here is an example implementation of a “factor of 2” training interpretation. The production training profile must document the exact intended method and acceptance wording. Do not silently reuse this helper for unrelated GPT methods.

---

# 21. Sample Training Policy

Create:

`src/features/lab-games/data/policy.training.ts`

```ts
import type {
  MicrobiologyPolicyProfile,
} from "../types";

export const trainingPolicy: MicrobiologyPolicyProfile = {
  id: "pharma-micro-training-v1",
  name: "Pharmaceutical Microbiology Training",
  version: "1.0.0",
  status: "training",
  sourceRefs: [
    "TP_MICROBIAL_LIMITS",
    "MBV_FELLER_MANUAL",
  ],

  organisms: {
    s_aureus: {
      scientificName: "Staphylococcus aureus",
      category: "bacterium",
    },

    b_subtilis: {
      scientificName: "Bacillus subtilis",
      category: "bacterium",
    },

    c_albicans: {
      scientificName: "Candida albicans",
      category: "yeast",
    },

    a_brasiliensis: {
      scientificName: "Aspergillus brasiliensis",
      category: "mould",
    },
  },

  incubationRules: {
    bacteria_example: {
      temperatureLabel: "Configured bacterial incubation",
      durationLabel: "Per selected method",
    },

    fungi_example: {
      temperatureLabel: "Configured fungal incubation",
      durationLabel: "Per selected method",
    },
  },
};
```

Do not present placeholders such as `Configured bacterial incubation` to users in the final build. Work should replace them with an approved scenario pack.

---

# 22. Shared Type Definitions

Create:

`src/features/lab-games/types.ts`

```ts
export type GameId =
  | "growth-promotion"
  | "feller";

export type GameMode =
  | "practice"
  | "quick"
  | "challenge";

export type GamePhase =
  | "idle"
  | "briefing"
  | "playing"
  | "answer-locked"
  | "explanation"
  | "summary";

export type KnowledgeCard = {
  id: string;
  title: string;
  body: string;
  category:
    | "concept"
    | "formula"
    | "pitfall"
    | "sop"
    | "tip";
  sourceRefs?: string[];
};

export type ScoreEvent = {
  id: string;
  points: number;
  reason: string;
};

export type GameSessionSummary = {
  gameId: GameId;
  mode: GameMode;
  score: number;
  correct: number;
  total: number;
  durationMs: number;
  completedAt: string;
};
```

---

# 23. Suggested Front-End Folder Structure

```text
src/
└── features/
    └── lab-games/
        ├── components/
        │   ├── LabPlayroom.tsx
        │   ├── GameShell.tsx
        │   ├── GameHeader.tsx
        │   ├── GameSummary.tsx
        │   ├── KnowledgePanel.tsx
        │   ├── ScoreMeter.tsx
        │   ├── TimerBar.tsx
        │   └── FeedbackToast.tsx
        │
        ├── growth-promotion/
        │   ├── GrowthPromotionGame.tsx
        │   ├── MediaCard.tsx
        │   ├── OrganismPicker.tsx
        │   ├── IncubatorControl.tsx
        │   ├── PlateResult.tsx
        │   └── GrowthResult.tsx
        │
        ├── feller/
        │   ├── FellerGame.tsx
        │   ├── SamplingHead.tsx
        │   ├── ParticleSimulation.tsx
        │   ├── FormulaBuilder.tsx
        │   ├── PositiveHoleGrid.tsx
        │   └── AirVolumeRound.tsx
        │
        ├── domain/
        │   ├── feller.ts
        │   ├── feller.test.ts
        │   ├── fellerScenario.ts
        │   ├── growthPromotion.ts
        │   ├── growthPromotion.test.ts
        │   ├── recovery.ts
        │   └── recovery.test.ts
        │
        ├── data/
        │   ├── policy.training.ts
        │   ├── growthPromotionScenarios.ts
        │   ├── fellerScenarios.ts
        │   ├── knowledgeCards.ts
        │   └── references.ts
        │
        ├── hooks/
        │   ├── useGameSession.ts
        │   └── useCountdown.ts
        │
        ├── styles/
        │   └── lab-games.css
        │
        ├── types.ts
        └── index.ts
```

---

# 24. Shared Game Shell — Starter React Code

`GameShell.tsx`

```tsx
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  score: number;
  children: ReactNode;
  knowledge: ReactNode;
  onExit: () => void;
};

export function GameShell({
  title,
  subtitle,
  score,
  children,
  knowledge,
  onExit,
}: Props) {
  return (
    <section className="lab-game-shell">
      <header className="lab-game-header">
        <div>
          <p className="lab-game-eyebrow">LAB PLAYROOM</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <div className="lab-game-header__actions">
          <output aria-label="Current score">
            {score.toLocaleString()} pts
          </output>

          <button type="button" onClick={onExit}>
            Exit
          </button>
        </div>
      </header>

      <div className="lab-game-layout">
        <main className="lab-game-stage">
          {children}
        </main>

        <aside
          className="lab-game-knowledge"
          aria-label="Knowledge panel"
        >
          {knowledge}
        </aside>
      </div>
    </section>
  );
}
```

---

# 25. Knowledge Panel — Starter React Code

```tsx
import type { KnowledgeCard } from "../types";

type Props = {
  cards: KnowledgeCard[];
  activeCardId?: string;
};

export function KnowledgePanel({
  cards,
  activeCardId,
}: Props) {
  return (
    <div>
      <div className="knowledge-heading">
        <span aria-hidden="true">▦</span>
        <div>
          <strong>Knowledge Panel</strong>
          <p>Why the rule matters</p>
        </div>
      </div>

      <div className="knowledge-list">
        {cards.map((card) => (
          <article
            key={card.id}
            className={
              card.id === activeCardId
                ? "knowledge-card is-active"
                : "knowledge-card"
            }
          >
            <small>{card.category}</small>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
```

---

# 26. Positive-Hole Grid — Starter React Code

The grid should be an **educational visualization**, not the source of the mathematical result.

```tsx
type Props = {
  holes: number;
  occupied: number;
};

export function PositiveHoleGrid({
  holes,
  occupied,
}: Props) {
  const displayHoles = Math.min(holes, 100);

  const occupiedDisplay = Math.round(
    (occupied / holes) * displayHoles
  );

  return (
    <div
      className="positive-hole-grid"
      role="img"
      aria-label={`${occupied} of ${holes} sampling head holes are represented as occupied`}
    >
      {Array.from({
        length: displayHoles,
      }).map((_, index) => (
        <span
          key={index}
          className={
            index < occupiedDisplay
              ? "hole is-positive"
              : "hole"
          }
        />
      ))}

      {holes > displayHoles && (
        <p className="grid-note">
          Schematic visualization:
          {displayHoles} displayed points represent
          a {holes}-hole sampling head.
        </p>
      )}
    </div>
  );
}
```

**Do not render 300–400 animated DOM nodes on low-end devices unless performance is verified.** A simplified 60–100 point visualization is enough if it is clearly labeled schematic.

---

# 27. Example Feller Game Component

```tsx
import { useMemo, useState } from "react";
import { calculateFeller } from "../domain/feller";

export function FellerRound() {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const scenario = {
    holes: 300,
    observed: 50,
  };

  const result = useMemo(
    () => calculateFeller(scenario),
    []
  );

  const numericAnswer = Number(answer);
  const correct =
    Number.isFinite(numericAnswer) &&
    numericAnswer === result.probableRounded;

  function submit() {
    if (answer.trim() === "") return;
    setSubmitted(true);
  }

  return (
    <section>
      <div className="scenario-callout">
        <span>Sampling head</span>
        <strong>{scenario.holes} holes</strong>

        <span>Observed colonies</span>
        <strong>{scenario.observed}</strong>
      </div>

      <label>
        Probable statistical total (Pr)
        <input
          inputMode="numeric"
          value={answer}
          disabled={submitted}
          onChange={(event) =>
            setAnswer(event.target.value)
          }
        />
      </label>

      <button
        type="button"
        disabled={submitted || answer.trim() === ""}
        onClick={submit}
      >
        Check answer
      </button>

      {submitted && (
        <div
          role="status"
          className={
            correct
              ? "result is-correct"
              : "result is-incorrect"
          }
        >
          <strong>
            {correct
              ? "Correct"
              : "Not quite"}
          </strong>

          <p>
            Pr = {result.probableRounded}
          </p>

          <p>
            The raw count is corrected upward because
            multiple viable particles may pass through
            the same sampling aperture.
          </p>
        </div>
      )}
    </section>
  );
}
```

---

# 28. Example Growth-Promotion Round Component

```tsx
import { useState } from "react";
import {
  evaluateGrowthPromotionSetup,
} from "../domain/growthPromotion";

export function GrowthPromotionRound() {
  const [organismId, setOrganismId] =
    useState("s_aureus");

  const [inoculumCfu, setInoculumCfu] =
    useState(50);

  const [incubationRuleId, setIncubationRuleId] =
    useState("bacteria_example");

  const [feedback, setFeedback] =
    useState<ReturnType<
      typeof evaluateGrowthPromotionSetup
    > | null>(null);

  const rule = {
    allowedOrganismIds: ["s_aureus"],
    maxInoculumCfu: 100,
    allowedIncubationRuleIds: [
      "bacteria_example",
    ],
  };

  function runSimulation() {
    setFeedback(
      evaluateGrowthPromotionSetup(
        {
          organismId,
          inoculumCfu,
          incubationRuleId,
        },
        rule
      )
    );
  }

  return (
    <section>
      <header>
        <p>New medium batch</p>
        <h2>Build the GPT setup</h2>
      </header>

      <label>
        Challenge organism
        <select
          value={organismId}
          onChange={(event) =>
            setOrganismId(event.target.value)
          }
        >
          <option value="s_aureus">
            Staphylococcus aureus
          </option>
          <option value="c_albicans">
            Candida albicans
          </option>
        </select>
      </label>

      <label>
        Inoculum (CFU)
        <input
          type="number"
          min={0}
          value={inoculumCfu}
          onChange={(event) =>
            setInoculumCfu(
              Number(event.target.value)
            )
          }
        />
      </label>

      <label>
        Incubation profile
        <select
          value={incubationRuleId}
          onChange={(event) =>
            setIncubationRuleId(
              event.target.value
            )
          }
        >
          <option value="bacteria_example">
            Bacterial training profile
          </option>
          <option value="fungi_example">
            Fungal training profile
          </option>
        </select>
      </label>

      <button
        type="button"
        onClick={runSimulation}
      >
        Run simulation
      </button>

      {feedback && (
        <div role="status">
          <strong>
            {feedback.pass
              ? "Setup accepted"
              : "Review the setup"}
          </strong>

          {feedback.messages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
    </section>
  );
}
```

This component is a starter only. The final UI should use cards / graphical controls rather than look like an ordinary administrative form.

---

# 29. Game Session Hook — Starter Code

```ts
import { useCallback, useRef, useState } from "react";

export function useGameSession() {
  const startedAtRef = useRef<number | null>(null);

  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [combo, setCombo] = useState(0);

  const start = useCallback(() => {
    startedAtRef.current = Date.now();
    setScore(0);
    setCorrect(0);
    setTotal(0);
    setCombo(0);
  }, []);

  const recordAnswer = useCallback(
    (isCorrect: boolean, basePoints: number) => {
      setTotal((value) => value + 1);

      if (!isCorrect) {
        setCombo(0);
        return;
      }

      setCorrect((value) => value + 1);

      setCombo((previousCombo) => {
        const nextCombo = previousCombo + 1;

        const multiplier = Math.min(
          1.5,
          1 + nextCombo * 0.1
        );

        setScore(
          (value) =>
            value +
            Math.round(basePoints * multiplier)
        );

        return nextCombo;
      });
    },
    []
  );

  return {
    score,
    correct,
    total,
    combo,
    start,
    recordAnswer,
  };
}
```

---

# 30. Knowledge Card Data — Starter

```ts
import type { KnowledgeCard } from "../types";

export const knowledgeCards: KnowledgeCard[] = [
  {
    id: "gpt-purpose",
    category: "concept",
    title: "Why growth promotion?",
    body:
      "The test demonstrates that the selected culture medium can support the expected challenge microorganism under the defined test conditions.",
  },

  {
    id: "gpt-low-inoculum",
    category: "concept",
    title: "Why a small inoculum?",
    body:
      "A low challenge population tests the recovery capability of the medium without masking poor performance with an unrealistically heavy inoculum.",
    sourceRefs: ["TP_MICROBIAL_LIMITS"],
  },

  {
    id: "feller-positive-hole",
    category: "concept",
    title: "The positive-hole effect",
    body:
      "Two or more viable particles may pass through the same aperture and appear as one positive impact location, so the observed count can underestimate the probable total.",
    sourceRefs: ["MBV_FELLER_MANUAL"],
  },

  {
    id: "feller-n",
    category: "formula",
    title: "N is equipment-specific",
    body:
      "N represents the number of holes in the sampling head. The game must load it from the selected equipment configuration.",
  },
];
```

---

# 31. References Registry — Starter

Create one source registry rather than duplicating links throughout scenarios.

```ts
export const microbiologyReferences = {
  TP_MICROBIAL_LIMITS: {
    title:
      "Thai Pharmacopoeia — Microbial Limit Tests",
    owner:
      "Department of Medical Sciences, Thailand",
    url:
      "https://bdn-tp.dmsc.moph.go.th/ebook/qQMcA3t0pR9gC3q0GT5gMJq0qT5co3uw",
  },

  THERMO_GPT_GUIDE: {
    title:
      "Pharmaceutical Microbiology Manual",
    owner:
      "Thermo Fisher Scientific",
    url:
      "https://assets.thermofisher.com/TFS-Assets/MBD/manuals/Pharmaceutical-Microbiology-Manual-EN-LT2629A.pdf",
  },

  MBV_FELLER_MANUAL: {
    title:
      "MAS-100 Atmos User Manual",
    owner:
      "MBV AG",
    url:
      "https://www.mbv.ch/media/user_manual_compresses_gas_sampler_mas-100_atmos.pdf",
  },

  MBV_MAS100_NT: {
    title:
      "MAS-100 NT product information",
    owner:
      "MBV AG",
    url:
      "https://www.mbv.ch/en/microbial-air-samplers/mas-100-nt/mas-100-nt-hepa/",
  },
} as const;
```

Before production release, verify the latest organization-approved primary references and SOP revisions.

---

# 32. Styling Starter

If the existing application already uses Tailwind, follow its design tokens.

If not, a minimal CSS base:

```css
.lab-game-shell {
  --game-text: #202321;
  --game-muted: #68706b;
  --game-border: #dfe5e1;
  --game-surface: #ffffff;
  --game-soft: #f5f7f5;
  --game-good: #2d7252;
  --game-warning: #c96d52;
  --game-hint: #f7eec4;

  color: var(--game-text);
}

.lab-game-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.lab-game-layout {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    minmax(260px, 340px);
  gap: 1.25rem;
}

.lab-game-stage,
.lab-game-knowledge {
  border: 1px solid var(--game-border);
  border-radius: 18px;
  background: var(--game-surface);
}

.lab-game-stage {
  min-height: 420px;
  padding: 1.25rem;
}

.lab-game-knowledge {
  padding: 1rem;
}

.knowledge-card {
  padding: 0.9rem 0;
  border-top: 1px solid var(--game-border);
}

.knowledge-card.is-active {
  background: var(--game-hint);
  border-radius: 12px;
  padding-inline: 0.8rem;
}

.positive-hole-grid {
  display: grid;
  grid-template-columns:
    repeat(10, minmax(0, 1fr));
  gap: 7px;
  max-width: 360px;
}

.hole {
  aspect-ratio: 1;
  border-radius: 999px;
  background: #dfe5e1;
}

.hole.is-positive {
  background: var(--game-warning);
}

.result.is-correct {
  border-left: 4px solid var(--game-good);
}

.result.is-incorrect {
  border-left: 4px solid var(--game-warning);
}

@media (max-width: 860px) {
  .lab-game-layout {
    grid-template-columns: 1fr;
  }

  .lab-game-header {
    flex-direction: column;
  }
}
```

Work should adapt colors to the host application rather than create a visually isolated micro-site.

---

# 33. Animation Design

Animations should teach a concept.

## Growth Promotion

Useful animations:

- Media card slides into incubator.
- Incubator temperature dial moves.
- Clock progresses.
- Agar plate gradually displays colonies.
- Broth transitions from clear → turbid.
- Incorrect parameter receives a subtle shake.
- Successful setup receives a stamped `Accepted` state.

Avoid:

- Confetti after every answer.
- Cartoon microorganisms with faces unless the host app is intentionally playful.
- Long unskippable animations.

## Feller

Key animation:

```text
particle 1 → hole 17 → colony position 17
particle 2 → hole 42 → colony position 42
particle 3 → hole 17 → same colony position 17
```

Then:

```text
Particles: 3
Positive holes: 2
```

This single visual makes the statistical correction intuitive.

Use CSS transforms or Canvas/SVG. Prefer SVG for clarity and accessibility.

Respect:

```css
@media (prefers-reduced-motion: reduce) {
  /* show static state */
}
```

---

# 34. Audio

V1 recommendation: **no audio required**.

If audio is added:

- Default off in a work environment.
- Short soft click / success tone only.
- Persist preference separately.
- Never start audio automatically.

---

# 35. Accessibility

Mandatory:

- Every interaction available by keyboard.
- Do not require drag-and-drop only.
- Provide click/tap alternatives.
- Color must not be the only correctness cue.
- Use text labels: `Correct`, `Review`, `Warning`.
- Minimum 44 px touch targets.
- Use `aria-live` / `role=status` for result feedback.
- Do not use tiny organism names.
- Scientific names can use italic visual styling but must remain readable.
- Timed mode must have Pause or offer an untimed Practice Mode.
- Respect reduced motion.

---

# 36. Game Data and Production Data Separation

Recommended architecture:

```text
Production Lab Data
      │
      ├── Results DB
      ├── Audit trail
      └── Approval workflow

             NO DIRECT WRITE

Lab Games
      │
      ├── Static scenarios
      ├── Local score/session
      └── Optional training analytics
```

If server persistence is wanted, create a separate table such as:

```sql
lab_game_sessions
-----------------
id
user_id
game_id
mode
score
correct_answers
total_answers
duration_ms
scenario_pack_version
created_at
```

Do **not** include:

- sample_id
- result_id
- patient_id
- batch_result
- actual lab value

unless there is a separately approved use case.

---

# 37. Optional Backend Contract

If the current web app has authentication and scores should persist:

```http
POST /api/lab-games/sessions
Content-Type: application/json
```

Request:

```json
{
  "gameId": "feller",
  "mode": "quick",
  "score": 980,
  "correct": 6,
  "total": 7,
  "durationMs": 61230,
  "scenarioPackVersion": "feller-v1"
}
```

Response:

```json
{
  "ok": true,
  "personalBest": true,
  "bestScore": 980
}
```

The server should calculate / validate any leaderboard values instead of trusting arbitrary client payloads if score integrity matters.

V1 can be fully client-side if persistence is unnecessary.

---

# 38. Scenario Pack Versioning

Every session should know which content version was played.

Example:

```ts
export const GROWTH_PROMOTION_PACK = {
  id: "gpt-core",
  version: "1.0.0",
  policyProfileId: "pharma-micro-training-v1",
  scenarios: [
    // ...
  ],
};
```

When SOP or content changes:

```text
1.0.0 → 1.1.0
```

Do not mutate old training history semantics invisibly.

---

# 39. Content Governance

Add a lightweight content-control file:

`SCENARIO_GOVERNANCE.md`

Minimum metadata for each scenario:

```text
Scenario ID
Title
Learning objective
Applicable test profile
Source / SOP
Source revision
Author
Reviewer
Review date
Training status
```

Recommended status:

```text
draft
reviewed
approved-training
retired
```

Only `approved-training` scenarios should appear in a formal training deployment.

For a casual internal “lab break” deployment, `reviewed` may be sufficient depending on local governance.

---

# 40. Analytics — Optional

Useful privacy-minimal analytics:

- game opened
- game completed
- scenario answered
- hint used
- knowledge panel opened
- most commonly missed concept

Do not log organism selections together with real result identifiers.

Example:

```ts
type LabGameEvent =
  | {
      type: "game_started";
      gameId: string;
    }
  | {
      type: "round_answered";
      gameId: string;
      scenarioId: string;
      correct: boolean;
    }
  | {
      type: "knowledge_opened";
      cardId: string;
    };
```

These events can identify which training concept users struggle with.

---

# 41. Error Handling

## Feller

Reject / explain:

- `holes <= 0`
- non-integer hole count
- `observed < 0`
- non-integer observed count
- `observed > holes`
- zero / negative sample volume
- unsupported head configuration

Never display:

```text
NaN
Infinity
undefined
```

## Growth Promotion

Handle:

- missing policy profile
- unknown organism
- missing incubation rule
- invalid scenario
- source reference missing
- conflicting acceptance rule

If configuration is invalid, disable the scenario rather than guess.

---

# 42. Test Strategy

## 42.1 Domain unit tests

Mandatory:

- Feller reference values.
- Boundary `r = 0`.
- Boundary `r = N`.
- reject `r > N`.
- CFU/m³ normalization.
- GPT organism matching.
- GPT inoculum boundary.
- GPT incubation matching.
- quantitative recovery boundaries.

## 42.2 Component tests

Use Testing Library:

- answer input works.
- Submit button disabled for empty answer.
- correct feedback shown.
- incorrect feedback shown.
- knowledge card is shown.
- keyboard navigation.
- Practice mode has no forced timeout.

## 42.3 E2E tests

Use Playwright if already available.

Flow:

```text
Open Lab Playroom
→ select Feller
→ start Practice
→ answer one scenario
→ see explanation
→ next
→ finish
→ return to Playroom
```

Repeat for GPT.

## 42.4 Visual regression

Capture at:

- 1440 px
- 1024 px
- 768 px
- 390 px

Check:

- no overlap
- knowledge panel readable
- no horizontal page overflow
- scientific names not truncated
- controls >= usable target size

---

# 43. Scientific Validation Gate

Before calling V1 complete:

## Growth Promotion

- [ ] Every organism / medium relationship traces to a named training profile.
- [ ] Inoculum requirement is sourced.
- [ ] Incubation rule is sourced.
- [ ] Interpretation rule is sourced.
- [ ] Negative-control behavior is reviewed.
- [ ] No scenario claims universal applicability.
- [ ] Placeholder profiles removed from user-facing content.
- [ ] Internal microbiologist reviews the scenario pack.

## Feller

- [ ] Formula matches reference implementation.
- [ ] 300-hole fixtures pass.
- [ ] 400-hole fixtures pass.
- [ ] `r=0` works.
- [ ] `r=N` works.
- [ ] `r>N` is blocked.
- [ ] Air-volume calculation tested.
- [ ] Head hole count comes from scenario/equipment config.
- [ ] User is told when visualization is schematic.
- [ ] No device-specific assumption is silently made.

---

# 44. UX Delivery Gate

- [ ] Games open in <= 2 clicks from Lab Playroom.
- [ ] First useful action visible without scrolling on normal laptop.
- [ ] Game does not look like an ordinary quiz form.
- [ ] Knowledge panel remains accessible throughout.
- [ ] Wrong answer always explains why.
- [ ] Correct answer still explains the concept.
- [ ] User can leave without affecting laboratory result state.
- [ ] No accidental modal overlays production entry fields.
- [ ] No loud sound.
- [ ] No childish animation.
- [ ] Responsive at 390 px.
- [ ] Keyboard usable.
- [ ] Reduced-motion supported.

---

# 45. Performance Gate

Target:

- no paid API.
- no remote AI calls.
- initial game JS chunk should be reasonably small.
- lazy-load Lab Playroom if main lab entry screen is performance-critical.
- use CSS/SVG before heavy game engines.
- **Do not add Phaser/Three.js** for these two games unless there is a clear requirement.
- keep particle simulation bounded.
- cancel timers / animation frames on unmount.

A simple React + SVG implementation is sufficient and easier to maintain.

---

# 46. Security / Compliance Gate

- [ ] No production sample content sent to game module.
- [ ] No external analytics by default.
- [ ] No hidden third-party scripts.
- [ ] No score stored in regulated result table.
- [ ] Training disclaimer visible but unobtrusive.
- [ ] Route permissions follow existing app authentication.
- [ ] Game cannot mutate result approval state.
- [ ] All scenario HTML rendered safely.
- [ ] Do not use `dangerouslySetInnerHTML` for editable scenario text.

Suggested footer:

> Training simulation. Follow the current approved SOP and applicable compendial method for laboratory work.

---

# 47. Recommended Milestones

## Phase 0 — Repository audit

Before coding:

1. Identify framework.
2. Identify routing.
3. Identify CSS/design system.
4. Identify authentication.
5. Identify test runner.
6. Identify existing result stores/hooks.
7. Identify whether backend persistence is needed.
8. Confirm where Lab Playroom belongs in navigation.

Do not rebuild the host application.

## Phase 1 — Domain core

Implement first:

- `feller.ts`
- Feller fixtures/tests
- GPT evaluation engine
- recovery engine
- scenario types
- reference registry

**Gate:** all domain tests pass.

## Phase 2 — Lab Playroom shell

Implement:

- route
- game cards
- shared GameShell
- KnowledgePanel
- score
- Practice mode

**Gate:** usable without animation.

## Phase 3 — Feller game

Implement:

1. intuition round
2. numeric Pr round
3. positive-hole visualization
4. CFU/m³ extension
5. explanation panel

**Gate:** formula test + UI test + mobile test.

## Phase 4 — Growth Promotion game

Implement:

1. setup selection
2. incubation simulation
3. result interpretation
4. control-failure scenario
5. contextual knowledge cards

**Gate:** all scenario rules map to config.

## Phase 5 — Polish

- animations
- achievements
- score summary
- reduced motion
- visual QA
- responsive layout

## Phase 6 — Content validation

- microbiologist review
- fix scenario defects
- verify references
- approve training content

## Phase 7 — Final Delivery Gate

Run:

```bash
npm test
npm run build
npm run lint
```

or the equivalent commands already used by the repository.

Then perform E2E smoke tests.

---

# 48. Suggested V1 Scenario Count

Do not overbuild.

## Growth Promotion

Recommended:

- 12 core scenarios
  - 4 setup
  - 3 defect identification
  - 3 interpretation
  - 2 control failures

Each scenario can generate 2–3 display variants.

## Feller

Recommended:

- 16 scenarios
  - 4 intuition
  - 6 positive-hole calculations
  - 3 equipment-head questions
  - 3 CFU/m³ calculations

This is enough for replay without creating a large content maintenance burden.

---

# 49. Achievement System

Keep achievements educational.

## Growth Promotion

- **Media Ready** — complete first GPT scenario.
- **Low Inoculum, High Precision** — 5 inoculum questions correct.
- **Control Guardian** — detect 3 control failures.
- **Media Master** — 90%+ in Quick Shift.

## Feller

- **Positive Hole** — first correct Feller calculation.
- **Air Counter** — 5 calculations correct.
- **Collision Detective** — complete the conceptual simulation.
- **Feller Master** — 90%+ in Quick Shift.

Avoid achievements such as “GMP Certified.” The game cannot certify regulatory competency.

---

# 50. Game Summary Screen

Example:

```text
SHIFT COMPLETE

Score                 1,280
Correct                6 / 7
Best combo             ×1.4
Time                   01:08

Strongest concept
✓ Positive-hole correction

Review
! Sampling-head configuration

Unlocked
Air Counter

[ Play again ]  [ Knowledge recap ]  [ Back to Lab ]
```

`Knowledge recap` should show only concepts related to missed questions.

---

# 51. Example Feller Knowledge Explanation

After a wrong answer:

```text
Observed count: 50
Sampling head: 300 holes

Your answer: 50
Corrected Pr: 55

WHY?

At low occupancy, most incoming particles pass through unused
holes. As more holes are already represented, another particle
has a growing probability of passing through a location already
represented by a colony.

Feller correction estimates the probable statistical total.

Pr = Σ N / (N - i)
for i = 0 ... r - 1
```

A small visual can highlight repeated hits.

---

# 52. Example Growth Promotion Explanation

```text
SETUP REVIEW

Medium
✓ Correct for this scenario

Challenge organism
✓ Correct

Inoculum
✕ 420 CFU

Configured training requirement
≤ 100 CFU

WHY?

A high inoculum may make a weak medium appear capable of
supporting growth. This scenario therefore uses a low challenge
population as defined by its selected policy profile.

Source
Thai Pharmacopoeia microbial-limit training profile
```

The source drawer should not dump a long copyrighted chapter. Link or cite the rule and paraphrase.

---

# 53. Suggested Micro-Interactions

Use small purposeful details:

- Agar plate tilts subtly when selected.
- Selected microorganism card moves into a “challenge tray.”
- Temperature selector visually locks when accepted.
- Feller head fills with positive-hole markers.
- Formula terms highlight in sequence during explanation.
- Score increments with a 200–300 ms transition.

No constant floating elements or decorative particles unrelated to gameplay.

---

# 54. Future Admin Scenario Editor

Not V1, but architecture should permit:

```text
Admin
→ Training Content
→ Growth Promotion
→ New Scenario
```

Fields:

- medium
- organism
- inoculum rule
- incubation rule
- expected interpretation
- source
- explanation
- distractors
- difficulty

Validation should prevent saving a scenario without source metadata.

---

# 55. Future Integration with Existing Lab Modules

Possible contextual links:

From Environmental Monitoring:

```text
Need a refresher?
Try the 60-second Feller Challenge
```

From media preparation / microbiology:

```text
Review Growth Promotion concepts
```

Do not automatically start a game after result submission.

---

# 56. Build / Dependency Recommendation

Prefer the host application's current stack.

If new dependencies are unnecessary, do not add them.

Recommended:

- React
- TypeScript
- existing router
- existing CSS/Tailwind
- Vitest/Jest
- Testing Library
- Playwright only if already present or justified

Avoid:

- Phaser
- Three.js
- PixiJS
- Redux only for the games
- animation libraries unless already used
- remote game assets

SVG + React state is enough.

---

# 57. Starter `index.ts`

```ts
export { LabPlayroom } from "./components/LabPlayroom";

export {
  calculateFeller,
  calculateCfuPerM3,
} from "./domain/feller";

export {
  evaluateGrowthPromotionSetup,
} from "./domain/growthPromotion";

export {
  evaluateRecovery,
} from "./domain/recovery";
```

Keep public exports explicit.

---

# 58. Example Lab Playroom Skeleton

```tsx
type Props = {
  onOpenGame: (
    id: "growth-promotion" | "feller"
  ) => void;
};

export function LabPlayroom({
  onOpenGame,
}: Props) {
  return (
    <section>
      <header>
        <p>MICROBIOLOGY</p>
        <h1>Lab Playroom</h1>
        <p>
          Short training simulations using synthetic data.
        </p>
      </header>

      <div className="game-card-grid">
        <article className="game-card">
          <div aria-hidden="true">🧫</div>
          <h2>Media Lab</h2>
          <p>Growth Promotion Challenge</p>
          <button
            type="button"
            onClick={() =>
              onOpenGame("growth-promotion")
            }
          >
            Play
          </button>
        </article>

        <article className="game-card">
          <div aria-hidden="true">◉</div>
          <h2>Air Count</h2>
          <p>Feller Positive-Hole Challenge</p>
          <button
            type="button"
            onClick={() =>
              onOpenGame("feller")
            }
          >
            Play
          </button>
        </article>
      </div>

      <footer>
        Training simulation. Follow the current
        approved laboratory procedure for actual work.
      </footer>
    </section>
  );
}
```

Replace emoji with small internal SVGs in the polished build if the host design requires a more professional appearance.

---

# 59. Definition of Done — V1

V1 is complete only when all of the following are true:

## Product

- [ ] Lab Playroom route works.
- [ ] Both games playable.
- [ ] Practice mode works.
- [ ] At least one timed mode works.
- [ ] Knowledge panel works.
- [ ] Summary screen works.
- [ ] No production result mutation.

## Growth Promotion

- [ ] At least 12 reviewed scenarios.
- [ ] Setup challenge.
- [ ] interpretation challenge.
- [ ] control challenge.
- [ ] contextual explanation.
- [ ] all rules sourced/configured.

## Feller

- [ ] Concept animation.
- [ ] 300-hole scenario.
- [ ] 400-hole scenario.
- [ ] Feller calculation.
- [ ] air-volume normalization scenario.
- [ ] reference fixture tests pass.

## Engineering

- [ ] TypeScript passes.
- [ ] lint passes.
- [ ] tests pass.
- [ ] build passes.
- [ ] no console errors.
- [ ] timers cleaned up.
- [ ] no unnecessary dependency.
- [ ] no paid service.

## UX

- [ ] desktop pass.
- [ ] tablet pass.
- [ ] 390 px mobile pass.
- [ ] keyboard pass.
- [ ] reduced-motion pass.
- [ ] no clipped text.
- [ ] no “AI slop” visual treatment.

## Content / Safety

- [ ] training disclaimer.
- [ ] synthetic data.
- [ ] source registry.
- [ ] policy/scenario version.
- [ ] internal domain review before production use.

---

# 60. Recommended Work Instruction

The following can be pasted to the implementation agent together with this file:

```text
Implement the Microbiology Lab Mini-Games described in
MICRO_LAB_GAMES_IMPLEMENTATION_PLAN.md.

Treat that document as the implementation specification.

Rules:
- Inspect the existing repository before coding.
- Do not rebuild the application from scratch.
- Reuse the existing framework, routing, design system, auth,
  testing tools and conventions.
- Implement both V1 games:
  1) Media Lab — Growth Promotion Challenge
  2) Air Count — Feller Positive-Hole Challenge
- Keep game/training data isolated from production lab result data.
- Feller calculation must be deterministic and covered by reference
  fixture tests.
- GPT scenario logic must be config-driven and source-referenced.
- Do not introduce paid APIs or an LLM dependency.
- Do not create dummy controls.
- Every visible control must work.
- Make the UI professional, clean, microbiology-oriented, responsive
  and suitable for an internal pharmaceutical laboratory application.
- Knowledge Panel and explain-after-answer behavior are mandatory.
- Follow accessibility and reduced-motion requirements.
- Run all existing tests plus the new game tests.
- Run lint/typecheck/build.
- Fix defects before delivery.
- Do not expand scope into admin authoring, production competency
  certification, or production laboratory calculations unless the
  existing repository already requires them.
- At delivery, write a short implementation report documenting:
  files changed, tests run, scientific fixtures used, known limits,
  and scenario-pack version.
```

---

# 61. Reference Notes

The implementation team should verify current internal SOPs and approved compendial sources before production deployment.

Useful starting references used to design this plan:

1. **Thai Pharmacopoeia / Department of Medical Sciences — Microbial Limit Tests**  
   https://bdn-tp.dmsc.moph.go.th/ebook/qQMcA3t0pR9gC3q0GT5gMJq0qT5co3uw  
   Relevant concepts include growth-promotion testing of media, low challenge inoculum and quantitative comparison for solid media.

2. **Thermo Fisher Scientific — Pharmaceutical Microbiology Manual**  
   https://assets.thermofisher.com/TFS-Assets/MBD/manuals/Pharmaceutical-Microbiology-Manual-EN-LT2629A.pdf  
   Useful secondary training reference for growth-promotion workflow and organisms.

3. **MBV AG — MAS-100 Atmos User Manual**  
   https://www.mbv.ch/media/user_manual_compresses_gas_sampler_mas-100_atmos.pdf  
   Contains Feller positive-hole conversion information and formula context.

4. **MBV AG — MAS-100 NT information**  
   https://www.mbv.ch/en/microbial-air-samplers/mas-100-nt/mas-100-nt-hepa/  
   Useful example showing that sampling heads can have different perforation configurations, reinforcing why `N` must be equipment/config driven.

5. **Feller, W. (1950), _An Introduction to Probability Theory and Its Applications_**  
   Historical probability reference cited by air-sampler documentation for the statistical correction.

---

# 62. Final Implementation Principle

The project should feel like:

> **“A tiny interactive microbiology training simulator embedded in a serious laboratory application.”**

—not like:

> a quiz page, a cartoon game, a generic dashboard, or an AI-generated learning widget.

The strongest V1 experience is:

```text
play
→ make a laboratory decision
→ see the simulated consequence
→ understand why
→ remember the rule
→ return to work
```

That loop should guide every implementation decision.
