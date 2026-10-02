import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import {
  alternativeCompensationSourcingSchema,
  ForeignTaxCreditMethod,
  foreignTaxCurrencySchema,
  ForeignTaxKind,
  form_1116,
  IncomeCategory,
} from "../../intermediate/forms/form_1116/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Foreign Employer Compensation (IRC §61; IRS Pub 54)
// US citizens and residents must report worldwide income including wages
// from foreign employers who did not issue a US W-2 and did not withhold
// US taxes. The taxpayer self-reports these amounts and converts to USD.
// TY2025 Form 1040 reports FEC on line 1h (IRS Publication 4164).
// The Foreign Earned Income Exclusion (Form 2555) is handled separately.

const paidForeignTaxCurrencySchema = foreignTaxCurrencySchema.extend({
  conversion_date: z.string().regex(/^2025-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) &&
      date.toISOString().slice(0, 10) === value;
  }),
  conversion_rate_explanation: z.string().trim().min(1),
});

const fecForeignAddressSchema = z.object({
  line1: z.string().trim().min(1),
  line2: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1),
  province_or_state: z.string().trim().min(1).optional(),
  country_code: z.string().regex(/^[A-Z]{2}$/),
  postal_code: z.string().trim().min(1).optional(),
}).strict();

const fecServiceResidenceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("us"),
    line1: z.string().trim().min(1),
    line2: z.string().trim().min(1).optional(),
    city: z.string().trim().min(1),
    state: z.string().regex(/^[A-Z]{2}$/),
    zip: z.string().regex(/^\d{5}$/),
  }).strict(),
  z.object({
    kind: z.literal("foreign"),
    address: fecForeignAddressSchema,
  }).strict(),
]);

// Per-employer schema — one entry per foreign employer
export const itemSchema = z.object({
  // Name of the foreign employer
  foreign_employer_name: z.string(),
  // ISO 3166-1 alpha-2 country code of the foreign employer
  country_code: z.string().length(2),
  // Amount in foreign currency (pre-conversion, for record-keeping)
  compensation_amount: z.number().nonnegative(),
  // ISO 4217 currency code (e.g., "EUR", "GBP", "JPY")
  currency: z.string().optional(),
  // Amount converted to US dollars at IRS-approved exchange rate
  compensation_usd: z.number().nonnegative(),
  // Needed when other foreign-employer wage records establish the same
  // employee's $250,000 worldwide compensation threshold for line 1b.
  compensation_owner_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).optional(),
  compensation_source_document_reference: z.string().trim().min(1).optional(),
  // Service-time residence cannot be inferred from the current return header.
  service_residence: fecServiceResidenceSchema.optional(),
  employer_foreign_address: fecForeignAddressSchema.optional(),
  employer_has_us_ein: z.literal(false).optional(),
  employer_issued_w2: z.literal(false).optional(),
  // Optional description of the position/employment
  description: z.string().optional(),
  // Foreign income tax paid or accrued on this compensation, converted to USD.
  // Claimed on Form 1116 in the general limitation category — compensation for
  // personal services as an employee is general category income, not passive
  // (IRC §904(d)(1)(B); Form 1116 Part I box d and line 1b).
  foreign_tax_paid_usd: z.number().nonnegative().optional(),
  // IRS MeF CountryType code for the tax-credit source, which may differ from
  // the ISO employer country code (for example, Germany is GM rather than DE).
  foreign_tax_irs_country_code: z.string().length(2).optional(),
  foreign_tax_paid_or_accrued_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  foreign_tax_credit_method: z.nativeEnum(ForeignTaxCreditMethod).optional(),
  // Paid-tax Part II source: foreign denomination and the dated rate.
  // The conversion explanation is required by the Form 1116 instructions.
  foreign_tax_currency: paidForeignTaxCurrencySchema.optional(),
  // Compensation for services physically performed outside the United States.
  // Employer location alone does not determine wage source.
  foreign_service_compensation_usd: z.number().nonnegative().optional(),
  // Portion of foreign-service compensation excluded on Form 2555.
  foreign_earned_income_exclusion_usd: z.number().nonnegative().optional(),
  // A line 1b election requires $250,000 of worldwide employee compensation
  // and a sourced statement explaining the alternative geographical basis.
  alternative_compensation_sourcing: alternativeCompensationSourcingSchema
    .optional(),
});

/** Standalone FEC records need the complete facts required by Pub. 4164. */
export const nativeFecItemSchema = itemSchema.extend({
  foreign_employer_name: z.string().trim().min(1),
  compensation_usd: z.number().int().positive(),
  compensation_owner_ssn: z.string().regex(/^(?:\d{9}|\d{3}-\d{2}-\d{4})$/),
  compensation_source_document_reference: z.string().trim().min(1),
  service_residence: fecServiceResidenceSchema,
  employer_foreign_address: fecForeignAddressSchema,
  employer_has_us_ein: z.literal(false),
  employer_issued_w2: z.literal(false),
});

export const nativeFecInputSchema = z.object({
  fecs: z.array(nativeFecItemSchema).min(1).max(10),
});

export const inputSchema = z.object({
  fecs: z.array(itemSchema).min(1),
});

type FecItem = z.infer<typeof itemSchema>;
type FecItems = FecItem[];

