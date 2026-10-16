import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import { CONFIG_BY_YEAR } from "../../nodes/config/index.ts";
import { f1099div } from "../../nodes/inputs/income/investments/f1099div/index.ts";
import { form8960 } from "../../nodes/intermediate/forms/taxes/investments/form8960/index.ts";
import {
  divItem2026Schema,
  intItem2026Schema,
  investmentSum,
  reconcileDividends2026,
  reconcileInterest2026,
} from "./investment-source.ts";
import { calculateInvestmentIncome2026 } from "./investment-income.ts";
import {
  investmentDisclosures,
  investmentOwner,
  syntheticDividend2026,
  syntheticInterest2026,
  syntheticPabDividendReview2026,
  syntheticPabReview2026,
  syntheticPremiumReview2026,
} from "./investment.fixture.ts";
const ctx = { taxYear: 2026, formType: "f1040" };
const workpaper = (
  f1099ints = [syntheticInterest2026()],
  f1099divs = [syntheticDividend2026()],
) =>
  calculateInvestmentIncome2026({
    ...investmentOwner,
    ...investmentDisclosures,
    f1099ints,
    f1099divs,
  });

Deno.test("2026 investment workpaper reuses source and Schedule B arithmetic without double routing", () => {
  const result = workpaper();
  assertEquals(result.lines, {
    line2a: 0,
    line2b: 1200,
    line3a: 500,
    line3b: 800,
    capital_gain_distributions: 0,
    investment_withholding: 0,
    early_withdrawal_penalty: 0,
    amt_pab_interest: 0,
  });
  assertEquals(result.schedule_b.required, false); // Each category, not their sum.
  const interest = syntheticInterest2026();
  interest.box1 = 1600.25;
  const above = workpaper([interest]);
  assertEquals(above.schedule_b.required, true);
  assertEquals(above.schedule_b.workpaper?.print_line6_total, 800.25);
  assertEquals(above.lines.line3b, 800); // dividend_info is already routed.
});

Deno.test("2026 Schedule B tests raw cents at the separate $1500 thresholds", () => {
  for (const value of [1499.99, 1500, 1500.01]) {
    const interest = { ...syntheticInterest2026(), box1: value };
    const div = { ...syntheticDividend2026(), box1a: value };
    assertEquals(workpaper([interest], []).schedule_b.required, value > 1500);
    const result = workpaper([], [div]);
    assertEquals(result.schedule_b.required, value > 1500);
    assertEquals(result.cents.ordinary_dividends, value);
  }
});

Deno.test("2026 sum cents across payers and across INT/DIV before return rounding", () => {
  const first = {
    ...syntheticInterest2026(),
    box1: 0.25,
    box4: 0.25,
    box8: 0.25,
    box2: 0.25,
  };
  const second = {
    ...first,
    account_number: "second",
    source_document_reference: "second",
  };
  const div = {
    ...syntheticDividend2026(),
    box4: 0.25,
    box12: 0.25,
    box2a: 12.50,
  };
  const result = workpaper([first, second], [div]);
  assertEquals(result.lines.line2b, 1);
  assertEquals(result.lines.line2a, 1);
  assertEquals(result.lines.investment_withholding, 1);
  assertEquals(result.lines.early_withdrawal_penalty, 1);
  assertEquals(result.lines.capital_gain_distributions, 13);
  assertEquals(result.cents.capital_gain_distributions, 12.50);
});

Deno.test("2026 copies are owned and duplicates/corrections cannot multiply income", () => {
  const int = syntheticInterest2026(), div = syntheticDividend2026();
  assertThrows(() =>
    workpaper([int, { ...int, source_document_reference: "corrected" }])
  );
  assertThrows(() =>
    workpaper([], [div, { ...div, source_document_reference: "corrected" }])
  );
  assertThrows(() => workpaper([{ ...int, recipient_tin: "999999999" }]));
  const joint = {
    ...investmentOwner,
    filing_status: FilingStatus.MFJ,
    spouse_ssn: "987-65-4321",
  };
  assertEquals(
    reconcileInterest2026([{ ...int, recipient_tin: "987654321" }], joint)
      .sources.length,
    1,
  );
  assertThrows(() =>
    reconcileInterest2026([int], {
      ...investmentOwner,
      filing_status: FilingStatus.MFJ,
    })
  );
  assertThrows(() =>
    reconcileInterest2026([int], {
      ...joint,
      spouse_ssn: investmentOwner.taxpayer_ssn,
    })
  );
  assertThrows(() =>
    reconcileDividends2026([{ ...div, recipient_tin: "987654321" }], {
      ...joint,
      filing_status: FilingStatus.MFS,
    })
  );
});

