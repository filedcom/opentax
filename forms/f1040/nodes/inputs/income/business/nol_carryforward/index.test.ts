import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { nol_carryforward, NolType } from "./index.ts";
import { calculateNolDeduction } from "./calculation.ts";
import { assertAttachmentCoverage } from "../../../../../2025/return-processing/attachment-coverage.ts";

const context = { taxYear: 2025, formType: "f1040" } as const;
const loss = {
  year: 2023,
  nol_amount: 10_000,
  nol_type: NolType.POST2017,
};

test("NOL: input still rejects an empty loss ledger and negative amount", () => {
  assertEquals(
    nol_carryforward.inputSchema.safeParse({
      nol_carryforwards: [],
      current_year_taxable_income: 50_000,
    }).success,
    false,
  );
  assertEquals(
    nol_carryforward.inputSchema.safeParse({
      nol_carryforwards: [{ ...loss, nol_amount: -1 }],
      current_year_taxable_income: 50_000,
    }).success,
    false,
  );
});

test("NOL: carryforwards route to the AGI aggregator with an optional taxable income override", () => {
  assertEquals(nol_carryforward.outputNodes.nodeTypes, ["agi_aggregator"]);
  assertEquals(
    nol_carryforward.compute(context, { nol_carryforwards: [loss] }).outputs,
    [{
      nodeType: "agi_aggregator",
      fields: { nol_carryforwards: [loss] },
    }],
  );
  assertEquals(
    nol_carryforward.compute(context, {
      nol_carryforwards: [loss],
      current_year_taxable_income: 50_000,
    }).outputs[0].fields.nol_taxable_income_override,
    50_000,
  );
});

// IRC §172(a)(2); Pub. 536: pre-2018 losses first without limit, then
// post-2017 losses up to 80% of the remaining taxable income.
test("NOL calculation: pre-2018 first, post-2017 at 80%, remainder carried forward", () => {
  const result = calculateNolDeduction([
    loss,
    { year: 2017, nol_amount: 4_000, nol_type: NolType.PRE2018 },
  ], 50_000, 2025);
  assertEquals(result.pre2018Deduction, 4_000);
  // 80% × (50,000 − 4,000) = 36,800 > 10,000, so all of the 2023 loss is used.
  assertEquals(result.post2017Deduction, 10_000);
  assertEquals(result.deduction, 14_000);
  assertEquals(result.carryforward, []);
  const limited = calculateNolDeduction([
    { year: 2022, nol_amount: 200_000, nol_type: NolType.POST2017 },
  ], 104_250, 2025);
  assertEquals(limited.deduction, 83_400);
  assertEquals(limited.post2017Carryforward, 116_600);
  assertEquals(calculateNolDeduction([loss], 0, 2025).post2017Carryforward, 10_000);
});

test("NOL calculation: expired or misdated losses reject", () => {
  for (
    const item of [
      { year: 2004, nol_amount: 1, nol_type: NolType.PRE2018 },
      { year: 2019, nol_amount: 1, nol_type: NolType.PRE2018 },
      { year: 2016, nol_amount: 1, nol_type: NolType.POST2017 },
      { year: 2025, nol_amount: 1, nol_type: NolType.POST2017 },
    ]
  ) {
    assertThrows(() => calculateNolDeduction([item], 50_000, 2025));
  }
});

test("NOL: a zero-valued placeholder has no tax output but cannot be filed", () => {
  const input = {
    nol_carryforwards: [{ ...loss, nol_amount: 0 }],
    current_year_taxable_income: 0,
  };
  assertEquals(nol_carryforward.compute(context, input).outputs, []);
  for (const kind of ["mef", "pdf"] as const) {
    assertThrows(
      () => assertAttachmentCoverage({ nol_carryforward: input }, kind),
      Error,
      "Form 172 NOL deduction requires a native attachment",
    );
  }
});

test("NOL: direct positive Schedule 1 line 8a cannot bypass source and AMT refigure", () => {
  for (const kind of ["mef", "pdf"] as const) {
    assertThrows(
      () =>
        assertAttachmentCoverage(
          { schedule1: { line8a_nol_deduction: 10_000 } },
          kind,
        ),
      Error,
      "Schedule 1 line 8a NOL needs Form 172",
    );
  }
});
