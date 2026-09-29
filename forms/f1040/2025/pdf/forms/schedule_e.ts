import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  computeExpenses,
  computePropertyNet,
  inputSchema,
  qualifiedEntireDispositionGain,
  qualifiedEntireDispositionLoss,
} from "../../../nodes/inputs/schedule_e/index.ts";
import { scheduleE, validatePassiveActivityLink } from "../../mef/forms/schedule_e.ts";
import { verifyMiscRoyaltySource } from "../../mef/forms/schedule_e.ts";

// 2025 Schedule E AcroForm, Part I property A. This descriptor deliberately
// retains only page 1: Parts II-IV and farm rental income are not projected.
const page = "topmostSubform[0].Page1[0]";
const text = (
  domainKey: string,
  pdfField: string,
): Extract<PdfFieldEntry, { kind: "text" }> => ({
  kind: "text",
  domainKey,
  pdfField,
});
const answer = (domainKey: string, number: number): PdfFieldEntry[] => [
  {
    kind: "checkboxWhen",
    domainKey,
    pdfField: `${page}.c1_${number}[0]`,
    whenValue: "true",
  },
  {
    kind: "checkboxWhen",
    domainKey,
    pdfField: `${page}.c1_${number}[1]`,
    whenValue: "false",
  },
];

const expenseLines = [
  ["expense_advertising", 5],
  ["expense_auto_travel", 6],
  ["expense_cleaning", 7],
  ["expense_commissions", 8],
  ["expense_insurance", 9],
  ["expense_legal_professional", 10],
  ["expense_management", 11],
  ["expense_mortgage_interest", 12],
  ["expense_other_interest", 13],
  ["expense_repairs", 14],
  ["expense_supplies", 15],
  ["expense_taxes", 16],
  ["expense_utilities", 17],
] as const;

const fields: ReadonlyArray<PdfFieldEntry> = [
  ...answer("payments_made", 1),
  ...answer("forms_1099_filed", 2),
  text("property_address", `${page}.Table_Line1a[0].RowA[0].f1_3[0]`),
  text("property_type", `${page}.Table_Line1b[0].RowA[0].f1_6[0]`),
  text("fair_rental_days", `${page}.Table_Line2[0].RowA[0].f1_9[0]`),
  {
    ...text("personal_use_days", `${page}.Table_Line2[0].RowA[0].f1_10[0]`),
    printZero: true,
  },
  {
    kind: "checkboxWhen",
    domainKey: "qualified_joint_venture",
    pdfField: `${page}.Table_Line2[0].RowA[0].c1_3[0]`,
    whenValue: "true",
  },
  text("other_property_description", `${page}.f1_15[0]`),
  text("line3", `${page}.Table_Income[0].Line3[0].f1_16[0]`),
  text("line4", `${page}.Table_Income[0].Line4[0].f1_19[0]`),
  ...expenseLines.map(([key, line]) =>
    text(
      key,
      `${page}.Table_Expenses[0].Line${line}[0].f1_${22 + (line - 5) * 3}[0]`,
    )
  ),
  text("line18", `${page}.Table_Expenses[0].Line18[0].f1_61[0]`),
  text("line19_description", `${page}.Table_Expenses[0].Line19[0].f1_64[0]`),
  text("line19", `${page}.Table_Expenses[0].Line19[0].f1_65[0]`),
  text("line20", `${page}.Table_Expenses[0].Line20[0].f1_68[0]`),
  text("line21", `${page}.Table_Expenses[0].Line21[0].f1_71[0]`),
  text("line22", `${page}.Table_Expenses[0].Line22[0].f1_74[0]`),
  ...[
    "line23a",
    "line23b",
    "line23c",
    "line23d",
    "line23e",
    "line24",
    "line25",
    "line26",
  ].map(
    (key, index) => text(key, `${page}.f1_${77 + index}[0]`),
  ),
];

