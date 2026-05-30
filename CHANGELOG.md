# Changelog

## [0.1] — 2026-05-30

### Added

- Initial schema + validator + canonical example.
- **3-axis typed policy contract** — first vault contract in the Suite with three orthogonal axes:
  - `cui_handling_policy` (9 CUI tiers PUBLIC → SCI)
  - `export_control_handling_policy` (4 tiers NOT-EXPORT-CONTROLLED / EAR-99 / EAR-CCL-RESTRICTED / ITAR)
  - `foreign_person_handling_policy` (5 tiers US-PERSON-ONLY / AUTHORIZED-FOREIGN-PERSON-WITH-LICENSE / FIVE-EYES-ONLY / NATO-PLUS-ONLY / NO-RESTRICTION)
- **`resolvePolicy()` runtime intersection function** — given a (CUI tier, export tier, foreign tier) tuple, computes the most-restrictive policy across the 3 axes: intersected allowed_actions, max minimum_human_user_status, OR-ed distribution_statement/fso_cosign/audit_stream_event requirements.
- **Cross-binding refs as required fields** — every contract MUST declare its sibling repos (audit-stream, evidence-bundle, incident-card). Makes the vault contract the centerpiece of the DefenseTech 6-pack.
- `data_vault_targets` block (per Skyflow Phase 0 + Vault Contract Pattern landing) — 5 vault provider kinds, 5 vault tiers, FIPS 140 + FedRAMP boolean flags.
- `retention_envelope` per Decision Card v0.3.
- 4 invariants enforced:
  - **#1** CUI-Specified+ must declare `requires_distribution_statement: true` (DoDI 5230.24)
  - **#2** ITAR must declare `minimum_human_user_status` of `us-person-verified` or stricter (22 CFR 120.62)
  - **#3** CLASSIFIED-* must declare BOTH `requires_audit_stream_event: true` AND `requires_fso_cosign: true`
  - **#4** AUTHORIZED-FOREIGN-PERSON-WITH-LICENSE must declare `requires_audit_stream_event: true` (per-event DDTC license review)
- Canonical example: Stratos Aerospace × VendorD GuardianAI v3.x — 3 vault targets (Azure Government CUI vault, Skyflow TDP tokenization, on-prem FIPS-140 classified vault), 9+4+5 = 18 tier policies populated, SCI tier blocked entirely.
- 10 unit tests including resolvePolicy intersection logic + 4 negative invariant tests.

### Not yet

- Wildcard policy authoring (currently every tier of every axis must be explicitly populated).
- Policy inheritance from a base contract (every contract is freestanding).
- Skyflow-specific tokenization-strategy authoring helpers.
- Cross-contract diff / conformance against a baseline contract.
- ICD 705 SCIF physical-control declarations on the SCI tier (currently encoded as `no-action-allowed`, deferred until SCIF-host scenario is concrete).
