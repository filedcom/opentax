import { assertEquals, assertThrows } from "@std/assert";
import { execute } from "../../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../../core/runtime/planner.ts";
import { FilingStatus } from "../../../../../../nodes/types.ts";
import { TargetGroup } from "../../../../../../nodes/inputs/credits/business/f5884/index.ts";
import { registry } from "../../../../../registry.ts";
import { prepareForm3800DocumentParts } from "../../../../../mef/forms/credits/business/f3800/f3800.ts";
import { testFiler } from "../../../../../mef/execution/test-filer.ts";
import {
  form3800PartIAndIIFields,
  form3800PartIIIFields,
} from "./f3800_fields.ts";
import { form3800Pdf } from "./f3800.ts";
import { form5884Pdf } from "../f5884.ts";

const workOpportunity = {
  subject_to_passive_activity_limit: false,
  f5884s: [{
    employee_reference: "EMP-001",
    target_group: TargetGroup.TanfRecipient,
    hired_on: "2025-01-15",
    certification: {
      path: "certified_by_start" as const,
      swa_certification_reference: "SWA-001",
      certification_received_on: "2025-01-15",
      certification_received_before_claim_confirmed: true,
      revocation: { status: "no_notice_received" as const },
    },
    qualified_wages_confirmed: true,
    not_prior_employee_confirmed: true,
    not_related_or_dependent_confirmed: true,
    more_than_half_wages_for_trade_or_business_confirmed: true,
    excluded_wages_removed_confirmed: true,
    wage_records: [{
      payroll_record_reference: "PAY-001",
      deduction_location: {
        kind: "schedule_c" as const,
        business_reference: "BUSINESS-1",
      },
      service_period_start_on: "2025-02-01",
      service_period_end_on: "2025-02-28",
      paid_or_incurred_on: "2025-02-28",
      qualified_wages: 6_000,
    }],
    hours_worked: 400,
  }],
};
const f3800 = {
  f5884_credit: {
    credit_amount: 2_400,
    subject_to_passive_activity_limit: false,
  },
  tax_context: {
    filingStatus: FilingStatus.Single,
    regularTax: 40_000,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 20_000,
    standardCredit: 0,
    specifiedCredit: 2_400,
    standardCarryforward: 0,
    specifiedCarryforward: 0,
  },
  allowed_credit: 2_400,
};
const pending = {
  f3800,
  f5884: workOpportunity,
  f1040: {
    line16_income_tax: 40_000,
    line20_nonrefundable_credits: 2_400,
  },
  form6251: { line11_amt: 0, net_tmt: 20_000 },
  schedule3: { line6a_total: 2_400, line7_total: 2_400, line8_total: 2_400 },
};

Deno.test("one Form 5884 payroll source calculates through Form 3800, Schedule 3, and Form 1040", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
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
    f5884: workOpportunity,
    schedule_c: [{
      business_reference: "BUSINESS-1",
      line_a_principal_business: "Retail store",
      line_b_business_code: "459999",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: 6_000,
      line_26_wages: 6_000,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_c?.wotc_wage_reductions, [{
    business_reference: "BUSINESS-1",
    credit_amount: 2_400,
  }]);
  assertEquals(result.pending.f3800?.f5884_credit, f3800.f5884_credit);
  assertEquals(result.pending.f3800?.allowed_credit, 2_400);
  assertEquals(result.pending.schedule3?.line6a_total, 2_400);
  assertEquals(result.pending.f1040?.line20_nonrefundable_credits, 2_400);
});

