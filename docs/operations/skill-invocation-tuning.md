# Skill Invocation Tuning Loop

## Objective

Continuously improve implicit skill invocation quality for repo-local skills in `.agents/skills` by reducing missed triggers and false triggers over time.

## Success Metrics

Run `npm run skills:eval` and track these metrics in `docs/reports/skills-invocation-latest.json`:

- `top1HitRate`: How often the highest-ranked skill matches expected skill(s).
- `recallAt3`: How often expected skill(s) appear in top 3.
- `avoidViolationRate`: How often explicitly avoid-listed skills appear in top 3.
- `confusionRows`: Most frequent expected -> predicted confusion pairs.
- `lint.issues`: Description quality issues (missing boundary cues, excessive length).

Target thresholds:

- `top1HitRate >= 0.80`
- `recallAt3 >= 0.95`
- `avoidViolationRate <= 0.10`
- `lint.issues` must have zero `error` severity items.

## Description Authoring Standard

Each skill `description` must be concise and boundary-rich.

Required pattern:

1. What the skill does.
2. `Use when ...` with explicit trigger language users naturally say.
3. `Avoid when ...` and/or `Prefer <sibling-skill> when ...` to disambiguate overlaps.

Guidelines:

- Prefer concrete trigger nouns/verbs over abstract adjectives.
- Keep descriptions short enough to stay high signal (generally under 420 chars).
- For overlap-heavy skills, include one explicit sibling boundary.

## Tuning Workflow

1. Run baseline evaluator.
2. Review confusion hotspots and avoid violations.
3. Edit only the smallest set of skill descriptions needed.
4. Re-run evaluator and compare metrics to baseline.
5. Accept changes only when metrics improve and no higher-severity regression appears.
6. Add new fixtures for every newly observed mis-invocation pattern.

## Fixture Rules

Fixtures live in `tests/skills/fixtures/invocation-regression.ndjson`.

Each line must include:

- `id`: stable identifier
- `prompt`: realistic user-language prompt
- `expectAny`: skill(s) that should match
- `avoid`: common false-positive skills to suppress
- `notes`: why this fixture exists

Add fixtures whenever:

- a false positive appears in real work,
- a skill is newly added,
- overlap boundaries are edited.

## Commands

- Evaluate and print report:

```bash
npm run skills:eval
```

- Evaluate and overwrite artifacts manually:

```bash
node scripts/skills-eval.mjs \
  --fixtures tests/skills/fixtures/invocation-regression.ndjson \
  --top-k 3 \
  --write docs/reports/skills-invocation-latest.md \
  --json docs/reports/skills-invocation-latest.json
```

## Change Gate

Description changes should be merged only when all are true:

- `top1HitRate` does not decrease.
- `recallAt3` does not decrease.
- `avoidViolationRate` does not increase.
- No new lint `error` appears.
- Any metric regression has an explicit rationale plus fixture update.

## Recursive Improvement Cadence

Use a recurring automation to run this loop daily:

1. Pull recent skill-misfire signals from `.agents/memory/events.ndjson` and recent sessions.
2. Append/adjust fixtures from real evidence.
3. Run `npm run skills:eval`.
4. Propose the smallest `description` edits needed to improve metrics.
5. Re-run evaluation and report before/after metrics, confusion changes, and remaining risks.

The automation should operate only on repo-local skills (`.agents/skills`) and open an inbox item each run with findings and proposed edits.
