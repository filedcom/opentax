import { test } from "bun:test";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { f1040_2026 } from "../../../../../../2026/index.ts";
import { CONFIG_BY_YEAR } from "../../../../../config/index.ts";
import { inputSchema as form8995aSchema } from "./index.ts";
import { minimumDeductionLine40 } from "./minimum-deduction.ts";

type InvestmentCase = {
  interest?: number;
  dividends?: number;
  qualifiedDividends?: number;
  capitalDistributions?: number;
  ira?: number;
  profit?: number;
  retirement?: number;
  wages?: number;
};

// These are hypothetical source facts, not a reconstruction of a filed return.
function physicianInvestmentFixture(facts: InvestmentCase = {}) {
  const profit = facts.profit ?? 480000;
  const retirement = facts.retirement ?? 65000;
  const wages = facts.wages ?? 170000;
  const qualifiedDividends = facts.qualifiedDividends ?? 0;
  const employeeDeferral = retirement === 65000 ? 20000 : 4000;
  return {
    general: {
      filing_status: "mfj",
      taxpayer_ssn: "000000002",
      spouse_ssn: "000000003",
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      fincen_form114_required: false,
      foreign_countries: [],
      foreign_trust_question: false,
    },
    schedule_c: [{
      line_a_principal_business: "Professional medical services",
      line_b_business_code: "621111",
      line_c_business_name: "Synthetic physician practice",
      line_d_ein: "000000005",
      business_reference: "physician",
      proprietor_recipient: "S",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: profit,
      qbi_specified_service: true,
      qbi_w2_wages: 0,
      qbi_unadjusted_basis: 0,
      qbi_no_other_adjustments_confirmed: false,
      qbi_sstb_filing_review: {
        owner_ssn: "000000003",
        classification_source_reference: "Synthetic physician engagements",
        business_activity_description: "Professional medical services",
        service_classification_review: {
          field: "health",
          engagement_records_reference: "Synthetic medical engagements",
          all_receipts_from_reviewed_services_confirmed: true,
          revenue_records: [{
            invoice_reference: "synthetic-medical-receipts",
            service_description: "Professional medical services",
            amount: profit,
          }],
          medical_services_in_professional_capacity_confirmed: true,
          no_health_club_processing_research_manufacturing_sales_confirmed: true,
        },
        employee_w2_records: [],
        no_business_employees_review: {
          payroll_and_expense_ledger_reference: "Synthetic owner-only ledger",
          sole_proprietor_only_workforce_confirmed: true,
          no_employee_w2_or_business_payroll_confirmed: true,
        },
        all_business_payroll_included_confirmed: true,
        no_other_business_or_aggregation_confirmed: true,
        no_ptp_or_loss_carryforward_confirmed: true,
        qualified_dividends_zero_confirmed: qualifiedDividends === 0,
        no_qualified_property_confirmed: true,
        retirement_plan_deduction_review: {
          owner_ssn: "000000003",
          business_reference: "physician",
          deduction_amount: retirement,
          source_document_reference: "Synthetic solo401k contribution records",
          no_other_qbi_adjustments_confirmed: true,
        },
        review_reference: "Synthetic physician QBI review",
        reviewed_by: "Test fixture",
        reviewed_on: "2027-04-01",
      },
    }],
    sep_retirement: [{
      plan_type: "SOLO_401K",
      net_self_employment_compensation: retirement === 65000 ? 462133 : 83642,
      solo401k_employee_deferral: employeeDeferral,
      solo401k_employer_contribution: retirement - employeeDeferral,
    }],
    ...(wages > 0 ? {
      w2: [{
        employer_name: "Synthetic spouse employer",
        employer_ein: "000000004",
        employee_ssn: "000000002",
        source_document_reference: "Synthetic issued W2",
        box1_wages: wages,
        box2_fed_withheld: 0,
        box3_ss_wages: Math.min(wages, 184500),
        box4_ss_withheld: Math.min(wages, 184500) * 0.062,
        box5_medicare_wages: wages,
        box6_medicare_withheld: wages * 0.0145,
      }],
    } : {}),
    ...(facts.interest ? {
      f1099int: [{
        payer_name: "Synthetic domestic interest",
        payer_tin: "000000008",
        recipient_tin: "000000002",
        account_number: "synthetic-interest",
        source_document_reference: "Synthetic 1099-INT",
        box1: facts.interest,
      }],
    } : {}),
    ...(facts.dividends || facts.capitalDistributions ? {
      f1099div: [{
        payerName: "Synthetic domestic investment",
        payerTin: "000000007",
        recipient_tin: "000000002",
        account_number: "synthetic-investment",
        source_document_reference: "Synthetic 1099-DIV",
        isNominee: false,
        box11: false,
        box1a: facts.dividends ?? 0,
        box1b: qualifiedDividends,
        box2a: facts.capitalDistributions ?? 0,
        ...(qualifiedDividends > 0 ? {
          qualified_dividend_filing_review: {
            ex_dividend_date: "2026-01-15",
            qualified_held_days_in_121_day_window: 121,
            diminished_risk_days_excluded: 0,
            ordinary_stock_rule_confirmed: true,
            eligible_issuer_and_no_disqualified_dividend_confirmed: true,
            no_related_payment_obligation_confirmed: true,
            review_reference: "Synthetic qualified dividend assumptions",
            reviewed_on: "2027-04-01",
          },
        } : {}),
      }],
    } : {}),
    ...(facts.ira ? {
      f1099r: [{
        payer_name: "Synthetic IRA custodian",
        payer_ein: "000000006",
        box1_gross_distribution: facts.ira,
        box2a_taxable_amount: facts.ira,
        box7_distribution_code: "2",
        box7_ira_simple_indicator: true,
        box2b_not_determined: false,
      }],
    } : {}),
  };
}

