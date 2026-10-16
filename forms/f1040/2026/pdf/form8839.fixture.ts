import { adoptionGraphFixture2026 } from "../inputs/adoption-graph.fixture.ts";
/** Five distinct synthetic children, including a prior claim in column 3. */
export function adoptionOverflowFixture2026() {
  const input = adoptionGraphFixture2026(280000, 0);
  input.general.dependents = [];
  const first = input.form8839.claim.children[0];
  input.form8839.claim.children = Array.from({ length: 5 }, (_, i) => {
    const ch = structuredClone(first), suffix = String(i + 1);
    ch.record_reference = `child-${suffix}`;
    ch.first_name = `Child${suffix}`;
    ch.last_name = "Synthetic";
    ch.identifying_number = `40000104${suffix}`;
    ch.identity_document_reference = `birth-${suffix}`;
    if (ch.finalization.kind === "final") {
      ch.finalization.decree_reference = `decree-${suffix}`;
    }
    ch.expenses.forEach((e) => {
      e.record_reference += suffix;
      e.receipt_reference += suffix;
      e.payment_reference += suffix;
    });
    return ch;
  });
  const prior = input.form8839.claim.children[0];
  delete prior.no_prior_form8839_claim_verified;
  prior.prior_form8839 = {
    source_document_reference: "2025-adoption-copy",
    form_copy_number: 1,
    child_column: 3,
    tax_year: 2025,
    parent_tin: input.general.taxpayer_ssn.replaceAll("-", ""),
    child_tin: prior.identifying_number,
    latest_filed_current_copy_and_no_intervening_claim_verified: true,
    line3: 0,
    line6: 1000,
    line20: 0,
    line24: 0,
  };
  return input;
}
