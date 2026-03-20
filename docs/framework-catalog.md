# Framework Catalog

This document is the canonical guide to all journaling frameworks available in MindWeave.

## How to maintain this file

When a new framework is added, update all of the following in the same commit:

1. `backend/src/config/frameworks.ts`
2. `frontend/src/pages/HomePage.tsx`
3. `frontend/src/services/api.ts` (if framework ID union changes)
4. `frontend/src/pages/HistoryPage.tsx` and `frontend/src/pages/EntryDetailPage.tsx` labels
5. This file: `docs/framework-catalog.md`

---

## Therapeutic Frameworks

### CBT (Cognitive Behavioral Therapy)
- Framework ID: `cbt`
- Core idea: Identify cognitive distortions and shift into evidence-based, balanced thinking.
- Best for: Catastrophizing, harsh self-talk, spirals, overgeneralizing.
- Caution: Can feel too analytical during intense emotional moments.

### Iceberg Model
- Framework ID: `iceberg`
- Core idea: Move from surface reaction to deeper emotions, beliefs, and unmet needs.
- Best for: Triggers, recurring conflicts, identity-sensitive stress.
- Caution: Can surface vulnerable feelings; use when you have enough emotional bandwidth.

### Growth Mindset
- Framework ID: `growth`
- Core idea: Reframe fixed conclusions into learning-oriented progress and next steps.
- Best for: Fear of failure, confidence dips, perfectionism, learning pressure.
- Caution: Can feel invalidating if used as forced positivity before emotional validation.

---

## Cultural Frameworks (ASEAN)

These frameworks are culturally inspired communication lenses. They are designed to feel resonant and respectful, not stereotypical.

### Singaporean Grounded Reframe
- Framework ID: `singapore`
- Country: Singapore
- Signature style: Practical clarity and steady execution.
- Core tone: Direct, calm, realistic, action-oriented.
- Best for: Overload, prioritization pressure, practical reset moments.

### Indonesian Calm Reframe
- Framework ID: `indonesia`
- Country: Indonesia
- Signature style: Patience, calm pacing, relational harmony.
- Core tone: Gentle, grounded, steady progress.
- Best for: Anxiety, overwhelm, internal pressure.

### Malaysian Balanced Reframe
- Framework ID: `malaysia`
- Country: Malaysia
- Signature style: Balanced perspective and moderate pace.
- Core tone: Considerate, practical, emotionally respectful.
- Best for: Competing priorities and emotional-practical tension.

### Thai Gentle Reframe
- Framework ID: `thailand`
- Country: Thailand
- Signature style: Gentle tone and emotional de-escalation.
- Core tone: Kind, calm, non-reactive clarity.
- Best for: Heated conflict, frustration spikes, emotional overload.

### Filipino Resilient Reframe
- Framework ID: `philippines`
- Country: Philippines
- Signature style: Warmth, resilience, hopeful action.
- Core tone: Relational, encouraging, practical hope.
- Best for: Setbacks, confidence dips, morale recovery.

### Vietnamese Perseverance Reframe
- Framework ID: `vietnam`
- Country: Vietnam
- Signature style: Perseverance and disciplined progress.
- Core tone: Effort-focused, forward-moving, practical.
- Best for: Long-term pressure and slow-progress frustration.

### Bruneian Composed Reframe
- Framework ID: `brunei`
- Country: Brunei
- Signature style: Composure, values, dignified pacing.
- Core tone: Respectful, centered, steady.
- Best for: Uncertainty requiring calm judgment and self-respect.

### Cambodian Steady Reframe
- Framework ID: `cambodia`
- Country: Cambodia
- Signature style: Gentle rebuilding and stability focus.
- Core tone: Restorative, dignifying, gradual.
- Best for: Emotional fatigue and rebuilding confidence.

### Lao Grounded Reframe
- Framework ID: `laos`
- Country: Laos
- Signature style: Unhurried clarity and grounded steps.
- Core tone: Simple, calm, low-overwhelm.
- Best for: Mental clutter and decision fatigue.

### Myanmar Resilience Reframe
- Framework ID: `myanmar`
- Country: Myanmar
- Signature style: Compassion under pressure with agency.
- Core tone: Courageous, compassionate, action-restoring.
- Best for: High-stress uncertainty and helplessness.

---

## Cultural Tone Strength

Cultural frameworks support a user-selectable tone strength:

- `light`: Mostly neutral global English with subtle cultural flavor.
- `medium`: Balanced cultural flavor with broad readability.
- `strong`: More culturally-shaped voice while staying respectful and clear.

This setting only applies to cultural frameworks and is ignored for therapeutic frameworks.
