import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CUI_TIERS, EXPORT_TIERS, FOREIGN_TIERS, resolvePolicy, summarize } from "../src/index.mjs";
import { validate } from "../src/validate.mjs";

const contract = JSON.parse(readFileSync(new URL("../examples/stratos-guardianai-vault-contract.json", import.meta.url), "utf8"));

test("9 CUI tiers / 4 export tiers / 5 foreign tiers", () => {
  assert.equal(CUI_TIERS.length, 9);
  assert.equal(EXPORT_TIERS.length, 4);
  assert.equal(FOREIGN_TIERS.length, 5);
});

test("example contract validates", () => {
  const r = validate(contract);
  assert.ok(r.ok, JSON.stringify(r.errors, null, 2));
});

test("resolvePolicy: CUI-Specified-NoForn + ITAR + US-Person-Only intersects to read/search/summarize", () => {
  const r = resolvePolicy(contract, "CUI-SPECIFIED-NOFORN", "ITAR", "US-PERSON-ONLY");
  assert.ok(r.resolved_allowed_actions.includes("read"));
  assert.ok(r.resolved_allowed_actions.includes("search"));
  assert.ok(r.resolved_allowed_actions.includes("summarize"));
  assert.ok(!r.resolved_allowed_actions.includes("generate"));
});

test("resolvePolicy: SCI tier blocks all actions even at lower other axes", () => {
  const r = resolvePolicy(contract, "SCI", "NOT-EXPORT-CONTROLLED", "US-PERSON-ONLY");
  assert.deepEqual(r.resolved_allowed_actions, []);
});

test("resolvePolicy: minimum status escalates to highest required across axes", () => {
  const r = resolvePolicy(contract, "CLASSIFIED-SECRET", "ITAR", "US-PERSON-ONLY");
  assert.equal(r.resolved_minimum_human_user_status, "secret-clearance");
});

test("invariant#1: CUI-Specified policy without dist statement fails", () => {
  const bad = JSON.parse(JSON.stringify(contract));
  bad.axis_policies.cui_handling_policy["CUI-SPECIFIED"].requires_distribution_statement = false;
  const r = validate(bad);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => e.includes("invariant#1")));
});

test("invariant#2: ITAR policy with any minimum status fails", () => {
  const bad = JSON.parse(JSON.stringify(contract));
  bad.axis_policies.export_control_handling_policy.ITAR.minimum_human_user_status = "any";
  const r = validate(bad);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => e.includes("invariant#2")));
});

test("invariant#3: CLASSIFIED-SECRET without fso_cosign or audit-stream-event fails", () => {
  const bad = JSON.parse(JSON.stringify(contract));
  bad.axis_policies.cui_handling_policy["CLASSIFIED-SECRET"].requires_fso_cosign = false;
  const r = validate(bad);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => e.includes("invariant#3")));
});

test("invariant#4: AUTHORIZED-FOREIGN-PERSON without audit-stream-event fails", () => {
  const bad = JSON.parse(JSON.stringify(contract));
  bad.axis_policies.foreign_person_handling_policy["AUTHORIZED-FOREIGN-PERSON-WITH-LICENSE"].requires_audit_stream_event = false;
  const r = validate(bad);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => e.includes("invariant#4")));
});

test("summarize counts", () => {
  const s = summarize(contract);
  assert.equal(s.cui_tier_count, 9);
  assert.equal(s.export_tier_count, 4);
  assert.equal(s.foreign_tier_count, 5);
  assert.equal(s.cross_binding_count, 3);
  assert.equal(s.vault_target_count, 3);
});
