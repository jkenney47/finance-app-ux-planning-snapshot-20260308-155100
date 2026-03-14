# Agent Ops Optimization Report

Window: last 14 day(s)
Generated: 2026-03-08T12:26:01.977Z

## Usage Signals

- Total memory events: 83
- Command-failure events: 82
- Coordination incidents: 14
- CI/check incidents: 27
- Timeout incidents: 0

### Top Failure Tags

- auto: 82
- command-failure: 82
- gh: 37
- npm: 13
- rg: 11
- git: 10
- bash: 5
- npx: 2

### Top Failure Triggers

- command-run:continue recommended repo hardening flow: 28
- command-run:open PR consolidation and merge: 12
- command-run:Slice 3 drift reduction and DX cleanup hardening: 8
- command-run:merge remaining hardening PRs and verify local state: 7
- command-run:Slice 3 repo hardening execution packet: 4
- command-run:next-step open-pr triage: 3
- command-run:Determine whether the unused Supabase project can be deleted: 3
- command-run:Assess whether repo can be made temporarily public without exposing secrets: 2

## Development Pattern Summary

- Git commits in window: 210
- Classified file touches: 1320

### Domain Distribution

- other: 340 files (26%)
- frontend: 314 files (24%)
- docs-policy: 253 files (19%)
- automation: 186 files (14%)
- tests: 122 files (9%)

## Recommended Runtime Parameters

- max_parallel_threads: 1
- max_delegation_depth: 1
- max_runtime_minutes: 30

Rationale:

- Active domains (>=15% share): 3
- Coordination incidents: 14
- CI incidents: 27
- Timeout incidents: 0

## New Agent Profile Candidates

- No new agent profile recommendation in this window.

## Apply/Review Loop

1. If parameter recommendations are stable for 2+ runs, update orchestration defaults.
2. If a candidate profile appears in 2+ consecutive runs, scaffold the prompt file and add profile blocks in .codex/config.toml.
3. Re-run this report after major milestone changes.
