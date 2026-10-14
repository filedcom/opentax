import { calculateCharitableDepreciation } from "../../../../../../nodes/inputs/deductions/charitable/f8283/depreciation-source.ts";
import { inputSchema as giftSchema } from "../../../../../../nodes/inputs/deductions/charitable/f8283/index.ts";
import { scheduleC } from "../../../../../../nodes/inputs/income/business/schedule_c/index.ts";
import { projectScheduleCItems } from "../../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { f1099nec } from "../../../../../../nodes/inputs/income/business/f1099nec/index.ts";
import { w2 } from "../../../../../../nodes/inputs/income/wages/w2/index.ts";
import { schedule_se } from "../../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/index.ts";
import { form8995 } from "../../../../../../nodes/intermediate/forms/deductions/business/form8995/index.ts";
import type { MefBuildContext } from "../../../../form-descriptor.ts";

/** Replay the active donation's owned annual ledger through the filed business,
 * issued receipts, owner SE, adjustment and QBI. Hypothetical gain is never income. */
export function assertCharitableDepreciationReturn(
  context: MefBuildContext | undefined,
) {
  const pending = context?.pending;
  if (!pending) return;
  const ownedBusinesses = pending.schedule_c
    ? scheduleC.inputSchema.parse(pending.schedule_c).schedule_cs.filter((
      row,
    ) => row.donated_depreciable_property_source)
    : [];
  if (!pending.f8283) {
    if (ownedBusinesses.length > 0) {
      throw new Error(
        "Donated-asset business source requires its owned Form8283 claim inventory",
      );
    }
    return;
  }
  const gifts = giftSchema.parse(pending.f8283);
  const sources = [
    ...(gifts.section_a_items ?? []).flatMap((row) =>
      row.depreciation_ordinary_income_reduction
        ? [row.depreciation_ordinary_income_reduction]
        : []
    ),
    ...(gifts.section_b_items ?? []).flatMap((row) =>
      row.special_fmv_reduction?.reason === "depreciation_ordinary_income"
        ? [row.special_fmv_reduction.source]
        : []
    ),
  ];
  for (const business of ownedBusinesses) {
    const ledger = business.donated_depreciable_property_source!;
    if (
      !sources.some((row) => JSON.stringify(row) === JSON.stringify(ledger))
    ) {
      throw new Error(
        "ScheduleC donated-asset ledger is detached from owned Form8283 source inventory",
      );
    }
  }
  if (sources.length === 0) return;
  const seen = new Set<string>();
  const ctx = { taxYear: 2025, formType: "f1040" };
  const active = sources.filter((source) => {
    if (seen.has(source.property_reference)) {
      throw new Error(
        "Donated depreciable property source cannot support duplicate gifts",
      );
    }
    seen.add(source.property_reference);
    return calculateCharitableDepreciation(source).current_year_depreciation >
      0;
  });
  if (active.length === 0) return;
  const business = scheduleC.inputSchema.parse(pending.schedule_c);
  const items = projectScheduleCItems(business);
  const receipts = f1099nec.inputSchema.parse(pending.f1099nec);
  for (const source of active) {
    const item = items.find((row) =>
      row.business_reference === source.business_reference &&
      row.proprietor_recipient === source.proprietor_recipient
    );
    const calc = calculateCharitableDepreciation(source);
    if (
      !item ||
      JSON.stringify(item.donated_depreciable_property_source) !==
        JSON.stringify(calc.source)
    ) {
      throw new Error(
        "Form8283 active donated-asset ledger differs from actual owned ScheduleC source",
      );
    }
    const ownedReceipts = receipts.f1099necs.filter((row) =>
      row.for_routing === "schedule_c" &&
      row.schedule_c_business_reference === source.business_reference
    );
    if (
      ownedReceipts.length !== 1 ||
      ownedReceipts[0].recipient_ssn?.replace(/\D/g, "") !== source.donor_ssn ||
      ownedReceipts[0].source_document_reference !==
        source.current_year_business_records?.issued_receipts_reference ||
      ownedReceipts[0].box1_nec !==
        source.current_year_business_records?.gross_receipts
    ) {
      throw new Error(
        "Form8283 active business income differs from owned issued1099NEC source",
      );
    }
  }
  if (pending.form4562 !== undefined || pending.form4797 !== undefined) {
    throw new Error(
      "Reviewed donated-asset prior nonlisted route has no current4562 trigger or actual sale source",
    );
  }
  const compareOutputs = (
    outputs: readonly { nodeType: string; fields: Record<string, unknown> }[],
    targets: readonly string[],
  ) => {
    for (
      const output of outputs.filter((row) => targets.includes(row.nodeType))
    ) {
      const target = pending[output.nodeType] as
        | Record<string, unknown>
        | undefined;
      for (const [key, value] of Object.entries(output.fields)) {
        if (
          value !== undefined &&
          JSON.stringify(target?.[key]) !== JSON.stringify(value)
        ) {
          throw new Error(
            `Donated asset source graph differs at ${output.nodeType}.${key}`,
          );
        }
      }
    }
  };
  compareOutputs(scheduleC.compute(ctx, business).outputs, [
    "agi_aggregator",
    "schedule1",
    "schedule_se",
    "form8995",
  ]);
  compareOutputs(w2.compute(ctx, w2.inputSchema.parse(pending.w2)).outputs, [
    "schedule_se",
  ]);
  compareOutputs(
    schedule_se.compute(ctx, schedule_se.inputSchema.parse(pending.schedule_se))
      .outputs,
    ["agi_aggregator", "schedule1", "form8995", "schedule2"],
  );
  compareOutputs(
    form8995.compute(ctx, form8995.inputSchema.parse(pending.form8995)).outputs,
    ["f1040", "standard_deduction"],
  );
}
