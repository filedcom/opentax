import {
  inputSchema as farmSchema,
  reconcileFarmSources,
} from "../nodes/intermediate/forms/schedule_f/model.ts";
import { inputSchema as necSchema } from "../nodes/inputs/f1099nec/index.ts";
import { inputSchema as gSchema } from "../nodes/inputs/f1099g/index.ts";
import { assertFarmWotcReturn } from "./form8995_farm_wotc_reconciliation.ts";
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
    "schedule_f_source",
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
    Number(p.schedule1?.line3_schedule_c ?? 0) !==
      owned.source.businesses.filter((b) => b.kind === "schedule_c").reduce(
        (n, b) => n + b.net_profit,
        0,
      ) ||
    Number(p.schedule1?.line6_schedule_f ?? 0) !==
      owned.source.businesses.filter((b) => b.kind === "schedule_f").reduce(
        (n, b) => n + b.net_profit,
        0,
      ) ||
    Number(p.schedule1?.line16_sep_simple ?? 0) !== 0 ||
    p.schedule1?.line10_total_additional_income !== profit ||
    f.line8_additional_income !== profit ||
    f.line9_total_income !== wages + profit ||
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
      "schedule_e",
      "k1_partnership",
      "k1_s_corp",
      "f1099patr",
      "sep_retirement",
      "form2555",
      "f1095a",
      "f4835",
      "form4797",
    ].some((k) => p[k] !== undefined && Object.keys(p[k]).length > 0) ||
    [
      "line2b_taxable_interest",
      "line3a_qualified_dividends",
      "line3b_ordinary_dividends",
      "line7_capital_gain",
      "line7a_cap_gain_distrib",
      "line13b_additional_deductions",
    ].some((k) => Number(f[k] ?? 0) !== 0) ||
    (p.form8995a && !p.form8995a.farm_wotc_filing_source) ||
    (p.schedule_c?.wotc_wage_reductions !== undefined &&
      !(p.schedule_f?.schedule_fs as Array<Record<string, unknown>> | undefined)
        ?.some((farm) => farm.qbi_wotc_filing_review)) ||
    Object.keys(p.schedule_c ?? {}).some((k) =>
      ![
        "schedule_cs",
        "filing_status",
        "f1099nec_receipt_sources",
        "wotc_wage_reductions",
      ].includes(k)
    ) || (w2s?.some((r) => r.box13_statutory_employee === true) ?? false)
  ) {
    throw new Error(
      "Independent ordinary health plans exclude other business, retirement, Marketplace and unreviewed adjustment sources",
    );
  }
  if (p.schedule_f) {
    const farms = farmSchema.parse(p.schedule_f);
    reconcileFarmSources(farms);
    if (
      farms.wotc_wage_reductions?.some((r) => r.credit_amount > 0) &&
      !farms.schedule_fs.some((farm) => farm.qbi_wotc_filing_review)
    ) {
      throw new Error(
        "Independent farm health WOTC reductions need the actual reviewed employer source route",
      );
    }
    const necs = p.f1099nec ? necSchema.parse(p.f1099nec).f1099necs : [],
      grants = p.f1099g ? gSchema.parse(p.f1099g).f1099gs : [];
    if (
      farms.farm_optional_method_elected || farms.patron_filing_review ||
      farms.schedule_fs.some((farm) => {
        const owner = farm.proprietor_recipient === "S"
          ? result.source.spouse_identity.ssn
          : result.source.taxpayer_identity.ssn;
        const copies = [
          ...necs.filter((n) =>
            n.for_routing === "schedule_f" && n.farm_id === farm.farm_id
          ).map((n) => ({
            kind: "1099nec_farm_income",
            amount: n.box1_nec,
            reference: n.source_document_reference,
            payer: n.payer_name,
            tin: n.payer_tin,
            recipient: n.recipient_ssn,
          })),
          ...grants.filter((g) =>
            g.farm_id === farm.farm_id &&
            g.box_7_payment_kind === "agricultural_program"
          ).map((g) => ({
            kind: "1099g_agriculture",
            amount: g.box_7_agriculture,
            reference: g.source_document_reference,
            payer: g.payer_name,
            tin: g.payer_tin,
            recipient: g.recipient_tin,
          })),
        ];
        return farm.accounting_method !== "cash" ||
          farm.line_e_material_participation !== true ||
          farm.line36_at_risk !== "a" || copies.length === 0 ||
          copies.some((copy) =>
            String(copy.recipient).replace(/\D/g, "") !== owner ||
            !copy.reference || !farms.farm_sources?.some((source) =>
              source.kind === copy.kind && source.farm_id === farm.farm_id &&
              source.recipient_tin === owner &&
              source.payer_name === copy.payer &&
              source.payer_tin === String(copy.tin).replace(/\D/g, "") &&
              source.amount === copy.amount &&
              source.source_document_reference === copy.reference
            )
          );
      })
    ) {
      throw new Error(
        "Independent health farm needs actual regular owned issued agricultural/custom-work sources",
      );
    }
  }
  if (p.schedule_f) {
    assertFarmWotcReturn(p.form8995a ?? p.form8995, p, actualFiler);
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
