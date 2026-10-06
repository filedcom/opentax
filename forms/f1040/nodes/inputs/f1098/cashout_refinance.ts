import { z } from "zod";
import { createHash } from "node:crypto";

const retainedDocument = z.object({
  file_name: z.string().trim().regex(/^[^/\\]+\.json$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  bytes: z.instanceof(Uint8Array),
}).strict();

function reviewedDocument(
  document: z.infer<typeof retainedDocument>,
): Record<string, unknown> | undefined {
  if (
    createHash("sha256").update(document.bytes).digest("hex") !==
      document.sha256
  ) return;
  try {
    const value = JSON.parse(new TextDecoder().decode(document.bytes));
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  } catch {
    /* A changed or unreadable retained record does not prove a claim. */
  }
}

const monthlyRecord = z.object({
  month: z.number().int().min(1).max(12),
  opening_balance: z.number().int().nonnegative(),
  principal_advanced_during_month: z.number().int().nonnegative().optional(),
  principal_paid_before_month_end: z.number().int().nonnegative(),
  closing_balance: z.number().int().nonnegative(),
  interest_paid: z.number().int().nonnegative(),
  lender_statement_reference: z.string().trim().min(1),
}).strict();

const additionalLoan = z.object({
  source_document_reference: z.string().trim().min(1),
  property_reference: z.string().trim().min(1),
  closing_reference: z.string().trim().min(1),
  original_principal: z.number().int().positive(),
  opening_2025_principal: z.number().int().positive(),
  monthly_records: z.array(monthlyRecord).min(1).max(12),
  title_document: retainedDocument,
  lien_document: retainedDocument,
  interest_payment_document: retainedDocument,
  occupancy_document: retainedDocument.optional(),
  security_history_document: retainedDocument.optional(),
  improvement_invoice_document: retainedDocument.optional(),
  improvement_payment_document: retainedDocument.optional(),
  payoff_document: retainedDocument.optional(),
  partial_period_document: retainedDocument.optional(),
  advances: z.array(z.object({
    amount: z.number().int().positive(),
    advanced_on: z.string().regex(/^2025-(0[1-9]|1[0-2])-01$/),
    purpose: z.enum(["substantial_improvement", "personal_nonhome_use"]),
    disbursement_reference: z.string().trim().min(1),
    bank_disbursement_document: retainedDocument,
    contractor_invoice_document: retainedDocument.optional(),
    personal_use_document: retainedDocument.optional(),
  }).strict()).min(1).optional(),
}).strict();

/** A single first-of-month refinance of one post-2017 acquisition mortgage. */
export const cashoutRefinanceReviewSchema = z.object({
  old_source_document_reference: z.string().trim().min(1),
  new_source_document_reference: z.string().trim().min(1),
  property_reference: z.string().trim().min(1),
  original_acquisition_closing_reference: z.string().trim().min(1),
  original_acquisition_property_reference: z.string().trim().min(1),
  original_acquisition_principal: z.number().int().positive(),
  refinance_closing_disclosure_reference: z.string().trim().min(1),
  refinance_property_reference: z.string().trim().min(1),
  old_loan_payoff_reference: z.string().trim().min(1),
  personal_cashout_use_ledger_reference: z.string().trim().min(1),
  closing_disbursements: z.array(
    z.object({
      purpose: z.enum([
        "old_acquisition_loan_payoff",
        "home_improvement",
        "personal_cashout",
      ]),
      amount: z.number().int().positive(),
      paid_on: z.string().regex(/^2025-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/),
      payment_record_reference: z.string().trim().min(1),
      payoff_receipt_reference: z.string().trim().min(1).optional(),
    }).strict(),
  ).min(2).max(3),
  cashout_use_records: z.array(
    z.object({
      amount: z.number().int().positive(),
      spent_on: z.string().regex(
        /^2025-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
      ),
      purpose: z.literal("personal_non_home_use"),
      bank_record_reference: z.string().trim().min(1),
      use_ledger_reference: z.string().trim().min(1),
    }).strict(),
  ).min(1),
  improvement_use_records: z.array(
    z.object({
      amount: z.number().int().positive(),
      spent_on: z.string().regex(
        /^2025-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
      ),
      property_reference: z.string().trim().min(1),
      contractor_invoice_reference: z.string().trim().min(1),
      contractor_payment_reference: z.string().trim().min(1),
      contractor_name: z.string().trim().min(1),
      invoice_ledger_reference: z.string().trim().min(1),
      substantial_improvement_description: z.string().trim().min(1),
      contractor_invoice_document: retainedDocument,
      contractor_payment_document: retainedDocument,
    }).strict(),
  ).min(1).optional(),
  home_improvement_invoice_ledger_reference: z.string().trim().min(1)
    .optional(),
  new_loan_proceeds_to_home_improvement: z.number().int().positive().optional(),
  main_home_substantial_improvement_verified: z.literal(true).optional(),
  new_loan_proceeds_to_old_payoff: z.number().int().positive(),
  new_loan_proceeds_to_personal_cashout: z.number().int().positive(),
  refinance_month: z.number().int().min(2).max(12),
  closing_on_first_of_month_verified: z.literal(true).optional(),
  refinance_on: z.string().regex(/^2025-\d{2}-\d{2}$/).optional(),
  midmonth_lender_ledger_document: retainedDocument.optional(),
  midmonth_closing_document: retainedDocument.optional(),
  midmonth_old_payoff_document: retainedDocument.optional(),
  midmonth_old_points_document: retainedDocument.optional(),
  all_qualified_home_mortgages_included_verified: z.literal(true),
  no_other_advances_or_debt_categories_verified: z.literal(true),
  filing_status_verified: z.enum(["single", "mfs", "mfj", "hoh", "qss"]),
  married_ownership_evidence: z.object({
    taxpayer_tin: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
    spouse_tin: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
    property_title_document: retainedDocument,
    old_loan_document: retainedDocument,
    new_loan_document: retainedDocument,
    interest_payment_document: retainedDocument,
  }).strict().optional(),
  qualified_home_inventory_document: retainedDocument.optional(),
  second_home_loan: z.object({
    source_document_reference: z.string().trim().min(1),
    property_reference: z.string().trim().min(1),
    purchase_closing_reference: z.string().trim().min(1),
    original_acquisition_principal: z.number().int().positive(),
    pre2017_purchase_on: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/).optional(),
    monthly_records: z.array(monthlyRecord).length(12),
    title_document: retainedDocument,
    purchase_note_document: retainedDocument,
    occupancy_document: retainedDocument,
    interest_payment_document: retainedDocument,
  }).strict().optional(),
  additional_qualified_loans: z.array(additionalLoan).min(1).optional(),
  old_loan_months: z.array(monthlyRecord).min(1).max(11),
  new_loan_months: z.array(monthlyRecord).min(1).max(11),
}).strict();

