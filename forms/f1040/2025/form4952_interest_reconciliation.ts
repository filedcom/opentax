import { z } from "zod";
import { inputSchema as form1099intSchema } from "../nodes/inputs/f1099int/index.ts";
import { inputSchema as form1099oidSchema } from "../nodes/inputs/f1099oid/index.ts";
import {
  calculateForm4952,
  inputSchema as form4952Schema,
} from "../nodes/intermediate/forms/form4952/index.ts";
import { sourceAmountsMatch } from "./form4952_combined_reconciliation.ts";
import { reconcileForm4952Itemization } from "./form4952_itemization.ts";
import { plainInvestmentOid } from "./form4952_oid_source.ts";

const scheduleASchema = z.object({
  line_9_investment_interest: z.number().nonnegative(),
});
const form1040Schema = z.object({
  line2b_taxable_interest: z.number().nonnegative(),
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

type IntItem = z.infer<typeof form1099intSchema>["f1099ints"][number];

// Box 1 and box 3 both contribute taxable interest from an affirmed investment
// property. The source node posts their sum once for each 1099-INT payer.
function plainInvestmentBox1Or3(item: IntItem): boolean {
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

/** Bound Form 4952 to uncomplicated, affirmed taxable-interest payers. */
export function reconcileForm4952InterestPath(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>>,
): void {
  const source = form1099intSchema.safeParse(pending.f1099int);
  const oidSource = form1099oidSchema.safeParse(pending.f1099oid);
  const form = form4952Schema.safeParse(fields);
  const scheduleA = scheduleASchema.safeParse(pending.schedule_a);
  const form1040 = form1040Schema.safeParse(pending.f1040);
  if (
    (!source.success && !oidSource.success) ||
    (pending.f1099int !== undefined && !source.success) ||
    (pending.f1099oid !== undefined && !oidSource.success) ||
    !form.success ||
    !scheduleA.success ||
    !form1040.success
  ) {
    throw new Error(
      "Form 4952 interest path needs its 1099-INT or 1099-OID, completed Form 4952, Schedule A line 9, and finalized Form 1040",
    );
  }
  const interestItems = source.success ? source.data.f1099ints : [];
  const oidItems = oidSource.success ? oidSource.data.f1099oids : [];
  const amounts = [
    ...interestItems.map((item) => (item.box1 ?? 0) + (item.box3 ?? 0)),
    ...oidItems.map((item) => item.box1_oid ?? 0),
  ];
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  if (
    interestItems.some((item) =>
      (item.box6 ?? 0) > 0 ||
      (item.foreign_source_interest_usd ?? 0) > 0 ||
      (item.box7?.trim().length ?? 0) > 0 ||
      item.foreign_tax_irs_country_code !== undefined
    )
  ) {
    throw new Error(
      "Form 4952 interest path does not reconcile foreign-source interest or foreign tax with Form 1116 investment-interest allocation",
    );
  }
  if (
    amounts.length === 0 ||
    !interestItems.every(plainInvestmentBox1Or3) ||
    !oidItems.every(plainInvestmentOid) ||
    !sourceAmountsMatch(
      form.data.source_1099_interest,
      amounts,
    ) ||
    (form.data.source_1099_dividends ?? 0) !== 0 ||
    (form.data.source_1099_qualified_dividends ?? 0) !== 0 ||
    (form.data.source_1099_royalties ?? 0) !== 0 ||
    (form.data.source_1099_capital_gain_distributions ?? 0) !== 0 ||
    (form.data.source_k1_interest ?? 0) !== 0 ||
    (form.data.source_k1_dividends ?? 0) !== 0 ||
    (form.data.source_k1_qualified_dividends ?? 0) !== 0 ||
    (form.data.source_k1_allowed_investment_expenses ?? 0) !== 0 ||
    (form.data.source_k1_investment_interest ?? 0) !== 0 ||
    (form.data.source_private_activity_bond_interest ?? 0) !== 0 ||
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
      "Form 4952 interest path supports only unadjusted box 1 or box 3 investment payers without other income or election components",
    );
  }
  const lines = calculateForm4952(form.data);
  if (
    lines.line1 <= 0 || lines.line8 <= 0 ||
    lines.line4a !== total || lines.line4b !== 0 ||
    lines.line4d !== 0 || lines.line5 !== 0 ||
    numberedLines.some((line) => fields[line] !== lines[line])
  ) {
    throw new Error(
      "Form 4952 numbered lines differ from the sourced interest and calculated interest limit",
    );
  }
  if (
    scheduleA.data.line_9_investment_interest !== lines.line8 ||
    form1040.data.line2b_taxable_interest !== total ||
    form1040.data.line12e_itemized_deductions < lines.line8
  ) {
    throw new Error(
      "Form 4952 line 8 or interest income differs from finalized Schedule A and Form 1040",
    );
  }
  reconcileForm4952Itemization(pending, lines.line8);
}
