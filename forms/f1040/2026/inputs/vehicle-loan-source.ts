import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";

const ref = z.string().trim().min(1);
const money = z.number().finite().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 100,
);
const positive = money.positive();
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const ein = z.string().regex(/^\d{2}-?\d{7}$/);
const date = z.string().date().refine(
  (d) => d <= "2026-12-31",
  "Date is after 2026",
);
const currentDate = date.refine(
  (d) => d >= "2026-01-01",
  "Date must be in 2026",
);
const normalize = (s: string) => s.replaceAll("-", "");
const centsEqual = (a: number, b: number) => Math.abs(a - b) < 0.000001;

/** One annual source per lender/account/servicing period; retain correction history. */
const statement = z.object({
  tax_year: z.literal(2026),
  document_id: ref,
  replaces_document_id: ref.optional(),
  source_kind: z.enum(["form1098vli", "lender_payment_record"]),
  lender_name: ref,
  lender_ein: ein,
  account_number: ref,
  period_start: currentDate,
  period_end: currentDate,
  // Acquisition changes the lender, not the taxpayer's loan origination date.
  lender_acquisition_date: date.optional(),
  lender_transfer_reference: ref.optional(),
  reported_origination_date: date,
  reported_vin: z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/i),
  gross_interest_paid: money,
  box1_interest: money.optional(),
  box4_outstanding_principal: money.optional(),
  box5_prior_year_interest_refund: money,
  box6_original_use: z.boolean().optional(),
  box7_us_final_assembly: z.boolean().optional(),
  payment_record_reference: ref,
  // Box 1 is already net of same-year refunds. Prior-year refunds are separate.
  same_year_refunds_already_netted: z.literal(true),
  accounting_review: z.object({
    method: z.literal("cash"),
    record_reference: ref,
    no_unreported_interest_or_prepaid_timing_adjustment: z.literal(true),
  }).strict(),
  payments: z.array(
    z.object({
      credited_to_borrower_ssn: ssn,
      amount: money,
      payor: z.enum(["borrower", "third_party_gift"]),
      payment_reference: ref,
      third_party_gift_reference: ref.optional(),
    }).strict(),
  ).min(1),
}).strict();

const refinance = z.object({
  financing_id: ref,
  date: date,
  lender_name: ref,
  lender_ein: ein,
  account_number: ref,
  total_principal: positive,
  prior_loan_outstanding_principal: positive,
  principal_and_refinance_record: ref,
  first_lien_on_same_vehicle: z.boolean(),
  related_party_lender: z.boolean(),
  same_obligors: z.boolean(),
  statements: z.array(statement),
}).strict();

export const vehicleLoan2026Schema = z.object({
  tax_year: z.literal(2026),
  loan_id: ref,
  vin: z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/i),
  vehicle_year: z.number().int().min(1900).max(2027),
  vehicle_make: ref,
  vehicle_model: ref,
  purchase_date: date,
  purchase_and_title_reference: ref,
  original_use_begins_with_borrower: z.boolean(),
  original_use_reference: ref,
  final_assembly_in_us: z.boolean(),
  assembly_reference: ref,
  vehicle_type: z.enum([
    "car",
    "minivan",
    "van",
    "suv",
    "pickup",
    "motorcycle",
    "other",
  ]),
  manufactured_for_public_roads: z.boolean(),
  wheels: z.number().int().nonnegative(),
  gross_vehicle_weight_rating: positive,
  fleet_sale: z.boolean(),
  lease_financing: z.boolean(),
  salvage_title: z.boolean(),
  intended_for_scrap_or_parts: z.boolean(),
  // Tested at original borrowing, not the return year's actual use percentage.
  expected_personal_use_at_origination_percent: z.number().min(0).max(100),
  personal_use_expectation_reference: ref,
  has_business_interest_allocation: z.boolean(),
  obligor_change: z.enum(["none", "death", "other"]),
  original: z.object({
    date: date,
    lender_name: ref,
    lender_ein: ein,
    account_number: ref,
    borrower_ssns: z.array(ssn).min(1),
    first_lien: z.boolean(),
    related_party_lender: z.boolean(),
    lien_and_debt_reference: ref,
    total_principal: positive,
    vehicle_purchase_price: positive,
    qualifying_vehicle_related_items: money,
    negative_equity: money,
    unrelated_items_and_cash_out: money,
    down_payment_or_other_consideration: money,
    purchase_financing_itemization_reference: ref,
    statements: z.array(statement),
  }).strict(),
  refinancings: z.array(refinance).default([]),
}).strict();
export type VehicleLoan2026 = z.input<typeof vehicleLoan2026Schema>;

