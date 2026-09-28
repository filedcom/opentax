import { rgb, StandardFonts } from "pdf-lib";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  current1095AStatements,
  inputSchema as form1095aSchema,
} from "../../../nodes/inputs/f1095a/index.ts";
import { inputSchema as generalSchema } from "../../../nodes/inputs/general/index.ts";
import { form8962 as form8962Mef } from "../../mef/forms/f8962.ts";
import { appendForm8962AllocationStatement } from "./f8962_allocation_statement.ts";
import { reconcileDependentMagi } from "../../form8962-dependent-magi.ts";

// TY2025 Form 8962 AcroForm fields, verified against the year-pinned IRS PDF.
const PAGE1 = "topmostSubform[0].Page1[0]";
const PAGE2 = "topmostSubform[0].Page2[0]";
const MONTH_CODES = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
] as const;
const MONTH_COLUMNS = [
  "premium",
  "slcsp",
  "contribution",
  "max_assistance",
  "allowed_credit",
  "aptc",
] as const;
const ALLOCATION_COLUMNS = [
  "policy_number",
  "other_taxpayer_ssn",
  "start_month",
  "end_month",
  "premium_pct",
  "slcsp_pct",
  "aptc_pct",
] as const;
const MARRIAGE_COLUMNS = [
  "family_size",
  "monthly_contribution",
  "start_month",
  "end_month",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const fields: ReadonlyArray<PdfFieldEntry> = [
  {
    kind: "checkbox",
    domainKey: "mfs_exception_ind",
    pdfField: `${PAGE1}.c1_1[0]`,
  },
  { kind: "text", domainKey: "household_size", pdfField: `${PAGE1}.f1_3[0]` },
  {
    kind: "text",
    domainKey: "taxpayer_modified_agi",
    pdfField: `${PAGE1}.f1_4[0]`,
  },
  {
    kind: "text",
    domainKey: "dependents_modified_agi",
    pdfField: `${PAGE1}.f1_5[0]`,
  },
  { kind: "text", domainKey: "household_income", pdfField: `${PAGE1}.f1_6[0]` },
  {
    kind: "checkbox",
    domainKey: "pdf_fpl_alaska",
    pdfField: `${PAGE1}.c1_2[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "pdf_fpl_hawaii",
    pdfField: `${PAGE1}.c1_2[1]`,
  },
  {
    kind: "checkbox",
    domainKey: "pdf_fpl_other",
    pdfField: `${PAGE1}.c1_2[2]`,
  },
  {
    kind: "text",
    domainKey: "federal_poverty_line",
    pdfField: `${PAGE1}.f1_7[0]`,
  },
  {
    kind: "text",
    domainKey: "federal_poverty_pct",
    pdfField: `${PAGE1}.f1_8[0]`,
  },
  {
    kind: "text",
    domainKey: "pdf_applicable_figure",
    pdfField: `${PAGE1}.f1_9[0]`,
  },
  {
    kind: "text",
    domainKey: "annual_applicable_contribution",
    pdfField: `${PAGE1}.f1_10[0]`,
  },
  {
    kind: "text",
    domainKey: "monthly_applicable_contribution",
    pdfField: `${PAGE1}.f1_11[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "pdf_line9_yes",
    pdfField: `${PAGE1}.c1_4[0]`,
  },
  { kind: "checkbox", domainKey: "pdf_line9_no", pdfField: `${PAGE1}.c1_4[1]` },
  {
    kind: "checkbox",
    domainKey: "pdf_line10_yes",
    pdfField: `${PAGE1}.c1_5[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "pdf_line10_no",
    pdfField: `${PAGE1}.c1_5[1]`,
  },
  ...MONTH_COLUMNS.map((column, index) => ({
    kind: "text" as const,
    domainKey: `pdf_annual_${column}`,
    pdfField: `${PAGE1}.Part2Table1[0].BodyRow1[0].f1_${index + 13}[0]`,
  })),
  ...MONTH_CODES.flatMap((_, monthIndex) =>
    MONTH_COLUMNS.map((column, columnIndex) => ({
      kind: "text" as const,
      domainKey: `pdf_month_${monthIndex + 1}_${column}`,
      pdfField: `${PAGE1}.Part2Table2[0].BodyRow${monthIndex + 1}[0].f1_${
        19 + monthIndex * 6 + columnIndex
      }[0]`,
    }))
  ),
  {
    kind: "text",
    domainKey: "total_premium_tax_credit",
    pdfField: `${PAGE1}.f1_91[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "total_advance_ptc",
    pdfField: `${PAGE1}.f1_92[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "pdf_net_premium_tax_credit",
    pdfField: `${PAGE1}.f1_93[0]`,
    printZero: true,
  },
  {
    kind: "text",
    domainKey: "excess_advance_payment",
    pdfField: `${PAGE1}.f1_94[0]`,
  },
  {
    kind: "text",
    domainKey: "repayment_limitation",
    pdfField: `${PAGE1}.f1_95[0]`,
  },
  {
    kind: "text",
    domainKey: "excess_advance_premium",
    pdfField: `${PAGE1}.f1_96[0]`,
  },
  ...Array.from(
    { length: 4 },
    (_, rowIndex) =>
      ALLOCATION_COLUMNS.map((column, columnIndex) => ({
        kind: "text" as const,
        domainKey: `pdf_allocation_${rowIndex + 1}_${column}`,
        pdfField: `${PAGE2}.${
          columnIndex >= 4 ? `Lines${30 + rowIndex}e-g[0].` : ""
        }f2_${rowIndex * 7 + columnIndex + 1}[0]`,
      })),
  ).flat(),
  {
    kind: "checkbox",
    domainKey: "pdf_line34_yes",
    pdfField: `${PAGE2}.c2_1[0]`,
  },
  {
    kind: "checkbox",
    domainKey: "pdf_line34_no",
    pdfField: `${PAGE2}.c2_1[1]`,
  },
  ...(["primary", "spouse"] as const).flatMap((role, roleIndex) =>
    MARRIAGE_COLUMNS.map((column, columnIndex) => ({
      kind: "text" as const,
      domainKey: `pdf_marriage_${role}_${column}`,
      pdfField: `${PAGE2}.f2_${29 + roleIndex * 4 + columnIndex}[0]`,
    }))
  ),
];

function projectFields(
  fields: Record<string, unknown>,
  allPending: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  const hasPolicy = fields.annual_premium !== undefined ||
    fields.annual_aptc !== undefined || fields.annual_slcsp !== undefined ||
    Array.isArray(fields.monthly_ptc_rows);
  if (hasPolicy && allPending.f1095a !== undefined) {
    const policies = current1095AStatements(
      form1095aSchema.parse(allPending.f1095a).f1095as,
    );
    if (
      Array.isArray(fields.monthly_ptc_rows) &&
      Array.from(
        { length: 12 },
        (_, month) =>
          policies.filter((policy) =>
            (policy.monthly_premiums?.[month] ?? 0) > 0 ||
            (policy.monthly_slcsps?.[month] ?? 0) > 0 ||
            (policy.monthly_aptcs?.[month] ?? 0) > 0
          ).length > 1,
      ).some(Boolean) && fields.household_size !== 2 &&
      fields.household_size !== 3
    ) {
      throw new Error(
        "Form 8962 PDF overlapping policies need enrollee and coverage-family source reconciliation",
      );
    }
  }
  if (
    hasPolicy &&
    typeof fields.dependents_modified_agi === "number" &&
    fields.dependents_modified_agi !== 0 &&
    fields.household_size !== 2 && fields.household_size !== 3
  ) {
    throw new Error(
      "Form 8962 PDF dependent MAGI needs the bounded dependent source route",
    );
  }
  if (
    hasPolicy &&
    (fields.household_size === 2 || fields.household_size === 3)
  ) {
    const dependentMagi = reconcileDependentMagi(
      fields.household_size,
      typeof fields.dependents_modified_agi === "number"
        ? fields.dependents_modified_agi
        : undefined,
      allPending.general,
    );
    if (
      typeof fields.taxpayer_modified_agi !== "number" ||
      fields.household_income !== fields.taxpayer_modified_agi + dependentMagi
    ) {
      throw new Error(
        "Form 8962 PDF household income differs from taxpayer and verified dependent MAGI",
      );
    }
  }
  const projected: Record<string, unknown> = { ...fields };
  projected.pdf_fpl_alaska = fields.fpl_region === "alaska";
  projected.pdf_fpl_hawaii = fields.fpl_region === "hawaii";
  projected.pdf_fpl_other = fields.fpl_region === "contiguous";
  if (typeof fields.applicable_figure === "number") {
    projected.pdf_applicable_figure = fields.applicable_figure.toFixed(4);
  }

  const allocations = fields.shared_policy_allocations;
  if (allocations !== undefined && !Array.isArray(allocations)) {
    throw new Error("Form 8962 PDF shared allocations must be rows");
  }
  const allocationRows: unknown[] = Array.isArray(allocations)
    ? allocations
    : [];
  const marriagePrimary = fields.alternative_marriage_primary;
  const marriageSpouse = fields.alternative_marriage_spouse;
  const hasMarriage =
    marriagePrimary !== undefined && marriagePrimary !== null ||
    marriageSpouse !== undefined && marriageSpouse !== null;
  projected.pdf_line9_yes = allocationRows.length > 0 || hasMarriage;
  projected.pdf_line9_no = allocationRows.length === 0 && !hasMarriage;
  projected.pdf_line34_yes = allocationRows.length > 0 &&
    allocationRows.length <= 4;
  projected.pdf_line34_no = allocationRows.length > 4;

  const monthlyRows = fields.monthly_ptc_rows;
  if (monthlyRows !== undefined && !Array.isArray(monthlyRows)) {
    throw new Error("Form 8962 PDF monthly calculation must be rows");
  }
  projected.pdf_line10_yes = !Array.isArray(monthlyRows);
  projected.pdf_line10_no = Array.isArray(monthlyRows);
  if (hasMarriage && !Array.isArray(monthlyRows)) {
    throw new Error("Form 8962 PDF Part V requires monthly lines 12-23");
  }
  if (Array.isArray(monthlyRows)) {
    for (const row of monthlyRows) {
      if (!isRecord(row) || typeof row.month_code !== "string") {
        throw new Error("Form 8962 PDF needs a month code for each row");
      }
      const monthIndex = MONTH_CODES.findIndex((code) =>
        code === row.month_code
      );
      if (monthIndex < 0) {
        throw new Error("Form 8962 PDF has an invalid month code");
      }
      if (
        (row.premium ?? 0) === 0 && (row.slcsp ?? 0) === 0 &&
        (row.aptc ?? 0) === 0
      ) {
        if (
          (row.max_assistance ?? 0) !== 0 ||
          (row.allowed_credit ?? 0) !== 0
        ) {
          throw new Error(
            "Form 8962 PDF uncovered month cannot claim premium assistance or credit",
          );
        }
        continue;
      }
      for (const column of MONTH_COLUMNS) {
        const value = row[column];
        if (typeof value === "number") {
          projected[`pdf_month_${monthIndex + 1}_${column}`] = String(
            Math.round(value),
          );
        }
      }
    }
  } else {
    const annualKeys = [
      "annual_premium",
      "annual_slcsp",
      "annual_applicable_contribution",
      "annual_max_ptc",
      "annual_ptc_allowed",
      "annual_aptc",
    ] as const;
    MONTH_COLUMNS.forEach((column, index) => {
      const value = fields[annualKeys[index]];
      if (typeof value === "number") {
        projected[`pdf_annual_${column}`] = String(Math.round(value));
      }
    });
  }

  allocationRows.slice(0, 4).forEach((row, index) => {
    if (!isRecord(row)) {
      throw new Error("Form 8962 PDF allocation must be a row");
    }
    for (const column of ALLOCATION_COLUMNS) {
      const value = row[column];
      if (value === undefined || value === null) continue;
      projected[`pdf_allocation_${index + 1}_${column}`] =
        column.endsWith("_pct") && typeof value === "number"
          ? value.toFixed(2)
          : (column === "start_month" || column === "end_month") &&
              typeof value === "number"
          ? String(value).padStart(2, "0")
          : value;
    }
  });

  for (
    const [role, group] of [
      ["primary", marriagePrimary],
      ["spouse", marriageSpouse],
    ] as const
  ) {
    if (group === undefined || group === null) continue;
    if (
      !isRecord(group) ||
      typeof group.family_size !== "number" ||
      !Number.isInteger(group.family_size) || group.family_size <= 0 ||
      typeof group.monthly_contribution !== "number" ||
      !Number.isInteger(group.monthly_contribution) ||
      group.monthly_contribution < 0 ||
      typeof group.start_month !== "number" ||
      !Number.isInteger(group.start_month) ||
      typeof group.end_month !== "number" ||
      !Number.isInteger(group.end_month) ||
      group.start_month < 1 || group.end_month > 12 ||
      group.start_month > group.end_month
    ) {
      throw new Error("Form 8962 PDF Part V needs complete line 35/36 facts");
    }
    for (const column of MARRIAGE_COLUMNS) {
      const value = group[column] as number;
      projected[`pdf_marriage_${role}_${column}`] = column.endsWith("_month")
        ? String(value).padStart(2, "0")
        : String(value);
    }
  }

  const line24 = fields.total_premium_tax_credit;
  const line25 = fields.total_advance_ptc;
  projected.pdf_net_premium_tax_credit = fields.net_premium_tax_credit;
  if (
    typeof line24 === "number" && typeof line25 === "number" &&
    line24 === line25
  ) {
    projected.pdf_net_premium_tax_credit = 0;
  }
  return projected;
}

export const form8962Pdf: PdfFormDescriptor = {
  pendingKey: "form8962",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8962--2025.pdf",
  fields,
  filerFields: [
    { kind: "text", domainKey: "fullName", pdfField: `${PAGE1}.f1_1[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${PAGE1}.f1_2[0]` },
  ],
  projectFields,
  instances(projected, filer, allPending) {
    const general = generalSchema.safeParse(allPending?.general);
    const source = allPending?.f1095a;
    const policies = source === undefined
      ? []
      : current1095AStatements(form1095aSchema.parse(source).f1095as);
    if (
      projected.fpl_region === "alaska" ||
      projected.fpl_region === "hawaii" ||
      (Array.isArray(projected.shared_policy_allocations) &&
        projected.shared_policy_allocations.length > 0) ||
      (general.success &&
        (general.data.ptc_residence_states_2025?.length ?? 1) > 1) ||
      ((projected.annual_premium !== undefined ||
        Array.isArray(projected.monthly_ptc_rows)) && policies.length > 1) ||
      ((projected.household_size === 2 || projected.household_size === 3) &&
        Array.isArray(projected.monthly_ptc_rows)) ||
      (typeof projected.federal_poverty_pct === "number" &&
        projected.federal_poverty_pct < 400)
    ) {
      form8962Mef.build(projected, { filer, pending: allPending });
    }
    if (source !== undefined) {
      const premiumMonths = policies.length === 1
        ? policies[0]?.monthly_premiums
        : undefined;
      const coveredCount = premiumMonths?.filter((amount) => amount > 0).length;
      const noAptcPositiveClaim = policies.some((policy) =>
        policy.monthly_premiums?.some((premium) => premium > 0) &&
        policy.monthly_aptcs?.every((aptc) => aptc === 0)
      );
      if (
        noAptcPositiveClaim ||
        ((projected.annual_premium !== undefined ||
          Array.isArray(projected.monthly_ptc_rows)) &&
          coveredCount !== undefined && coveredCount > 0 && coveredCount < 12)
      ) {
        form8962Mef.build(projected, { filer, pending: allPending });
      }
    }
    return [projected];
  },
  decoratePages: async (document, pages, formFields) => {
    if (formFields.qsehra_ind !== true) return;
    const page = pages[0];
    if (!page) throw new Error("Form 8962 PDF is missing page 1");
    const font = await document.embedFont(StandardFonts.HelveticaBold);
    page.drawText("QSEHRA", {
      x: 280,
      y: 768,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
  },
  appendSupplementalPages: appendForm8962AllocationStatement,
  includeWhen: (fields) =>
    fields.annual_premium !== undefined ||
    fields.annual_aptc !== undefined ||
    fields.annual_slcsp !== undefined ||
    Array.isArray(fields.monthly_ptc_rows),
};
