import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import {
  assertDistinct1099INTCopies,
  itemSchema as intSchema,
} from "../../nodes/inputs/income/investments/f1099int/index.ts";
import {
  assertDistinct1099DIVCopies,
  itemSchema as divSchema,
} from "../../nodes/inputs/income/investments/f1099div/index.ts";

const ref = z.string().trim().min(1);
const money = z.number().finite().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 100,
);
const tin = z.string().regex(/^\d{9}$/);
export const investmentOwner2026 = z.object({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).transform((s) =>
    s.replaceAll("-", "")
  ),
  spouse_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).transform((s) =>
    s.replaceAll("-", "")
  ).optional(),
}).strict();
type Owner = z.input<typeof investmentOwner2026>;
const date = z.string().date();
const premiumReview = z.object({
  record_reference: ref,
  per_bond_netting_reviewed: z.literal(true),
  taxable_amortization_elected: z.boolean(),
  election_record_reference: ref,
  box1_reporting: z.enum(["gross", "net"]),
  box3_reporting: z.enum(["gross", "net"]),
  box8_reporting: z.enum(["gross", "net"]),
  // Each premium amount belongs to its matching issued box; a net copy cannot
  // be deducted again. An opted-out taxable election needs a gross statement.
  pab_share_of_box13: money,
}).strict();
export const intItem2026Schema = intSchema.omit({
  box1_copy_review: true,
  pab_allocable_deduction_workpaper: true,
  elect_bond_premium_amortization: true,
  pab_review_reference: true,
  pab_eligible_bonds_reviewed: true,
  foreign_tax_irs_country_code: true,
  foreign_tax_source_document_reference: true,
  foreign_source_interest_usd: true,
  investment_property_for_form4952: true,
  nominee_interest: true,
  accrued_interest_paid: true,
  non_taxable_oid_adjustment: true,
}).extend({
  tax_year: z.literal(2026),
  payer_tin: tin,
  recipient_tin: tin,
  source_document_reference: ref,
  source_document_sha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  account_number: ref.max(40),
  box1: money,
  box2: money.default(0),
  box3: money.default(0),
  box4: money.default(0),
  box5: z.literal(0).optional(),
  box6: z.literal(0).optional(),
  box8: money.default(0),
  box9: money.default(0),
  box10: money.default(0),
  box11: money.default(0),
  box12: money.default(0),
  box13: money.default(0),
  box17: money.default(0),
  premium_review: premiumReview.optional(),
  market_discount_review: z.object({
    current_inclusion_election_applies: z.literal(true),
    election_record_reference: ref,
  }).strict().optional(),
  nominee_allocations: z.array(
    z.object({
      owner_tin: tin,
      amount: money.positive(),
      source_record_reference: ref,
    }).strict(),
  ).optional(),
  accrued_interest_purchases: z.array(
    z.object({
      purchase_date: date,
      settlement_reference: ref,
      amount: money.positive(),
    }).strict(),
  ).optional(),
  pab_review: z.object({
    specified_bond_eligibility_reference: ref,
    no_other_allocable_expenses: z.literal(true),
    taxpayer_expense_review_reference: ref,
  }).strict().optional(),
}).strict();
export type IntItem2026 = z.input<typeof intItem2026Schema>;

function owned(ownerRaw: Owner, recipients: string[]) {
  const owner = investmentOwner2026.parse(ownerRaw);
  const allowed = new Set([
    owner.taxpayer_ssn,
    ...(owner.filing_status === FilingStatus.MFJ && owner.spouse_ssn
      ? [owner.spouse_ssn]
      : []),
  ]);
  if (owner.filing_status === FilingStatus.MFJ && !owner.spouse_ssn) {
    throw new Error("Joint investment sources need both owners");
  }
  if (owner.spouse_ssn === owner.taxpayer_ssn) {
    throw new Error("Investment owners need distinct taxpayer and spouse TINs");
  }
  if (recipients.some((tin) => !allowed.has(tin))) {
    throw new Error(
      "Investment recipient must match the taxpayer or joint spouse",
    );
  }
  return allowed;
}
export const investmentSum = (values: number[]) => {
  const cents = values.reduce((n, v) => n + Math.round(v * 100), 0);
  if (!Number.isSafeInteger(cents)) {
    throw new Error("Investment source exceeds cent-precision range");
  }
  return cents / 100;
};

