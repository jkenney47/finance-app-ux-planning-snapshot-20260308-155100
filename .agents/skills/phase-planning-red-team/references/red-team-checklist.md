# Red-Team Checklist

Run this after the initial dependency-tree interview.

## 1) Product Integrity

- Does the plan directly improve the primary user outcome?
- Are non-goals explicit and enforced in scope?
- Could a simpler scope deliver the same value faster?

Fail condition: milestone work exists with no traceable user-value link.

## 2) Technical Feasibility

- Are all required interfaces and contracts explicitly defined?
- Are external dependencies available in the target environment?
- Are migration/data backfill requirements identified?

Fail condition: a milestone requires unknown interfaces or undeclared dependencies.

## 3) Reliability and Failure Handling

- For each critical path, is there a timeout/retry/fallback behavior?
- Are partial-data and stale-data states handled safely?
- Is there a graceful degradation path if integrations fail?

Fail condition: any critical flow can hard-fail without fallback.

## 4) Security and Privacy

- Are secrets isolated to server/edge environments only?
- Does the plan avoid logging sensitive payloads?
- Are authn/authz requirements explicit for each write path?

Fail condition: security controls depend on assumption rather than explicit design.

## 5) Delivery Risk

- Are milestones ordered by dependency, not preference?
- Is each milestone independently verifiable?
- Are high-risk tasks front-loaded to reduce late surprises?

Fail condition: major unknowns are deferred until late milestones.

## 6) Rollout and Recovery

- Is rollout incremental (feature flags or staged release)?
- Does each risky change have a rollback trigger and procedure?
- Is user impact bounded if rollback is required?

Fail condition: rollback path is missing or untested for risky work.

## 7) Validation Quality

- Are acceptance criteria objective and measurable?
- Do tests cover both happy-path and key failure-path behavior?
- Are required commands and evidence artifacts defined?

Fail condition: acceptance depends on subjective judgment ("looks good").

## 8) Contradiction Sweep

- Do any decisions conflict across milestones or branches?
- Are constraints incompatible with proposed architecture?
- Are we promising scope that violates explicit non-goals?

Fail condition: unresolved contradiction remains in the plan.
