import { element, elements } from "../../../mef/xml.ts";
import { FilingStatus } from "../../../mef/header.ts";
import {
  assertForm8959Absent,
  assertForm8959Sources,
  hasForm8959Print,
} from "../../form8959-source.ts";
import {
  type Form8959PrintFields,
  printFieldsSchema,
} from "../../../nodes/intermediate/forms/form8959/index.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

// TY2025 IRS8959.xsd: every amount is a whole-dollar USAmountType or
// USAmountNNType. The graph node owns all line 1-24 calculations; MeF only
// checks that complete print result and projects its exact values.
export const FIELD_MAP: ReadonlyArray<readonly [string, string]> = [];

function threshold(status: FilingStatus): number {
  if (status === FilingStatus.MarriedFilingJointly) return 250_000;
  if (status === FilingStatus.MarriedFilingSeparately) return 125_000;
  if (
    status === FilingStatus.Single ||
    status === FilingStatus.HeadOfHousehold ||
    status === FilingStatus.QualifyingSurvivingSpouse
  ) return 200_000;
  throw new Error("Form 8959 needs a recognized Form 1040 filing status");
}

function requireLine(
  fields: Form8959PrintFields,
  key: keyof Form8959PrintFields,
  expected: number,
): void {
  if (fields[key] !== expected) {
    throw new Error(`Form 8959 ${key} differs from calculated print lines`);
  }
}

function requireSummary(
  fields: Form8959PrintFields,
  summary:
    | "medicare_wages"
    | "medicare_withheld"
    | "rrta_wages"
    | "rrta_medicare_withheld",
  line: number,
): void {
  const expected = line > 0 ? line : undefined;
  if (fields[summary] !== expected) {
    throw new Error(
      `Form 8959 ${summary} differs from its printed source line`,
    );
  }
}

function pendingAmount(
  context: MefBuildContext,
  pendingKey: "schedule2" | "f1040",
  field: string,
  expected: number,
): number {
  const raw = context.pending?.[pendingKey];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    if (pendingKey === "schedule2" && expected === 0 && raw === undefined) {
      return 0;
    }
    throw new Error(`Form 8959 needs finalized ${pendingKey} reconciliation`);
  }
  const value = (raw as Record<string, unknown>)[field];
  if (
    value !== undefined &&
    (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
  ) {
    throw new Error(`Form 8959 ${pendingKey}.${field} is not whole dollars`);
  }
  return value === undefined ? 0 : value as number;
}

function validatePrintLines(
  fields: Form8959PrintFields,
  context: MefBuildContext,
): void {
  if (!context.filer || !context.pending) {
    throw new Error("Form 8959 needs finalized filer and return context");
  }
  const limit = threshold(context.filer.filingStatus);
  for (
    const key of [
      "line5_threshold",
      "line9_threshold",
      "line15_threshold",
    ] as const
  ) requireLine(fields, key, limit);

  requireSummary(fields, "medicare_wages", fields.line1_medicare_wages);
  requireSummary(fields, "rrta_wages", fields.line14_rrta_wages);
  requireSummary(fields, "medicare_withheld", fields.line19_medicare_withheld);
  requireSummary(fields, "rrta_medicare_withheld", fields.line23_rrta_withheld);

  requireLine(
    fields,
    "line4_total_medicare_wages",
    fields.line1_medicare_wages + fields.line2_unreported_tips +
      fields.line3_wages_8919,
  );
  requireLine(
    fields,
    "line6_wage_excess",
    Math.max(0, fields.line4_total_medicare_wages - limit),
  );
  requireLine(
    fields,
    "line7_wage_tax",
    Math.round(fields.line6_wage_excess * 0.009),
  );
  requireLine(
    fields,
    "line10_medicare_wages",
    fields.line4_total_medicare_wages,
  );
  requireLine(
    fields,
    "line11_reduced_se_threshold",
    Math.max(0, limit - fields.line10_medicare_wages),
  );
  requireLine(
    fields,
    "line12_se_excess",
    Math.max(0, fields.line8_se_income - fields.line11_reduced_se_threshold),
  );
  requireLine(
    fields,
    "line13_se_tax",
    Math.round(fields.line12_se_excess * 0.009),
  );
  requireLine(
    fields,
    "line16_rrta_excess",
    Math.max(0, fields.line14_rrta_wages - limit),
  );
  requireLine(
    fields,
    "line17_rrta_tax",
    Math.round(fields.line16_rrta_excess * 0.009),
  );
  requireLine(
    fields,
    "line18_total_tax",
    fields.line7_wage_tax + fields.line13_se_tax + fields.line17_rrta_tax,
  );
  requireLine(fields, "line20_medicare_wages", fields.line1_medicare_wages);
  requireLine(
    fields,
    "line21_regular_medicare_tax",
    Math.round(fields.line20_medicare_wages * 0.0145),
  );
  requireLine(
    fields,
    "line22_additional_withheld",
    Math.max(
      0,
      fields.line19_medicare_withheld - fields.line21_regular_medicare_tax,
    ),
  );
  requireLine(
    fields,
    "line24_total_withheld",
    fields.line22_additional_withheld + fields.line23_rrta_withheld,
  );

  if (
    fields.single_w2_over_withholding_threshold === true &&
    fields.line1_medicare_wages <= 200_000 &&
    fields.line14_rrta_wages <= 200_000
  ) {
    throw new Error("Form 8959 single-W-2 trigger lacks over-$200,000 wages");
  }
  if (
    fields.line18_total_tax === 0 && fields.line24_total_withheld === 0 &&
    fields.single_w2_over_withholding_threshold !== true
  ) {
    throw new Error("Form 8959 pending record has no filing trigger");
  }
  if (
    pendingAmount(
      context,
      "schedule2",
      "line11_additional_medicare",
      fields.line18_total_tax,
    ) !==
      fields.line18_total_tax
  ) {
    throw new Error("Form 8959 line 18 differs from Schedule 2 line 11");
  }
  if (
    pendingAmount(
      context,
      "f1040",
      "line25c_additional_medicare_withheld",
      fields.line24_total_withheld,
    ) !==
      fields.line24_total_withheld
  ) {
    throw new Error("Form 8959 line 24 differs from Form 1040 line 25c");
  }
}

