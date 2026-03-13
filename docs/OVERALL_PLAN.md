# Overall Plan

This document summarizes the private product plan in a public-safe, nontechnical form.

## Why This Exists

The full private repo has a detailed execution plan. For external UX planning, the important part is not the implementation detail. It is understanding:

- what the app is trying to become
- what is already working in some form
- what is still being refined
- what this UX review should influence next

## Product Stage

The app is past the earliest MVP-definition phase. The core product loop already exists in working form and has been through multiple reliability passes.

The product is now in a refinement phase where the onboarding engine and the primary planning screens have been aligned to a shared roadmap model. UX clarity and visual direction matter more right now than adding more raw capability.

This matters because the current planning question is not "what features should exist at all?" It is "what should this experience feel like, how should the screens relate to each other, and what should the user understand at each step?"

## What Already Exists

The current app already includes these core user-facing areas:

- authentication and return-user entry
- a multi-step onboarding flow that previews value before asking for account linking
- a roadmap reveal that is generated after intake and a required core transactional link
- a home screen centered on current focus, next action, and key metric
- a roadmap / journey view and a step-detail view driven by the same planning payload as Home
- profile, accounts, goals, and insights support surfaces

The product still aims to deliver value before asking for maximum setup effort. In the current build, users can preview value and complete intake before linking, but a core transactional account link is now required before the personalized roadmap reveal and dashboard entry.

## What The Product Is Trying To Achieve

At a high level, the app is trying to help a user:

- understand where they stand
- see the next best action
- understand why that action matters
- see what that action unlocks next
- feel guided without feeling pressured

The intended product tone is calm, practical, trustworthy, and premium. It should not feel like a spreadsheet-heavy budgeting tool, a hype-driven investing app, or a generic AI chatbot.

## Current Planning Focus

The current phase is a UX-first clarification phase around the new roadmap-first architecture.

The key goal is to make the product flow feel coherent before doing a larger visual redesign and before pushing further into broader live-data expansion.

The main questions in this phase are:

- How should preview-first onboarding transition into a required link step without feeling bait-and-switch?
- What should the Home screen communicate in the first few seconds now that it shares a roadmap payload with Journey and Step Detail?
- How should Home, Journey, and Step Detail divide responsibility cleanly?
- Which supporting surfaces still deserve standalone destinations versus getting absorbed into the core roadmap experience?
- Where should trust, coverage strength, limitations, and explanation live?
- How visible should linked-data freshness and missing-data context be?

## What This UX Packet Should Help Decide

This packet is meant to help improve:

- screen purpose
- flow sequencing
- information hierarchy
- action hierarchy
- trust-building moments
- the order of future redesign work
- the boundary between primary planning screens and secondary support screens

The goal is to make the experience more understandable and more intentional before moving into high-fidelity redesign implementation.

## What Comes Next After This Phase

The expected sequence is:

1. clarify the UX and screen responsibilities around the new roadmap-core architecture
2. use that clarity to drive visual redesign
3. implement the approved redesign back in the private product repo
4. continue later expansion work only after the experience direction is clear

This means the current UX review should optimize for product clarity and decision quality, not just visual freshness.

## What Is Out Of Scope For This Public Packet

This packet is not meant to drive decisions about:

- backend architecture
- internal operations tooling
- deployment or release process
- security implementation details
- private integrations or environment setup

Those topics exist in the private repo, but they are intentionally excluded here because this packet is for UX planning.
