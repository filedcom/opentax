import { assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../2025/registry.ts";
import { buildMefXml } from "../../../../2025/mef/builder.ts";
import { buildPending } from "../../../../2025/mef/execution/pending.ts";
import { irs1040Pdf } from "../../../../2025/pdf/forms/general/return-assembly/f1040.ts";
import { form8862Pdf } from "../../../../2025/pdf/forms/credits/individual/f8862.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";

const plan = buildExecutionPlan(registry);
const general = {
  filing_status: "single",
  digital_assets: false,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_tin_issued_by_due_date: true,
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  main_home_in_us_over_half_year: true,
  taxpayer_can_be_claimed_as_dependent: false,
  childless_eic_review: {
    not_qualifying_child_of_another_taxpayer_verified: true,
    qualifying_child_status_record_reference: "Synthetic 2025 family review",
  },
  prior_eic_disallowance_review: {
    status: "requires_8862",
    disallowed_year: 2023,
    disallowance_notice_reference: "Synthetic 2023 IRS notice",
  },
  eic_tax_residency_review: {
    status: "all_year_resident",
    taxpayer_status_record_reference: "Synthetic 2025 resident status review",
  },
};
const w2 = {
  employee_ssn: "111-22-3333",
  employer_ein: "12-3456789",
  employer_name: "Example Employer",
  employer_address_line1: "10 Employer Road",
  employer_address_city: "Austin",
  employer_address_state: "TX",
  employer_address_zip: "78701",
  box1_wages: 5_000,
  box2_fed_withheld: 0,
  box3_ss_wages: 5_000,
  box4_ss_withheld: 310,
  box5_medicare_wages: 5_000,
  box6_medicare_withheld: 72.5,
};
const form8862 = {
  claim_eitc: true,
  credit_disallowance_ban_active: false,
  eitc_disallowed_year: 2023,
  eitc_disallowance_notice_reference: "Synthetic 2023 IRS notice",
  eitc_income_reporting_only: false,
  eitc_qualifying_child_of_other: false,
  eitc_without_child: {
    primary: {
      main_home_us_days: 365,
      age: 40,
      claimed_as_dependent: false,
    },
  },
};
const context = { taxYear: 2025, formType: "f1040" };
Deno.test("prior EIC disallowance calculates the credit but stops unauthenticated Form 8862 export", () => {
  const withoutForm = execute(plan, registry, {
    general,
    w2: [w2],
  }, context);
  assertEquals(withoutForm.diagnostics, []);
  assertEquals(withoutForm.pending.f1040.line27_eitc, undefined);

  const result = execute(plan, registry, {
    general,
    w2: [w2],
    f8862: form8862,
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line27_eitc, 384);
  const filer = extractFilerIdentity(result.pending.f1040);
  assertThrows(
    () => buildMefXml(buildPending(result.pending), filer),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );
  assertThrows(
    () => form8862Pdf.instances!(result.pending.f8862, filer, result.pending),
    Error,
    "executor-owned authentication of prior IRS notice issuance and contents",
  );

  const wrongNotice = {
    ...result.pending,
    f8862: {
      ...result.pending.f8862,
      eitc_disallowance_notice_reference: "Different notice",
    },
  };
  assertThrows(
    () => buildMefXml(buildPending(wrongNotice), filer),
    Error,
    "reviewed prior-disallowance history",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(result.pending.f1040, wrongNotice),
    Error,
    "reviewed prior-disallowance history",
  );
});
