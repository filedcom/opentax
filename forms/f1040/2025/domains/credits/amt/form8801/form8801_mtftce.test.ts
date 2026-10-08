import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  calculateForm8801Mtftce,
  form8801MtftceSchema,
} from "./form8801_mtftce.ts";
import {
  calculateForm8801,
  form8801CalculationSchema,
} from "./form8801_calculation.ts";
import {
  fixture as publicFixture,
  packageFacts,
} from "./form8801_reviewed_return.fixture.ts";

function fixture() {
  return {
    tax_year: 2024 as const,
    taxpayer_ssn: "111223333",
    reference: "mtftce-2024",
    simplified_limitation_election: false,
    categories: [{
      category: "general" as const,
      reference: "general",
      part_i: [{
        item_id: "foreign-income",
        reference: "exclusion-only-review",
        country: "SE",
        line1a_refigured_exclusion_income: 30_000,
        line2_definitely_related_expenses: 0,
        line3a_deductions: 0,
        line3b_other_deductions: 0,
        line3d_foreign_gross_income: 30_000,
        line3e_worldwide_gross_income: 120_000,
        line4a_mortgage_interest: 0,
        line4b_other_interest: 0,
        line5_foreign_losses: 0,
      }],
      line9_regular_foreign_taxes: {
        reference: "prior-regular-1116",
        amount: 2_000,
      },
      line10_mtftce_carry: [] as {
        item_id: string;
        reference: string;
        amount: number;
      }[],
      line12_tax_reduction: { reference: "reductions", amount: 0 },
      line13_high_tax_reclassification: { reference: "high-tax", amount: 0 },
      line16_income_adjustments: { reference: "loss-adjustments", amount: 0 },
      line22_limitation_increase: { reference: "960", amount: 0 },
    }],
    line34_boycott_credit_reduction: { reference: "boycott", amount: 0 },
  };
}
const context = {
  taxpayer_ssn: "111223333",
  prior_filing_status: "single",
  lines: { 4: 120_000, 11: 8_918 },
};