export function reconcileInterest2026(raw: IntItem2026[], owner: Owner) {
  const sources = z.array(intItem2026Schema).min(1).parse(raw);
  const owners = owned(owner, sources.map((i) => i.recipient_tin));
  assertDistinct1099INTCopies(sources);
  assertMoneyPrecision(sources);
  const pab: number[] = [];
  const allocationReferences = new Set<string>();
  const settlementReferences = new Set<string>();
  const normalized = sources.map((item) => {
    if (item.box9 > item.box8) throw new Error("1099-INT box 9 exceeds box 8");
    const review = item.premium_review;
    if ((item.box11 + item.box12 + item.box13 > 0) && !review) {
      throw new Error("Bond premium needs its reporting and election review");
    }
    if (
      review && !review.taxable_amortization_elected &&
      (review.box1_reporting === "net" || review.box3_reporting === "net")
    ) {
      throw new Error(
        "Opted-out premium election needs a gross interest statement",
      );
    }
    const p11 =
      review?.taxable_amortization_elected && review.box1_reporting === "gross"
        ? item.box11
        : 0;
    const p12 =
      review?.taxable_amortization_elected && review.box3_reporting === "gross"
        ? item.box12
        : 0;
    const p13 = review?.box8_reporting === "gross" ? item.box13 : 0;
    if (p11 > item.box1 || p12 > item.box3 || p13 > item.box8) {
      throw new Error(
        "Bond premium exceeds its matching interest box; excess premium needs a carryover review",
      );
    }
    if (item.box10 > 0 && !item.market_discount_review) {
      throw new Error(
        "Market discount needs the current-inclusion election review",
      );
    }
    const nominee = investmentSum(
      (item.nominee_allocations ?? []).map((n) => n.amount),
    );
    const accrued = investmentSum(
      (item.accrued_interest_purchases ?? []).map((n) => n.amount),
    );
    for (const entry of item.accrued_interest_purchases ?? []) {
      if (
        !entry.purchase_date.startsWith("2026-") ||
        settlementReferences.has(entry.settlement_reference)
      ) {
        throw new Error(
          "Accrued-interest purchases need distinct 2026 settlement records",
        );
      }
      settlementReferences.add(entry.settlement_reference);
    }
    for (const entry of item.nominee_allocations ?? []) {
      if (
        owners.has(entry.owner_tin) ||
        allocationReferences.has(entry.source_record_reference)
      ) {
        throw new Error(
          "Nominee interest needs a distinct outside owner and allocation record",
        );
      }
      allocationReferences.add(entry.source_record_reference);
    }
    if (
      nominee > 0 &&
      (item.box2 > 0 || item.box4 > 0 || item.box8 > 0 || item.box10 > 0 ||
        item.box11 > 0 || item.box12 > 0 || item.box17 > 0)
    ) {
      throw new Error(
        "Nominee penalties, withholding, exempt interest, market discount or premium need separate ownership allocations",
      );
    }
    const gross = investmentSum([item.box1, item.box3, item.box10]);
    if (investmentSum([p11, p12, nominee, accrued]) > gross) {
      throw new Error("Interest adjustments exceed the reported income");
    }
    if (item.box9 > 0 && !item.pab_review) {
      throw new Error(
        "PAB interest needs bond eligibility and expense reviews",
      );
    }
    const pabPremium = review?.pab_share_of_box13 ?? 0;
    if (
      pabPremium > item.box13 ||
      (review?.box8_reporting !== "net" && pabPremium > item.box9)
    ) throw new Error("PAB premium allocation exceeds its source boxes");
    if (
      review?.box8_reporting === "gross" &&
      investmentSum([item.box13, -pabPremium]) >
        investmentSum([item.box8, -item.box9])
    ) throw new Error("Non-PAB premium allocation exceeds non-PAB interest");
    if (item.box17 > 0 && (!item.box15?.trim() || !item.box16?.trim())) {
      throw new Error(
        "State withholding needs its state and payer state identifier",
      );
    }
    if (pabPremium > 0 && !item.pab_review) {
      throw new Error("PAB premium needs bond eligibility and expense reviews");
    }
    // If box 8/9 are already net, their reviewed premium is not subtracted twice.
    pab.push(item.box9 - (review?.box8_reporting === "gross" ? pabPremium : 0));
    const {
      tax_year: _year,
      premium_review: _premium,
      market_discount_review: _market,
      nominee_allocations: _nominees,
      accrued_interest_purchases: _purchases,
      pab_review: _pab,
      ...copy
    } = item;
    return {
      ...copy,
      box11: p11,
      box12: p12,
      box13: p13,
      elect_bond_premium_amortization: true,
      nominee_interest: nominee,
      accrued_interest_paid: accrued,
    };
  });
  return { sources, normalized, pabInterest: investmentSum(pab) };
}

