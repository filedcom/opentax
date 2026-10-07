import { currentLossFilingProjection } from "./current-loss-filing-projection.ts";
import { isDeepStrictEqual } from "node:util";
import { inputSchema as scheduleSchema } from "../nodes/inputs/schedule_e/index.ts";
import {
  currentPropertyAmounts,
  reconcileCurrentPropertySource,
} from "../nodes/inputs/schedule_e/current-property-source.ts";
import { form8582 } from "./mef/forms/f8582.ts";
import { assertCurrentPropertyQbi } from "./mef/forms/f8995-current-property.ts";
export function assertCurrentPassivePropertyReturn(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
) {
  if (fields.current_loss_forms !== undefined) {
    currentLossFilingProjection({ ...pending, form4797: fields });
    return;
  }
  const raw = pending?.schedule_e;
  const buckets = Array.isArray(raw) ? raw : [raw];
  const hasOwnedSource = buckets.some((bucket) => {
    if (!bucket || typeof bucket !== "object") return false;
    const rows = (bucket as Record<string, unknown>).schedule_es;
    return Array.isArray(rows) &&
      rows.some((row) => row?.current_property_source !== undefined);
  });
  if (fields.current_property_sources === undefined && !hasOwnedSource) return;
  const properties =
    scheduleSchema.parse(pending?.schedule_e ?? {}).schedule_es;
  const sources = properties.flatMap((item) => {
    const s = reconcileCurrentPropertySource(item);
    return s ? [s] : [];
  });
  if (sources.some((s) => currentPropertyAmounts(s).gain < 0)) {
    currentLossFilingProjection({ ...pending, form4797: fields });
    return;
  }
  if (!sources.length) {
    if (fields.current_property_sources !== undefined) {
      throw new Error(
        "Current property4797 inventory has no actual owned rental source",
      );
    }
    return;
  }
  if (!pending) {
    throw new Error("Current owned property requires actual return source");
  }
  const sales = fields.passive_property_sales as any[] | undefined;
  if (
    sales?.length !== sources.length ||
    sources.some((s) =>
      !sales.some((sale) =>
        sale.activity_id === s.activity_id &&
        sale.activity_name === s.activity_name && sale.part === "II" &&
        sale.gross_sales_price === s.closing_record.gross_paid &&
        sale.cost_or_other_basis === currentPropertyAmounts(s).cost &&
        sale.acquired_on === s.acquisition_record.acquired_on &&
        sale.sold_on === s.closing_record.sold_on &&
        sale.disposition_document_reference ===
          s.closing_record.closing_reference &&
        sale.entire_activity_interest_disposed === false
      )
    )
  ) {
    throw new Error(
      "Current owned property4797 must match every actual source closing",
    );
  }
  if (!isDeepStrictEqual(sources, fields.current_property_sources)) {
    throw new Error(
      "Current property4797 source inventory must match actual owned acquisition and closing records",
    );
  }
  const gain = sources.reduce((n, s) => n + currentPropertyAmounts(s).gain, 0),
    agi = pending.agi_aggregator as any,
    schedule1 = pending.schedule1 as any;
  if (
    agi?.line4_other_gains !== gain || schedule1?.line4_other_gains !== gain
  ) {
    throw new Error(
      "Current property4797 must join actual AGI/Schedule1 gain",
    );
  }
  const joined: Readonly<Record<string, unknown>> = {
    ...pending,
    form4797: fields,
  };
  if (joined.form8582 !== undefined) {
    if (
      !joined.form8582 || typeof joined.form8582 !== "object" ||
      Array.isArray(joined.form8582)
    ) throw new Error("Current property PAL must retain an actual ledger");
    form8582.build(joined.form8582 as any, { pending: joined });
  }
  const qbi = pending.form8995;
  if (!qbi || typeof qbi !== "object" || Array.isArray(qbi)) {
    throw new Error("Current property source requires actual8995");
  }
  assertCurrentPropertyQbi(qbi as Record<string, unknown>, joined);
}
