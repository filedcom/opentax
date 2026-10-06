import { inputSchema as w2SourceSchema } from "../../../nodes/inputs/w2/index.ts";
import { assertQualifiedTipQbiSource } from "../../form8995_qualified_tip_source.ts";
import { assertIndependentOwnerHealth } from "../../form7206_independent_owner_source.ts";
import { normalizeAllPending } from "../../pending.ts";
import { assertOwnedScheduleSE } from "../../schedule-se-owner-source.ts";
import { jointOwnerQbi } from "../../../nodes/intermediate/forms/form8995/joint-owner.ts";
import { CONFIG_BY_YEAR } from "../../../nodes/config/index.ts";
import type { Filed8995 } from "./f8995-route.ts";
import {
  calculateSingleScheduleCForm7206,
  reconcileSingleScheduleCGraphSource,
  singleScheduleCPlanSchema,
} from "../../../nodes/intermediate/forms/form7206/index.ts";
import { assertForm7206SpouseCoverage } from "../../form7206_spouse_coverage.ts";
import { assertScheduleCReceiptSourceIdentity } from "../../filer-source-reconciliation.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";

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
  const w2s = p.w2 === undefined ? undefined : w2SourceSchema.parse(p.w2).w2s;
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
  const rawFamily = p.form7206?.independent_schedule_c_plans;
  const family = rawFamily === undefined
    ? undefined
    : assertIndependentOwnerHealth(p);
  const rawPlan = p.form7206?.single_schedule_c_plan;
  const plan = rawPlan === undefined
    ? undefined
    : singleScheduleCPlanSchema.parse(rawPlan);
  const health = family?.deduction ??
    (plan ? calculateSingleScheduleCForm7206(plan).line14 : 0);
  if (plan) {
    if (p.schedule_c?.f1099nec_receipt_sources) {
      const filer = extractFilerIdentity(f);
      if (!filer) {
        throw new Error(
          "Joint QBI issued receipts need the actual settled filer identity",
        );
      }
      assertScheduleCReceiptSourceIdentity(p, filer);
    }
    const lines = calculateSingleScheduleCForm7206(plan), form = p.form7206!;
    reconcileSingleScheduleCGraphSource(form, plan, owned.deduction);
    assertForm7206SpouseCoverage(plan, p);
    const identityName = `${g.taxpayer_first_name} ${g.taxpayer_last_name}`;
    const recipient = plan.recipient === "S"
      ? plan.spouse_identity!
      : plan.taxpayer_identity;
    if (
      Object.entries(lines).some(([key, value]) => form[key] !== value) ||
      plan.taxpayer_identity.ssn.replaceAll("-", "") !==
        String(g.taxpayer_ssn).replaceAll("-", "") ||
      plan.taxpayer_identity.name.trim().toUpperCase() !==
        identityName.trim().toUpperCase() ||
      form.recipient_name !== recipient.name ||
      form.recipient_ssn !== recipient.ssn.replaceAll("-", "") ||
      p.schedule1?.line17_se_health_insurance !== health
    ) {
      throw new Error(
        "Joint Form8995 must retain its actual computed Form7206 owner, premium lines and Schedule1 deduction",
      );
    }
  }
  const sum = (v: unknown) =>
    (Array.isArray(v) ? v : [v ?? 0]).reduce<number>((n, x) => {
      if (typeof x !== "number" || !Number.isFinite(x) || x < 0) {
        throw new Error(
          "Joint QBI deduction source must be a nonnegative amount",
        );
      }
      return n + x;
    }, 0);
  if (
    canonical(fields.joint_owner_health_plan_source) !== canonical(rawPlan) ||
    canonical(fields.joint_owner_health_plans_source) !==
      canonical(rawFamily) ||
    sum(fields.se_health_insurance_deduction) !== health ||
    Number(p.schedule1?.line17_se_health_insurance ?? 0) !== health
  ) {
    throw new Error(
      "Joint Form8995 health adjustment must join the actual sourced Form7206 plan",
    );
  }
  const tips = assertQualifiedTipQbiSource(fields, p);
  const additional = Number(f.line13b_additional_deductions ?? 0);
  const expected = jointOwnerQbi(
    owned.source,
    f.line11_agi - f.line12c_deduction_total - additional,
    CONFIG_BY_YEAR[2025].ssWageBase,
    plan,
    health,
    family?.source,
    tips.source,
  );
  if (
    canonical(fields.joint_se_source) !== canonical(owned.source) ||
    canonical(fields.joint_owner_filing_rows) !==
      canonical(expected.joint_owner_filing_rows) ||
    g.qbi_no_prior_loss_or_suspended_loss_confirmed !== true ||
    g.qbi_not_patron_of_specified_cooperative_confirmed !== true ||
    g.filing_status !== "mfj" || fields.filing_status !== "mfj" ||
    Math.abs(f.line11_agi - (wages + profit - owned.deduction - health)) >=
      .000001 ||
    Number(f.line10_adjustments ?? 0) !== owned.deduction + health ||
    Number(f.line1a_wages ?? 0) !== wages ||
    Number(f.line13_qbi_deduction ?? 0) !== expected.line15 ||
    Number(fields.qbi_deduction) !== expected.line15 ||
    Math.abs(
        Number(f.line15_taxable_income ?? 0) -
          Math.max(
            0,
            f.line11_agi - f.line12c_deduction_total - additional -
              expected.line15,
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
