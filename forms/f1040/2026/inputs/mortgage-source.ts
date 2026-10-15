import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import { mortgage2026 } from "../../nodes/config/2026-mortgage.ts";
import {
  mortgageDebtLimit,
  ratableMortgagePoints,
} from "../../nodes/inputs/deductions/mortgage/f1098/amounts.ts";
const ref = z.string().trim().min(1);
const money = z.number().finite().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 100,
);
const tin = z.string().regex(/^(?:\d{9}|\d{2}-\d{7}|\d{3}-\d{2}-\d{4})$/);
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const date = z.string().date();
const currentDate = date.refine(
  (v) => v.startsWith("2026-"),
  "Payment must be in 2026",
);
const normalize = (v: string) => v.replaceAll("-", "");
const monthIndex = (v: string) =>
  Number(v.slice(0, 4)) * 12 + Number(v.slice(5, 7)) - 1;
export const mortgageProperty2026Schema = z.object({
  property_id: ref,
  address: ref,
  residence: z.enum(["main", "second"]),
  ownership_and_residence_record: ref,
  real_property_or_qualified_manufactured_home: z.literal(true),
  personal_use_only_all_year: z.literal(true),
  owned_by_filers_only: z.literal(true),
}).strict();
const interestPayment = z.object({
  payment_id: ref,
  payment_record: ref,
  payer_ssn: ssn,
  paid_on: currentDate,
  interest_paid: money,
  current_year_interest_refund: money,
}).strict();
const interestStatement = z.object({
  source_document_reference: ref,
  kind: z.enum(["form1098", "lender_payment_statement"]),
  lender_name: ref,
  lender_tin: tin,
  account_number: ref,
  borrower_ssn: ssn,
  interest_received: money,
  // A current-year reimbursement is already netted in Form 1098 box 1.
  payments: z.array(interestPayment).min(1),
  interest_allocable_to_2027: money,
  accrual_review_reference: ref,
  form1098: z.object({
    tax_year: z.literal(2026),
    box2_outstanding_principal: money,
    box3_origination_date: date,
    box4_prior_year_refund: z.literal(0),
    box5_mortgage_insurance: money,
    box6_points: money,
    box8_property_address: ref,
    box9_properties: z.literal(1),
  }).strict().optional(),
  seller_financed: z.boolean(),
  seller_address: ref.optional(),
}).strict();
const immediatePointsReview = z.object({
  settlement_reference: ref,
  established_practice_reference: ref,
  customary_points_percentage: z.number().positive().max(100),
  cash_accounting: z.literal(true),
  points_not_substitute_for_service_charges: z.literal(true),
  points_computed_as_percentage_of_principal: z.literal(true),
  settlement_separately_identifies_points: z.literal(true),
  funds_provided_without_lender_or_broker_borrowing: money,
}).strict();
const pointsSchema = z.object({
  points_id: ref,
  source_document_reference: ref,
  payer_ssn: ssn,
  paid_on: date,
  points_paid_separately_not_financed: z.literal(true),
  total_points: money,
  seller_paid_points: money,
  service_charges: money,
  reported_on_form1098: z.boolean(),
  current_form1098_reference: ref.optional(),
  treatment: z.enum(["immediate", "ratable"]),
  immediate_review: immediatePointsReview.optional(),
  loan_term_months: z.number().int().min(1).max(360),
  comparable_local_loan_terms_reference: ref,
  payment_months_2026: z.array(
    z.object({
      month: z.number().int().min(1).max(12),
      payment_record: ref,
    }).strict(),
  ).max(12),
  prior_allocation: z.object({
    filed_return_and_points_workpaper_reference: ref,
    allocated_before_2026: money,
    remaining_unallocated_at_start_2026: money,
  }).strict().optional(),
}).strict();
const insuranceSchema = z.object({
  premium_id: ref,
  source_document_reference: ref,
  payer_ssn: ssn,
  paid_on: date,
  contract_issued_on: date,
  provider: z.enum(["VA", "RHS", "FHA", "private"]),
  qualified_insurance_record: ref,
  amount_paid: money,
  refunded_amount: money,
  current_form1098_reference: ref.optional(),
  allocation: z.discriminatedUnion("method", [
    z.object({
      method: z.literal("current_period"),
      coverage_year: z.literal(2026),
    }).strict(),
    z.object({
      method: z.literal("prepaid"),
      coverage_starts_on: date,
      mortgage_term_months: z.number().int().min(1).max(600),
      allocation_record_reference: ref,
      not_previously_deducted_for_2026: z.literal(true),
    }).strict(),
  ]),
}).strict();
export const mortgageLoan2026Schema = z.object({
  loan_id: ref,
  property_id: ref,
  borrower_ssns: z.array(ssn).min(1).max(2),
  lender_tin: tin,
  account_number: ref,
  origination_date: date,
  original_principal: money.refine((n) => n > 0),
  original_note_reference: ref,
  maturity_date: date,
  purpose: z.enum(["purchase", "construction", "improvement", "refinance"]),
  acquisition_use_record_reference: ref,
  all_proceeds_acquire_build_or_improve_secured_home: z.literal(true),
  secured_by_identified_qualified_home_throughout: z.literal(true),
  no_additional_advances_or_mixed_use: z.literal(true),
  not_deducted_elsewhere: z.literal(true),
  no_mortgage_credit_certificate: z.literal(true),
  no_prior_year_prepaid_interest_or_points_omitted: z.literal(true),
  refinance: z.object({
    original_acquisition_date: date,
    original_acquisition_record: ref,
    predecessor_payoff_reference: ref,
    predecessor_principal_at_refinance: money,
    original_maturity_date: date,
    no_cashout_or_term_extension: z.literal(true),
  }).strict().optional(),
  grandfathered_continuous_security_record: ref.optional(),
  binding_contract_exception: z.object({
    binding_contract_date: date,
    required_closing_date: date,
    purchase_date: date,
    contract_and_closing_reference: ref,
  }).strict().optional(),
  monthly_balances: z.array(
    z.object({
      month: z.number().int().min(1).max(12),
      closing_balance: money,
      lender_statement_reference: ref,
    }).strict(),
  ).length(12),
  interest_statements: z.array(interestStatement).min(1),
  points: z.array(pointsSchema).default([]),
  mortgage_insurance: z.array(insuranceSchema).default([]),
}).strict();
export const mortgageClaim2026Schema = z.object({
  tax_year: z.literal(2026),
  inventory_record_reference: ref,
  cash_method_of_accounting: z.literal(true),
  all_qualified_home_loans_included: z.literal(true),
  no_cooperative_rental_business_or_shared_nonfiler_interest: z.literal(true),
  mfs_payment_review: z.object({
    record_reference: ref,
    qualified_home_selection_review_reference: ref,
    noncommunity_property: z.literal(true),
    expenses_paid_solely_by_filer: z.literal(true),
  }).strict().optional(),
  properties: z.array(mortgageProperty2026Schema).min(1).max(2),
  loans: z.array(mortgageLoan2026Schema).min(1),
}).strict();
export const mortgageSource2026Schema = mortgageClaim2026Schema.extend({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: ssn,
  spouse_ssn: ssn.optional(),
}).strict();
export type MortgageSource2026 = z.input<typeof mortgageSource2026Schema>;