type Review = z.infer<typeof cashoutRefinanceReviewSchema>;
type Loan = {
  source_document_reference?: string;
  box1_mortgage_interest: number;
  box1_current_year_deductible_interest?: number;
  box2_outstanding_principal?: number;
  box3_origination_date?: string;
  box1_deduction_workpaper_reference?: string;
  recipient_tin?: string;
  lender_name?: string;
  for_routing?: string;
  refinance?: boolean;
  binding_contract_exception?: boolean;
  dedm_override?: boolean;
  box6_points_paid?: number;
};

function validDate(value: string | undefined): Date | undefined {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value ?? "");
  if (!match) return;
  const year = Number(match[3]);
  const month = Number(match[1]);
  const day = Number(match[2]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return;
  return date;
}

function completeRows(
  rows: Review["old_loan_months"],
  firstMonth: number,
  lastMonth: number,
  initialBalance: number,
  finalPayoff = false,
): boolean {
  if (rows.length !== lastMonth - firstMonth + 1) return false;
  let balance = initialBalance;
  const references = new Set<string>();
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (
      row.month !== firstMonth + index || row.opening_balance !== balance ||
      row.opening_balance <= 0 ||
      (row.principal_advanced_during_month ?? 0) !== 0 ||
      row.principal_paid_before_month_end > row.opening_balance ||
      row.closing_balance !==
        row.opening_balance - row.principal_paid_before_month_end ||
      (row.closing_balance <= 0 && !(finalPayoff && index === rows.length - 1 &&
        row.closing_balance === 0)) || row.interest_paid <= 0 ||
      references.has(row.lender_statement_reference)
    ) return false;
    references.add(row.lender_statement_reference);
    balance = row.closing_balance;
  }
  return true;
}

function validateSecondHomeLoan(review: Review, source: Loan): boolean {
  const second = review.second_home_loan;
  if (!second) return false;
  const title = reviewedDocument(second.title_document);
  const note = reviewedDocument(second.purchase_note_document);
  const occupancy = reviewedDocument(second.occupancy_document);
  const payment = reviewedDocument(second.interest_payment_document);
  const owned = review.married_ownership_evidence;
  const normalize = (tin: string) => tin.replaceAll("-", "");
  const eligible = review.filing_status_verified === "mfj" && owned
    ? [owned.taxpayer_tin, owned.spouse_tin].map(normalize)
    : [owned?.taxpayer_tin ?? source.recipient_tin ?? ""].map(normalize);
  const ownerTins = title?.owner_tins;
  const borrowerTins = note?.borrower_tins;
  const personalDates = occupancy?.personal_use_dates;
  const secondDate = validDate(source.box3_origination_date);
  const isPre2017 = second.pre2017_purchase_on !== undefined;
  return second.property_reference !== review.property_reference &&
    secondDate !== undefined &&
    (isPre2017
      ? secondDate >= new Date("1987-10-14T00:00:00Z") &&
        secondDate < new Date("2017-12-16T00:00:00Z") &&
        second.pre2017_purchase_on === source.box3_origination_date
      : secondDate >= new Date("2017-12-16T00:00:00Z") &&
        secondDate < new Date("2025-01-01T00:00:00Z")) &&
    source.box2_outstanding_principal === second.original_acquisition_principal &&
    source.refinance !== true && (source.for_routing ?? "A") === "A" &&
    source.binding_contract_exception !== true &&
    source.dedm_override !== true && (source.box6_points_paid ?? 0) === 0 &&
    !!source.recipient_tin && !!source.lender_name?.trim() &&
    !!source.box1_deduction_workpaper_reference &&
    eligible.includes(normalize(source.recipient_tin ?? "")) &&
    completeRows(second.monthly_records, 1, 12,
      second.original_acquisition_principal) &&
    second.monthly_records.reduce((sum, row) => sum + row.interest_paid, 0) ===
      source.box1_mortgage_interest &&
    title?.document_type === "property_title" &&
    title.property_reference === second.property_reference &&
    Array.isArray(ownerTins) && ownerTins.length > 0 &&
    ownerTins.every((tin) => typeof tin === "string" &&
      eligible.includes(normalize(tin))) &&
    ownerTins.some((tin) => typeof tin === "string" &&
      normalize(tin) === normalize(source.recipient_tin ?? "")) &&
    (review.filing_status_verified !== "mfs" ||
      (ownerTins.length === 1 && title.noncommunity_property_verified === true)) &&
    note?.document_type === "purchase_mortgage_note" &&
    note.property_reference === second.property_reference &&
    note.closing_reference === second.purchase_closing_reference &&
    note.source_document_reference === second.source_document_reference &&
    note.lender_name === source.lender_name &&
    note.recipient_tin === source.recipient_tin &&
    note.principal === second.original_acquisition_principal &&
    (isPre2017
      ? note.purchase_on === second.pre2017_purchase_on &&
        note.secured_on === second.pre2017_purchase_on &&
        typeof note.purchase_price === "number" &&
        note.purchase_price >= second.original_acquisition_principal
      : note.purchase_on === undefined &&
        note.secured_on === undefined &&
        note.purchase_price === undefined) &&
    Array.isArray(borrowerTins) && borrowerTins.length > 0 &&
    borrowerTins.every((tin) => typeof tin === "string" &&
      eligible.includes(normalize(tin))) &&
    borrowerTins.some((tin) => typeof tin === "string" &&
      normalize(tin) === normalize(source.recipient_tin ?? "")) &&
    occupancy?.document_type === "second_home_occupancy_calendar" &&
    occupancy.property_reference === second.property_reference &&
    occupancy.held_out_for_rent_or_resale === false &&
    occupancy.fair_rental_days === 0 &&
    Array.isArray(personalDates) && personalDates.length > 0 &&
    new Set(personalDates).size === personalDates.length &&
    personalDates.every((date) => typeof date === "string" &&
      /^2025-\d{2}-\d{2}$/.test(date) &&
      validDate(`${date.slice(5, 7)}/${date.slice(8, 10)}/2025`) !== undefined) &&
    payment?.document_type === "mortgage_payment_ledger" &&
    payment.property_reference === second.property_reference &&
    payment.source_document_reference === second.source_document_reference &&
    payment.payer_tin === source.recipient_tin &&
    JSON.stringify(payment.months) === JSON.stringify(
      second.monthly_records.map((row) => ({
        month: row.month,
        interest_paid: row.interest_paid,
        lender_statement_reference: row.lender_statement_reference,
      })),
    );
}

type Additional = NonNullable<Review["additional_qualified_loans"]>[number];
type Category = "grandfathered" | "pre2017" | "post2017";

function validIsoDate(value: string | undefined): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return;
  return validDate(`${value!.slice(5, 7)}/${value!.slice(8, 10)}/${value!.slice(0, 4)}`);
}