const holding = z.object({
  distribution_reference: ref,
  amount: money.positive(),
  ex_dividend_date: date,
  acquisition_date: date,
  disposition_date: date.optional(),
  held_through: date,
  preferred_dividend_period_over_366_days: z.boolean(),
  diminished_risk_periods: z.array(
    z.object({ from: date, through: date }).strict(),
  ),
  eligible_issuer_and_no_disqualified_dividend: z.boolean(),
  related_payment_obligation: z.boolean(),
  brokerage_record_reference: ref,
}).strict();
export const divItem2026Schema = divSchema.innerType().omit({
  qualified_dividend_filing_review: true,
  nominee_distribution: true,
  investment_property_for_form4952: true,
  foreign_tax_holding_review: true,
  section199a_holding_review: true,
  foreign_tax_irs_country_code: true,
  foreign_source_dividends_usd: true,
  foreign_source_qualified_dividends_usd: true,
  holdingPeriodDays: true,
}).extend({
  tax_year: z.literal(2026),
  payerName: ref,
  payerTin: tin,
  recipient_tin: tin,
  source_document_reference: ref,
  source_document_sha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  account_number: ref.max(40),
  isNominee: z.literal(false),
  box1a: money,
  box1b: money.default(0),
  box2a: money.default(0),
  box2b: z.literal(0).optional(),
  box2c: z.literal(0).optional(),
  box2d: z.literal(0).optional(),
  box2e: z.literal(0).optional(),
  box2f: z.literal(0).optional(),
  box3: z.literal(0).optional(),
  box4: money.default(0),
  box5: z.literal(0).optional(),
  box6: z.literal(0).optional(),
  box7: z.literal(0).optional(),
  box9: z.literal(0).optional(),
  box10: z.literal(0).optional(),
  box12: money.default(0),
  box13: money.default(0),
  box16: money.default(0),
  qualified_distribution_lots: z.array(holding).optional(),
}).strict();
export type DivItem2026 = z.input<typeof divItem2026Schema>;

