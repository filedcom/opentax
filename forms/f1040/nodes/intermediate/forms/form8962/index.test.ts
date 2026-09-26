import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../types.ts";
import { form8962 } from "./index.ts";

const context = { taxYear: 2025, formType: "f1040" as const };

function compute(input: Record<string, unknown>) {
  return form8962.compute(context, {
    fpl_region: "contiguous",
    filing_status: FilingStatus.Single,
    dependent_income_complete: true,
    ...input,
  });
}

function fields(result: ReturnType<typeof compute>, nodeType: string) {
  return result.outputs.find((item) => item.nodeType === nodeType)?.fields;
}

function annual(
  householdIncome: number,
  annualPremium: number,
  annualSlcsp: number,
  annualAptc = 0,
  extra: Record<string, unknown> = {},
) {
  return compute({
    household_size: 1,
    taxpayer_modified_agi: householdIncome,
    annual_premium: annualPremium,
    annual_slcsp: annualSlcsp,
    annual_aptc: annualAptc,
    annual_line11_eligible: true,
    ...extra,
  });
}

Deno.test("Form 8962 has no output without marketplace premiums or APTC", () => {
  assertEquals(compute({}).outputs, []);
  assertEquals(
    compute({ household_size: 2, taxpayer_modified_agi: 30_000 }).outputs,
    [],
  );
});

Deno.test("annual totals alone do not establish Form 8962 line 11 eligibility", () => {
  assertThrows(
    () =>
      compute({
        household_size: 1,
        taxpayer_modified_agi: 30_000,
        annual_premium: 6_000,
        annual_slcsp: 7_000,
      }),
    Error,
    "annual line 11 needs verified full-year unchanged monthly coverage",
  );
});

Deno.test("Form 8962 separates taxpayer and dependent MAGI before line 3", () => {
  const result = annual(30_000, 6_000, 7_200, 0, {
    household_size: 2,
    dependents_modified_agi: 12_500,
  });
  const form = fields(result, "form8962");
  assertEquals(form?.taxpayer_modified_agi, 30_000);
  assertEquals(form?.dependents_modified_agi, 12_500);
  assertEquals(form?.household_income, 42_500);
});

Deno.test("Form 8962 adds elected Form 8814 dependent amount once by SSN", () => {
  const result = annual(30_000, 6_000, 7_200, 0, {
    household_size: 2,
    form8814_expected_ssns: ["123456789"],
    form8814_children: [{ ssn: "123456789", magi: 3_600 }],
  });
  const form = fields(result, "form8962");
  assertEquals(form?.dependents_modified_agi, 3_600);
  assertEquals(form?.household_income, 33_600);
});

Deno.test("Form 8962 rejects a dependent Form 8814 without the matching election", () => {
  assertThrows(
    () =>
      annual(30_000, 6_000, 7_200, 0, {
        household_size: 2,
        form8814_expected_ssns: ["123456789"],
        form8814_children: [{ ssn: "987654321", magi: 3_600 }],
      }),
    Error,
    "matching Form 8814",
  );
});

Deno.test("Form 8962 refuses unverified dependent filing facts", () => {
  assertThrows(
    () =>
      annual(30_000, 6_000, 7_200, 0, {
        dependent_income_complete: false,
      }),
    Error,
    "needs verified dependent filing and modified-AGI facts",
  );
});

Deno.test("2025 Table 2: 150% FPL has a zero applicable figure", () => {
  const result = annual(22_590, 6_000, 6_000);
  assertEquals(fields(result, "form8962")?.federal_poverty_pct, 150);
  assertEquals(fields(result, "form8962")?.applicable_figure, 0);
  assertEquals(fields(result, "form8962")?.annual_applicable_contribution, 0);
  assertEquals(fields(result, "schedule3")?.line9_premium_tax_credit, 6_000);
});