// Independent whole-dollar worksheets using:
// https://www.irs.gov/pub/irs-drop/rp-25-32.pdf (2026 MFJ rates/thresholds)
// https://www.irs.gov/pub/irs-dft/f8995a--dft.pdf (Schedule A and lines 39-41)
// https://uscode.house.gov/us/usc/119-120/t26/s199A/ (d)(3) and (i)
// https://www.irs.gov/instructions/i8960 (IRA distributions excluded from NII)
// The main fixture has QBI 480000 - 17867 - 65000 = 397133, AGI before
// investments 567133, SE tax 35733, and Additional Medicare tax 3270.
// Both SSTB applicable-percentage and wage/property phase-in apply with no
// employees/qualified property. NIIT is 3.8% of investment income; IRA is
// taxable ordinary income and affects the SSTB threshold but is not NII.
const cases: ReadonlyArray<{
  name: string;
  facts: InvestmentCase;
  agi: number;
  taxable: number;
  qbi: number;
  incomeTax: number;
  niit: number;
  total: number;
}> = [
  { name: "interest minimum", facts: { interest: 10000 }, agi: 577133,
    taxable: 544533, qbi: 400, incomeTax: 128125, niit: 380, total: 167508 },
  { name: "ordinary dividends", facts: { dividends: 1800 }, agi: 568933,
    taxable: 535741, qbi: 992, incomeTax: 125048, niit: 68, total: 164119 },
  { name: "qualified dividends", facts: { dividends: 1800, qualifiedDividends: 1200 },
    agi: 568933, taxable: 535741, qbi: 992, incomeTax: 124808, niit: 68,
    total: 163879 },
  { name: "capital distributions", facts: { capitalDistributions: 2300 },
    agi: 569433, taxable: 536299, qbi: 934, incomeTax: 124783, niit: 87,
    total: 163873 },
  { name: "IRA income", facts: { ira: 7000 }, agi: 574133,
    taxable: 541461, qbi: 472, incomeTax: 127050, niit: 0, total: 166053 },
  { name: "combined income above endpoint", facts: { interest: 10000,
      dividends: 1800, qualifiedDividends: 1200, capitalDistributions: 2300, ira: 7000 },
    agi: 588233, taxable: 556033, qbi: 0, incomeTax: 131450, niit: 536,
    total: 170989 },
  // Pre-QBI TI 553122 produces eligible active QBI 1001. One more interest
  // dollar produces eligible QBI 998: the normal $1 deduction has no $400 floor.
  { name: "minimum active QBI floor met", facts: { interest: 18189 }, agi: 585322,
    taxable: 552722, qbi: 400, incomeTax: 130991, niit: 691, total: 170685 },
  { name: "minimum active QBI floor missed", facts: { interest: 18190 }, agi: 585323,
    taxable: 553122, qbi: 1, incomeTax: 131131, niit: 691, total: 170825 },
  { name: "interest above SSTB endpoint", facts: { interest: 20000 }, agi: 587133,
    taxable: 554933, qbi: 0, incomeTax: 131765, niit: 760, total: 171528 },
  // Independent lower-profit QBI 71642, pre-QBI TI 104442. The income cap
  // rounds 20% * (104442 - 62000) to 8488, below 20% of business QBI.
  // Whole-dollar Schedule SE lines 10306 + 2410 = 12716.
  // Qualified dividends are a subset of ordinary dividends, counted once.
  { name: "qualified dividend QBI cap", facts: { profit: 90000, retirement: 12000,
      wages: 0, dividends: 65000, qualifiedDividends: 62000 },
    agi: 136642, taxable: 95954, qbi: 8488, incomeTax: 3581, niit: 0,
    total: 16297 },
];