export const scheduleEPdf: PdfFormDescriptor = {
  pendingKey: "schedule_e",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040se--2025.pdf",
  pageIndices: () => [0],
  fields,
  filerFields: [
    text("fullName", `${page}.f1_1[0]`),
    text("primarySSN", `${page}.f1_2[0]`),
  ],
  projectFields(raw, allPending) {
    if (Object.keys(raw).length === 0) return {};
    const input = inputSchema.parse(raw);
    const item = input.schedule_es[0];
    if (
      input.schedule_es.length !== 1 || !item ||
      input.farm_rental_net !== undefined ||
      input.farm_rental_gross !== undefined ||
      (input.farm_rental_activities?.length ?? 0) > 0 ||
      input.mortgage_interest !== undefined ||
      input.expense_auto_travel !== undefined ||
      input.expense_depletion !== undefined ||
      (input.royalty_income !== undefined &&
        (!item.f1099m_royalty_source ||
          input.royalty_income !==
            item.f1099m_royalty_source.box2_gross_royalties)) ||
      (item.property_type === 6 && !item.k1_royalty_source &&
        !item.f1099m_royalty_source) ||
      item.personal_use_days !== 0 ||
      item.main_home_or_second_home === true ||
      ((item.royalties_income ?? 0) > 0 && !item.k1_royalty_source &&
        !item.f1099m_royalty_source) ||
      (item.ownership_percent ?? 100) <= 0 ||
      (item.expense_other_lines?.length ?? 0) > 1 ||
      (item.expense_depreciation_amt ?? 0) > 0 ||
      (item.section_1231_gain_loss ?? 0) !== 0
    ) {
      throw new Error(
        "Schedule E PDF needs one supported Part I rental or sourced royalty property",
      );
    }
    const entireLoss = qualifiedEntireDispositionLoss(item);
    const entireGain = qualifiedEntireDispositionGain(item);
    if (
      (item.disposed_of === true ||
        (item.passive_property_sales?.length ?? 0) > 0) &&
      entireLoss === undefined && entireGain === undefined
    ) {
      throw new Error(
        "Schedule E PDF disposition needs the sourced entire-interest overall-loss route",
      );
    }
    const allowedByActivity = validatePassiveActivityLink(input.schedule_es, {
      pending: allPending,
    });
    // The native descriptor checks address, allocation, whole-dollar lines,
    // and the matching Form 4797 sale before the PDF projects the same source.
    if (item.f1099m_royalty_source) {
      verifyMiscRoyaltySource(item, allPending.f1099m);
    } else if (!scheduleE.build(input, { pending: allPending })) {
      throw new Error("Schedule E PDF needs a native Part I property");
    }
    const fraction = (item.ownership_percent ?? 100) / 100;
    const amount = (value: number | undefined) =>
      Math.round((value ?? 0) * fraction);
    const rent = amount(item.rent_income);
    const royalty = amount(item.royalties_income);
    const depreciation = amount(
      (item.expense_depreciation ?? 0) + (item.expense_depletion ?? 0),
    );
    const other = item.expense_other_lines?.[0];
    const expenseTotal = Math.round(computeExpenses(item) * fraction);
    const net = Math.round(computePropertyNet(item));
    const allowedLoss = entireLoss ?? entireGain ??
      (item.activity_type === "A" || item.activity_type === "B"
        ? allowedByActivity.get(0) ?? 0
        : Math.max(0, -net));
    const deductibleNet = entireLoss === undefined && entireGain === undefined
      ? Math.max(0, net) - allowedLoss
      : net - (item.prior_unallowed_passive_operating ?? 0);
    const schedule1Line5 = allPending.schedule1?.line5_schedule_e;
    if (schedule1Line5 !== deductibleNet) {
      throw new Error(
        "Schedule E PDF line 26 must match finalized Schedule 1 line 5",
      );
    }
    const address = item.property_type === 6
      ? undefined
      : `${item.street_address}, ${item.city}, ${item.state} ${item.zip}`;
    return {
      payments_made: item.form_1099_payments_made,
      forms_1099_filed: item.form_1099_payments_made
        ? item.form_1099_filed
        : undefined,
      property_address: address,
      property_type: item.property_type,
      fair_rental_days: item.property_type === 6
        ? undefined
        : item.fair_rental_days,
      personal_use_days: item.property_type === 6
        ? undefined
        : item.personal_use_days,
      qualified_joint_venture: item.qualified_joint_venture,
      other_property_description: item.property_type === 8
        ? item.property_type_other_desc
        : undefined,
      line3: rent,
      line4: royalty,
      ...Object.fromEntries(
        expenseLines.map(([key]) => [key, amount(item[key])]),
      ),
      line18: depreciation,
      line19_description: other?.description,
      line19: amount(other?.amount),
      line20: expenseTotal,
      line21: net,
      line22: allowedLoss > 0 ? allowedLoss : undefined,
      line23a: rent,
      line23b: royalty,
      line23c: amount(item.expense_mortgage_interest),
      line23d: depreciation,
      line23e: expenseTotal,
      line24: Math.max(0, net),
      line25: allowedLoss > 0 ? allowedLoss : undefined,
      line26: deductibleNet,
    };
  },
  instances(fields, filer, allPending) {
    const raw = allPending?.schedule_e;
    const input = raw ? inputSchema.parse(raw) : undefined;
    if (input?.schedule_es[0]?.f1099m_royalty_source) {
      if (
        !filer || !allPending ||
        !scheduleE.build(input, { pending: allPending, filer })
      ) {
        throw new Error(
          "Schedule E PDF linked 1099-MISC royalty needs its primary filer and native property",
        );
      }
    }
    return [fields];
  },
};
