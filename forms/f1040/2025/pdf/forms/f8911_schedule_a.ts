import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import { form8911PdfSource } from "./f8911_shared.ts";

// Schedule A (Form 8911), Rev. December 2025, one personal-use property.
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

export const form8911ScheduleAPdf: PdfFormDescriptor = {
  pendingKey: "f8911_schedule_a",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8911sa.pdf",
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
    text("line8", "f1_18[0]"),
    text("line9", "f1_19[0]", true),
    text("line10", "f1_20[0]", true),
    {
      kind: "checkboxWhen",
      domainKey: "main_home_property",
      pdfField: `${page}.Line17_ReadOrder[0].c1_3[0]`,
      whenValue: "true",
    },
    text("line18", "f1_26[0]"),
    text("line19", "f1_27[0]"),
    text("line21", "f1_29[0]"),
  ],
  instances(_fields, filer, allPending) {
    if (!allPending?.f8911) return [];
    const source = form8911PdfSource(allPending, filer);
    if (!source) return [];
    const { input, amounts, filerName, filerTin, propertyAddress } = source;
    return [{
      filer_name: filerName,
      filer_tin: filerTin,
      property_description: input.property_description,
      property_address: propertyAddress,
      construction_date: source.constructionDate,
      service_date: source.serviceDate,
      eligible_census_tract: true,
      census_geoid: input.census_tract_geoid,
      line8: input.cost,
      line9: 0,
      line10: 0,
      main_home_property: true,
      line18: input.cost,
      line19: input.cost * 0.3,
      line21: amounts.tentativeCredit,
    }];
  },
};