/** Reconciles the whole inventory before applying one shared Table 1 ratio. */
export function calculateMortgageSources2026(raw: MortgageSource2026) {
  const input = mortgageSource2026Schema.parse(raw);
  const owners = new Set([normalize(input.taxpayer_ssn)]);
  if (input.filing_status === FilingStatus.MFJ) {
    if (!input.spouse_ssn || owners.has(normalize(input.spouse_ssn))) {
      throw new Error("Joint mortgage sources need distinct filer identities");
    }
    owners.add(normalize(input.spouse_ssn));
  }
  const mfs = input.filing_status === FilingStatus.MFS;
  if (mfs !== !!input.mfs_payment_review) {
    throw new Error("MFS mortgage sources need their separate payment review");
  }
  const properties = new Map(input.properties.map((p) => [p.property_id, p]));
  if (
    properties.size !== input.properties.length ||
    new Set(input.properties.map((p) => p.residence)).size !==
      input.properties.length
  ) {
    throw new Error(
      "Mortgage inventory needs distinct main and elected second homes",
    );
  }
  const unique = (seen: Set<string>, id: string, label: string) => {
    if (seen.has(id)) throw new Error(`Duplicate mortgage ${label}`);
    seen.add(id);
  };
  const loans = new Set<string>(),
    debts = new Set<string>(),
    documents = new Set<string>();
  const paymentIds = new Set<string>(),
    pointsIds = new Set<string>(),
    insuranceIds = new Set<string>();
  const averages = { grandfathered: 0, pre2017: 0, post2017: 0, total: 0 };
  const checkOwner = (owner: string) => {
    if (!owners.has(normalize(owner))) {
      throw new Error("Mortgage payer or borrower is not a return filer");
    }
  };
  const close = (a: number, b: number) => Math.abs(a - b) < .010001;
  const reviewed = input.loans.map((loan) => {
    unique(loans, loan.loan_id, "loan ID");
    unique(
      debts,
      `${
        normalize(loan.lender_tin)
      }:${loan.account_number}:${loan.origination_date}`,
      "debt account",
    );
    const property = properties.get(loan.property_id);
    if (!property) {
      throw new Error("Mortgage loan needs its qualified property");
    }
    const borrowers = new Set(loan.borrower_ssns.map(normalize));
    if (borrowers.size !== loan.borrower_ssns.length) {
      throw new Error("Duplicate mortgage borrower");
    }
    loan.borrower_ssns.forEach(checkOwner);
    if (
      loan.origination_date > "2026-12-31" ||
      loan.maturity_date <= "2026-12-31" ||
      loan.maturity_date <= loan.origination_date
    ) {
      throw new Error(
        "Mortgage payoff, maturity or future origination needs its source allocation",
      );
    }
    let acquisitionDate = loan.origination_date;
    if (loan.purpose === "refinance") {
      if (loan.origination_date.startsWith("2026-")) {
        throw new Error(
          "A 2026 refinance needs the predecessor payoff and partial-year loan allocation",
        );
      }
      const prior = loan.refinance;
      if (
        !prior || prior.original_acquisition_date >= loan.origination_date ||
        prior.predecessor_principal_at_refinance < loan.original_principal ||
        prior.original_maturity_date < loan.maturity_date
      ) {
        throw new Error(
          "Refinance must reconcile original acquisition, payoff principal and remaining term",
        );
      }
      acquisitionDate = prior.original_acquisition_date;
    } else if (loan.refinance) {
      throw new Error("Refinance history belongs only to a refinanced loan");
    }
    if (loan.binding_contract_exception) {
      const e = loan.binding_contract_exception;
      if (
        property.residence !== "main" || loan.purpose !== "purchase" ||
        e.binding_contract_date >= "2017-12-15" ||
        e.required_closing_date >= "2018-01-01" ||
        e.required_closing_date < e.binding_contract_date ||
        e.purchase_date < e.binding_contract_date ||
        e.purchase_date >= "2018-04-01" ||
        e.purchase_date !== loan.origination_date
      ) {
        throw new Error(
          "Mortgage binding-contract exception dates do not qualify",
        );
      }
      acquisitionDate = "2017-12-15";
    }
    const category = acquisitionDate <= "1987-10-13"
      ? "grandfathered"
      : acquisitionDate <= "2017-12-15"
      ? "pre2017"
      : "post2017";
    if (
      category === "grandfathered" &&
      !loan.grandfathered_continuous_security_record
    ) {
      throw new Error(
        "Grandfathered debt needs continuous qualified-home security evidence",
      );
    }
    const startMonth = loan.origination_date.startsWith("2026-")
      ? Number(loan.origination_date.slice(5, 7))
      : 1;
    const balances = [...loan.monthly_balances].sort((a, b) =>
      a.month - b.month
    );
    if (
      new Set(balances.map((b) => b.lender_statement_reference)).size !== 12 ||
      balances.some((b, i) =>
        b.month !== i + 1 ||
        (b.month < startMonth
          ? b.closing_balance !== 0
          : b.closing_balance <= 0 ||
            b.closing_balance > loan.original_principal)
      )
    ) {
      throw new Error(
        "Mortgage needs all twelve distinct monthly balance records reconciled to origination",
      );
    }
    if (
      balances.some((b, i) =>
        i > 0 && b.month > startMonth &&
        b.closing_balance > balances[i - 1].closing_balance
      )
    ) {
      throw new Error(
        "Increasing mortgage balance needs advances or capitalization review",
      );
    }
    const average = balances.reduce((n, b) => n + b.closing_balance, 0) /
      (13 - startMonth);
    averages[category] += average;
    averages.total += average;
    const statements = new Map<
      string,
      typeof loan.interest_statements[number]
    >();
    const interest = loan.interest_statements.map((s) => {
      unique(documents, s.source_document_reference, "statement");
      statements.set(s.source_document_reference, s);
      checkOwner(s.borrower_ssn);
      if (
        normalize(s.lender_tin) !== normalize(loan.lender_tin) ||
        s.account_number !== loan.account_number
      ) {
        throw new Error(
          "Mortgage servicer/account changes need their linked statement history",
        );
      }
      if (!borrowers.has(normalize(s.borrower_ssn))) {
        throw new Error("Mortgage statement borrower differs from note");
      }
      if ((s.kind === "form1098") !== !!s.form1098) {
        throw new Error("Reported mortgage interest needs its Form 1098 boxes");
      }
      if (
        s.form1098 &&
        (s.form1098.box3_origination_date !== loan.origination_date ||
          s.form1098.box2_outstanding_principal > loan.original_principal ||
          s.form1098.box8_property_address !== property.address)
      ) throw new Error("Form 1098 loan/property facts disagree with note");
      if (s.seller_financed && !s.seller_address) {
        throw new Error(
          "Seller-financed mortgage needs seller address and tax identity",
        );
      }
      let paid = 0;
      for (const p of s.payments) {
        unique(paymentIds, p.payment_id, "interest payment");
        checkOwner(p.payer_ssn);
        if (
          p.paid_on < loan.origination_date ||
          p.current_year_interest_refund > p.interest_paid
        ) throw new Error("Mortgage payment date/refund does not reconcile");
        paid += p.interest_paid - p.current_year_interest_refund;
      }
      if (
        !close(paid, s.interest_received) || s.interest_allocable_to_2027 > paid
      ) {
        throw new Error(
          "Mortgage interest payments disagree with statement or accrual allocation",
        );
      }
      return {
        source_document_reference: s.source_document_reference,
        reported: s.kind === "form1098",
        amount: paid - s.interest_allocable_to_2027,
      };
    });
    const points = loan.points.map((p) => {
      unique(pointsIds, p.points_id, "points source");
      checkOwner(p.payer_ssn);
      if (
        p.paid_on !== loan.origination_date ||
        p.service_charges > p.total_points ||
        p.loan_term_months !==
          monthIndex(loan.maturity_date) - monthIndex(loan.origination_date)
      ) {
        throw new Error(
          "Points must reconcile to original loan date, term and interest-like charges",
        );
      }
      const amount = p.total_points - p.service_charges;
      if (
        p.seller_paid_points > amount ||
        p.seller_paid_points > 0 && loan.purpose !== "purchase"
      ) {
        throw new Error(
          "Seller points need a purchase and cannot exceed interest points",
        );
      }
      const months = [...p.payment_months_2026].sort((a, b) =>
        a.month - b.month
      );
      if (
        new Set(months.map((m) => m.month)).size !== months.length ||
        new Set(months.map((m) => m.payment_record)).size !== months.length ||
        months.some((m) => m.month < startMonth)
      ) {
        throw new Error(
          "Points need distinct current-year payment months after origination",
        );
      }
      const current = p.paid_on.startsWith("2026-");
      if (current && p.prior_allocation || !current && !p.prior_allocation) {
        throw new Error(
          "Prior points require their retained allocation ledger",
        );
      }
      if (
        current && p.reported_on_form1098 !== !!p.current_form1098_reference ||
        !current && p.current_form1098_reference
      ) {
        throw new Error(
          "Current reported points must identify their issued Form 1098",
        );
      }
      if (
        p.current_form1098_reference &&
        !statements.get(p.current_form1098_reference)?.form1098
      ) throw new Error("Points reference is not a matching Form 1098");
      if (
        p.prior_allocation &&
        !close(
          p.prior_allocation.allocated_before_2026 +
            p.prior_allocation.remaining_unallocated_at_start_2026,
          amount,
        )
      ) {
        throw new Error(
          "Prior points allocation does not reconcile to original points",
        );
      }
      let immediate = 0;
      if (p.treatment === "immediate") {
        const review = p.immediate_review;
        if (
          !current || !review || property.residence !== "main" ||
          loan.purpose === "refinance"
        ) {
          throw new Error(
            "Immediate points require current main-home purchase/construction/improvement evidence",
          );
        }
        if (p.seller_paid_points > amount) {
          throw new Error("Seller-paid points exceed interest points");
        }
        immediate = Math.min(
          amount,
          loan.original_principal * review.customary_points_percentage / 100,
          review.funds_provided_without_lender_or_broker_borrowing +
            p.seller_paid_points,
        );
      } else if (p.immediate_review) {
        throw new Error(
          "Immediate points review conflicts with ratable election",
        );
      }
      const beforeLimit = Math.min(
        p.prior_allocation?.remaining_unallocated_at_start_2026 ?? amount,
        ratableMortgagePoints(
          amount,
          immediate,
          months.length,
          p.loan_term_months,
          1,
          false,
        ),
      );
      return {
        points_id: p.points_id,
        reported: p.reported_on_form1098,
        beforeLimit,
        seller_basis_reduction: current ? p.seller_paid_points : 0,
        remaining_allocation:
          (p.prior_allocation?.remaining_unallocated_at_start_2026 ?? amount) -
          beforeLimit,
      };
    });
    for (const s of loan.interest_statements) {
      if (!s.form1098) continue;
      const pointsTotal = loan.points.filter((p) =>
        p.current_form1098_reference === s.source_document_reference
      ).reduce((n, p) => n + p.total_points, 0);
      const premiumTotal = loan.mortgage_insurance.filter((p) =>
        p.current_form1098_reference === s.source_document_reference
      ).reduce((n, p) => n + p.amount_paid - p.refunded_amount, 0);
      if (
        !close(pointsTotal, s.form1098.box6_points) ||
        !close(premiumTotal, s.form1098.box5_mortgage_insurance)
      ) {
        throw new Error(
          "Form 1098 points/premiums must reconcile to payment sources",
        );
      }
    }
    const insurance = loan.mortgage_insurance.map((p) => {
      unique(insuranceIds, p.premium_id, "insurance premium");
      checkOwner(p.payer_ssn);
      if (
        p.paid_on > "2026-12-31" || p.paid_on < loan.origination_date ||
        p.contract_issued_on > p.paid_on || p.refunded_amount > p.amount_paid
      ) throw new Error("Mortgage insurance dates/refunds do not reconcile");
      if (
        p.current_form1098_reference &&
        (!p.paid_on.startsWith("2026-") ||
          !statements.get(p.current_form1098_reference)?.form1098)
      ) throw new Error("Premium needs matching current Form 1098");
      if (
        p.allocation.method === "prepaid" && p.paid_on >= "2022-01-01" &&
        p.paid_on < "2026-01-01"
      ) {
        throw new Error(
          "Prepaid premiums paid during the expired deduction period need transition guidance",
        );
      }
      let amount = p.amount_paid - p.refunded_amount;
      if (p.contract_issued_on < "2007-01-01") amount = 0;
      if (p.allocation.method === "current_period") {
        if (!p.paid_on.startsWith("2026-")) {
          throw new Error("Current-period insurance must be paid in 2026");
        }
      } else if (p.provider === "VA" || p.provider === "RHS") {
        amount = p.paid_on.startsWith("2026-") ? amount : 0;
      } else {
        const start = monthIndex(p.allocation.coverage_starts_on);
        if (
          p.paid_on < "2011-01-01" ||
          p.allocation.coverage_starts_on !== loan.origination_date ||
          p.allocation.mortgage_term_months !==
            monthIndex(loan.maturity_date) - monthIndex(loan.origination_date)
        ) {
          throw new Error(
            "Prepaid insurance needs original coverage and mortgage term",
          );
        }
        const term = Math.min(
          p.allocation.mortgage_term_months,
          mortgage2026.prepaidInsuranceMonths,
        );
        const months = Math.max(
          0,
          Math.min(start + term, 2027 * 12) - Math.max(start, 2026 * 12),
        );
        amount = amount * months / term;
      }
      return { premium_id: p.premium_id, beforeIncomeLimit: amount };
    });
    return {
      loan_id: loan.loan_id,
      category,
      average,
      interest,
      points,
      insurance,
    };
  });
  if (
    input.properties.some((p) =>
      !input.loans.some((l) => l.property_id === p.property_id)
    )
  ) throw new Error("Mortgage inventory contains an unused property");
  const table1 = mortgageDebtLimit(averages, {
    pre2017: mfs
      ? mortgage2026.priorAcquisitionCapMfs
      : mortgage2026.priorAcquisitionCap,
    post2017: mfs
      ? mortgage2026.acquisitionCapMfs
      : mortgage2026.acquisitionCap,
  });
  const interests = reviewed.flatMap((l) => l.interest),
    points = reviewed.flatMap((l) => l.points);
  // Allocate the one rounded combined deduction by cumulative source totals.
  const raw8a = interests.filter((s) => s.reported).reduce(
    (n, s) => n + s.amount,
    0,
  );
  const raw8b = interests.filter((s) => !s.reported).reduce(
    (n, s) => n + s.amount,
    0,
  );
  const interest8a = Math.round(raw8a * table1.ratio);
  const interest8b = Math.round((raw8a + raw8b) * table1.ratio) - interest8a;
  const reportedPoints = Math.round(
    points.filter((p) => p.reported).reduce((n, p) => n + p.beforeLimit, 0) *
      table1.ratio,
  );
  const unreportedPoints =
    Math.round(points.reduce((n, p) => n + p.beforeLimit, 0) * table1.ratio) -
    reportedPoints;
  const premiums = reviewed.flatMap((l) => l.insurance).reduce(
    (n, p) => n + p.beforeIncomeLimit,
    0,
  );
  const lines = {
    line8a: interest8a + reportedPoints,
    line8b: interest8b,
    line8c: unreportedPoints,
  };
  if (
    [...Object.values(averages), ...Object.values(lines), premiums].some((n) =>
      !Number.isFinite(n) || !Number.isSafeInteger(Math.round(n))
    )
  ) throw new Error("Mortgage totals exceed amount range");
  return {
    source_input: input,
    loans: reviewed,
    table1,
    lines,
    insuranceBeforeIncomeLimit: premiums,
    sellerPaidPointsBasisReduction: points.reduce(
      (n, p) => n + p.seller_basis_reduction,
      0,
    ),
  };
}
export function mortgageInsuranceDeduction2026(
  premiums: number,
  agi: number,
  status: FilingStatus,
) {
  const mfs = status === FilingStatus.MFS;
  const steps = Math.max(
    0,
    Math.ceil(
      (agi -
        (mfs
          ? mortgage2026.insuranceThresholdMfs
          : mortgage2026.insuranceThreshold)) /
        (mfs ? mortgage2026.insuranceStepMfs : mortgage2026.insuranceStep),
    ),
  );
  const wholePremiums = Math.round(premiums);
  const reduction = Math.round(
    wholePremiums * Math.min(1, steps * mortgage2026.insuranceReductionPerStep),
  );
  return wholePremiums - reduction;
}
