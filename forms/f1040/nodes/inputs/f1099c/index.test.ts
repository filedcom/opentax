import { assertEquals, assertThrows } from "@std/assert";
import { f1099c } from "./index.ts";
import { fieldsOf } from "../../../../../core/test-utils/output.ts";
import {
  ExclusionType,
  form982,
} from "../../intermediate/forms/form982/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";

function minimalItem(overrides: Record<string, unknown> = {}) {
  return {
    creditor_name: "Test Creditor",
    box2_cod_amount: 1000,
    routing: "taxable" as const,
    ...overrides,
  };
}

function compute(items: ReturnType<typeof minimalItem>[]) {
  return f1099c.compute({ taxYear: 2025, formType: "f1040" }, {
    f1099cs: items,
  });
}

function findOutput(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((o) => o.nodeType === nodeType);
}

// ============================================================
// 1. Input Schema Validation
// ============================================================

Deno.test("schema: negative box2_cod_amount fails", () => {
  const parsed = f1099c.inputSchema.safeParse({
    f1099cs: [{ creditor_name: "A", box2_cod_amount: -100 }],
  });
  assertEquals(parsed.success, false);
});

// ============================================================
// 2. Per-Box Routing
// ============================================================

Deno.test("routing=taxable routes box2 to schedule1 line8c", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 5000, routing: "taxable" }),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8c_cod_income, 5000);
});

Deno.test("taxable 1099-C removes documented cash-method deductible box 3 interest", () => {
  const result = compute([minimalItem({
    box2_cod_amount: 10_000,
    box3_interest: 1_500,
    box3_interest_treatment: "cash_basis_deductible_if_paid",
    box3_interest_treatment_source: "Cash-method loan ledger",
  })]);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8c_cod_income, 8_500);
});

Deno.test("non-QPRI excluded 1099-C interest remains closed pending separate allocation", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box2_cod_amount: 10_000,
        box3_interest: 1_500,
        box3_interest_treatment: "taxable",
        box3_interest_treatment_source: "Loan ledger",
        routing: "excluded",
        exclusion_type: ExclusionType.Insolvency,
      })]),
    Error,
    "Non-QPRI Form 1099-C interest",
  );
});

Deno.test("routing=taxable: box2_cod_amount=0 does not route to schedule1", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 0, routing: "taxable" }),
  ]);
  const out = findOutput(result, "schedule1");
  assertEquals(out, undefined);
});

Deno.test("routing=excluded routes box2 to form982 line2", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 25000, routing: "excluded" }),
  ]);
  const input = fieldsOf(result.outputs, form982)!;
  assertEquals(input.line2_excluded_cod, 25000);
});

Deno.test("QPRI 1099-C carries its exclusion and residence facts to Form 982", () => {
  const result = compute([minimalItem({
    box2_cod_amount: 300_000,
    box1_date: "2025-06-15",
    routing: "excluded",
    exclusion_type: ExclusionType.Qpri,
    qpri_mfs: false,
    qpri_actual_discharge_date: "2025-06-15",
    qpri_discharged_principal_amount: 300_000,
    qpri_total_loan_balance_before_discharge: 300_000,
    qpri_qualified_loan_balance_before_discharge: 300_000,
    qpri_main_home_security_confirmed: true,
    qpri_discharge_reason: "financial_condition",
    qpri_discharge_reason_source: "Lender workout letter",
    principal_residence_retained: true,
    principal_residence_basis: 220_000,
  })]);
  assertEquals(fieldsOf(result.outputs, form982), {
    line2_excluded_cod: 300_000,
    exclusion_type: ExclusionType.Qpri,
    qpri_mfs: false,
    qpri_discharge_reason: "financial_condition",
    qpri_discharge_reason_source: "Lender workout letter",
    qpri_total_loan_balance_before_discharge: 300_000,
    qpri_qualified_loan_balance_before_discharge: 300_000,
    qpri_main_home_security_confirmed: true,
    principal_residence_retained: true,
    principal_residence_basis: 220_000,
    discharge_date: "2025-06-15",
  });
});

