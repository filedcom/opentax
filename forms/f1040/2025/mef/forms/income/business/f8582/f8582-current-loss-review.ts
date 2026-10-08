import { isDeepStrictEqual } from "node:util";
import { inputSchema as scheduleSchema } from "../../../../../../nodes/inputs/income/rental-passthrough/schedule_e/index.ts";
import { inputSchema as farmSchema } from "../../../../../../nodes/inputs/income/business/f4835/index.ts";
import { reconcileCurrentFarmRentalQbi } from "../../../../../../nodes/inputs/income/business/f4835/qbi-source.ts";
import {
  currentPropertyAmounts,
  currentPropertyPassiveAmounts,
  reconcileCurrentPropertySource,
} from "../../../../../../nodes/inputs/income/rental-passthrough/schedule_e/current-property-source.ts";
import { currentPropertyLossAllocation } from "../../../../../../nodes/inputs/income/rental-passthrough/schedule_e/current-property-loss-allocation.ts";
import { inputSchema as palSchema } from "../../../../../../nodes/intermediate/forms/income/business/form8582/index.ts";
import { inputSchema as saleSchema } from "../../../../../../nodes/intermediate/forms/income/business/form4797/index.ts";
import {
  agi_aggregator,
  inputSchema as agiSchema,
} from "../../../../../../nodes/intermediate/aggregation/general/return-assembly/agi_aggregator/index.ts";
import { extractFilerIdentity } from "../../../../../../mef/filer.ts";
import { element, elements } from "../../../../../../mef/xml.ts";
import { assertCurrentPropertyQbi } from "../../../deductions/business/f8995/f8995-current-property.ts";
import { worksheetRatios } from "./f8582-ratios.ts";

