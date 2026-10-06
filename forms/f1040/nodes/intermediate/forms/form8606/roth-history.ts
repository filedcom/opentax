import { z } from "zod";
import { roundWholeDollars } from "../../../../whole-dollars.ts";
import {
  rothActivityReviewSchema,
  rothPaymentAgeFacts,
} from "./roth-activity.ts";
import type { RothConversionYear } from "./roth-conversion.ts";

const reference = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{9}$/);
const year = z.number().int().min(1998).max(2024);
const filed = z.number().int().nonnegative();
const money = rothActivityReviewSchema.shape.payment.shape.gross_distribution;
const priorPayment = rothActivityReviewSchema.shape.payment.extend({
  tax_year: year,
  issued_form1099r: z.object({
    source_document_reference: reference,
    tax_year: year,
    owner_ssn: ssn,
    payer_ein: ssn,
    account_number: reference,
    distribution_reference: reference,
    distributed_on: rothActivityReviewSchema.shape.payment.shape.distributed_on,
    box1_gross_distribution: money,
    box2a_taxable_amount: z.literal(0),
    box2b_taxable_not_determined: z.literal(true),
    box7_ira_indicator: z.literal(true),
    box7_distribution_code: z.enum(["J", "T"]),
  }).strict(),
}).strict();
export const rothDistributionYearSchema = z.object({
  prior_form8606: z.object({
    source_document_reference: reference,
    tax_year: year,
    owner_name: reference,
    owner_ssn: ssn,
    filed_line19_distributions: filed,
    filed_line20_homebuyer: z.literal(0),
    filed_line21_after_homebuyer: filed,
    filed_line22_regular_basis: filed,
    filed_line23_after_regular: filed,
    filed_line24_conversion_basis: filed.nullable(),
    filed_line25a_earnings: filed.nullable(),
    filed_line25b_disaster: z.literal(0).nullable(),
    filed_line25c_taxable: filed.nullable(),
  }).strict(),
  prior_form5329: z.object({
    source_document_reference: reference,
    tax_year: year,
    owner_name: reference,
    owner_ssn: ssn,
    filed_line1_early_distributions: filed,
    filed_line2_exceptions: z.literal(0),
    filed_line3_subject_to_tax: filed,
    filed_line4_additional_tax: filed,
  }).strict().optional(),
  payments: z.array(priorPayment).min(1),
}).strict();
export type RothDistributionYear = z.infer<typeof rothDistributionYearSchema>;
type Contribution = {
  form5498: { tax_year: number; box10_roth_contributions: number };
};
const sumMoney = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + Math.round(value * 100), 0) / 100;