Deno.test("2025 Table 2: 200%, 250%, and 300% FPL use 2%, 4%, and 6%", () => {
  const cases = [
    {
      income: 30_120,
      pct: 200,
      figure: 0.02,
      contribution: 602,
      credit: 3_398,
    },
    {
      income: 37_650,
      pct: 250,
      figure: 0.04,
      contribution: 1_506,
      credit: 2_494,
    },
    {
      income: 45_180,
      pct: 300,
      figure: 0.06,
      contribution: 2_711,
      credit: 1_289,
    },
  ];
  for (const sample of cases) {
    const result = annual(sample.income, 4_000, 4_000);
    assertEquals(fields(result, "form8962")?.federal_poverty_pct, sample.pct);
    assertEquals(fields(result, "form8962")?.applicable_figure, sample.figure);
    assertEquals(
      fields(result, "form8962")?.annual_applicable_contribution,
      sample.contribution,
    );
    assertEquals(
      fields(result, "schedule3")?.line9_premium_tax_credit,
      sample.credit,
    );
  }
});

Deno.test("2025 Table 2: 301% and 399% FPL use four-decimal table figures", () => {
  const at301 = annual(45_331, 7_000, 7_000);
  const at399 = annual(60_090, 7_000, 7_000);
  assertEquals(fields(at301, "form8962")?.federal_poverty_pct, 301);
  assertEquals(fields(at301, "form8962")?.applicable_figure, 0.0603);
  assertEquals(fields(at399, "form8962")?.federal_poverty_pct, 399);
  assertEquals(fields(at399, "form8962")?.applicable_figure, 0.0848);
});

Deno.test("2025 Table 2: above 400% FPL uses 401 on line 5 and 8.5%", () => {
  const result = annual(75_300, 8_000, 8_000);
  assertEquals(fields(result, "form8962")?.federal_poverty_pct, 401);
  assertEquals(fields(result, "form8962")?.applicable_figure, 0.085);
  assertEquals(
    fields(result, "form8962")?.annual_applicable_contribution,
    6_401,
  );
  assertEquals(fields(result, "schedule3")?.line9_premium_tax_credit, 1_599);
});

Deno.test("line 11e is capped by actual premium after computing max assistance", () => {
  const result = annual(22_590, 1_000, 6_000);
  assertEquals(fields(result, "form8962")?.annual_max_ptc, 6_000);
  assertEquals(fields(result, "form8962")?.annual_ptc_allowed, 1_000);
  assertEquals(fields(result, "schedule3")?.line9_premium_tax_credit, 1_000);
});

Deno.test("line 26 net PTC reconciles to Schedule 3", () => {
  const result = annual(40_880, 5_500, 6_000, 1_000, { household_size: 2 });
  assertEquals(fields(result, "form8962")?.annual_applicable_contribution, 818);
  assertEquals(fields(result, "form8962")?.total_premium_tax_credit, 5_182);
  assertEquals(fields(result, "form8962")?.net_premium_tax_credit, 4_182);
  assertEquals(fields(result, "schedule3")?.line9_premium_tax_credit, 4_182);
  assertEquals(fields(result, "schedule2"), undefined);
});

Deno.test("line 29 excess APTC reconciles to Schedule 2 line 1a", () => {
  const result = annual(75_300, 6_500, 7_000, 5_000);
  assertEquals(fields(result, "form8962")?.total_premium_tax_credit, 599);
  assertEquals(fields(result, "form8962")?.excess_advance_payment, 4_401);
  assertEquals(fields(result, "form8962")?.repayment_limitation, undefined);
  assertEquals(fields(result, "form8962")?.excess_advance_premium, 4_401);
  assertEquals(
    fields(result, "schedule2")?.line1a_excess_advance_premium,
    4_401,
  );
  assertEquals(fields(result, "form6251")?.schedule2_line1z_tax, 4_401);
  assertEquals(fields(result, "schedule3"), undefined);
});

Deno.test("2025 Table 5 single repayment limits are 375, 975, and 1625", () => {
  const cases = [
    { income: 22_590, cap: 375 },
    { income: 37_650, cap: 975 },
    { income: 52_710, cap: 1_625 },
  ];
  for (const sample of cases) {
    const result = annual(sample.income, 4_000, 4_000, 10_000);
    assertEquals(fields(result, "form8962")?.repayment_limitation, sample.cap);
    assertEquals(
      fields(result, "schedule2")?.line1a_excess_advance_premium,
      sample.cap,
    );
  }
});