Deno.test("QPRI 1099-C rejects undivided discharged interest", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box2_cod_amount: 30_000,
        box3_interest: 2_000,
        box3_interest_treatment: "taxable",
        box3_interest_treatment_source: "Loan payoff ledger",
        routing: "excluded",
        exclusion_type: ExclusionType.Qpri,
        qpri_discharged_principal_amount: 30_000,
        qpri_actual_discharge_date: "2025-06-15",
      })]),
    Error,
    "box 2 reconciled to discharged principal",
  );
});

Deno.test("1099-C rejects box 3 interest greater than box 2", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box2_cod_amount: 1_000,
        box3_interest: 1_001,
        box3_interest_treatment: "taxable",
        box3_interest_treatment_source: "Loan payoff ledger",
      })]),
    Error,
    "box 3 interest exceeds box 2",
  );
});

Deno.test("QPRI 1099-C keeps taxable box 3 interest outside Form 982 principal", () => {
  const result = compute([minimalItem({
    box2_cod_amount: 30_000,
    box3_interest: 2_000,
    box3_interest_treatment: "taxable",
    box3_interest_treatment_source: "Loan payoff ledger",
    routing: "excluded",
    exclusion_type: ExclusionType.Qpri,
    qpri_discharged_principal_amount: 28_000,
    qpri_actual_discharge_date: "2025-06-15",
  })]);
  assertEquals(fieldsOf(result.outputs, form982)?.line2_excluded_cod, 28_000);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8c_cod_income, 2_000);
});

Deno.test("QPRI 1099-C cash-basis deductible interest is not Form 982 principal or COD income", () => {
  const result = compute([minimalItem({
    box2_cod_amount: 30_000,
    box3_interest: 2_000,
    box3_interest_treatment: "cash_basis_deductible_if_paid",
    box3_interest_treatment_source:
      "Cash-method and deductible-interest records",
    routing: "excluded",
    exclusion_type: ExclusionType.Qpri,
    qpri_discharged_principal_amount: 28_000,
    qpri_actual_discharge_date: "2025-06-15",
  })]);
  assertEquals(fieldsOf(result.outputs, form982)?.line2_excluded_cod, 28_000);
  assertEquals(fieldsOf(result.outputs, schedule1), undefined);
});

Deno.test("QPRI 1099-C requires documented tax treatment for reconciled box 3 interest", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box2_cod_amount: 30_000,
        box3_interest: 2_000,
        routing: "excluded",
        exclusion_type: ExclusionType.Qpri,
        qpri_discharged_principal_amount: 28_000,
        qpri_actual_discharge_date: "2025-06-15",
      })]),
    Error,
    "documented taxable or cash-basis deductible-debt treatment",
  );
});

Deno.test("QPRI 1099-C requires principal to reconcile with box 2", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box2_cod_amount: 30_000,
        routing: "excluded",
        exclusion_type: ExclusionType.Qpri,
        qpri_discharged_principal_amount: 27_000,
        qpri_actual_discharge_date: "2025-06-15",
      })]),
    Error,
    "box 2 reconciled to discharged principal",
  );
});

Deno.test("QPRI 1099-C does not infer discharge date from box 1", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box1_date: "2025-06-15",
        box2_cod_amount: 30_000,
        routing: "excluded",
        exclusion_type: ExclusionType.Qpri,
        qpri_discharged_principal_amount: 30_000,
      })]),
    Error,
    "actual discharge date separately from box 1",
  );
});