function additionalTimelineValid(
  loan: Additional,
  source: Loan,
  lien: Record<string, unknown> | undefined,
  originated: Date,
): boolean {
  const firstMonth = originated.getUTCFullYear() === 2025
    ? originated.getUTCMonth() + 1 : 1;
  const rows = loan.monthly_records;
  const payoff = loan.payoff_document && reviewedDocument(loan.payoff_document);
  const partialPeriod = loan.partial_period_document &&
    reviewedDocument(loan.partial_period_document);
  const advances = loan.advances ?? [];
  const paidOn = typeof payoff?.paid_on === "string"
    ? validIsoDate(payoff.paid_on) : undefined;
  const partial = originated.getUTCFullYear() === 2025 &&
      originated.getUTCDate() !== 1 ||
    (paidOn !== undefined && payoff?.paid_on !==
      new Date(Date.UTC(2025, rows.at(-1)!.month, 0))
        .toISOString().slice(0, 10));
  if (
    rows[0]?.month !== firstMonth ||
    rows.some((row, index) => row.month !== firstMonth + index) ||
    rows.at(-1)!.month > 12 ||
    new Set(rows.map((row) => row.lender_statement_reference)).size !==
      rows.length ||
    (rows.at(-1)!.closing_balance === 0) !==
      (loan.payoff_document !== undefined) ||
    (rows.at(-1)!.closing_balance > 0 && rows.at(-1)!.month !== 12) ||
    (loan.payoff_document !== undefined && !payoff) ||
    (advances.length > 0 &&
      (lien?.open_end_advance_permitted !== true ||
        typeof lien.open_end_credit_agreement_reference !== "string" ||
        !lien.open_end_credit_agreement_reference.trim() ||
        typeof lien.credit_limit !== "number" ||
        !Number.isInteger(lien.credit_limit) ||
        lien.credit_limit < loan.original_principal))
  ) return false;
  let balance = loan.opening_2025_principal;
  let latestMonth = firstMonth;
  for (const row of rows) {
    const monthAdvances = advances.filter((advance) =>
      Number(advance.advanced_on.slice(5, 7)) === row.month
    );
    const advanced = monthAdvances.reduce((sum, advance) =>
      sum + advance.amount, 0);
    if (
      row.opening_balance !== balance || row.opening_balance <= 0 ||
      (row.principal_advanced_during_month ?? 0) !== advanced ||
      row.principal_paid_before_month_end > row.opening_balance + advanced ||
      row.closing_balance !== row.opening_balance + advanced -
        row.principal_paid_before_month_end ||
      row.interest_paid <= 0 ||
      (row.closing_balance === 0 && row !== rows.at(-1)) ||
      (typeof lien?.credit_limit === "number" &&
        row.opening_balance + advanced > lien.credit_limit)
    ) return false;
    balance = row.closing_balance;
    latestMonth = row.month;
  }
  if (
    payoff && (
      payoff.document_type !== "mortgage_payoff_receipt" ||
      payoff.property_reference !== loan.property_reference ||
      payoff.source_document_reference !== loan.source_document_reference ||
      payoff.lender_name !== source.lender_name ||
      payoff.payer_tin !== source.recipient_tin ||
      payoff.principal_paid !== rows.at(-1)!.principal_paid_before_month_end ||
      payoff.lender_statement_reference !==
        rows.at(-1)!.lender_statement_reference ||
      typeof payoff.paid_on !== "string" ||
      !validIsoDate(payoff.paid_on) ||
      paidOn?.getUTCFullYear() !== 2025 ||
      paidOn.getUTCMonth() + 1 !== latestMonth ||
      paidOn < originated)
  ) return false;
  if (
    partial
      ? partialPeriod?.document_type !== "partial_period_mortgage_lender_ledger" ||
        partialPeriod.property_reference !== loan.property_reference ||
        partialPeriod.source_document_reference !== loan.source_document_reference ||
        partialPeriod.lender_name !== source.lender_name ||
        partialPeriod.recipient_tin !== source.recipient_tin ||
        partialPeriod.original_on !==
          (originated.getUTCFullYear() === 2025
            ? source.box3_origination_date : undefined) ||
        partialPeriod.paid_off_on !== payoff?.paid_on ||
        (payoff !== undefined && payoff.interest_paid !==
          rows.at(-1)?.interest_paid) ||
        JSON.stringify(partialPeriod.months) !== JSON.stringify(rows.map((row) => {
          const first = `2025-${String(row.month).padStart(2, "0")}-01`;
          const last = new Date(Date.UTC(2025, row.month, 0))
            .toISOString().slice(0, 10);
          return {
            month: row.month,
            period_start_on: row.month === firstMonth &&
                originated.getUTCFullYear() === 2025
              ? `2025-${String(row.month).padStart(2, "0")}-${
                String(originated.getUTCDate()).padStart(2, "0")}`
              : first,
            period_end_on: row === rows.at(-1) && payoff
              ? payoff.paid_on : last,
            interest_paid_on: row === rows.at(-1) && payoff
              ? payoff.paid_on : last,
            opening_balance: row.opening_balance,
            principal_paid_before_month_end: row.principal_paid_before_month_end,
            closing_balance: row.closing_balance,
            interest_paid: row.interest_paid,
            lender_statement_reference: row.lender_statement_reference,
          };
        }))
      : loan.partial_period_document !== undefined
  ) return false;
  const references = new Set<string>();
  for (const advance of advances) {
    const date = validIsoDate(advance.advanced_on);
    const bank = reviewedDocument(advance.bank_disbursement_document);
    const invoice = advance.contractor_invoice_document &&
      reviewedDocument(advance.contractor_invoice_document);
    const personal = advance.personal_use_document &&
      reviewedDocument(advance.personal_use_document);
    if (
      !date || date < originated || date.getUTCMonth() + 1 < firstMonth ||
      date.getUTCMonth() + 1 > latestMonth ||
      references.has(advance.disbursement_reference) ||
      bank?.document_type !== "mortgage_advance_disbursement" ||
      bank.property_reference !== loan.property_reference ||
      bank.source_document_reference !== loan.source_document_reference ||
      bank.lender_name !== source.lender_name ||
      bank.recipient_tin !== source.recipient_tin ||
      bank.credit_agreement_reference !==
        lien?.open_end_credit_agreement_reference ||
      bank.disbursement_reference !== advance.disbursement_reference ||
      bank.amount !== advance.amount || bank.paid_on !== advance.advanced_on ||
      (advance.purpose === "substantial_improvement"
        ? invoice?.document_type !== "contractor_invoice" ||
          invoice.property_reference !== loan.property_reference ||
          invoice.billed_to_tin !== source.recipient_tin ||
          invoice.amount !== advance.amount ||
          invoice.completed_on !== advance.advanced_on ||
          typeof invoice.contractor_name !== "string" ||
          !invoice.contractor_name.trim() ||
          typeof invoice.invoice_reference !== "string" ||
          !invoice.invoice_reference.trim() ||
          typeof invoice.substantial_improvement_description !== "string" ||
          !invoice.substantial_improvement_description.trim() ||
          bank.payee !== invoice.contractor_name ||
          bank.invoice_reference !== invoice.invoice_reference ||
          advance.personal_use_document !== undefined
        : personal?.document_type !== "personal_advance_use_ledger" ||
          personal.property_reference !== loan.property_reference ||
          personal.owner_tin !== source.recipient_tin ||
          personal.disbursement_reference !== advance.disbursement_reference ||
          personal.amount !== advance.amount ||
          personal.spent_on !== advance.advanced_on ||
          typeof personal.personal_purpose !== "string" ||
          !personal.personal_purpose.trim() ||
          bank.payee !== source.recipient_tin ||
          advance.contractor_invoice_document !== undefined)
    ) return false;
    references.add(advance.disbursement_reference);
  }
  return true;
}

