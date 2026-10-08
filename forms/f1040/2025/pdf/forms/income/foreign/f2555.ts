import type { PdfFieldEntry, PdfFormDescriptor } from "../../../review-support/form-descriptor.ts";
import {
  calculatePhysicalPresence2555,
  physicalPresenceFilingSchema,
} from "../../../../../nodes/intermediate/forms/income/foreign/form2555/calculation.ts";

// Checked against the three-page 2025 IRS AcroForm.
const p1 = "topmostSubform[0].Page1[0]";
const p2 = "topmostSubform[0].Page2[0]";
const p3 = "topmostSubform[0].Page3[0]";
const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "name", pdfField: `${p1}.f1_1[0]` },
  { kind: "text", domainKey: "ssn", pdfField: `${p1}.f1_2[0]` },
  { kind: "text", domainKey: "foreign_address", pdfField: `${p1}.f1_3[0]` },
  { kind: "text", domainKey: "occupation", pdfField: `${p1}.f1_4[0]` },
  { kind: "text", domainKey: "employer_name", pdfField: `${p1}.f1_5[0]` },
  {
    kind: "text",
    domainKey: "employer_foreign_address",
    pdfField: `${p1}.f1_7[0]`,
  },
  { kind: "checkbox", domainKey: "foreign_entity", pdfField: `${p1}.c1_1[0]` },
  { kind: "checkbox", domainKey: "no_prior_claim", pdfField: `${p1}.c1_6[0]` },
  {
    kind: "text",
    domainKey: "citizenship_country",
    pdfField: `${p1}.f1_11[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "no_separate_residence",
    pdfField: `${p1}.c1_9[1]`,
  },
  { kind: "text", domainKey: "tax_home_line9", pdfField: `${p1}.f1_14[0]` },
  {
    kind: "text",
    domainKey: "employment_contract_terms",
    pdfField: `${p1}.f1_50[0]`,
  },
  { kind: "text", domainKey: "visa_type", pdfField: `${p1}.f1_52[0]` },
  {
    kind: "checkbox",
    domainKey: "visa_does_not_limit_stay",
    pdfField: `${p1}.c1_21[1]`,
  },
  { kind: "checkbox", domainKey: "no_us_home", pdfField: `${p1}.c1_23[1]` },
  { kind: "text", domainKey: "presence_begin", pdfField: `${p2}.f2_1[0]` },
  { kind: "text", domainKey: "presence_end", pdfField: `${p2}.f2_2[0]` },
  {
    kind: "text",
    domainKey: "principal_employment_country",
    pdfField: `${p2}.f2_3[0]`,
  },
  {
    kind: "text",
    domainKey: "no_travel_explanation",
    pdfField: `${p2}.Table_Line18[0].BodyRow1[0].f2_4[0]`,
  },
  { kind: "text", domainKey: "foreign_wages", pdfField: `${p2}.f2_28[0]` },
  { kind: "text", domainKey: "line24", pdfField: `${p2}.f2_51[0]` },
  { kind: "text", domainKey: "line26", pdfField: `${p2}.f2_53[0]` },
  {
    kind: "text",
    domainKey: "line27",
    pdfField: `${p3}.Line27TagCorrectingSubform[0].f3_1[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "no_housing_claim",
    pdfField: `${p3}.c3_1[1]`,
  },
  { kind: "checkbox", domainKey: "housing_claim", pdfField: `${p3}.c3_1[0]` },
  {
    kind: "text",
    domainKey: "line28",
    pdfField: `${p3}.Line28TagCorrectingSubform[0].f3_2[0]`,
  },
  { kind: "text", domainKey: "line29a", pdfField: `${p3}.f3_3[0]` },
  { kind: "text", domainKey: "line29b", pdfField: `${p3}.f3_4[0]` },
  { kind: "text", domainKey: "line30", pdfField: `${p3}.f3_5[0]` },
  { kind: "text", domainKey: "line31", pdfField: `${p3}.f3_6[0]` },
  { kind: "text", domainKey: "line32", pdfField: `${p3}.f3_7[0]` },
  { kind: "text", domainKey: "line33", pdfField: `${p3}.f3_8[0]` },
  { kind: "text", domainKey: "line34", pdfField: `${p3}.f3_9[0]` },
  { kind: "text", domainKey: "line35_whole", pdfField: `${p3}.f3_10[0]` },
  { kind: "text", domainKey: "line35_fraction", pdfField: `${p3}.f3_11[0]` },
  { kind: "text", domainKey: "line36", pdfField: `${p3}.f3_12[0]` },
  { kind: "text", domainKey: "line37", pdfField: `${p3}.f3_13[0]` },
  { kind: "text", domainKey: "line38", pdfField: `${p3}.f3_14[0]` },
  { kind: "text", domainKey: "line39_whole", pdfField: `${p3}.f3_15[0]` },
  { kind: "text", domainKey: "line39_fraction", pdfField: `${p3}.f3_16[0]` },
  { kind: "text", domainKey: "line40", pdfField: `${p3}.f3_17[0]` },
  { kind: "text", domainKey: "line41", pdfField: `${p3}.f3_18[0]` },
  { kind: "text", domainKey: "line42", pdfField: `${p3}.f3_19[0]` },
  { kind: "text", domainKey: "line43", pdfField: `${p3}.f3_20[0]` },
  { kind: "text", domainKey: "line45", pdfField: `${p3}.f3_22[0]` },
];

