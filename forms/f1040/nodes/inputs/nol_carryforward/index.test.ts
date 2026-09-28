import { assertEquals, assertThrows } from "@std/assert";
import { nol_carryforward, NolType } from "./index.ts";
import { assertAttachmentCoverage } from "../../../2025/attachment-coverage.ts";

const context = { taxYear: 2025, formType: "f1040" } as const;
const loss = {
  year: 2023,
  nol_amount: 10_000,
  nol_type: NolType.POST2017,
};

Deno.test("NOL: input still rejects an empty loss ledger and negative amount", () => {
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

Deno.test("NOL: asserted current-year income cannot source a Schedule 1 deduction", () => {
  assertThrows(
    () =>
      nol_carryforward.compute(context, {
        nol_carryforwards: [loss],
        current_year_taxable_income: 50_000,
      }),
    Error,
    "NOL carryforward needs sourced Form 172",
  );
  assertEquals(nol_carryforward.outputNodes.nodeTypes, []);
});

Deno.test("NOL: a prior-2018 and post-2017 mixture also rejects before AGI", () => {
  assertThrows(
    () =>
      nol_carryforward.compute(context, {
        nol_carryforwards: [
          { year: 2017, nol_amount: 4_000, nol_type: NolType.PRE2018 },
          loss,
        ],
        current_year_taxable_income: 50_000,
      }),
    Error,
    "NOL carryforward needs sourced Form 172",
  );
});

Deno.test("NOL: a currently unusable positive carryforward is not silently discarded", () => {
  assertThrows(
    () =>
      nol_carryforward.compute(context, {
        nol_carryforwards: [loss],
        current_year_taxable_income: 0,
      }),
    Error,
    "NOL carryforward needs sourced Form 172",
  );
});

Deno.test("NOL: a zero-valued placeholder has no tax output but cannot be filed", () => {
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

Deno.test("NOL: direct positive Schedule 1 line 8a cannot bypass source and AMT refigure", () => {
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