function buildIRS8959(raw: unknown, context?: MefBuildContext): string {
  if (Array.isArray(raw) && raw.length === 0) {
    assertForm8959Absent({}, context?.pending);
    return "";
  }
  if (!hasForm8959Print(raw)) {
    assertForm8959Absent(raw, context?.pending);
    return "";
  }
  const fields = printFieldsSchema.passthrough().parse(raw);
  assertForm8959Sources(raw, fields, context?.pending);
  if (!context) {
    throw new Error("Form 8959 needs finalized filer and return context");
  }
  validatePrintLines(fields, context);

  const hasWages = fields.line4_total_medicare_wages > 0;
  const hasSe = fields.line8_se_income > 0;
  const hasRrta = fields.line14_rrta_wages > 0;
  const additionalTax = hasWages || hasSe || hasRrta
    ? elements("AdditionalTaxGrp", [
      element("FilingStatusThresholdCd", fields.line5_threshold),
      hasWages
        ? elements("AdditionalMedicareTaxGrp", [
          fields.line1_medicare_wages > 0
            ? element(
              "TotalW2MedicareWagesAndTipsAmt",
              fields.line1_medicare_wages,
            )
            : "",
          fields.line2_unreported_tips > 0
            ? element(
              "TotalUnreportedMedicareTipsAmt",
              fields.line2_unreported_tips,
            )
            : "",
          fields.line3_wages_8919 > 0
            ? element("TotalWagesWithNoWithholdingAmt", fields.line3_wages_8919)
            : "",
          element(
            "TotalMedicareWagesAndTipsAmt",
            fields.line4_total_medicare_wages,
          ),
          element("WagesTipsSubjToAddlMedcrTaxAmt", fields.line6_wage_excess),
          element("AdditionalMedicareTaxAmt", fields.line7_wage_tax),
        ])
        : "",
      hasSe
        ? elements("AddnlSelfEmploymentTaxGrp", [
          element("TotalSelfEmploymentIncomeAmt", fields.line8_se_income),
          element(
            "MedcrWagesTipsBelowThrshldAmt",
            fields.line11_reduced_se_threshold,
          ),
          element("SEIncomeSubjToAddSETaxAmt", fields.line12_se_excess),
          element("AddlSelfEmploymentTaxAmt", fields.line13_se_tax),
        ])
        : "",
      hasRrta
        ? elements("AddnlRailroadRetirementTaxGrp", [
          element("TotalRailroadRetirementCompAmt", fields.line14_rrta_wages),
          element("RRTCompSubjToAddRRTTaxAmt", fields.line16_rrta_excess),
          element("AddlRailroadRetirementTaxAmt", fields.line17_rrta_tax),
        ])
        : "",
      element("TotalAMRRTTaxAmt", fields.line18_total_tax),
    ])
    : "";

  return elements("IRS8959", [
    additionalTax,
    fields.line19_medicare_withheld > 0
      ? element(
        "TotalW2MedicareTaxWithheldAmt",
        fields.line19_medicare_withheld,
      )
      : "",
    fields.line20_medicare_wages > 0
      ? element("TotalMedicareTaxAmt", fields.line21_regular_medicare_tax)
      : "",
    fields.line22_additional_withheld > 0
      ? element(
        "AddnlMedicareTaxWithholdingAmt",
        fields.line22_additional_withheld,
      )
      : "",
    fields.line23_rrta_withheld > 0
      ? element("TotalW2AddlRRTTaxAmt", fields.line23_rrta_withheld)
      : "",
    fields.line24_total_withheld > 0
      ? element("AddlMedcrRRTTaxWithholdingAmt", fields.line24_total_withheld)
      : "",
  ]);
}

export const form8959: MefFormDescriptor<"form8959", unknown> = {
  pendingKey: "form8959",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8959--2025.pdf",
  build: buildIRS8959,
};