Deno.test("MTFTCE ordinary category derives credit from exclusion income and calculated tax", () => {
  const r = calculateForm8801Mtftce(fixture(), context);
  assertEquals(r.categories[0].lines, {
    9: 2000,
    10: 0,
    11: 2000,
    12: 0,
    13: 0,
    14: 2000,
    15: 30000,
    16: 0,
    17: 30000,
    18: 120000,
    19: 0.25,
    20: 8918,
    21: 2230,
    22: 0,
    23: 2230,
    24: 2000,
  });
  assertEquals(r.form8801_line12, 2000);
  assertEquals([r.workpaperAuthenticityVerified, r.filingReady], [
    false,
    false,
  ]);
});
Deno.test("MTFTCE country columns allocate indirect deductions and combine net income", () => {
  const f = fixture(), a = f.categories[0].part_i[0];
  Object.assign(a, {
    line1a_refigured_exclusion_income: 40000,
    line2_definitely_related_expenses: 1000,
    line3a_deductions: 10000,
    line3b_other_deductions: 2000,
    line3d_foreign_gross_income: 40000,
    line4a_mortgage_interest: 500,
    line4b_other_interest: 250,
    line5_foreign_losses: 1250,
  });
  f.categories[0].part_i.push({
    ...a,
    item_id: "second-country",
    country: "FR",
    line1a_refigured_exclusion_income: 20000,
    line3d_foreign_gross_income: 20000,
  });
  const r = calculateForm8801Mtftce(f, context), cols = r.categories[0].part_i!;
  assertEquals(cols.map((c) => [c.line3c, c.line3g, c.line6, c.line7]), [[
    12000,
    4000,
    7000,
    33000,
  ], [12000, 2000, 5000, 15000]]);
  assertEquals(r.categories[0].lines[17], 48000);
  assertEquals(r.categories[0].lines[21], 3567);
});
Deno.test("MTFTCE carry, reductions and boycott are distinct from limitation", () => {
  const f = fixture();
  f.categories[0].line10_mtftce_carry.push({
    item_id: "carry",
    reference: "mtftce-history",
    amount: 1000,
  });
  f.categories[0].line12_tax_reduction.amount = 100;
  f.line34_boycott_credit_reduction.amount = 30;
  const r = calculateForm8801Mtftce(f, context);
  assertEquals(r.categories[0].lines[14], 2900);
  assertEquals(r.categories[0].line14_minus_line21_record, 670);
  assertEquals(r.form8801_line12, 2200);
});
Deno.test("MTFTCE multiple categories reconcile reclassification and cap aggregate credit", () => {
  const f = form8801MtftceSchema.parse(fixture());
  const first = f.categories[0];
  first.part_i![0].line1a_refigured_exclusion_income = 120000;
  first.line9_regular_foreign_taxes.amount = 10000;
  first.line13_high_tax_reclassification.amount = 100;
  f.categories.push({
    ...structuredClone(first),
    category: "passive",
    reference: "passive",
    part_i: [{ ...first.part_i![0], item_id: "passive-source" }],
    line13_high_tax_reclassification: { reference: "transfer", amount: -100 },
  });
  const r = calculateForm8801Mtftce(f, context);
  assertEquals(r.categories.map((c) => c.lines[14]), [10100, 9900]);
  assertEquals([
    r.summary[27],
    r.summary[28],
    r.summary[32],
    r.summary[33],
    r.form8801_line12,
  ], [8918, 8918, 17836, 8918, 8918]);
  f.categories[1].line13_high_tax_reclassification.amount = 0;
  assertThrows(
    () => calculateForm8801Mtftce(f, context),
    Error,
    "reconcile across categories",
  );
});
Deno.test("MTFTCE nonpositive adjusted foreign income stops limitation and records unused tax", () => {
  for (const loss of [30000, 40000]) {
    const f = fixture();
    f.categories[0].line16_income_adjustments.amount = -loss;
    const r = calculateForm8801Mtftce(f, context);
    assertEquals(r.form8801_line12, 0);
    assertEquals(r.categories[0].lines[18], undefined);
    assertEquals(r.categories[0].lines[20], 8918);
    assertEquals(r.categories[0].line14_minus_line21_record, 2000);
  }
});
Deno.test("MTFTCE 951A rejects carry and 901j has no credit or tax limit", () => {
  const f = form8801MtftceSchema.parse(fixture());
  f.categories[0].category = "section_951a";
  assertEquals(
    calculateForm8801Mtftce(f, context).categories[0].lines[10],
    undefined,
  );
  f.categories[0].line10_mtftce_carry.push({
    item_id: "carry",
    reference: "history",
    amount: 1,
  });
  assertThrows(
    () => calculateForm8801Mtftce(f, context),
    Error,
    "cannot use tax carryovers",
  );
  f.categories[0].category = "section_901j";
  const r = calculateForm8801Mtftce(f, context);
  assertEquals([
    r.categories[0].lines[20],
    r.categories[0].lines[24],
    r.form8801_line12,
  ], [undefined, undefined, 0]);
});
Deno.test("MTFTCE treaty categories require distinct country records", () => {
  const f = form8801MtftceSchema.parse(fixture());
  f.categories[0].category = "treaty";
  assertThrows(
    () => calculateForm8801Mtftce(f, context),
    Error,
    "distinct country",
  );
  f.categories[0].treaty_country = "SE";
  f.categories.push({
    ...structuredClone(f.categories[0]),
    treaty_country: "FR",
    part_i: [{ ...f.categories[0].part_i![0], item_id: "fr" }],
  });
  assertEquals(calculateForm8801Mtftce(f, context).summary[30], 4000);
  f.categories[1].treaty_country = "SE";
  assertThrows(
    () => calculateForm8801Mtftce(f, context),
    Error,
    "Duplicate MTFTCE category",
  );
});
Deno.test("MTFTCE simplified election uses prior AMT line 17 and skips exclusion Part I", () => {
  const f = form8801MtftceSchema.parse(fixture());
  f.simplified_limitation_election = true;
  assertThrows(
    () => calculateForm8801Mtftce(f, context),
    Error,
    "Simplified MTFTCE",
  );
  delete f.categories[0].part_i;
  delete f.categories[0].line16_income_adjustments;
  f.categories[0].line17_simplified_prior_amt = {
    reference: "prior-AMT-1116",
    amount: 12000,
  };
  const r = calculateForm8801Mtftce(f, context);
  assertEquals([
    r.categories[0].lines[15],
    r.categories[0].lines[16],
    r.categories[0].lines[21],
    r.form8801_line12,
  ], [undefined, undefined, 892, 892]);
});
Deno.test("MTFTCE single-category limitation increase goes directly to line 33", () => {
  const f = fixture();
  f.categories[0].part_i[0].line1a_refigured_exclusion_income = 120000;
  f.categories[0].line9_regular_foreign_taxes.amount = 10000;
  f.categories[0].line22_limitation_increase.amount = 100;
  assertEquals(calculateForm8801Mtftce(f, context).form8801_line12, 9018);
});
Deno.test("MTFTCE preferential worldwide worksheet independently reduces all rate components", () => {
  const c = {
    ...context,
    lines: {
      4: 320000,
      11: 42564,
      32: 104300,
      38: 47025,
      45: 52975,
      48: 20000,
      51: 30000,
      53: 42564,
      54: 60952,
    },
  };
  const r = calculateForm8801Mtftce(fixture(), c);
  assertEquals(r.worldwide_worksheet, {
    1: 320000,
    4: 30000,
    5: 3213,
    6: 20000,
    7: 5714,
    8: 52975,
    9: 24596,
    10: 47025,
    11: 80548,
    12: 239452,
  });
  assertEquals(r.worldwide_income, 239452);
  const zero = calculateForm8801Mtftce(fixture(), {
    ...c,
    lines: { ...c.lines, 48: 0, 51: 0 },
  });
  assertEquals(zero.worldwide_income, 248379);
});
Deno.test("MTFTCE preferential exception threshold depends on prior filing status", () => {
  const f = {
    ...fixture(),
    regular_tax_adjustment_exception: {
      reference: "regular-adjustment-qualified",
      qualified: true as const,
    },
  };
  const c = {
    ...context,
    lines: {
      4: 320000,
      11: 42564,
      32: 116300,
      38: 47025,
      45: 52975,
      53: 42564,
      54: 60952,
    },
    prior_filing_status: "married_filing_separately",
  };
  assertEquals(calculateForm8801Mtftce(f, c).worldwide_income, 320000);
  assertThrows(
    () =>
      calculateForm8801Mtftce(f, { ...c, lines: { ...c.lines, 32: 116301 } }),
    Error,
    "threshold",
  );
  assertEquals(
    calculateForm8801Mtftce(f, {
      ...c,
      prior_filing_status: "single",
      lines: { ...c.lines, 32: 232600 },
    }).worldwide_income,
    320000,
  );
  assertThrows(
    () =>
      calculateForm8801Mtftce(f, {
        ...c,
        prior_filing_status: "single",
        lines: { ...c.lines, 32: 232601 },
      }),
    Error,
    "threshold",
  );
});
Deno.test("MTFTCE rejects mismatched owner, repeated source, impossible tax reduction and boycott", () => {
  assertThrows(
    () =>
      calculateForm8801Mtftce(fixture(), {
        ...context,
        taxpayer_ssn: "999887777",
      }),
    Error,
    "matching owner",
  );
  const f = fixture();
  f.categories[0].part_i.push({ ...f.categories[0].part_i[0] });
  assertThrows(
    () => calculateForm8801Mtftce(f, context),
    Error,
    "Duplicate MTFTCE source",
  );
  f.categories[0].part_i.pop();
  f.categories[0].line12_tax_reduction.amount = 2001;
  assertThrows(
    () => calculateForm8801Mtftce(f, context),
    Error,
    "exceed available tax",
  );
  f.categories[0].line12_tax_reduction.amount = 0;
  f.line34_boycott_credit_reduction.amount = 2001;
  assertThrows(
    () => calculateForm8801Mtftce(f, context),
    Error,
    "boycott reduction",
  );
});
Deno.test("Form 8801 general MTFTCE binds computed line 12 and rejects detached aggregate", () => {
  const f = {
    ...packageFacts(),
    minimum_tax_foreign_credit_exclusion_workpaper: {
      reference: "general-review",
      amount: 2000,
      method: "refigured_exclusion_items" as const,
      refiguring: fixture(),
    },
    current_return: {
      reference: "current",
      form1040_line16: 20000,
      schedule2_line1z: 0,
      form1040_line19: 1000,
      form6251_line9: 15000,
      schedule3_credits: [],
    },
  };
  const r = calculateForm8801(form8801CalculationSchema.parse(f));
  assertEquals([r.lines[11], r.lines[12], r.lines[15], r.lines[21]], [
    8918,
    2000,
    0,
    6100,
  ]);
  assertEquals(r.mtftceWorkpaperArithmeticReconciled, true);
  f.minimum_tax_foreign_credit_exclusion_workpaper.refiguring.categories[0]
    .line9_regular_foreign_taxes.amount = 1999;
  assertThrows(
    () => calculateForm8801(form8801CalculationSchema.parse(f)),
    Error,
    "differs from category calculation",
  );
});

