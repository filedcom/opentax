import { annualInputSchema } from "../../../nodes/inputs/f8854/annual.ts";
import { validateAnnualForm8854Filing } from "../../../nodes/inputs/f8854/annual_node.ts";
import { reconcileAnnualForm8854Form8949Properties } from "../../../nodes/inputs/f8854/reconcile-annual-capital.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// TY2025 annual statement: one or more prior deferred properties with no
// current disposition or distribution. The initial statement uses other parts.
const page1 = "topmostSubform[0].Page1[0].";
const page4 = "topmostSubform[0].Page4[0].";
const page5 = "topmostSubform[0].Page5[0].";
const text = (key: string, path: string): PdfFieldEntry => ({
  kind: "text",
  domainKey: key,
  pdfField: path,
});
const check = (key: string, path: string): PdfFieldEntry => ({
  kind: "checkboxWhen",
  domainKey: key,
  pdfField: path,
  whenValue: "true",
});
function printedDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
}
const propertyFields = Array.from({ length: 7 }, (_, index) => {
  const row = index + 1;
  const first = 5 + index * 4;
  const prefix = `${page4}Table_Part3Ln1[0].BodyRow${row}[0].`;
  return [
    text(`property${row}_description`, `${prefix}f4_${first}[0]`),
    text(`property${row}_gain`, `${prefix}f4_${first + 1}[0]`),
    text(`property${row}_deferred_tax`, `${prefix}f4_${first + 2}[0]`),
  ];
}).flat();

export const form8854AnnualPdf: PdfFormDescriptor = {
  pendingKey: "f8854_annual",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8854--2025.pdf",
  // Pages 2–3 are initial-statement Sections B/C, absent from this annual route.
  pageIndices: () => [0, 3, 4],
  fields: [
    text("filer_name", `${page1}f1_4[0]`),
    text("filer_tin", `${page1}f1_5[0]`),
    text("telephone", `${page1}f1_6[0]`),
    text("mailing_address", `${page1}f1_7[0]`),
    check("annual_statement", `${page1}c1_1[1]`),
    check("former_citizen", `${page1}c1_2[0]`),
    text("expatriation_date", `${page1}f1_11[0]`),
    text("citizenship_country", `${page1}f1_14[0]`),
    text("citizenship_date", `${page1}f1_15[0]`),
    check("citizen_by_birth", `${page1}c1_3[0]`),
    check("citizen_by_naturalization", `${page1}c1_3[1]`),
    ...propertyFields,
    check("no_eligible_distribution", `${page5}c5_1[1]`),
    check("no_trust_distribution", `${page5}c5_2[1]`),
  ],
  instances(raw, filer, allPending) {
    if (!("part_i" in raw)) return [];
    const input = validateAnnualForm8854Filing(annualInputSchema.parse(raw));
    if (
      !filer?.nameLine1 || !/^\d{9}$/.test(filer.primarySSN.replace(/\D/g, ""))
    ) {
      throw new Error("Annual Form 8854 PDF needs final filer name and SSN");
    }
    if (
      !allPending || allPending.f8854 !== undefined ||
      allPending.f8854_annual === undefined
    ) {
      throw new Error("Annual Form 8854 PDF needs the finalized annual return");
    }
    if (
      JSON.stringify(input) !==
        JSON.stringify(annualInputSchema.parse(allPending.f8854_annual))
    ) {
      throw new Error("Annual Form 8854 PDF differs from the finalized return");
    }
    const partI = input.part_i;
    if (
      input.expatriate_type !== "CITIZEN" ||
      partI.mailing_address.kind !== "US" ||
      partI.mailing_address.line2 !== undefined ||
      `${partI.mailing_address.line1}, ${partI.mailing_address.city}, ${partI.mailing_address.state} ${partI.mailing_address.zip}`
          .length >
        80 ||
      partI.telephone.kind !== "US" ||
      partI.foreign_residence_address !== undefined ||
      partI.foreign_tax_residence_country_code !== undefined ||
      partI.notification.kind !== "CITIZEN_STATE_DEPARTMENT" ||
      partI.citizenships.length !== 1 ||
      partI.citizenships[0].country_code !== "US" ||
      input.deferred_properties.length === 0 ||
      input.deferred_properties.length > 7 ||
      input.deferred_properties.some((row) =>
        row.disposition.disposed_in_2025
      ) ||
      input.eligible_deferred_compensation_items.some((row) =>
        row.distributions.length > 0
      ) ||
      input.nongrantor_trust_interests.some((row) =>
        row.distributions.length > 0
      ) ||
      input.source_1042s.length > 0
    ) {
      throw new Error(
        "Annual Form 8854 PDF needs one to seven prior deferred properties, no 2025 events, and bounded Part I identity",
      );
    }
    reconcileAnnualForm8854Form8949Properties(input, allPending.form8949);
    const fields: Record<string, unknown> = {
      filer_name: filer.nameLine1,
      filer_tin: filer.primarySSN.replace(/\D/g, ""),
      telephone: partI.telephone.number,
      mailing_address:
        `${partI.mailing_address.line1}, ${partI.mailing_address.city}, ${partI.mailing_address.state} ${partI.mailing_address.zip}`,
      annual_statement: true,
      former_citizen: true,
      expatriation_date: printedDate(partI.notification.date),
      citizenship_country: "United States",
      citizenship_date: printedDate(partI.citizenships[0].acquired_date),
      citizen_by_birth: partI.us_citizenship_acquisition === "BIRTH",
      citizen_by_naturalization: partI.us_citizenship_acquisition ===
        "NATURALIZATION",
      no_eligible_distribution: true,
      no_trust_distribution: true,
    };
    input.deferred_properties.forEach((property, index) => {
      const row = index + 1;
      fields[`property${row}_description`] = property.description;
      fields[`property${row}_gain`] =
        property.prior_mark_to_market_gain_or_loss_amount;
      fields[`property${row}_deferred_tax`] =
        property.prior_deferred_tax_amount;
    });
    return [fields];
  },
};