function additionalLoanAverages(loan: Additional): {
  grandfathered: number;
  pre2017: number;
  post2017: number;
  total: number;
} | undefined {
  const secured = validDate(
    reviewedDocument(loan.lien_document)?.secured_on as string | undefined,
  );
  if (!secured) return;
  const initial: Category = secured <= new Date("1987-10-13T00:00:00Z")
    ? "grandfathered"
    : secured < new Date("2017-12-16T00:00:00Z")
    ? "pre2017"
    : "post2017";
  const advances = loan.advances ?? [];
  const mixed = advances.some((advance) =>
    advance.purpose === "personal_nonhome_use" || initial !== "post2017"
  );
  const balance = {
    grandfathered: initial === "grandfathered"
      ? loan.opening_2025_principal : 0,
    pre2017: initial === "pre2017" ? loan.opening_2025_principal : 0,
    post2017: initial === "post2017" ? loan.opening_2025_principal : 0,
    personal: 0,
  };
  const sum = { grandfathered: 0, pre2017: 0, post2017: 0, total: 0 };
  for (const row of loan.monthly_records) {
    for (const advance of advances.filter((item) =>
      Number(item.advanced_on.slice(5, 7)) === row.month
    )) {
      if (advance.purpose === "personal_nonhome_use") {
        balance.personal += advance.amount;
      } else {
        balance.post2017 += advance.amount;
      }
    }
    let paid = row.principal_paid_before_month_end;
    const personalPaid = Math.min(paid, balance.personal);
    balance.personal -= personalPaid;
    paid -= personalPaid;
    const grandfatheredPaid = Math.min(paid, balance.grandfathered);
    balance.grandfathered -= grandfatheredPaid;
    paid -= grandfatheredPaid;
    // Pub. 936 orders home acquisition debt last, but does not establish an
    // ordering between old- and new-limit acquisition vintages. An actual
    // payment reaching both vintages needs a further reviewed allocation.
    if (paid > 0 && balance.pre2017 > 0 && balance.post2017 > 0) return;
    const prePaid = Math.min(paid, balance.pre2017);
    balance.pre2017 -= prePaid;
    paid -= prePaid;
    const postPaid = Math.min(paid, balance.post2017);
    balance.post2017 -= postPaid;
    paid -= postPaid;
    if (
      paid !== 0 ||
      balance.personal + balance.grandfathered + balance.pre2017 +
          balance.post2017 !== row.closing_balance
    ) return;
    sum.grandfathered += balance.grandfathered;
    sum.pre2017 += balance.pre2017;
    sum.post2017 += balance.post2017;
    sum.total += row.closing_balance;
  }
  const divisor = mixed ? 12 : loan.monthly_records.length;
  return {
    grandfathered: sum.grandfathered / divisor,
    pre2017: sum.pre2017 / divisor,
    post2017: sum.post2017 / divisor,
    total: sum.total / divisor,
  };
}

