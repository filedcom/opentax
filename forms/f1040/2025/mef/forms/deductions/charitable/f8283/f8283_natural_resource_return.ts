import { assertForm6251CharitableSource } from "../../../../../domains/taxes/amt/form6251/form6251_charitable_source.ts";
import { schedule_f } from "../../../../../../nodes/intermediate/forms/income/business/schedule_f/index.ts";
import { calculateCharitableNaturalResource } from "../../../../../../nodes/inputs/deductions/charitable/f8283/natural-resource-source.ts";
import { inputSchema as giftSchema } from "../../../../../../nodes/inputs/deductions/charitable/f8283/index.ts";
import { scheduleC } from "../../../../../../nodes/inputs/income/business/schedule_c/index.ts";
import { w2 } from "../../../../../../nodes/inputs/income/wages/w2/index.ts";
import { schedule_se } from "../../../../../../nodes/intermediate/forms/taxes/self-employment/schedule_se/index.ts";
import { form8995 } from "../../../../../../nodes/intermediate/forms/deductions/business/form8995/index.ts";
import type { MefBuildContext } from "../../../../form-descriptor.ts";

/** Source-derived operating income remains income even though the donated
 * property itself has no taxable sale. Replay each owned annual account. */
export function assertCharitableNaturalResourceReturn(
  context: MefBuildContext | undefined,
) {
  const pending = context?.pending;
  if (!pending) return;
  const businesses = pending.schedule_c
    ? scheduleC.inputSchema.parse(pending.schedule_c).schedule_cs
    : [];
  const farms = pending.schedule_f
    ? schedule_f.inputSchema.parse(pending.schedule_f).schedule_fs
    : [];
  const ownedFarms = farms.filter((row) =>
    row.donated_natural_resource_property_source
  );
  const owned = businesses.filter((row) =>
    row.donated_natural_resource_property_source
  );
  if (!pending.f8283) {
    if (owned.length || ownedFarms.length) {
      throw new Error(
        "Natural-resource business requires owned Form8283 inventory",
      );
    }
    return;
  }
  const gifts = giftSchema.parse(pending.f8283);
  const sources = [
    ...(gifts.section_a_items ?? []).flatMap((row) =>
      row.natural_resource_ordinary_income_reduction
        ? [row.natural_resource_ordinary_income_reduction]
        : []
    ),
    ...(gifts.section_b_items ?? []).flatMap((row) =>
      row.special_fmv_reduction?.reason === "natural_resource_ordinary_income"
        ? [row.special_fmv_reduction.source]
        : []
    ),
  ];
  for (const row of [...owned, ...ownedFarms]) {
    if (
      !sources.some((source) =>
        JSON.stringify(source) ===
          JSON.stringify(row.donated_natural_resource_property_source)
      )
    ) {
      throw new Error(
        "Natural-resource ScheduleC ledger detached from owned gift source",
      );
    }
  }
  const seen = new Set<string>();
  let active = false;
  for (const source of sources) {
    if (seen.has(source.property_reference)) {
      throw new Error("Duplicate owned natural-resource gift source");
    }
    seen.add(source.property_reference);
    const calc = calculateCharitableNaturalResource(source);
    const current = source.annual_records.at(-1)!;
    if (
      current.gross_property_income === 0 &&
      calc.current_year.deduction === 0 && calc.current_year.depletion === 0
    ) continue;
    active = true;
    const rows = source.kind === "farmland_1252"
      ? farms.filter((row) =>
        row.farm_id === source.business_reference &&
        (row.proprietor_recipient ?? "T") === source.proprietor_recipient
      )
      : businesses.filter((row) =>
        row.business_reference === source.business_reference &&
        (row.proprietor_recipient ?? "T") === source.proprietor_recipient
      );
    if (
      rows.length !== 1 ||
      JSON.stringify(rows[0].donated_natural_resource_property_source) !==
        JSON.stringify(source)
    ) {
      throw new Error(
        "Current natural-resource income/deductions require the same owned operating source on ScheduleC",
      );
    }
  }
  assertForm6251CharitableSource(
    (pending.form6251 ?? {}) as Record<string, unknown>,
    pending,
  );
  if (!active) return;
  const ctx = { taxYear: 2025, formType: "f1040" };
  const compare = (
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
            `Natural-resource operating source graph differs at ${output.nodeType}.${key}`,
          );
        }
      }
    }
  };
  if (pending.schedule_f) {
    compare(
      schedule_f.compute(ctx, schedule_f.inputSchema.parse(pending.schedule_f))
        .outputs,
      ["agi_aggregator", "schedule1", "schedule_se", "form8995"],
    );
  }
  if (pending.schedule_c) {
    compare(
      scheduleC.compute(ctx, scheduleC.inputSchema.parse(pending.schedule_c))
        .outputs,
      ["agi_aggregator", "schedule1", "schedule_se", "form8995", "form6251"],
    );
  }
  if (pending.w2) {
    compare(w2.compute(ctx, w2.inputSchema.parse(pending.w2)).outputs, [
      "schedule_se",
    ]);
  }
  compare(
    schedule_se.compute(ctx, schedule_se.inputSchema.parse(pending.schedule_se))
      .outputs,
    ["agi_aggregator", "schedule1", "form8995", "schedule2"],
  );
  compare(
    form8995.compute(ctx, form8995.inputSchema.parse(pending.form8995)).outputs,
    ["f1040", "standard_deduction"],
  );
}
