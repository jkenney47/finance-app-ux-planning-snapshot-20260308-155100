# Assumption-First Redesign Checklist

- Step 0 fit gate is explicit and justified.
- Assumptions are explicit, testable, and conflict-free.
- Target design removes complexity versus legacy-shaped patching.
- Sources of truth are singular and clearly owned.
- Boundaries are explicit (no hidden cross-calls).
- Contract changes are documented for all external interfaces.
- Data migration is staged with verification and rollback.
- Backward compatibility is preserved until planned cutover.
- Rollout includes explicit observability (metrics, logs, alerts).
- Cutover stage has SLO guardrails and abort criteria.
- Rollback has been rehearsed at least as a tabletop sequence.
- Data integrity checks are defined for pre-cutover and post-cutover.
- Risks are enumerated with mitigations (security, performance, operability).
- Deliverables include a diagram, contract table, gap map table, migration plan, risk register, and three ADRs.
