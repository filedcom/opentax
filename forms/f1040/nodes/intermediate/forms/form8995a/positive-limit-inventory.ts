import { createHash } from "node:crypto";
import { z } from "zod";

const realDate = (value: string) => {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
};
const date = z.string().refine(realDate, "Actual calendar date required");
const date2025 = date.refine((value) => value.startsWith("2025-"));
const payment = z.object({
  employee_ssn: z.string().regex(/^\d{9}$/),
  paid_on: date2025,
  check_reference: z.string().min(1),
  cash_wages: z.number().int().positive(),
  net_check_paid: z.number().int().positive(),
}).strict();
const employeeW2 = z.object({
  employee_ssn: z.string().regex(/^\d{9}$/),
  employer_ein: z.string().regex(/^\d{9}$/),
  issued_copy_reference: z.string().min(1),
  issued_on: date,
  ssa_filing_reference: z.string().min(1),
  ssa_filed_on: date,
  retained_i9_reference: z.string().min(1),
  agricultural_worker_not_h2a: z.literal(true),
  box1_wages: z.number().int().positive(),
  box3_social_security_wages: z.number().int().positive(),
  box5_medicare_wages: z.number().int().positive(),
  box4_social_security_tax_withheld: z.number().int().nonnegative(),
  box6_medicare_tax_withheld: z.number().int().nonnegative(),
}).strict();
const property = z.object({
  asset_reference: z.string().min(1),
  purchase_invoice_reference: z.string().min(1),
  title_record_reference: z.string().min(1),
  paid_receipt_reference: z.string().min(1),
  seller: z.string().min(1),
  acquired_on: date,
  placed_in_service_on: date,
  recovery_period_years: z.literal(5),
  prior_depreciation_completion_reference: z.string().min(1),
  prior_depreciation_ledger: z.array(
    z.object({
      tax_year: z.literal(2018),
      form4562_source_reference: z.string().min(1),
      deduction_method: z.literal("100_percent_special_depreciation"),
      deduction: z.number().int().positive(),
    }).strict(),
  ).length(1),
  original_cost_paid: z.number().int().positive(),
  owner_ssn: z.string().regex(/^\d{9}$/),
  tangible_depreciable_property: z.literal(true),
  held_at_2025_year_end: z.literal(true),
  used_in_2025_qbi_production: z.literal(true),
  retained_2025_use_record_reference: z.string().min(1),
}).strict();
const bookSchema = z.object({
  tax_year: z.literal(2025),
  owner_ssn: z.string().regex(/^\d{9}$/),
  business_reference: z.string().min(1),
  employer_ein: z.string().regex(/^\d{9}$/),
  period_start: z.literal("2025-01-01"),
  period_end: z.literal("2025-12-31"),
  farm_product_sales: z.array(
    z.object({
      buyer: z.string().min(1),
      crop: z.string().min(1),
      sold_on: date2025,
      buyer_invoice_reference: z.string().min(1),
      paid_on: date2025,
      deposit_reference: z.string().min(1),
      amount: z.number().int().positive(),
    }).strict(),
  ).min(1),
  months: z.array(
    z.object({
      month: z.string().regex(/^2025-(0[1-9]|1[0-2])$/),
      payroll_journal_reference: z.string().min(1),
      payments: z.array(payment),
    }).strict(),
  ).length(12),
  issued_employee_w2_copies: z.array(employeeW2),
  current_2025_agricultural_service_weeks: z.array(
    z.object({
      week_end: date2025,
      employee_count: z.number().int().positive(),
    }).strict(),
  ),
  prior_2024_agricultural_payroll: z.object({
    source_reference: z.string().min(1),
    quarter_cash_wages: z.tuple([
      z.number().int().nonnegative(),
      z.number().int().nonnegative(),
      z.number().int().nonnegative(),
      z.number().int().nonnegative(),
    ]),
    quarter_employee_service_week_counts: z.tuple([
      z.number().int().nonnegative(),
      z.number().int().nonnegative(),
      z.number().int().nonnegative(),
      z.number().int().nonnegative(),
    ]),
  }).strict(),
  form943_filing_reference: z.string().min(1).optional(),
  employer_payroll_tax_deposit: z.object({
    paid_on: date2025,
    bank_debit_reference: z.string().min(1),
    amount: z.number().int().positive(),
  }).strict().optional(),
  unemployment: z.object({
    state: z.literal("TX"),
    state_account_reference: z.string().min(1),
    state_rate_notice_reference: z.string().min(1),
    state_assigned_rate_basis_points: z.literal(270),
    state_q4_report_reference: z.string().min(1),
    state_q4_report_filed_on: date,
    state_tax_payment: z.object({
      paid_on: date,
      bank_debit_reference: z.string().min(1),
      amount: z.number().int().positive(),
    }).strict(),
    form940_filing_reference: z.string().min(1),
    form940_filed_on: date,
    futa_tax_payment: z.object({
      paid_on: date,
      bank_debit_reference: z.string().min(1),
      amount: z.number().int().positive(),
    }).strict(),
    same_state_wages_credit_eligible: z.literal(true),
    state_tax_timely_paid: z.literal(true),
    no_credit_reduction_state: z.literal(true),
  }).strict().optional(),
  owned_property_register: z.array(property),
}).strict();