function additionalLoanCategory(
  review: Review,
  loan: Additional,
  source: Loan,
  secondProperty: string | undefined,
  mainAcquisitionOn: string | undefined,
  secondAcquisitionOn: string | undefined,
): Category | undefined {
  const title = reviewedDocument(loan.title_document);
  const lien = reviewedDocument(loan.lien_document);
  const payment = reviewedDocument(loan.interest_payment_document);
  const occupancy = loan.occupancy_document &&
    reviewedDocument(loan.occupancy_document);
  const history = loan.security_history_document &&
    reviewedDocument(loan.security_history_document);
  const invoice = loan.improvement_invoice_document &&
    reviewedDocument(loan.improvement_invoice_document);
  const improvementPayment = loan.improvement_payment_document &&
    reviewedDocument(loan.improvement_payment_document);
  const date = validDate(source.box3_origination_date);
  const dynamic = date?.getUTCFullYear() === 2025 ||
    loan.payoff_document !== undefined || (loan.advances?.length ?? 0) > 0;
  const normalize = (tin: string) => tin.replaceAll("-", "");
  const ownership = review.married_ownership_evidence;
  const eligible = review.filing_status_verified === "mfj" && ownership
    ? [ownership.taxpayer_tin, ownership.spouse_tin].map(normalize)
    : [ownership?.taxpayer_tin ?? source.recipient_tin ?? ""].map(normalize);
  const secondHome = loan.property_reference !== review.property_reference;
  const ownerTins = title?.owner_tins;
  const borrowerTins = lien?.borrower_tins;
  const personalDates = occupancy?.personal_use_dates;
  if (
    !date || date >= new Date("2026-01-01T00:00:00Z") ||
    (secondHome && secondProperty !== loan.property_reference) ||
    source.box2_outstanding_principal !== loan.opening_2025_principal ||
    source.refinance === true || (source.for_routing ?? "A") !== "A" ||
    source.binding_contract_exception === true ||
    source.dedm_override === true || (source.box6_points_paid ?? 0) !== 0 ||
    !source.recipient_tin || !source.lender_name?.trim() ||
    !source.box1_deduction_workpaper_reference ||
    !eligible.includes(normalize(source.recipient_tin)) ||
    !additionalTimelineValid(loan, source, lien, date) ||
    loan.monthly_records.reduce((sum, row) => sum + row.interest_paid, 0) !==
      source.box1_mortgage_interest ||
    title?.document_type !== "property_title" ||
    title.property_reference !== loan.property_reference ||
    !validDate(title.acquired_on as string) ||
    validDate(title.acquired_on as string)! > date ||
    (!secondHome && title.acquired_on !== mainAcquisitionOn) ||
    (secondHome && title.acquired_on !== secondAcquisitionOn) ||
    !Array.isArray(ownerTins) || ownerTins.length === 0 ||
    !ownerTins.every((tin) => typeof tin === "string" &&
      eligible.includes(normalize(tin))) ||
    !ownerTins.some((tin) => typeof tin === "string" &&
      normalize(tin) === normalize(source.recipient_tin ?? "")) ||
    (review.filing_status_verified === "mfs" &&
      (ownerTins.length !== 1 ||
        title.noncommunity_property_verified !== true)) ||
    lien?.document_type !== "secured_mortgage_note" ||
    lien.property_reference !== loan.property_reference ||
    lien.closing_reference !== loan.closing_reference ||
    lien.source_document_reference !== loan.source_document_reference ||
    lien.lender_name !== source.lender_name ||
    lien.recipient_tin !== source.recipient_tin ||
    lien.principal !== loan.original_principal ||
    loan.opening_2025_principal > loan.original_principal ||
    (date.getUTCFullYear() === 2025 &&
      loan.opening_2025_principal !== loan.original_principal) ||
    lien.secured_on !== source.box3_origination_date ||
    !Array.isArray(borrowerTins) || borrowerTins.length === 0 ||
    !borrowerTins.every((tin) => typeof tin === "string" &&
      eligible.includes(normalize(tin))) ||
    !borrowerTins.some((tin) => typeof tin === "string" &&
      normalize(tin) === normalize(source.recipient_tin ?? "")) ||
    payment?.document_type !== "mortgage_payment_ledger" ||
    payment.property_reference !== loan.property_reference ||
    payment.source_document_reference !== loan.source_document_reference ||
    payment.payer_tin !== source.recipient_tin ||
    JSON.stringify(payment.months) !== JSON.stringify(dynamic
      ? loan.monthly_records.map((row) => ({
        month: row.month,
        opening_balance: row.opening_balance,
        principal_advanced_during_month:
          row.principal_advanced_during_month ?? 0,
        principal_paid_before_month_end: row.principal_paid_before_month_end,
        closing_balance: row.closing_balance,
        interest_paid: row.interest_paid,
        lender_statement_reference: row.lender_statement_reference,
      }))
      : loan.monthly_records.map((row) => ({
        month: row.month,
        interest_paid: row.interest_paid,
        lender_statement_reference: row.lender_statement_reference,
      }))) ||
    (secondHome
      ? occupancy?.document_type !== "second_home_occupancy_calendar" ||
        occupancy.property_reference !== loan.property_reference ||
        occupancy.held_out_for_rent_or_resale !== false ||
        occupancy.fair_rental_days !== 0 ||
        !Array.isArray(personalDates) || personalDates.length === 0 ||
        new Set(personalDates).size !== personalDates.length ||
        !personalDates.every((day) => typeof day === "string" &&
          /^2025-\d{2}-\d{2}$/.test(day) &&
          validDate(`${day.slice(5, 7)}/${day.slice(8, 10)}/2025`))
      : loan.occupancy_document !== undefined)
  ) return;

  if (date <= new Date("1987-10-13T00:00:00Z")) {
    const years = Array.from({ length: 39 }, (_, index) => 1987 + index);
    if (
      lien.incurred_on !== source.box3_origination_date ||
      typeof lien.proceeds_use !== "string" ||
      !lien.proceeds_use.trim() ||
      history?.document_type !== "continuous_mortgage_security_history" ||
      history.property_reference !== loan.property_reference ||
      history.source_document_reference !== loan.source_document_reference ||
      history.secured_on_1987_10_13 !== true ||
      history.uninterrupted_security_verified !== true ||
      history.recorded_instrument_reference !== loan.closing_reference ||
      JSON.stringify(history.secured_years) !== JSON.stringify(years) ||
      loan.improvement_invoice_document !== undefined ||
      loan.improvement_payment_document !== undefined
    ) return;
    return "grandfathered";
  }
  if (
    lien.incurred_on !== source.box3_origination_date ||
    lien.proceeds_use !== "substantial_improvement" ||
    invoice?.document_type !== "contractor_invoice" ||
    invoice.property_reference !== loan.property_reference ||
    typeof invoice.contractor_name !== "string" ||
    !invoice.contractor_name.trim() ||
    typeof invoice.invoice_reference !== "string" ||
    !invoice.invoice_reference.trim() ||
    invoice.amount !== loan.original_principal ||
    invoice.billed_to_tin !== source.recipient_tin ||
    invoice.closing_reference !== loan.closing_reference ||
    typeof invoice.substantial_improvement_description !== "string" ||
    !invoice.substantial_improvement_description.trim() ||
    improvementPayment?.document_type !== "bank_payment" ||
    improvementPayment.property_reference !== loan.property_reference ||
    improvementPayment.amount !== loan.original_principal ||
    improvementPayment.payer_tin !== source.recipient_tin ||
    improvementPayment.payee !== invoice.contractor_name ||
    improvementPayment.invoice_reference !== invoice.invoice_reference ||
    typeof lien.disbursement_reference !== "string" ||
    !lien.disbursement_reference.trim() ||
    typeof improvementPayment.payment_reference !== "string" ||
    !improvementPayment.payment_reference.trim() ||
    improvementPayment.payment_reference !== lien.disbursement_reference ||
    improvementPayment.paid_on !== invoice.completed_on ||
    improvementPayment.paid_on !== lien.secured_on ||
    !validDate(improvementPayment.paid_on as string) ||
    loan.security_history_document !== undefined
  ) return;
  return date < new Date("2017-12-16T00:00:00Z")
    ? "pre2017"
    : "post2017";
}

function validMidmonthRefinanceEvidence(
  review: Review,
  old: Loan,
  fresh: Loan,
  date: string,
  ledger: Record<string, unknown> | undefined,
  closing: Record<string, unknown> | undefined,
  payoff: Record<string, unknown> | undefined,
  oldPoints: Record<string, unknown> | undefined,
): boolean {
  const month = review.refinance_month;
  const lastDay = (m: number) => new Date(Date.UTC(2025, m, 0))
    .toISOString().slice(0, 10);
  const expectedRows = (rows: Review["old_loan_months"], isOld: boolean) =>
    rows.map((row) => {
      const partial = row.month === month;
      const start = `2025-${String(row.month).padStart(2, "0")}-01`;
      return {
        month: row.month,
        period_start_on: partial && !isOld ? date : start,
        period_end_on: partial && isOld ? date : lastDay(row.month),
        interest_paid_on: partial ? date : lastDay(row.month),
        opening_balance: row.opening_balance,
        principal_paid_before_month_end: row.principal_paid_before_month_end,
        closing_balance: row.closing_balance,
        interest_paid: row.interest_paid,
        lender_statement_reference: row.lender_statement_reference,
      };
    });
  return ledger?.document_type === "midmonth_mortgage_payment_ledger" &&
    ledger.property_reference === review.property_reference &&
    ledger.closing_on === date &&
    ledger.owner_tin === old.recipient_tin &&
    ledger.owner_tin === fresh.recipient_tin &&
    ledger.old_source_document_reference === old.source_document_reference &&
    ledger.new_source_document_reference === fresh.source_document_reference &&
    ledger.old_lender_name === old.lender_name &&
    ledger.new_lender_name === fresh.lender_name &&
    JSON.stringify(ledger.old_months) ===
      JSON.stringify(expectedRows(review.old_loan_months, true)) &&
    JSON.stringify(ledger.new_months) ===
      JSON.stringify(expectedRows(review.new_loan_months, false)) &&
    closing?.document_type === "refinance_closing_statement" &&
    closing.property_reference === review.property_reference &&
    closing.closing_reference ===
      review.refinance_closing_disclosure_reference &&
    closing.owner_tin === fresh.recipient_tin &&
    closing.closed_on === date &&
    closing.new_prepaid_interest_paid ===
      review.new_loan_months[0]?.interest_paid &&
    closing.new_prepaid_interest_paid_on === date &&
    typeof closing.new_prepaid_interest_payment_reference === "string" &&
    closing.new_prepaid_interest_payment_reference.trim().length > 0 &&
    JSON.stringify(closing.disbursements) ===
      JSON.stringify(review.closing_disbursements) &&
    payoff?.document_type === "mortgage_payoff_receipt" &&
    payoff.property_reference === review.property_reference &&
    payoff.source_document_reference === old.source_document_reference &&
    payoff.lender_name === old.lender_name &&
    payoff.payer_tin === old.recipient_tin &&
    payoff.payoff_reference === review.old_loan_payoff_reference &&
    payoff.paid_on === date &&
    payoff.principal_paid === review.new_loan_proceeds_to_old_payoff &&
    payoff.interest_paid === review.old_loan_months.at(-1)?.interest_paid &&
    payoff.lender_statement_reference ===
      review.old_loan_months.at(-1)?.lender_statement_reference &&
    oldPoints?.document_type === "original_loan_points_settlement_record" &&
    oldPoints.property_reference === review.property_reference &&
    oldPoints.closing_reference ===
      review.original_acquisition_closing_reference &&
    oldPoints.source_document_reference === old.source_document_reference &&
    oldPoints.lender_name === old.lender_name &&
    oldPoints.owner_tin === old.recipient_tin &&
    oldPoints.settled_on === old.box3_origination_date &&
    oldPoints.total_points_charged === 0;
}