/** Source-bound native review projection. Full filing descriptors remain guarded. */
export function reviewCurrentPropertyLoss8582(
  pending: Readonly<Record<string, any>>,
) {
  const e = scheduleSchema.parse(pending.schedule_e);
  const properties = e.schedule_es.map((row) =>
    reconcileCurrentPropertySource(row)
  );
  const farmRows = pending.f4835 === undefined
    ? []
    : farmSchema.parse(pending.f4835).f4835s;
  const farms = farmRows.map((row) => reconcileCurrentFarmRentalQbi(row));
  if (
    properties.some((s) => !s) || farms.some((s) => !s) ||
    !properties.some((s) => s && currentPropertyAmounts(s).gain < 0) ||
    (e.rental_income ?? 0) !== 0 || (e.royalty_income ?? 0) !== 0 ||
    (e.estate_trust_rows?.length ?? 0) !== 0
  ) {
    throw new Error(
      "Current loss review needs every owned current property/farm source and no detached Schedule E amount",
    );
  }
  const sources = properties.map((s) => s!);
  const farmSources = farms.map((s) => s!);
  const filer = extractFilerIdentity(pending.f1040);
  if (
    !filer || sources.some((s, i) =>
      s.recipient_tin !==
        (e.schedule_es[i].tsj === "S" ? filer.spouse?.ssn : filer.primarySSN)
          ?.replaceAll("-", "")
    ) ||
    farmSources.some((s) =>
      ![filer.primarySSN, filer.spouse?.ssn].filter(Boolean).some((ssn) =>
        ssn!.replaceAll("-", "") === s.recipient_tin
      )
    )
  ) {
    throw new Error(
      "Current loss review source owner differs from finalized filer",
    );
  }
  assertCurrentPropertyQbi(pending.form8995, pending);
  const facts = currentPropertyLossAllocation(sources, farmSources);
  const a = facts.passive_allocation;
  if (!a) {
    throw new Error("Current loss review has no passive activity worksheet");
  }
  const pal = palSchema.parse(pending.form8582);
  const sale = saleSchema.parse(pending.form4797);
  const saleKeys = new Set([
    "current_loss_forms",
    "disposed_properties",
    "passive_disposed_activity_ids",
    "passive_property_sales",
    "current_property_sources",
    "passive_activity_sources",
  ]);
  const palKeys = new Set([
    "filing_status",
    "activities",
    "current_loss",
    "current_loss_forms",
    "current_income",
    "has_other_passive",
    "modified_agi",
  ]);
  if (
    Object.keys(pending.form4797).some((key) => !saleKeys.has(key)) ||
    Object.keys(pending.form8582).some((key) => !palKeys.has(key)) ||
    sale.disposed_properties !== sources.length ||
    !isDeepStrictEqual(
      sale.passive_disposed_activity_ids,
      sources.map((s) => s.activity_id),
    ) ||
    !isDeepStrictEqual(sale.passive_activity_sources, pal.activities)
  ) {
    throw new Error(
      "Current loss review has an unreconciled reporting component or activity inventory",
    );
  }
  const expectedForms = facts.origins.filter((s) => s.passive).map((s) => ({
    activity_id: s.activity_id,
    special_allowance_eligible: false,
    forms: s.forms,
  }));
  if (
    !isDeepStrictEqual(pal.current_loss_forms, expectedForms) ||
    !isDeepStrictEqual(sale.current_loss_forms, expectedForms) ||
    !isDeepStrictEqual(sale.current_property_sources, sources) ||
    !isDeepStrictEqual(
      sale.passive_property_sales,
      e.schedule_es.flatMap((r) => r.passive_property_sales ?? []),
    ) ||
    pal.current_income !== a.current_income ||
    pal.current_loss !== a.current_loss || (pal.prior_unallowed ?? 0) !== 0
  ) {
    throw new Error(
      "Current loss review worksheet differs from actual source inventory",
    );
  }
  const allForms = [
    ...a.by_activity.flatMap((r) => r.forms),
    ...facts.nonpassive_forms.flatMap((r) => r.forms),
  ];
  const operatingGross = sources.reduce((n, s) => {
    const p = currentPropertyPassiveAmounts(s);
    return n + (p.net > 0 ? p.operating : Math.max(0, p.operating));
  }, 0) + facts.origins.filter((s) =>
    s.forms[0].reporting_form === "Form 4835"
  ).reduce((n, s) => n + s.forms[0].current_income, 0);
  const allowedII = a.by_activity.flatMap((r) => r.forms).filter((r) =>
    r.reporting_form === "Form 4797 Part II"
  ).reduce((n, r) => n + r.allowed_loss, 0);
  const operatingAllowed = a.allowed_loss - allowedII;
  const ordinary = allForms.filter((r) =>
    r.reporting_form === "Form 4797 Part II"
  ).reduce((n, r) => n + r.filed_net, 0);
  const agi = agiSchema.parse(pending.agi_aggregator);
  const grossE = Array.isArray(agi.line5_schedule_e)
    ? agi.line5_schedule_e.reduce((n, v) => n + v, 0)
    : agi.line5_schedule_e ?? 0;
  if (
    grossE !== operatingGross || (agi.line4_other_gains ?? 0) !== ordinary ||
    agi.pal_current_income !== a.current_income ||
    agi.pal_current_loss !== a.current_loss ||
    agi.pal_final_allowed_loss !== a.allowed_loss ||
    agi.pal_4797_preapplied_loss !== allowedII ||
    (agi.pal_current_4797_gain ?? 0) !== 0 ||
    (pending.schedule1?.line4_other_gains ?? 0) !== ordinary ||
    (pending.schedule1?.line5_schedule_e ?? 0) !==
      operatingGross - operatingAllowed
  ) {
    throw new Error(
      "Current loss review allowed amounts differ from finalized original forms and AGI",
    );
  }
  const replay =
    agi_aggregator.compute({ taxYear: 2025, formType: "f1040" }, agi).outputs;
  const expected1040 = replay.find((r) => r.nodeType === "f1040")!.fields;
  const expectedPal = replay.find((r) => r.nodeType === "form8582")!.fields;
  const expectedEic = replay.find((r) => r.nodeType === "eitc")!.fields;
  const passiveForms = a.by_activity.flatMap((r) => r.forms);
  const passiveOrdinary = passiveForms.filter((r) =>
    r.reporting_form === "Form 4797 Part II"
  )
    .reduce((n, r) => n + r.filed_net, 0);
  const passiveOperatingIncome = passiveForms.filter((r) =>
    r.reporting_form === "Schedule E" || r.reporting_form === "Form 4835"
  ).reduce((n, r) => n + r.current_income, 0);
  if (
    (agi.eic_passive_4797_ordinary ?? 0) !== passiveOrdinary ||
    (agi.eic_passive_schedule_e_income ?? 0) !== passiveOperatingIncome ||
    pal.modified_agi !== expectedPal.modified_agi ||
    pal.filing_status !== agi.filing_status ||
    pending.eitc?.investment_income_floor !==
      expectedEic.investment_income_floor
  ) {
    throw new Error(
      "Current loss review differs from source passive income, modified AGI or EIC floor",
    );
  }
  for (
    const key of ["line8_additional_income", "line10_adjustments", "line11_agi"]
  ) {
    if ((pending.f1040[key] ?? 0) !== (expected1040[key] ?? 0)) {
      throw new Error(`Current loss review differs from finalized ${key}`);
    }
  }
  const names = new Map([
    ...sources.map((s) => [s.activity_id, s.activity_name] as const),
    ...farmSources.map((s) => [s.activity_id, s.activity_name] as const),
  ]);
  const rows = a.by_activity.map((r) => ({
    ...r,
    income: r.forms.reduce((n, f) => n + f.current_income, 0),
    loss: r.forms.reduce((n, f) => n + f.current_loss, 0),
    lossForms: r.forms.filter((f) => f.current_loss > 0),
  })).filter((r) => r.income + r.loss > 0);
  const losses = rows.filter((r) => r.suspended_loss > 0);
  const ratios = worksheetRatios(
    losses.map((r) => Math.max(0, r.loss - r.income)),
  );
  const formName = (name: string) =>
    ({
      "Schedule E": "Sch E, line 22",
      "Form 4835": "4835, line 34c",
      "Form 4797 Part I": "Form 4797, Part I",
      "Form 4797 Part II": "Form 4797, Part II",
    } as Record<string, string>)[name];
  const single = losses.filter((r) => r.lossForms.length === 1);
  const net = a.current_income - a.current_loss;
  const xml = elements("IRS8582", [
    a.current_income > 0
      ? element("OtherActivityIncomeAmt", a.current_income)
      : "",
    a.current_loss > 0 ? element("OtherActivityLossAmt", a.current_loss) : "",
    element("NetOtherActivityAmt", net),
    element("TotalPassiveActivityAmt", net),
    net < 0 ? element("TotalIncomeAmt", a.current_income) : "",
    net < 0 ? element("TotalLossesAllowedAmt", a.allowed_loss) : "",
    elements("ParentWrkshtPassiveGrp", [
      ...rows.map((r) =>
        elements("WrkshtPassiveGrp", [
          element("NonParticipateActivityNm", names.get(r.activity_id)),
          r.income > 0 ? element("CurrentYearNetIncomeAmt", r.income) : "",
          r.loss > 0 ? element("CurrentYearNetLossAmt", r.loss) : "",
          r.income > r.loss ? element("OverallGainAmt", r.income - r.loss) : "",
          r.loss > r.income ? element("OverallLossAmt", r.loss - r.income) : "",
        ])
      ),
      a.current_income > 0
        ? element("TotalOtherCurrentYearIncomeAmt", a.current_income)
        : "",
      a.current_loss > 0
        ? element("TotalOtherCurrentYearLossAmt", a.current_loss)
        : "",
    ]),
    losses.length
      ? elements("ParentWrkshtLossGrp", [
        ...losses.map((r, i) =>
          elements("WrkshtLossGrp", [
            element("UnallowedLossActivityNm", names.get(r.activity_id)),
            element(
              "ReportingFormOrScheduleNm",
              r.lossForms.length === 1
                ? formName(r.lossForms[0].reporting_form).replace("Form ", "")
                : r.lossForms.map((f) =>
                  ({
                    "Schedule E": "SchE22",
                    "Form 4835": "4835/34c",
                    "Form 4797 Part I": "4797I",
                    "Form 4797 Part II": "4797II",
                  })[f.reporting_form]
                ).join("/"),
            ),
            element("F8582WrkshtLossesAmt", r.loss - r.income),
            element("LossesPct", ratios[i]),
            element("PriorYearUnallowedLossesAmt", r.suspended_loss),
          ])
        ),
        element(
          "TotalAllocationLossAmt",
          losses.reduce((n, r) => n + r.loss - r.income, 0),
        ),
        element("TotalLossAmt", a.suspended_loss),
      ])
      : "",
    single.length
      ? elements("ParentWrkshtListActivityGrp", [
        ...single.map((r) =>
          elements("WrkshtListActivityGrp", [
            element("AllowedLossActivityNm", names.get(r.activity_id)),
            element(
              "ReportingFormOrScheduleNm",
              formName(r.lossForms[0].reporting_form).replace("Form ", ""),
            ),
            element("F8582WrkshtLossesAmt", r.loss),
            element("PriorYearUnallowedLossesAmt", r.suspended_loss),
            element("F8582WrkshtAllowedLossesAmt", r.allowed_loss),
          ])
        ),
        element("TotalLossAmt", single.reduce((n, r) => n + r.loss, 0)),
        element(
          "TotalUnallowedLossAmt",
          single.reduce((n, r) => n + r.suspended_loss, 0),
        ),
        element(
          "TotalAllowedLossAmt",
          single.reduce((n, r) => n + r.allowed_loss, 0),
        ),
      ])
      : "",
    ...losses.filter((r) => r.lossForms.length > 1).map((r) => {
      const parts = worksheetRatios(r.lossForms.map((f) => f.current_loss));
      return elements("ParentWrkshtLossActivityGrp", [
        element("MultipleLossActivityNm", names.get(r.activity_id)),
        ...r.lossForms.map((f, i) =>
          elements("WrkshtLossActivityGrp", [
            element("ReportingFormOrScheduleNm", formName(f.reporting_form)),
            element("NetLossAmt", f.current_loss),
            element("NetIncomeLossAmt", f.current_loss),
            element("LossesPct", parts[i]),
            element("PriorYearUnallowedLossesAmt", f.suspended_loss),
            element("F8582WrkshtLossesAmt", f.allowed_loss),
          ])
        ),
        element("TotalNetIncomeLossAmt", r.loss),
        element("TotalUnallowedAmt", r.suspended_loss),
        element("TotalAllowedAmt", r.allowed_loss),
      ]);
    }),
  ]);
  return {
    xml,
    allocation: a,
    filingReady: false as const,
    issuerVerified: false as const,
  };
}
