import { z } from "zod";
import {
  calculateForm4952,
  inputSchema as formSchema,
} from "../../../../../nodes/intermediate/forms/deductions/investments/form4952/index.ts";
import { royaltyDebtProperty } from "../../../../../nodes/intermediate/forms/deductions/investments/form4952/royalty_debt.ts";
import { inputSchema as miscSchema } from "../../../../../nodes/inputs/income/business/f1099m/index.ts";
import { inputSchema as interestSchema } from "../../../../../nodes/inputs/income/investments/f1099int/index.ts";
import { inputSchema as scheduleESchema } from "../../../../../nodes/inputs/income/rental-passthrough/schedule_e/index.ts";
import { plainInvestmentBox1Or3 } from "./form4952_interest_reconciliation.ts";
import { sourceAmountsMatch } from "./form4952_combined_reconciliation.ts";

const sinkSchema = z.object({
  taxpayer_ssn: z.string(),
  filing_status: z.literal("single"),
  line2b_taxable_interest: z.number().optional(),
  line8_additional_income: z.number().optional(),
});
const schedule1Schema = z.object({
  line5_schedule_e: z.number(),
  line9_total_other_income: z.number().optional(),
  line10_total_additional_income: z.number(),
});

/** A directly purchased portfolio royalty, with all allowed interest on Schedule E. */
export function reconcileRoyaltyDebtReturn(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>>,
  finalFilerTin?: string,
) {
  const source = formSchema.parse(pending.form4952);
  const printed = formSchema.parse(fields);
  const trace = source.royalty_debt_trace;
  const sink = sinkSchema.parse(pending.f1040);
  const scheduleE = scheduleESchema.parse(pending.schedule_e);
  const schedule1 = schedule1Schema.parse(pending.schedule1);
  if (!trace || JSON.stringify(printed) !== JSON.stringify(source)) {
    throw new Error(
      "Form 4952 royalty debt needs its unchanged retained source",
    );
  }
  const misc = miscSchema.parse(pending.f1099m).f1099ms;
  const royalty = trace.royalty_source;
  const allowedMisc = new Set([
    "payer_name",
    "payer_tin",
    "recipient_tin",
    "source_document_reference",
    "box2_royalties",
    "box2_royalties_routing",
    "box2_nonpassive_portfolio_investment_for_form4952_verified",
  ]);
  if (
    trace.owner_tin !== sink.taxpayer_ssn.replaceAll("-", "") ||
    (finalFilerTin !== undefined &&
      trace.owner_tin !== finalFilerTin.replaceAll("-", "")) ||
    misc.length !== 1 || misc[0].payer_name !== royalty.payer_name ||
    misc[0].payer_tin !== royalty.payer_tin ||
    misc[0].recipient_tin !== royalty.recipient_tin ||
    misc[0].source_document_reference !== royalty.source_document_reference ||
    misc[0].box2_royalties !== royalty.box2_gross_royalties ||
    misc[0].box2_royalties_routing !== "schedule_e" ||
    misc[0].box2_nonpassive_portfolio_investment_for_form4952_verified !==
      true ||
    Object.keys(misc[0]).some((key) => !allowedMisc.has(key))
  ) {
    throw new Error(
      "Form 4952 royalty debt needs one owned, source-matched nonbusiness royalty",
    );
  }
  const interest = pending.f1099int === undefined
    ? []
    : interestSchema.parse(pending.f1099int).f1099ints;
  const amounts = interest.map((row) => (row.box1 ?? 0) + (row.box3 ?? 0));
  if (
    interest.some((row, i) =>
      !plainInvestmentBox1Or3(row) ||
      row.recipient_tin !== trace.owner_tin || !row.source_document_reference ||
      !Number.isInteger(amounts[i]) || (row.box6 ?? 0) !== 0 ||
      (row.foreign_source_interest_usd ?? 0) !== 0 || !!row.box7 ||
      row.foreign_tax_irs_country_code !== undefined
    ) ||
    new Set(interest.map((row) => row.source_document_reference)).size !==
      interest.length ||
    (amounts.length > 0
      ? !sourceAmountsMatch(source.source_1099_interest, amounts)
      : source.source_1099_interest !== undefined) ||
    ["f1099oid", "form8815", "form2555", "k1_1065", "k1_1120s", "k1_1041"].some(
      (key) => pending[key] !== undefined,
    )
  ) {
    throw new Error(
      "Form 4952 royalty debt requires complete plain owned interest and no unsupported combined source",
    );
  }
  const lines = calculateForm4952(source);
  const property = royaltyDebtProperty(trace, lines.line8);
  const row = scheduleE.schedule_es[0];
  const expected = scheduleESchema.parse({
    schedule_es: [property],
    royalty_income: royalty.box2_gross_royalties,
  });
  const interestTotal = amounts.reduce((sum, amount) => sum + amount, 0);
  const netRoyalty = royalty.box2_gross_royalties - lines.line8;
  const scheduleA = z.object({
    line_9_investment_interest: z.number().optional(),
  }).passthrough().optional().parse(pending.schedule_a);
  if (
    Object.entries(lines).some(([key, value]) => fields[key] !== value) ||
    !row || JSON.stringify(scheduleE) !== JSON.stringify(expected) ||
    schedule1.line5_schedule_e !== netRoyalty ||
    (schedule1.line9_total_other_income ?? 0) !== 0 ||
    schedule1.line10_total_additional_income !== netRoyalty ||
    (sink.line8_additional_income ?? 0) !== netRoyalty ||
    (sink.line2b_taxable_interest ?? 0) !== interestTotal ||
    (scheduleA?.line_9_investment_interest ?? 0) !== 0
  ) {
    throw new Error(
      "Form 4952 royalty deduction differs from Schedule E, Schedule 1 or final Form 1040",
    );
  }
  return property;
}
