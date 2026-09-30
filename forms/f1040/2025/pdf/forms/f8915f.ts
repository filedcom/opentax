import {
  currentYearPlanLines,
  inputSchema,
} from "../../../nodes/inputs/f8915f/index.ts";
import {
  buildCurrentYearPlanForm8915F,
  form8915FOwnerName,
} from "../../mef/forms/f8915f.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";
const page3 = "topmostSubform[0].Page3[0]";
const field = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});
const checkbox = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "checkbox",
  domainKey,
  pdfField,
});

export const form8915FPdf: PdfFormDescriptor = {
  pendingKey: "f8915f",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8915f.pdf",
  instances(fields, filer, allPending) {
    const items = inputSchema.parse(fields).f8915fs ?? [];
    if (items.length === 0) return [];
    const item = items[0];
    buildCurrentYearPlanForm8915F(item, {
      filer,
      pending: allPending,
    });
    const lines = currentYearPlanLines(item);
    return [{
      owner_name: form8915FOwnerName(item, filer),
      owner_ssn: item.recipient_ssn,
      filing_2025: true,
      disaster_2025: true,
      fema_number: item.fema_number,
      declaration_date: item.disaster_declaration_date,
      begin_date: item.disaster_begin_date,
      distribution_date: item.distribution_date,
      line1e: lines.line1e_available,
      line2a: lines.line2a_plan_distributions,
      line2b: lines.line2b_qualified_plan_distributions,
      line5ba: lines.line5b_qualified_distributions,
      line5bb: lines.line5b_qualified_distributions,
      line6: lines.line6_total_qualified,
      line8_yes: true,
      line8: lines.line8_plan_qualified,
      line9: lines.line9_cost,
      line10: lines.line10_taxable,
      line11_election: true,
      line11: lines.line11_current_income,
      line13: lines.line13_total_income,
      line15: lines.line15_form1040_line5b,
      line16_no: true,
    }];
  },
  fields: [
    field("owner_name", `${page1}.f1_01[0]`),
    field("owner_ssn", `${page1}.f1_02[0]`),
    checkbox("filing_2025", `${page1}.c1_1[4]`),
    checkbox("disaster_2025", `${page1}.c1_2[5]`),
    field("fema_number", `${page1}.f1_05[0]`),
    field(
      "fema_number",
      `${page2}.Table1_Part1[0].Row1[0].f2_01[0]`,
    ),
    field(
      "declaration_date",
      `${page2}.Table1_Part1[0].Row1[0].f2_02[0]`,
    ),
    field(
      "begin_date",
      `${page2}.Table1_Part1[0].Row1[0].f2_03[0]`,
    ),
    field(
      "distribution_date",
      `${page2}.DatesOfDistributions_ReadOrder[0].f2_07[0]`,
    ),
    field("line1e", `${page2}.Table_Lines1-5[0].Row1e[0].f2_17[0]`),
    field("line2a", `${page2}.Table_Lines1-5[0].Row2[0].f2_18[0]`),
    field("line2b", `${page2}.Table_Lines1-5[0].Row2[0].f2_19[0]`),
    field("line5ba", `${page2}.Table_Lines1-5[0].Row5b[0].f2_24[0]`),
    field("line5bb", `${page2}.Table_Lines1-5[0].Row5b[0].f2_25[0]`),
    field("line6", `${page2}.f2_26[0]`),
    checkbox("line8_yes", `${page3}.c3_1[1]`),
    field("line8", `${page3}.f3_01[0]`),
    field("line9", `${page3}.f3_02[0]`),
    field("line10", `${page3}.f3_03[0]`),
    checkbox("line11_election", `${page3}.Line11_ReadOrder[0].c3_2[0]`),
    field("line11", `${page3}.f3_04[0]`),
    field("line13", `${page3}.f3_06[0]`),
    field("line15", `${page3}.f3_08[0]`),
    checkbox("line16_no", `${page3}.c3_3[1]`),
  ],
};
