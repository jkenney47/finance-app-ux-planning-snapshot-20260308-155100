# Worked Example: Offline-First With Conflict Resolution

## Proposed Change

The mobile app must support offline-first usage with conflict-safe sync once connectivity returns.

## Step 0 Fit Gate

- Decision: assumption-first redesign
- Why:
  - introduces a new foundational invariant (local-first writes).
  - changes data ownership and synchronization semantics.
  - affects contracts across mobile client, API, and persistence layers.

## Normalized Assumptions

- From day one, users can create and edit core entities without network access.
- The system is constrained by eventual consistency between client and server.
- The system optimizes for user trust: no silent data loss.

## Target Architecture (Clean-Slate)

- Client owns an append-only local operation log.
- Sync service ingests operations and resolves conflicts with deterministic policies.
- Server remains source of record for canonical snapshots, while conflict traces are retained.
- Contracts:
  - `POST /sync/ops` for batched client operations.
  - `GET /sync/state` for canonical state plus conflict resolutions.

## Gap Map (Sample)

| Current Component      | Target Component                    | Action    | Interface Break | Data Migration Impact |
| ---------------------- | ----------------------------------- | --------- | --------------- | --------------------- |
| direct CRUD API calls  | local op-log + sync adapter         | Replace   | Yes             | Medium                |
| server write endpoints | sync ingest endpoint                | Replace   | Yes             | Low                   |
| single snapshot table  | snapshot + operation lineage tables | Introduce | No              | High                  |

## Migration Outline (Sample)

- Stage 0: characterization tests on current online flow.
- Stage 1: introduce local operation log behind feature flag.
- Stage 2: dual-write to current API and op-log; verify equivalence.
- Stage 3: enable sync ingest and conflict policy in shadow mode.
- Stage 4: cut over read path to sync state for flagged users.
- Stage 5: remove legacy direct-write path.

## ADRs (Sample Topics)

- ADR-001: choose operation-log over direct local snapshots.
- ADR-002: deterministic server conflict policy precedence.
- ADR-003: rollout strategy using dual-write and staged cutover.
