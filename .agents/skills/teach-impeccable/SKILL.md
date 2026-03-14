---
name: teach-impeccable
description: One-time setup skill for this Finance-App repo that gathers project-specific design context and persists it for future sessions. Use at project start (or when design direction changes) to establish shared UX/visual guidelines in `.agents/memory/rules.md`.
---

# Teach Impeccable

## Goal

Gather design context once, then persist it in this repo's memory config so future sessions follow consistent design guidance.

## Repo Customization

- `config_file`: `.agents/memory/rules.md`
- Do not write design context to `AI_RULES.md` or `AGENTS.md`.
- This repo standard is to store persistent preferences/context in `.agents/memory/rules.md`.

## Step 1: Explore the Codebase First

Before asking questions, inspect these repo-specific sources:

1. `README.md`
2. `docs/README.md`
3. `docs/architecture/ai-financial-advisor-design-doc.md`
4. `theme/tokens.ts`
5. `theme/paper.ts`
6. `AI_RULES.md` (especially preference/memory guidance)
7. Target UI surfaces in `app/`, `components/`, and related styles

Extract what is already known:

- product purpose and audience hints
- tone/personality cues
- existing color/type/spacing tokens
- theme behavior (light/dark, accessibility expectations)
- design-system conventions already in use

Record:

- confirmed facts
- open questions
- conflicts (for example design-doc palette vs live tokens)

## Step 2: Ask UX-Focused Questions (Only for Unknowns)

Ask only what cannot be confidently inferred from Step 1.

### Users and Purpose

- Who uses this product and in what context?
- What core job are they trying to get done?
- What emotional tone should the UI prioritize (confidence, calm, urgency, delight)?

### Brand and Personality

- Brand personality in 3 words?
- Any reference products and what to emulate from each?
- Any anti-references or visual styles to explicitly avoid?

### Aesthetic Preferences

- Preferred direction (minimal, bold, elegant, playful, technical, organic)?
- Light, dark, or both as first-class experiences?
- Must-use or must-avoid colors?
- When repo sources conflict (for example documented palette vs `theme/tokens.ts`), which is authoritative?

### Accessibility and Inclusion

- Required accessibility level (for example WCAG target)?
- Reduced motion, color vision, or other accommodations to prioritize?

If you had to infer any answer, explicitly ask for confirmation before proceeding.

## Step 3: Write Design Context to Repo Memory Config

Write/update a `## Design Context` section in `.agents/memory/rules.md`.

- If `## Design Context` exists, replace only that section.
- If missing, append it near the end of the file.
- Preserve all other existing sections.

Use this structure:

```markdown
## Design Context

### Users

[Who they are, context of use, job-to-be-done]

### Brand Personality

[Voice/tone, 3-word personality, emotional goals]

### Aesthetic Direction

[Visual tone, references, anti-references, theme preferences]

### Design Principles

[3-5 repo-specific principles guiding design decisions]
```

## Completion Output

After writing the section:

- confirm completion
- summarize the 3-5 key design principles now persisted
- call out any unresolved conflicts that still need user decisions
