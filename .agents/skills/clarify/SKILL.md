---
name: clarify
description: Improve unclear UX copy, labels, instructions, errors, empty states, and microcopy so users understand what happened and what to do next. Use when interface text feels confusing, vague, overly technical, inconsistent, or unhelpful and needs a clear, actionable rewrite.
---

# Clarify

## Goal

Identify and improve unclear interface copy so users can understand and act with less friction.

## Input

- `target` (optional): feature, page, route, or component where copy is unclear.
- If `target` is omitted, improve the most relevant copy surface from the request.

## Assess Current Copy

Identify what makes the copy ineffective.

### 1) Find Clarity Problems

- jargon users will not understand
- ambiguous wording with multiple interpretations
- unnecessary passive voice
- too much or too little text
- hidden assumptions about user knowledge
- missing action context
- tone mismatch for situation

### 2) Understand Communication Context

- audience type (technical, general, first-time, repeat users)
- user emotional state in this moment (error, success, decision, waiting)
- desired action or next step
- space/character constraints and localization limits

Unclear copy increases user frustration and support load.

## Plan Copy Improvements

Define strategy before rewriting.

- primary message: one thing the user must understand
- required action: what to do next, if anything
- tone: helpful, reassuring, neutral, urgent, or celebratory as context demands
- constraints: character limits, brand voice, i18n/localization needs

Good UX writing should feel effortless to read.

## Improve Copy Systematically

### Error Messages

Use plain language with recovery guidance.

- explain what went wrong
- explain how to fix it
- avoid blaming the user
- include examples when useful
- link to help/support when needed

### Form Labels and Instructions

- use specific labels, not generic placeholders
- show expected format with examples
- explain why information is needed when non-obvious
- place critical instructions before input when possible
- keep required indicators clear and consistent

### Buttons and CTAs

- use specific action language (`verb + object`)
- avoid vague labels like `OK`, `Submit`, `Click here`
- align wording to user mental model and outcome

### Help Text and Tooltips

- add new value; do not repeat labels
- answer implicit user questions (`what is this?` / `why is this needed?`)
- keep concise and link to deeper help when needed

### Empty States

- explain why the state is empty
- offer a clear next action
- keep tone welcoming and forward-moving

### Success Messages

- confirm what succeeded
- include what happens next when relevant
- keep concise and tone-appropriate

### Loading States

- state what is happening
- set realistic time expectations for long operations
- show progress when possible
- provide cancel/escape option when appropriate

### Confirmation Dialogs

- name the specific action being confirmed
- describe irreversible consequences clearly
- use explicit button labels (`Delete project` not `Yes`)
- reserve confirmations for meaningful risk

### Navigation and Wayfinding

- use specific, user-facing terms
- avoid vague menu labels
- keep hierarchy and location cues clear

## Clarity Principles

Apply these to every rewritten string:

1. be specific
2. be concise without losing meaning
3. use active voice by default
4. use human language
5. provide actionable guidance
6. keep terminology consistent

## Non-Negotiables

- Do not use unexplained jargon.
- Do not blame users in error copy.
- Do not use vague messages without next steps.
- Do not rely on placeholders as only labels.
- Do not vary core terminology unnecessarily.
- Do not add redundant copy that repeats itself.
- Do not use humor in error contexts where empathy is required.

## Verify Improvements

Validate rewritten copy for:

- comprehension without extra context
- clear next action
- brevity with preserved clarity
- terminology consistency across the product
- situation-appropriate tone

Write like you are helping a smart user unfamiliar with internals: clear, direct, and useful.
