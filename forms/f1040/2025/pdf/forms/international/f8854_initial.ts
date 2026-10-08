import { calculateBalanceSheet } from "../../../../nodes/inputs/f8854/balance-sheet.ts";
import {
  assertForm8854FilingScope,
  inputSchema,
  isCoveredExpatriate,
  sectionAExceptionAnswers,
} from "../../../../nodes/inputs/f8854/index.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../../reviews/execution/form-descriptor.ts";

// TY2025 initial statement for a noncovered former citizen with cash only.
// All five Section A tax amounts remain tied to prior filed-return records.
const page1 = "topmostSubform[0].Page1[0].";
const page2 = "topmostSubform[0].Page2[0].";
const page4 = "topmostSubform[0].Page4[0].";
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
const check = (key: string, path: string): PdfFieldEntry => ({
  kind: "checkboxWhen",
  domainKey: key,
  pdfField: path,
  whenValue: "true",
});
const printedDate = (iso: string): string => {
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
};

export const form8854InitialPdf: PdfFormDescriptor = {
  pendingKey: "f8854",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8854--2025.pdf",
  pageIndices: () => [0, 1, 2, 3, 4],
  fields: [
    text("filer_name", `${page1}f1_4[0]`),
    text("filer_tin", `${page1}f1_5[0]`),
    text("telephone", `${page1}f1_6[0]`),
    text("mailing_address", `${page1}f1_7[0]`),
    check("initial_statement", `${page1}c1_1[0]`),
    check("former_citizen", `${page1}c1_2[0]`),
    text("expatriation_date", `${page1}f1_11[0]`),
    text("citizenship_country", `${page1}f1_14[0]`),
    text("citizenship_date", `${page1}f1_15[0]`),
    check("citizen_by_birth", `${page1}c1_3[0]`),
    check("citizen_by_naturalization", `${page1}c1_3[1]`),
    ...[19, 20, 21, 22, 23].map((number, index) =>
      text(
        `prior_tax_${2024 - index}`,
        `${page1}${
          ["First", "Second", "Third", "Fourth", "Fifth"][index]
        }Year_ReadOrder[0].f1_${number}[0]`,
        true,
      )
    ),
    text("net_worth", `${page1}f1_24[0]`, true),
    check("no_significant_changes", `${page1}c1_4[1]`),
    check("no_dual_citizen_exception", `${page1}c1_5[1]`),
    check("no_minor_exception", `${page1}c1_7[1]`),
    check("certified_compliance", `${page1}c1_8[0]`),
    text(
      "cash_fmv",
      `${page2}Table1_SectionB[0].BodyRow1[0].f2_1[0]`,
      true,
    ),
    text(
      "cash_basis",
      `${page2}Table1_SectionB[0].BodyRow1[0].f2_2[0]`,
      true,
    ),
    text(
      "total_assets_fmv",
      `${page2}Table1_SectionB[0].BodyRow22[0].f2_42[0]`,
      true,
    ),
    text(
      "total_assets_basis",
      `${page2}Table1_SectionB[0].BodyRow22[0].f2_43[0]`,
      true,
    ),
    text(
      "total_liabilities",
      `${page2}Table2_SectionB[0].BodyRow4[0].f2_47[0]`,
      true,
    ),
    text(
      "balance_sheet_net_worth",
      `${page2}Table2_SectionB[0].BodyRow5[0].f2_48[0]`,
      true,
    ),
    check("no_deferral_election", `${page4}c4_1[1]`),
  ],
  instances(raw, filer, allPending) {
    if (!("part_i" in raw)) return [];
    const input = inputSchema.parse(raw);
    assertForm8854FilingScope(input);
    if (
      !filer?.nameLine1 || !/^\d{9}$/.test(filer.primarySSN.replace(/\D/g, ""))
    ) {
      throw new Error("Initial Form 8854 PDF needs final filer name and SSN");
    }
    if (
      !allPending || allPending.f8854 === undefined ||
      allPending.f8854_annual !== undefined
    ) {
      throw new Error(
        "Initial Form 8854 PDF needs the finalized initial return",
      );
    }
    if (
      JSON.stringify(input) !==
        JSON.stringify(inputSchema.parse(allPending.f8854))
    ) {
      throw new Error(
        "Initial Form 8854 PDF differs from the finalized return",
      );
    }
    const partI = input.part_i;
    const sheet = input.balance_sheet;
    const cash = sheet.cash_and_bank_deposits;
    const totals = calculateBalanceSheet(sheet);
    const exceptions = sectionAExceptionAnswers(input);
    if (
      isCoveredExpatriate(input) || !input.certified_tax_compliance ||
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
      input.significant_asset_liability_changes_prior_5_years ||
      exceptions.dualCitizenBirth || exceptions.minorQualifies ||
      input.section_c !== null || input.section_d.elect_deferral ||
      !cash || totals.totalAssetsFairMarketValue !== cash.fair_market_value ||
      totals.totalAssetsUsAdjustedBasis !== cash.us_adjusted_basis ||
      totals.totalLiabilities !== 0 ||
      sheet.foreign_cfc_securities_within_line5.length > 0 ||
      sheet.partnership_interests.length > 0 ||
      sheet.owned_trust_assets.length > 0 ||
      sheet.nongrantor_trust_interests.length > 0 ||
      sheet.other_assets.length > 0 || sheet.other_liabilities.length > 0
    ) {
      throw new Error(
        "Initial Form 8854 PDF needs a noncovered cash-only citizen without exceptions or deferral",
      );
    }
    return [{
      filer_name: filer.nameLine1,
      filer_tin: filer.primarySSN.replace(/\D/g, ""),
      telephone: partI.telephone.number,
      mailing_address:
        `${partI.mailing_address.line1}, ${partI.mailing_address.city}, ${partI.mailing_address.state} ${partI.mailing_address.zip}`,
      initial_statement: true,
      former_citizen: true,
      expatriation_date: printedDate(partI.notification.date),
      citizenship_country: "United States",
      citizenship_date: printedDate(partI.citizenships[0].acquired_date),
      citizen_by_birth: partI.us_citizenship_acquisition === "BIRTH",
      citizen_by_naturalization: partI.us_citizenship_acquisition ===
        "NATURALIZATION",
      prior_tax_2024: input.prior_year_us_income_tax_less_foreign_tax_credit
        .year_2024,
      prior_tax_2023: input.prior_year_us_income_tax_less_foreign_tax_credit
        .year_2023,
      prior_tax_2022: input.prior_year_us_income_tax_less_foreign_tax_credit
        .year_2022,
      prior_tax_2021: input.prior_year_us_income_tax_less_foreign_tax_credit
        .year_2021,
      prior_tax_2020: input.prior_year_us_income_tax_less_foreign_tax_credit
        .year_2020,
      net_worth: totals.netWorth,
      no_significant_changes: true,
      no_dual_citizen_exception: true,
      no_minor_exception: true,
      certified_compliance: true,
      cash_fmv: cash.fair_market_value,
      cash_basis: cash.us_adjusted_basis,
      total_assets_fmv: totals.totalAssetsFairMarketValue,
      total_assets_basis: totals.totalAssetsUsAdjustedBasis,
      total_liabilities: totals.totalLiabilities,
      balance_sheet_net_worth: totals.netWorth,
      no_deferral_election: true,
    }];
  },
};
