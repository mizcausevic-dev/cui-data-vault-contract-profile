# cui-data-vault-contract-profile

> **DefenseTech Decision Card vault contract (Spec #6 of the DefenseTech 6-pack — DESIGN CENTERPIECE).** First Suite vault contract with **three orthogonal typed policy slots** (CUI categorization × export-control status × foreign-person access restriction). Each axis declares per-tier allowed_actions, minimum_human_user_status, distribution_statement requirement, FSO co-sign requirement, and audit-stream event requirement. `resolvePolicy()` intersects all three axes at runtime to produce the operative policy for a (CUI tier, export tier, foreign tier) tuple.

Part of the [Kinetic Gain Protocol Suite](https://suite.kineticgain.com).

> Status: v0.1 draft. Cross-bound to all 3 sibling DefenseTech specs (audit-stream, evidence-bundle, incident-card) — the unique cross-binding centerpiece of the DefenseTech 6-pack.

## What this contract pins down

A vault contract is the deal between an AI tool's Decision Card and the data tiers it's allowed to touch. The DefenseTech version is unique in the Suite because **three independent regulatory regimes** each carry their own enforcement architecture:

| Axis | What declares the rule | What enforces it |
| --- | --- | --- |
| **CUI categorization** (9 tiers) | NARA-ISOO + DoD CIO | Contract clauses + agency oversight |
| **Export control status** (4 tiers) | DDTC (ITAR) + BIS (EAR) | License pre-authorization + Entity List screening |
| **Foreign-person restriction** (5 tiers) | DDTC + per-employer verification | Per-event US-person verification (22 CFR 120.62) + DDTC license number per AUTHORIZED-FOREIGN-PERSON access |

None of these axes compose. A `read` on an `ITAR + CUI-Specified-NoForn + US-Person-Only` resource is allowed only if the **intersection** of the three axes' `allowed_actions` includes `read`. The most-restrictive axis wins.

## The 3-axis design — first in the Suite

```js
import { resolvePolicy } from "cui-data-vault-contract-profile";

const policy = resolvePolicy(contract, "CUI-SPECIFIED-NOFORN", "ITAR", "US-PERSON-ONLY");
// → { resolved_allowed_actions: ["read", "search", "summarize"],
//     resolved_minimum_human_user_status: "us-person-verified",
//     resolved_requires_distribution_statement: true,
//     resolved_requires_fso_cosign: false,
//     resolved_requires_audit_stream_event: true }
```

Compared to:
- LegalTech vault contract: **1-axis** (`privilege_tier`)
- EnergyTech vault contract: **2-axis** (`bes_categorization` × `ot_it_boundary`)
- HealthTech / FinTech / InsurTech / EdTech / PropTech / HR / GovTech vault contracts: 1-axis equivalent

DefenseTech is the first 3-axis vault contract in the Suite. The intersection logic in `resolvePolicy()` is the design innovation it inherits to.

## Four invariants enforced

1. **CUI-Specified+ distribution-statement invariant** — every CUI categorization at `CUI-SPECIFIED` or higher must declare `requires_distribution_statement: true` (DoDI 5230.24).
2. **ITAR minimum-status invariant** — the ITAR export-control policy must set `minimum_human_user_status` to `us-person-verified` or stricter (per 22 CFR 120.62 US-person definition).
3. **Classified audit + cosign invariant** — every `CLASSIFIED-*` CUI tier must set BOTH `requires_audit_stream_event: true` AND `requires_fso_cosign: true`.
4. **Foreign-person per-event audit invariant** — `AUTHORIZED-FOREIGN-PERSON-WITH-LICENSE` foreign-person policy must set `requires_audit_stream_event: true` (per-event DDTC license review).

## Cross-binding refs (the centerpiece)

This vault contract is the **single point of cross-binding** for the DefenseTech 6-pack. Every contract MUST declare:

| Repo | Purpose |
| --- | --- |
| `defense_decision_record_audit_stream_repo` | Audit-stream events MUST satisfy this contract's `requires_audit_stream_event` directive |
| `cmmc_l2_l3_readiness_evidence_bundle_repo` | Evidence bundles ingest evidence proving this contract is in force |
| `defense_ai_incident_card_profile_repo` | Any vault contract violation becomes an Incident Card |

The DefenseTech 6-pack is the first vertical where the vault contract explicitly publishes its sibling-spec relationships as required fields.

## Canonical example

`STRATOS-VAULT-GUARDIANAI-2026Q4`:
- 3 vault targets: `vault-azgov-cui` (Azure Government, FedRAMP-authorized, encryption-at-rest-keyed) · `vault-skyflow-tdp` (Skyflow tokenization for TDP IDs) · `vault-prem-classified` (on-prem FIPS-140-validated, structured encryption)
- All 9 CUI tiers, all 4 export tiers, all 5 foreign-person tiers populated
- `SCI` tier explicitly set to `no-action-allowed` — GuardianAI v3.x is not authorized for SCI inference at all
- Issued 2026-10-01, expires 2027-09-30 (12-month vault contract cycle)
- Cross-bound to all 3 sibling repos

## Verify

```bash
npm install
npm run build:examples
npm run validate          # schema + 4 invariants
npm test                  # 10 unit tests including resolvePolicy intersection logic
```

## Composes with

The cross-binding makes this composition mandatory:

- [`defense-decision-record-audit-stream`](https://github.com/mizcausevic-dev/defense-decision-record-audit-stream)
- [`cmmc-l2-l3-readiness-evidence-bundle`](https://github.com/mizcausevic-dev/cmmc-l2-l3-readiness-evidence-bundle)
- [`defense-ai-incident-card-profile`](https://github.com/mizcausevic-dev/defense-ai-incident-card-profile)
- [`dod-cmmc-disclosure-tracker`](https://github.com/mizcausevic-dev/dod-cmmc-disclosure-tracker)
- [`defense-contractor-bias-coverage-lab`](https://github.com/mizcausevic-dev/defense-contractor-bias-coverage-lab)
- [Kinetic Gain Protocol Suite](https://suite.kineticgain.com) — umbrella

## Compliance posture

Vault-contract **readiness scaffolding**. The contract DECLARES policy posture; it does NOT enforce it at the vault level — actual enforcement lives in Skyflow / Azure Government / AWS GovCloud / on-prem vault implementations. Does NOT constitute CMMC certification, DDTC export license, or DCSA-approved IS-1 system security plan. Per the standing Suite public-language guardrail: *readiness · evidence · posture · controls · scaffolding* — never "compliant" / "certified" without external attestation.

## License

MIT.
