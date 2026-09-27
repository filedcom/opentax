import { assertEquals, assertGreater } from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { FilingStatus } from "../nodes/types.ts";

const plan = buildExecutionPlan(registry);

Deno.test("Form 8826 credit reaches Form 3800 and posts zero when no tax is available", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
    },
    f8826: {
      eligible_expenditures: 5_000,
      prior_year_gross_receipts: 500_000,
      prior_year_full_time_employee_count: 20,
      subject_to_passive_activity_limit: false,
    },
  }, { taxYear: 2025, formType: "f1040" });

  assertEquals(result.pending.f3800?.f8826_credit_entries, [{
    source_type: "self",
    credit_amount: 2_375,
    subject_to_passive_activity_limit: false,
  }]);
  assertEquals(
    result.pending.schedule3?.line6a_general_business_credit,
    undefined,
  );
  assertEquals(result.pending.f1040?.line20_nonrefundable_credits ?? 0, 0);
  assertEquals(result.pending.f3800?.allowed_credit, 0);
  assertEquals(result.diagnostics, []);
});

Deno.test("pass-through-only disabled-access credit reaches Form 3800 without self eligibility facts", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
    },
    f8826: {
      eligible_expenditures: 0,
      subject_to_passive_activity_limit: false,
      pass_through_credits: [{
        entity_type: "s_corporation",
        entity_ein: "987654321",
        source_document_reference: "2025 disabled-access K-1",
        credit_amount: 1_250,
        subject_to_passive_activity_limit: false,
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });

  assertEquals(result.pending.f3800?.f8826_credit_entries, [{
    source_type: "s_corporation",
    source_ein: "987654321",
    credit_amount: 1_250,
    subject_to_passive_activity_limit: false,
  }]);
  assertEquals(
    result.pending.schedule3?.line6a_general_business_credit,
    undefined,
  );
  assertEquals(result.pending.f3800?.allowed_credit, 0);
  assertEquals(result.diagnostics, []);
});

Deno.test("Form 8826 allowed credit reaches Schedule 3 only after Form 3800 Part II", () => {
  const result = execute(plan, registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
    },
    w2: [{
      box1_wages: 120_000,
      box2_fed_withheld: 20_000,
      box3_ss_wages: 120_000,
      box4_ss_withheld: 7_440,
      box5_medicare_wages: 120_000,
      box6_medicare_withheld: 1_740,
      employer_ein: "12-3456789",
      employer_name: "ACME Corp",
      box12_entries: [],
    }],
    f8826: {
      eligible_expenditures: 5_000,
      prior_year_gross_receipts: 500_000,
      prior_year_full_time_employee_count: 20,
      subject_to_passive_activity_limit: false,
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const allowed = Number(result.pending.f3800?.allowed_credit);
  assertGreater(allowed, 0);
  assertEquals(result.pending.schedule3?.line6a_total, allowed);
  assertEquals(result.pending.f1040?.line20_nonrefundable_credits, allowed);
  assertEquals(result.pending.f3800?.standard_credit_allowed, allowed);
  assertEquals(result.pending.form6251?.must_file_for_gbc, true);
});