/** Final results from business owners, after limitations such as Form 8990. */
export const vehicleBusinessDeductionSchema = z.object({
  loan_id: ref,
  borrower_ssn: ssn,
  activity_id: ref,
  source_form: z.enum(["schedule_c", "schedule_e", "schedule_f", "form4835"]),
  deducted_amount: money,
  limitation_result_reference: ref,
}).strict();
export const vehicleInterestRowSchema = z.object({
  loan_id: ref,
  vin: z.string(),
  qualified_interest: money,
  business_interest_deducted: money,
  schedule1a_interest: money,
  original_use: z.boolean(),
  us_final_assembly: z.boolean(),
}).strict();

/** TD 10054 §1.163-16(d): down payment first offsets nonqualifying debt. */
export function vehiclePurchasePrincipal2026(
  original: z.infer<typeof vehicleLoan2026Schema>["original"],
) {
  const eligibleCost = original.vehicle_purchase_price +
    original.qualifying_vehicle_related_items;
  const excludedCost = original.negative_equity +
    original.unrelated_items_and_cash_out;
  const expected = eligibleCost + excludedCost -
    original.down_payment_or_other_consideration;
  if (!centsEqual(expected, original.total_principal)) {
    throw new Error(
      "Vehicle purchase financing does not reconcile to original principal",
    );
  }
  const excludedPrincipal = Math.max(
    0,
    excludedCost - original.down_payment_or_other_consideration,
  );
  return original.total_principal - excludedPrincipal;
}

