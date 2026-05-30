import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../examples/stratos-guardianai-vault-contract.json");

const t = (allowed, minStatus, distStmt, fso, audit, opts = {}) => ({
  allowed_actions: allowed, minimum_human_user_status: minStatus,
  requires_distribution_statement: distStmt, requires_fso_cosign: fso, requires_audit_stream_event: audit,
  ...(opts.vault ? { vault_target_id_required: opts.vault } : {}),
  ...(opts.notes ? { notes: opts.notes } : {})
});

const contract = {
  contract_id: "STRATOS-VAULT-GUARDIANAI-2026Q4",
  schema_version: "0.1",
  decision_card_url: "https://stratos-aerospace.example/.well-known/decisions/STRATOS-DEC-2026-DEF-0084.json",
  issued_at: "2026-10-01T00:00:00Z",
  expires_at: "2027-09-30T23:59:59Z",
  ai_system: {
    name: "VendorD GuardianAI",
    version: "3.x",
    ai_tool_card_url: "https://vendord-guardianai.example/.well-known/ai-tool-cards/guardianai-3.x.json"
  },
  data_vault_targets: [
    { target_id: "vault-azgov-cui", vault_provider: "azure-government", vault_tier: "encryption-at-rest-keyed",
      fields_tokenized_or_held: ["rfp_solicitation_number", "cage_code", "personnel_clearance_id"], fips_140_validated: true, fedramp_authorized: true },
    { target_id: "vault-skyflow-tdp", vault_provider: "skyflow", vault_tier: "tokenization-only",
      fields_tokenized_or_held: ["technical_data_package_id", "weapon_system_program_id"], fips_140_validated: true, fedramp_authorized: false },
    { target_id: "vault-prem-classified", vault_provider: "private-on-prem-fips-140-validated", vault_tier: "structured-encryption",
      fields_tokenized_or_held: ["classified_inference_payload", "fso_cosign_token"], fips_140_validated: true, fedramp_authorized: false }
  ],
  axis_policies: {
    cui_handling_policy: {
      PUBLIC:                    t(["read", "search", "generate", "summarize", "redact"], "any", false, false, false),
      "CUI-BASIC":               t(["read", "search", "generate", "summarize", "redact"], "us-person-verified", false, false, true),
      "CUI-SPECIFIED":           t(["read", "search", "generate", "summarize"], "us-person-verified", true, false, true, { vault: "vault-azgov-cui" }),
      "CUI-SPECIFIED-NOFORN":    t(["read", "search", "summarize"], "us-person-verified", true, false, true, { vault: "vault-azgov-cui", notes: "NoForn implies generate output requires manual review before disclosure" }),
      "CONTROLLED-NOFORN":       t(["read", "summarize"], "us-person-verified", true, true, true, { vault: "vault-azgov-cui" }),
      "CLASSIFIED-CONFIDENTIAL": t(["read", "summarize"], "secret-clearance", true, true, true, { vault: "vault-prem-classified" }),
      "CLASSIFIED-SECRET":       t(["read", "summarize"], "secret-clearance", true, true, true, { vault: "vault-prem-classified" }),
      "CLASSIFIED-TOP-SECRET":   t(["read"], "top-secret-clearance", true, true, true, { vault: "vault-prem-classified" }),
      SCI:                       t(["no-action-allowed"], "ts-sci-clearance", true, true, true, { vault: "vault-prem-classified", notes: "GuardianAI v3.x not authorized for SCI inference; all actions blocked at vault layer" })
    },
    export_control_handling_policy: {
      "NOT-EXPORT-CONTROLLED":   t(["read", "search", "generate", "summarize", "redact"], "any", false, false, false),
      "EAR-99":                  t(["read", "search", "generate", "summarize", "redact"], "any", false, false, false),
      "EAR-CCL-RESTRICTED":      t(["read", "search", "generate", "summarize"], "us-person-verified", false, false, true),
      ITAR:                      t(["read", "search", "summarize"], "us-person-verified", true, false, true, { notes: "ITAR generate restricted; deemed-export-eligible foreign-person access requires AUTHORIZED-FOREIGN-PERSON tier" })
    },
    foreign_person_handling_policy: {
      "US-PERSON-ONLY":          t(["read", "search", "generate", "summarize", "redact"], "us-person-verified", false, false, true),
      "AUTHORIZED-FOREIGN-PERSON-WITH-LICENSE": t(["read", "search", "summarize"], "authorized-foreign-person-with-license", true, false, true, { notes: "DDTC license number required + per-event audit; review weekly" }),
      "FIVE-EYES-ONLY":          t(["read", "search", "generate", "summarize"], "us-person-verified", false, false, true, { notes: "AUS/CAN/GBR/NZL/USA cleared persons" }),
      "NATO-PLUS-ONLY":          t(["read", "search", "summarize"], "us-person-verified", false, false, true),
      "NO-RESTRICTION":          t(["read", "search", "generate", "summarize", "redact"], "any", false, false, false)
    }
  },
  retention_envelope: {
    default_retention_days: 2555,
    legal_hold_supported: true,
    destruction_method: "nist-sp-800-88-purge"
  },
  cross_binding_refs: {
    defense_decision_record_audit_stream_repo: "https://github.com/mizcausevic-dev/defense-decision-record-audit-stream",
    cmmc_l2_l3_readiness_evidence_bundle_repo: "https://github.com/mizcausevic-dev/cmmc-l2-l3-readiness-evidence-bundle",
    defense_ai_incident_card_profile_repo: "https://github.com/mizcausevic-dev/defense-ai-incident-card-profile"
  }
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(contract, null, 2) + "\n", "utf8");
console.log(`built vault contract → ${OUT}`);
