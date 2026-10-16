import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../nodes/types.ts";
import { form8962 as priorNode } from "../nodes/intermediate/forms/credits/health/form8962/index.ts";
import { calculateSchedule2_2026 } from "./schedule2.ts";
import { calculateSchedule3_2026 } from "./schedule3.ts";
import { form8962Policy2026 } from "./form8962-policy.ts";
import {
  calculateForm8962_2026,
  type Form8962CalculationInput2026,
} from "./form8962.ts";

function annual(income = 62_600): Form8962CalculationInput2026 {
  return {
    household_size: 1,
    fpl_region: "contiguous",
    filing_status: FilingStatus.Single,
    taxpayer_modified_agi: income,
    dependents_modified_agi: 0,
    dependent_income_complete: true,
    monthly_premiums: Array(12).fill(416.67),
    monthly_slcsps: Array(12).fill(833.33),
    monthly_aptcs: Array(12).fill(250),
    annual_premium: 5_000.04,
    annual_slcsp: 9_999.96,
    annual_aptc: 3_000,
    annual_line11_eligible: true,
  };
}

Deno.test("2026 PTC 400% boundary retains $765 credit; next dollar repays all $3,000", () => {
  const at = calculateForm8962_2026(annual());
  assertEquals(at.fields.federal_poverty_line, 15_650);
  assertEquals(at.fields.federal_poverty_pct, 400);
  assertEquals(at.fields.applicable_figure, 0.0996);
  assertEquals(at.fields.annual_applicable_contribution, 6_235);
  assertEquals(at.fields.monthly_applicable_contribution, 520);
  assertEquals(at.fields.total_premium_tax_credit, 3_765);
  assertEquals(at.schedule3.line9_premium_tax_credit, 765);
  assertEquals(calculateSchedule3_2026(at.schedule3).lines.line15_total, 765);
  assertEquals(at.schedule2.line1a_excess_advance_premium, 0);
  const above = calculateForm8962_2026(annual(62_601));
  assertEquals(above.fields.federal_poverty_pct, 401);
  assertEquals(above.fields.applicable_figure, undefined);
  assertEquals(above.fields.annual_applicable_contribution, undefined);
  assertEquals(above.fields.total_premium_tax_credit, 0);
  assertEquals(above.fields.excess_advance_payment, 3_000);
  assertEquals(above.fields.repayment_limitation, undefined);
  assertEquals(above.fields.excess_advance_premium, undefined);
  assertEquals(above.schedule3.line9_premium_tax_credit, 0);
  assertEquals(above.amt.schedule2_line1z_tax, 3_000);
  assertEquals(calculateSchedule2_2026(above.schedule2).line3_part1_tax, 3_000);
});

Deno.test("2026 PTC figures follow all Rev Proc bands and integer line 5", () => {
  for (
    const [percent, expected] of [
      [100, 0.0210],
      [132, 0.0210],
      [133, 0.0314],
      [134, 0.0320],
      [149, 0.0413],
      [150, 0.0419],
      [151, 0.0424],
      [199, 0.0655],
      [200, 0.0660],
      [201, 0.0664],
      [249, 0.0840],
      [250, 0.0844],
      [251, 0.0847],
      [299, 0.0993],
      [300, 0.0996],
      [400, 0.0996],
      [401, Infinity],
    ]
  ) {
    assertEquals(
      form8962Policy2026.applicableContributionPct(percent),
      expected,
    );
  }
  assertEquals(form8962Policy2026.applicableContributionPct(149.99), 0.0413);
  assertEquals(
    calculateForm8962_2026(annual(23_474)).fields.federal_poverty_pct,
    149,
  );
  assertEquals(
    calculateForm8962_2026(annual(23_475)).fields.applicable_figure,
    0.0419,
  );
});

Deno.test("2026 PTC regional family tables include families larger than eight", () => {
  for (
    const [region, one, two, nine] of [
      ["contiguous", 15_650, 21_150, 59_650],
      ["alaska", 19_550, 26_430, 74_590],
      ["hawaii", 17_990, 24_320, 68_630],
    ] as const
  ) {
    for (const [size, fpl] of [[1, one], [2, two], [9, nine]]) {
      const result = calculateForm8962_2026({
        ...annual(fpl * 2),
        household_size: size,
        fpl_region: region,
      });
      assertEquals(result.fields.federal_poverty_line, fpl);
      assertEquals(result.fields.federal_poverty_pct, 200);
      assertEquals(result.fields.applicable_figure, 0.066);
    }
  }
});

