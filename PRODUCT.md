# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The author first, and anyone who finds the public app. One person, at home, on a phone or at a desk, who has just done a recurring chore (watered the plants, descaled the kettle, changed the sheets) or wonders when they last did it. Visits last a few seconds and happen several times a week.

## Product Purpose

lastdone answers "when did I last do X?" and nudges when a recurring task is due. The user types a sentence ("I watered the plants", "when did I last descale the kettle?", "remind me to water every 5 days") and the app turns it into an action. Success: the answer is visible at a glance, and logging a chore takes one sentence or one tap.

## Positioning

A language model runs inside the browser (WebLLM on WebGPU) and only translates a sentence into a structured intent; the app executes it deterministically. Everything is local: no backend, no account, no API key, data never leaves the device.

## Operating Context

- Installed as a PWA from https://maxgfr.github.io/lastdone/ or used in a tab.
- First use of the model downloads about 1 GB (Qwen2.5 1.5B) or about 400 MB (0.5B), then it is cached. Never downloaded automatically on a metered connection.
- Without WebGPU, or while the model loads, a rule-based FR/EN parser answers and every task keeps a one-tap "Done" button.
- Reminders: overdue badge on open, browser notifications while the app is open or installed, `.ics` export that must be re-exported after logging.

## Capabilities and Constraints

- Tasks have a name, aliases and an optional interval in days; the log is append-only.
- Status per task: ok, soon, overdue. List sorted by urgency.
- Storage is localStorage only, with JSON export/import.
- Input understood in French and English; all interface copy is in English.
- Out of scope: sync, accounts, push notifications while closed, remote LLM providers.

## Brand Commitments

- Name: lastdone (lowercase).
- Everything stays local; the UI should make that felt, not just claimed.
- The task list leads the home screen; the sentence input is docked at the bottom.
- Anti-references: gamified habit trackers (streaks, confetti, guilt), AI chatbot looks (bubbles everywhere, sparkles, assistant persona), generic SaaS todo apps (checkbox lists, blue buttons, cards on gray).
- The author asked for creativity.

## Evidence on Hand

No users, testimonials or metrics. Demo content (tasks and dates) is synthetic.

## Product Principles

1. The answer before the question: the last time and the next due date are readable without typing.
2. Sentences are a shortcut, never a requirement: every action also works by tap.
3. Local and honest: show what runs on the device and what the model is doing, including when it is not available.
4. Calm, not nagging: overdue is information, not guilt.
