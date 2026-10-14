import { z } from "zod";
import { PDFDocument, PDFTextField } from "pdf-lib";
import {
  calculatePriorProducingMining2024,
  charitableNaturalResourceDocumentFields,
  priorProducingMining2024SourceSchema,
} from "./natural-resource-source.ts";
import { scheduleSELines } from "../../../../intermediate/forms/taxes/self-employment/schedule_se/calculation.ts";

const ref = z.string().trim().min(1);
const money = z.number().finite().nonnegative();
const ssn = z.string().regex(/^\d{9}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
});
const issuedW2 = z.object({
  tax_year: z.union([z.literal(2024), z.literal(2025)]),
  source_document_reference: ref,
  employee_ssn: ssn,
  employee_name: ref,
  employer_ein: z.string().regex(/^\d{9}$/),
  employer_name: ref,
  box1_wages: money,
  box3_ss_wages: money,
  box4_ss_withheld: money,
  box5_medicare_wages: money,
  box6_medicare_withheld: money,
}).strict();
const cashReceipt = z.object({
  source_document_reference: ref,
  donor_ssn: ssn,
  paid_on: date,
  amount: money.positive(),
  donee_name: ref,
  donee_ein: z.string().regex(/^\d{9}$/),
  fifty_percent_organization_record_reference: ref,
  contemporaneous_acknowledgment_reference: ref,
  bank_payment_record_reference: ref,
}).strict();
const stockGift = z.object({
  contribution_id: ref,
  source_document_reference: ref,
  donor_ssn: ssn,
  donated_on: date,
  acquired_on: date,
  ticker: z.string().regex(/^[A-Z][A-Z0-9.-]{0,9}$/),
  shares: money.positive(),
  acquisition_cost_per_share: money,
  donation_date_quoted_price_per_share: money.positive(),
  issued_acquisition_record_reference: ref,
  donation_transfer_record_reference: ref,
  published_exchange_quote_record_reference: ref,
  donee_name: ref,
  donee_ein: z.string().regex(/^\d{9}$/),
  fifty_percent_organization_record_reference: ref,
  no_returnwide_capital_gain_reduction_election: z.literal(true),
}).strict();
const record = z.object({
  source_reference: ref,
  file_name: ref,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
const regularAccount = z.object({
  tax_year: z.literal(2024),
  owner_ssn: ssn,
  contribution_id: ref,
  return_record_reference: ref,
  schedule_c_profit: z.number().finite(),
  schedule_se_line12: money.int(),
  schedule_se_line13: money.int(),
  form1040_line11_agi: z.number().finite(),
  schedule_a_line12_noncash: money.int(),
  original_charitable_claim: money,
  raw_current_allowed: money,
  raw_carry_to_2025: money,
}).strict();
const amtAccount = z.object({
  tax_year: z.literal(2024),
  owner_ssn: ssn,
  contribution_id: ref,
  retained_amt_workpaper_reference: ref,
  adjusted_basis: money,
  original_charitable_claim: money,
  raw_current_allowed: money,
  raw_carry_to_2025: money,
  form6251_line2q_mining_costs: z.number().int(),
  form6251_line2d_depletion: z.number().int(),
  form6251_line3_charitable_adjustment: z.number().int(),
}).strict();

/** Calculation/history prerequisite only. This has no acceptance flag and is
 * not consumed by current native/PDF exports. Reviewed bytes do not authenticate
 * a prior filing or its connection to an accepted submission. */
export const priorMiningCharityHistorySchema = z.object({
  contribution_id: ref,
  owner_ssn: ssn,
  prior_mining_source: priorProducingMining2024SourceSchema,
  issued_2024_w2: z.array(issuedW2).min(1),
  complete_prior_income_and_gift_inventory_record_reference: ref,
  only_owned_mine_and_issued_wages_in_prior_income: z.literal(true),
  sole_prior_charitable_gift_and_no_older_carryovers: z.literal(true),
  single_full_year_itemizing_no_nol_or_status_change: z.literal(true),
  regular_return_account: regularAccount,
  amt_workpaper_account: amtAccount,
  regular_return_account_record: record,
  amt_workpaper_account_record: record,
}).strict();
export const currentMiningCarryConsumptionSchema = z.object({
  tax_year: z.literal(2025),
  owner_ssn: ssn,
  issued_w2: z.array(issuedW2).min(1),
  cash_receipts: z.array(cashReceipt),
  current_capital_gain_stock_gifts: z.array(stockGift),
  complete_current_income_and_gift_inventory_record_reference: ref,
  only_issued_wages_in_current_income: z.literal(true),
  no_other_charitable_contributions_or_prior_carryovers: z.literal(true),
  original_mine_owned_interest_terminated_in_2024: z.literal(true),
  single_full_year_itemizing_no_nol_or_status_change: z.literal(true),
}).strict();
const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
    ? Object.fromEntries(
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map((
        [k, v],
      ) => [k, canonical(v)]),
    )
    : value;
const same = (a: unknown, b: unknown, label: string) => {
  if (JSON.stringify(canonical(a)) !== JSON.stringify(canonical(b))) {
    throw new Error(label);
  }
};
function wageAmounts(
  rows: z.infer<typeof issuedW2>[],
  year: 2024 | 2025,
  owner: string,
) {
  const references = new Set<string>(), employers = new Set<string>();
  for (const row of rows) {
    const base = year === 2024 ? 168600 : 176100;
    if (
      row.tax_year !== year || row.employee_ssn !== owner ||
      references.has(row.source_document_reference) ||
      employers.has(row.employer_ein) ||
      row.box3_ss_wages > base || row.box3_ss_wages > row.box5_medicare_wages ||
      row.box4_ss_withheld !== cents(row.box3_ss_wages * .062) ||
      row.box6_medicare_withheld !== cents(
          row.box5_medicare_wages * .0145 +
            Math.max(0, row.box5_medicare_wages - 200000) * .009,
        )
    ) {
      throw new Error(
        "Prior/current charity issued W2 year/owner/identity/withholding conflict",
      );
    }
    references.add(row.source_document_reference);
    employers.add(row.employer_ein);
  }
  return {
    wages: rows.reduce((sum, row) => sum + row.box1_wages, 0),
    ss_wages: rows.reduce((sum, row) => sum + row.box3_ss_wages, 0),
  };
}
export function calculatePriorMiningCharityHistory(raw: unknown) {
  const history = priorMiningCharityHistorySchema.parse(raw);
  const mine = history.prior_mining_source;
  if (
    mine.donor_ssn !== history.owner_ssn || mine.proprietor_recipient !== "T"
  ) {
    throw new Error(
      "Prior mining charitable source differs from actual return owner",
    );
  }
  const calc = calculatePriorProducingMining2024(mine);
  if (
    mine.annual_records.some((row) =>
      row.other_deductible_property_expenses !== 0
    )
  ) {
    throw new Error(
      "Prior mineral income account needs separately sourced other paid expense records",
    );
  }
  if (
    history.issued_2024_w2.some((row) => row.employee_name !== mine.donor_name)
  ) {
    throw new Error("Prior mining issued W2 name differs from owned donor");
  }
  const issued = wageAmounts(history.issued_2024_w2, 2024, history.owner_ssn);
  // Reconcile actual filed ScheduleC income/expense lines before ScheduleSE
  // and AGI. The original received source amounts remain unchanged in history.
  const profit = Math.round(mine.annual_records.at(-1)!.gross_property_income) -
    Math.round(calc.current_year.deduction) -
    Math.round(calc.current_year.depletion);
  if (profit <= 0) {
    throw new Error(
      "Prior mining charity income history needs positive source-owned profit",
    );
  }
  const se = scheduleSELines({
    net_profit_schedule_c: profit,
    w2_ss_wages: Math.round(issued.ss_wages),
  }, 168600)!;
  const agi = Math.round(issued.wages) + profit - se.line13;
  const regularCategory = calc.hypothetical_gain > calc.ordinary_gain
    ? "capital_gain_30"
    : "noncash_50";
  const amtCategory =
    Math.max(0, calc.fmv - calc.amt_adjusted_basis!) > calc.amt_ordinary_gain!
      ? "capital_gain_30"
      : "noncash_50";
  const allowed = (claim: number, category: string) =>
    Math.min(
      claim,
      Math.max(0, agi) * (category === "capital_gain_30" ? .3 : .5),
    );
  const regularAllowed = cents(
    allowed(calc.deduction_claimed, regularCategory),
  );
  const amtAllowed = cents(allowed(calc.amt_deduction_claimed!, amtCategory));
  const regularCarry = cents(calc.deduction_claimed - regularAllowed);
  const amtCarry = cents(calc.amt_deduction_claimed! - amtAllowed);
  same(
    history.regular_return_account,
    {
      tax_year: 2024,
      owner_ssn: history.owner_ssn,
      contribution_id: history.contribution_id,
      return_record_reference:
        history.regular_return_account.return_record_reference,
      schedule_c_profit: profit,
      schedule_se_line12: se.line12,
      schedule_se_line13: se.line13,
      form1040_line11_agi: agi,
      schedule_a_line12_noncash: Math.round(regularAllowed),
      original_charitable_claim: calc.deduction_claimed,
      raw_current_allowed: regularAllowed,
      raw_carry_to_2025: regularCarry,
    },
    "Prior regular filed account differs from actual owned income/gift source",
  );
  same(
    history.amt_workpaper_account,
    {
      tax_year: 2024,
      owner_ssn: history.owner_ssn,
      contribution_id: history.contribution_id,
      retained_amt_workpaper_reference:
        history.amt_workpaper_account.retained_amt_workpaper_reference,
      adjusted_basis: calc.amt_adjusted_basis!,
      original_charitable_claim: calc.amt_deduction_claimed!,
      raw_current_allowed: amtAllowed,
      raw_carry_to_2025: amtCarry,
      form6251_line2q_mining_costs: Math.round(
        calc.amt_mining_cost_adjustment!,
      ),
      form6251_line2d_depletion: Math.round(
        calc.current_year.depletion - calc.current_year.amt_allowed_depletion!,
      ),
      form6251_line3_charitable_adjustment: Math.round(regularAllowed) -
        Math.round(amtAllowed),
    },
    "Prior retained AMT account differs from independently refigured owned gift source",
  );
  return {
    history,
    calc,
    profit,
    se,
    agi,
    regularCategory,
    amtCategory,
    regularAllowed,
    amtAllowed,
    regularCarry,
    amtCarry,
  };
}

export async function bindPriorMiningCharityHistory(
  raw: unknown,
  records: ReadonlyMap<string, Uint8Array>,
) {
  const result = calculatePriorMiningCharityHistory(raw), h = result.history;
  if (
    h.regular_return_account_record.source_reference !==
      h.regular_return_account.return_record_reference ||
    h.amt_workpaper_account_record.source_reference !==
      h.amt_workpaper_account.retained_amt_workpaper_reference
  ) {
    throw new Error(
      "Prior regular/AMT retained source references differ from their account records",
    );
  }
  const references = new Set<string>(),
    files = new Set<string>(),
    digests = new Set<string>();
  for (
    const [record, account] of [
      [h.regular_return_account_record, h.regular_return_account],
      [h.amt_workpaper_account_record, h.amt_workpaper_account],
    ] as const
  ) {
    if (
      references.has(record.source_reference) || files.has(record.file_name) ||
      digests.has(record.sha256)
    ) {
      throw new Error(
        "Prior regular and AMT records require distinct retained source identities",
      );
    }
    references.add(record.source_reference);
    files.add(record.file_name);
    digests.add(record.sha256);
    const bytes = records.get(record.file_name);
    if (!bytes) throw new Error("Prior regular/AMT account bytes missing");
    const hash = [
      ...new Uint8Array(
        await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer),
      ),
    ].map((v) => v.toString(16).padStart(2, "0")).join("");
    if (hash !== record.sha256) {
      throw new Error("Prior regular/AMT retained account bytes changed");
    }
    same(
      JSON.parse(new TextDecoder().decode(bytes)),
      account,
      "Retained prior account content differs from reviewed source fields",
    );
  }
  const mine = h.prior_mining_source;

  for (const [index, source] of mine.retained_source_documents.entries()) {
    if (
      files.has(source.attachment_file_name) ||
      references.has(source.source_reference) || digests.has(source.pdf_sha256)
    ) {
      throw new Error(
        "Prior mine/account records require distinct retained source identities",
      );
    }
    files.add(source.attachment_file_name);
    references.add(source.source_reference);
    digests.add(source.pdf_sha256);
    const bytes = records.get(source.attachment_file_name);
    if (!bytes) {
      throw new Error(
        "Prior owned purchase/annual/operation account bytes missing",
      );
    }
    const hash = [
      ...new Uint8Array(
        await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer),
      ),
    ].map((v) => v.toString(16).padStart(2, "0")).join("");
    if (hash !== source.pdf_sha256) {
      throw new Error("Prior owned mine retained account bytes changed");
    }
    const pdf = await PDFDocument.load(bytes),
      fields = pdf.getForm().getFields();
    const actual = Object.fromEntries(fields.map((field) => {
      if (!(field instanceof PDFTextField)) {
        throw new Error(
          "Prior owned source account must retain canonical text fields",
        );
      }
      return [field.getName(), field.getText() ?? ""];
    }));
    same(
      actual,
      charitableNaturalResourceDocumentFields(mine, index, 2024),
      "Prior owned PDF canonical account content differs from source inventory",
    );
  }
  return { ...result, filing_authority: "unverified_no_export" as const };
}

