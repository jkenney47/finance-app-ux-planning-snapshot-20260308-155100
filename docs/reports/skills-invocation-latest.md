# Skill Invocation Evaluation

## Summary

- Fixtures: 27
- Skills evaluated: 26
- Top-1 hit rate: 100.0%
- Recall@3: 100.0%
- Avoid-hit rate@3: 55.6%

## Description Lint

- [warning] adapt: Description missing both "Avoid when" and "Prefer ... when ..." boundary cues.
- [warning] agent-ops-optimizer: Description missing both "Avoid when" and "Prefer ... when ..." boundary cues.
- [warning] assumption-first-redesign: Description missing both "Avoid when" and "Prefer ... when ..." boundary cues.
- [warning] clarify: Description missing both "Avoid when" and "Prefer ... when ..." boundary cues.
- [warning] critique: Description length 425 exceeds 420 characters; tighten trigger density.
- [warning] decision-policy: Description missing both "Avoid when" and "Prefer ... when ..." boundary cues.
- [warning] extract: Description missing both "Avoid when" and "Prefer ... when ..." boundary cues.
- [error] frontend-design: Description missing "Use when" segment.
- [warning] frontend-design: Description missing both "Avoid when" and "Prefer ... when ..." boundary cues.
- [warning] harden: Description missing both "Avoid when" and "Prefer ... when ..." boundary cues.
- [error] napkin: Description missing "Use when" segment.
- [warning] napkin: Description missing both "Avoid when" and "Prefer ... when ..." boundary cues.
- [warning] nontechnical-intake-to-plan: Description missing both "Avoid when" and "Prefer ... when ..." boundary cues.
- [warning] normalize: Description length 426 exceeds 420 characters; tighten trigger density.
- [warning] onboard: Description missing both "Avoid when" and "Prefer ... when ..." boundary cues.
- [warning] optimize: Description missing both "Avoid when" and "Prefer ... when ..." boundary cues.
- [warning] phase-planning-red-team: Description missing both "Avoid when" and "Prefer ... when ..." boundary cues.
- [warning] polish: Description missing both "Avoid when" and "Prefer ... when ..." boundary cues.
- [error] prd-to-build-plan: Description missing "Use when" segment.
- [warning] prd-to-build-plan: Description missing both "Avoid when" and "Prefer ... when ..." boundary cues.
- [error] teach-impeccable: Description missing "Use when" segment.
- [warning] teach-impeccable: Description missing both "Avoid when" and "Prefer ... when ..." boundary cues.

## Highest Description Overlap Risk

- No high-overlap pairs above threshold.

## Confusion Hotspots

- No top-1 confusion observed in fixture set.

## Most-Missed Expected Skills

- No missed expected skills.

## Fixture Results

### audit-01

- Prompt: Audit this retirement dashboard for accessibility, responsiveness, performance, and anti-patterns. Give severity and recommended fixes, but do not implement code changes.
- Expected: audit
- Avoid: polish, normalize, critique
- Top predictions: audit, optimize, extract
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: (none)
- Notes: Full quality audit request should map to audit.

### critique-01

- Prompt: Critique this onboarding screen from a UX strategy perspective: hierarchy, emotional resonance, discoverability, and microcopy quality.
- Expected: critique
- Avoid: audit, polish
- Top predictions: critique, audit, polish
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: audit, polish
- Notes: Direction critique without implementation should map to critique.

### polish-01

- Prompt: The feature is complete, run a final polish pass for spacing, copy rough edges, states, and responsive details before shipping.
- Expected: polish
- Avoid: audit, assumption-first-redesign
- Top predictions: polish, normalize, phase-planning-red-team
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: (none)
- Notes: Late-stage refinement should map to polish.

### normalize-01

- Prompt: This route has one-off styles and inconsistent components. Normalize it to the existing design system and interaction patterns.
- Expected: normalize
- Avoid: bolder, quieter
- Top predictions: normalize, extract, assumption-first-redesign
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: (none)
- Notes: Alignment to existing system should map to normalize.

### bolder-01

