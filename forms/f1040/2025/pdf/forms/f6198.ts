import {
  calculateScheduleCAtRiskNet,
  inputSchema as scheduleCInputSchema,
  projectForm8829ScheduleCItems,
  wotcReductionsByBusiness,
} from "../../../nodes/inputs/schedule_c/model.ts";
import {
  calculateScheduleFAtRiskNet,
  inputSchema as scheduleFInputSchema,
  wotcReductionsByFarm,
} from "../../../nodes/intermediate/forms/schedule_f/index.ts";
import {
  calculateForm4835AtRiskNet,
  inputSchema as form4835InputSchema,
} from "../../../nodes/inputs/f4835/index.ts";
import type {
  AtRiskNet,
  SimplifiedAtRiskFacts,
} from "../../../nodes/intermediate/forms/form6198/simplified.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// Verified against the November 2025 AcroForm field tree and printed line order:
// f1_3 is the activity description; f1_4-16 are lines 1 through 10b;
// f1_27 and f1_28 are Part IV lines 20 and 21.
const page1 = "topmostSubform[0].Page1[0]";
const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "text",
    domainKey: "activity_description",
    pdfField: `${page1}.f1_3[0]`,
  },
  {
    kind: "text",
    domainKey: "line1_ordinary_loss",
    pdfField: `${page1}.f1_4[0]`,
  },
  {
    kind: "text",
    domainKey: "line5_current_year_loss",
    pdfField: `${page1}.f1_10[0]`,
  },
  {
    kind: "text",
    domainKey: "line6_adjusted_basis",
    pdfField: `${page1}.f1_11[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line7_increases",
    pdfField: `${page1}.f1_12[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line8_basis_plus_increases",
    pdfField: `${page1}.f1_13[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line9_decreases",
    pdfField: `${page1}.f1_14[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line10a_amount_at_risk",
    pdfField: `${page1}.f1_15[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line10b_amount_at_risk",
    pdfField: `${page1}.f1_16[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line20_amount_at_risk",
    pdfField: `${page1}.f1_27[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "line21_deductible_loss_display",
    pdfField: `${page1}.f1_28[0]`,
    printZero: true,
  },
];

function activityFields(
  description: string,
  result: AtRiskNet,
  facts: SimplifiedAtRiskFacts,
): Record<string, unknown> {
  if (result.amountAtRisk === undefined) {
    throw new Error(
      "Form 6198 PDF needs the source activity's amount-at-risk calculation",
    );
  }
  const basisPlusIncreases = facts.opening_adjusted_basis +
    facts.current_year_increases;
  return {
    activity_description: description,
    line1_ordinary_loss: result.preliminaryNet,
    line5_current_year_loss: result.preliminaryNet,
    line6_adjusted_basis: facts.opening_adjusted_basis,
    line7_increases: facts.current_year_increases,
    line8_basis_plus_increases: basisPlusIncreases,
    line9_decreases: facts.line9_decreases_and_exclusions,
    line10a_amount_at_risk: result.amountAtRisk,
    line10b_amount_at_risk: result.amountAtRisk,
    line20_amount_at_risk: result.amountAtRisk,
    // The printed line 21 surrounds its entry with parentheses.
    line21_deductible_loss_display: -result.atRiskNet,
  };
}

function sourceActivities(
  allPending: Record<string, Record<string, unknown>>,
): Record<string, unknown>[] {
  const scheduleC = allPending.schedule_c;
  const businessSource = scheduleC && "schedule_cs" in scheduleC
    ? scheduleCInputSchema.parse(scheduleC)
    : undefined;
  const businesses = businessSource
    ? projectForm8829ScheduleCItems(businessSource)
    : [];
  const businessReductions = businessSource
    ? wotcReductionsByBusiness({ ...businessSource, schedule_cs: businesses })
    : new Map<string, number>();
  const scheduleF = allPending.schedule_f;
  const farmSource = scheduleF && "schedule_fs" in scheduleF
    ? scheduleFInputSchema.parse(scheduleF)
    : undefined;
  const farms = farmSource?.schedule_fs ?? [];
  const farmReductions = farmSource
    ? wotcReductionsByFarm(farmSource)
    : new Map<string, number>();
  const businessForms = businesses.flatMap((item) => {
    const result = calculateScheduleCAtRiskNet(
      item,
      businessReductions.get(item.business_reference ?? "") ?? 0,
    );
    if (result.preliminaryNet >= 0 || item.line_32_at_risk !== "b") return [];
    if (!item.at_risk_simplified) {
      throw new Error("Schedule C line 32b needs Form 6198 facts");
    }
    return [activityFields(
      item.line_c_business_name || item.line_a_principal_business,
      result,
      item.at_risk_simplified,
    )];
  });
  const farmForms = farms.flatMap((item) => {
    const result = calculateScheduleFAtRiskNet(
      item,
      farmReductions.get(item.farm_id ?? "") ?? 0,
    );
    if (result.preliminaryNet >= 0 || item.line36_at_risk !== "b") return [];
    if (!item.at_risk_simplified) {
      throw new Error("Schedule F line 36b needs Form 6198 facts");
    }
    return [activityFields(
      item.line_c_farm_name || item.line_b_agricultural_activity_code,
      result,
      item.at_risk_simplified,
    )];
  });
  const form4835Source = allPending.f4835;
  const form4835Items = form4835Source && "f4835s" in form4835Source
    ? form4835InputSchema.parse(form4835Source).f4835s
    : [];
  const rentalFarmForms = form4835Items.flatMap((item) => {
    const result = calculateForm4835AtRiskNet(item);
    if (
      result.preliminaryNet >= 0 ||
      item.some_investment_not_at_risk !== true
    ) return [];
    if (!item.at_risk_simplified || result.amountAtRisk === undefined) {
      throw new Error(
        "Form 4835 line 34b requires a completed Form 6198 computation",
      );
    }
    return [activityFields(
      item.activity_name,
      result,
      item.at_risk_simplified,
    )];
  });
  return [...businessForms, ...farmForms, ...rentalFarmForms];
}

export const form6198Pdf: PdfFormDescriptor = {
  pendingKey: "form6198",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f6198--2025.pdf",
  projectFields(fields, allPending) {
    if (Object.keys(fields).length > 0) {
      throw new Error(
        "Form 6198 PDF cannot be filed from aggregate loss fields; each source activity needs its own calculation",
      );
    }
    return { activities: sourceActivities(allPending) };
  },
  instances(fields) {
    const activities = fields.activities;
    if (!Array.isArray(activities)) {
      throw new Error("Form 6198 PDF needs source activity instances");
    }
    return activities as Record<string, unknown>[];
  },
  fields,
  filerFields: [
    { kind: "text", domainKey: "nameLine1", pdfField: `${page1}.f1_1[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${page1}.f1_2[0]` },
  ],
};