export const positiveLimitInventorySchema = z.object({
  document_id: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  bytes_base64: z.string().min(1),
}).strict();

/** Compute §199A wage and UBIA inputs from retained employer books and issued copies. */
export function reviewedPositiveLimits(
  raw: z.infer<typeof positiveLimitInventorySchema> | undefined,
  expected: {
    owner_ssn: string;
    business_reference: string;
    employer_ein: string;
  },
) {
  if (!raw) {
    throw new Error(
      "Positive QBI wage/property limit needs retained business books",
    );
  }
  const bytes = Uint8Array.from(atob(raw.bytes_base64), (c) => c.charCodeAt(0));
  if (
    btoa(String.fromCharCode(...bytes)) !== raw.bytes_base64 ||
    createHash("sha256").update(bytes).digest("hex") !== raw.sha256
  ) {
    throw new Error(
      "Positive QBI payroll/property source differs from retained bytes",
    );
  }
  const book = bookSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
  const payments = book.months.flatMap((month, index) => {
    if (month.month !== `2025-${String(index + 1).padStart(2, "0")}`) {
      throw new Error(
        "QBI payroll journals need all twelve ordered 2025 months",
      );
    }
    return month.payments.map((payment) => {
      if (payment.paid_on.slice(0, 7) !== month.month) {
        throw new Error("QBI paid wage date differs from monthly journal");
      }
      return payment;
    });
  });
  const wages = payments.reduce((sum, row) => sum + row.cash_wages, 0);
  const ficaTax = wages * 765 / 10000;
  const quarterWages = [0, 0, 0, 0];
  for (const row of payments) {
    quarterWages[Math.floor((Number(row.paid_on.slice(5, 7)) - 1) / 3)] +=
      row.cash_wages;
  }
  const unemploymentRequired =
    quarterWages.some((amount) => amount >= 20_000) ||
    book.prior_2024_agricultural_payroll.quarter_cash_wages.some((amount) =>
      amount >= 20_000
    ) ||
    book.current_2025_agricultural_service_weeks.filter((week) =>
        week.employee_count >= 10
      ).length >= 20 ||
    book.prior_2024_agricultural_payroll.quarter_employee_service_week_counts
        .reduce((sum, count) => sum + count, 0) >= 20;
  const unemployment = book.unemployment;
  const stateBase = Math.min(wages, 9_000);
  const futaBase = Math.min(wages, 7_000);
  const stateTax = stateBase * 270 / 10_000;
  const futaTax = futaBase * 60 / 1_000 - futaBase * 54 / 1_000;
  const paidIn2025 = (value: string) => value <= "2025-12-31";
  const employerTax = ficaTax +
    (unemployment && paidIn2025(unemployment.state_tax_payment.paid_on)
      ? stateTax
      : 0) +
    (unemployment && paidIn2025(unemployment.futa_tax_payment.paid_on)
      ? futaTax
      : 0);
  const copies = book.issued_employee_w2_copies;
  const assets = book.owned_property_register;
  const basis = assets.reduce((sum, row) => sum + row.original_cost_paid, 0);
  const farmSales = book.farm_product_sales.reduce(
    (sum, row) => sum + row.amount,
    0,
  );
  if (
    raw.document_id !==
      `${expected.business_reference}-2025-positive-qbi-books` ||
    book.owner_ssn !== expected.owner_ssn ||
    book.business_reference !== expected.business_reference ||
    book.employer_ein !== expected.employer_ein ||
    (wages === 0 && basis === 0) ||
    !Number.isInteger(ficaTax) || !Number.isInteger(employerTax) ||
    unemploymentRequired !== (unemployment !== undefined) ||
    book.current_2025_agricultural_service_weeks.length !==
      new Set(
        book.current_2025_agricultural_service_weeks.map((week) =>
          week.week_end
        ),
      ).size ||
    (wages > 0 &&
      book.current_2025_agricultural_service_weeks.length === 0) ||
    (unemployment && (
      !Number.isInteger(stateTax) || !Number.isInteger(futaTax) ||
      unemployment.state_q4_report_filed_on < "2025-12-31" ||
      unemployment.state_q4_report_filed_on > "2026-01-31" ||
      unemployment.form940_filed_on < "2025-12-31" ||
      unemployment.form940_filed_on > "2026-02-10" ||
      unemployment.state_tax_payment.paid_on < payments.at(-1)!.paid_on ||
      unemployment.futa_tax_payment.paid_on < payments.at(-1)!.paid_on ||
      unemployment.state_tax_payment.paid_on > unemployment.form940_filed_on ||
      unemployment.state_tax_payment.paid_on > "2026-02-02" ||
      unemployment.futa_tax_payment.paid_on > unemployment.form940_filed_on ||
      unemployment.state_tax_payment.amount !== stateTax ||
      unemployment.futa_tax_payment.amount !== futaTax ||
      unemployment.state_tax_payment.bank_debit_reference ===
        unemployment.futa_tax_payment.bank_debit_reference
    )) ||
    (wages > 0) !== (book.form943_filing_reference !== undefined) ||
    (wages > 0) !== (book.employer_payroll_tax_deposit !== undefined) ||
    (wages > 0 &&
      book.employer_payroll_tax_deposit!.amount !== 2 * ficaTax) ||
    new Set(book.months.map((row) => row.payroll_journal_reference)).size !==
      12 ||
    new Set(payments.map((row) => row.check_reference)).size !==
      payments.length ||
    new Set(copies.map((row) => row.employee_ssn)).size !== copies.length ||
    new Set(copies.map((row) => row.issued_copy_reference)).size !==
      copies.length ||
    new Set(assets.map((row) => row.asset_reference)).size !== assets.length ||
    new Set(assets.map((row) => row.purchase_invoice_reference)).size !==
      assets.length ||
    new Set(assets.map((row) => row.title_record_reference)).size !==
      assets.length ||
    new Set(assets.map((row) => row.paid_receipt_reference)).size !==
      assets.length ||
    new Set(book.farm_product_sales.map((row) => row.buyer_invoice_reference))
        .size !==
      book.farm_product_sales.length ||
    new Set(book.farm_product_sales.map((row) => row.deposit_reference))
        .size !==
      book.farm_product_sales.length ||
    book.farm_product_sales.some((row) => row.paid_on < row.sold_on) ||
    new Set(payments.map((row) => row.employee_ssn)).size !== copies.length ||
    copies.some((copy) =>
      copy.employer_ein !== expected.employer_ein ||
      copy.issued_on < "2025-12-31" || copy.issued_on > "2026-01-31" ||
      copy.ssa_filed_on < copy.issued_on || copy.ssa_filed_on > "2026-04-03" ||
      copy.box1_wages !== copy.box3_social_security_wages ||
      copy.box3_social_security_wages > 176_100 ||
      copy.box1_wages !== copy.box5_medicare_wages ||
      copy.box4_social_security_tax_withheld !==
        copy.box3_social_security_wages * 62 / 1000 ||
      copy.box6_medicare_tax_withheld !==
        copy.box5_medicare_wages * 145 / 10000 ||
      copy.box1_wages !==
        payments.filter((p) => p.employee_ssn === copy.employee_ssn)
          .reduce((sum, p) => sum + p.cash_wages, 0)
    ) ||
    payments.some((p) => p.net_check_paid !== p.cash_wages * 9235 / 10000) ||
    assets.some((asset) =>
      asset.owner_ssn !== expected.owner_ssn ||
      asset.acquired_on > asset.placed_in_service_on ||
      asset.placed_in_service_on.slice(0, 4) !==
        String(asset.prior_depreciation_ledger[0].tax_year) ||
      asset.prior_depreciation_ledger[0].deduction !==
        asset.original_cost_paid ||
      asset.placed_in_service_on < "2016-01-01" ||
      asset.placed_in_service_on >= "2025-01-01" ||
      !asset.retained_2025_use_record_reference
    )
  ) {
    throw new Error(
      "QBI wage/property limits disagree with actual paid wages, issued W-2, or owned asset source",
    );
  }
  return { wages, basis, employerTax, farmSales };
}