Deno.test("General MTFTCE canonical workpaper settles public Schedule 3 and Form 1040", async () => {
  const { stageForm8801SettledReturn } = await import(
    "./form8801_settled_return.ts"
  );
  const facts = {
    ...packageFacts(),
    minimum_tax_foreign_credit_exclusion_workpaper: {
      reference: "general-review",
      amount: 2000,
      method: "refigured_exclusion_items",
      refiguring: fixture(),
    },
  };
  const f = await publicFixture(facts);
  const r = await stageForm8801SettledReturn(f.inputs, f.binding, f.documents);
  assertEquals([
    r.lines[12],
    r.lines[25],
    r.final_schedule3.line6b_prior_year_min_tax_credit,
    r.final_form1040.line22_tax_after_credits,
    r.final_form1040.line35a_refund,
  ], [2000, 6100, 6100, 11767, 8233]);
  assertEquals(r.mtftceWorkpaperArithmeticReconciled, true);
  assertEquals([
    r.filingReady,
    r.workpaperAuthenticityVerified,
    r.priorAcceptanceVerified,
  ], [false, false, false]);
  facts.minimum_tax_foreign_credit_exclusion_workpaper.amount = 1999;
  const changed = await publicFixture(facts);
  await assertRejects(
    () =>
      stageForm8801SettledReturn(
        changed.inputs,
        changed.binding,
        changed.documents,
      ),
    Error,
    "differs from category calculation",
  );
});

