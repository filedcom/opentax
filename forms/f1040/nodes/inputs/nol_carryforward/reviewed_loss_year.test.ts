import { assertEquals, assertThrows } from "@std/assert";
import { calculateReviewedLossYear } from "./reviewed_loss_year.ts";

function item(item_id: string, amount: number, business: boolean) {
  return {
    item_id,
    reference: `review:${item_id}`,
    owner_ssn: "111223333",
    business,
    amount,
  };
}
function fixture() {
  return {
    tax_year: 2024,
    taxpayer_ssn: "111223333",
    reference: "loss-year-workpaper",
    filing_status: "single",
    reviewed_form1040: {
      reference: "reviewed-return-2024",
      tax_year: 2024,
      taxpayer_ssn: "111223333",
      filing_status: "single",
      line11_agi: -50_000,
      line12_standard_or_itemized_deduction: 14_600,
    },
    limitations_review: {
      reference: "allowed-loss-review",
      at_risk_and_passive_limits_applied: true,
      excess_business_loss_limit_applied: true,
    },
    noncapital_income: [item("business-receipts", 10_000, true)],
    noncapital_deductions: [
      { ...item("business-expenses", 60_000, true), location: "agi" },
      { ...item("standard-deduction", 14_600, false), location: "line12" },
    ],
    capital_gains:
      [] as (ReturnType<typeof item> & { section1202_excluded: number })[],
    capital_losses: [] as ReturnType<typeof item>[],
    prior_nol_deductions: [] as {
      item_id: string;
      reference: string;
      owner_ssn: string;
      amount: number;
    }[],
  };
}

Deno.test("Form 172 source inventory agrees with the existing simple 2024 business-loss review", () => {
  const result = calculateReviewedLossYear(fixture());
  assertEquals(result.lines[1], -64_600);
  assertEquals(result.lines[6], 14_600);
  assertEquals(result.lines[9], 14_600);
  assertEquals(result.lines[24], -50_000);
  assertEquals(result.regularNol, 50_000);
  assertEquals(result.lines[16], undefined);
  assertEquals(result.priorAcceptanceVerified, false);
  assertEquals(result.carryAvailabilityVerified, false);
  assertEquals(result.amtNolReconciled, false);
  assertEquals(result.filingReady, false);
});

Deno.test("Form 172 wages offset business loss while interest and IRA deductions receive nonbusiness treatment", () => {
  const v = fixture();
  v.noncapital_income.push(
    item("wages", 20_000, true),
    item("interest", 3000, false),
  );
  v.noncapital_deductions.push(
    { ...item("ira", 2000, false), location: "agi" },
    { ...item("se-tax-deduction", 3000, true), location: "agi" },
  );
  v.reviewed_form1040.line11_agi = -32_000;
  const result = calculateReviewedLossYear(v);
  assertEquals(result.lines[1], -46_600);
  assertEquals(result.lines[6], 16_600);
  assertEquals(result.lines[7], 3000);
  assertEquals(result.lines[9], 13_600);
  assertEquals(result.regularNol, 33_000);
});

Deno.test("Form 172 removes nonbusiness capital loss deductions using the MFS limit", () => {
  for (
    const [status, limit] of [["single", 3000], [
      "married_filing_separately",
      1500,
    ]] as const
  ) {
    const v = fixture();
    v.filing_status = status;
    v.reviewed_form1040.filing_status = status;
    v.capital_losses.push(item("investment-loss", 5000, false));
    v.reviewed_form1040.line11_agi = -50_000 - limit;
    const result = calculateReviewedLossYear(v);
    assertEquals(result.lines[16], 5000);
    assertEquals(result.lines[19], limit);
    assertEquals(result.lines[20], 5000 - limit);
    assertEquals(result.lines[22], limit);
    assertEquals(result.regularNol, 50_000);
  }
});

