import {
  calculateForm4835Lines,
  type F4835Item,
  inputSchema,
} from "../../../nodes/inputs/f4835/index.ts";
import { farmAllowedLosses } from "../../mef/forms/f4835_passive_loss.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";

// Checked against the TY2025 Form 4835 AcroForm field tree and printed lines.
const page = "topmostSubform[0].Page1[0]";
const left = `${page}.Part2_LeftCol[0]`;
const text = (
  domainKey: string,
  number: number,
  prefix = page,
): Extract<PdfFieldEntry, { kind: "text" }> => ({
  kind: "text",
  domainKey,
  pdfField: `${prefix}.f1_${String(number).padStart(2, "0")}[0]`,
});

const expenseLines = [
  ["expense_car_truck", 17],
  ["expense_chemicals", 18],
  ["expense_conservation", 19],
  ["expense_custom_hire", 20],
  ["expense_depreciation", 21],
  ["expense_employee_benefits", 22],
  ["expense_feed", 23],
  ["expense_fertilizer", 24],
  ["expense_freight_trucking", 25],
  ["expense_gasoline", 26],
  ["expense_insurance", 27],
  ["expense_mortgage_interest", 28],
  ["expense_other_interest", 29],
  ["expense_labor_hired", 30],
  ["expense_pension", 31],
  ["expense_rent_lease_vehicles", 32],
  ["expense_rent_lease_land", 33],
  ["expense_repairs_maintenance", 34],
  ["expense_seeds_plants", 35],
  ["expense_storage_warehousing", 36],
  ["expense_supplies", 37],
  ["expense_taxes", 38],
  ["expense_utilities", 39],
  ["expense_vet_breeding", 40],
] as const satisfies ReadonlyArray<readonly [keyof F4835Item, number]>;

const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "ein", pdfField: `${page}.Comb[0].f1_03[0]` },
  {
    kind: "checkboxWhen",
    domainKey: "participation",
    pdfField: `${page}.c1_1[0]`,
    whenValue: "yes",
  },
  {
    kind: "checkboxWhen",
    domainKey: "participation",
    pdfField: `${page}.c1_1[1]`,
    whenValue: "no",
  },
  ...([
    ["livestock_crop_income", 4],
    ["cooperative_distributions_gross", 5],
    ["cooperative_distributions_taxable", 6],
    ["agricultural_program_payments_gross", 7],
    ["agricultural_program_payments_taxable", 8],
    ["ccc_loans_reported_election", 9],
    ["ccc_loans_forfeited_gross", 10],
    ["ccc_loans_forfeited_taxable", 11],
    ["crop_insurance_disaster_received", 12],
    ["crop_insurance_disaster_taxable", 13],
    ["crop_insurance_deferred_prior_year", 14],
    ["other_income", 15],
    ["line7_gross", 16],
  ] as const).map(([key, number]) => text(key, number)),
  ...expenseLines.map(([key, number]) =>
    text(key, number, number <= 30 ? left : page)
  ),
  ...Array.from({ length: 7 }, (_, index) => [
    text(`other_${index + 1}_description`, 41 + index * 2),
    text(`other_${index + 1}_amount`, 42 + index * 2),
  ]).flat(),
  text("line31_expenses", 55),
  text("line32_income", 56),
  {
    kind: "checkboxWhen",
    domainKey: "risk_status",
    pdfField: `${page}.c1_4[0]`,
    whenValue: "all",
  },
  {
    kind: "checkboxWhen",
    domainKey: "risk_status",
    pdfField: `${page}.c1_4[1]`,
    whenValue: "some",
  },
  { ...text("line34c_allowed_loss", 58), printZero: true },
];

function activityFields(
  item: F4835Item,
  allowedLoss: number,
): Record<string, unknown> {
  const lines = calculateForm4835Lines(item);
  const other = item.expense_other_details ?? [];
  const capitalized = item.expense_capitalized_263a ?? 0;
  const otherRows = Array.from({ length: 7 }, (_, index) => {
    if (index === 6 && capitalized > 0) {
      return {
        [`other_${index + 1}_description`]: "263A",
        // The printed form requests capitalized expenses in parentheses.
        [`other_${index + 1}_amount`]: `(${capitalized})`,
      };
    }
    const entry = other[index];
    return entry
      ? {
        [`other_${index + 1}_description`]: entry.description,
        [`other_${index + 1}_amount`]: entry.amount,
      }
      : {};
  });
  return {
    ...item,
    participation: item.actively_participated === undefined
      ? undefined
      : item.actively_participated
      ? "yes"
      : "no",
    line7_gross: lines.gross,
    ...Object.assign({}, ...otherRows),
    line31_expenses: lines.expenses,
    // The printed instructions require a loss to bypass line 32 and go to 34.
    line32_income: lines.preliminaryNet >= 0 ? lines.preliminaryNet : undefined,
    risk_status: lines.preliminaryNet < 0
      ? item.some_investment_not_at_risk ? "some" : "all"
      : undefined,
    line34c_allowed_loss: lines.preliminaryNet < 0 ? allowedLoss : undefined,
  };
}

function assertSupportedPaperPath(item: F4835Item): void {
  if ((item.prior_unallowed_passive_operating ?? 0) > 0) {
    throw new Error(
      "Form 4835 PDF needs the prior passive-loss PAL annotation on line 32",
    );
  }
  if ((item.ccc_loans_reported_election ?? 0) > 0) {
    throw new Error(
      "Form 4835 PDF needs the CCC loan election supporting statement",
    );
  }
  if (item.defer_crop_insurance === true) {
    throw new Error(
      "Form 4835 PDF needs the crop-insurance deferral supporting statement",
    );
  }
}

export const form4835Pdf: PdfFormDescriptor = {
  pendingKey: "f4835",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f4835--2025.pdf",
  pageIndices: () => [0],
  filerFields: [
    text("nameLine1", 1),
    text("primarySSN", 2),
  ],
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return { activities: [] };
    const items = inputSchema.parse(raw).f4835s;
    items.forEach(assertSupportedPaperPath);
    const allowed = farmAllowedLosses({ pending: allPending });
    if (allowed.length !== items.length) {
      throw new Error("Form 4835 PDF needs each activity's loss allocation");
    }
    return {
      activities: items.map((item, index) =>
        activityFields(item, allowed[index])
      ),
    };
  },
  instances(fields) {
    const activities = fields.activities;
    if (!Array.isArray(activities)) {
      throw new Error("Form 4835 PDF needs source activity instances");
    }
    return activities as Record<string, unknown>[];
  },
  fields,
};