- Prompt: This page looks timid and generic. Make the visual direction more confident and memorable while keeping usability intact.
- Expected: bolder
- Avoid: quieter, simplify
- Top predictions: bolder, delight, quieter
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: quieter
- Notes: Increase visual energy without changing core flow.

### quieter-01

- Prompt: This UI feels too loud and overstimulating. Tone it down to a calmer, more refined experience without becoming bland.
- Expected: quieter
- Avoid: bolder, colorize
- Top predictions: quieter, animate, colorize
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: colorize
- Notes: Reduce intensity while preserving clarity.

### simplify-01

- Prompt: This flow is cluttered and cognitively heavy. Simplify the UX by reducing unnecessary complexity and focusing on primary goals.
- Expected: simplify
- Avoid: bolder, delight
- Top predictions: simplify, critique, harden
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: (none)
- Notes: Complexity reduction should map to simplify.

### colorize-01

- Prompt: The interface is visually flat and monochrome. Introduce strategic color for hierarchy and warmth while keeping accessibility compliant.
- Expected: colorize
- Avoid: quieter, simplify
- Top predictions: colorize, optimize, critique
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: (none)
- Notes: Color intent task should map to colorize.

### clarify-01

- Prompt: Rewrite the confusing error and empty-state copy so users know exactly what happened and what to do next.
- Expected: clarify
- Avoid: critique, audit
- Top predictions: clarify, onboard, nontechnical-intake-to-plan
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: (none)
- Notes: Copy rewrite should map to clarify.

### delight-01

- Prompt: The flow works but feels emotionally flat. Add a few moments of tasteful delight without hurting task completion.
- Expected: delight
- Avoid: simplify, optimize
- Top predictions: delight, colorize, animate
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: (none)
- Notes: Positive personality lift should map to delight.

### adapt-01

- Prompt: Adapt this existing desktop design so it also works cleanly on tablet and mobile contexts while preserving outcomes.
- Expected: adapt
- Avoid: normalize, onboard
- Top predictions: adapt, extract, normalize
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: normalize
- Notes: Cross-context adaptation should map to adapt.

### animate-01

- Prompt: Add purposeful motion and micro-interactions so state changes feel less abrupt and user feedback is clearer.
- Expected: animate
- Avoid: optimize, harden
- Top predictions: animate, colorize, delight
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: (none)
- Notes: Motion quality work should map to animate.

### onboard-01

- Prompt: Improve first-run onboarding and empty states so new users reach value quickly and drop-off is reduced.
- Expected: onboard
- Avoid: simplify, clarify
- Top predictions: onboard, clarify, animate
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: clarify
- Notes: Activation-focused onboarding should map to onboard.

### optimize-01

- Prompt: Speed up this route by improving render efficiency, image delivery, and animation smoothness with measurable performance gains.
- Expected: optimize
- Avoid: animate, polish
- Top predictions: optimize, bolder, quieter
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: (none)
- Notes: Performance-first request should map to optimize.

### harden-01

- Prompt: Harden this screen for edge cases: long text overflow, error states, i18n, accessibility constraints, and unreliable network behavior.
- Expected: harden
- Avoid: optimize, animate
- Top predictions: harden, audit, clarify
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: (none)
- Notes: Resilience work should map to harden.

### extract-01

- Prompt: We have repeated one-off components and token values. Extract reusable components and design tokens for system-wide reuse.
- Expected: extract
- Avoid: normalize, polish
- Top predictions: extract, normalize, assumption-first-redesign
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: normalize
- Notes: Pattern extraction should map to extract.

### frontend-design-01

- Prompt: Before we redesign this feature, apply Finance-App UI principles and anti-pattern guardrails so implementation stays intentional and consistent.
- Expected: frontend-design
- Avoid: critique, audit
- Top predictions: frontend-design, normalize, gemini-second-opinion
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: (none)
- Notes: Repo-specific UI guardrail usage should map to frontend-design.

### nontechnical-plan-01