export function alternativeCompensationWorldwideTotal(
  items: FecItems,
  source: FecItem,
  taxpayerSsn?: string,
): number {
  const owner = source.compensation_owner_ssn?.replace(/\D/g, "");
  if (
    !owner || !source.compensation_source_document_reference ||
    source.compensation_source_document_reference !==
      source.alternative_compensation_sourcing?.source_document_reference ||
    (taxpayerSsn && taxpayerSsn.replace(/\D/g, "") !== owner)
  ) return 0;
  if (items.length === 1) return source.compensation_usd;
  if (
    items.length < 2 ||
    !source.alternative_compensation_sourcing
  ) return 0;
  const others = items.filter((item) => item !== source);
  if (
    others.length !== items.length - 1 ||
    others.some((other) =>
      other.compensation_owner_ssn?.replace(/\D/g, "") !== owner ||
      !other.compensation_source_document_reference ||
      other.compensation_usd <= 0 ||
      (other.foreign_service_compensation_usd ?? 0) !== 0 ||
      (other.foreign_tax_paid_usd ?? 0) !== 0 ||
      (other.foreign_earned_income_exclusion_usd ?? 0) !== 0 ||
      other.alternative_compensation_sourcing !== undefined
    ) ||
    new Set(items.map((item) => item.compensation_source_document_reference))
        .size !== items.length
  ) return 0;
  return items.reduce((total, item) => total + item.compensation_usd, 0);
}

function totalCompensationUsd(items: FecItems): number {
  return items.reduce(
    (sum: number, item: FecItem) => sum + item.compensation_usd,
    0,
  );
}

// Foreign compensation is gross income under IRC §61(a)(1), so it must also
// reach the AGI aggregator; routing it to f1040 alone leaves it out of line 11.
function wageOutputs(items: FecItems): NodeOutput[] {
  const total = totalCompensationUsd(items);
  if (total === 0) return [];
  return [
    { nodeType: f1040.nodeType, fields: { line1h_other_earned: total } },
    {
      nodeType: agi_aggregator.nodeType,
      fields: { line1h_other_earned: total },
    },
  ];
}

// Foreign tax on wages → Form 1116, general category.
// The §904(j) de minimis election that lets small amounts skip Form 1116 applies
// only to passive income shown on a payee statement, so wage tax files the form
// at any amount. The compensation that bore the tax is the line 1a numerator of
// the §904(a) limitation.
function form1116Output(items: FecItems): NodeOutput[] {
  const foreignTaxItems = items.flatMap((item) => {
    const tax = item.foreign_tax_paid_usd ?? 0;
    const foreignServices = item.foreign_service_compensation_usd ?? 0;
    const alternative = item.alternative_compensation_sourcing;
    const currency = item.foreign_tax_currency;
    if (
      alternative &&
      (tax <= 0 || foreignServices <= 0 ||
        foreignServices > item.compensation_usd ||
        Math.round(alternative.compensation_item_total_usd * 100) !==
          Math.round(item.compensation_usd * 100) ||
        Math.round(alternative.alternative_foreign_source_usd * 100) !==
          Math.round(foreignServices * 100) ||
        alternativeCompensationWorldwideTotal(items, item) < 250_000 ||
        (item.foreign_earned_income_exclusion_usd ?? 0) !== 0 ||
        item.foreign_tax_credit_method !== ForeignTaxCreditMethod.Paid ||
        !item.foreign_tax_irs_country_code ||
        !item.foreign_tax_paid_or_accrued_date || !currency ||
        currency.conversion_date !== item.foreign_tax_paid_or_accrued_date ||
        Math.round(currency.amount * currency.usd_per_foreign_unit * 100) !==
          Math.round(tax * 100))
    ) {
      throw new Error(
        "Form 1116 line 1b needs dated paid foreign-currency wage tax, reconciled ordinary/alternative source amounts, no exclusion, and at least $250,000 of identified employee compensation",
      );
    }
    if (tax <= 0 || foreignServices <= 0) return [];
    const excluded = Math.min(
      foreignServices,
      item.foreign_earned_income_exclusion_usd ?? 0,
    );
    const eligibleTax = tax * ((foreignServices - excluded) / foreignServices);
    if (eligibleTax <= 0) return [];
    return [{
      foreign_tax_paid: eligibleTax,
      income_category: IncomeCategory.General,
      foreign_gross_income: foreignServices,
      excluded_income: excluded,
      irs_country_code: item.foreign_tax_irs_country_code,
      tax_paid_or_accrued_date: item.foreign_tax_paid_or_accrued_date,
      tax_kind: ForeignTaxKind.Other,
      tax_credit_method: item.foreign_tax_credit_method,
      ...(alternative
        ? {
          foreign_income_source_document_reference:
            alternative.source_document_reference,
          foreign_tax_currency: currency,
          alternative_compensation_sourcing: alternative,
        }
        : {}),
    }];
  });
  if (foreignTaxItems.length === 0) return [];
  return [{
    nodeType: form_1116.nodeType,
    fields: { foreign_tax_items: foreignTaxItems },
  }];
}

class FecNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "fec";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, agi_aggregator, form_1116]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const parsed = inputSchema.parse(input);
    return {
      outputs: [
        ...wageOutputs(parsed.fecs),
        ...form1116Output(parsed.fecs),
      ],
    };
  }
}

export const fec = new FecNode();
