// Public surface — 3-axis vault contract introspection.

export const CUI_TIERS = ["PUBLIC", "CUI-BASIC", "CUI-SPECIFIED", "CUI-SPECIFIED-NOFORN", "CONTROLLED-NOFORN", "CLASSIFIED-CONFIDENTIAL", "CLASSIFIED-SECRET", "CLASSIFIED-TOP-SECRET", "SCI"];
export const EXPORT_TIERS = ["NOT-EXPORT-CONTROLLED", "EAR-99", "EAR-CCL-RESTRICTED", "ITAR"];
export const FOREIGN_TIERS = ["US-PERSON-ONLY", "AUTHORIZED-FOREIGN-PERSON-WITH-LICENSE", "FIVE-EYES-ONLY", "NATO-PLUS-ONLY", "NO-RESTRICTION"];

/**
 * Given a contract and a 3-axis tuple, return the *strictest* applicable policy across the three axes.
 * Strictness = smallest allowed_actions set, highest minimum_human_user_status,
 * plus any axis that demands distribution-statement / FSO cosign / audit-stream event.
 */
export function resolvePolicy(contract, cuiTier, exportTier, foreignTier) {
  const axes = [
    contract.axis_policies.cui_handling_policy[cuiTier],
    contract.axis_policies.export_control_handling_policy[exportTier],
    contract.axis_policies.foreign_person_handling_policy[foreignTier]
  ];
  // Intersection of allowed actions across the 3 axes.
  const allowedSets = axes.map((p) => new Set(p.allowed_actions));
  const intersection = [...allowedSets[0]].filter((a) => allowedSets[1].has(a) && allowedSets[2].has(a));
  // Highest minimum status.
  const statusRank = ["any", "us-person-verified", "authorized-foreign-person-with-license", "secret-clearance", "top-secret-clearance", "ts-sci-clearance"];
  const maxStatus = axes.reduce((acc, p) => {
    const ai = statusRank.indexOf(acc), pi = statusRank.indexOf(p.minimum_human_user_status);
    return pi > ai ? p.minimum_human_user_status : acc;
  }, "any");
  return {
    cui_tier: cuiTier, export_tier: exportTier, foreign_tier: foreignTier,
    resolved_allowed_actions: intersection,
    resolved_minimum_human_user_status: maxStatus,
    resolved_requires_distribution_statement: axes.some((p) => p.requires_distribution_statement),
    resolved_requires_fso_cosign: axes.some((p) => p.requires_fso_cosign),
    resolved_requires_audit_stream_event: axes.some((p) => p.requires_audit_stream_event)
  };
}

export function summarize(contract) {
  return {
    contract_id: contract.contract_id,
    vault_target_count: contract.data_vault_targets.length,
    cui_tier_count: Object.keys(contract.axis_policies.cui_handling_policy).length,
    export_tier_count: Object.keys(contract.axis_policies.export_control_handling_policy).length,
    foreign_tier_count: Object.keys(contract.axis_policies.foreign_person_handling_policy).length,
    cross_binding_count: Object.keys(contract.cross_binding_refs).length
  };
}
