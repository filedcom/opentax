import { assertEquals, assertThrows } from "@std/assert";
import { schedule1Pdf } from "./schedule1.ts";
import { FilingStatus } from "../../../mef/header.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../registry.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";

Deno.test("Schedule 1 PDF includes filer identity on page 1", () => {
  assertEquals(schedule1Pdf.filerFields?.map((entry) => entry.domainKey), [
    "nameLine1",
    "primarySSN",
  ]);
});

Deno.test("Schedule 1 PDF line 7 shows the retained same-year unemployment repayment", () => {
  const byKey = (key: string) =>
    schedule1Pdf.fields.find((entry) => entry.domainKey === key)?.pdfField;
  assertEquals(
    byKey("print_line7_unemployment_repayment"),
    "topmostSubform[0].Page1[0].Line7_ReadOrder[0].c1_3[0]",
  );
  assertEquals(
    byKey("line7_unemployment_repayment"),
    "topmostSubform[0].Page1[0].Line7_ReadOrder[0].f1_11[0]",
  );
  const filer = {
    primarySSN: "111223333",
    nameLine1: "TEST TAXPAYER",
    nameControl: "TAXP",
    address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
    filingStatus: FilingStatus.Single,
  };
  const all = {
    f1099g: {
      f1099gs: [
        { box_1_unemployment: 5_000, box_1_repaid: 600 },
        { box_1_unemployment: 2_000, box_1_repaid: 100 },
      ],
    },
  };
  const projected = schedule1Pdf.instances?.(
    { line7_unemployment: 6_300 },
    filer,
    all,
  )?.[0];
  assertEquals(projected?.print_line7_unemployment_repayment, true);
  assertEquals(projected?.line7_unemployment_repayment, 700);
  assertEquals(projected?.line7_unemployment, 6_300);
  const noRepayment = schedule1Pdf.instances?.(
    { line7_unemployment: 5_000 },
    filer,
    { f1099g: { f1099gs: [{ box_1_unemployment: 5_000 }] } },
  )?.[0];
  assertEquals(noRepayment?.print_line7_unemployment_repayment, undefined);
  assertEquals(noRepayment?.line7_unemployment_repayment, undefined);
  assertThrows(
    () => schedule1Pdf.instances?.({ line7_unemployment: 7_000 }, filer, all),
    Error,
    "line 7 differs from retained unemployment sources",
  );
});

