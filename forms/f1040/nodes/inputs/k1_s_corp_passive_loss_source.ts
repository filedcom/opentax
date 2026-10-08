import { z } from "zod";

const reference = z.string().trim().min(1);
const tin = z.string().regex(/^\d{9}$/);
const money = z.number().int().nonnegative().refine(Number.isSafeInteger);
const positiveMoney = money.refine((value) => value > 0);
const currentDate = z.string().date().refine((date) =>
  date.startsWith("2025-")
);
const identity = { shareholder_ssn: tin, corporation_ein: tin };
const months = z.array(
  z.object({
    month: z.number().int().min(1).max(12),
    owner_service_hours: z.literal(0),
    spouse_service_hours: z.literal(0),
    service_record_reference: reference,
  }).strict(),
).length(12);

/** First-year ordinary loss source foundation. This does not admit a filing
 * route or authenticate an issuer, signature, or prior accepted return. */
export const firstYearPassiveSCorpLossSourceSchema = z.object({
  ...identity,
  tax_year: z.literal(2025),
  evidence_kind: z.literal(
    "current_record_contract_not_external_authentication",
  ),
  corporation_name: reference.max(30),
  activity_id: reference.max(64),
  activity_name: reference.max(30),
  organization: z.object({
    corporation_ein: tin,
    formed_on: currentDate,
    trade_started_on: currentDate,
    organization_record_reference: reference,
    activity_statement_reference: reference,
    predecessor_or_preexisting_activity: z.literal(false),
    grouped_with_other_activity: z.literal(false),
    sole_activity: z.literal("domestic_nonrental_ordinary_trade"),
  }).strict(),
  stock_subscription: z.object({
    ...identity,
    stock_register_reference: reference,
    subscription_reference: reference,
    issued_on: currentDate,
    shares_issued: positiveMoney,
    cash_price_per_share: positiveMoney,
    all_outstanding_shares_owned: z.literal(true),
    cash_payment: z.object({
      payer_ssn: tin,
      payee_ein: tin,
      paid_on: currentDate,
      transfer_reference: reference,
      shareholder_bank_reference: reference,
      corporate_bank_reference: reference,
      shareholder_cash_before: money,
      shareholder_cash_after: money,
      corporate_cash_before: z.literal(0),
      corporate_cash_after: money,
      shareholder_bank_debit: positiveMoney,
      corporate_bank_credit: positiveMoney,
      funds_origin: z.literal("unborrowed_personal_cash"),
    }).strict(),
  }).strict(),
  complete_stock_and_at_risk_review: z.object({
    stock_transactions_record_reference: reference,
    debt_inventory_record_reference: reference,
    loss_protection_review_reference: reference,
    no_other_stock_basis_changes: z.literal(true),
    no_shareholder_debt_or_guarantees: z.literal(true),
    no_nonrecourse_or_related_person_funding: z.literal(true),
    no_reimbursement_stop_loss_or_other_protection: z.literal(true),
    no_distributions_or_at_risk_withdrawals: z.literal(true),
    no_prior_basis_at_risk_passive_or_qbi_losses: z.literal(true),
    no_section1367g_election: z.literal(true),
  }).strict(),
  participation: z.object({
    ...identity,
    participation_workpaper_reference: reference,
    marital_status_record_reference: reference,
    spouse: z.union([
      z.object({ status: z.literal("unmarried_all_year") }).strict(),
      z.object({
        status: z.literal("married_same_spouse_all_year"),
        spouse_ssn: tin,
        spouse_participation_record_reference: reference,
      }).strict(),
    ]),
    monthly_service_records: months,
    nonowner_operator: z.object({
      operator_tin: tin,
      service_record_reference: reference,
      annual_service_hours: z.number().int().positive().refine(
        Number.isSafeInteger,
      ),
    }).strict(),
  }).strict(),
  annual_ordinary_tax_account: z.object({
    corporation_ein: tin,
    tax_year: z.literal(2025),
    account_reference: reference,
    accounting_method: z.literal("accrual"),
    taxable_receipts: z.array(
      z.object({
        earned_on: currentDate,
        source_reference: reference,
        taxable_amount: positiveMoney,
      }).strict(),
    ).min(1),
    deductible_incurred_operating_costs: z.array(
      z.object({
        incurred_on: currentDate,
        source_reference: reference,
        deductible_amount: positiveMoney,
      }).strict(),
    ).min(1),
    no_other_ordinary_book_tax_adjustments: z.literal(true),
    no_separately_stated_income_deductions_or_credits: z.literal(true),
  }).strict(),
  issued_k1: z.object({
    ...identity,
    tax_year: z.literal(2025),
    corporation_name: reference.max(30),
    document_reference: reference,
    box1_ordinary_loss: positiveMoney,
    section199a_statement_reference: reference,
    qualified_domestic_non_sstb_ordinary_loss: positiveMoney,
    no_other_qbi_items_or_owner_adjustments: z.literal(true),
  }).strict(),
}).strict();

