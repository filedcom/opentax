import { assertEquals, assertThrows } from "@std/assert";
import { f1099div_2026 } from "./f1099div.ts";

const context = { taxYear: 2026, formType: "f1040" };
const basic = {
  payerName: "North Bank",
  isNominee: false as const,
  box11: false as const,
  box1a: 600,
  box1b: 200,
  box4: 50,
};

Deno.test("TY2026 1099-DIV routes ordinary and qualified dividends", () => {
  const outputs = f1099div_2026.compute(context, {
    f1099divs: [basic],
  }).outputs;
  const fields = (nodeType: string) =>
    outputs.filter((item) => item.nodeType === nodeType).map((item) =>
      item.fields
    );
  assertEquals(fields("f1040"), [
    { line3b_ordinary_dividends: 600 },
    { line3a_qualified_dividends: 200 },
    { line25b_withheld_1099: 50 },
  ]);
  assertEquals(fields("agi_aggregator"), [
    { line3b_ordinary_dividends: 600 },
  ]);
  assertEquals(fields("income_tax_calculation"), [
    { qualified_dividends: 200 },
  ]);
});

Deno.test("TY2026 1099-DIV separates exempt dividends and their AMT subset", () => {
  const outputs = f1099div_2026.compute(context, {
    f1099divs: [{ ...basic, box12: 10_000, box13: 4_000 }],
  }).outputs;
  assertEquals(
    outputs.find((item) =>
      item.nodeType === "f1040" && item.fields.line2a_tax_exempt !== undefined
    )?.fields.line2a_tax_exempt,
    10_000,
  );
  assertEquals(
    outputs.find((item) =>
      item.nodeType === "agi_aggregator" &&
      item.fields.tax_exempt_interest !== undefined
    )?.fields.tax_exempt_interest,
    10_000,
  );
  assertEquals(
    outputs.find((item) => item.nodeType === "form6251")?.fields
      .private_activity_bond_interest,
    4_000,
  );
  assertThrows(
    () =>
      f1099div_2026.compute(context, {
        f1099divs: [{ ...basic, box12: 3_000, box13: 4_000 }],
      }),
    Error,
    "private activity bond dividends exceed exempt-interest dividends",
  );
});

Deno.test("TY2026 1099-DIV sends plain box 2a distributions to Schedule D decision", () => {
  const outputs = f1099div_2026.compute(context, {
    f1099divs: [{ ...basic, box2a: 5_000 }],
  }).outputs;
  assertEquals(
    outputs.find((item) => item.nodeType === "schedule_d")?.fields,
    { line13_cap_gain_distrib: 5_000 },
  );
});

Deno.test("TY2026 1099-DIV rejects unconnected capital gain and foreign tax routes", () => {
  for (
    const [extra, message] of [
      [{ box2b: 100 }, "special-rate capital gains need Schedule D worksheets"],
      [{ box7: 20 }, "foreign tax needs Form 1116"],
      [{ box5: 40 }, "section 199A dividends need the QBI route"],
    ] as const
  ) {
    assertThrows(
      () =>
        f1099div_2026.compute(context, {
          f1099divs: [{ ...basic, ...extra }],
        }),
      Error,
      message,
    );
  }
  assertThrows(
    () =>
      f1099div_2026.compute(context, {
        f1099divs: [{ ...basic, box1b: 601 }],
      }),
    Error,
    "qualified dividends exceed ordinary dividends",
  );
});
