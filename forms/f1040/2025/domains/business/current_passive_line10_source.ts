import { assertCurrentK1Qbi } from "../../mef/forms/business/f8995/f8995-current-k1.ts";
import {
  assertBox11Line10Sources,
  box11Line10SourceSchema,
  currentPassiveLine10Activities,
} from "../../../nodes/inputs/k1_partnership/box11_line10.ts";
import { inputSchema as agiSchema } from "../../../nodes/intermediate/aggregation/agi_aggregator/index.ts";
import { form8582 } from "../../mef/forms/execution/f8582/f8582.ts";
/** Both standalone filed4797 and directPDF must replay actual owner/activity/PAL. */
export function assertCurrentPassiveLine10Return(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
) {
  const rows = box11Line10SourceSchema.array().parse(
    fields.k1_box11_line10_rows ?? [],
  );
  if (rows.length === 0) return;
  const agi = agiSchema.parse(pending?.agi_aggregator ?? {});
  const hasPal =
    (agi.pal_current_loss ?? 0) + (agi.pal_prior_unallowed ?? 0) > 0;
  const passive = rows.filter((row) =>
    row.eic_activity_review?.classification === "passive"
  );
  if (hasPal && passive.some((row) => !row.current_passive_source)) {
    throw new Error(
      "Passive ordinary K1 with actual PAL needs complete current source inventory",
    );
  }
  if (!rows.some((row) => row.current_passive_source)) return;
  currentPassiveLine10Activities(rows);
  const general = pending?.general as Record<string, unknown> | undefined;
  const digits = (v: unknown) =>
    typeof v === "string" ? v.replace(/\D/g, "") : "";
  const recipients = [
    digits(general?.taxpayer_ssn),
    ...(general?.filing_status === "mfj" ? [digits(general.spouse_ssn)] : []),
  ];
  if (!pending) {
    throw new Error(
      "Current passive ordinary4797 needs actual public return sources",
    );
  }
  const joined: Readonly<Record<string, unknown>> = {
    ...pending,
    form4797: fields,
  };
  assertBox11Line10Sources(joined, recipients);
  const pal = joined.form8582;
  if (!pal || typeof pal !== "object" || Array.isArray(pal)) {
    throw new Error(
      "Current passive ordinary4797 needs actual8582 activity pool",
    );
  }
  form8582.build(pal as Parameters<typeof form8582.build>[0], {
    pending: joined,
  });
  const k1 = pending.k1_partnership as {
    k1_partnerships?: Array<
      { qualified_business_income_source?: unknown; box20z_qbi?: number }
    >;
  } | undefined;
  if (
    k1?.k1_partnerships?.some((row) =>
      row.qualified_business_income_source || (row.box20z_qbi ?? 0) > 0
    )
  ) {
    const qbi = joined.form8995;
    if (!qbi || typeof qbi !== "object" || Array.isArray(qbi)) {
      throw new Error("Current ordinary RPE needs its actual required8995");
    }
    assertCurrentK1Qbi(qbi as Record<string, unknown>, joined);
  }
}
