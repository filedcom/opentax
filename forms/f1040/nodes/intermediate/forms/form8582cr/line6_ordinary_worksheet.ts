import { z } from "zod";
import {
  computePropertyNet,
  inputSchema as scheduleEInputSchema,
} from "../../../inputs/schedule_e/index.ts";
import { inputSchema as form1099IntInputSchema } from "../../../inputs/f1099int/index.ts";
import { filingStatusSchema } from "../../../types.ts";
import { ordinaryTax2025 } from "../../worksheets/tax_table_2025.ts";
import { inputSchema as form8582crInputSchema } from "./index.ts";
import { line6OrdinaryWorksheetSchema } from "./line6_source.ts";

/** A reviewed, one-activity ordinary-tax candidate for line 6; filing is gated separately. */
export { line6OrdinaryWorksheetSchema } from "./line6_source.ts";

export function calculateForm8582CRLine6OrdinaryWorksheet(
  rawWorksheet: unknown,
  rawScheduleE: unknown,
  rawForm8582cr: unknown,
  rawForm1040: unknown,
  rawSchedule1: unknown,
  rawGeneral: unknown,
  rawForm1099Int: unknown,
) {
  const worksheet = line6OrdinaryWorksheetSchema.parse(rawWorksheet);
  const scheduleE = scheduleEInputSchema.parse(rawScheduleE);
  const form8582cr = form8582crInputSchema.parse(rawForm8582cr);
  const form1040 = z.object({
    line1z_total_wages: z.number().int().nonnegative(),
    line8_additional_income: z.number().int(),
    line9_total_income: z.number().int().nonnegative(),
    line10_adjustments: z.number().int().nonnegative().optional(),
    line11_agi: z.number().int().nonnegative(),
    line14_deductions_qbi_total: z.number().int().nonnegative(),
    line15_taxable_income: z.number().int().nonnegative(),
    line16_income_tax: z.number().int().nonnegative(),
    line2b_taxable_interest: z.number().optional(),
    line3a_qualified_dividends: z.number().optional(),
    line3b_ordinary_dividends: z.number().optional(),
    line4b_ira_taxable: z.number().optional(),
    line5b_pension_taxable: z.number().optional(),
    line6b_ss_taxable: z.number().optional(),
    line7_capital_gain: z.number().optional(),
  }).parse(rawForm1040);
  const schedule1 = z.object({
    line5_schedule_e: z.number().int().positive(),
    line10_total_additional_income: z.number().int().positive(),
  }).parse(rawSchedule1);
  const general = z.object({
    filing_status: filingStatusSchema,
  }).parse(rawGeneral);
  const property = scheduleE.schedule_es[0];
  const netPassive = property ? computePropertyNet(property) : 0;
  let taxableInterest = 0;
  if (rawForm1099Int !== undefined) {
    const interestSource = form1099IntInputSchema.parse(rawForm1099Int);
    const references = new Set<string>();
    const payers = new Set<string>();
    for (const row of interestSource.f1099ints) {
      const payerTin = row.payer_tin?.replace(/\D/g, "");
      if (
        !row.source_document_reference ||
        !payerTin || !/^\d{9}$/.test(payerTin) ||
        references.has(row.source_document_reference) ||
        payers.has(payerTin) ||
        typeof row.box1 !== "number" || !Number.isSafeInteger(row.box1) ||
        row.box1 <= 0 ||
        Object.keys(row).some((key) =>
          !["payer_name", "payer_tin", "source_document_reference", "box1"]
            .includes(key)
        )
      ) {
        throw new Error(
          "Form 8582-CR ordinary interest branch needs distinct retained Form 1099-INT box 1 payers and copies",
        );
      }
      references.add(row.source_document_reference);
      payers.add(payerTin);
      taxableInterest += row.box1;
    }
    if (!Number.isSafeInteger(taxableInterest)) {
      throw new Error("Form 8582-CR Form 1099-INT interest total is invalid");
    }
  }
  const otherIncome = [
    form1040.line3a_qualified_dividends,
    form1040.line3b_ordinary_dividends,
    form1040.line4b_ira_taxable,
    form1040.line5b_pension_taxable,
    form1040.line6b_ss_taxable,
    form1040.line7_capital_gain,
  ];
  if (
    scheduleE.schedule_es.length !== 1 || !property ||
    (property.activity_type !== "A" && property.activity_type !== "B") ||
    property.property_type !== 1 ||
    property.activity_id !== worksheet.activity_id ||
    property.passive_income_source_document_reference !==
      worksheet.passive_income_source_document_reference ||
    property.royalties_income !== undefined ||
    property.qbi_trade_or_business === "Y" ||
    property.some_investment_not_at_risk === true ||
    (property.passive_property_sales?.length ?? 0) !== 0 ||
    (property.prior_unallowed_passive_operating ?? 0) !== 0 ||
    (property.prior_unallowed_passive_4797_part1 ?? 0) !== 0 ||
    (property.prior_unallowed_passive_4797_part2 ?? 0) !== 0 ||
    (scheduleE.estate_trust_rows?.length ?? 0) !== 0 ||
    (scheduleE.farm_rental_activities?.length ?? 0) !== 0 ||
    (scheduleE.farm_rental_gross ?? 0) !== 0 ||
    (scheduleE.farm_rental_net ?? 0) !== 0 ||
    (scheduleE.rental_income ?? 0) !== 0 ||
    (scheduleE.royalty_income ?? 0) !== 0 ||
    !Number.isSafeInteger(netPassive) || netPassive <= 0 ||
    netPassive !== worksheet.net_passive_income ||
    schedule1.line5_schedule_e !== netPassive ||
    schedule1.line10_total_additional_income !== netPassive ||
    form1040.line8_additional_income !== netPassive ||
    (form1040.line2b_taxable_interest ?? 0) !== taxableInterest ||
    form1040.line9_total_income !==
      form1040.line1z_total_wages + netPassive + taxableInterest ||
    (form1040.line10_adjustments ?? 0) !== 0 ||
    form1040.line11_agi !== form1040.line9_total_income ||
    form1040.line15_taxable_income !== Math.max(
        0,
        form1040.line11_agi - form1040.line14_deductions_qbi_total,
      ) ||
    otherIncome.some((amount) => (amount ?? 0) !== 0) ||
    form8582cr.credit_sources.some((source) =>
      source.publicly_traded_partnership ||
      source.prior_unallowed_credits.length > 0
    )
  ) {
    throw new Error(
      "Form 8582-CR line 6 ordinary worksheet needs one sourced passive Schedule E income activity and a matching final return",
    );
  }
  const taxableWithoutPassive = Math.max(
    0,
    form1040.line15_taxable_income - netPassive,
  );
  const taxAll = ordinaryTax2025(
    form1040.line15_taxable_income,
    general.filing_status,
  );
  const taxWithout = ordinaryTax2025(
    taxableWithoutPassive,
    general.filing_status,
  );
  if (
    worksheet.taxable_income_including_passive !==
      form1040.line15_taxable_income ||
    worksheet.taxable_income_without_passive !== taxableWithoutPassive ||
    worksheet.tax_including_passive !== taxAll ||
    worksheet.tax_without_passive !== taxWithout ||
    form1040.line16_income_tax !== taxAll ||
    form8582cr.regular_tax_all_income !== taxAll ||
    form8582cr.regular_tax_without_passive !== taxWithout
  ) {
    throw new Error(
      "Form 8582-CR line 6 tax sides must use the finalized Form 1040 ordinary-tax method",
    );
  }
  return {
    activity_id: worksheet.activity_id,
    passive_income_source_document_reference:
      worksheet.passive_income_source_document_reference,
    taxable_income_including_passive: form1040.line15_taxable_income,
    tax_including_passive: taxAll,
    taxable_income_without_passive: taxableWithoutPassive,
    tax_without_passive: taxWithout,
    line6: taxAll - taxWithout,
  };
}