Deno.test("2025 Table 5 other-filing-status caps are 750, 1950, and 3250", () => {
  const cases = [
    { income: 22_590, cap: 750 },
    { income: 37_650, cap: 1_950 },
    { income: 52_710, cap: 3_250 },
  ];
  for (const sample of cases) {
    const result = annual(sample.income, 4_000, 4_000, 10_000, {
      filing_status: FilingStatus.MFJ,
    });
    assertEquals(fields(result, "form8962")?.repayment_limitation, sample.cap);
    assertEquals(
      fields(result, "schedule2")?.line1a_excess_advance_premium,
      sample.cap,
    );
  }
});

Deno.test("below 100% FPL needs exception facts with or without APTC", () => {
  for (const aptc of [0, 1_200]) {
    assertThrows(
      () => annual(10_000, 3_000, 4_000, aptc),
      Error,
      "below 100% FPL needs verified PTC exception facts",
    );
  }
});

Deno.test("Alaska and Hawaii use their 2024 poverty tables for TY2025", () => {
  const alaska = annual(30_000, 6_000, 6_000, 0, { fpl_region: "alaska" });
  const hawaii = annual(30_000, 6_000, 6_000, 0, { fpl_region: "hawaii" });
  assertEquals(fields(alaska, "form8962")?.federal_poverty_line, 18_810);
  assertEquals(fields(alaska, "form8962")?.federal_poverty_pct, 159);
  assertEquals(fields(hawaii, "form8962")?.federal_poverty_line, 17_310);
  assertEquals(fields(hawaii, "form8962")?.federal_poverty_pct, 173);
});

Deno.test("monthly calculation reports twelve rows and reconciles its line 24", () => {
  const result = compute({
    household_size: 2,
    taxpayer_modified_agi: 40_880,
    monthly_premiums: Array(12).fill(500),
    monthly_slcsps: Array(12).fill(600),
    monthly_aptcs: Array(12).fill(100),
  });
  const form = fields(result, "form8962");
  assertEquals(form?.monthly_applicable_contribution, 68);
  assertEquals((form?.monthly_ptc_rows as unknown[])?.length, 12);
  assertEquals(form?.total_premium_tax_credit, 6_000);
  assertEquals(form?.total_advance_ptc, 1_200);
  assertEquals(fields(result, "schedule3")?.line9_premium_tax_credit, 4_800);
});

Deno.test("annual QSEHRA is refused until monthly affordability can be checked", () => {
  assertThrows(
    () =>
      annual(22_590, 6_000, 6_000, 0, {
        qsehra_amount_offered: 3_000,
      }),
    Error,
    "QSEHRA needs monthly affordability and benefit facts",
  );
});

Deno.test("marketplace credit cannot be computed without household facts", () => {
  assertThrows(
    () =>
      form8962.compute(context, { annual_premium: 5_000, annual_slcsp: 5_000 }),
    Error,
    "requires taxpayer modified AGI, family size, FPL region, and filing status",
  );
});

Deno.test("monthly calculation refuses incomplete 1095-A columns", () => {
  assertThrows(
    () =>
      compute({
        household_size: 1,
        taxpayer_modified_agi: 30_000,
        monthly_premiums: Array(12).fill(500),
      }),
    Error,
    "needs all three 1095-A columns",
  );
});

Deno.test("monthly QSEHRA is refused until monthly affordability can be checked", () => {
  assertThrows(
    () =>
      compute({
        household_size: 1,
        taxpayer_modified_agi: 30_000,
        monthly_premiums: Array(12).fill(500),
        monthly_slcsps: Array(12).fill(500),
        monthly_aptcs: Array(12).fill(0),
        qsehra_amount_offered: 1_200,
      }),
    Error,
    "QSEHRA needs monthly affordability and benefit facts",
  );
});

Deno.test("MFS cannot claim PTC without verified exception and allocation facts", () => {
  assertThrows(
    () =>
      annual(22_590, 4_000, 4_000, 0, {
        filing_status: FilingStatus.MFS,
      }),
    Error,
    "MFS needs verified exception and policy-allocation facts",
  );
  assertThrows(
    () =>
      annual(22_590, 4_000, 4_000, 10_000, {
        filing_status: FilingStatus.MFS,
      }),
    Error,
    "MFS needs verified exception and policy-allocation facts",
  );
});
