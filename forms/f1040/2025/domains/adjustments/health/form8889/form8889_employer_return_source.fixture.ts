import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { inputSchema } from "../../../../../nodes/intermediate/forms/adjustments/health/form8889/index.ts";
import { employerCode2ReturnSource } from "./form8889_employer_code2_source.fixture.ts";

const retained = (facts: Record<string, unknown>) => {
  const bytes = Buffer.from(JSON.stringify(facts));
  return {
    source_document_reference: String(facts.source_document_reference),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes_base64: bytes.toString("base64"),
  };
};

/** Reviewed correction packet; no issuer authentication or owner distribution. */
export function employerReturnedExcessSource(owner: "T" | "S") {
  const inputs: any = structuredClone(employerCode2ReturnSource(owner));
  const ssn = owner === "T" ? "111223333" : "444556666";
  const account = `HSA-${owner}-2025`;
  const correctionRef = `employer-${owner}-2025-error-correction`;
  const filedW2Ref = `employer-${owner}-final-w2-2025`;
  const hsa = inputs.form8889;
  const affected = owner === "T" ? hsa : hsa.spouse_hsa;
  delete hsa.retained_employer_code2_evidence;
  delete affected.employer_excess_treatment;
  delete affected.hsa_distributions;
  delete affected.form1099_sa_distributions;
  inputs.w2[0].source_document_reference = filedW2Ref;
  inputs.w2[0].box12_entries = [{ code: "W", amount: 4300 }];
  hsa.w2_code_w_entries = [{ employee_ssn: ssn, amount: 4300 }];
  hsa.retained_employer_return_evidence = {
    employer_correction: retained({
      source_document_reference: correctionRef,
      employer_ein: "123456789",
      employee_ssn: ssn,
      hsa_account_reference: account,
      original_2025_contribution: 5000,
      annual_223b_limit: 4300,
      excess_error_principal: 700,
      error_kind: "contribution_above_annual_223b_limit",
      recoup_requested_on: "2025-09-10",
    }),
    trustee_remittance: retained({
      source_document_reference: `trustee-${owner}-paid-employer-2025`,
      employer_correction_reference: correctionRef,
      trustee_ein: "234567890",
      employer_ein: "123456789",
      employee_ssn: ssn,
      hsa_account_reference: account,
      paid_to: "employer",
      paid_on: "2025-09-15",
      returned_principal: 700,
      returned_earnings: 50,
    }),
    filed_w2: retained({
      source_document_reference: filedW2Ref,
      employer_ein: "123456789",
      employee_ssn: ssn,
      box1_wages: 90000,
      box12_code_w: 4300,
    }),
    trustee_5498sa: retained({
      source_document_reference: `trustee-${owner}-5498sa-2025`,
      trustee_ein: "234567890",
      owner_ssn: ssn,
      hsa_account_reference: account,
      contribution_year: 2025,
      box2_total_2025_contributions: 4300,
      employer_return_excluded: true,
    }),
  };
  inputs.form8889 = inputSchema.parse(hsa);
  return inputs;
}
