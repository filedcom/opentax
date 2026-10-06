import { normalizeAllPending } from "../../pending.ts";
import { assertOwnedScheduleSE } from "../../schedule-se-owner-source.ts";
import { jointOwnerQbi } from "../../../nodes/intermediate/forms/form8995/joint-owner.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import type { Filed8995 } from "./f8995-route.ts";

/** Recompute actual owner deductions and filed business rows before either export. */
export function assertJointOwner8995(
  fields: Record<string, unknown>,
  raw: Readonly<Record<string, unknown>> | undefined,
): Filed8995 {
  if (!raw) throw new Error("Joint owner QBI needs the complete source return");
  const p = normalizeAllPending(raw as Record<string, unknown>);
  const owned = assertOwnedScheduleSE(p);
  const f = p.f1040;
  const g = p.general;
  if (
    !owned || !f || !g || typeof f.line11_agi !== "number" ||
    typeof f.line12c_deduction_total !== "number"
  ) {
    throw new Error("Joint owner QBI needs settled owner sources and Form1040");
  }
  const profit = owned.source.businesses.reduce(
    (sum, row) => sum + row.net_profit,
    0,
  );
  const w2s = p.w2?.w2s as Array<Record<string, unknown>> | undefined;
  const wages = w2s?.reduce((sum, row) => sum + Number(row.box1_wages), 0) ?? 0;
  const canonical = (value: unknown) =>
    JSON.stringify(
      value,
      (_key, item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? Object.fromEntries(
            Object.keys(item).sort().map((key) => [key, item[key]]),
          )
          : item,
    );
  const expected = jointOwnerQbi(
    owned.source,
    f.line11_agi - f.line12c_deduction_total,
    CONFIG_BY_YEAR[2025].ssWageBase,
  );
  if (
    canonical(fields.joint_se_source) !== canonical(owned.source) ||
    canonical(fields.joint_owner_filing_rows) !==
      canonical(expected.joint_owner_filing_rows) ||
    g.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    g.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    g.filing_status !== "mfj" || fields.filing_status !== "mfj" ||
    Math.abs(f.line11_agi - (wages + profit - owned.deduction)) >= .000001 ||
    Number(f.line10_adjustments ?? 0) !== owned.deduction ||
    Number(f.line1a_wages ?? 0) !== wages ||
    Number(f.line13_qbi_deduction ?? 0) !== expected.line15 ||
    Number(fields.qbi_deduction) !== expected.line15 ||
    Math.abs(
        Number(f.line15_taxable_income ?? 0) -
          Math.max(
            0,
            f.line11_agi - f.line12c_deduction_total - expected.line15,
          ),
      ) >= .000001 ||
    (w2s?.some((row) => row.box13_statutory_employee === true) ?? false) ||
    [
      "schedule_e",
      "k1_partnership",
      "k1_s_corp",
      "f1099patr",
      "sep_retirement",
      "form8995a",
    ].some((key) => p[key] !== undefined) ||
    [
      "line2b_taxable_interest",
      "line3a_qualified_dividends",
      "line3b_ordinary_dividends",
      "line7_capital_gain",
      "line7a_cap_gain_distrib",
      "line13b_additional_deductions",
    ].some((key) => Number(f[key] ?? 0) !== 0)
  ) {
    throw new Error(
      "Joint owner Form8995 source, attributable deduction, business rows or Form1040 totals differ",
    );
  }
  const lines = {} as Record<keyof Filed8995["lines"], number>;
  for (
    const n of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const
  ) {
    const value = expected[`line${n}`];
    if (fields[`line${n}`] !== value) {
      throw new Error(
        `Joint owner Form8995 line${n} differs from source calculation`,
      );
    }
    lines[n] = value;
  }
  return {
    businesses: expected.joint_owner_filing_rows.map((row) => ({
      businessName: row.business_name,
      tin: row.tin,
      qbi: row.qbi,
    })),
    lines,
  };
}