/** Replay every prior annual distribution from original activity and reconcile its actual filed forms. */
export function reviewedRothHistory(
  history: readonly RothDistributionYear[],
  owner: { owner_ssn: string; date_of_birth: string },
  accounts: readonly { custodian_ein: string; account_number: string }[],
  contributions: readonly Contribution[],
  conversions: readonly RothConversionYear[],
) {
  const owned = new Set(
    accounts.map((row) =>
      JSON.stringify([row.custodian_ein, row.account_number])
    ),
  );
  const references = new Set<string>(), lineages = new Set<string>();
  let previousYear = 1997, remainingRegular = 0;
  const pools = conversions.map((row) => ({
    year: row.prior_form8606.tax_year,
    taxable: row.prior_form8606.filed_line18_taxable,
    nontaxable: row.prior_form8606.filed_line17_nontaxable,
    gross: row.prior_form8606.filed_line16_converted,
  })).sort((a, b) => a.year - b.year);
  const firstYear = Math.min(
    ...contributions.map((row) => row.form5498.tax_year),
    ...pools.map((row) => row.year),
  );
  const annuals = [];
  for (
    const annual of [...history].sort((a, b) =>
      a.prior_form8606.tax_year - b.prior_form8606.tax_year
    )
  ) {
    const prior = annual.prior_form8606, currentYear = prior.tax_year;
    if (currentYear <= previousYear || prior.owner_ssn !== owner.owner_ssn) {
      throw new Error(
        "Roth prior distribution filings need distinct complete owner years",
      );
    }
    const regular = roundWholeDollars(
      remainingRegular + sumMoney(
        contributions.filter((row) =>
          row.form5498.tax_year > previousYear &&
          row.form5498.tax_year <= currentYear
        ).map((row) => row.form5498.box10_roth_contributions),
      ),
    );
    for (const payment of annual.payments) {
      const issued = payment.issued_form1099r;
      const age = rothPaymentAgeFacts(owner, payment, Infinity);
      if (age.ageException && firstYear <= currentYear - 5) {
        throw new Error(
          "Roth qualified prior distribution needs its actual historical filing classification",
        );
      }
      const identity = JSON.stringify([
        payment.custodian_ein,
        payment.account_number,
        payment.distribution_reference,
      ]);
      if (
        !owned.has(
          JSON.stringify([payment.custodian_ein, payment.account_number]),
        ) ||
        payment.owner_ssn !== owner.owner_ssn ||
        payment.tax_year !== currentYear ||
        !payment.distributed_on.startsWith(`${currentYear}-`) ||
        payment.distributed_on < owner.date_of_birth ||
        issued.owner_ssn !== payment.owner_ssn ||
        issued.tax_year !== currentYear ||
        issued.payer_ein !== payment.custodian_ein ||
        issued.account_number !== payment.account_number ||
        issued.distribution_reference !== payment.distribution_reference ||
        issued.distributed_on !== payment.distributed_on ||
        issued.box1_gross_distribution !== payment.gross_distribution ||
        issued.box7_distribution_code !== payment.distribution_code ||
        lineages.has(identity)
      ) {
        throw new Error(
          "Roth prior issued1099R/payment owner, account, year, code or distribution lineage differs",
        );
      }
      lineages.add(identity);
      for (const document of [payment, issued]) {
        if (references.has(document.source_document_reference)) {
          throw new Error("Roth prior source reference is repeated");
        }
        references.add(document.source_document_reference);
      }
    }
    const gross = roundWholeDollars(
      sumMoney(annual.payments.map((row) => row.gross_distribution)),
    );
    const afterRegular = Math.max(0, gross - regular);
    const available = pools.filter((row) => row.year <= currentYear);
    const conversionBasis = available.reduce((sum, row) => sum + row.gross, 0);
    const earnings = Math.max(0, afterRegular - conversionBasis);
    const earlyGross = roundWholeDollars(
      sumMoney(
        annual.payments.filter((row) =>
          !rothPaymentAgeFacts(owner, row, Infinity).ageException
        ).map((row) => row.gross_distribution),
      ),
    );
    let early = Math.max(0, earlyGross - regular),
      consumption = afterRegular,
      recapture = 0;
    for (const pool of available) {
      const earlyTaxable = Math.min(early, pool.taxable);
      early -= earlyTaxable;
      const earlyNontaxable = Math.min(early, pool.nontaxable);
      early -= earlyNontaxable;
      if (pool.year >= currentYear - 4) recapture += earlyTaxable;
      const taxableUsed = Math.min(consumption, pool.taxable);
      consumption -= taxableUsed;
      const nontaxableUsed = Math.min(consumption, pool.nontaxable);
      consumption -= nontaxableUsed;
      pool.taxable -= taxableUsed;
      pool.nontaxable -= nontaxableUsed;
      pool.gross = pool.taxable + pool.nontaxable;
    }
    const earlyTaxable = recapture + Math.min(earnings, early);
    if (
      gross <= 0 || prior.filed_line19_distributions !== gross ||
      prior.filed_line21_after_homebuyer !== gross ||
      prior.filed_line22_regular_basis !== regular ||
      prior.filed_line23_after_regular !== afterRegular ||
      (afterRegular === 0
        ? [
          prior.filed_line24_conversion_basis,
          prior.filed_line25a_earnings,
          prior.filed_line25b_disaster,
          prior.filed_line25c_taxable,
        ].some((value) => value !== null)
        : prior.filed_line24_conversion_basis !== conversionBasis ||
          prior.filed_line25a_earnings !== earnings ||
          (earnings === 0
            ? prior.filed_line25b_disaster !== null ||
              prior.filed_line25c_taxable !== null
            : prior.filed_line25b_disaster !== 0 ||
              prior.filed_line25c_taxable !== earnings))
    ) {
      throw new Error(
        "Roth prior filed8606 lines differ from complete original contribution, conversion and distribution history",
      );
    }
    const penalty = annual.prior_form5329;
    if (
      earlyTaxable > 0
        ? !penalty || penalty.owner_ssn !== owner.owner_ssn ||
          penalty.tax_year !== currentYear ||
          penalty.owner_name !== prior.owner_name ||
          penalty.filed_line1_early_distributions !== earlyTaxable ||
          penalty.filed_line3_subject_to_tax !== earlyTaxable ||
          penalty.filed_line4_additional_tax !==
            roundWholeDollars(earlyTaxable * .1)
        : penalty !== undefined
    ) {
      throw new Error(
        "Roth prior filed5329 recapture differs from actual taxable FIFO history and age sources",
      );
    }
    for (const document of [prior, ...(penalty ? [penalty] : [])]) {
      if (references.has(document.source_document_reference)) {
        throw new Error("Roth prior filing source reference is repeated");
      }
      references.add(document.source_document_reference);
    }
    remainingRegular = Math.max(0, regular - gross);
    previousYear = currentYear;
    annuals.push({
      year: currentYear,
      gross,
      regular,
      afterRegular,
      conversionBasis,
      earnings,
      recapture,
      earlyTaxable,
    });
  }
  return {
    regularBasis: roundWholeDollars(
      remainingRegular + sumMoney(
        contributions.filter((row) => row.form5498.tax_year > previousYear).map(
          (row) => row.form5498.box10_roth_contributions,
        ),
      ),
    ),
    pools,
    annuals,
  };
}
