import { test } from "bun:test";
import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { form8995 } from "../../../../mef/forms/deductions/business/f8995/f8995.ts";
import {
  jointInvestmentQbiInputs,
  singleInvestmentQbiInputs,
} from "./form8995-investment-income.fixture.ts";

// Form 8995 instructions (2025), lines 11-15: line 12 is Form 1040 line 3a
// plus the smaller of Schedule D line 15 or 16 (including line 13 capital
// gain distributions); line 15 is the smaller of line 10 or line 14.
const cases = [
  {
    name: "MFJ spouse Schedule C",
    inputs: jointInvestmentQbiInputs,
    agi: 210_849,
    lines: [179_349, 8_410, 170_939, 34_188, 6_478],
  },
  {
    name: "single Schedule C",
    inputs: singleInvestmentQbiInputs,
    agi: 164_649,
    lines: [148_899, 8_410, 140_489, 28_098, 6_478],
  },
];

function settle(inputs: Record<string, unknown>) {
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  return normalizeAllPending(result.pending);
}

for (const c of cases) {
  test(`${c.name} QBI reconciles ordinary interest, dividends and capital sales`, async () => {
    const pending = settle(c.inputs());
    const f = pending.form8995!;
    assertEquals(pending.f1040?.line11_agi, c.agi);
    assertEquals(pending.f1040?.line7_capital_gain, 8_700);
    assertEquals(pending.schedule_d?.line13_cap_gain_distrib, 950);
    assertEquals([f.line11, f.line12, f.line13, f.line14, f.line15], c.lines);
    assertEquals(pending.f1040?.line13_qbi_deduction, 6_478);

    const xml = form8995.build(f, { pending });
    assertStringIncludes(xml, "<NetCapitalGainAmt>8410</NetCapitalGainAmt>");
    assertStringIncludes(
      xml,
      `<TaxableIncomeBeforeQBIDedAmt>${c.lines[0]}</TaxableIncomeBeforeQBIDedAmt>`,
    );

    const filer = extractFilerIdentity(pending.f1040 ?? {});
    const bundle = (await f1040_2025.prepareReturn(pending, filer)).bundle;
    assertStringIncludes(bundle.xml, "<IRS8995 ");
    assertStringIncludes(bundle.xml, "<IRS1040ScheduleD ");
    // MAGI is below the Form 8960 threshold, so no Form 8960 is attached.
    assertEquals(bundle.xml.includes("<IRS8960"), false);
    assertEquals("form8960" in f1040_2025.buildPending(pending), false);
  });
}

test("QBI investment reconciliation still rejects unsourced or altered amounts", () => {
  const pending = settle(jointInvestmentQbiInputs());
  const f = pending.form8995!;
  const build = (p: typeof pending, fields = f) => () =>
    form8995.build(fields, { pending: p });
  build(pending)();
  assertThrows(
    build({
      ...pending,
      f1040: { ...pending.f1040, line3b_ordinary_dividends: 3_821 },
    }),
    Error,
    "investment lines differ from owned copies",
  );
  assertThrows(
    build({
      ...pending,
      schedule_d: { ...pending.schedule_d, line_6_carryover: 500 },
    }),
    Error,
    "without other Schedule D sources",
  );
  assertThrows(
    build(pending, { ...f, line12: 960, line13: 178_389 }),
    Error,
    "line12 differs from source calculation",
  );
  assertThrows(
    build(pending, {
      ...f,
      qbi_capital_sources: [{
        source: "f1099div.qualified_dividends",
        amount: 960,
      }],
      net_capital_gain: 960,
    }),
    Error,
    "capital contribution identities or totals differ",
  );
  const int = pending.f1099int!.f1099ints as Array<Record<string, unknown>>;
  assertThrows(
    build({
      ...pending,
      f1099int: { f1099ints: [{ ...int[0], recipient_tin: "999887777" }] },
    }),
    Error,
    "copies differ from their retained graph sources",
  );
});