Deno.test("one self-earned Form 5884 line 4b source binds Form 3800 native parts and nine-page PDF", () => {
  const prepared = prepareForm3800DocumentParts(f3800, {
    pending,
    documentIdsByPendingKey: {
      f5884: ["IRS5884_1"],
      f8835: [],
      form6251: ["IRS6251_1"],
    },
  });
  if (!prepared) throw new Error("Expected a prepared Form 3800 credit");
  const [fields] = form3800Pdf.instances!(
    f3800,
    testFiler(),
    pending,
    prepared,
  );
  assertEquals(fields[form3800PartIIIFields("4b").e], 2_400);
  assertEquals(fields[form3800PartIIIFields("4b").i], 2_400);
  assertEquals(fields[form3800PartIAndIIFields.line38], 2_400);
  assertEquals(prepared.currentDetails[0]?.credit, 2_400);

  const changed = (next: typeof pending) =>
    form3800Pdf.instances!(f3800, testFiler(), next, prepared);
  assertThrows(
    () =>
      changed({
        ...pending,
        f5884: {
          ...workOpportunity,
          f5884s: [{ ...workOpportunity.f5884s[0], hours_worked: 200 }],
        },
      }),
    Error,
    "Form 3800 PDF line 4b differs",
  );
  assertThrows(
    () =>
      form3800Pdf.instances!(
        {
          ...f3800,
          f5884_credit: { ...f3800.f5884_credit, credit_amount: 2_399 },
        },
        testFiler(),
        pending,
        prepared,
      ),
    Error,
    "Form 3800 PDF line 4b differs",
  );
  assertThrows(
    () =>
      changed({
        ...pending,
        f1040: { ...pending.f1040, line20_nonrefundable_credits: 2_399 },
      }),
    Error,
    "Form 1040 line 20",
  );
  assertThrows(
    () =>
      form3800Pdf.instances!(
        f3800,
        testFiler(),
        pending,
        {
          ...prepared,
          currentDetails: prepared.currentDetails.map((row) =>
            row.line === "4b" ? { ...row, credit: 2_399 } : row
          ),
        },
      ),
    Error,
    "Form 3800 PDF line 4b differs",
  );
});

Deno.test("Form 5884 printable copy binds its direct source and final Form 1040 credit", () => {
  const prepared = prepareForm3800DocumentParts(f3800, {
    pending,
    documentIdsByPendingKey: {
      f5884: ["IRS5884_1"],
      f8835: [],
      form6251: ["IRS6251_1"],
    },
  });
  if (!prepared) throw new Error("Expected a prepared Form 3800 credit");
  const fields = form5884Pdf.projectFields!(workOpportunity, pending);
  assertEquals(form5884Pdf.instances!(fields, testFiler(), pending, prepared), [
    fields,
  ]);
  assertEquals(prepared.form5884DocumentIds, ["IRS5884_1"]);
  assertThrows(() => form5884Pdf.instances!(fields, testFiler(), pending));
  assertThrows(
    () =>
      form5884Pdf.instances!(fields, testFiler(), {
        ...pending,
        f5884: {
          ...workOpportunity,
          f5884s: [{
            ...workOpportunity.f5884s[0],
            certification: {
              ...workOpportunity.f5884s[0].certification,
              swa_certification_reference: "SWA-CHANGED",
            },
          }],
        },
      }, prepared),
    Error,
    "differs from filed Form 3800 line 4b",
  );
  assertThrows(() =>
    form5884Pdf.instances!(fields, testFiler(), pending, {
      ...prepared,
      currentRows: prepared.currentRows.map((row) => ({
        ...row,
        metadata: { ...row.metadata, referenceDocumentId: "IRS5884_OTHER" },
      })),
    })
  );
  assertThrows(() =>
    form5884Pdf.instances!(fields, testFiler(), pending, {
      ...prepared,
      currentDetails: prepared.currentDetails.map((row) => ({
        ...row,
        credit: 2_399,
      })),
    })
  );
  assertThrows(
    () =>
      form5884Pdf.instances!(fields, testFiler(), pending, {
        ...prepared,
        currentRows: prepared.currentRows.map((row) => ({
          ...row,
          metadata: {
            ...row.metadata,
            referenceDocumentId: "IRS5884_OTHER",
          },
        })),
        currentDetails: prepared.currentDetails.map((row) => ({
          ...row,
          sourceDocumentId: "IRS5884_OTHER",
        })),
      }),
    Error,
    "differs from filed Form 3800 line 4b",
  );
  assertThrows(() =>
    form5884Pdf.instances!(fields, testFiler(), {
      ...pending,
      f1040: { ...pending.f1040, line20_nonrefundable_credits: 2_399 },
    }, prepared)
  );
});
