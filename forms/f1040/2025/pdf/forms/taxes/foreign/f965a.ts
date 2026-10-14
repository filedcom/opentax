import {
  currentYear965Payment,
  eligibleLiability,
  inputSchema,
  unpaidLiability,
} from "../../../../../nodes/inputs/taxes/foreign/f965/index.ts";
import { reconcileForm965aSchedule2 } from "../../../../mef/forms/taxes/foreign/f965a.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../../../review-support/form-descriptor.ts";

// January 2021 Form 965-A, the IRS revision applicable to TY2025. The first
// four Part I and II rows are preprinted for inclusion years 2017-2020. This
// descriptor projects one original-liability installment row with no S-corp
// deferral or transfer. It retains all three pages of the official form.
const page1 = "topmostSubform[0].Page1[0].";
const page2 = "topmostSubform[0].Page2[0].";
const text = (
  key: string,
  path: string,
  printZero = false,
): PdfFieldEntry => ({
  kind: "text",
  domainKey: key,
  pdfField: path,
  printZero,
});

function yearFields(index: number): PdfFieldEntry[] {
  const row = index + 1;
  const key = (part: string) => `year${row}_${part}`;
  const part1a = `${page1}Table_Part1_a-e[0].BodyRow${row}[0].`;
  const part1f = `${page1}Table_Part2_f-k[0].BodyRow${row}[0].`;
  const part2a = `${page1}Table_Part2_a-f[0].BodyRow${row}[0].`;
  const part2g = `${page2}Table_Part2_g-k[0].BodyRow${row}[0].`;
  const firstPart1a = 5 + 5 * index;
  const firstPart1f = 44 + 5 * index;
  const firstPart2a = 85 + 6 * index;
  const firstPart2g = 1 + 5 * index;
  return [
    text(
      key("net_tax_with"),
      `${part1a}f1_${String(firstPart1a).padStart(2, "0")}[0]`,
    ),
    text(
      key("net_tax_without"),
      `${part1a}f1_${String(firstPart1a + 1).padStart(2, "0")}[0]`,
    ),
    text(
      key("net_liability"),
      `${part1a}f1_${String(firstPart1a + 2).padStart(2, "0")}[0]`,
    ),
    text(key("eligible_liability"), `${part1f}f1_${firstPart1f}[0]`),
    {
      kind: "checkboxWhen",
      domainKey: key("installment_election"),
      pdfField: `${part1f}c1_${index + 2}[0]`,
      whenValue: "true",
    },
    text(key("installment_liability"), `${part1f}f1_${firstPart1f + 2}[0]`),
    ...Array.from({ length: 5 }, (_, payment) =>
      text(
        key(`paid_year${payment + 1}`),
        `${part2a}f1_${firstPart2a + payment}[0]`,
        true,
      )),
    ...Array.from({ length: 3 }, (_, payment) =>
      text(
        key(`paid_year${payment + 6}`),
        `${part2g}f2_${String(firstPart2g + payment).padStart(2, "0")}[0]`,
        true,
      )),
    text(
      key("unpaid"),
      `${part2g}f2_${String(firstPart2g + 3).padStart(2, "0")}[0]`,
      true,
    ),
    text(
      key("current_payment"),
      `${part2g}f2_${String(firstPart2g + 4).padStart(2, "0")}[0]`,
      true,
    ),
  ];
}

export const form965aPdf: PdfFormDescriptor = {
  pendingKey: "f965",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f965a--2021.pdf",
  pageIndices: () => [0, 1, 2],
  fields: [
    text("filer_name", `${page1}f1_01[0]`),
    text("filer_tin", `${page1}f1_02[0]`),
    text("reporting_year", `${page1}f1_03[0]`),
    ...Array.from({ length: 4 }, (_, index) => yearFields(index)).flat(),
    text("total_unpaid", `${page2}f2_41[0]`, true),
    text("total_current_payment", `${page2}f2_42[0]`, true),
  ],
  instances(raw, filer, allPending) {
    if (!("f965s" in raw)) return [];
    const input = inputSchema.parse(raw);
    if (
      !filer?.nameLine1 || !/^\d{9}$/.test(filer.primarySSN.replace(/\D/g, ""))
    ) {
      throw new Error("Form 965-A PDF needs final filer name and SSN");
    }
    if (!allPending || input.reporting_year !== 2025) {
      throw new Error("TY2025 Form 965-A PDF needs the finalized 2025 return");
    }
    reconcileForm965aSchedule2(input, allPending);
    const row = input.f965s[0];
    if (
      input.amended_report || input.f965s.length !== 1 ||
      row.entry_type !== "original" || !row.installment_election ||
      row.net_tax_adjustment !== 0 ||
      row.net_tax_adjustment_kind !== undefined ||
      row.counterparty_tax_id !== undefined ||
      input.s_corp_calculations.length > 0 ||
      input.s_corp_deferred_rows.length > 0 ||
      input.transfer_agreements.length > 0 ||
      row.tax_year_of_inclusion < 2017 || row.tax_year_of_inclusion > 2020
    ) {
      throw new Error(
        "Form 965-A PDF currently needs one unadjusted original 2017-2020 installment liability without transfers or S-corporation deferral",
      );
    }
    const yearIndex = row.tax_year_of_inclusion - 2017;
    const prefix = `year${yearIndex + 1}_`;
    const netLiability = row.net_tax_with_965 - row.net_tax_without_965;
    const fields: Record<string, unknown> = {
      filer_name: filer.nameLine1,
      filer_tin: filer.primarySSN.replace(/\D/g, ""),
      reporting_year: input.reporting_year,
      [`${prefix}net_tax_with`]: row.net_tax_with_965,
      [`${prefix}net_tax_without`]: row.net_tax_without_965,
      [`${prefix}net_liability`]: netLiability,
      [`${prefix}eligible_liability`]: eligibleLiability(input, row),
      [`${prefix}installment_election`]: true,
      [`${prefix}installment_liability`]: eligibleLiability(input, row),
      [`${prefix}unpaid`]: unpaidLiability(input, row),
      [`${prefix}current_payment`]: row.current_year_payment,
      total_unpaid: unpaidLiability(input, row),
      total_current_payment: currentYear965Payment(input),
    };
    row.paid_by_installment_year.forEach((paid, index) => {
      fields[`${prefix}paid_year${index + 1}`] = paid;
    });
    return [fields];
  },
};