function distributionFixture() {
  const f = form8801MtftceSchema.parse(fixture());
  f.categories[0].part_i![0].line1a_distribution_workpaper = {
    reference: "rate-band-review",
    other_taxable_exclusion_income: 3000,
    qualified_dividends: {
      reference: "qd",
      zero_rate: 1000,
      fifteen_rate: 10000,
      twenty_rate: 7000,
      form4952_elected: 500,
    },
    capital_gain_distributions: {
      reference: "1099div-box2a",
      zero_rate: 2000,
      fifteen_rate: 20000,
      twenty_rate: 14000,
      form4952_elected: 1000,
    },
    other_capital_gains_or_losses: false,
  };
  f.categories[0].part_i![0].line1a_refigured_exclusion_income = 35571;
  f.categories[0].part_i![0].line3d_foreign_gross_income = 58500;
  return f;
}
const preferentialContext = {
  ...context,
  lines: {
    4: 320000,
    11: 42564,
    32: 104300,
    38: 47025,
    45: 52975,
    48: 0,
    51: 30000,
    53: 42564,
    54: 60952,
  },
};
Deno.test("MTFTCE derives foreign dividend/distribution adjustments and retains 4952 election amounts", () => {
  const r = calculateForm8801Mtftce(distributionFixture(), preferentialContext);
  const col = r.categories[0].part_i![0];
  // QD: 5,357 + 5,000 + 500. Distributions: 10,714 + 10,000 + 1,000.
  // Add ordinary 3,000; omit zero-rate 1,000 + 2,000.
  assertEquals([
    col.line1a_calculated,
    col.line7,
    col.distribution_income_arithmetic_reconciled,
  ], [35571, 35571, true]);
  assertEquals(r.categories[0].lines[15], 35571);
});
Deno.test("MTFTCE distribution method retains all rate bands when adjustment trigger is absent", () => {
  for (
    const c of [context, {
      ...preferentialContext,
      lines: { ...preferentialContext.lines, 53: 60952 },
    }, {
      ...preferentialContext,
      lines: { ...preferentialContext.lines, 32: 0 },
    }]
  ) {
    const f = distributionFixture();
    f.categories[0].part_i![0].line1a_refigured_exclusion_income = 58500;
    assertEquals(calculateForm8801Mtftce(f, c).categories[0].lines[15], 58500);
  }
});
Deno.test("MTFTCE qualified regular-tax exception skips foreign income and worldwide adjustments together", () => {
  const f = distributionFixture();
  f.regular_tax_adjustment_exception = {
    reference: "qualified-regular-exception",
    qualified: true,
  };
  f.categories[0].part_i![0].line1a_refigured_exclusion_income = 58500;
  const r = calculateForm8801Mtftce(f, preferentialContext);
  assertEquals([
    r.categories[0].lines[15],
    r.worldwide_income,
    r.worldwide_worksheet,
  ], [58500, 320000, undefined]);
});
Deno.test("MTFTCE distribution calculation rejects detached income, mixed methods and other capital gains", () => {
  const f = distributionFixture();
  f.categories[0].part_i![0].line1a_refigured_exclusion_income++;
  assertThrows(
    () => calculateForm8801Mtftce(f, preferentialContext),
    Error,
    "differs from distribution calculation",
  );
  f.categories[0].part_i!.push({
    ...f.categories[0].part_i![0],
    item_id: "second",
    line1a_distribution_workpaper: undefined,
  });
  assertThrows(
    () => calculateForm8801Mtftce(f, preferentialContext),
    Error,
    "every country",
  );
  const other = distributionFixture();
  const raw = JSON.parse(JSON.stringify(other));
  raw.categories[0].part_i[0].line1a_distribution_workpaper
    .other_capital_gains_or_losses = true;
  assertThrows(() => calculateForm8801Mtftce(raw, preferentialContext));
});
Deno.test("MTFTCE rate-band category rounding reconciles country columns without penny drift", () => {
  const f = distributionFixture(), a = f.categories[0].part_i![0];
  const zero = {
    reference: "none",
    zero_rate: 0,
    fifteen_rate: 0,
    twenty_rate: 0,
    form4952_elected: 0,
  };
  a.line1a_distribution_workpaper = {
    reference: "small",
    other_taxable_exclusion_income: 0,
    qualified_dividends: { ...zero, fifteen_rate: 1 },
    capital_gain_distributions: zero,
    other_capital_gains_or_losses: false,
  };
  a.line1a_refigured_exclusion_income = 1;
  a.line3d_foreign_gross_income = 1;
  f.categories[0].part_i!.push({
    ...structuredClone(a),
    item_id: "small-FR",
    country: "FR",
    line1a_refigured_exclusion_income: 0,
  });
  const r = calculateForm8801Mtftce(f, preferentialContext);
  assertEquals(r.categories[0].part_i!.map((c) => c.line1a_calculated), [1, 0]);
  assertEquals(r.categories[0].lines[15], 1); // 2 * .5357 = 1.0714 rounds once to 1.
});
Deno.test("MTFTCE distribution review reaches canonical public return without claiming provenance", async () => {
  const { stageForm8801SettledReturn } = await import(
    "./form8801_settled_return.ts"
  );
  const workpaper = distributionFixture();
  workpaper.categories[0].part_i![0].line1a_refigured_exclusion_income = 58500;
  const f = await publicFixture({
    ...packageFacts(),
    minimum_tax_foreign_credit_exclusion_workpaper: {
      reference: "distribution-review",
      amount: 2000,
      method: "refigured_exclusion_items",
      refiguring: workpaper,
    },
  });
  const r = await stageForm8801SettledReturn(f.inputs, f.binding, f.documents);
  assertEquals(
    r.mtftceRefiguring!.categories[0].part_i![0].line1a_calculated,
    58500,
  );
  assertEquals([
    r.lines[12],
    r.final_schedule3.line6b_prior_year_min_tax_credit,
    r.final_form1040.line22_tax_after_credits,
  ], [2000, 6100, 11767]);
  assertEquals([
    r.workpaperAuthenticityVerified,
    r.priorAcceptanceVerified,
    r.filingReady,
  ], [false, false, false]);
});