Deno.test("fully repaid unemployment alone still creates Schedule 1 and its PDF repayment annotation", () => {
  const base = pdfReviewFixtures.find((fixture) =>
    fixture.id === "single-w2-refund"
  )!;
  const result = execute(buildExecutionPlan(registry), registry, {
    ...base.inputs,
    f1099g: [{ box_1_unemployment: 5_000, box_1_repaid: 5_000 }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1?.line7_unemployment, 0);
  assertEquals(result.pending.schedule1?.line10_total_additional_income, 0);
  const projected = schedule1Pdf.instances?.(
    result.pending.schedule1,
    base.filer,
    result.pending,
  )?.[0];
  assertEquals(projected?.print_line7_unemployment_repayment, true);
  assertEquals(projected?.line7_unemployment_repayment, 5_000);
});

Deno.test("Schedule 1 PDF maps 8n/8o and refuses incomplete foreign-corporation attachments", () => {
  const field = (key: string) =>
    schedule1Pdf.fields.find((entry) => entry.domainKey === key)?.pdfField;
  assertEquals(
    field("line8n_section951a_inclusion"),
    "topmostSubform[0].Page1[0].f1_26[0]",
  );
  assertEquals(
    field("line8o_section951aa_inclusion"),
    "topmostSubform[0].Page1[0].f1_27[0]",
  );
  assertThrows(
    () =>
      schedule1Pdf.instances?.(
        { line8n_section951a_inclusion: 11_000 },
        undefined,
        {},
      ),
    Error,
    "complete Form 5471 schedules",
  );
  assertThrows(
    () =>
      schedule1Pdf.instances?.(
        { line8o_section951aa_inclusion: 42_000 },
        undefined,
        {},
      ),
    Error,
    "Form 8992 with Schedule A",
  );
});

Deno.test("Schedule 1 PDF rejects Form 1098 box 4 recovery without its payer source", () => {
  const filer = {
    primarySSN: "111223333",
    nameLine1: "TEST TAXPAYER",
    nameControl: "TAXP",
    address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
    filingStatus: FilingStatus.Single,
  };
  assertThrows(
    () =>
      schedule1Pdf.instances?.(
        { line8z_f1098_interest_recovery: 1_200 },
        filer,
        {},
      ),
    Error,
    "needs payer source rows",
  );
  const source = {
    f1098s: [{
      box1_mortgage_interest: 0,
      box4_refund_overpaid: 2_000,
      box4_prior_year_refund: true,
      box4_taxable_recovery_verified_amount: 1_200,
      box4_recovery_workpaper_reference: "Pub. 525 review",
      lender_name: "Home Lender",
      recipient_tin: "999887777",
      source_document_reference: "issued 1098",
    }],
  };
  assertThrows(
    () =>
      schedule1Pdf.instances?.(
        { line8z_f1098_interest_recovery: 1_200 },
        filer,
        { f1098: source },
      ),
    Error,
    "recipient must match",
  );
  assertThrows(
    () =>
      schedule1Pdf.instances?.(
        { line8z_f1098_interest_recovery: 1_199 },
        filer,
        {
          f1098: {
            f1098s: [{ ...source.f1098s[0], recipient_tin: filer.primarySSN }],
          },
        },
      ),
    Error,
    "must match sourced taxable recovery",
  );
});

Deno.test("Schedule 1 PDF puts Form 2106 deductions on line 12", () => {
  const line12 = schedule1Pdf.fields.find((entry) =>
    entry.domainKey === "line12_business_expenses"
  );
  assertEquals(line12?.pdfField, "topmostSubform[0].Page2[0].f2_02[0]");
});

Deno.test("Schedule 1 PDF uses 2025 fields after the Form 1099-K entry", () => {
  const at = (key: string) =>
    schedule1Pdf.fields.find((entry) => entry.domainKey === key)?.pdfField;
  assertEquals(at("line1_state_refund"), "topmostSubform[0].Page1[0].f1_04[0]");
  assertEquals(at("line3_schedule_c"), "topmostSubform[0].Page1[0].f1_07[0]");
  assertEquals(
    at("line8p_excess_business_loss"),
    "topmostSubform[0].Page1[0].f1_28[0]",
  );
  assertEquals(
    at("line8j_f1099k_hobby_income"),
    "topmostSubform[0].Page1[0].f1_22[0]",
  );
  assertEquals(
    at("line9_total_other_income"),
    "topmostSubform[0].Page1[0].f1_37[0]",
  );
  assertEquals(
    at("line10_total_additional_income"),
    "topmostSubform[0].Page1[0].f1_38[0]",
  );
  assertEquals(
    at("line11_educator_expenses"),
    "topmostSubform[0].Page2[0].f2_01[0]",
  );
  assertEquals(at("line24f_501c18d"), "topmostSubform[0].Page2[0].f2_21[0]");
  assertEquals(
    at("line24k_section67e_excess_deduction"),
    "topmostSubform[0].Page2[0].f2_26[0]",
  );
  assertEquals(
    at("line25_total_other_adjustments"),
    "topmostSubform[0].Page2[0].f2_29[0]",
  );
  assertEquals(
    at("line26_total_adjustments"),
    "topmostSubform[0].Page2[0].f2_30[0]",
  );
});

Deno.test("Schedule 1 PDF maps W-2G winnings to line 8b, not line 8z", () => {
  const line8b = schedule1Pdf.fields.find((entry) =>
    entry.domainKey === "line8b_gambling_winnings"
  );
  assertEquals(line8b?.pdfField, "topmostSubform[0].Page1[0].f1_14[0]");
  const line8z = schedule1Pdf.fields.find((entry) =>
    entry.domainKey === "line8z_other"
  );
  assertEquals(line8z?.pdfField, "topmostSubform[0].Page1[0].f1_36[0]");
});

Deno.test("Schedule 1 PDF combines identified line 8z sources once", () => {
  const projected = schedule1Pdf.instances?.({
    line8z_taxable_grants: 300,
    line8z_form8814: 200,
    line8z_hsa_excess_earnings: 100,
  })?.[0];
  assertEquals(projected?.line8z_other, 600);
  assertEquals(
    projected?.line8z_description,
    "Form 8814, HSA excess earnings, Taxable grants",
  );
});

Deno.test("Schedule 1 PDF rejects an untyped generic line 8z amount", () => {
  assertThrows(
    () => schedule1Pdf.instances?.({ line8z_other: 100 }),
    Error,
    "line 8z generic income needs identified source types",
  );
});

Deno.test("Schedule 1 PDF combines 1099-K and 1099-NEC activity income on line 8j", () => {
  const projected = schedule1Pdf.instances?.({
    line8j_f1099k_hobby_income: 100,
    f1099nec_nonbusiness_sources: [{
      payer_name: "Event Payer",
      payer_tin: "123456789",
      recipient_tin: "987654321",
      description: "One-time event",
      amount: 2_000,
    }],
  })?.[0];
  assertEquals(projected?.line8j_f1099k_hobby_income, 2_100);
  assertEquals(projected?.line8z_other, undefined);
});
