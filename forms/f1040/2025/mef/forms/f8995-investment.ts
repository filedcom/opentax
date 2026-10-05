import {
  assertDistinct1099INTCopies,
  inputSchema as intSchema,
} from "../../../nodes/inputs/f1099int/index.ts";
import {
  assertDistinct1099DIVCopies,
  inputSchema as divSchema,
} from "../../../nodes/inputs/f1099div/index.ts";
import type { Form8995Input } from "../../../nodes/intermediate/forms/form8995/index.ts";
import {
  ordinaryTax2025,
  qualifiedDividendTax2025,
} from "../../../nodes/intermediate/worksheets/tax_table_2025.ts";
import { FilingStatus } from "../../../nodes/types.ts";

/** Owned issued-copy replay for ordinary interest, dividends and capital distributions. */
export function assertMultiBusinessInvestmentSources(
  input: Form8995Input,
  pending: Record<string, Record<string, unknown>>,
) {
  const interest = pending.f1099int === undefined
    ? []
    : intSchema.parse(pending.f1099int).f1099ints;
  const dividends = pending.f1099div === undefined
    ? []
    : divSchema.parse(pending.f1099div).f1099divs;
  assertDistinct1099INTCopies(interest);
  assertDistinct1099DIVCopies(dividends);
  const same = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);
  if (
    !same(input.investment_interest_sources ?? [], interest) ||
    !same(input.investment_dividend_sources ?? [], dividends)
  ) {
    throw new Error(
      "Multi-business QBI investment copies differ from their retained graph sources",
    );
  }
  const owner = input.taxpayer_ssn?.replace(/\D/g, "");
  const references = [...interest, ...dividends].map((item) =>
    item.source_document_reference
  );
  const zero = (value: unknown) => value === undefined || value === 0;
  if (
    new Set(references).size !== references.length ||
    references.some((reference) => !reference) ||
    interest.some((item) =>
      !item.payer_name.trim() || !/^\d{2}-?\d{7}$/.test(item.payer_tin ?? "") ||
      !item.account_number || item.recipient_tin !== owner ||
      ![
        "box2",
        "box3",
        "box4",
        "box5",
        "box6",
        "box8",
        "box9",
        "box10",
        "box11",
        "box12",
        "box13",
        "box17",
        "nominee_interest",
        "accrued_interest_paid",
        "non_taxable_oid_adjustment",
        "foreign_source_interest_usd",
      ].every((key) => zero(item[key as keyof typeof item])) ||
      item.seller_financed === true ||
      item.elect_bond_premium_amortization === true
    ) ||
    dividends.some((item) =>
      !item.payerName?.trim() || !item.payerTin || !item.account_number ||
      item.recipient_tin !== owner || item.isNominee ||
      item.nominee_distribution || item.box11 ||
      (item.box1b ?? 0) > item.box1a ||
      ![
        "box2b",
        "box2c",
        "box2d",
        "box2e",
        "box2f",
        "box3",
        "box4",
        "box5",
        "box6",
        "box7",
        "box9",
        "box10",
        "box12",
        "box13",
        "box16",
        "foreign_source_dividends_usd",
        "foreign_source_qualified_dividends_usd",
      ].every((key) => zero(item[key as keyof typeof item])) ||
      ((item.box1b ?? 0) > 0 && (!item.qualified_dividend_filing_review ||
        item.qualified_dividend_filing_review
                .qualified_held_days_in_121_day_window +
              item.qualified_dividend_filing_review
                .diminished_risk_days_excluded > 121))
    )
  ) {
    throw new Error(
      "Multi-business QBI investment income needs owned identified copies and qualified dividend holding review",
    );
  }
  const totals = {
    interest: interest.reduce((sum, item) => sum + (item.box1 ?? 0), 0),
    ordinary: dividends.reduce((sum, item) => sum + item.box1a, 0),
    qualified: dividends.reduce((sum, item) => sum + (item.box1b ?? 0), 0),
    capital: dividends.reduce((sum, item) => sum + (item.box2a ?? 0), 0),
  };
  if (
    dividends.length > 0 &&
      !same(input.investment_dividend_totals, {
        ordinary: totals.ordinary,
        qualified: totals.qualified,
        capital_gain_distributions: totals.capital,
      }) ||
    dividends.length === 0 && input.investment_dividend_totals !== undefined
  ) {
    throw new Error(
      "Multi-business QBI dividend totals differ from owned copies",
    );
  }
  const scheduleB = pending.schedule_b;
  if (interest.length > 0 || dividends.length > 0) {
    const expectedInterest = interest.map((item) => ({
      payerName: item.payer_name,
      amount: item.box1 ?? 0,
    }));
    const expectedDividends = dividends.map((item) => ({
      payerName: item.payerName,
      amount: item.box1a,
    }));
    if (
      !scheduleB || !same(scheduleB.interest_rows ?? [], expectedInterest) ||
      !same(scheduleB.dividend_rows ?? [], expectedDividends) ||
      (scheduleB.print_line4_total ?? 0) !== totals.interest ||
      (scheduleB.print_line6_total ?? 0) !== totals.ordinary
    ) {
      throw new Error(
        "Multi-business QBI Schedule B payer rows do not reconcile to investment copies",
      );
    }
  }
  const d = pending.schedule_d;
  if (
    totals.capital > 0
      ? !d || d.line13_cap_gain_distrib !== totals.capital ||
        Object.keys(d).some((key) =>
          ![
            "line13_cap_gain_distrib",
            "filing_status",
            "taxable_income",
            "income_tax",
            "qualified_dividends",
          ].includes(key)
        )
      : d && Object.keys(d).some((key) => key !== "filing_status")
  ) {
    throw new Error(
      "Multi-business QBI capital gain needs only its issued capital-gain distributions",
    );
  }
  return {
    ...totals,
    filedQbiCapitalLimit: Math.round(totals.qualified) +
      Math.round(totals.capital),
  };
}

/** Recompute the ordinary or QDCGT worksheet from the final return and owned copies. */
export function assertMultiBusinessInvestmentTax(
  pending: Record<string, Record<string, unknown>>,
  totals: { qualified: number; capital: number },
) {
  const f1040 = pending.f1040;
  const taxable = f1040.line15_taxable_income as number;
  const expected = totals.qualified > 0 || totals.capital > 0
    ? qualifiedDividendTax2025(
      taxable,
      totals.qualified,
      totals.capital,
      FilingStatus.Single,
    )
    : ordinaryTax2025(taxable, FilingStatus.Single);
  const worksheet = pending.income_tax_calculation;
  const sum = (value: unknown): number =>
    value === undefined
      ? 0
      : Array.isArray(value)
      ? value.reduce((total, item) => total + Number(item), 0)
      : Number(value);
  if (
    !worksheet || worksheet.taxable_income !== taxable ||
    sum(worksheet.qualified_dividends) !== totals.qualified ||
    sum(worksheet.net_capital_gain) !== totals.capital ||
    f1040.line16_income_tax !== expected
  ) {
    throw new Error(
      "Multi-business QBI preferential tax worksheet differs from owned investment income and final taxable income",
    );
  }
}
