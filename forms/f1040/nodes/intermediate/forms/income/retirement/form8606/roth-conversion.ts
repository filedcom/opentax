import { z } from "zod";
import {
  rothActivityReviewSchema,
  rothPaymentAgeFacts,
} from "./roth-activity.ts";
import { roundWholeDollars } from "../../../../../../whole-dollars.ts";
const reference = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{9}$/);
const money = rothActivityReviewSchema.shape.payment.shape.gross_distribution;
export const rothSourceMoney = z.number().nonnegative().refine((value) =>
  Number.isSafeInteger(Math.round(value * 100)) &&
  Math.abs(value * 100 - Math.round(value * 100)) < .000001
);
const year = z.number().int().min(1998).max(2024);
const filedMoney = z.number().int().nonnegative();
const date = rothActivityReviewSchema.shape.payment.shape.distributed_on;
/** Actual historical conversion records; filed tax treatment is retained, not recomputed by an earlier-year engine. */
export const rothConversionYearSchema = z.object({
  prior_form8606: z.object({
    source_document_reference: reference,
    tax_year: year,
    owner_ssn: ssn,
    owner_name: reference,
    filed_line16_converted: filedMoney,
    filed_line17_nontaxable: filedMoney,
    filed_line18_taxable: filedMoney,
  }).strict(),
  accounts: z.array(
    z.object({
      form5498: z.object({
        source_document_reference: reference,
        tax_year: year,
        owner_ssn: ssn,
        custodian_ein: ssn,
        account_number: reference,
        roth_ira_confirmed: z.literal(true),
        box3_roth_conversion_amount: money,
        box2_rollover_contributions: z.literal(0),
        box10_roth_contributions: rothSourceMoney,
      }).strict(),
      transfers: z.array(
        z.object({
          issued_form1099r: z.object({
            source_document_reference: reference,
            tax_year: year,
            owner_ssn: ssn,
            payer_ein: ssn,
            traditional_account_number: reference,
            distribution_reference: reference,
            distributed_on: date,
            box1_gross_distribution: money,
            box2a_taxable_amount: money,
            box2b_taxable_not_determined: z.literal(true),
            box7_ira_indicator: z.literal(true),
            box7_distribution_code: z.enum(["2", "7"]),
            complete_direct_roth_conversion_confirmed: z.literal(true),
          }).strict(),
          receipt: z.object({
            source_document_reference: reference,
            owner_ssn: ssn,
            custodian_ein: ssn,
            account_number: reference,
            received_on: date,
            amount: money,
            originating_distribution_reference: reference,
          }).strict(),
        }).strict(),
      ).min(1),
    }).strict(),
  ).min(1),
}).strict();
export type RothConversionYear = z.infer<typeof rothConversionYearSchema>;
const sumMoney = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + Math.round(value * 100), 0) / 100;
export function rothConversionDocuments(years: readonly RothConversionYear[]) {
  return years.flatMap((year) =>
    year.accounts.flatMap(
      (account) => [
        account.form5498,
        ...account.transfers.flatMap(
          (row) => [row.issued_form1099r, row.receipt],
        ),
      ],
    )
  );
}
export function reviewedRothConversions(
  years: readonly RothConversionYear[],
  ownerSsn: string,
  accounts: readonly { custodian_ein: string; account_number: string }[],
  birthDate: string,
) {
  const usedYears = new Set<number>();
  const references = new Set<string>();
  const lineages = new Set<string>();
  const owned = accounts.map((row) =>
    JSON.stringify([row.custodian_ein, row.account_number])
  );
  const result = [];
  for (const row of years) {
    const prior = row.prior_form8606;
    if (
      usedYears.has(prior.tax_year) || prior.owner_ssn !== ownerSsn ||
      prior.filed_line16_converted <= 0 ||
      prior.filed_line17_nontaxable + prior.filed_line18_taxable !==
        prior.filed_line16_converted
    ) {
      throw new Error(
        "Roth conversion prior filing must have distinct owner years and line16 = lines17 +18",
      );
    }
    usedYears.add(prior.tax_year);
    const keys = new Set<string>();
    for (const account of row.accounts) {
      const form = account.form5498;
      const key = JSON.stringify([form.custodian_ein, form.account_number]);
      if (
        keys.has(key) || !owned.includes(key) || form.owner_ssn !== ownerSsn ||
        form.tax_year !== prior.tax_year ||
        sumMoney(account.transfers.map((row) => row.receipt.amount)) !==
          form.box3_roth_conversion_amount
      ) {
        throw new Error(
          "Roth conversion5498 owner/account/year and complete incoming amounts differ",
        );
      }
      keys.add(key);
      for (const transfer of account.transfers) {
        const issued = transfer.issued_form1099r, receipt = transfer.receipt;
        rothPaymentAgeFacts({ date_of_birth: birthDate }, {
          distributed_on: issued.distributed_on,
          distribution_code: issued.box7_distribution_code === "7" ? "T" : "J",
        }, Infinity);
        const lineage = JSON.stringify([
          issued.payer_ein,
          issued.traditional_account_number,
          issued.distribution_reference,
        ]);
        if (
          lineages.has(lineage) || issued.owner_ssn !== ownerSsn ||
          receipt.owner_ssn !== ownerSsn ||
          issued.tax_year !== prior.tax_year ||
          !issued.distributed_on.startsWith(`${prior.tax_year}-`) ||
          issued.distributed_on < birthDate ||
          receipt.received_on < issued.distributed_on ||
          receipt.received_on > `${prior.tax_year + 1}-12-31` ||
          receipt.custodian_ein !== form.custodian_ein ||
          receipt.account_number !== form.account_number ||
          receipt.originating_distribution_reference !==
            issued.distribution_reference ||
          receipt.amount !== issued.box1_gross_distribution ||
          issued.box2a_taxable_amount !== issued.box1_gross_distribution
        ) {
          throw new Error(
            "Roth conversion actual debit/credit source ownership, lineage, dates or full conversion amounts differ",
          );
        }
        lineages.add(lineage);
      }
    }
    const rawGross = sumMoney(
      row.accounts.map((account) =>
        account.form5498.box3_roth_conversion_amount
      ),
    );
    if (roundWholeDollars(rawGross) !== prior.filed_line16_converted) {
      throw new Error(
        "Roth conversion actual annual source total differs from retained filed8606 line16",
      );
    }
    for (const document of [prior, ...rothConversionDocuments([row])]) {
      if (references.has(document.source_document_reference)) {
        throw new Error("Roth conversion repeats retained source references");
      }
      references.add(document.source_document_reference);
    }
    result.push({
      year: prior.tax_year,
      gross: prior.filed_line16_converted,
      taxable: prior.filed_line18_taxable,
      nontaxable: prior.filed_line17_nontaxable,
      rawGross,
    });
  }
  return result.sort((a, b) => a.year - b.year);
}