export async function calculateReviewedMiningCarryConsumption(
  history: unknown,
  retainedRecords: ReadonlyMap<string, Uint8Array>,
  rawCurrent: unknown,
) {
  const prior = await bindPriorMiningCharityHistory(history, retainedRecords);
  const current = currentMiningCarryConsumptionSchema.parse(rawCurrent);
  if (current.owner_ssn !== prior.history.owner_ssn) {
    throw new Error("Current carry belongs to a different owner");
  }
  if (
    current.issued_w2.some((row) =>
      row.employee_name !== prior.history.prior_mining_source.donor_name
    )
  ) {
    throw new Error("Current issued W2 name differs from carried gift owner");
  }
  const issued = wageAmounts(current.issued_w2, 2025, current.owner_ssn);
  const agi = Math.round(issued.wages);
  const references = new Set<string>(),
    paymentReferences = new Set<string>(),
    contributionIds = new Set<string>();
  for (const row of current.cash_receipts) {
    if (
      row.donor_ssn !== current.owner_ssn || !row.paid_on.startsWith("2025-") ||
      references.has(row.source_document_reference) ||
      paymentReferences.has(row.bank_payment_record_reference)
    ) {
      throw new Error(
        "Current charitable cash source year/owner/identity conflict",
      );
    }
    references.add(row.source_document_reference);
    paymentReferences.add(row.bank_payment_record_reference);
  }
  const stockClaims = current.current_capital_gain_stock_gifts.map((row) => {
    const anniversary = `${Number(row.acquired_on.slice(0, 4)) + 1}${
      row.acquired_on.slice(4)
    }`;
    if (
      row.donor_ssn !== current.owner_ssn ||
      !row.donated_on.startsWith("2025-") || row.donated_on <= anniversary ||
      references.has(row.source_document_reference) ||
      contributionIds.has(row.contribution_id) ||
      paymentReferences.has(row.donation_transfer_record_reference) ||
      row.donation_date_quoted_price_per_share <= row.acquisition_cost_per_share
    ) {
      throw new Error(
        "Current owned capital-gain stock source year/holding/owner/identity conflict",
      );
    }
    references.add(row.source_document_reference);
    contributionIds.add(row.contribution_id);
    paymentReferences.add(row.donation_transfer_record_reference);
    return cents(row.shares * row.donation_date_quoted_price_per_share);
  });
  const sourceCash = cents(
    current.cash_receipts.reduce((sum, row) => sum + row.amount, 0),
  );
  const cashAllowed = cents(Math.min(sourceCash, Math.max(0, agi) * .6));
  const currentStockClaim = cents(
    stockClaims.reduce((sum, value) => sum + value, 0),
  );
  const capitalAvailable = Math.max(
    0,
    Math.min(agi * .3, agi * .5 - sourceCash),
  );
  const account = (category: string, carry: number) => {
    // Pub526: current gifts consume their category capacity before its carry;
    // ordinary50% gifts/carry consume capacity before capital-gain30% gifts.
    const ordinaryCarryUsed = category === "noncash_50"
      ? cents(Math.min(carry, Math.max(0, agi * .5 - cashAllowed)))
      : 0;
    const stockAllowed = cents(
      Math.min(
        currentStockClaim,
        Math.max(
          0,
          Math.min(
            capitalAvailable,
            agi * .5 - cashAllowed - ordinaryCarryUsed,
          ),
        ),
      ),
    );
    const capitalCarryUsed = category === "capital_gain_30"
      ? cents(
        Math.min(
          carry,
          Math.max(
            0,
            Math.min(
              agi * .3 - stockAllowed,
              agi * .5 - cashAllowed - stockAllowed,
            ),
          ),
        ),
      )
      : 0;
    const carryUsed = cents(ordinaryCarryUsed + capitalCarryUsed);
    return {
      cash_allowed: cashAllowed,
      current_noncash_allowed: stockAllowed,
      prior_noncash_allowed: carryUsed,
      remaining_prior_carry: cents(carry - carryUsed),
      current_cash_carry: cents(sourceCash - cashAllowed),
      current_capital_gain_carry: cents(currentStockClaim - stockAllowed),
    };
  };
  const regular = account(prior.regularCategory, prior.regularCarry);
  const amt = account(prior.amtCategory, prior.amtCarry);
  const filed = (a: typeof regular) =>
    Math.round(a.cash_allowed) + Math.round(a.current_noncash_allowed) +
    Math.round(a.prior_noncash_allowed);
  return {
    filing_authority: "unverified_no_export" as const,
    tax_year: 2025,
    owner_ssn: current.owner_ssn,
    contribution_id: prior.history.contribution_id,
    contribution_year: 2024,
    agi,
    prior,
    regular,
    amt,
    line3_charitable_contribution_adjustment: filed(regular) - filed(amt),
    schedule_a_line11: Math.round(regular.cash_allowed),
    schedule_a_line12: Math.round(regular.current_noncash_allowed),
    schedule_a_line13: Math.round(regular.prior_noncash_allowed),
    amt_schedule_a_line11: Math.round(amt.cash_allowed),
    amt_schedule_a_line12: Math.round(amt.current_noncash_allowed),
    amt_schedule_a_line13: Math.round(amt.prior_noncash_allowed),
  };
}