Deno.test("multiple excluded debts with detail cannot be silently merged", () => {
  const qpri = minimalItem({
    box1_date: "2025-06-15",
    routing: "excluded",
    exclusion_type: ExclusionType.Qpri,
    qpri_mfs: false,
    qpri_actual_discharge_date: "2025-06-15",
    qpri_discharged_principal_amount: 1_000,
    qpri_total_loan_balance_before_discharge: 1_000,
    qpri_qualified_loan_balance_before_discharge: 1_000,
    qpri_main_home_security_confirmed: true,
    qpri_discharge_reason: "financial_condition",
    qpri_discharge_reason_source: "Lender workout letter",
    principal_residence_retained: true,
    principal_residence_basis: 220_000,
  });
  assertThrows(
    () =>
      compute([
        qpri,
        { ...qpri, creditor_name: "Other Creditor" },
      ]),
    Error,
    "separate Form 982 exclusion detail",
  );
});

Deno.test("routing=excluded does not emit schedule1", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 8000, routing: "excluded" }),
  ]);
  const s1 = findOutput(result, "schedule1");
  assertEquals(s1, undefined);
});

Deno.test("routing=taxable does not emit form982", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 1200, routing: "taxable" }),
  ]);
  const f982 = findOutput(result, "form982");
  assertEquals(f982, undefined);
});

Deno.test("box7 FMV needs a property disposition answer", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box2_cod_amount: 10_000,
        box7_fmv_property: 180_000,
      })]),
    Error,
    "retained-or-transferred property answer",
  );
});

Deno.test("retained property with box7 FMV does not invent a capital gain", () => {
  const result = compute([
    minimalItem({
      box2_cod_amount: 3000,
      box7_fmv_property: 180_000,
      property_disposition_status: "retained",
      routing: "taxable",
    }),
  ]);
  assertEquals(fieldsOf(result.outputs, schedule1)?.line8c_cod_income, 3000);
  assertEquals(findOutput(result, "schedule_d"), undefined);
});

Deno.test("transferred property stops pending a sourced disposition calculation", () => {
  assertThrows(
    () =>
      compute([minimalItem({
        box2_cod_amount: 10_000,
        box7_fmv_property: 180_000,
        property_disposition_status: "transferred",
      })]),
    Error,
    "needs recourse, debt balance, adjusted basis, and holding facts",
  );
});

Deno.test("excluded routing with a retained property does not invent a disposition", () => {
  const result = compute([
    minimalItem({
      box2_cod_amount: 50000,
      box7_fmv_property: 200000,
      property_disposition_status: "retained",
      routing: "excluded",
    }),
  ]);
  const f982Input = fieldsOf(result.outputs, form982)!;
  assertEquals(f982Input.line2_excluded_cod, 50000);
  assertEquals(findOutput(result, "schedule_d"), undefined);
});

Deno.test("empty array produces empty outputs", () => {
  const result = f1099c.compute({ taxYear: 2025, formType: "f1040" }, {
    f1099cs: [],
  });
  assertEquals(result.outputs.length, 0);
});

// ============================================================
// 3. Aggregation — all items in one compute() call
// ============================================================

Deno.test("aggregation: multiple taxable items sum box2 on schedule1 line8c", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 3000, routing: "taxable" }),
    minimalItem({ box2_cod_amount: 4000, routing: "taxable" }),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8c_cod_income, 7000);
});

Deno.test("aggregation: multiple excluded items sum box2 on form982 line2", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 10000, routing: "excluded" }),
    minimalItem({ box2_cod_amount: 15000, routing: "excluded" }),
  ]);
  const input = fieldsOf(result.outputs, form982)!;
  assertEquals(input.line2_excluded_cod, 25000);
});

Deno.test("aggregation: mixed taxable and excluded items route separately with correct amounts", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 5000, routing: "taxable" }),
    minimalItem({ box2_cod_amount: 8000, routing: "excluded" }),
  ]);
  const s1Input = fieldsOf(result.outputs, schedule1)!;
  const f982Input = fieldsOf(result.outputs, form982)!;
  assertEquals(s1Input.line8c_cod_income, 5000);
  assertEquals(f982Input.line2_excluded_cod, 8000);
});

Deno.test("aggregation: three taxable items — total is sum of all three", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 1000, routing: "taxable" }),
    minimalItem({ box2_cod_amount: 2000, routing: "taxable" }),
    minimalItem({ box2_cod_amount: 3000, routing: "taxable" }),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8c_cod_income, 6000);
});