export function validateCashoutRefinanceReview(
  review: Review,
  items: readonly Loan[],
): boolean {
  const old = items.find((item) =>
    item.source_document_reference === review.old_source_document_reference
  );
  const fresh = items.find((item) =>
    item.source_document_reference === review.new_source_document_reference
  );
  const oldDate = validDate(old?.box3_origination_date);
  const newDate = validDate(fresh?.box3_origination_date);
  const month = review.refinance_month;
  const firstDay = `2025-${String(month).padStart(2, "0")}-01`;
  const date = review.refinance_on ?? firstDay;
  const midmonth = date !== firstDay;
  const dated = validIsoDate(date);
  const midmonthLedger = review.midmonth_lender_ledger_document &&
    reviewedDocument(review.midmonth_lender_ledger_document);
  const midmonthClosing = review.midmonth_closing_document &&
    reviewedDocument(review.midmonth_closing_document);
  const midmonthPayoff = review.midmonth_old_payoff_document &&
    reviewedDocument(review.midmonth_old_payoff_document);
  const midmonthOldPoints = review.midmonth_old_points_document &&
    reviewedDocument(review.midmonth_old_points_document);
  const disbursements = review.closing_disbursements;
  const improvement = review.new_loan_proceeds_to_home_improvement ?? 0;
  const hasImprovement = improvement > 0;
  const personalDisbursement = disbursements[hasImprovement ? 2 : 1];
  const improvementDisbursement = hasImprovement ? disbursements[1] : undefined;
  const improvementRows = review.improvement_use_records ?? [];
  const second = review.second_home_loan;
  const secondSource = second && items.find((item) =>
    item.source_document_reference === second.source_document_reference
  );
  const additional = review.additional_qualified_loans ?? [];
  const additionalSources = additional.map((loan) => items.find((item) =>
    item.source_document_reference === loan.source_document_reference
  ));
  const distinctSecondProperties = new Set([
    ...(second ? [second.property_reference] : []),
    ...additional.filter((loan) =>
      loan.property_reference !== review.property_reference
    ).map((loan) => loan.property_reference),
  ]);
  const secondProperty = [...distinctSecondProperties][0];
  const firstSecondTitle = additional.find((loan) =>
    loan.property_reference === secondProperty
  )?.title_document;
  const secondAcquisitionOn = secondSource?.box3_origination_date ??
    (firstSecondTitle && reviewedDocument(firstSecondTitle)?.acquired_on);
  const inventory = review.qualified_home_inventory_document &&
    reviewedDocument(review.qualified_home_inventory_document);
  const expectedInventory = [
    { source_document_reference: review.old_source_document_reference,
      property_reference: review.property_reference },
    { source_document_reference: review.new_source_document_reference,
      property_reference: review.property_reference },
    ...(second ? [{ source_document_reference: second.source_document_reference,
      property_reference: second.property_reference }] : []),
    ...additional.map((loan) => ({
      source_document_reference: loan.source_document_reference,
      property_reference: loan.property_reference,
    })),
  ];
  const married = review.filing_status_verified === "mfs" ||
    review.filing_status_verified === "mfj";
  const ownership = review.married_ownership_evidence;
  const title = ownership &&
    reviewedDocument(ownership.property_title_document);
  const owners = (document: Record<string, unknown> | undefined) =>
    Array.isArray(document?.owner_tins) &&
      document.owner_tins.every((tin) => typeof tin === "string")
      ? document.owner_tins.map((tin: string) =>
        tin.replaceAll("-", "")
      ).sort().join("|")
      : undefined;
  const firstMainTitle = additional.find((loan) =>
    loan.property_reference === review.property_reference
  )?.title_document;
  const mainOwners = owners(title) ??
    (firstMainTitle && owners(reviewedDocument(firstMainTitle)));
  const secondTitle = second?.title_document ?? firstSecondTitle;
  const secondOwners = secondTitle && owners(reviewedDocument(secondTitle));
  const oldAgreement = ownership &&
    reviewedDocument(ownership.old_loan_document);
  const newAgreement = ownership &&
    reviewedDocument(ownership.new_loan_document);
  const payments = ownership &&
    reviewedDocument(ownership.interest_payment_document);
  const normalizeTin = (tin: string) => tin.replaceAll("-", "");
  const taxpayer = ownership && normalizeTin(ownership.taxpayer_tin);
  const spouse = ownership && normalizeTin(ownership.spouse_tin);
  const eligible = review.filing_status_verified === "mfj"
    ? [taxpayer, spouse]
    : [taxpayer];
  const agreementMatches = (
    agreement: Record<string, unknown> | undefined,
    source: Loan | undefined,
    closingReference: string,
  ) =>
    agreement?.document_type === "mortgage_note" &&
    agreement.property_reference === review.property_reference &&
    agreement.closing_reference === closingReference &&
    agreement.source_document_reference === source?.source_document_reference &&
    agreement.lender_name === source?.lender_name &&
    agreement.recipient_tin === source?.recipient_tin &&
    agreement.principal === (source === old
        ? review.original_acquisition_principal
        : source?.box2_outstanding_principal) &&
    Array.isArray(agreement.borrower_tins) &&
    agreement.borrower_tins.length > 0 &&
    agreement.borrower_tins.every((tin) =>
      typeof tin === "string" && eligible.includes(normalizeTin(tin))
    ) &&
    agreement.borrower_tins.some((tin) =>
      typeof tin === "string" &&
      normalizeTin(tin) === normalizeTin(source?.recipient_tin ?? "")
    );
  if (
    items.length !== 2 + (second ? 1 : 0) + additional.length ||
    !old || !fresh || old === fresh ||
    distinctSecondProperties.size > 1 ||
    additional.some((loan) =>
      owners(reviewedDocument(loan.title_document)) !==
        (loan.property_reference === review.property_reference
          ? mainOwners : secondOwners)
    ) ||
    new Set(expectedInventory.map((loan) => loan.source_document_reference))
        .size !== expectedInventory.length ||
    additionalSources.some((source, index) =>
      !source || !additionalLoanCategory(
        review, additional[index], source, secondProperty,
        old?.box3_origination_date,
        secondAcquisitionOn as string | undefined,
      )
    ) ||
    (second
      ? !secondSource || secondSource === old || secondSource === fresh ||
        !validateSecondHomeLoan(review, secondSource)
      : false) ||
    (second || additional.length > 0
      ? inventory?.document_type !== "qualified_home_mortgage_inventory" ||
        inventory.filing_status !== review.filing_status_verified ||
        inventory.no_other_qualified_mortgages_verified !== true ||
        JSON.stringify(inventory.loans) !== JSON.stringify(expectedInventory)
      : review.qualified_home_inventory_document !== undefined) ||
    (married
      ? !ownership || !taxpayer || !spouse || taxpayer === spouse ||
        !eligible.includes(normalizeTin(old.recipient_tin ?? "")) ||
        !eligible.includes(normalizeTin(fresh.recipient_tin ?? "")) ||
        title?.document_type !== "property_title" ||
        title.property_reference !== review.property_reference ||
        !Array.isArray(title.owner_tins) ||
        title.owner_tins.length !==
          (review.filing_status_verified === "mfs" ? 1 : 2) ||
        title.owner_tins.some((tin) =>
          typeof tin !== "string" || !eligible.includes(normalizeTin(tin))
        ) ||
        !title.owner_tins.includes(ownership.taxpayer_tin) ||
        (review.filing_status_verified === "mfj" &&
          !title.owner_tins.includes(ownership.spouse_tin)) ||
        (review.filing_status_verified === "mfs" &&
          title.noncommunity_property_verified !== true) ||
        !agreementMatches(
          oldAgreement,
          old,
          review.original_acquisition_closing_reference,
        ) ||
        !agreementMatches(
          newAgreement,
          fresh,
          review.refinance_closing_disclosure_reference,
        ) ||
        payments?.document_type !== "mortgage_payment_ledger" ||
        payments.property_reference !== review.property_reference ||
        !Array.isArray(payments.loans) || payments.loans.length !== 2 ||
        [old, fresh].some((loan, index) => {
          const ledger = (payments?.loans as Record<string, unknown>[])[index];
          const rows = index === 0
            ? review.old_loan_months
            : review.new_loan_months;
          return !ledger || ledger.source_document_reference !==
              loan.source_document_reference ||
            (typeof ledger.payer_tin !== "string" ||
              !eligible.includes(normalizeTin(ledger.payer_tin))) ||
            !Array.isArray(ledger.months) ||
            JSON.stringify(ledger.months) !==
              JSON.stringify(rows.map((row) => ({
                month: row.month,
                interest_paid: row.interest_paid,
                lender_statement_reference: row.lender_statement_reference,
              })));
        })
      : ownership !== undefined) ||
    review.original_acquisition_property_reference !==
      review.property_reference ||
    review.refinance_property_reference !== review.property_reference ||
    !oldDate || !newDate ||
    oldDate < new Date("2017-12-16T00:00:00Z") ||
    oldDate >= new Date("2025-01-01T00:00:00Z") ||
    newDate.getUTCFullYear() !== 2025 ||
    !dated || dated.getUTCMonth() + 1 !== month ||
    (midmonth
      ? dated.getUTCDate() < 2 ||
        review.closing_on_first_of_month_verified !== undefined ||
        !validMidmonthRefinanceEvidence(
          review, old, fresh, date, midmonthLedger, midmonthClosing,
          midmonthPayoff, midmonthOldPoints,
        )
      : newDate.getUTCDate() !== 1 ||
        review.closing_on_first_of_month_verified !== true ||
        review.midmonth_lender_ledger_document !== undefined ||
        review.midmonth_closing_document !== undefined ||
        review.midmonth_old_payoff_document !== undefined) ||
    (!midmonth && review.midmonth_old_points_document !== undefined) ||
    newDate.getUTCDate() !== dated.getUTCDate() ||
    disbursements.length !== (hasImprovement ? 3 : 2) ||
    disbursements[0].purpose !== "old_acquisition_loan_payoff" ||
    disbursements[0].amount !== review.new_loan_proceeds_to_old_payoff ||
    disbursements[0].payoff_receipt_reference !==
      review.old_loan_payoff_reference ||
    personalDisbursement?.purpose !== "personal_cashout" ||
    personalDisbursement.amount !==
      review.new_loan_proceeds_to_personal_cashout ||
    personalDisbursement.payoff_receipt_reference !== undefined ||
    (hasImprovement
      ? improvementDisbursement?.purpose !== "home_improvement" ||
        improvementDisbursement.amount !== improvement ||
        improvementDisbursement.payoff_receipt_reference !== undefined ||
        review.main_home_substantial_improvement_verified !== true ||
        !review.home_improvement_invoice_ledger_reference ||
        improvementRows.reduce((sum, row) => sum + row.amount, 0) !==
          improvement ||
        improvementRows.some((row) =>
          (() => {
            const invoice = reviewedDocument(
              row.contractor_invoice_document,
            );
            const payment = reviewedDocument(
              row.contractor_payment_document,
            );
            return !invoice || !payment ||
              invoice.document_type !== "contractor_invoice" ||
              invoice.contractor_name !== row.contractor_name ||
              invoice.billed_to_tin !== fresh.recipient_tin ||
              invoice.property_reference !== row.property_reference ||
              invoice.invoice_reference !==
                row.contractor_invoice_reference ||
              invoice.invoice_ledger_reference !==
                row.invoice_ledger_reference ||
              invoice.amount !== row.amount ||
              invoice.completed_on !== row.spent_on ||
              invoice.description !==
                row.substantial_improvement_description ||
              payment.document_type !== "bank_payment" ||
              payment.payer_tin !== fresh.recipient_tin ||
              payment.payee !== row.contractor_name ||
              payment.payment_reference !==
                row.contractor_payment_reference ||
              payment.amount !== row.amount ||
              payment.paid_on !== row.spent_on;
          })() ||
          row.property_reference !== review.property_reference ||
          row.invoice_ledger_reference !==
            review.home_improvement_invoice_ledger_reference ||
          row.contractor_payment_reference !==
            improvementDisbursement.payment_record_reference ||
          row.spent_on !== improvementDisbursement.paid_on ||
          !validDate(
            `${row.spent_on.slice(5, 7)}/${row.spent_on.slice(8, 10)}/2025`,
          ) || row.spent_on < date ||
          row.spent_on.slice(0, 7) !== date.slice(0, 7)
        ) ||
        new Set(improvementRows.map((row) => row.contractor_invoice_reference))
            .size !== improvementRows.length ||
        new Set(improvementRows.map((row) => row.contractor_payment_reference))
            .size !== improvementRows.length
      : improvementRows.length !== 0 ||
        review.home_improvement_invoice_ledger_reference !== undefined ||
        review.main_home_substantial_improvement_verified !== undefined) ||
    disbursements.some((row) => row.paid_on !== date) ||
    new Set(disbursements.map((row) => row.payment_record_reference)).size !==
      disbursements.length ||
    review.cashout_use_records.reduce((sum, row) => sum + row.amount, 0) !==
      review.new_loan_proceeds_to_personal_cashout ||
    review.cashout_use_records.some((row) =>
      row.use_ledger_reference !==
        review.personal_cashout_use_ledger_reference ||
      !validDate(
        `${row.spent_on.slice(5, 7)}/${row.spent_on.slice(8, 10)}/2025`,
      ) ||
      row.spent_on < date
    ) ||
    new Set(review.cashout_use_records.map((row) => row.bank_record_reference))
        .size !== review.cashout_use_records.length ||
    old.box2_outstanding_principal === undefined ||
    old.box2_outstanding_principal > review.original_acquisition_principal ||
    fresh.box2_outstanding_principal !==
      review.new_loan_proceeds_to_old_payoff +
        improvement + review.new_loan_proceeds_to_personal_cashout ||
    old.refinance === true || fresh.refinance !== true ||
    [old, fresh].some((item) =>
      (item.for_routing ?? "A") !== "A" ||
      !item.recipient_tin || !item.lender_name?.trim() ||
      !item.box1_deduction_workpaper_reference ||
      item.binding_contract_exception === true ||
      item.dedm_override === true || (item.box6_points_paid ?? 0) !== 0
    ) ||
    !completeRows(
      review.old_loan_months,
      1,
      midmonth ? month : month - 1,
      old.box2_outstanding_principal,
      midmonth,
    ) ||
    !completeRows(
      review.new_loan_months,
      month,
      12,
      fresh.box2_outstanding_principal,
    ) ||
    (midmonth ? review.old_loan_months.at(-1)?.opening_balance
      : review.old_loan_months.at(-1)?.closing_balance) !==
        review.new_loan_proceeds_to_old_payoff ||
    review.old_loan_months.reduce((sum, row) => sum + row.interest_paid, 0) !==
      old.box1_mortgage_interest ||
    review.new_loan_months.reduce((sum, row) => sum + row.interest_paid, 0) !==
      fresh.box1_mortgage_interest
  ) return false;

  // Pub. 936 repayments extinguish nonacquisition debt before acquisition
  // debt. Keep interest timing independent: lender interest is paid on the
  // month's opening balance while the worksheet uses its closing balance.
  const ratio = cashoutRefinanceRatio(review);
  if (ratio === undefined) return false;
  const expectedTotal = Math.round(
    (old.box1_mortgage_interest + fresh.box1_mortgage_interest +
      (secondSource?.box1_mortgage_interest ?? 0) +
      additionalSources.reduce((sum, source) =>
        sum + (source?.box1_mortgage_interest ?? 0), 0)) * ratio,
  );
  const expectedOld = Math.round(old.box1_mortgage_interest * ratio);
  const expectedMain = Math.round(
    (old.box1_mortgage_interest + fresh.box1_mortgage_interest) * ratio,
  );
  let cumulativeInterest = old.box1_mortgage_interest +
    fresh.box1_mortgage_interest +
    (secondSource?.box1_mortgage_interest ?? 0);
  let cumulativeAllowed = Math.round(cumulativeInterest * ratio);
  const additionalAllocationsValid = additionalSources.every((source) => {
    const priorAllowed = cumulativeAllowed;
    cumulativeInterest += source?.box1_mortgage_interest ?? 0;
    cumulativeAllowed = Math.round(cumulativeInterest * ratio);
    return source?.box1_current_year_deductible_interest ===
      cumulativeAllowed - priorAllowed;
  });
  return old.box1_current_year_deductible_interest === expectedOld &&
    fresh.box1_current_year_deductible_interest === expectedMain - expectedOld &&
    additionalAllocationsValid && cumulativeAllowed === expectedTotal &&
    (secondSource === undefined ||
      secondSource.box1_current_year_deductible_interest ===
        Math.round((old.box1_mortgage_interest +
          fresh.box1_mortgage_interest +
          secondSource.box1_mortgage_interest) * ratio) - expectedMain);
}

