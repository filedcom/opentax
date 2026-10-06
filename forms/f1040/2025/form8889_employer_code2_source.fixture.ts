import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { inputSchema } from "../nodes/intermediate/forms/form8889/index.ts";

const retained = (facts: Record<string, unknown>) => {
  const bytes = Buffer.from(JSON.stringify(facts));
  return {
    source_document_reference: String(facts.source_document_reference),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes_base64: bytes.toString("base64"),
  };
};
/** A reviewed public W-2/trustee/payment packet, not an issuer-authenticated one. */
export function employerCode2ReturnSource(owner: "T" | "S") {
  const base = pdfReviewFixtures.find((row) =>
    row.id === "joint-two-hsa-owners"
  )!;
  const inputs: any = structuredClone(base.inputs);
  const ssn = owner === "T" ? "111223333" : "444556666";
  const sourceReference = `employer-${owner}-issued-w2-2025`;
  const formReference = `trustee-${owner}-issued-1099sa-2025`;
  const account = `HSA-${owner}-2025`;
  inputs.general.spouse_dob = "1987-03-10";
  inputs.w2[0].employee_ssn = ssn;
  inputs.w2[0].source_document_reference = sourceReference;
  inputs.w2[0].box12_entries = [{ code: "W", amount: 5000 }];
  const hsa = inputs.form8889;
  hsa.spouse_hsa.age_55_or_older = false;
  hsa.employer_contribution_years = {
    made_in_2025_for_2024_in_w2: 0,
    made_in_2026_for_2025: 0,
  };
  hsa.spouse_hsa.employer_contribution_years = {
    made_in_2025_for_2024_in_w2: 0,
    made_in_2026_for_2025: 0,
  };
  hsa.taxpayer_hsa_contributions = owner === "S" ? 2000 : undefined;
  hsa.spouse_hsa.taxpayer_hsa_contributions = owner === "T" ? 2000 : undefined;
  const employer = owner === "T" ? hsa : hsa.spouse_hsa;
  employer.employer_excess_treatment = {
    amount_included_in_w2_box1: 0,
    timely_withdrawal: {
      principal: 700,
      earnings: 50,
      withdrawal_tax_year: 2025,
      withdrawn_by_return_due_date: true,
      form1099_sa_source_reference: formReference,
    },
  };
  employer.hsa_distributions = 750;
  employer.form1099_sa_distributions = [{
    tax_year: 2025,
    recipient_ssn: ssn,
    box1_gross_distribution: 750,
    box2_earnings_on_excess: 50,
    box3_distribution_code: "2",
    source_reference: formReference,
    hsa_account_reference: account,
  }];
  hsa.w2_code_w_entries = [{ employee_ssn: ssn, amount: 5000 }];
  hsa.retained_employer_code2_evidence = {
    w2: retained({
      source_document_reference: sourceReference,
      employer_ein: "123456789",
      employee_ssn: ssn,
      box1_wages: 90000,
      box12_code_w: 5000,
    }),
    trustee_1099sa: retained({
      source_document_reference: formReference,
      trustee_ein: "234567890",
      owner_ssn: ssn,
      hsa_account_reference: account,
      paid_on: "2025-09-15",
      box1_gross_distribution: 750,
      box2_earnings_on_excess: 50,
      box3_distribution_code: "2",
    }),
    paid_owner_return: retained({
      source_document_reference: `trustee-${owner}-paid-owner-2025`,
      owner_ssn: ssn,
      hsa_account_reference: account,
      trustee_1099sa_reference: formReference,
      paid_on: "2025-09-15",
      principal: 700,
      earnings: 50,
      paid_to: "hsa_owner",
      return_due_on: "2026-04-15",
    }),
  };
  inputs.form8889 = inputSchema.parse(hsa);
  return inputs;
}