Deno.test("2026 interest premium elections honor gross/net reporting for each box", () => {
  const int = {
    ...syntheticInterest2026(),
    box1: 1000,
    box3: 500,
    box11: 100,
    box12: 50,
    premium_review: syntheticPremiumReview2026(),
  };
  assertEquals(workpaper([int], []).cents.taxable_interest, 1350);
  assertEquals(
    workpaper([{
      ...int,
      premium_review: {
        ...int.premium_review,
        box1_reporting: "net",
        box3_reporting: "net",
      },
    }], []).cents.taxable_interest,
    1500,
  );
  assertEquals(
    workpaper([{
      ...int,
      premium_review: {
        ...int.premium_review,
        taxable_amortization_elected: false,
      },
    }], []).cents.taxable_interest,
    1500,
  );
  assertThrows(
    () => workpaper([{ ...int, premium_review: undefined }], []),
    Error,
    "reporting and election",
  );
  assertThrows(
    () =>
      workpaper([{
        ...int,
        premium_review: {
          ...int.premium_review,
          taxable_amortization_elected: false,
          box1_reporting: "net",
        },
      }], []),
    Error,
    "gross interest",
  );
  assertThrows(
    () => workpaper([{ ...int, box12: 501 }], []),
    Error,
    "matching interest box",
  );
});

Deno.test("2026 PAB premiums reconcile both PAB and non-PAB portions", () => {
  const int = {
    ...syntheticInterest2026(),
    box8: 1000,
    box9: 600,
    box13: 200,
    premium_review: {
      ...syntheticPremiumReview2026(),
      pab_share_of_box13: 150,
    },
    pab_review: syntheticPabReview2026(),
  };
  assertEquals(workpaper([int], []).lines.line2a, 800);
  assertEquals(workpaper([int], []).lines.amt_pab_interest, 450);
  const net = {
    ...int,
    box8: 800,
    box9: 450,
    premium_review: { ...int.premium_review, box8_reporting: "net" as const },
  };
  assertEquals(workpaper([net], []).lines.line2a, 800);
  assertEquals(workpaper([net], []).lines.amt_pab_interest, 450);
  assertThrows(() => workpaper([{ ...int, pab_review: undefined }], []));
  assertThrows(() => workpaper([{ ...int, box9: 1100 }], []));
  assertThrows(() => workpaper([{ ...int, box9: 1000 }], []), Error, "Non-PAB");
  assertThrows(() =>
    workpaper([{
      ...int,
      premium_review: { ...int.premium_review, pab_share_of_box13: 201 },
    }], [])
  );
});

Deno.test("2026 net PAB reporting retains a premium larger than the remaining net interest", () => {
  const int = {
    ...syntheticInterest2026(),
    box8: 10,
    box9: 10,
    box13: 90,
    premium_review: {
      ...syntheticPremiumReview2026(),
      box8_reporting: "net" as const,
      pab_share_of_box13: 90,
    },
    pab_review: syntheticPabReview2026(),
  };
  const result = workpaper([int], []);
  assertEquals(result.lines.line2a, 10);
  assertEquals(result.lines.amt_pab_interest, 10);
  assertEquals(result.source_input.f1099ints[0].box13, 90);
  assertEquals(result.interest!.normalized[0].box13, 0);
  const cents = {
    ...int,
    box8: 0.5,
    box9: 0.4,
    box13: 0.4,
    premium_review: {
      ...int.premium_review,
      box8_reporting: "gross" as const,
      pab_share_of_box13: 0.3,
    },
  };
  assertEquals(workpaper([cents], []).cents.pab_interest, 0.1);
});

Deno.test("2026 PAB dividend source review retained and AMT combines cents", () => {
  const int = {
    ...syntheticInterest2026(),
    box8: 100,
    box9: 10.25,
    pab_review: syntheticPabReview2026(),
  };
  const div = {
    ...syntheticDividend2026(),
    box12: 100,
    box13: 10.25,
    pab_dividend_review: syntheticPabDividendReview2026(),
  };
  assertEquals(workpaper([int], [div]).lines.amt_pab_interest, 21);
  assertThrows(() => workpaper([], [{ ...div, box13: 101 }]));
  assertThrows(() =>
    workpaper([], [{ ...div, pab_dividend_review: undefined }])
  );
  assertThrows(() =>
    workpaper([], [{
      ...div,
      pab_dividend_review: {
        ...div.pab_dividend_review,
        reviewed_on: "2026-02-30",
      },
    }])
  );
});

