import { PDFDocument } from "pdf-lib";
import type { RothDistributionYear } from "../nodes/intermediate/forms/form8606/roth-history.ts";

export async function assertRothHistoryPdf(
  facts:
    | RothDistributionYear["prior_form8606"]
    | NonNullable<RothDistributionYear["prior_form5329"]>,
  bytes: Uint8Array,
  type: "8606" | "5329",
) {
  if (facts.tax_year < 2020 || facts.tax_year > 2024) {
    throw new Error(
      "Roth prior distribution PDF layout needs year-specific retained-source review",
    );
  }
  const pdf = await PDFDocument.load(bytes), form = pdf.getForm();
  const prefix = facts.tax_year <= 2022 && type === "5329" ? "0" : "";
  const field = (page: number, index: number) =>
    form.getTextField(
      `topmostSubform[0].Page${page}[0].f${page}_${
        index < 10 ? prefix : ""
      }${index}[0]`,
    ).getText()?.trim() ?? "";
  const values = type === "8606"
    ? (() => {
      const row = facts as RothDistributionYear["prior_form8606"];
      return [
        row.filed_line19_distributions,
        row.filed_line20_homebuyer,
        row.filed_line21_after_homebuyer,
        row.filed_line22_regular_basis,
        row.filed_line23_after_regular,
        row.filed_line24_conversion_basis,
        row.filed_line25a_earnings,
        row.filed_line25b_disaster,
        row.filed_line25c_taxable,
      ].map((value, index) => ({ page: 2, field: index + 4, value }));
    })()
    : (() => {
      const row = facts as NonNullable<RothDistributionYear["prior_form5329"]>;
      return [
        row.filed_line1_early_distributions,
        row.filed_line2_exceptions,
        row.filed_line3_subject_to_tax,
        row.filed_line4_additional_tax,
      ].map((value, index) => ({
        page: 1,
        field: [9, 11, 12, 13][index],
        value,
      }));
    })();
  if (
    pdf.getTitle() !== `${facts.tax_year} Form ${type}` ||
    pdf.getPageCount() !==
      (type === "5329" && facts.tax_year === 2024 ? 3 : 2) ||
    field(1, 1) !== facts.owner_name ||
    field(1, 2).replace(/\D/g, "") !== facts.owner_ssn ||
    values.some((row) => {
      const actual = field(row.page, row.field);
      return row.value === null
        ? actual !== ""
        : actual === "" || Number(actual.replaceAll(",", "")) !== row.value;
    })
  ) {
    throw new Error(
      `Roth prior filed${type} actual PDF year/owner/distribution history differs`,
    );
  }
}
