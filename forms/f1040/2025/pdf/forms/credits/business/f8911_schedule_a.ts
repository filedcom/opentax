import {
  calculateForm8911PropertyAmounts,
  type F8911Property,
} from "../../../../../nodes/inputs/credits/business/f8911/index.ts";
import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../review-support/form-descriptor.ts";
import { form8911PdfSource } from "./f8911_shared.ts";

// Schedule A (Form 8911), Rev. December 2025, one copy per qualified property.
const page = "topmostSubform[0].Page1[0]";
const text = (
  domainKey: string,
  pdfField: string,
  printZero = false,
): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField: `${page}.${pdfField}`,
  printZero,
});

/** Project amounts only; the descriptor applies the return-wide filing/source checks. */
export function projectForm8911PropertyAmounts(input: F8911Property) {
  const credit = calculateForm8911PropertyAmounts(input);
  if (
    Number(credit.businessUseFraction.toFixed(5)) !== credit.businessUseFraction
  ) {
    throw new Error(
      "Form 8911 business percentage exceeds MeF five-decimal ratio precision",
    );
  }
  return {
    line8: credit.cost,
    // Strings preserve fractional percentage digits through the PDF money formatter.
    line9: credit.businessUseFraction > 0
      ? String(Number((credit.businessUseFraction * 100).toFixed(3)))
      : 0,
    line10: credit.businessCost,
    ...(credit.businessUseFraction > 0
      ? {
        line11: credit.section179Deduction,
        line12: credit.netBusinessCost,
        increased_rate: credit.businessRate === 0.30,
        line14: credit.businessCreditBeforeCap,
        line16: credit.businessCredit,
      }
      : {}),
    ...(credit.businessUseFraction < 1
      ? {
        main_home_property: input.main_home_property,
        ...(input.main_home_property
          ? {
            line18: credit.personalCost,
            line19: credit.personalCreditBeforeCap,
            line21: credit.personalCredit,
          }
          : {}),
      }
      : {}),
  };
}

export const form8911ScheduleAPdf: PdfFormDescriptor = {
  pendingKey: "f8911_schedule_a",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8911sa.pdf",
  // IRS Rev. December 2025 template, retrieved October 9, 2026 (Stockholm).
  pdfSha256: "8feda345747dfdb1c6bff573af3ef26c726235d8df91224ed9e20f85a364eb1c",
  fields: [
    text("filer_name", "f1_01[0]"),
    text("filer_tin", "f1_02[0]"),
    text("property_description", "f1_04[0]"),
    text("property_address", "f1_07[0]"),
    text("construction_date", "f1_14[0]"),
    text("service_date", "f1_15[0]"),
    {
      kind: "checkboxWhen",
      domainKey: "eligible_census_tract",
      pdfField: `${page}.c1_1[0]`,
      whenValue: "true",
    },
    text("census_geoid", "GEOID-Comb_Ln6b[0].f1_16[0]"),
    text("certification_permit_number", "f1_17[0]"),
    text("line8", "f1_18[0]"),
    text("line9", "f1_19[0]", true),
    text("line10", "f1_20[0]", true),
    text("line11", "f1_21[0]", true),
    text("line12", "f1_22[0]", true),
    {
      kind: "checkboxWhen",
      domainKey: "increased_rate",
      pdfField: `${page}.Line13_ReadOrder[0].c1_2[0]`,
      whenValue: "true",
    },
    {
      kind: "checkboxWhen",
      domainKey: "increased_rate",
      pdfField: `${page}.Line13_ReadOrder[0].c1_2[1]`,
      whenValue: "false",
    },
    text("line14", "f1_23[0]", true),
    text("line16", "f1_25[0]", true),
    {
      kind: "checkboxWhen",
      domainKey: "main_home_property",
      pdfField: `${page}.Line17_ReadOrder[0].c1_3[0]`,
      whenValue: "true",
    },
    {
      kind: "checkboxWhen",
      domainKey: "main_home_property",
      pdfField: `${page}.Line17_ReadOrder[0].c1_3[1]`,
      whenValue: "false",
    },
    text("line18", "f1_26[0]"),
    text("line19", "f1_27[0]"),
    text("line21", "f1_29[0]"),
  ],
  instances(_fields, filer, allPending) {
    if (!allPending?.f8911) return [];
    const source = form8911PdfSource(allPending, filer);
    if (!source) return [];
    const { filerName, filerTin } = source;
    return source.properties.map((
      { input, propertyAddress, constructionDate, serviceDate },
    ) => {
      return ({
        filer_name: filerName,
        filer_tin: filerTin,
        property_description: input.property_description,
        property_address: propertyAddress,
        construction_date: constructionDate,
        service_date: serviceDate,
        eligible_census_tract: true,
        census_geoid: input.census_tract_geoid,
        certification_permit_number: input.certification_permit_number,
        ...projectForm8911PropertyAmounts(input),
      });
    });
  },
};
