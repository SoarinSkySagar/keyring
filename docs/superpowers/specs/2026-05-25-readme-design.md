# README Design Spec — Keyring
Date: 2026-05-25

## Context
Greenfield hackathon project. No code exists yet. README is the first artifact.

## Decisions
- **Primary audience:** Hackathon judges (Story Foundation CDR hackathon, Aeneid testnet)
- **Tense:** Present tense — describes the finished design as built
- **Diagrams:** Mermaid (renders on GitHub)
- **Structure:** Option A — Problem-first narrative

## Section Order
1. Header — name, tagline, badges
2. The Problem — concrete scenario, structural gap
3. Why This Matters Now — agent proliferation context
4. The Key Insight — CDR + TEE properties that make this tractable
5. How Keyring Works — 3–4 sentence overview
6. Architecture — Mermaid diagram (3 trust zones + CDR/blockchain), zone breakdown
7. Core Components — table: AgentRegistry, Gateway 1, Gateway 2, TEE Runtime, Venice, Dashboard
8. End-to-End Workflow — 7 numbered steps (EIP-712 intent → result)
9. Gateway 1: Request Authorization — 9 deterministic checks
10. Gateway 2: Decryption Conditions — 8 CDR condition checks (technical-track core)
11. Execution & Teardown — zeroization, single-use, audit event
12. Security Model — 4 guarantees table
13. Honest Limitations — what we don't claim
14. Tech Stack — table: Layer | Technology | Role
15. Hackathon — Aeneid context, both prize tracks
16. Glossary — key terms

## Constraints carried through
- Plaintext only in TEE — never in client, never in contract
- Venice is veto-only — sees metadata, never secrets
- CDR gates decryption; does NOT compute over ciphertext
- Revocability is before-reveal only
- No compute-over-ciphertext claims
