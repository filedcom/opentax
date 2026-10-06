// deno-lint-ignore-file no-explicit-any
import { createHash } from "node:crypto";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import {
  preferentialAmtCases,
  preferentialAmtInputs,
} from "./form4972_preferential_amt.fixture.ts";

/** Ada's retained high-income farm, dividend, ISO and pension sources plus one issued nonfarm W-2. */
export function scheduleJNonfarmW2Inputs(): Record<string, unknown> {
  const farm = pdfReviewFixtures.find((f) =>
    f.id === "single-schedule-j-farm-income-averaging"
  )!;
  const input = preferentialAmtInputs(preferentialAmtCases[0]) as Record<
    string,
    any
  >;
  delete input.w2;
  input.general.qbi_no_prior_loss_or_suspended_loss_confirmed = true;
  input.general.qbi_not_patron_of_specified_cooperative_confirmed = true;
  input.schedule_f = structuredClone(farm.inputs.schedule_f);
  input.schedule_f.schedule_fs[0].line2_sales_products_raised = 200_000;
  input.schedule_f.schedule_fs[0].line_d_ein = "12-3456789";
  input.schedule_j = structuredClone(farm.inputs.schedule_j);
  input.schedule_j.tax_treatment.year2025.has_qualified_dividends = true;
  input.w2 = [{
    employer_ein: "987654321",
    employer_name: "Hill Country Engineering Inc",
    employer_address_line1: "100 Engineering Way",
    employer_address_city: "Austin",
    employer_address_state: "TX",
    employer_address_zip: "78702",
    employee_ssn: "123456789",
    source_document_reference: "W2-ADA-2025-ENGINEERING",
    schedule_j_nonfarm_wage_source_document_id: "ENGINEERING-EMPLOYER-2025",
    box1_wages: 100_000,
    box2_fed_withheld: 20_000,
    box3_ss_wages: 100_000,
    box4_ss_withheld: 6_200,
    box5_medicare_wages: 100_000,
    box6_medicare_withheld: 1_450,
  }];
  const issuedEmployerRecord = {
    tax_year: 2025,
    issued_by: "Hill Country Engineering Inc",
    issued_on: "2026-01-31",
    employer_ein: "987654321",
    employer_name: "Hill Country Engineering Inc",
    legal_entity_type: "c_corporation",
    naics_code: "541330",
    employee_ssn: "123456789",
    w2_source_document_reference: "W2-ADA-2025-ENGINEERING",
    w2_box1_wages: 100_000,
    w2_box2_withholding: 20_000,
    w2_box3_ss_wages: 100_000,
    w2_box5_medicare_wages: 100_000,
    employment_start: "2025-01-01",
    employment_end: "2025-12-31",
    services: "Civil engineering design outside farming operations",
  };
  const bytes = new TextEncoder().encode(JSON.stringify(issuedEmployerRecord));
  input.schedule_j.nonfarm_wage_source = {
    document_id: "ENGINEERING-EMPLOYER-2025",
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes_base64: btoa(String.fromCharCode(...bytes)),
  };
  return input;
}
