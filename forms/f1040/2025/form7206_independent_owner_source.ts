import { normalizeAllPending } from "./pending.ts";
import { assertOwnedScheduleSE } from "./schedule-se-owner-source.ts";
import { assertScheduleCReceiptSourceIdentity } from "./filer-source-reconciliation.ts";
import { assertForm7206SpouseCoverage } from "./form7206_spouse_coverage.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import type { FilerIdentity } from "../mef/header.ts";
import { CONFIG_BY_YEAR } from "../nodes/config/index.ts";
import {
  calculateIndependentOwnerHealth,
  reconcileIndependentOwnerHealthGraph,
} from "../nodes/intermediate/forms/form7206/independent-owner.ts";
export const independentHealthCanonical = (value: unknown) =>
  JSON.stringify(
    value,
    (_k, v) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
        : v,
  );
const name = (v: string) => v.trim().replace(/\s+/g, " ").toUpperCase();
export function assertIndependentOwnerHealth(
  raw: Readonly<Record<string, unknown>> | undefined,
  filer?: FilerIdentity,
  providedFields?: unknown,
) {
  if (!raw) {
    throw new Error(
      "Independent owner health plans require the complete actual return",
    );
  }
  const p = normalizeAllPending(raw as Record<string, unknown>),
    fields = p.form7206,
    g = p.general,
    f = p.f1040;
  if (!fields?.independent_schedule_c_plans || !g || !f) {
    throw new Error(
      "Independent owner health plans need settled source and return identities",
    );
  }
  if (
    providedFields !== undefined &&
    independentHealthCanonical(providedFields) !==
      independentHealthCanonical(fields)
  ) {
    throw new Error(
      "Independent Form7206 filing source is detached from the actual prepared return",
    );
  }
  const allowed = new Set([
    "independent_schedule_c_plans",
    "independent_plan_filing_rows",
    "schedule_c_source",
    "schedule_se_source",
    "schedule1_line16_source",
    "marketplace_ptc_premium_overlap",
  ]);
  if (Object.keys(fields).some((k) => !allowed.has(k))) {
    throw new Error(
      "Independent Form7206 cannot merge an unreviewed filing source or scalar lines",
    );
  }
  const actualFiler = filer ?? extractFilerIdentity(f),
    owned = assertOwnedScheduleSE(p, actualFiler);
  if (!owned || !actualFiler) {
    throw new Error(
      "Independent health plans need actual separate proprietor SE and filer identities",
    );
  }
  const result = calculateIndependentOwnerHealth(
    fields.independent_schedule_c_plans,
    owned.source,
    CONFIG_BY_YEAR[2025].ssWageBase,
  );
  reconcileIndependentOwnerHealthGraph(fields, result);
  if (
    independentHealthCanonical(fields.independent_plan_filing_rows) !==
      independentHealthCanonical(result.rows)
  ) {
    throw new Error(
      "Independent Form7206 rows differ from the actual plan and owner calculations",
    );
  }
  for (
    const [prefix, id] of [["taxpayer", result.source.taxpayer_identity], [
      "spouse",
      result.source.spouse_identity,
    ]] as const
  ) {
    const fullname = [
      g[`${prefix}_first_name`],
      g[`${prefix}_middle_initial`],
      g[`${prefix}_last_name`],
    ].filter(Boolean).join(" ");
    if (
      name(fullname) !== name(id.name) ||
      String(g[`${prefix}_ssn`]).replaceAll("-", "") !== id.ssn
    ) {
      throw new Error(
        "Independent health plan owner identity differs from the actual source return",
      );
    }
  }
  if (
    name(actualFiler.fullName ?? actualFiler.nameLine1) !==
      name(result.source.taxpayer_identity.name) ||
    !actualFiler.spouse ||
    name(
        [
          actualFiler.spouse.firstName,
          actualFiler.spouse.middleInitial,
          actualFiler.spouse.lastName,
        ].filter(Boolean).join(" "),
      ) !== name(result.source.spouse_identity.name)
  ) {
    throw new Error(
      "Independent Form7206 names differ from the actual native filer",
    );
  }
  for (const row of result.rows) {
    assertForm7206SpouseCoverage(row.calculation_plan, p, actualFiler);
  }
  if (p.schedule_c?.f1099nec_receipt_sources) {
    assertScheduleCReceiptSourceIdentity(p, actualFiler);
  }
  const q = p.form8995;
  const summed = (v: unknown) =>
    (Array.isArray(v) ? v : [v ?? 0]).reduce<number>((n, x) => {
      if (typeof x !== "number" || !Number.isFinite(x) || x < 0) {
        throw new Error(
          "Independent health deduction needs actual nonnegative derived amounts",
        );
      }
      return n + x;
    }, 0);
  const w2s = p.w2?.w2s as Array<Record<string, unknown>> | undefined;
  const wages = w2s?.reduce((n, r) => n + Number(r.box1_wages), 0) ?? 0;
  const profit = owned.source.businesses.reduce((n, b) => n + b.net_profit, 0);
  if (
    !q ||
    independentHealthCanonical(q.joint_owner_health_plans_source) !==
      independentHealthCanonical(result.source) ||
    q.joint_owner_health_plan_source !== undefined ||
    summed(q.se_health_insurance_deduction) !== result.deduction ||
    p.schedule1?.line17_se_health_insurance !== result.deduction ||
    p.schedule1?.line15_se_deduction !== owned.deduction ||
    p.schedule1?.line3_schedule_c !== profit ||
    Number(p.schedule1?.line16_sep_simple ?? 0) !== 0 ||
    p.schedule1?.line26_total_adjustments !==
      owned.deduction + result.deduction ||
    f.line10_adjustments !== owned.deduction + result.deduction ||
    f.line11_agi !== wages + profit - owned.deduction - result.deduction ||
    Number(f.line1a_wages ?? 0) !== wages
  ) {
    throw new Error(
      "Independent health deductions must join each actual owner and sum once to Schedule1, AGI and joint QBI source",
    );
  }
  if (
    [
      "schedule_f",
      "schedule_e",
      "k1_partnership",
      "k1_s_corp",
      "f1099patr",
      "sep_retirement",
      "form2555",
      "f1095a",
      "f4835",
      "form4797",
      "form8995a",
    ].some((k) => p[k] !== undefined && Object.keys(p[k]).length > 0) ||
    [
      "line2b_taxable_interest",
      "line3a_qualified_dividends",
      "line3b_ordinary_dividends",
      "line7_capital_gain",
      "line7a_cap_gain_distrib",
      "line13b_additional_deductions",
    ].some((k) => Number(f[k] ?? 0) !== 0) ||
    p.schedule_c?.wotc_wage_reductions !== undefined ||
    Object.keys(p.schedule_c ?? {}).some((k) =>
      !["schedule_cs", "filing_status", "f1099nec_receipt_sources"].includes(k)
    ) || (w2s?.some((r) => r.box13_statutory_employee === true) ?? false)
  ) {
    throw new Error(
      "Independent ordinary health plans exclude other business, retirement, Marketplace and unreviewed adjustment sources",
    );
  }
  const marketplace = p.form8962 ?? {};
  if (
    Number(marketplace.annual_premium ?? 0) > 0 ||
    (Array.isArray(marketplace.monthly_premiums) &&
      marketplace.monthly_premiums.length) ||
    (Array.isArray(marketplace.monthly_ptc_rows) &&
      marketplace.monthly_ptc_rows.length)
  ) {
    throw new Error(
      "Independent ordinary health plans exclude Marketplace/PTC sources",
    );
  }
  return result;
}