Deno.test("2026 low-income excess APTC is uncapped for each ordinary filing status", () => {
  for (
    const filing_status of [
      FilingStatus.Single,
      FilingStatus.MFJ,
      FilingStatus.HOH,
      FilingStatus.QSS,
    ] as const
  ) {
    const result = calculateForm8962_2026({
      ...annual(21_150),
      household_size: 2,
      filing_status,
      monthly_premiums: Array(12).fill(1_000),
      monthly_slcsps: Array(12).fill(30),
      monthly_aptcs: Array(12).fill(500),
      annual_premium: 12_000,
      annual_slcsp: 360,
      annual_aptc: 6_000,
    });
    assertEquals(result.fields.annual_applicable_contribution, 444);
    assertEquals(result.fields.total_premium_tax_credit, 0);
    assertEquals(result.schedule2.line1a_excess_advance_premium, 6_000);
    assertEquals(result.amt.schedule2_line1z_tax, 6_000);
    assertEquals(result.fields.repayment_limitation, undefined);
    assertEquals(result.fields.excess_advance_premium, undefined);
  }
});

Deno.test("2026 PTC monthly changes use rounded monthly contributions", () => {
  const result = calculateForm8962_2026({
    ...annual(31_300),
    annual_line11_eligible: false,
    annual_premium: 5_400,
    annual_slcsp: 6_600,
    annual_aptc: 4_200,
    monthly_premiums: [...Array(6).fill(400), ...Array(6).fill(500)],
    monthly_slcsps: [...Array(6).fill(500), ...Array(6).fill(600)],
    monthly_aptcs: [...Array(6).fill(300), ...Array(6).fill(400)],
  });
  assertEquals(result.fields.annual_applicable_contribution, 2_066);
  assertEquals(result.fields.monthly_applicable_contribution, 172);
  assertEquals(result.fields.total_premium_tax_credit, 4_536);
  assertEquals(result.schedule3.line9_premium_tax_credit, 336);
  assertEquals(result.fields.annual_ptc_allowed, undefined);
  const rows = result.fields.monthly_ptc_rows as Record<string, unknown>[];
  assertEquals(rows[0].allowed_credit, 328);
  assertEquals(rows[11].allowed_credit, 428);
});

Deno.test("2026 PTC rounds annual sums once and monthly form entries separately", () => {
  const source = {
    ...annual(31_300),
    monthly_premiums: Array(12).fill(800.51),
    monthly_slcsps: Array(12).fill(700.49),
    monthly_aptcs: Array(12).fill(300.51),
    annual_premium: 9_606.12,
    annual_slcsp: 8_405.88,
    annual_aptc: 3_606.12,
  };
  const held = structuredClone(source);
  const annualResult = calculateForm8962_2026(source);
  assertEquals(annualResult.fields.annual_premium, 9_606);
  assertEquals(annualResult.fields.annual_slcsp, 8_406);
  assertEquals(annualResult.fields.total_premium_tax_credit, 6_340);
  assertEquals(annualResult.fields.total_advance_ptc, 3_606);
  assertEquals(annualResult.schedule3.line9_premium_tax_credit, 2_734);
  const monthly = calculateForm8962_2026({
    ...source,
    annual_line11_eligible: false,
  });
  const rows = monthly.fields.monthly_ptc_rows as Record<string, unknown>[];
  assertEquals(rows[0].premium, 801);
  assertEquals(rows[0].slcsp, 700);
  assertEquals(rows[0].aptc, 301);
  assertEquals(monthly.fields.total_premium_tax_credit, 6_336);
  assertEquals(monthly.fields.total_advance_ptc, 3_612);
  assertEquals(monthly.schedule3.line9_premium_tax_credit, 2_724);
  assertEquals(source, held);
});

Deno.test("2026 PTC includes required-filing dependent MAGI in the cliff", () => {
  const input = { ...annual(84_600), household_size: 2 };
  assertEquals(calculateForm8962_2026(input).fields.federal_poverty_pct, 400);
  const result = calculateForm8962_2026({
    ...input,
    dependents_modified_agi: 1,
  });
  assertEquals(result.fields.household_income, 84_601);
  assertEquals(result.fields.federal_poverty_pct, 401);
  assertEquals(result.schedule2.line1a_excess_advance_premium, 3_000);
});