Deno.test("Form 172 full business/nonbusiness capital inventory reconciles a mixed gain/loss return", () => {
  const v = fixture();
  v.capital_gains.push({
    ...item("investment-gain", 10_000, false),
    section1202_excluded: 0,
  });
  v.capital_losses.push(item("business-capital-loss", 7000, true));
  v.reviewed_form1040.line11_agi = -47_000;
  const result = calculateReviewedLossYear(v);
  assertEquals(result.lines[3], 10_000);
  assertEquals(result.lines[9], 4600);
  assertEquals(result.lines[10], 0);
  assertEquals(result.lines[14], 7000);
  assertEquals(result.lines[22], 7000);
  assertEquals(result.regularNol, 50_000);
});

Deno.test("Form 172 restores section 1202 even when Schedule D has no loss", () => {
  const v = fixture();
  v.capital_gains.push({
    ...item("qsbs", 10_000, false),
    section1202_excluded: 10_000,
  });
  const result = calculateReviewedLossYear(v);
  assertEquals(result.lines[3], 10_000);
  assertEquals(result.lines[9], 4600);
  assertEquals(result.lines[16], 0);
  assertEquals(result.lines[17], 10_000);
  assertEquals(result.lines[19], 0);
  assertEquals(result.regularNol, 50_000);
});

Deno.test("Form 172 section 1202 and Schedule D loss interact on lines 18 through 22", () => {
  const v = fixture();
  v.capital_gains.push({
    ...item("qsbs", 20_000, false),
    section1202_excluded: 10_000,
  });
  v.capital_losses.push(item("business-loss", 25_000, true));
  v.reviewed_form1040.line11_agi = -53_000;
  const result = calculateReviewedLossYear(v);
  assertEquals(result.lines[10], 5400);
  assertEquals(result.lines[15], 19_600);
  assertEquals(result.lines[16], 15_000);
  assertEquals(result.lines[18], 5000);
  assertEquals(result.lines[20], 2000);
  assertEquals(result.lines[22], 17_600);
  assertEquals(result.regularNol, 40_000);
});

Deno.test("Form 172 prior NOL deductions do not create a second origin loss", () => {
  const v = fixture();
  v.prior_nol_deductions.push({
    item_id: "old-nol",
    reference: "old-nol-review",
    owner_ssn: v.taxpayer_ssn,
    amount: 20_000,
  });
  v.reviewed_form1040.line11_agi = -70_000;
  const result = calculateReviewedLossYear(v);
  assertEquals(result.lines[23], 20_000);
  assertEquals(result.regularNol, 50_000);
});

Deno.test("Form 172 joint source inventory includes distinct spouse without claiming allocation", () => {
  const v = {
    ...fixture(),
    filing_status: "married_filing_jointly",
    spouse_ssn: "999887777",
  };
  v.reviewed_form1040 = {
    ...v.reviewed_form1040,
    filing_status: "married_filing_jointly",
  };
  v.noncapital_income.push({
    ...item("spouse-wages", 15_000, true),
    owner_ssn: v.spouse_ssn,
  });
  v.noncapital_deductions[1].amount = 29_200;
  v.reviewed_form1040.line11_agi = -35_000;
  v.reviewed_form1040.line12_standard_or_itemized_deduction = 29_200;
  const result = calculateReviewedLossYear({
    ...v,
    reviewed_form1040: { ...v.reviewed_form1040, spouse_ssn: v.spouse_ssn },
  });
  assertEquals(result.regularNol, 35_000);
  assertEquals(result.spouseSsn, "999887777");
  assertEquals(result.carryAvailabilityVerified, false);
});

Deno.test("Form 172 positive income produces no NOL and cannot be imported as carry", () => {
  const v = fixture();
  v.noncapital_income[0].amount = 80_000;
  v.reviewed_form1040.line11_agi = 20_000;
  const result = calculateReviewedLossYear(v);
  assertEquals(result.lines[24], 0);
  assertEquals(result.regularNol, 0);
  assertEquals(result.carryAvailabilityVerified, false);
});