/** Count actual qualified holding days, excluding acquisition and diminished risk. */
function qualifiedDistribution(lot: z.infer<typeof holding>) {
  const day = (s: string) => Date.parse(s + "T00:00:00Z") / 86400000;
  const ex = day(lot.ex_dividend_date), acquired = day(lot.acquisition_date);
  const end = day(lot.disposition_date ?? lot.held_through);
  if (
    acquired > end || day(lot.held_through) < end ||
    !lot.ex_dividend_date.startsWith("2026-")
  ) {
    throw new Error(
      "Dividend lot dates do not reconcile with 2026 distribution/holding records",
    );
  }
  const halfWindow = lot.preferred_dividend_period_over_366_days ? 90 : 60;
  if (acquired >= ex || end < ex) {
    throw new Error(
      "Dividend lot must be owned before and through its ex-dividend date",
    );
  }
  const excluded = new Set<number>();
  for (const risk of lot.diminished_risk_periods) {
    const start = day(risk.from), finish = day(risk.through);
    if (start > finish || start < acquired || finish > end) {
      throw new Error(
        "Diminished-risk dates exceed the reviewed holding period",
      );
    }
    for (
      let d = Math.max(start, ex - halfWindow);
      d <= Math.min(finish, ex + halfWindow);
      d++
    ) {
      if (excluded.has(d)) {
        throw new Error("Overlapping diminished-risk periods");
      }
      excluded.add(d);
    }
  }
  let days = 0;
  for (
    let d = Math.max(acquired + 1, ex - halfWindow);
    d <= Math.min(end, ex + halfWindow);
    d++
  ) if (!excluded.has(d)) days++;
  if (
    days <= halfWindow && !lot.disposition_date && end < ex + halfWindow &&
    lot.eligible_issuer_and_no_disqualified_dividend &&
    !lot.related_payment_obligation
  ) {
    throw new Error(
      "Dividend holding review is incomplete; the qualifying window is still open",
    );
  }
  return {
    ...lot,
    qualified_days: days,
    qualified_amount:
      days > halfWindow && lot.eligible_issuer_and_no_disqualified_dividend &&
        !lot.related_payment_obligation
        ? lot.amount
        : 0,
  };
}
export function reconcileDividends2026(raw: DivItem2026[], owner: Owner) {
  const sources = z.array(divItem2026Schema).min(1).parse(raw);
  owned(owner, sources.map((i) => i.recipient_tin));
  // Legacy validation accepts its dated review only in 2025; none is injected.
  assertDistinct1099DIVCopies(sources);
  assertMoneyPrecision(sources);
  const lots: (ReturnType<typeof qualifiedDistribution> & {
    source_document_reference: string;
  })[] = [];
  const normalized = sources.map((item) => {
    if (item.box1b > item.box1a || item.box13 > item.box12) {
      throw new Error("Dividend sub-box exceeds its parent box");
    }
    if (item.box13 > 0 && !item.pab_dividend_review) {
      throw new Error("PAB dividends need fund and taxpayer expense reviews");
    }
    if (
      item.pab_dividend_review &&
      !date.safeParse(item.pab_dividend_review.reviewed_on).success
    ) throw new Error("Invalid PAB review date");
    const rows = item.qualified_distribution_lots ?? [];
    if (
      new Set(rows.map((r) => r.distribution_reference)).size !== rows.length ||
      investmentSum(rows.map((r) => r.amount)) !== item.box1b
    ) {
      throw new Error(
        "Qualified distribution lots must reconcile exactly once to issued box 1b",
      );
    }
    const reviewed = rows.map(qualifiedDistribution);
    lots.push(
      ...reviewed.map((lot) => ({
        ...lot,
        source_document_reference: item.source_document_reference,
      })),
    );
    if (item.box16 > 0 && (!item.box14?.trim() || !item.box15?.trim())) {
      throw new Error(
        "State withholding needs its state and payer state identifier",
      );
    }
    const { tax_year: _year, qualified_distribution_lots: _lots, ...copy } =
      item;
    return {
      ...copy,
      box1b: investmentSum(reviewed.map((r) => r.qualified_amount)),
    };
  });
  return {
    sources,
    normalized,
    lots,
    pabInterest: investmentSum(sources.map((i) => i.box13)),
  };
}

/** Reject fractional cents and individually unrepresentable source amounts. */
function assertMoneyPrecision(value: unknown): void {
  if (typeof value === "number") {
    const cents = Math.round(value * 100);
    if (
      !Number.isSafeInteger(cents) || Math.abs(value - cents / 100) > 0.00000001
    ) throw new Error("Investment money must be representable in whole cents");
  } else if (Array.isArray(value)) {
    value.forEach(assertMoneyPrecision);
  } else if (value && typeof value === "object") {
    Object.values(value).forEach(assertMoneyPrecision);
  }
}
