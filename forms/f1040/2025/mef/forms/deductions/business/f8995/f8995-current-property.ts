import { currentPropertyLossAllocation } from "../../../../../../nodes/inputs/income/rental-passthrough/schedule_e/current-property-loss-allocation.ts";
import { isDeepStrictEqual } from "node:util";
import { inputSchema as scheduleSchema } from "../../../../../../nodes/inputs/income/rental-passthrough/schedule_e/index.ts";
import {
  assertCurrentPropertyReturnOwners,
  currentPropertyAmounts,
  currentPropertyPassiveAmounts,
  currentPropertyQbiLines,
  currentPropertyQbiRows,
  reconcileCurrentPropertySource,
} from "../../../../../../nodes/inputs/income/rental-passthrough/schedule_e/current-property-source.ts";
import { inputSchema as farmSchema } from "../../../../../../nodes/inputs/income/business/f4835/index.ts";
import {
  currentFarmRentalNet,
  reconcileCurrentFarmRentalQbi,
} from "../../../../../../nodes/inputs/income/business/f4835/qbi-source.ts";
import { inputSchema as palSchema } from "../../../../../../nodes/intermediate/forms/income/business/form8582/index.ts";
import type { Filed8995 } from "./f8995-route.ts";
export function assertCurrentPropertyQbi(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
): Filed8995 {
  const properties =
      scheduleSchema.parse(pending?.schedule_e ?? {}).schedule_es,
    actualFarms = pending?.f4835 === undefined
      ? []
      : farmSchema.parse(pending.f4835).f4835s;
  const sources = properties.flatMap((item) => {
      const s = reconcileCurrentPropertySource(item);
      return s ? [s] : [];
    }),
    farms = actualFarms.flatMap((item) => {
      const s = reconcileCurrentFarmRentalQbi(item);
      return s ? [s] : [];
    });
  const g = pending?.general as any,
    f = pending?.f1040 as Record<string, number> | undefined,
    owners = [
      g?.taxpayer_ssn,
      ...(g?.filing_status === "mfj" ? [g.spouse_ssn] : []),
    ].map((v) => typeof v === "string" ? v.replace(/\D/g, "") : "");
  if (
    !f || !sources.length || properties.length !== sources.length ||
    actualFarms.length !== farms.length ||
    !isDeepStrictEqual(sources, fields.current_passive_property_sources) ||
    !isDeepStrictEqual(farms, fields.current_passive_farm_qbi_sources ?? []) ||
    sources.some((s, i) =>
      s.recipient_tin !== (properties[i].tsj === "S" ? owners[1] : owners[0])
    ) || farms.some((s) => !owners.includes(s.recipient_tin)) ||
    pending?.k1_partnership !== undefined ||
    pending?.k1_s_corp !== undefined || pending?.k1_trust !== undefined
  ) {
    throw new Error(
      "Current property QBI must join every actual rental/farm owner and issued source",
    );
  }
  assertCurrentPropertyReturnOwners(sources, owners);
  const pal = palSchema.parse(pending?.form8582 ?? {}),
    expected = [
      ...sources.filter((s) =>
        currentPropertyPassiveAmounts(s).passiveOperating !== 0 ||
        (pal.current_loss_forms !== undefined &&
          currentPropertyPassiveAmounts(s).passiveGain < 0)
      ).map((s) => {
        const a = currentPropertyAmounts(s);
        return {
          id: s.activity_id,
          net: currentPropertyPassiveAmounts(s).passiveOperating,
        };
      }),
      ...farms.filter((s) =>
        pal.current_loss_forms === undefined || currentFarmRentalNet(s) !== 0
      ).map((s) => ({
        id: s.activity_id,
        net: currentFarmRentalNet(s),
      })),
    ];
  if (
    (pal.activities?.length ?? 0) !== expected.length ||
    expected.some((r) =>
      !pal.activities?.some((a) =>
        a.activity_id === r.id && a.current_net === r.net &&
        a.activity_type === "B" && a.prior_unallowed_operating === 0 &&
        a.prior_unallowed_4797_part1 === 0 && a.prior_unallowed_4797_part2 === 0
      )
    ) ||
    (pal.current_loss_forms !== undefined
      ? !isDeepStrictEqual(
        pal.current_loss_forms,
        currentPropertyLossAllocation(sources, farms).origins.filter((r) =>
          r.passive
        ).map((r) => ({
          activity_id: r.activity_id,
          special_allowance_eligible: false,
          forms: r.forms,
        })),
      ) || (pal.current_4797_sale_gains?.length ?? 0) !== 0
      : ((pal.current_4797_sale_gains?.length ?? 0) !==
          sources.filter((s) =>
            currentPropertyPassiveAmounts(s).passiveGain > 0
          )
            .length ||
        sources.filter((s) => currentPropertyPassiveAmounts(s).passiveGain > 0)
          .some((s) =>
            !pal.current_4797_sale_gains?.some((r) =>
              r.activity_id === s.activity_id &&
              r.activity_name === s.activity_name && r.part === "II" &&
              r.gain === currentPropertyPassiveAmounts(s).passiveGain &&
              r.entire_activity_interest_disposed === false
            )
          )))
  ) {
    throw new Error(
      "Current property QBI requires complete actual current passive activity/sale pool",
    );
  }
  const sum = (k: string) =>
    Array.isArray(fields[k])
      ? (fields[k] as number[]).reduce((n, v) => n + v, 0)
      : (fields[k] ?? 0);
  if (
    [
      "qbi_from_schedule_c",
      "qbi_from_schedule_f",
      "sstb_qbi",
      "line6_sec199a_dividends",
      "qbi_loss_carryforward",
      "reit_loss_carryforward",
      "se_tax_deduction",
      "se_health_insurance_deduction",
      "retirement_plan_deduction",
      "net_capital_gain",
    ].some((k) => sum(k) !== 0) ||
    fields.current_k1_qbi_sources !== undefined ||
    sum("qbi") !== sources.reduce((n, s) => {
        const a = currentPropertyAmounts(s);
        return n + a.receipts - a.taxes + a.gain;
      }, 0)
  ) {
    throw new Error(
      "Current property QBI has an unmatched business or other component",
    );
  }
  const taxable = Math.max(
    0,
    f.line11_agi - (f.line12c_deduction_total ?? 0) -
      (f.line13b_additional_deductions ?? 0),
  );
  if (taxable > (g.filing_status === "mfj" ? 394600 : 197300)) {
    throw new Error(
      "Current property QBI above threshold needs actual advanced sources",
    );
  }
  const expectedLines = currentPropertyQbiLines(sources, farms, taxable),
    lines: Record<number, number> = {};
  for (let line = 2; line <= 17; line++) {
    const key = `line${line}` as keyof typeof expectedLines;
    if (fields[key] !== expectedLines[key]) {
      throw new Error(
        `Current property QBI ${key} differs from actual allowed-source calculation`,
      );
    }
    lines[line] = expectedLines[key] as number;
  }
  if (
    fields.qbi_deduction !== expectedLines.line15 ||
    (f.line13_qbi_deduction ?? 0) !== expectedLines.line15 ||
    (f.line15_taxable_income ?? 0) !==
      Math.max(0, taxable - expectedLines.line15)
  ) {
    throw new Error(
      "Current property QBI must reconcile finalized1040 deduction/taxable income",
    );
  }
  return {
    businesses: currentPropertyQbiRows(sources, farms),
    lines: lines as Filed8995["lines"],
  };
}
