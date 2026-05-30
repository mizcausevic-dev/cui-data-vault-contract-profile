import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA = JSON.parse(readFileSync(resolve(HERE, "../schema/vault-contract.schema.json"), "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const compiled = ajv.compile(SCHEMA);

export function validate(contract) {
  const errors = [];
  if (!compiled(contract)) {
    for (const e of compiled.errors) errors.push(`schema: ${e.instancePath} ${e.message}`);
    return { ok: false, errors };
  }
  // Invariant#1: CUI-SPECIFIED+ policy MUST set requires_distribution_statement = true (DoDI 5230.24).
  for (const tier of ["CUI-SPECIFIED", "CUI-SPECIFIED-NOFORN", "CONTROLLED-NOFORN", "CLASSIFIED-CONFIDENTIAL", "CLASSIFIED-SECRET", "CLASSIFIED-TOP-SECRET", "SCI"]) {
    const p = contract.axis_policies.cui_handling_policy[tier];
    if (p && p.requires_distribution_statement !== true) {
      errors.push(`invariant#1: cui_handling_policy[${tier}].requires_distribution_statement must be true (DoDI 5230.24)`);
    }
  }
  // Invariant#2: ITAR policy MUST require us-person-verified (or stricter) minimum_human_user_status.
  const itarPolicy = contract.axis_policies.export_control_handling_policy.ITAR;
  const validItarMins = ["us-person-verified", "authorized-foreign-person-with-license", "secret-clearance", "top-secret-clearance", "ts-sci-clearance"];
  if (!validItarMins.includes(itarPolicy.minimum_human_user_status)) {
    errors.push(`invariant#2: export_control_handling_policy.ITAR.minimum_human_user_status must be us-person-verified or stricter (got "${itarPolicy.minimum_human_user_status}")`);
  }
  // Invariant#3: every CLASSIFIED-* policy MUST require_audit_stream_event = true AND require_fso_cosign = true.
  for (const tier of ["CLASSIFIED-CONFIDENTIAL", "CLASSIFIED-SECRET", "CLASSIFIED-TOP-SECRET", "SCI"]) {
    const p = contract.axis_policies.cui_handling_policy[tier];
    if (p) {
      if (p.requires_audit_stream_event !== true) errors.push(`invariant#3: cui_handling_policy[${tier}].requires_audit_stream_event must be true`);
      if (p.requires_fso_cosign !== true) errors.push(`invariant#3: cui_handling_policy[${tier}].requires_fso_cosign must be true`);
    }
  }
  // Invariant#4: AUTHORIZED-FOREIGN-PERSON foreign policy MUST require_audit_stream_event = true.
  const afp = contract.axis_policies.foreign_person_handling_policy["AUTHORIZED-FOREIGN-PERSON-WITH-LICENSE"];
  if (afp.requires_audit_stream_event !== true) {
    errors.push(`invariant#4: foreign_person_handling_policy["AUTHORIZED-FOREIGN-PERSON-WITH-LICENSE"].requires_audit_stream_event must be true (per-event DDTC license review)`);
  }
  return { ok: errors.length === 0, errors };
}

const argv1 = (process.argv[1] ?? "").replace(/\\/g, "/");
if (import.meta.url.endsWith("/validate.mjs") && argv1.endsWith("validate.mjs")) {
  const file = process.argv[2] ?? "examples/stratos-guardianai-vault-contract.json";
  const path = resolve(process.cwd(), file);
  const contract = JSON.parse(readFileSync(path, "utf8"));
  const result = validate(contract);
  if (!result.ok) {
    for (const e of result.errors) console.error("✗", e);
    console.error(`\nFAIL · ${result.errors.length} error(s)`);
    process.exit(1);
  }
  console.log(`OK · ${contract.contract_id} · schema ✓ · 4 invariants ✓`);
}