for (const row of cases) {
  test(`2026 physician investment estimate: ${row.name}`, () => {
    const result = f1040_2026.executeReturn(physicianInvestmentFixture(row.facts));
    assertEquals(result.diagnostics, []);
    const f = result.pending.f1040;
    assertEquals(f.line11_agi, row.agi);
    assertEquals(f.line13_qbi_deduction ?? 0, row.qbi);
    assertEquals(f.line15_taxable_income, row.taxable);
    assertEquals(f.line16_income_tax, row.incomeTax);
    const niit = result.pending.form8960?.line17_niit ?? 0;
    assert(typeof niit === "number");
    assertEquals(Math.round(niit), row.niit);
    assertEquals(f.line24_total_tax, row.total);
  });
}

test("physician minimum still requires reconciled retirement attribution", () => {
  const input = physicianInvestmentFixture({ interest: 10000 });
  input.schedule_c[0].qbi_sstb_filing_review.retirement_plan_deduction_review
    .deduction_amount--;
  const result = f1040_2026.executeReturn(input);
  assert(result.diagnostics.some((d) => d.code === "EXECUTOR_NODE_FAILURE"));
});

test("physician minimum needs materially participating retained SSTB QBI", () => {
  const result = f1040_2026.executeReturn(
    physicianInvestmentFixture({ interest: 10000 }),
  );
  const input = form8995aSchema.parse(result.pending.form8995a);
  const source = input.single_sstb_schedule_c_source;
  assert(source);
  const cfg = CONFIG_BY_YEAR[2026]!;
  assertEquals(minimumDeductionLine40(input, 259, cfg), 400);
  assertEquals(minimumDeductionLine40({
    ...input,
    single_sstb_schedule_c_source: {
      ...source,
      business: {
        ...source.business,
        source_schedule_c: {
          ...source.business.source_schedule_c,
          line_g_material_participation: false,
        },
      },
    },
  }, 259, cfg), undefined);
  assertThrows(() => minimumDeductionLine40({
    ...input,
    single_sstb_schedule_c_source: undefined,
  }, 259, cfg), Error, "reconciled SSTB");
  assertThrows(() => minimumDeductionLine40({
    ...input,
    single_sstb_schedule_c_source: { ...source, retirement_plan_deduction: 64999 },
  }, 259, cfg), Error, "reconciled SSTB");
});
