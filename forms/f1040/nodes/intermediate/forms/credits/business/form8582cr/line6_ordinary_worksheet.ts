import { z } from "zod";
import {
  computePropertyNet,
  inputSchema as scheduleEInputSchema,
} from "../../../../../inputs/income/rental-passthrough/schedule_e/index.ts";
import { inputSchema as form1099IntInputSchema } from "../../../../../inputs/income/investments/f1099int/index.ts";
import { FilingStatus, filingStatusSchema } from "../../../../../types.ts";
import { ordinaryTax2025 } from "../../../../worksheets/taxes/calculation/tax_table_2025.ts";
import { inputSchema as form8582crInputSchema } from "./index.ts";
import { reviewedLine6K1Income } from "./line6_k1_income.ts";
import { line6OrdinaryWorksheetSchema } from "./line6_source.ts";

/** A reviewed, rental-inventory ordinary-tax candidate for line 6; filing is gated separately. */
export { line6OrdinaryWorksheetSchema } from "./line6_source.ts";

export function calculateForm8582CRLine6OrdinaryWorksheet(
  rawWorksheet: unknown,
  rawScheduleE: unknown,
  rawForm8582cr: unknown,
  rawForm1040: unknown,
  rawSchedule1: unknown,
  rawGeneral: unknown,
  rawForm1099Int: unknown,
  rawPartnershipK1?: unknown,
  rawSCorpK1?: unknown,
) {
  const worksheet = line6OrdinaryWorksheetSchema.parse(rawWorksheet);
  const scheduleE = scheduleEInputSchema.parse(rawScheduleE ?? {});
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
    taxpayer_ssn: z.string().optional(),
  }).parse(rawGeneral);
  const incomeSources = "passive_income_sources" in worksheet
    ? worksheet.passive_income_sources
    : [worksheet];
  const sourcesById = new Map(
    incomeSources.map((source) => [source.activity_id, source]),
  );
  const k1Income = reviewedLine6K1Income(
    rawPartnershipK1,
    rawSCorpK1,
    general.taxpayer_ssn,
  );
  const propertyIds = new Set(
    [
      ...scheduleE.schedule_es.map((property) => property.activity_id),
      ...k1Income.map((source) => source.activity_id),
    ],
  );
  const netPassive = scheduleE.schedule_es.reduce(
    (total, property) => total + computePropertyNet(property),
    k1Income.reduce((sum, source) => sum + source.net_passive_income, 0),
  );
  let taxableInterest = 0;
  if (rawForm1099Int !== undefined) {
    const interestSource = form1099IntInputSchema.parse(rawForm1099Int);
    const references = new Set<string>();
    const payerCounts = new Map<string, number>();
    const payerNames = new Map<string, string>();
    const payerAccounts = new Map<string, Set<string>>();
    for (const row of interestSource.f1099ints) {
      const tin = row.payer_tin?.replace(/\D/g, "") ?? "";
      payerCounts.set(tin, (payerCounts.get(tin) ?? 0) + 1);
    }
    for (const row of interestSource.f1099ints) {
      const payerTin = row.payer_tin?.replace(/\D/g, "");
      const repeatedPayer = (payerCounts.get(payerTin ?? "") ?? 0) > 1;
      const review = row.box1_copy_review;
      const accounts = payerAccounts.get(payerTin ?? "") ?? new Set<string>();
      if (
        !row.source_document_reference ||
        !payerTin || !/^\d{9}$/.test(payerTin) ||
        references.has(row.source_document_reference) ||
        typeof row.box1 !== "number" || !Number.isSafeInteger(row.box1) ||
        row.box1 <= 0 ||
        (repeatedPayer &&
          (!row.account_number || accounts.has(row.account_number) ||
            !review ||
            review.account_number !== row.account_number ||
            review.source_document_reference !==
              row.source_document_reference ||
            review.reviewed_box1_amount !== row.box1 ||
            (payerNames.has(payerTin) &&
              payerNames.get(payerTin) !== row.payer_name))) ||
        (review !== undefined &&
          (review.account_number !== row.account_number ||
            review.source_document_reference !==
              row.source_document_reference ||
            review.reviewed_box1_amount !== row.box1)) ||
        Object.keys(row).some((key) =>
          ![
            "payer_name",
            "payer_tin",
            "source_document_reference",
            "account_number",
            "box1",
            "box1_copy_review",
          ]
            .includes(key)
        )
      ) {
        throw new Error(
          "Form 8582-CR ordinary interest branch needs distinct retained Form 1099-INT box 1 copies, with unique reviewed accounts and amounts for repeated payers",
        );
      }
      references.add(row.source_document_reference);
      payerNames.set(payerTin, row.payer_name);
      if (row.account_number) {
        accounts.add(row.account_number);
        payerAccounts.set(payerTin, accounts);
      }
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
    scheduleE.schedule_es.length + k1Income.length !== incomeSources.length ||
    sourcesById.size !== incomeSources.length ||
    propertyIds.size !== incomeSources.length ||
    scheduleE.schedule_es.some((property) => {
      const source = sourcesById.get(property.activity_id ?? "");
      const net = computePropertyNet(property);
      return !source || "source_origin" in source ||
        ("tsj" in source &&
          (source.tsj !== property.tsj ||
            (general.filing_status !== FilingStatus.MFJ &&
              source.tsj !== "T"))) ||
        (property.activity_type !== "A" && property.activity_type !== "B") ||
        property.property_type !== 1 ||
        property.passive_income_source_document_reference !==
          source.passive_income_source_document_reference ||
        !Number.isSafeInteger(net) || net <= 0 ||
        net !== source.net_passive_income ||
        property.royalties_income !== undefined ||
        property.qbi_trade_or_business === "Y" ||
        property.some_investment_not_at_risk === true ||
        (property.passive_property_sales?.length ?? 0) !== 0 ||
        (property.prior_unallowed_passive_operating ?? 0) !== 0 ||
        (property.prior_unallowed_passive_4797_part1 ?? 0) !== 0 ||
        (property.prior_unallowed_passive_4797_part2 ?? 0) !== 0;
    }) ||
    k1Income.some((actual) => {
      const source = sourcesById.get(actual.activity_id);
      return !source || !("source_origin" in source) ||
        source.source_origin.kind !== actual.source_origin.kind ||
        source.source_origin.ein !== actual.source_origin.ein ||
        source.tsj !== actual.tsj ||
        source.passive_income_source_document_reference !==
          actual.passive_income_source_document_reference ||
        source.net_passive_income !== actual.net_passive_income;
    }) ||
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
      "Form 8582-CR line 6 ordinary worksheet needs a complete sourced passive Schedule E income inventory and a matching final return",
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
    activity_id: "activity_id" in worksheet ? worksheet.activity_id : undefined,
    passive_income_source_document_reference:
      "passive_income_source_document_reference" in worksheet
        ? worksheet.passive_income_source_document_reference
        : undefined,
    passive_income_sources: incomeSources,
    taxable_income_including_passive: form1040.line15_taxable_income,
    tax_including_passive: taxAll,
    taxable_income_without_passive: taxableWithoutPassive,
    tax_without_passive: taxWithout,
    line6: taxAll - taxWithout,
  };
}
