import {
  filedOwnedScheduleC,
  filedOwnedScheduleF,
} from "../nodes/owned-business-filing.ts";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { CONFIG_BY_YEAR } from "../nodes/config/index.ts";
import {
  calculateScheduleCAtRiskNet,
  computeGrossIncome as computeCGrossIncome,
  inputSchema as cSchema,
  isSeExempt,
  projectScheduleCItems,
  wotcReductionsByBusiness,
} from "../nodes/inputs/schedule_c/model.ts";
import {
  calculateScheduleFAtRiskNet,
  computeGrossIncome,
  inputSchema as fSchema,
  wotcReductionsByFarm,
} from "../nodes/intermediate/forms/schedule_f/model.ts";
import { inputSchema as w2Schema } from "../nodes/inputs/w2/index.ts";
import {
  ownedScheduleSE,
  type OwnerSources,
} from "../nodes/intermediate/forms/schedule_se/owner-calculation.ts";
import { patronFiledBusinessLines } from "../nodes/inputs/qbi_patron/calculation.ts";

/** Rebuild owner computations from the actual finalized public businesses and W2s. */
export function assertOwnedScheduleSE(
  pending: Readonly<Record<string, Record<string, unknown>>>,
  filer?: FilerIdentity,
) {
  const general = pending.general;
  const retained = pending.schedule_se;
  if (!retained?.owner_identity) {
    if (general?.filing_status === "mfj") {
      const c = pending.schedule_c
        ? cSchema.parse(pending.schedule_c)
        : undefined;
      const f = pending.schedule_f
        ? fSchema.parse(pending.schedule_f)
        : undefined;
      if (
        (c && projectScheduleCItems(c).some((item) => !isSeExempt(item))) ||
        (f && f.schedule_fs.some((item) =>
          computeGrossIncome(item) !== 0 ||
          calculateScheduleFAtRiskNet(item).preliminaryNet !== 0
        ))
      ) {
        throw new Error(
          "Joint business/farm filing needs retained Schedule SE owner calculations",
        );
      }
    }
    return undefined;
  }
  if (
    !Array.isArray(retained.owner_business_sources) ||
    retained.owner_business_sources.length === 0
  ) return undefined;
  if (!general || general.filing_status !== "mfj") {
    throw new Error("Owned Schedule SE requires the actual joint return");
  }
  const primary = String(general.taxpayer_ssn ?? "").replaceAll("-", "");
  const spouse = String(general.spouse_ssn ?? "").replaceAll("-", "");
  const f1040 = pending.f1040;
  if (
    f1040?.filing_status !== "mfj" ||
    String(f1040.taxpayer_ssn ?? "").replaceAll("-", "") !== primary ||
    String(f1040.spouse_ssn ?? "").replaceAll("-", "") !== spouse ||
    (filer &&
      (filer.filingStatus !== FilingStatus.MarriedFilingJointly ||
        filer.primarySSN.replaceAll("-", "") !== primary ||
        filer.spouse?.ssn.replaceAll("-", "") !== spouse))
  ) {
    throw new Error(
      "Schedule SE owner identities differ from the filed return",
    );
  }
  for (const prefix of ["taxpayer", "spouse"]) {
    for (const part of ["first_name", "middle_initial", "last_name"]) {
      if (general[`${prefix}_${part}`] !== f1040[`${prefix}_${part}`]) {
        throw new Error(
          "Schedule SE proprietor names differ from the actual return",
        );
      }
    }
  }
  const source: OwnerSources = {
    identity: { primary_ssn: primary, spouse_ssn: spouse },
    businesses: [],
    wages: [],
  };
  if (pending.schedule_c) {
    const c = cSchema.parse(pending.schedule_c);
    const items = projectScheduleCItems(c);
    const reductions = wotcReductionsByBusiness({
      schedule_cs: items,
      wotc_wage_reductions: c.wotc_wage_reductions,
    });
    for (const item of items) {
      if (isSeExempt(item)) continue;
      if (!item.proprietor_recipient || !item.business_reference) {
        throw new Error("Owned SE business source is missing");
      }
      source.businesses.push({
        recipient: item.proprietor_recipient,
        source_reference: item.business_reference,
        kind: "schedule_c",
        gross_business_income: computeCGrossIncome(item),
        business_name: item.line_c_business_name,
        ein: item.line_d_ein?.replace(/\D/g, ""),
        qbi_no_other_adjustments_confirmed:
          item.qbi_no_other_adjustments_confirmed === true,
        net_profit: c.patron_filing_review
          ? patronFiledBusinessLines("schedule_c", item).profit
          : filedOwnedScheduleC(
            item,
            false,
            reductions.get(item.business_reference) ?? 0,
          )?.profit ?? calculateScheduleCAtRiskNet(
            item,
            reductions.get(item.business_reference) ?? 0,
          ).atRiskNet,
      });
    }
  }
  if (pending.schedule_f) {
    const f = fSchema.parse(pending.schedule_f);
    const reductions = wotcReductionsByFarm(f);
    for (const item of f.schedule_fs) {
      if (!item.proprietor_recipient || !item.farm_id) {
        throw new Error("Owned SE farm source is missing");
      }
      const atRisk = calculateScheduleFAtRiskNet(
        item,
        reductions.get(item.farm_id) ?? 0,
      );
      source.businesses.push({
        recipient: item.proprietor_recipient,
        source_reference: item.farm_id,
        kind: "schedule_f",
        business_name: item.line_c_farm_name,
        ein: item.line_d_ein?.replace(/\D/g, ""),
        qbi_no_other_adjustments_confirmed:
          item.qbi_no_other_adjustments_confirmed === true,
        net_profit: f.farm_optional_method_elected === true
          ? atRisk.preliminaryNet
          : item.qbi_wotc_filing_review
          ? patronFiledBusinessLines(
            "schedule_f",
            item,
            reductions.get(item.farm_id) ?? 0,
          ).profit
          : f.patron_filing_review
          ? patronFiledBusinessLines("schedule_f", item).profit
          : filedOwnedScheduleF(item, false, reductions.get(item.farm_id) ?? 0)
            ?.profit ?? atRisk.atRiskNet,
        ...(f.farm_optional_method_elected === true
          ? {
            farm_optional_method_elected: true,
            gross_farm_income: computeGrossIncome(item),
          }
          : {}),
      });
    }
  }
  if (pending.w2) {
    for (const row of w2Schema.parse(pending.w2).w2s) {
      if (row.box13_statutory_employee) continue;
      if (!row.employee_ssn || !row.source_document_reference) {
        throw new Error("Owned SE needs actual issued W2 owner copies");
      }
      source.wages.push({
        employee_ssn: row.employee_ssn.replaceAll("-", ""),
        source_reference: row.source_document_reference,
        ss_wages_and_tips: (row.box3_ss_wages ?? 0) + (row.box7_ss_tips ?? 0),
      });
    }
  }
  const actual = ownedScheduleSE(source, CONFIG_BY_YEAR[2025].ssWageBase);
  const retainedActual = ownedScheduleSE({
    identity: retained.owner_identity,
    businesses: retained.owner_business_sources,
    wages: retained.owner_wage_sources ?? [],
  }, CONFIG_BY_YEAR[2025].ssWageBase);
  const canonical = (value: unknown): string =>
    JSON.stringify(
      value,
      (_key, item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? Object.fromEntries(
            Object.keys(item).sort().map((key) => [key, item[key]]),
          )
          : item,
    );
  const sorted = (rows: OwnerSources["businesses"] | OwnerSources["wages"]) =>
    [...rows].sort((a, b) =>
      a.source_reference.localeCompare(b.source_reference)
    );
  if (
    canonical(sorted(source.businesses)) !==
      canonical(sorted(retainedActual.source.businesses)) ||
    canonical(sorted(source.wages)) !==
      canonical(sorted(retainedActual.source.wages)) ||
    canonical(source.identity) !== canonical(retainedActual.source.identity) ||
    canonical(actual.instances) !== canonical(retained.owner_instances) ||
    pending.schedule2?.line4_se_tax !== actual.tax ||
    pending.schedule1?.line15_se_deduction !== actual.deduction
  ) {
    throw new Error(
      "Schedule SE owner sources, individual computations or return totals differ",
    );
  }
  return actual;
}
