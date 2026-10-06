import { assertCharitableDepreciationReturn } from "./f8283_depreciation_return.ts";
import { qdcgtw } from "../../../nodes/intermediate/worksheets/qdcgtw/index.ts";
import { f4852 } from "../../../nodes/inputs/f4852/index.ts";
import { household_wages } from "../../../nodes/inputs/household_wages/index.ts";
import { f1099div } from "../../../nodes/inputs/f1099div/index.ts";
import { schedule_b } from "../../../nodes/intermediate/aggregation/schedule_b/index.ts";
import { schedule_d } from "../../../nodes/intermediate/aggregation/schedule_d/index.ts";
import { inputSchema as giftSchema } from "../../../nodes/inputs/f8283/index.ts";
import { agi_aggregator } from "../../../nodes/intermediate/aggregation/agi_aggregator/index.ts";
import { agi_final } from "../../../nodes/intermediate/aggregation/agi_final/index.ts";
import { income_tax_calculation } from "../../../nodes/intermediate/worksheets/income_tax_calculation/index.ts";
import { w2 } from "../../../nodes/inputs/w2/index.ts";
import type { MefBuildContext } from "../form-descriptor.ts";

/** Expanded owned-gift packets retain the actual income and tax worksheet graph.
 * Replay those nodes rather than accepting an independently asserted AGI/tax.
 * Other income kinds remain in their retained aggregator/source contracts. */