Deno.test("2026 nominee/accrued/market discount records reconcile and cannot be replayed", () => {
  const int = {
    ...syntheticInterest2026(),
    box1: 1000,
    box10: 100,
    market_discount_review: {
      current_inclusion_election_applies: true as const,
      election_record_reference: "market-election",
    },
    accrued_interest_purchases: [{
      purchase_date: "2026-02-01",
      settlement_reference: "purchase",
      amount: 50,
    }],
  };
  assertEquals(workpaper([int], []).cents.taxable_interest, 1050);
  assertThrows(() =>
    workpaper([{ ...int, market_discount_review: undefined }], [])
  );
  const second = {
    ...int,
    source_document_reference: "int2",
    account_number: "account2",
  };
  assertThrows(
    () => workpaper([int, second], []),
    Error,
    "distinct 2026 settlement",
  );
  const nominee = {
    ...syntheticInterest2026(),
    nominee_allocations: [{
      owner_tin: "999999999",
      amount: 200,
      source_record_reference: "nominee",
    }],
  };
  assertEquals(workpaper([nominee], []).cents.taxable_interest, 1000.25);
  assertEquals(workpaper([nominee], []).schedule_b.required, true);
  assertThrows(() => workpaper([{ ...nominee, box4: 10 }], []));
  assertThrows(() =>
    workpaper([{
      ...nominee,
      nominee_allocations: [{
        ...nominee.nominee_allocations[0],
        owner_tin: investmentOwner.taxpayer_ssn,
      }],
    }], [])
  );
});

Deno.test("2026 qualified lots count acquisition exclusion, disposal inclusion and exact windows", () => {
  const div = syntheticDividend2026();
  const lot = div.qualified_distribution_lots![0];
  for (
    const [end, expectedDays, expectedQualified] of [["2026-05-31", 0, -1], [
      "2026-06-01",
      60,
      0,
    ], ["2026-06-02", 61, 500.25]] as const
  ) {
    const input = {
      ...div,
      qualified_distribution_lots: [{
        ...lot,
        acquisition_date: "2026-04-02",
        disposition_date: end,
      }],
    };
    if (expectedQualified < 0) {
      assertThrows(() => workpaper([], [input]));
      continue;
    }
    const result = workpaper([], [input]);
    assertEquals(result.dividends!.lots[0].qualified_days, expectedDays);
    assertEquals(result.cents.qualified_dividends, expectedQualified);
    assertEquals(result.cents.ordinary_dividends, div.box1a);
  }
});

Deno.test("2026 diminished-risk days, preferred 181-day window and issuer status", () => {
  const div = syntheticDividend2026(),
    lot = div.qualified_distribution_lots![0];
  const result = workpaper([], [{
    ...div,
    qualified_distribution_lots: [{
      ...lot,
      preferred_dividend_period_over_366_days: true,
      acquisition_date: "2026-03-03",
      disposition_date: "2026-06-01",
    }],
  }]);
  assertEquals(result.dividends!.lots[0].qualified_days, 90);
  assertEquals(result.cents.qualified_dividends, 0);
  const preferred = workpaper([], [{
    ...div,
    qualified_distribution_lots: [{
      ...lot,
      preferred_dividend_period_over_366_days: true,
      acquisition_date: "2026-03-02",
      disposition_date: "2026-06-01",
    }],
  }]);
  assertEquals(preferred.dividends!.lots[0].qualified_days, 91);
  assertEquals(preferred.cents.qualified_dividends, 500.25);
  const risk = { from: "2026-04-02", through: "2026-06-01" };
  assertEquals(
    workpaper([], [{
      ...div,
      qualified_distribution_lots: [{
        ...lot,
        diminished_risk_periods: [risk],
      }],
    }]).cents.qualified_dividends,
    0,
  );
  assertThrows(() =>
    workpaper([], [{
      ...div,
      qualified_distribution_lots: [{
        ...lot,
        diminished_risk_periods: [risk, risk],
      }],
    }])
  );
  for (
    const change of [{ eligible_issuer_and_no_disqualified_dividend: false }, {
      related_payment_obligation: true,
    }]
  ) {
    assertEquals(
      workpaper([], [{
        ...div,
        qualified_distribution_lots: [{ ...lot, ...change }],
      }]).cents.qualified_dividends,
      0,
    );
  }
});

