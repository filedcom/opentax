import { z } from "zod";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import {
  type AtLeastOne,
  TaxNode,
} from "../../../../../../core/types/tax-node.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { agi_aggregator } from "../agi_aggregator/index.ts";
import { form8960 } from "../../forms/form8960/index.ts";
import { normalizeArray } from "../../../utils.ts";
import { scheduleBFilingRequired } from "../../../../schedule_b_filing.ts";
import { sellerFinancedBuyerSchema } from "../../../../seller_financed_buyer.ts";

// ─── Schemas ─────────────────────────────────────────────────────────────────

// Executor accumulation pattern: multiple upstream NodeOutputs deposit fields
// that accumulate from scalar to array as each payer entry arrives.
const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]);

const interestDetailSchema = z.object({
  payer_name: z.string().min(1),
  gross: z.number().nonnegative(),
  net: z.number().nonnegative(),
  nominee: z.number().nonnegative(),
  accrued: z.number().nonnegative(),
  oid_adjustment: z.number().nonnegative(),
  bond_premium: z.number().nonnegative(),
  seller_financed_buyer: sellerFinancedBuyerSchema.optional(),
});

const dividendDetailSchema = z.object({
  payer_name: z.string().min(1),
  gross: z.number().nonnegative(),
  net: z.number().nonnegative(),
  nominee: z.number().nonnegative(),
});

export const foreignCountrySchema = z.object({
  irs_code: z.string().regex(/^[A-Z]{2}$/),
  name: z.string().min(1).max(90),
});

export const inputSchema = z.object({
  // ── Part I: Interest (from f1099int, one entry per payer) ──────────────────
  // Net taxable interest per payer (box1+box3+box10 - adjustments)
  taxable_interest_net: accumulable(z.number()).optional(),
  interest_detail: accumulable(interestDetailSchema).optional(),
  // Payer names (informational — not used in calculation, but part of schema)
  payer_name: accumulable(z.string()).optional(),
  // US obligations interest (EE/I bonds) — used for Form 8815 exclusion (line 3)
  box3_us_obligations: accumulable(z.number().nonnegative()).optional(),
  // Excludable EE/I bond interest (Form 8815 line 14) → Schedule B line 3
  ee_bond_exclusion: z.number().nonnegative().optional(),
  // ── Part II: Dividends (from f1099div, one entry per payer when needed) ────
  // Ordinary dividends per payer (box1a); nominee amounts already excluded upstream
  ordinaryDividends: accumulable(z.number().nonnegative()).optional(),
  dividend_detail: accumulable(dividendDetailSchema).optional(),
  // Dividend rows already routed directly to Form 1040 by their source node.
  // They become relevant when another source pushes the combined total above
  // the Schedule B filing threshold; they must not be routed twice.
  dividend_info: z.array(z.object({
    payerName: z.string(),
    amount: z.number().nonnegative(),
  })).optional(),
  form8814_dividends: z.number().nonnegative().optional(),
  // Payer names for dividends (informational)
  payerName: accumulable(z.string()).optional(),
  // Nominee flags (informational — f1099div already nets nominee amounts)
  isNominee: accumulable(z.boolean()).optional(),
  // Part III facts are explicit. A child's Form 8814 can make the answer Yes,
  // but FBAR filing status must still be supplied by the taxpayer.
  foreign_accounts_question: z.boolean().optional(),
  fincen_form114_required: z.boolean().optional(),
  foreign_countries: z.array(foreignCountrySchema).max(25).optional(),
  foreign_trust_question: z.boolean().optional(),
  form8814_foreign_account: z.boolean().optional(),
  form8814_foreign_trust: z.boolean().optional(),
});

type ScheduleBInput = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Part I — Line 2: sum all per-payer taxable interest amounts
function totalTaxableInterest(input: ScheduleBInput): number {
  return normalizeArray(input.taxable_interest_net)
    .reduce((sum, n) => sum + n, 0) +
    normalizeArray(input.interest_detail).reduce(
      (sum, row) => sum + row.net,
      0,
    );
}

// Part I — Line 4: total interest minus EE/I bond exclusion (clamped to >= 0)
function line4TaxableInterest(input: ScheduleBInput): number {
  const line2 = totalTaxableInterest(input);
  const exclusion = input.ee_bond_exclusion ?? 0;
  return Math.max(0, line2 - exclusion);
}

// Part II — Line 6: sum all per-payer ordinary dividend amounts
function line6OrdinaryDividends(input: ScheduleBInput): number {
  return normalizeArray(input.ordinaryDividends)
    .reduce((sum, n) => sum + n, 0) +
    normalizeArray(input.dividend_detail).reduce(
      (sum, row) => sum + row.net,
      0,
    ) +
    (input.dividend_info ?? []).reduce((sum, row) => sum + row.amount, 0) +
    (input.form8814_dividends ?? 0);
}

// ─── Node class ───────────────────────────────────────────────────────────────

class ScheduleBNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "schedule_b";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, agi_aggregator, form8960]);

  compute(_ctx: NodeContext, rawInput: ScheduleBInput): NodeResult {
    const input = inputSchema.parse(rawInput);

    const line2 = totalTaxableInterest(input);
    if ((input.ee_bond_exclusion ?? 0) > line2) {
      throw new Error("Schedule B savings bond exclusion exceeds interest");
    }
    for (const row of normalizeArray(input.interest_detail)) {
      const adjusted = row.gross - row.nominee - row.accrued -
        row.oid_adjustment - row.bond_premium;
      if (Math.abs(adjusted - row.net) > 0.000001) {
        throw new Error("Schedule B interest detail does not reconcile");
      }
    }
    for (const row of normalizeArray(input.dividend_detail)) {
      if (Math.abs(row.gross - row.nominee - row.net) > 0.000001) {
        throw new Error("Schedule B dividend detail does not reconcile");
      }
    }

    const line4 = line4TaxableInterest(input);
    const line6 = line6OrdinaryDividends(input);
    const dividendsForReturn = normalizeArray(input.ordinaryDividends)
      .reduce((sum, n) => sum + n, 0) +
      normalizeArray(input.dividend_detail).reduce(
        (sum, row) => sum + row.net,
        0,
      );
    const foreignAccount = input.foreign_accounts_question === true ||
      input.form8814_foreign_account === true;
    const foreignTrust = input.foreign_trust_question === true ||
      input.form8814_foreign_trust === true;
    const details = normalizeArray(input.interest_detail);
    const hasSellerFinancedInterest = details.some((row) =>
      row.seller_financed_buyer !== undefined
    );
    const dividendDetails = normalizeArray(input.dividend_detail);
    const totalInterestAdjustment = (
      field: "nominee" | "accrued" | "oid_adjustment" | "bond_premium",
    ) => details.reduce((sum, row) => sum + row[field], 0);
    const totalNomineeDividends = dividendDetails.reduce(
      (sum, row) => sum + row.nominee,
      0,
    );
    const filingRequired = scheduleBFilingRequired({
      taxableInterest: line4,
      ordinaryDividends: line6,
      sellerFinancedInterest: hasSellerFinancedInterest,
      nomineeInterest: totalInterestAdjustment("nominee"),
      accruedInterest: totalInterestAdjustment("accrued"),
      oidAdjustment: totalInterestAdjustment("oid_adjustment"),
      bondPremiumAdjustment: totalInterestAdjustment("bond_premium"),
      savingsBondExclusion: input.ee_bond_exclusion ?? 0,
      nomineeDividends: totalNomineeDividends,
      foreignAccount,
      foreignTrust,
    });
    if (
      filingRequired && input.foreign_accounts_question === undefined &&
      input.form8814_foreign_account !== true
    ) {
      throw new Error("Schedule B needs an explicit foreign-account answer");
    }
    if (
      filingRequired && input.foreign_trust_question === undefined &&
      input.form8814_foreign_trust !== true
    ) {
      throw new Error("Schedule B needs an explicit foreign-trust answer");
    }
    if (foreignAccount && input.fincen_form114_required === undefined) {
      throw new Error(
        "Schedule B needs an explicit FinCEN Form 114 filing answer for foreign accounts",
      );
    }
    if (input.fincen_form114_required === true && !foreignAccount) {
      throw new Error("Schedule B FBAR answer requires a foreign account");
    }
    if (
      input.fincen_form114_required === true &&
      (!input.foreign_countries || input.foreign_countries.length === 0)
    ) {
      throw new Error("Schedule B FBAR filing needs foreign country codes");
    }
    if (
      input.foreign_countries?.length &&
      input.fincen_form114_required !== true
    ) {
      throw new Error("Schedule B foreign country codes require FBAR filing");
    }

    const f1040Fields: Partial<z.infer<typeof f1040["inputSchema"]>> = {};
    if (line4 > 0) f1040Fields.line2b_taxable_interest = line4;
    if (dividendsForReturn > 0) {
      f1040Fields.line3b_ordinary_dividends = dividendsForReturn;
    }

    const outputs: NodeOutput[] = [];
    if (Object.keys(f1040Fields).length > 0) {
      outputs.push(this.outputNodes.output(
        f1040,
        f1040Fields as AtLeastOne<z.infer<typeof f1040["inputSchema"]>>,
      ));
    }

    const agiFields: Partial<z.infer<typeof agi_aggregator["inputSchema"]>> =
      {};
    if (line4 > 0) agiFields.line2b_taxable_interest = line4;
    if (dividendsForReturn > 0) {
      agiFields.line3b_ordinary_dividends = dividendsForReturn;
    }
    if (Object.keys(agiFields).length > 0) {
      outputs.push(this.outputNodes.output(
        agi_aggregator,
        agiFields as AtLeastOne<z.infer<typeof agi_aggregator["inputSchema"]>>,
      ));
    }

    // Route total taxable interest (Part I line 4) to Form 8960 line 1 for NIIT.
    // IRC §1411(c)(1)(A): taxable interest is net investment income.
    // Note: dividends are routed to form8960 directly by f1099div; schedule_b only handles interest.
    if (line4 > 0) {
      outputs.push(
        this.outputNodes.output(form8960, { line1_taxable_interest: line4 }),
      );
    }

    if (!filingRequired) return { outputs };

    // ── Self-emit print-layer values for the PDF builder ─────────────────────
    // Preserve all payer rows for MeF and PDF continuation pages, then fill
    // the printed 14 interest and 15 dividend slots and Part III answers.
    const printFields: Record<string, unknown> = {};
    const intAmounts = normalizeArray(input.taxable_interest_net);
    const intNames = normalizeArray(
      input.payer_name as string | string[] | undefined,
    );
    if (
      intAmounts.length > 0 &&
      (intAmounts.length !== intNames.length ||
        intNames.some((name) => !name.trim()))
    ) {
      throw new Error("Schedule B needs a name for each interest payer");
    }
    const genericRows = intAmounts.map((amount, index) => ({
      payerName: intNames[index],
      amount,
    }));
    const sellerRows = details.filter((row) => row.seller_financed_buyer)
      .map((row) => ({
        buyer: row.seller_financed_buyer!,
        amount: row.gross,
      }));
    const ordinaryRows = [
      ...details.filter((row) => !row.seller_financed_buyer).map((row) => ({
        payerName: row.payer_name,
        amount: row.gross,
      })),
      ...genericRows,
    ];
    const allInterestRows = [
      ...sellerRows.map((row) => ({
        payerName: row.buyer.name,
        amount: row.amount,
      })),
      ...ordinaryRows,
    ];
    if (ordinaryRows.length > 0) printFields.interest_rows = ordinaryRows;
    if (sellerRows.length > 0) printFields.seller_financed_rows = sellerRows;
    if (allInterestRows.length > 0) {
      printFields.print_interest_rows = allInterestRows;
    }
    for (let i = 0; i < Math.min(allInterestRows.length, 14); i++) {
      printFields[`print_int_payer_${i + 1}`] = allInterestRows[i].payerName;
      printFields[`print_int_amount_${i + 1}`] = allInterestRows[i].amount;
    }
    printFields.interest_nominee = totalInterestAdjustment("nominee");
    printFields.interest_accrued = totalInterestAdjustment("accrued");
    printFields.interest_oid_adjustment = totalInterestAdjustment(
      "oid_adjustment",
    );
    printFields.interest_bond_premium = totalInterestAdjustment("bond_premium");
    if (allInterestRows.length > 0) {
      printFields.interest_line1_subtotal = allInterestRows.reduce(
        (sum, row) => sum + row.amount,
        0,
      );
    }
    const divAmounts = normalizeArray(input.ordinaryDividends);
    const divNames = normalizeArray(
      input.payerName as string | string[] | undefined,
    );
    const dividendRows = dividendDetails.map((row) => ({
      payerName: row.payer_name,
      amount: row.gross,
    }));
    dividendRows.push(...divAmounts.map((amount, index) => ({
      payerName: divNames[index] ?? "",
      amount,
    })));
    dividendRows.push(...(input.dividend_info ?? []));
    if ((input.form8814_dividends ?? 0) > 0) {
      dividendRows.push({
        payerName: "Form 8814",
        amount: input.form8814_dividends!,
      });
    }
    if (line6 > 0 && dividendRows.some((row) => !row.payerName.trim())) {
      throw new Error(
        "Schedule B needs every dividend payer name when dividends are reported",
      );
    }
    if (dividendRows.length > 0) {
      printFields.dividend_rows = dividendRows;
      printFields.dividend_line5_subtotal = dividendRows.reduce(
        (sum, row) => sum + row.amount,
        0,
      );
    }
    printFields.dividend_nominee = totalNomineeDividends;
    for (let i = 0; i < Math.min(dividendRows.length, 15); i++) {
      printFields[`print_div_payer_${i + 1}`] = dividendRows[i].payerName;
      printFields[`print_div_amount_${i + 1}`] = dividendRows[i].amount;
    }
    if (line4 > 0 || allInterestRows.length > 0) {
      printFields.print_line2_total = totalTaxableInterest(input);
      printFields.print_line4_total = line4;
    }
    if (line6 > 0 || dividendRows.length > 0) {
      printFields.print_line6_total = line6;
    }
    if (foreignAccount || input.foreign_accounts_question !== undefined) {
      printFields.foreign_accounts_question = foreignAccount;
      if (foreignAccount) {
        printFields.fincen_form114_required = input.fincen_form114_required;
      }
      if (input.form8814_foreign_account === true) {
        printFields.form8814_foreign_account = true;
      }
      if (input.foreign_countries?.length) {
        printFields.foreign_country_codes = input.foreign_countries.map((
          entry,
        ) => entry.irs_code);
        printFields.foreign_country_names = input.foreign_countries.map((
          entry,
        ) => entry.name);
      }
    }
    if (foreignTrust || input.foreign_trust_question !== undefined) {
      printFields.foreign_trust_question = foreignTrust;
      if (input.form8814_foreign_trust === true) {
        printFields.form8814_foreign_trust = true;
      }
    }
    outputs.push({ nodeType: this.nodeType, fields: printFields });

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const schedule_b = new ScheduleBNode();
