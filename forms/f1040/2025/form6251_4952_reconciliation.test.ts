import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "./registry.ts";
import { form6251 as mef6251 } from "./mef/forms/f6251.ts";
import { form6251Pdf } from "./pdf/forms/f6251.ts";
import { form4952 as mef4952 } from "./mef/forms/f4952.ts";
import { form4952Pdf } from "./pdf/forms/f4952.ts";
import { testFiler } from "./mef/test-filer.ts";
import {
  form6251Form4952Fixture,
  form6251Form4952TwoPayerFixture,
} from "./form6251_4952.fixture.ts";

Deno.test("Form 6251 line 2c replays distinct regular and AMT Form 4952 carryforwards", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    form6251Form4952Fixture(),
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const filed = result.pending.form6251!;
  assertEquals(result.pending.form4952?.line8, 22_000);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 22_000);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 23_000);
  assertEquals(filed.line2c_investment_interest, -1_000);
  assertEquals(result.pending.schedule2?.line2_amt, filed.line11_amt);
  assertStringIncludes(
    mef6251.build(filed, { pending: result.pending, filer: testFiler() }),
    "<InvestmentInterestAmt>-1000</InvestmentInterestAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed, result.pending)
      ?.line2c_investment_interest,
    -1_000,
  );
  assertEquals(
    form6251Pdf.instances?.(filed, testFiler(), result.pending)?.length,
    1,
  );
  const changed = { ...filed, line2c_investment_interest: -999 };
  assertThrows(
    () =>
      mef6251.build(changed, { pending: result.pending, filer: testFiler() }),
    Error,
    "regular Form 4952 line 8 less AMT line 8",
  );
  assertThrows(
    () => form6251Pdf.projectFields?.(changed, result.pending),
    Error,
    "regular Form 4952 line 8 less AMT line 8",
  );
  assertThrows(
    () => form6251Pdf.instances?.(changed, testFiler(), result.pending),
    Error,
    "regular Form 4952 line 8 less AMT line 8",
  );
  assertThrows(
    () =>
      mef6251.build({ ...filed, line2c_investment_interest: undefined }, {
        pending: result.pending,
        filer: testFiler(),
      }),
    Error,
    "regular Form 4952 line 8 less AMT line 8",
  );
  assertThrows(
    () => mef6251.build(filed, { pending: result.pending }),
    Error,
    "final filer identity",
  );
});

Deno.test("Form 6251 line 2c reconciles two investment-interest payers and distinct AMT carryforward", () => {
  const source = form6251Form4952TwoPayerFixture();
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    source,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const filed = result.pending.form6251!;
  const interest = result.pending.form4952!;
  assertEquals(interest.source_1099_interest, [12_000, 11_000]);
  assertEquals(interest.line8, 22_000);
  assertEquals(result.pending.schedule_a?.line_9_investment_interest, 22_000);
  assertEquals(result.pending.f1040?.line2b_taxable_interest, 23_000);
  assertEquals(filed.line2c_investment_interest, -1_000);
  assertEquals(result.pending.schedule2?.line2_amt, filed.line11_amt);
  assertStringIncludes(
    mef4952.build(interest, { pending: result.pending, filer: testFiler() }),
    "<InvestmentInterestExpDeductAmt>22000</InvestmentInterestExpDeductAmt>",
  );
  assertStringIncludes(
    mef6251.build(filed, { pending: result.pending, filer: testFiler() }),
    "<InvestmentInterestAmt>-1000</InvestmentInterestAmt>",
  );
  assertEquals(
    form4952Pdf.projectFields?.(interest, result.pending)?.line8,
    22_000,
  );
  assertEquals(
    form6251Pdf.projectFields?.(filed, result.pending)
      ?.line2c_investment_interest,
    -1_000,
  );
  assertEquals(
    form4952Pdf.instances?.(interest, testFiler(), result.pending)?.length,
    1,
  );
  assertEquals(
    form6251Pdf.instances?.(filed, testFiler(), result.pending)?.length,
    1,
  );

  const duplicatePayer = structuredClone(result.pending);
  const duplicateItems = (duplicatePayer.f1099int as {
    f1099ints: { source_document_reference: string }[];
  }).f1099ints;
  duplicateItems[1].source_document_reference =
    duplicateItems[0].source_document_reference;
  assertThrows(
    () => mef6251.build(filed, { pending: duplicatePayer, filer: testFiler() }),
    Error,
    "supported 1099-INT",
  );
  const changedAmount = structuredClone(result.pending);
  (changedAmount.f1099int as { f1099ints: { box1: number }[] })
    .f1099ints[1].box1 = 10_999;
  assertThrows(
    () => mef6251.build(filed, { pending: changedAmount, filer: testFiler() }),
    Error,
    "supports only unadjusted",
  );
  assertThrows(
    () => form6251Pdf.projectFields?.(filed, changedAmount),
    Error,
    "supports only unadjusted",
  );
});
