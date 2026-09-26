import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

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
];

function projectFields(
  fields: Record<string, unknown>,
): Record<string, unknown> {
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
  if (allocationRows.length > 4) {
    throw new Error(
      "Form 8962 PDF needs an attached Part IV overflow statement after four allocations",
    );
  }
  projected.pdf_line9_yes = allocationRows.length > 0;
  projected.pdf_line9_no = allocationRows.length === 0;
  projected.pdf_line34_yes = allocationRows.length > 0;
  projected.pdf_line34_no = false;

  const monthlyRows = fields.monthly_ptc_rows;
  if (monthlyRows !== undefined && !Array.isArray(monthlyRows)) {
    throw new Error("Form 8962 PDF monthly calculation must be rows");
  }
  projected.pdf_line10_yes = !Array.isArray(monthlyRows);
  projected.pdf_line10_no = Array.isArray(monthlyRows);
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
      ) continue;
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

  allocationRows.forEach((row, index) => {
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
  includeWhen: (fields) =>
    fields.annual_premium !== undefined ||
    fields.annual_aptc !== undefined ||
    fields.annual_slcsp !== undefined ||
    Array.isArray(fields.monthly_ptc_rows),
};