export function calculateVehicleInterestSources2026(
  rawLoans: readonly VehicleLoan2026[],
  owner: {
    filing_status: FilingStatus;
    taxpayer_ssn: string;
    spouse_ssn?: string;
  },
  rawBusiness: readonly z.input<typeof vehicleBusinessDeductionSchema>[] = [],
) {
  const loans = z.array(vehicleLoan2026Schema).parse(rawLoans);
  const business = z.array(vehicleBusinessDeductionSchema).parse(rawBusiness);
  const owners = new Set([normalize(owner.taxpayer_ssn)]);
  if (owner.filing_status === FilingStatus.MFJ) {
    if (!owner.spouse_ssn || owners.has(normalize(owner.spouse_ssn))) {
      throw new Error("Joint vehicle interest needs distinct spouse identity");
    }
    owners.add(normalize(owner.spouse_ssn));
  }
  const loanIds = new Set<string>();
  const originalDebts = new Set<string>();
  const documentIds = new Set<string>();
  const activityIds = new Set<string>();
  for (const row of business) {
    const key = `${row.loan_id}:${
      normalize(row.borrower_ssn)
    }:${row.activity_id}`;
    if (activityIds.has(key)) {
      throw new Error("Duplicate business vehicle interest allocation");
    }
    activityIds.add(key);
    if (!owners.has(normalize(row.borrower_ssn))) {
      throw new Error("Business vehicle interest owner is not on this return");
    }
  }
  const reviewed = loans.map((loan) => {
    const original = loan.original;
    const debtKey = `${
      normalize(original.lender_ein)
    }:${original.account_number}:${original.date}`;
    if (loanIds.has(loan.loan_id) || originalDebts.has(debtKey)) {
      throw new Error(
        "Duplicate original vehicle loan, including co-borrower copies",
      );
    }
    loanIds.add(loan.loan_id);
    originalDebts.add(debtKey);
    const borrowers = new Set(original.borrower_ssns.map(normalize));
    if (
      borrowers.size !== original.borrower_ssns.length ||
      ![...borrowers].some((s) => owners.has(s))
    ) {
      throw new Error(
        "Vehicle loan needs distinct borrowers including a return owner",
      );
    }
    if (loan.obligor_change === "death") {
      throw new Error(
        "Inherited vehicle loan needs the death-transfer source owner",
      );
    }
    if (original.date < loan.purchase_date) {
      throw new Error(
        "Vehicle debt predating purchase needs purchase timing reconciliation",
      );
    }
    const excludedReasons = [
      original.date < "2025-01-01" && "pre_2025_debt",
      loan.purchase_date < "2025-01-01" && "pre_2025_purchase",
      !loan.original_use_begins_with_borrower && "used_vehicle",
      !loan.final_assembly_in_us && "non_us_assembly",
      loan.vehicle_type === "other" && "vehicle_type",
      !loan.manufactured_for_public_roads && "non_road_vehicle",
      loan.wheels < 2 && "wheel_count",
      loan.gross_vehicle_weight_rating >= 14_000 && "vehicle_weight",
      loan.fleet_sale && "fleet_sale",
      loan.lease_financing && "lease",
      loan.salvage_title && "salvage",
      loan.intended_for_scrap_or_parts && "scrap",
      loan.expected_personal_use_at_origination_percent <= 50 && "personal_use",
      !original.first_lien && "no_first_lien",
      original.related_party_lender && "related_lender",
      loan.obligor_change === "other" && "changed_obligor",
    ].filter((r): r is string => typeof r === "string");
    let principal = original.total_principal;
    let qualifiedPrincipal = excludedReasons.length
      ? 0
      : vehiclePurchasePrincipal2026(original);
    // Reconcile the financing itemization even for an ineligible vehicle.
    vehiclePurchasePrincipal2026(original);
    const periods = [{
      financing_id: loan.loan_id,
      date: original.date,
      total_principal: principal,
      qualified_principal: qualifiedPrincipal,
      lender_ein: original.lender_ein,
      account_number: original.account_number,
      statements: original.statements,
    }];
    let previousDate = original.date;
    const financingIds = new Set([loan.loan_id]);
    for (const refi of loan.refinancings) {
      if (
        financingIds.has(refi.financing_id) || refi.date <= previousDate ||
        refi.prior_loan_outstanding_principal > principal
      ) {
        throw new Error(
          "Vehicle refinancing needs distinct chronological debt and a reconciled outstanding balance",
        );
      }
      financingIds.add(refi.financing_id);
      if (
        refi.total_principal < refi.prior_loan_outstanding_principal &&
        qualifiedPrincipal < principal
      ) {
        throw new Error(
          "Partial refinancing of mixed debt needs payment allocation reconciliation",
        );
      }
      const outstandingQualified = refi.prior_loan_outstanding_principal *
        qualifiedPrincipal / principal;
      qualifiedPrincipal =
        refi.first_lien_on_same_vehicle && !refi.related_party_lender &&
          refi.same_obligors
          ? Math.min(refi.total_principal, outstandingQualified)
          : 0;
      principal = refi.total_principal;
      previousDate = refi.date;
      periods.push({
        financing_id: refi.financing_id,
        date: refi.date,
        total_principal: principal,
        qualified_principal: qualifiedPrincipal,
        lender_ein: refi.lender_ein,
        account_number: refi.account_number,
        statements: refi.statements,
      });
    }
    let qualifiedInterest = 0;
    const byOwner = new Map<string, number>();
    const statementResults = [];
    for (const [index, period] of periods.entries()) {
      const nextDate = periods[index + 1]?.date;
      const documents = new Map(
        period.statements.map((s) => [s.document_id, s]),
      );
      const replaced = new Set<string>();
      for (const source of period.statements) {
        if (documentIds.has(source.document_id)) {
          throw new Error("Duplicate vehicle interest source document");
        }
        documentIds.add(source.document_id);
        if (source.replaces_document_id) {
          const prior = documents.get(source.replaces_document_id);
          if (
            !prior || prior.document_id === source.document_id ||
            replaced.has(prior.document_id) ||
            normalize(prior.lender_ein) !== normalize(source.lender_ein) ||
            prior.account_number !== source.account_number ||
            prior.period_start !== source.period_start ||
            prior.period_end !== source.period_end
          ) {
            throw new Error(
              "Vehicle correction must replace one matching lender/account period",
            );
          }
          replaced.add(prior.document_id);
          let ancestor: typeof prior | undefined = prior;
          const chain = new Set([source.document_id]);
          while (ancestor) {
            if (chain.has(ancestor.document_id)) {
              throw new Error("Vehicle correction cycle");
            }
            chain.add(ancestor.document_id);
            ancestor = ancestor.replaces_document_id
              ? documents.get(ancestor.replaces_document_id)
              : undefined;
          }
        }
      }
      const active = period.statements.filter((s) =>
        !replaced.has(s.document_id)
      )
        .sort((a, b) => a.period_start.localeCompare(b.period_start));
      let previousEnd = "";
      for (const source of active) {
        if (
          (normalize(source.lender_ein) !== normalize(period.lender_ein) ||
            source.account_number !== period.account_number) &&
          (!source.lender_acquisition_date || !source.lender_transfer_reference)
        ) {
          throw new Error(
            "Changed lender/account requires transfer evidence for the same vehicle debt",
          );
        }
        if (
          source.reported_vin.toUpperCase() !== loan.vin.toUpperCase() ||
          source.reported_origination_date !== period.date ||
          source.period_end < source.period_start ||
          source.period_start < period.date ||
          (nextDate && source.period_end >= nextDate) ||
          source.period_start <= previousEnd ||
          (source.lender_acquisition_date &&
            (source.lender_acquisition_date > source.period_start ||
              source.lender_acquisition_date < period.date))
        ) {
          throw new Error(
            "Vehicle statement VIN, origination or servicing dates do not reconcile",
          );
        }
        previousEnd = source.period_end;
        if (
          source.source_kind === "form1098vli" &&
          (source.box1_interest === undefined ||
            source.box4_outstanding_principal === undefined ||
            source.box6_original_use === undefined ||
            source.box7_us_final_assembly === undefined)
        ) {
          throw new Error(
            "Form 1098-VLI requires its interest, principal and eligibility boxes",
          );
        }
        if (
          (source.box6_original_use !== undefined &&
            source.box6_original_use !==
              loan.original_use_begins_with_borrower) ||
          (source.box7_us_final_assembly !== undefined &&
            source.box7_us_final_assembly !== loan.final_assembly_in_us)
        ) {
          throw new Error(
            "Vehicle statement eligibility flags conflict with purchase evidence",
          );
        }
        if (source.box5_prior_year_interest_refund > 0) {
          throw new Error(
            "Prior-year vehicle interest refund needs tax-benefit recovery; do not subtract box 5 from box 1",
          );
        }
        const totalPaid = source.payments.reduce((n, p) => n + p.amount, 0);
        if (!centsEqual(totalPaid, source.gross_interest_paid)) {
          throw new Error(
            "Vehicle borrower payments must reconcile to gross interest",
          );
        }
        // A 1098-VLI box 1 already excludes interest on non-SPVL debt. Never
        // multiply that box by the qualifying ratio a second time.
        const grossQualified = source.gross_interest_paid *
          period.qualified_principal / period.total_principal;
        if (
          source.box1_interest !== undefined &&
          Math.abs(source.box1_interest - grossQualified) > 0.50
        ) {
          throw new Error(
            "Form 1098-VLI interest must reconcile to the qualifying debt allocation",
          );
        }
        if (
          source.box4_outstanding_principal !== undefined &&
          source.box4_outstanding_principal > period.qualified_principal + 0.50
        ) {
          throw new Error(
            "Form 1098-VLI principal exceeds the qualifying financing balance",
          );
        }
        let ownerInterest = 0;
        for (const payment of source.payments) {
          const borrower = normalize(payment.credited_to_borrower_ssn);
          if (!borrowers.has(borrower)) {
            throw new Error("Vehicle payment credited to a non-obligor");
          }
          if (
            payment.payor === "third_party_gift" &&
            !payment.third_party_gift_reference
          ) {
            throw new Error(
              "Third-party vehicle payment needs gift and on-behalf-of evidence",
            );
          }
          if (!owners.has(borrower)) continue;
          const qualified = payment.amount * period.qualified_principal /
            period.total_principal;
          ownerInterest += qualified;
          byOwner.set(borrower, (byOwner.get(borrower) ?? 0) + qualified);
        }
        qualifiedInterest += ownerInterest;
        statementResults.push({
          ...source,
          financing_id: period.financing_id,
          qualified_principal: period.qualified_principal,
          total_principal: period.total_principal,
          return_qualified_interest: ownerInterest,
        });
      }
    }
    if (statementResults.length === 0) {
      throw new Error(
        "Vehicle loan needs current-year interest evidence, including zero",
      );
    }
    const deductions = business.filter((b) => b.loan_id === loan.loan_id);
    if (loan.has_business_interest_allocation !== (deductions.length > 0)) {
      throw new Error(
        "Business vehicle use requires reconciled activity deductions, including zero after limitations",
      );
    }
    const businessByOwner = new Map<string, number>();
    for (const b of deductions) {
      const key = normalize(b.borrower_ssn);
      businessByOwner.set(
        key,
        (businessByOwner.get(key) ?? 0) + b.deducted_amount,
      );
    }
    for (const [key, amount] of businessByOwner) {
      if (amount > (byOwner.get(key) ?? 0) + 0.000001) {
        throw new Error(
          "Business deductions exceed the owner's qualified vehicle interest",
        );
      }
    }
    const businessDeducted = deductions.reduce(
      (n, b) => n + b.deducted_amount,
      0,
    );
    return {
      source: loan,
      excluded_reasons: excludedReasons,
      statements: statementResults,
      business_deductions: deductions,
      row: {
        loan_id: loan.loan_id,
        vin: loan.vin.toUpperCase(),
        qualified_interest: qualifiedInterest,
        business_interest_deducted: businessDeducted,
        schedule1a_interest: Math.max(0, qualifiedInterest - businessDeducted),
        original_use: loan.original_use_begins_with_borrower,
        us_final_assembly: loan.final_assembly_in_us,
      },
    };
  });
  if (business.some((b) => !loanIds.has(b.loan_id))) {
    throw new Error("Business vehicle deduction has no matching loan");
  }
  return reviewed;
}