Deno.test("aggregation: multiple items one zero — only non-zero items contribute", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 0, routing: "taxable" }),
    minimalItem({ box2_cod_amount: 5000, routing: "taxable" }),
  ]);
  const input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(input.line8c_cod_income, 5000);
});

// ============================================================
// 4. Hard Validation Rules
// ============================================================

Deno.test("validation: box2_cod_amount negative throws", () => {
  assertThrows(() => compute([minimalItem({ box2_cod_amount: -1 })]));
});

Deno.test("validation: box7_fmv_property negative throws", () => {
  assertThrows(() => compute([minimalItem({ box7_fmv_property: -1 })]));
});

// ============================================================
// 5. Edge Cases
// ============================================================

Deno.test("edge: routing=excluded with box2=0 produces no form982 output", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 0, routing: "excluded" }),
  ]);
  const f982 = findOutput(result, "form982");
  assertEquals(f982, undefined);
});

Deno.test("edge: excluded routing preserves exact decimal amounts", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 12345.67, routing: "excluded" }),
  ]);
  const input = fieldsOf(result.outputs, form982)!;
  assertEquals(input.line2_excluded_cod, 12345.67);
});

Deno.test("edge: large excluded amount ($750,000) routes full amount to form982", () => {
  // The f1099c node passes the full box2 to form982; cap enforcement deferred to form982 node
  const result = compute([
    minimalItem({ box2_cod_amount: 750_000, routing: "excluded" }),
  ]);
  const input = fieldsOf(result.outputs, form982)!;
  assertEquals(input.line2_excluded_cod, 750_000);
});

Deno.test("edge: mixed debts with one retained property keep only taxable COD", () => {
  const result = compute([
    minimalItem({ box2_cod_amount: 3000, routing: "taxable" }),
    minimalItem({
      box2_cod_amount: 5000,
      box7_fmv_property: 120000,
      property_disposition_status: "retained",
      routing: "taxable",
    }),
  ]);
  const s1Input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(s1Input.line8c_cod_income, 8000);
  assertEquals(findOutput(result, "schedule_d"), undefined);
});

// ============================================================
// 6. Smoke Tests
// ============================================================

Deno.test("smoke: taxable personal debt — routes to schedule1, not form982 or schedule_d", () => {
  const result = compute([
    minimalItem({
      creditor_name: "Capital One Bank",
      box2_cod_amount: 15000,
      routing: "taxable",
    }),
  ]);

  const s1Input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(s1Input.line8c_cod_income, 15000);
  assertEquals(findOutput(result, "form982"), undefined);
  assertEquals(findOutput(result, "schedule_d"), undefined);
});

Deno.test("smoke: excluded retained-home debt with box7 does not enter Schedule D", () => {
  const result = compute([
    minimalItem({
      creditor_name: "Wells Fargo Mortgage",
      box2_cod_amount: 50000,
      box7_fmv_property: 220000,
      property_disposition_status: "retained",
      routing: "excluded",
    }),
  ]);

  const f982Input = fieldsOf(result.outputs, form982)!;
  assertEquals(f982Input.line2_excluded_cod, 50000);
  assertEquals(findOutput(result, "schedule_d"), undefined);
  assertEquals(findOutput(result, "schedule1"), undefined);
});

Deno.test("smoke: multiple 1099-Cs in same year, mixed routing — correct amounts on each form", () => {
  const result = compute([
    minimalItem({
      creditor_name: "Personal Lender",
      box2_cod_amount: 8000,
      routing: "taxable",
    }),
    minimalItem({
      creditor_name: "Mortgage Bank",
      box2_cod_amount: 20000,
      routing: "excluded",
    }),
  ]);

  const s1Input = fieldsOf(result.outputs, schedule1)!;
  assertEquals(s1Input.line8c_cod_income, 8000);
  const f982Input = fieldsOf(result.outputs, form982)!;
  assertEquals(f982Input.line2_excluded_cod, 20000);
});