export type FirstYearPassiveSCorpLossSource = z.infer<
  typeof firstYearPassiveSCorpLossSourceSchema
>;

export interface PassiveSCorpLossK1Facts {
  corporation_ein: string;
  corporation_name: string;
  recipient_tin: string;
  source_document_reference: string;
  box1_ordinary_business: number;
  eic_passive_activity_review: {
    recipient_tin: string;
    box1: "passive";
    activity_statement_reference: string;
    participation_workpaper_reference: string;
  };
}

function total(values: readonly number[]): number {
  const sum = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(sum)) {
    throw Error(
      "Passive S-corporation source total exceeds exact integer arithmetic",
    );
  }
  return sum;
}

/** Apply the basis stage before §465/§469. The unprotected cash stock amount is
 * the only at-risk amount admitted by this source contract. PAL, QBI, Schedule E,
 * and the return/export joins still have to consume these amounts independently. */
export function firstYearPassiveSCorpLossStages(
  raw: unknown,
  k1: PassiveSCorpLossK1Facts,
) {
  const s = firstYearPassiveSCorpLossSourceSchema.parse(raw);
  const o = s.organization,
    stock = s.stock_subscription,
    cash = stock.cash_payment,
    p = s.participation,
    account = s.annual_ordinary_tax_account,
    issued = s.issued_k1,
    review = k1.eic_passive_activity_review;
  if (
    [
      o.corporation_ein,
      stock.corporation_ein,
      cash.payee_ein,
      p.corporation_ein,
      account.corporation_ein,
      issued.corporation_ein,
      k1.corporation_ein,
    ].some((ein) => ein !== s.corporation_ein) ||
    [
      stock.shareholder_ssn,
      cash.payer_ssn,
      p.shareholder_ssn,
      issued.shareholder_ssn,
      k1.recipient_tin,
      review.recipient_tin,
    ]
      .some((ssn) => ssn !== s.shareholder_ssn) ||
    issued.corporation_name !== s.corporation_name ||
    k1.corporation_name !== s.corporation_name ||
    k1.source_document_reference !== issued.document_reference ||
    review.box1 !== "passive" ||
    review.activity_statement_reference !== o.activity_statement_reference ||
    review.participation_workpaper_reference !==
      p.participation_workpaper_reference
  ) {
    throw Error(
      "Passive S-corporation loss source identity/classification does not match its K-1",
    );
  }
  if (
    o.formed_on > stock.issued_on || o.formed_on > o.trade_started_on ||
    stock.issued_on !== cash.paid_on ||
    stock.issued_on > o.trade_started_on ||
    account.taxable_receipts.some((row) =>
      row.earned_on < o.trade_started_on
    ) ||
    account.deductible_incurred_operating_costs.some((row) =>
      row.incurred_on < o.trade_started_on
    )
  ) {
    throw Error(
      "Passive S-corporation first-year stock/activity dates conflict",
    );
  }
  const stockCash = stock.shares_issued * stock.cash_price_per_share;
  if (
    !Number.isSafeInteger(stockCash) ||
    cash.shareholder_bank_debit !== stockCash ||
    cash.corporate_bank_credit !== stockCash ||
    cash.shareholder_cash_before - cash.shareholder_cash_after !== stockCash ||
    cash.corporate_cash_after !== stockCash
  ) {
    throw Error(
      "Passive S-corporation cash stock basis does not reconcile to the bank/share records",
    );
  }
  if (
    p.monthly_service_records.some((row, index) => row.month !== index + 1) ||
    p.nonowner_operator.operator_tin === s.shareholder_ssn ||
    (p.spouse.status === "married_same_spouse_all_year" &&
      (p.spouse.spouse_ssn === s.shareholder_ssn ||
        p.nonowner_operator.operator_tin === p.spouse.spouse_ssn))
  ) {
    throw Error(
      "Passive S-corporation participation needs complete owner/spouse months and a different operator",
    );
  }
  const receipts = total(
    account.taxable_receipts.map((row) => row.taxable_amount),
  );
  const costs = total(
    account.deductible_incurred_operating_costs.map((row) =>
      row.deductible_amount
    ),
  );
  const currentLoss = costs - receipts;
  if (
    !Number.isSafeInteger(k1.box1_ordinary_business) || currentLoss <= 0 ||
    currentLoss !== issued.box1_ordinary_loss ||
    currentLoss !== -k1.box1_ordinary_business ||
    currentLoss !== issued.qualified_domestic_non_sstb_ordinary_loss
  ) {
    throw Error(
      "Passive S-corporation ordinary/QBI loss does not match its complete tax account and issued statements",
    );
  }
  const references = [
    o.organization_record_reference,
    o.activity_statement_reference,
    stock.stock_register_reference,
    stock.subscription_reference,
    cash.transfer_reference,
    cash.shareholder_bank_reference,
    cash.corporate_bank_reference,
    ...Object.entries(s.complete_stock_and_at_risk_review)
      .filter(([key]) => key.endsWith("reference")).map(([, value]) =>
        value as string
      ),
    p.participation_workpaper_reference,
    p.marital_status_record_reference,
    ...(p.spouse.status === "married_same_spouse_all_year"
      ? [p.spouse.spouse_participation_record_reference]
      : []),
    ...p.monthly_service_records.map((row) => row.service_record_reference),
    p.nonowner_operator.service_record_reference,
    account.account_reference,
    ...account.taxable_receipts.map((row) => row.source_reference),
    ...account.deductible_incurred_operating_costs.map((row) =>
      row.source_reference
    ),
    issued.document_reference,
    issued.section199a_statement_reference,
  ];
  if (new Set(references).size !== references.length) {
    throw Error(
      "Passive S-corporation source records need distinct document/transaction references",
    );
  }
  const basisAllowedLoss = Math.min(currentLoss, stockCash);
  return {
    activityId: s.activity_id,
    ownerTin: s.shareholder_ssn,
    corporationEin: s.corporation_ein,
    currentOrdinaryLoss: currentLoss,
    currentStockCashBasis: stockCash,
    basisAllowedLoss,
    basisSuspendedLoss: currentLoss - basisAllowedLoss,
    endingStockBasis: stockCash - basisAllowedLoss,
    atRiskAmountBeforeLoss: stockCash,
    atRiskAllowedLoss: basisAllowedLoss,
    atRiskSuspendedLoss: 0,
    passiveLossBefore8582: basisAllowedLoss,
    qualifiedOrdinaryLossBefore8582: basisAllowedLoss,
    sourceContractReconciled: true as const,
    externalAuthenticationVerified: false as const,
    filingRouteAdmitted: false as const,
  };
}