/** Pub. 936 Table 1 line 14, only after the complete source review passes. */
export function cashoutRefinanceRatio(review: Review): number | undefined {
  let personal = review.new_loan_proceeds_to_personal_cashout;
  let acquisition = review.new_loan_proceeds_to_old_payoff +
    (review.new_loan_proceeds_to_home_improvement ?? 0);
  let qualifiedNewClosing = 0;
  for (const row of review.new_loan_months) {
    const personalPaid = Math.min(
      personal,
      row.principal_paid_before_month_end,
    );
    personal -= personalPaid;
    acquisition -= row.principal_paid_before_month_end - personalPaid;
    if (acquisition < 0 || acquisition + personal !== row.closing_balance) {
      return undefined;
    }
    qualifiedNewClosing += acquisition;
  }
  const oldAverage = review.old_loan_months.reduce(
    (sum, row) => sum + row.closing_balance,
    0,
  ) / review.old_loan_months.length;
  const newAverage = review.new_loan_months.reduce(
    (sum, row) => sum + row.closing_balance,
    0,
  ) / 12;
  const qualifiedOldAverage = oldAverage;
  // Pub. 936 Example 1 divides mixed-use debt-category balances by twelve,
  // including zero months before closing. The old lender's single-use loan
  // retains its separate months-secured denominator.
  const qualifiedNewAverage = qualifiedNewClosing / 12;
  const secondAverage = review.second_home_loan?.monthly_records.reduce(
    (sum, row) => sum + row.closing_balance, 0,
  ) ?? 0;
  const secondYearAverage = secondAverage / 12;
  const separate = review.filing_status_verified === "mfs";
  let priorAverage = review.second_home_loan?.pre2017_purchase_on
    ? secondYearAverage : 0;
  let postAverage = qualifiedOldAverage + qualifiedNewAverage +
    (review.second_home_loan?.pre2017_purchase_on ? 0 : secondYearAverage);
  let grandfatheredAverage = 0;
  let additionalTotalAverage = 0;
  for (const loan of review.additional_qualified_loans ?? []) {
    const averages = additionalLoanAverages(loan);
    if (!averages) return undefined;
    additionalTotalAverage += averages.total;
    grandfatheredAverage += averages.grandfathered;
    priorAverage += averages.pre2017;
    postAverage += averages.post2017;
  }
  // Table 1 lines 6, 9, 10 and 11. A pre-2017 mortgage can preserve a
  // larger qualified limit without reclassifying the later mixed refinance.
  const line6 = Math.min(
    Math.max(grandfatheredAverage, separate ? 500_000 : 1_000_000),
    grandfatheredAverage + priorAverage,
  );
  const line9 = Math.max(line6, separate ? 375_000 : 750_000);
  const line11 = Math.min(line9, line6 + postAverage);
  const ratio = Math.round(
    line11 / (oldAverage + newAverage + secondYearAverage +
      additionalTotalAverage) * 1000,
  ) / 1000;
  return ratio;
}
