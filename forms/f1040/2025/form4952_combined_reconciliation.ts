import { z } from "zod";
import { inputSchema as form1099intSchema } from "../nodes/inputs/f1099int/index.ts";
import { inputSchema as form1099divSchema } from "../nodes/inputs/f1099div/index.ts";
import { inputSchema as form1099oidSchema } from "../nodes/inputs/f1099oid/index.ts";
import {
  calculateForm4952,
  inputSchema as form4952Schema,
} from "../nodes/intermediate/forms/form4952/index.ts";
import { reconcileForm4952Itemization } from "./form4952_itemization.ts";
import { plainInvestmentOid } from "./form4952_oid_source.ts";

const scheduleASchema = z.object({
  line_9_investment_interest: z.number().nonnegative(),
});
const form1040Schema = z.object({
  line2b_taxable_interest: z.number().nonnegative(),
  line3a_qualified_dividends: z.number().nonnegative().optional(),
  line3b_ordinary_dividends: z.number().nonnegative(),
  line12e_itemized_deductions: z.number().nonnegative(),
});
const numberedLines = [
  "line1",
  "line2",
  "line3",
  "line4a",
  "line4b",
  "line4c",
  "line4d",
  "line4e",
  "line4f",
  "line4g",
  "line4h",
  "line5",
  "line6",
  "line7",
  "line8",
] as const;

type Form4952Input = z.infer<typeof form4952Schema>;
type InterestItem = z.infer<typeof form1099intSchema>["f1099ints"][number];
type DividendItem = z.infer<typeof form1099divSchema>["f1099divs"][number];

/** Match each accumulated Form 4952 amount to one supplied source amount. */
export function sourceAmountsMatch(
  value: Form4952Input["source_1099_interest"],
  amounts: readonly number[],
): boolean {
  if (value === undefined || amounts.length === 0) return false;
  const supplied = Array.isArray(value) ? value : [value];
  if (supplied.length !== amounts.length) return false;
  const orderedSupplied = [...supplied].sort((a, b) => a - b);
  const orderedAmounts = [...amounts].sort((a, b) => a - b);
  return orderedSupplied.every((amount, index) =>
    amount === orderedAmounts[index]
  );
}

export function plainInvestmentInterest(item: InterestItem): boolean {
  return item.investment_property_for_form4952 === true &&
    (item.box1 ?? 0) > 0 &&
    item.seller_financed !== true &&
    item.seller_financed_buyer === undefined &&
    item.buyer_used_as_personal_residence === undefined &&
    item.elect_bond_premium_amortization !== true &&
    [
      item.box2,
      item.box3,
      item.box4,
      item.box5,
      item.box8,
      item.box9,
      item.box10,
      item.box11,
      item.box12,
      item.box13,
      item.box17,
    ]
      .every((amount) => (amount ?? 0) === 0) &&
    [item.box14, item.box15, item.box16]
      .every((value) => (value?.trim().length ?? 0) === 0) &&
    [
      item.nominee_interest,
      item.accrued_interest_paid,
      item.non_taxable_oid_adjustment,
    ]
      .every((amount) => (amount ?? 0) === 0);
}

// The combined dividend route can use unadjusted federally taxable Treasury
// interest too. Keep the narrower box-1 predicate for K-1 combinations.
function plainCombinedInvestmentInterest(item: InterestItem): boolean {
  return item.investment_property_for_form4952 === true &&
    (item.box1 ?? 0) + (item.box3 ?? 0) > 0 &&
    item.seller_financed !== true &&
    item.seller_financed_buyer === undefined &&
    item.buyer_used_as_personal_residence === undefined &&
    item.elect_bond_premium_amortization !== true &&
    [
      item.box2,
      item.box4,
      item.box5,
      item.box8,
      item.box9,
      item.box10,
      item.box11,
      item.box12,
      item.box13,
      item.box17,
      item.nominee_interest,
      item.accrued_interest_paid,
      item.non_taxable_oid_adjustment,
    ].every((amount) => (amount ?? 0) === 0) &&
    [item.box14, item.box15, item.box16].every((value) =>
      (value?.trim().length ?? 0) === 0
    );
}

export function plainInvestmentDividend(item: DividendItem): boolean {
  return item.investment_property_for_form4952 === true &&
    item.isNominee !== true && item.box11 !== true &&
    item.nominee_distribution === undefined && item.box1a > 0 &&
    [
      item.box1b,
      item.box2a,
      item.box2b,
      item.box2c,
      item.box2d,
      item.box2e,
      item.box2f,
      item.box3,
      item.box4,
      item.box5,
      item.box6,
      item.box9,
      item.box10,
      item.box12,
      item.box13,
      item.box16,
    ]
      .every((amount) => (amount ?? 0) === 0) &&
    [item.box14, item.box15]
      .every((value) => (value?.trim().length ?? 0) === 0) &&
    item.holdingPeriodDays === undefined;
}