Deno.test("Form 172 rejects unreconciled return, duplicate sources, wrong owners and invalid exclusions", () => {
  const original = fixture();
  const inputs = [
    {
      ...original,
      reviewed_form1040: { ...original.reviewed_form1040, tax_year: 2023 },
    },
    {
      ...original,
      reviewed_form1040: {
        ...original.reviewed_form1040,
        taxpayer_ssn: "999887777",
      },
    },
    {
      ...original,
      reviewed_form1040: {
        ...original.reviewed_form1040,
        filing_status: "head_of_household",
      },
    },
    {
      ...original,
      reviewed_form1040: { ...original.reviewed_form1040, line11_agi: -49_999 },
    },
    {
      ...original,
      reviewed_form1040: {
        ...original.reviewed_form1040,
        line12_standard_or_itemized_deduction: 14_599,
      },
    },
    {
      ...original,
      noncapital_income: [{ ...original.noncapital_income[0], amount: 10_001 }],
    },
    {
      ...original,
      noncapital_income: [{
        ...original.noncapital_income[0],
        owner_ssn: "999887777",
      }],
    },
    { ...original, capital_losses: [item("business-receipts", 0, false)] },
    {
      ...original,
      capital_gains: [{
        ...item("qsbs", 1000, false),
        section1202_excluded: 1001,
      }],
    },
    { ...original, filing_status: "married_filing_jointly" },
    {
      ...original,
      filing_status: "married_filing_jointly",
      spouse_ssn: original.taxpayer_ssn,
    },
    { ...original, spouse_ssn: "999887777" },
    { ...original, reference: original.reviewed_form1040.reference },
    {
      ...original,
      limitations_review: {
        ...original.limitations_review,
        at_risk_and_passive_limits_applied: false,
      },
    },
    { ...original, tax_year: 2017 },
    {
      ...original,
      noncapital_income: [{
        ...original.noncapital_income[0],
        amount: 10_000.5,
      }],
    },
    { ...original, current_year_taxable_income: 100_000 },
    { ...original, filingReady: true },
  ];
  for (const altered of inputs) {
    assertThrows(() => calculateReviewedLossYear(altered));
  }
});

Deno.test("Form 172 reviewed copy reconciles every calculated Part I amount, including skipped zeros", () => {
  const v = fixture();
  const lines = {
    "1": -64_600,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
    "6": 14_600,
    "7": 0,
    "8": 0,
    "9": 14_600,
    "10": 0,
    "11": 0,
    "12": 0,
    "13": 0,
    "14": 0,
    "15": 0,
    "22": 0,
    "23": 0,
    "24": -50_000,
  };
  const copy = {
    reference: "reviewed-form172-2024",
    tax_year: 2024,
    taxpayer_ssn: v.taxpayer_ssn,
    lines,
  };
  assertEquals(
    calculateReviewedLossYear({ ...v, reviewed_form172: copy })
      .reviewedForm172AmountsReconciled,
    true,
  );
  assertEquals(
    calculateReviewedLossYear({
      ...v,
      reviewed_form172: {
        ...copy,
        lines: {
          ...lines,
          "16": 0,
          "17": 0,
          "18": 0,
          "19": 0,
          "20": 0,
          "21": 0,
        },
      },
    }).regularNol,
    50_000,
  );
  assertEquals(
    calculateReviewedLossYear(v).reviewedForm172AmountsReconciled,
    false,
  );
  for (
    const altered of [
      { ...copy, tax_year: 2023 },
      { ...copy, taxpayer_ssn: "999887777" },
      { ...copy, reference: v.reviewed_form1040.reference },
      { ...copy, lines: { ...lines, "24": -49_999 } },
      { ...copy, lines: { ...lines, "17": 1 } },
      { ...copy, lines: { ...lines, "25": 0 } },
      { ...copy, lines: { "24": -50_000 } },
    ]
  ) {
    assertThrows(() =>
      calculateReviewedLossYear({ ...v, reviewed_form172: altered })
    );
  }
});