Deno.test("2026 PTC zero source record does not create a form or payments", () => {
  const result = calculateForm8962_2026({
    ...annual(0),
    monthly_premiums: Array(12).fill(0),
    monthly_slcsps: Array(12).fill(0),
    monthly_aptcs: Array(12).fill(0),
    annual_premium: 0,
    annual_slcsp: 0,
    annual_aptc: 0,
  });
  assertEquals(result.fields, { filing_required: false });
  assertEquals(result.schedule2.line1a_excess_advance_premium, 0);
  assertEquals(result.schedule3.line9_premium_tax_credit, 0);
});

Deno.test("2026 PTC does not suppress conflicting annual amounts behind zero monthly columns", () => {
  assertThrows(
    () =>
      calculateForm8962_2026({
        ...annual(0),
        monthly_premiums: Array(12).fill(0),
        monthly_slcsps: Array(12).fill(0),
        monthly_aptcs: Array(12).fill(0),
        annual_premium: 0,
        annual_slcsp: 0,
        annual_aptc: 0.01,
      }),
    Error,
    "annual APTC",
  );
});

Deno.test("2026 PTC equal credit and advance payment emits line 26 zero", () => {
  const result = calculateForm8962_2026({
    ...annual(),
    annual_aptc: 3_765,
    monthly_aptcs: Array(12).fill(313.75),
  });
  assertEquals(result.fields.net_premium_tax_credit, 0);
  assertEquals(result.fields.excess_advance_payment, undefined);
  assertEquals(result.schedule2.line1a_excess_advance_premium, 0);
  assertEquals(result.schedule3.line9_premium_tax_credit, 0);
});

Deno.test("2026 PTC rejects unreconciled totals and unproved annual coverage", () => {
  assertThrows(
    () => calculateForm8962_2026({ ...annual(), annual_aptc: 3_001 }),
    Error,
    "annual APTC",
  );
  assertThrows(
    () =>
      calculateForm8962_2026({
        ...annual(),
        annual_premium: undefined,
        monthly_premiums: [500, ...Array(11).fill(416.67)],
      }),
    Error,
    "twelve months of unchanged",
  );
});

Deno.test("2026 PTC rejects advanced facts and incomplete eligibility instead of stripping them", () => {
  for (
    const extra of [
      { shared_policy_allocations: [] },
      { below_100_fpl_status: {} },
      { alternative_marriage: {} },
      { qsehra_amount_offered: 100 },
      { pub974_reconciliation: {} },
      { form8814_children: [] },
    ]
  ) {
    assertThrows(() => calculateForm8962_2026({ ...annual(), ...extra }));
  }
  assertThrows(
    () => calculateForm8962_2026(annual(15_649)),
    Error,
    "below-100%",
  );
  assertThrows(() =>
    calculateForm8962_2026({
      ...annual(),
      filing_status: FilingStatus.MFS,
    } as unknown as Form8962CalculationInput2026)
  );
  assertThrows(() =>
    calculateForm8962_2026({
      ...annual(),
      dependent_income_complete: false,
    } as unknown as Form8962CalculationInput2026)
  );
});

Deno.test("2026 PTC rejects nonfinite, fractional-dollar MAGI, fractional cents and unsafe totals", () => {
  for (const income of [Infinity, NaN, 62_600.01, Number.MAX_SAFE_INTEGER]) {
    assertThrows(() => calculateForm8962_2026(annual(income)));
  }
  for (
    const amount of [
      -1,
      Infinity,
      10.001,
      10.00001,
      Number.MAX_SAFE_INTEGER / 100,
    ]
  ) {
    assertThrows(() =>
      calculateForm8962_2026({
        ...annual(),
        monthly_premiums: Array(12).fill(amount),
      })
    );
  }
});

Deno.test("shared 2025 node keeps enhanced credit and capped repayment after policy extraction", () => {
  const result = priorNode.compute({ taxYear: 2025, formType: "f1040" }, {
    household_size: 1,
    fpl_region: "contiguous",
    filing_status: FilingStatus.Single,
    taxpayer_modified_agi: 20_000,
    dependent_income_complete: true,
    annual_premium: 1_000,
    annual_slcsp: 1_000,
    annual_aptc: 6_000,
    annual_line11_eligible: true,
  });
  const fields =
    result.outputs.find((row) => row.nodeType === "form8962")!.fields;
  assertEquals(fields.applicable_figure, 0);
  assertEquals(fields.excess_advance_payment, 5_000);
  assertEquals(fields.repayment_limitation, 375);
  assertEquals(fields.excess_advance_premium, 375);
  assertEquals(
    result.outputs.find((row) => row.nodeType === "schedule2")!.fields
      .line1a_excess_advance_premium,
    375,
  );
});