export function assertReviewedForm8283Return(
  context: MefBuildContext | undefined,
): void {
  assertCharitableDepreciationReturn(context);
  const pending = context?.pending;
  if (!pending?.f8283) return;
  const gifts = giftSchema.parse(pending.f8283);
  if (
    ![...(gifts.section_a_items ?? []), ...(gifts.section_b_items ?? [])]
      .some((item) => item.donor_ownership_review)
  ) return;
  const final = pending.f1040 as Record<string, unknown> | undefined;
  const aggregate = pending.agi_aggregator;
  const worksheet = pending.income_tax_calculation;
  if (!final || !aggregate || !worksheet) {
    throw new Error(
      "Reviewed owned Form8283 needs retained income and tax calculation sources",
    );
  }
  const ctx = { taxYear: 2025, formType: "f1040" };
  const income = pending.agi_final
    ? agi_final.compute(ctx, agi_final.inputSchema.parse(pending.agi_final))
    : agi_aggregator.compute(ctx, agi_aggregator.inputSchema.parse(aggregate));
  const replayed = income.outputs.find((row) => row.nodeType === "f1040")
    ?.fields;
  if (
    !replayed || ["line11_agi", "line8_additional_income", "line10_adjustments"]
      .some((key) => Number(final[key] ?? 0) !== Number(replayed[key] ?? 0)) ||
    Number(final.line9_total_income) !==
      Number(final.line11_agi) + Number(final.line10_adjustments ?? 0)
  ) {
    throw new Error(
      "Reviewed Form8283 AGI and total income differ from the retained income graph",
    );
  }
  let issuedWageWithholding = 0;
  if (pending.w2) {
    const payroll = w2.compute(ctx, w2.inputSchema.parse(pending.w2));
    issuedWageWithholding += Number(
      payroll.outputs.find((row) => row.nodeType === "f1040")?.fields
        .line25a_w2_withheld ?? 0,
    );
    const wages = payroll.outputs.find((row) =>
      row.nodeType === "agi_aggregator"
    )?.fields.line1a_wages;
    if (wages !== undefined) {
      const retained = (aggregate as Record<string, unknown>).line1a_wages;
      if (!(Array.isArray(retained) ? retained : [retained]).includes(wages)) {
        throw new Error(
          "Reviewed Form8283 income graph differs from retained issued W2 wages",
        );
      }
    }
  }

  if (pending.f4852) {
    issuedWageWithholding += Number(
      f4852.compute(ctx, f4852.inputSchema.parse(pending.f4852)).outputs.find(
        (row) => row.nodeType === "f1040",
      )?.fields.line25a_w2_withheld ?? 0,
    );
  }
  if (pending.household_wages) {
    issuedWageWithholding += Number(
      household_wages.compute(
        ctx,
        household_wages.inputSchema.parse(pending.household_wages),
      ).outputs.find((row) => row.nodeType === "f1040")?.fields
        .line25a_w2_withheld ?? 0,
    );
  }
  if (issuedWageWithholding !== Number(final.line25a_w2_withheld ?? 0)) {
    throw new Error(
      "Reviewed Form8283 wage withholding differs from retained paid sources",
    );
  }
  const taxable = Math.max(
    0,
    Number(final.line11_agi) - Number(final.line12e_itemized_deductions ?? 0) -
      Number(final.line13_qbi_deduction ?? 0) -
      Number(final.line13b_additional_deductions ?? 0),
  );
  const containsContribution = (target: unknown, value: unknown) =>
    (Array.isArray(target) ? target : [target]).some((entry) =>
      JSON.stringify(entry) === JSON.stringify(value)
    );
  const assertAggregateOutput = (fields: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(fields)) {
      if (
        typeof value === "number" && value !== 0 &&
        !containsContribution(
          (aggregate as Record<string, unknown>)[key],
          value,
        )
      ) {
        throw new Error(
          "Reviewed Form8283 retained income source differs from its aggregator contribution",
        );
      }
    }
  };
  if (pending.f1099div) {
    const dividends = f1099div.compute(
      ctx,
      f1099div.inputSchema.parse(pending.f1099div),
    );
    for (const output of dividends.outputs) {
      if (
        output.nodeType === "income_tax_calculation" &&
        output.fields.qualified_dividends !== undefined &&
        !containsContribution(
          (worksheet as Record<string, unknown>).qualified_dividends,
          output.fields.qualified_dividends,
        )
      ) {
        throw new Error(
          "Reviewed Form8283 qualified-dividend workpaper differs from issued owned source",
        );
      }

      if (output.nodeType === "agi_aggregator") {
        assertAggregateOutput(output.fields);
      }
      if (output.nodeType === "schedule_b" && output.fields.dividend_detail) {
        const actual =
          (pending.schedule_b as Record<string, unknown> | undefined)
            ?.dividend_detail;
        const rows = Array.isArray(actual) ? actual : [actual];
        if (
          !rows.some((row) =>
            row &&
            Object.entries(
              output.fields.dividend_detail as Record<string, unknown>,
            )
              .every(([key, value]) =>
                JSON.stringify((row as Record<string, unknown>)[key]) ===
                  JSON.stringify(value)
              )
          )
        ) {
          throw new Error(
            "Reviewed Form8283 issued dividend copy differs from retained ScheduleB source",
          );
        }
      }
      if (output.nodeType === "schedule_d") {
        for (const [key, value] of Object.entries(output.fields)) {
          if (
            !containsContribution(
              (pending.schedule_d as Record<string, unknown> | undefined)
                ?.[key],
              value,
            )
          ) {
            throw new Error(
              "Reviewed Form8283 issued capital distribution differs from retained ScheduleD source",
            );
          }
        }
      }
    }
  }
  if (pending.schedule_b) {
    for (
      const output of schedule_b.compute(
        ctx,
        schedule_b.inputSchema.parse(pending.schedule_b),
      ).outputs
    ) {
      if (output.nodeType === "agi_aggregator") {
        assertAggregateOutput(output.fields);
      }
    }
  }
  const entered = income_tax_calculation.inputSchema.parse(worksheet);
  const total = (value: unknown): number =>
    Array.isArray(value)
      ? value.reduce((sum, item) => sum + Number(item), 0)
      : Number(value ?? 0);
  if (
    total(entered.qualified_dividends) !==
      total(final.line3a_qualified_dividends)
  ) {
    throw new Error(
      "Reviewed Form8283 qualified-dividend tax input differs from filed income",
    );
  }
  const capitalOutputs = [
    ...(pending.schedule_d
      ? schedule_d.compute(
        ctx,
        schedule_d.inputSchema.parse(pending.schedule_d),
      ).outputs
      : []),
    ...(pending.qdcgtw
      ? qdcgtw.compute(ctx, qdcgtw.inputSchema.parse(pending.qdcgtw)).outputs
      : []),
  ].filter((row) => row.nodeType === "income_tax_calculation");
  for (
    const key of [
      "net_capital_gain",
      "unrecaptured_1250_gain",
      "rate_28_gain",
    ] as const
  ) {
    if (
      total(entered[key]) !==
        capitalOutputs.reduce((sum, row) => sum + total(row.fields[key]), 0)
    ) {
      throw new Error(
        "Reviewed Form8283 preferential tax input differs from retained ScheduleD",
      );
    }
  }
  if (
    entered.taxable_income !== taxable ||
    Number(final.line15_taxable_income) !== taxable ||
    entered.filing_status !==
      (pending.general as Record<string, unknown> | undefined)?.filing_status
  ) {
    throw new Error(
      "Reviewed Form8283 taxable income differs from finalized deductions and filing status",
    );
  }
  const tax = income_tax_calculation.compute(ctx, entered).outputs
    .find((row) => row.nodeType === "f1040")?.fields.line16_income_tax;
  if (tax !== final.line16_income_tax) {
    throw new Error(
      "Reviewed Form8283 Form1040 tax differs from the retained tax worksheet",
    );
  }
}
