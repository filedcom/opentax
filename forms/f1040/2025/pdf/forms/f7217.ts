import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import type { FilerIdentity } from "../../../mef/header.ts";
import {
  assertForm7217FilingSource,
  computeForm7217Amounts,
  inputSchema,
} from "../../../nodes/inputs/f7217/index.ts";
import { assertForm7217GainFiling } from "../../form7217_gain_filing.ts";

// The IRS December 2024 revision is the current Form 7217 for TY2025.
// These are the AcroForm widgets of that two-page revision, not inferred
// positions from its extracted text or the MeF element order.
const page1 = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";
const table = `${page2}.Page2Table[0]`;
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
  printZero: true,
});
const answer = (domainKey: string, number: number): PdfFieldEntry[] => [
  {
    kind: "checkboxWhen",
    domainKey,
    pdfField: `${page1}.c1_${number}[0]`,
    whenValue: "true",
  },
  {
    kind: "checkboxWhen",
    domainKey,
    pdfField: `${page1}.c1_${number}[1]`,
    whenValue: "false",
  },
];

const fields: PdfFieldEntry[] = [
  text("partner_name", `${page1}.f1_1[0]`),
  text("partner_tin", `${page1}.f1_2[0]`),
  text("partnership_name", `${page1}.f1_3[0]`),
  text("partnership_ein", `${page1}.f1_4[0]`),
  text("distribution_date_printed", `${page1}.f1_5[0]`),
  ...answer("complete_liquidation", 1),
  ...answer("section_751b_sale_or_exchange", 2),
  text("line3", `${page1}.f1_6[0]`),
  text("line4", `${page1}.f1_7[0]`),
  text("line5a", `${page1}.f1_8[0]`),
  text("line5b", `${page1}.f1_9[0]`),
  text("line5c", `${page1}.f1_10[0]`),
  text("line6", `${page1}.f1_11[0]`),
  text("line7", `${page1}.f1_12[0]`),
  ...answer("us_tax_required_on_gain", 3),
  text("line9", `${page1}.f1_13[0]`),
  text("line10", `${page1}.f1_14[0]`),
];

for (let row = 1; row <= 30; row++) {
  const prefix = `${table}.Row${row}[0]`;
  const firstText = (row - 1) * 4 + 1;
  const firstBox = (row - 1) * 5 + 1;
  fields.push(
    text(`row${row}_description`, `${prefix}.f2_${firstText}[0]`),
    text(`row${row}_partnership_basis`, `${prefix}.f2_${firstText + 1}[0]`),
    ...[
      "section_732d_basis_adjustment",
      "section_732f_basis_adjustment",
      "section_734b_basis_adjustment",
      "section_743b_basis_adjustment",
    ].map((key, index): PdfFieldEntry => ({
      kind: "checkbox",
      domainKey: `row${row}_${key}`,
      pdfField: `${prefix}.c2_${firstBox + index}[0]`,
    })),
    text(`row${row}_fmv`, `${prefix}.f2_${firstText + 2}[0]`),
    text(`row${row}_partner_basis`, `${prefix}.f2_${firstText + 3}[0]`),
  );
}

fields.push(
  text("total_partnership_basis", `${page2}.f2_124[0]`),
  text("total_fmv", `${page2}.f2_125[0]`),
  text("total_partner_basis", `${page2}.f2_126[0]`),
);

function filerIdentity(filer: FilerIdentity | undefined): {
  partner_name: string;
  partner_tin: string;
} {
  if (!filer) throw new Error("Form 7217 PDF needs partner filer identity");
  const partnerName = filer.fullName ?? filer.nameLine1;
  const partnerTin = filer.primarySSN.replace(/\D/g, "");
  if (!partnerName || !/^\d{9}$/.test(partnerTin)) {
    throw new Error("Form 7217 PDF needs partner name and SSN");
  }
  return { partner_name: partnerName, partner_tin: partnerTin };
}

export const form7217Pdf = {
  pendingKey: "f7217",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f7217--2024.pdf",
  instances(
    source: Record<string, unknown>,
    filer?: FilerIdentity,
    pending?: Record<string, unknown>,
  ) {
    if (Object.keys(source).length === 0) return [];
    const input = inputSchema.parse(source);
    assertForm7217FilingSource(input);
    if (!filer) throw new Error("Form 7217 PDF needs partner filer identity");
    const identity = filerIdentity(filer);
    return input.form7217s.map((item) => {
      assertForm7217GainFiling(item, filer, pending);
      if (item.distributed_properties.length > 30) {
        throw new Error(
          "Form 7217 PDF needs an attached Part II continuation after 30 property rows",
        );
      }
      const amounts = computeForm7217Amounts(item);
      const [year, month, day] = item.distribution_date.split("-");
      const instance: Record<string, unknown> = {
        ...identity,
        partnership_name: item.partnership_name,
        partnership_ein: item.partnership_ein.replace(/\D/g, ""),
        distribution_date_printed: `${month}/${day}/${year}`,
        complete_liquidation: item.complete_liquidation,
        section_751b_sale_or_exchange: item.section_751b_sale_or_exchange,
        line3: amounts.totalPartnershipBasis,
        line4: item.partner_adjusted_basis_before_distribution,
        line5a: item.cash_received,
        line5b: item.marketable_securities_fmv,
        line5c: amounts.cashAndSecurities,
        line6: amounts.smallerBasisAndCash,
        line7: amounts.recognizedGain,
        us_tax_required_on_gain: item.us_tax_required_on_gain,
        line9: amounts.remainingPartnerBasis,
        line10: amounts.basisAllocatedToProperty,
        total_partnership_basis: amounts.totalPartnershipBasis,
        total_fmv: amounts.totalDistributedPropertyFMV,
        total_partner_basis: amounts.totalPartnerBasisAfterSection732,
      };
      item.distributed_properties.forEach((property, index) => {
        // The shared source gate classifies each property, reconciles section
        // 731(c) securities to line 5b, and checks Part II basis totals.
        const row = index + 1;
        instance[`row${row}_description`] = property.description;
        instance[`row${row}_partnership_basis`] =
          property.partnership_basis_before_distribution;
        instance[`row${row}_section_732d_basis_adjustment`] =
          property.section_732d_basis_adjustment;
        instance[`row${row}_section_732f_basis_adjustment`] =
          property.section_732f_basis_adjustment;
        instance[`row${row}_section_734b_basis_adjustment`] =
          property.section_734b_basis_adjustment;
        instance[`row${row}_section_743b_basis_adjustment`] =
          property.section_743b_basis_adjustment;
        instance[`row${row}_fmv`] = property.fair_market_value;
        instance[`row${row}_partner_basis`] =
          property.partner_basis_after_section_732;
      });
      return instance;
    });
  },
  fields,
} satisfies PdfFormDescriptor;