- Prompt: I am nontechnical. I want users to connect accounts and get a clear weekly budget view. Please decide the technical approach and give me a phased implementation plan.
- Expected: nontechnical-intake-to-plan
- Avoid: prd-to-build-plan, phase-planning-red-team
- Top predictions: nontechnical-intake-to-plan, phase-planning-red-team, onboard
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: phase-planning-red-team
- Notes: Plain-language outcome-to-plan should map to nontechnical intake.

### prd-plan-01

- Prompt: Convert this PRD into an MVP-first build plan with milestones, dependencies, risks, and definition of done.
- Expected: prd-to-build-plan
- Avoid: nontechnical-intake-to-plan, phase-planning-red-team
- Top predictions: prd-to-build-plan, nontechnical-intake-to-plan, phase-planning-red-team
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: nontechnical-intake-to-plan, phase-planning-red-team
- Notes: PRD conversion should map to prd-to-build-plan.

### phase-red-team-01

- Prompt: Red-team this phase plan branch by branch, challenge assumptions, and force explicit rollback paths before implementation.
- Expected: phase-planning-red-team
- Avoid: prd-to-build-plan, nontechnical-intake-to-plan
- Top predictions: phase-planning-red-team, gemini-second-opinion, nontechnical-intake-to-plan
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: nontechnical-intake-to-plan
- Notes: Adversarial planning interview should map to phase-planning-red-team.

### assumption-redesign-01

- Prompt: Redesign this system as if offline-first had always been the requirement, including a migration path from the current architecture.
- Expected: assumption-first-redesign
- Avoid: normalize, polish
- Top predictions: assumption-first-redesign, normalize, nontechnical-intake-to-plan
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: normalize
- Notes: Constraint-from-day-one redesign should map to assumption-first-redesign.

### decision-policy-01

- Prompt: We need to execute quickly, but there are risky irreversible choices around data integrity and security. Apply an autonomous decision policy for what to decide vs escalate.
- Expected: decision-policy
- Avoid: nontechnical-intake-to-plan
- Top predictions: decision-policy, agent-ops-optimizer, nontechnical-intake-to-plan
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: nontechnical-intake-to-plan
- Notes: Escalation boundary logic should map to decision-policy.

### teach-impeccable-01

- Prompt: Initialize project-specific design memory for this repository so future sessions follow consistent UX direction.
- Expected: teach-impeccable
- Avoid: frontend-design, napkin
- Top predictions: teach-impeccable, frontend-design, normalize
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: frontend-design
- Notes: One-time design context bootstrap should map to teach-impeccable.

### teach-impeccable-02

- Prompt: Do a one-time design bootstrap for this repo: inspect docs and tokens, then write/update the `## Design Context` section in `.agents/memory/rules.md` for future sessions.
- Expected: teach-impeccable
- Avoid: frontend-design, napkin
- Top predictions: teach-impeccable, extract, normalize
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: (none)
- Notes: Persistent design-memory initialization should map to teach-impeccable, not implementation guardrails.

### frontend-design-02

- Prompt: Before implementing a new UI flow, apply Finance-App design guardrails and anti-pattern checks for this coding task, but do not update memory files.
- Expected: frontend-design
- Avoid: teach-impeccable, napkin
- Top predictions: frontend-design, gemini-second-opinion, audit
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: (none)
- Notes: Implementation-time design direction should map to frontend-design, not one-time memory bootstrap.

### napkin-01

- Prompt: Before substantial work, update per-repo working memory and ensure event logging, ranked injection, and checkpoints are configured.
- Expected: napkin
- Avoid: decision-policy
- Top predictions: napkin, gemini-second-opinion, frontend-design
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: (none)
- Notes: Memory discipline work should map to napkin.

### gemini-second-opinion-01

- Prompt: Before you implement this, get Gemini to review the plan, give us a second opinion, and run the repo's plan-finalize workflow.
- Expected: gemini-second-opinion
- Avoid: nontechnical-intake-to-plan, prd-to-build-plan, phase-planning-red-team
- Top predictions: gemini-second-opinion, phase-planning-red-team, polish
- Top-1 hit: yes
- Recall@3: 100.0%
- Avoid hits: phase-planning-red-team
- Notes: Explicit Gemini plan review before coding should map to the Gemini second-opinion skill.