function addressLine(
  address: {
    line1: string;
    line2?: string;
    city: string;
    province_or_state?: string;
    country_code: string;
    postal_code?: string;
  },
): string {
  return [
    address.line1,
    address.line2,
    [address.city, address.province_or_state, address.postal_code].filter(
      Boolean,
    ).join(" "),
    address.country_code,
  ].filter(Boolean).join(", ");
}

export const form2555Pdf: PdfFormDescriptor = {
  pendingKey: "form2555",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f2555--2025.pdf",
  fields,
  projectFields(raw, pending) {
    if (Object.keys(raw).length === 0) return {};
    const filing = physicalPresenceFilingSchema.parse(raw.filing_details);
    const lines = calculatePhysicalPresence2555(filing, 2025);
    if (
      pending.schedule1?.line8d_foreign_earned_income_exclusion !==
        lines.line45 ||
      pending.f1040?.line1h_other_earned !== lines.line19
    ) {
      throw new Error(
        "Form 2555 PDF does not reconcile to Schedule 1 and Form 1040",
      );
    }
    const filer = pending.f1040 as Record<string, unknown>;
    return {
      name: [filer.taxpayer_first_name, filer.taxpayer_last_name].filter(
        Boolean,
      ).join(" "),
      ssn: filer.taxpayer_ssn,
      foreign_address: addressLine(filing.foreign_address),
      occupation: filing.occupation,
      employer_name: filing.employer_name,
      employer_foreign_address: addressLine(filing.employer_foreign_address),
      foreign_entity: true,
      no_prior_claim: true,
      citizenship_country: filing.citizenship_country,
      no_separate_residence: true,
      tax_home_line9:
        `${filing.tax_home_description}; established ${filing.tax_home_established_date}`,
      employment_contract_terms: filing.employment_contract_terms,
      visa_type: filing.visa_type,
      visa_does_not_limit_stay: true,
      no_us_home: true,
      presence_begin: filing.physical_presence_begin,
      presence_end: filing.physical_presence_end,
      principal_employment_country: filing.principal_employment_country,
      no_travel_explanation: "Physically present abroad entire 12-month period",
      foreign_wages: lines.line19,
      line24: lines.line24,
      line26: lines.line26,
      line27: lines.line26,
      no_housing_claim: !filing.claiming_housing_exclusion_or_deduction,
      housing_claim: filing.claiming_housing_exclusion_or_deduction,
      line28: lines.line28 || undefined,
      line29a: lines.line29a,
      line29b: lines.line29b || undefined,
      line30: lines.line30 || undefined,
      line31: lines.line31 || undefined,
      line32: lines.line32 || undefined,
      line33: lines.line33 || undefined,
      line34: lines.line34 || undefined,
      line35_whole: lines.line35 > 0
        ? lines.line35.toFixed(3).split(".")[0]
        : undefined,
      line35_fraction: lines.line35 > 0
        ? lines.line35.toFixed(3).split(".")[1]
        : undefined,
      line36: lines.line36 || undefined,
      line37: 130_000,
      line38: lines.line38,
      line39_whole: lines.line39.toFixed(3).split(".")[0],
      line39_fraction: lines.line39.toFixed(3).split(".")[1],
      line40: lines.line40,
      line41: lines.line41,
      line42: lines.line42,
      line43: lines.line43,
      line45: lines.line45,
    };
  },
};
