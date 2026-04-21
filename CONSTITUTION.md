# Mosport Engineering Constitution v1.0

This document defines the non-negotiable architecture rules for the Mosport system.

All generated code must follow these rules.
No component may violate this structure.

---

## Core Principle

Mosport is a sports intelligence engine, not just a sports website.
The system must separate data ingestion, state modeling, quantitative analysis, and signal generation.
The architecture must remain deterministic and debuggable.

---

## System Architecture

The system must follow this fixed pipeline.

External Data
↓
Crawler Engine
↓
Reality Database
↓
World State Engine
↓
Quant Engine
↓
Signal Engine
↓
API Layer
↓
User Interface

No component may skip layers.

---

## Rule 1 — Crawler Isolation

Crawlers are only responsible for collecting external data.

Crawler responsibilities:
- fetch data
- validate data
- normalize data
- store data in database

Crawlers must never perform analysis or predictions.
Crawlers must never write into quant or signal tables.

---

## Rule 2 — Database as Source of Truth

The database is the single source of truth.
All engines must read from the database.
No engine may depend directly on external APIs.
External APIs must only be accessed by crawlers.

---

## Rule 3 — Anti-Corruption Layer

All external data must pass a validation layer before entering the database.

Pipeline:
External API
↓
Schema Validation (Zod)
↓
Normalization
↓
Database Insert

If validation fails:
store the payload in the `dead_letter_queue` table.

Invalid data must never enter production tables.

---

## Rule 4 — Hybrid Schema

Critical statistics must be stored as database columns.
Additional data may be stored as JSON.

Example:
`home_score`, `away_score` must be columns.
Detailed statistics may be stored in `raw_stats` JSONB.

This allows flexibility while maintaining query performance.

---

## Rule 5 — Engine Separation

Mosport engines must remain independent.

- **World State Engine** calculates team states.
- **Quant Engine** calculates statistical metrics.
- **Signal Engine** generates signals from quant outputs.

Each engine must read from database tables and write only to its own layer.

---

## Rule 6 — Deterministic Processing

Engines must produce deterministic outputs.
Given the same input data, the engine must produce the same result.
Avoid hidden randomness.
This ensures reproducibility and debugging capability.

---

## Rule 7 — API Read-Only

The API layer must be read-only for public endpoints.
Public APIs may read from the database but must not modify system state.
Only admin endpoints may trigger engine processes.

---

## Rule 8 — UI Isolation

The frontend must never call external sports APIs.
Frontend may only communicate with the system through internal APIs.
This ensures consistent data and prevents rate-limit issues.

---

## Rule 9 — Responsive Design

The user interface must automatically adapt to different screen sizes.

- Desktop layout: three column grid.
- Tablet layout: two column grid.
- Mobile layout: single column vertical stack.

All tables must remain usable on mobile screens by implementing horizontal overflow scrolling or transforming rows into collapsible data cards.

---

## Rule 10 — Deployment Model

The system must support the following deployment architecture.

- Repository hosted on GitHub
- Application deployed on Vercel
- Database hosted on Railway

The system must build successfully without local environment setup.

---

## Rule 11 — Scheduler Safety

Automated jobs must trigger crawlers and engines in the following order.

Crawler
↓
World State Engine
↓
Quant Engine
↓
Signal Engine

No engine may execute before crawler updates.
Engines must only execute if the Crawler reports a successful and complete run (State Lock).

---

## Rule 12 — Legal Compliance

The system must not display sportsbook brand names.
Market data must be labeled as **Global Market Implied Probability**.
The platform must include a disclaimer modal on first login.

---

## Final Principle

The Mosport system must remain simple, modular, and debuggable.

If a feature threatens architecture clarity, it must not be implemented.
System stability is more important than feature complexity.
Low compute cost and predictable API usage are as critical as system stability.

Follow this engineering constitution strictly.
Do not modify the architecture unless explicitly instructed.