/** Unadjusted investment interest and 1099-DIV box 1a/1b payers. */
export function reconcileForm4952CombinedPath(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>>,
): void {
  const interest = form1099intSchema.safeParse(pending.f1099int);
  const oid = form1099oidSchema.safeParse(pending.f1099oid);
  const dividend = form1099divSchema.safeParse(pending.f1099div);
  const form = form4952Schema.safeParse(fields);
  const scheduleA = scheduleASchema.safeParse(pending.schedule_a);
  const form1040 = form1040Schema.safeParse(pending.f1040);
  if (
    (!interest.success && !oid.success) ||
    (pending.f1099int !== undefined && !interest.success) ||
    (pending.f1099oid !== undefined && !oid.success) ||
    !dividend.success || !form.success ||
    !scheduleA.success || !form1040.success
  ) {
    throw new Error(
      "Form 4952 combined path needs 1099 interest and dividend sources, completed Form 4952, Schedule A line 9, and finalized Form 1040",
    );
  }

  const interestItems = interest.success ? interest.data.f1099ints : [];
  const oidItems = oid.success ? oid.data.f1099oids : [];
  const dividendItems = dividend.data.f1099divs;
  if (
    interestItems.some((item) =>
      (item.box6 ?? 0) > 0 ||
      (item.foreign_source_interest_usd ?? 0) > 0 ||
      (item.box7?.trim().length ?? 0) > 0 ||
      item.foreign_tax_irs_country_code !== undefined
    ) ||
    dividendItems.some((item) =>
      (item.box7 ?? 0) > 0 ||
      (item.box8?.trim().length ?? 0) > 0 ||
      (item.foreign_source_dividends_usd ?? 0) > 0 ||
      (item.foreign_source_qualified_dividends_usd ?? 0) > 0 ||
      item.foreign_tax_irs_country_code !== undefined
    )
  ) {
    throw new Error(
      "Form 4952 combined path does not reconcile foreign-source income or foreign tax with Form 1116 investment-interest allocation",
    );
  }
  const interestTotal = interestItems.reduce(
    (total, item) => total + (item.box1 ?? 0) + (item.box3 ?? 0),
    0,
  ) + oidItems.reduce((total, item) => total + (item.box1_oid ?? 0), 0);
  const dividendTotal = dividendItems.reduce(
    (total, item) => total + item.box1a,
    0,
  );
  const qualifiedTotal = dividendItems.reduce(
    (total, item) => total + (item.box1b ?? 0),
    0,
  );
  if (
    interestItems.length + oidItems.length === 0 ||
    dividendItems.length === 0 ||
    !interestItems.every(plainCombinedInvestmentInterest) ||
    !oidItems.every(plainInvestmentOid) ||
    !dividendItems.every((item) =>
      (item.box1b ?? 0) <= item.box1a &&
      plainInvestmentDividend({ ...item, box1b: 0 })
    ) ||
    !sourceAmountsMatch(
      form.data.source_1099_interest,
      [
        ...interestItems.map((item) => (item.box1 ?? 0) + (item.box3 ?? 0)),
        ...oidItems.map((item) => item.box1_oid ?? 0),
      ],
    ) ||
    !sourceAmountsMatch(
      form.data.source_1099_dividends,
      dividendItems.map((item) => item.box1a),
    ) ||
    (qualifiedTotal > 0
      ? !sourceAmountsMatch(
        form.data.source_1099_qualified_dividends,
        dividendItems.filter((item) => (item.box1b ?? 0) > 0).map((item) =>
          item.box1b ?? 0
        ),
      )
      : form.data.source_1099_qualified_dividends !== undefined) ||
    (form.data.source_1099_capital_gain_distributions ?? 0) !== 0 ||
    (form.data.source_1099_royalties ?? 0) !== 0 ||
    (form.data.source_private_activity_bond_interest ?? 0) !== 0 ||
    (form.data.source_k1_interest ?? 0) !== 0 ||
    (form.data.source_k1_dividends ?? 0) !== 0 ||
    (form.data.source_k1_qualified_dividends ?? 0) !== 0 ||
    (form.data.source_k1_allowed_investment_expenses ?? 0) !== 0 ||
    (form.data.source_k1_investment_interest ?? 0) !== 0 ||
    (form.data.other_investment_property_gross_income ?? 0) !== 0 ||
    (form.data.other_investment_property_qualified_dividends ?? 0) !== 0 ||
    (form.data.other_investment_property_net_disposition_gain ?? 0) !== 0 ||
    (form.data.other_investment_property_net_capital_gain ?? 0) !== 0 ||
    (form.data.investment_income_election ?? 0) !== 0 ||
    (form.data.elected_capital_gain_portion ?? 0) !== 0 ||
    (form.data.investment_expenses ?? 0) !== 0 ||
    (form.data.prior_year_carryforward ?? 0) !== 0 ||
    (form.data.form8814_line9_qualified_dividends ?? 0) !== 0 ||
    (form.data.form8814_line10_capital_gain ?? 0) !== 0 ||
    (form.data.form8814_line12_investment_income ?? 0) !== 0 ||
    (form.data.investment_interest_expense ?? 0) <= 0 ||
    !form.data.amt_refigure ||
    Object.values(form.data.amt_refigure).some((amount) => amount !== 0)
  ) {
    throw new Error(
      "Form 4952 combined path supports only unadjusted box 1 or box 3 interest and box 1a/1b dividend payers without other sources or elections",
    );
  }
  const lines = calculateForm4952(form.data);
  if (
    lines.line1 <= 0 || lines.line8 <= 0 ||
    lines.line4a !== interestTotal + dividendTotal ||
    lines.line4b !== qualifiedTotal || lines.line4d !== 0 ||
    lines.line5 !== 0 ||
    numberedLines.some((line) => fields[line] !== lines[line])
  ) {
    throw new Error(
      "Form 4952 combined numbered lines differ from sourced income amounts and calculated interest limit",
    );
  }
  if (
    scheduleA.data.line_9_investment_interest !== lines.line8 ||
    form1040.data.line2b_taxable_interest !== interestTotal ||
    (form1040.data.line3a_qualified_dividends ?? 0) !== qualifiedTotal ||
    form1040.data.line3b_ordinary_dividends !== dividendTotal ||
    form1040.data.line12e_itemized_deductions < lines.line8
  ) {
    throw new Error(
      "Form 4952 combined line 8 or income differs from finalized Schedule A and Form 1040",
    );
  }
  reconcileForm4952Itemization(pending, lines.line8);
}
