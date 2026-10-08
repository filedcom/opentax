import {
  inputSchema as scheduleDSchema,
  schedule_d,
} from "../../../../../nodes/intermediate/aggregation/schedule_d/index.ts";
import { f1099b } from "../../../../../nodes/inputs/f1099b/index.ts";
import { qbiCapitalTotal } from "../../../../../nodes/intermediate/forms/qbi-capital-sources.ts";
import {
  assertDistinct1099INTCopies,
  inputSchema as intSchema,
} from "../../../../../nodes/inputs/f1099int/index.ts";
import {
  assertDistinct1099DIVCopies,
  inputSchema as divSchema,
} from "../../../../../nodes/inputs/f1099div/index.ts";
import type { Form8995Input } from "../../../../../nodes/intermediate/forms/form8995/index.ts";
import {
  ordinaryTax2025,
  qualifiedDividendTax2025,
} from "../../../../../nodes/intermediate/worksheets/tax_table_2025.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";

/** Owned issued-copy replay for ordinary interest, dividends and capital distributions. */
export function assertMultiBusinessInvestmentSources(
  input: Pick<
    Form8995Input,
    | "investment_interest_sources"
    | "investment_dividend_sources"
    | "investment_dividend_totals"
    | "taxpayer_ssn"
    | "qbi_capital_sources"
    | "net_capital_gain"
  >,
  pending: Record<string, Record<string, unknown>>,
  enteredTotal = false,
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
  if (
    (pending.f1040?.line2b_taxable_interest ?? 0) !== totals.interest ||
    (pending.f1040?.line3a_qualified_dividends ?? 0) !== totals.qualified ||
    (pending.f1040?.line3b_ordinary_dividends ?? 0) !== totals.ordinary
  ) {
    throw new Error("QBI Form 1040 investment lines differ from owned copies");
  }
  const d = pending.schedule_d;
  let capitalGain = totals.capital;
  if (pending.f1099b !== undefined) {
    const brokerInput = f1099b.inputSchema.parse(pending.f1099b);
    const brokerRows = brokerInput.f1099bs;
    if (
      new Set(brokerRows.map((row) => row.transaction_id)).size !==
        brokerRows.length ||
      brokerRows.some((row) =>
        row.recipient_ssn !== owner || !row.payer_tin ||
        !row.source_document_reference || !row.transaction_id ||
        row.box3_transaction_type ||
        row.adjustment_codes || row.adjustment_amount ||
        row.box1f_accrued_market_discount ||
        row.box1g_wash_sale_loss_disallowed || row.federal_withheld
      )
    ) {
      throw new Error(
        "QBI broker capital sources need owned identified ordinary sales without special-rate or interest adjustments",
      );
    }
    const broker = f1099b.compute(
      { taxYear: 2025, formType: "f1040" },
      brokerInput,
    );
    const expectedSales = broker.outputs.filter((row) =>
      row.nodeType === "form8949"
    ).map((row) => row.fields.transaction);
    const actualSales = d?.transaction === undefined
      ? []
      : Array.isArray(d.transaction)
      ? d.transaction
      : [d.transaction];
    if (!same(expectedSales, actualSales)) {
      throw new Error(
        "QBI Schedule D sales differ from retained broker copies",
      );
    }
  } else if (d?.transaction !== undefined) {
    throw new Error("QBI actual Schedule D sales need retained broker copies");
  }
  if (d !== undefined) {
    const parsedD = scheduleDSchema.parse(d);
    // Final Schedule D retains direct-sale aggregates alongside its transaction rows.
    // Replay the owned transactions once, then compare those aggregate lines below.
    for (
      const key of [
        "line_1a_proceeds",
        "line_1a_cost",
        "line_8a_proceeds",
        "line_8a_cost",
      ] as const
    ) delete parsedD[key];
    if (
      Object.keys(parsedD).some((key) =>
        !["transaction", "line13_cap_gain_distrib", "filing_status"].includes(
          key,
        )
      ) ||
      (parsedD.line13_cap_gain_distrib ?? 0) !== totals.capital
    ) {
      throw new Error(
        `QBI capital sources need owned distributions and broker sales without other Schedule D sources (${
          Object.keys(parsedD).join(", ")
        }; distributions ${
          parsedD.line13_cap_gain_distrib ?? 0
        } vs ${totals.capital})`,
      );
    }
    const replay = schedule_d.compute(
      { taxYear: 2025, formType: "f1040" },
      parsedD,
    );
    const output = replay.outputs.find((row) => row.nodeType === "form8995");
    capitalGain = output?.fields.net_capital_gain as number ?? 0;
    const filed = replay.outputs.find((row) => row.nodeType === "f1040");
    if (
      filed !== undefined &&
      Object.entries(filed.fields).some(([key, value]) =>
        pending.f1040?.[key] !== value
      )
    ) {
      throw new Error(
        "QBI capital gain differs from replayed Schedule D and Form 1040",
      );
    }
    const finalized = replay.outputs.find((row) =>
      row.nodeType === "schedule_d"
    );
    if (
      finalized &&
      Object.entries(finalized.fields).some(([key, value]) =>
        !same(d[key], value)
      )
    ) {
      throw new Error(
        "QBI Schedule D computed totals differ from source replay",
      );
    }
  } else if (totals.capital !== 0) {
    throw new Error("QBI capital distributions need retained Schedule D input");
  }
  const expectedSources = [
    ...(totals.qualified > 0
      ? [{ source: "f1099div.qualified_dividends", amount: totals.qualified }]
      : []),
    ...(capitalGain > 0
      ? [{ source: "schedule_d.net_capital_gain", amount: capitalGain }]
      : []),
  ].sort((a, b) => a.source.localeCompare(b.source));
  const actualSources = [...(input.qbi_capital_sources ?? [])].sort((a, b) =>
    a.source.localeCompare(b.source)
  );
  if (
    !same(expectedSources, actualSources) ||
    (expectedSources.length > 0 &&
      typeof input.net_capital_gain !== "number") ||
    (input.net_capital_gain !== undefined &&
      input.net_capital_gain !== qbiCapitalTotal(input, enteredTotal))
  ) {
    throw new Error(
      "QBI capital contribution identities or totals differ from retained sources",
    );
  }
  return {
    ...totals,
    capitalGain,
    returnCapital: pending.f1099b === undefined
      ? totals.capital
      : Number(pending.f1040?.line7_capital_gain ?? 0),
    filedQbiCapitalLimit: Math.round(totals.qualified) +
      Math.round(capitalGain),
  };
}

/** Recompute the ordinary or QDCGT worksheet from the final return and owned copies. */
export function assertMultiBusinessInvestmentTax(
  pending: Record<string, Record<string, unknown>>,
  totals: { qualified: number; capital: number; capitalGain?: number },
) {
  const f1040 = pending.f1040;
  const taxable = f1040.line15_taxable_income as number;
  const capital = totals.capitalGain ?? totals.capital;
  const expected = totals.qualified > 0 || capital > 0
    ? qualifiedDividendTax2025(
      taxable,
      totals.qualified,
      capital,
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
    sum(worksheet.net_capital_gain) !== capital ||
    f1040.line16_income_tax !== expected
  ) {
    throw new Error(
      "Multi-business QBI preferential tax worksheet differs from owned investment income and final taxable income",
    );
  }
}