Deno.test("2026 dividend reconciliation rejects missing, incomplete and impossible records", () => {
  const div = syntheticDividend2026(),
    lot = div.qualified_distribution_lots![0];
  for (
    const change of [
      { qualified_distribution_lots: undefined },
      { box1b: 900 },
      { qualified_distribution_lots: [lot, lot] },
      {
        qualified_distribution_lots: [{
          ...lot,
          ex_dividend_date: "2025-06-01",
        }],
      },
      {
        qualified_distribution_lots: [{
          ...lot,
          acquisition_date: "2026-06-01",
        }],
      },
      {
        qualified_distribution_lots: [{
          ...lot,
          held_through: "2026-06-01",
          acquisition_date: "2026-04-02",
        }],
      },
    ]
  ) assertThrows(() => workpaper([], [{ ...div, ...change }]));
  const completeAfterYear = {
    ...div,
    qualified_distribution_lots: [{
      ...lot,
      ex_dividend_date: "2026-12-31",
      acquisition_date: "2026-12-01",
      held_through: "2027-03-01",
    }],
  };
  assertEquals(
    workpaper([], [completeAfterYear]).cents.qualified_dividends,
    500.25,
  );
});

Deno.test("2026 state withholding retains source facts and requires state identifiers", () => {
  const int = {
    ...syntheticInterest2026(),
    box17: 12.34,
    box15: "CA",
    box16: "CA-payer",
  };
  const div = {
    ...syntheticDividend2026(),
    box16: 23.45,
    box14: "CA",
    box15: "CA-payer",
  };
  assertEquals(workpaper([int], [div]).cents.state_withholding, 35.79);
  assertThrows(() => workpaper([{ ...int, box15: undefined }], []));
  assertThrows(() => workpaper([], [{ ...div, box15: undefined }]));
});

Deno.test("2026 source contract rejects unsupported boxes, legacy overrides and fractional cents", () => {
  for (
    const change of [{ box6: 1 }, { box5: 1 }, { tax_year: 2025 }, {
      elect_bond_premium_amortization: true,
    }, { nominee_interest: 10 }]
  ) {
    assertEquals(
      intItem2026Schema.safeParse({ ...syntheticInterest2026(), ...change })
        .success,
      false,
    );
  }
  for (
    const change of [
      { box7: 1 },
      { box5: 1 },
      { box3: 1 },
      { box2b: 1 },
      { box9: 1 },
      { isNominee: true },
      { holdingPeriodDays: 100 },
    ]
  ) {
    assertEquals(
      divItem2026Schema.safeParse({ ...syntheticDividend2026(), ...change })
        .success,
      false,
    );
  }
  assertThrows(() =>
    workpaper([{ ...syntheticInterest2026(), box1: 1.001 }], [])
  );
  assertThrows(() => workpaper([], []));
  assertThrows(() =>
    calculateInvestmentIncome2026({
      ...investmentOwner,
      ...investmentDisclosures,
      f1099ints: [syntheticInterest2026()],
      foreign_accounts_question: true as never,
    })
  );
  assertThrows(() =>
    investmentSum([
      Number.MAX_SAFE_INTEGER / 100,
      Number.MAX_SAFE_INTEGER / 100,
    ])
  );
});

Deno.test("shared dividend explicit configuration preserves the 2025 entry point", () => {
  const input = {
    f1099divs: [{
      payerName: "synthetic",
      isNominee: false,
      box11: false,
      box1a: 1501,
      box1b: 500,
      box2a: 100,
    }],
  };
  const context2025 = { ...ctx, taxYear: 2025 };
  assertEquals(
    f1099div.compute(context2025, input),
    f1099div.computeWithConfig(context2025, input, CONFIG_BY_YEAR[2025]!),
  );
  const result = f1099div.computeWithConfig(ctx, input, {
    scheduleBDividendThreshold: 2000,
    sec199aSingleThreshold: 201750,
    sec199aMfjThreshold: 403500,
  });
  assertEquals(
    result.outputs.some((o) =>
      o.nodeType === "f1040" && o.fields.line3b_ordinary_dividends === 1501
    ),
    true,
  );
});

Deno.test("shared NIIT explicit configuration preserves 2025 and accepts independent year settings", () => {
  const input = {
    filing_status: FilingStatus.Single,
    magi: 210000,
    line1_taxable_interest: 5000,
    line2_ordinary_dividends: [2000, 3000],
    line10_additional_modifications: 1000,
  };
  const context2025 = { ...ctx, taxYear: 2025 };
  assertEquals(
    form8960.compute(context2025, input),
    form8960.computeWithConfig(context2025, input, CONFIG_BY_YEAR[2025]!),
  );
  const result = form8960.computeWithConfig(ctx, input, {
    niitThresholdOther: 200000,
    niitThresholdMfj: 250000,
    niitThresholdMfs: 125000,
  });
  assertEquals(
    result.outputs.find((o) => o.nodeType === "form8960")?.fields.line17_niit,
    342,
  );
});
