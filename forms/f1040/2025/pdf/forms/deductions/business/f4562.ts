import { appendBonusElectionStatements } from "./f4562_elections.ts";
import { filedCurrentYearSchema } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/current-year.ts";
import {
  filedBonus4562Schema,
  filedBonusInventorySchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form4562/bonus.ts";
import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../review-support/form-descriptor.ts";
import { filedForm4562Schema } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/index.ts";
import { form4562 as form4562Mef } from "../../../../mef/forms/deductions/business/f4562.ts";

// Verified against the canonical 2025 f4562 AcroForm tree. The bounded source
// has one Part I elected property or a reconciled Part II bonus asset.
const p1 = "topmostSubform[0].Page1[0]";
const p2 = "topmostSubform[0].Page2[0]";
const text = (
  domainKey: string,
  pdfField: string,
  printZero = false,
): PdfFieldEntry => ({ kind: "text", domainKey, pdfField, printZero });

const gdsFields = [3, 5, 7, 10, 15, 20].flatMap((period, index) =>
  ["basis", "recovery_period", "convention", "method", "deduction"].map((
    key,
    column,
  ) =>
    text(
      `gds_${period}_${key}`,
      `${p1}.SectionBTable[0].Line19${"abcdef"[index]}[0].f1_${
        27 + index * 6 + column
      }[0]`,
    )
  )
);
const fields: readonly PdfFieldEntry[] = [
  ...gdsFields,
  text("filer_name", `${p1}.f1_1[0]`),
  text("activity_description", `${p1}.f1_2[0]`),
  text("filer_ssn", `${p1}.f1_3[0]`),
  text("line1_maximum_dollar_limitation", `${p1}.f1_4[0]`),
  text("line2_total_cost", `${p1}.f1_5[0]`),
  text("line3_threshold_cost", `${p1}.f1_6[0]`),
  text("line4_reduction", `${p1}.f1_7[0]`, true),
  text("line5_dollar_limitation", `${p1}.f1_8[0]`),
  text("asset_description", `${p1}.Table_Ln6[0].BodyRow1[0].f1_9[0]`),
  text("line2_total_cost", `${p1}.Table_Ln6[0].BodyRow1[0].f1_10[0]`),
  text("line6_elected_cost", `${p1}.Table_Ln6[0].BodyRow1[0].f1_11[0]`),
  text("line8_total_elected_cost", `${p1}.f1_16[0]`),
  text("line9_tentative_deduction", `${p1}.f1_17[0]`),
  text("line10_prior_carryover", `${p1}.f1_18[0]`, true),
  text("line11_business_income_limitation", `${p1}.f1_19[0]`),
  text("line12_section179_expense_deduction", `${p1}.f1_20[0]`),
  text("line13_next_year_carryover", `${p1}.f1_21[0]`, true),
  text("line14_special_depreciation_allowance", `${p1}.f1_22[0]`),
  text("line22_total_depreciation", `${p2}.f2_2[0]`),
];

export const form4562Pdf: PdfFormDescriptor = {
  pendingKey: "form4562",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4562--2025.pdf",
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return {};
    const filed = "current_year_inventory" in raw
      ? filedCurrentYearSchema.parse(raw)
      : "bonus_inventory" in raw
      ? filedBonusInventorySchema.parse(raw)
      : "bonus_asset" in raw
      ? filedBonus4562Schema.parse(raw)
      : filedForm4562Schema.parse(raw);
    form4562Mef.build(filed, { pending: allPending });
    return filed;
  },
  instances(projected, filer, allPending) {
    if (Object.keys(projected).length === 0) return [];
    const name = filer?.fullName ?? [
      filer?.firstName,
      filer?.middleInitial,
      filer?.lastName,
    ].filter(Boolean).join(" ");
    const ssn = filer?.primarySSN.replaceAll("-", "");
    if (!name || !ssn || !/^\d{9}$/.test(ssn)) {
      throw new Error("Form 4562 PDF needs filer name and identifying number");
    }
    if (allPending?.w2) {
      const general = allPending.general;
      const taxpayerSSN = general && typeof general === "object" &&
          "taxpayer_ssn" in general &&
          typeof general.taxpayer_ssn === "string"
        ? general.taxpayer_ssn.replaceAll("-", "")
        : "";
      if (taxpayerSSN !== ssn) {
        throw new Error(
          "Form 4562 W-2 income-limit PDF filer must match the source taxpayer",
        );
      }
    }
    const currentYear = "current_year_inventory" in projected
      ? filedCurrentYearSchema.parse(projected)
      : undefined;
    if (
      currentYear?.current_year_activities.some((a) => a.proprietor_ssn !== ssn)
    ) {
      throw new Error(
        "Form 4562 current-year PDF filer must match the asset proprietor",
      );
    }
    const copies = currentYear
      ? currentYear.current_year_activities.map((activity) => ({
        ...activity,
        ...Object.fromEntries(
          activity.gds_rows.flatMap((row) =>
            Object.entries(row).map((
              [key, value],
            ) => [`gds_${row.recovery_period}_${key}`, value])
          ),
        ),
      }))
      : "bonus_inventory" in projected
      ? filedBonusInventorySchema.parse(projected).bonus_activities
      : [projected];
    if (
      ("bonus_asset" in projected &&
        filedBonus4562Schema.parse(projected).bonus_asset.proprietor_ssn !==
          ssn) ||
      ("bonus_inventory" in projected &&
        filedBonusInventorySchema.parse(projected).bonus_activities.some((a) =>
          a.proprietor_ssn !== ssn
        ))
    ) {
      throw new Error(
        "Form 4562 bonus PDF filer must match the asset proprietor",
      );
    }
    return copies.map((copy, index) => ({
      include_bonus_election_statements:
        !!currentYear?.current_year_inventory.bonus_election && index === 0,
      ...copy,
      filer_name: name,
      filer_ssn: ssn,
    }));
  },
  async appendSupplementalPages(document, fields, filer, allPending) {
    if (fields.include_bonus_election_statements === true) {
      await appendBonusElectionStatements(document, allPending ?? {}, filer);
    }
  },
  fields,
};
