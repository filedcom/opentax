import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { inputSchema } from "../nodes/intermediate/forms/form8889/index.ts";
import { employerCode2ReturnSource } from "./form8889_employer_code2_source.fixture.ts";
const retained = (facts: Record<string, unknown>) => {
  const bytes = Buffer.from(JSON.stringify(facts));
  return {
    source_document_reference: String(facts.source_document_reference),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes_base64: bytes.toString("base64"),
  };
};
/** Reviewed 2026 transaction, with no invented 2026 issued Form 1099-SA. */
export function employerPostyearOwnerSource(owner: "T" | "S") {
  const inputs: any = structuredClone(employerCode2ReturnSource(owner));
  const ssn = owner === "T" ? "111223333" : "444556666";
  const hsa = inputs.form8889;
  const affected = owner === "T" ? hsa : hsa.spouse_hsa;
  delete hsa.retained_employer_code2_evidence;
  delete affected.hsa_distributions;
  delete affected.form1099_sa_distributions;
  affected.employer_excess_treatment.timely_withdrawal.withdrawal_tax_year =
    2026;
  delete affected.employer_excess_treatment.timely_withdrawal
    .form1099_sa_source_reference;
  const account = `HSA-${owner}-2025`;
  const trusteeRef = `trustee-${owner}-2026-owner-excess-payment`;
  hsa.retained_employer_postyear_evidence = {
    filed_2025_w2: retained({
      source_document_reference: inputs.w2[0].source_document_reference,
      employer_ein: "123456789",
      employee_ssn: ssn,
      box1_wages: 90000,
      box12_code_w: 5000,
    }),
    trustee_2026_payment: retained({
      source_document_reference: trusteeRef,
      trustee_ein: "234567890",
      owner_ssn: ssn,
      hsa_account_reference: account,
      transaction_date: "2026-03-15",
      contribution_year_corrected: 2025,
      transaction_type: "returned_excess_to_hsa_owner",
      principal: 700,
      earnings: 50,
      paid_to: "hsa_owner",
    }),
    owner_2026_receipt: retained({
      source_document_reference: `owner-${owner}-2026-receipt`,
      trustee_transaction_reference: trusteeRef,
      owner_ssn: ssn,
      hsa_account_reference: account,
      received_on: "2026-03-15",
      total_received: 750,
    }),
  };
  inputs.form8889 = inputSchema.parse(hsa);
  return inputs;
}
