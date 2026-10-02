import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import {
  computeExpenses,
  computePropertyNet,
  inputSchema,
  qualifiedEntireDispositionGain,
  qualifiedEntireDispositionLoss,
  qualifiedFirstYearRetainedPropertySale,
} from "../../../nodes/inputs/schedule_e/index.ts";
import {
  scheduleE,
  validatePassiveActivityLink,
} from "../../mef/forms/schedule_e.ts";
import { verifyMiscRoyaltySource } from "../../mef/forms/schedule_e.ts";
import { scheduleEK1Part2Rows } from "../../schedule-e-k1-part2.ts";
import {
  calculateForm4835AtRiskNet,
  inputSchema as form4835InputSchema,
} from "../../../nodes/inputs/f4835/index.ts";
import { farmAllowedLosses } from "../../mef/forms/f4835_passive_loss.ts";
import { appendScheduleEPartIStatement } from "./schedule_e_part_i_statement.ts";

// 2025 Schedule E AcroForm: three Part I properties, four Part II K-1 rows,
// two Part III trust rows, and Part V farm totals on the same two pages.
const page = "topmostSubform[0].Page1[0]";
const page2 = "topmostSubform[0].Page2[0]";
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
  ...["A", "B", "C"].flatMap((row, index) => [
    text(
      `property_${index}_address`,
      `${page}.Table_Line1a[0].Row${row}[0].f1_${3 + index}[0]`,
    ),
    text(
      `property_${index}_type`,
      `${page}.Table_Line1b[0].Row${row}[0].f1_${6 + index}[0]`,
    ),
    text(
      `property_${index}_fair_rental_days`,
      `${page}.Table_Line2[0].Row${row}[0].f1_${9 + index * 2}[0]`,
    ),
    {
      ...text(
        `property_${index}_personal_use_days`,
        `${page}.Table_Line2[0].Row${row}[0].f1_${10 + index * 2}[0]`,
      ),
      printZero: true,
    },
    {
      kind: "checkboxWhen" as const,
      domainKey: `property_${index}_qualified_joint_venture`,
      pdfField: `${page}.Table_Line2[0].Row${row}[0].c1_${3 + index}[0]`,
      whenValue: "true",
    },
    text(
      `property_${index}_line3`,
      `${page}.Table_Income[0].Line3[0].f1_${16 + index}[0]`,
    ),
    text(
      `property_${index}_line4`,
      `${page}.Table_Income[0].Line4[0].f1_${19 + index}[0]`,
    ),
    ...expenseLines.map(([key, line]) =>
      text(
        `property_${index}_${key}`,
        `${page}.Table_Expenses[0].Line${line}[0].f1_${
          22 + (line - 5) * 3 + index
        }[0]`,
      )
    ),
    text(
      `property_${index}_line18`,
      `${page}.Table_Expenses[0].Line18[0].f1_${61 + index}[0]`,
    ),
    text(
      `property_${index}_line19`,
      `${page}.Table_Expenses[0].Line19[0].f1_${65 + index}[0]`,
    ),
    text(
      `property_${index}_line20`,
      `${page}.Table_Expenses[0].Line20[0].f1_${68 + index}[0]`,
    ),
    text(
      `property_${index}_line21`,
      `${page}.Table_Expenses[0].Line21[0].f1_${71 + index}[0]`,
    ),
    text(
      `property_${index}_line22`,
      `${page}.Table_Expenses[0].Line22[0].f1_${74 + index}[0]`,
    ),
  ]),
  text("other_property_description", `${page}.f1_15[0]`),
  text("line19_description", `${page}.Table_Expenses[0].Line19[0].f1_64[0]`),
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
  ...["A", "B", "C", "D"].flatMap((row, index) => [
    text(
      `k1_${index}_name`,
      `${page2}.Table_Line28a-f[0].Row${row}[0].f2_${3 + index * 3}[0]`,
    ),
    text(
      `k1_${index}_code`,
      `${page2}.Table_Line28a-f[0].Row${row}[0].f2_${4 + index * 3}[0]`,
    ),
    text(
      `k1_${index}_ein`,
      `${page2}.Table_Line28a-f[0].Row${row}[0].f2_${5 + index * 3}[0]`,
    ),
    text(
      `k1_${index}_passive_income`,
      `${page2}.Table_Line28g-k[0].Row${row}[0].f2_${16 + index * 5}[0]`,
    ),
    text(
      `k1_${index}_nonpassive_income`,
      `${page2}.Table_Line28g-k[0].Row${row}[0].f2_${19 + index * 5}[0]`,
    ),
  ]),
  text("k1_total_passive_income", `${page2}.f2_36[0]`),
  text("k1_total_nonpassive_income", `${page2}.f2_39[0]`),
  text("k1_line30", `${page2}.f2_45[0]`),
  text("k1_line32", `${page2}.f2_47[0]`),
  ...["A", "B"].flatMap((row, index) => [
    text(
      `trust_${index}_name`,
      `${page2}.Table_Line33a-b[0].Row${row}[0].f2_${48 + index * 2}[0]`,
    ),
    text(
      `trust_${index}_ein`,
      `${page2}.Table_Line33a-b[0].Row${row}[0].f2_${49 + index * 2}[0]`,
    ),
    text(
      `trust_${index}_passive_income`,
      `${page2}.Table_Line33c-f[0].Row${row}[0].f2_${53 + index * 4}[0]`,
    ),
    text(
      `trust_${index}_other_income`,
      `${page2}.Table_Line33c-f[0].Row${row}[0].f2_${55 + index * 4}[0]`,
    ),
  ]),
  text("trust_total_passive_income", `${page2}.f2_61[0]`),
  text("trust_total_other_income", `${page2}.f2_63[0]`),
  text("trust_line35", `${page2}.f2_68[0]`),
  text("trust_line37", `${page2}.f2_70[0]`),
  text("trust_line41", `${page2}.f2_78[0]`),
  text("farm_line40", `${page2}.f2_77[0]`),
  text("farm_line42", `${page2}.Line42_ReadOrder[0].f2_79[0]`),
];

export const scheduleEPdf: PdfFormDescriptor = {
  pendingKey: "schedule_e",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040se--2025.pdf",
  pageIndices: (projected) => {
    const partI = projected.line26 !== undefined;
    const partII = projected.trust_line37 !== undefined ||
      projected.k1_line32 !== undefined ||
      projected.farm_line40 !== undefined;
    return partI && partII ? [0, 1] : partII ? [1] : [0];
  },
  fields,
  filerFields: [
    text("nameShownOnForm1040", `${page}.f1_1[0]`),
    text("primarySSN", `${page}.f1_2[0]`),
    text("nameShownOnForm1040", `${page2}.f2_1[0]`),
    text("primarySSN", `${page2}.f2_2[0]`),
  ],
  projectFields(raw, allPending) {
    const k1Rows = scheduleEK1Part2Rows(allPending);
    if (Object.keys(raw).length === 0 && k1Rows.length === 0) return {};
    const input = inputSchema.parse(raw);
    const trustRows = input.estate_trust_rows ?? [];
    let partIIFields: Record<string, unknown> | undefined;
    let k1Total = 0;
    const farmItems = allPending.f4835 === undefined
      ? []
      : form4835InputSchema.parse(allPending.f4835).f4835s;
    const farmPreliminaries = farmItems.map((item) =>
      calculateForm4835AtRiskNet(item).atRiskNet
    );
    const farmAllowed = farmAllowedLosses({ pending: allPending });
    const farmNet = input.farm_rental_net === undefined
      ? 0
      : input.farm_rental_net +
        farmPreliminaries.reduce((sum, net) => sum + Math.max(0, -net), 0) -
        farmAllowed.reduce((sum, amount) => sum + amount, 0);
    const farmFields = input.farm_rental_net === undefined ? {} : {
      farm_line40: farmNet,
      farm_line42: input.farm_rental_gross,
    };
    const trustTotal = trustRows.reduce(
      (sum, row) =>
        sum + (row.passive_income ?? 0) +
        (row.other_income ?? 0),
      0,
    );
    if (k1Rows.length > 0) {
      if (
        k1Rows.length > 4 ||
        input.rental_income !== undefined ||
        input.royalty_income !== undefined ||
        trustRows.length > 2 ||
        !scheduleE.build(input, { pending: allPending })
      ) {
        throw new Error(
          "Schedule E PDF Part II needs up to four sourced K-1 rows on a supported page 2",
        );
      }
      const passive = k1Rows.reduce((sum, row) => sum + row.passiveIncome, 0);
      const nonpassive = k1Rows.reduce(
        (sum, row) => sum + row.nonpassiveIncome,
        0,
      );
      k1Total = passive + nonpassive;
      const trustPassive = trustRows.reduce(
        (sum, row) => sum + (row.passive_income ?? 0),
        0,
      );
      const trustOther = trustRows.reduce(
        (sum, row) => sum + (row.other_income ?? 0),
        0,
      );
      partIIFields = {
        ...Object.fromEntries(k1Rows.flatMap((row, index) => [
          [`k1_${index}_name`, row.name],
          [`k1_${index}_code`, row.code],
          [`k1_${index}_ein`, row.ein],
          [`k1_${index}_passive_income`, row.passiveIncome || undefined],
          [`k1_${index}_nonpassive_income`, row.nonpassiveIncome || undefined],
        ])),
        ...Object.fromEntries(trustRows.flatMap((row, index) => [
          [`trust_${index}_name`, row.estate_trust_name],
          [`trust_${index}_ein`, row.estate_trust_ein],
          [`trust_${index}_passive_income`, row.passive_income],
          [`trust_${index}_other_income`, row.other_income],
        ])),
        k1_total_passive_income: passive || undefined,
        k1_total_nonpassive_income: nonpassive || undefined,
        k1_line30: k1Total,
        k1_line32: k1Total,
        trust_total_passive_income: trustPassive || undefined,
        trust_total_other_income: trustOther || undefined,
        trust_line35: trustRows.length > 0
          ? trustPassive + trustOther
          : undefined,
        trust_line37: trustRows.length > 0
          ? trustPassive + trustOther
          : undefined,
        ...farmFields,
        trust_line41: k1Total + trustPassive + trustOther + farmNet,
      };
      if (input.schedule_es.length === 0) return partIIFields!;
    }
    if (trustRows.length > 0 && k1Rows.length === 0) {
      if (
        input.rental_income !== undefined ||
        input.royalty_income !== undefined ||
        trustRows.length > 2 ||
        !scheduleE.build(input, { pending: allPending })
      ) {
        throw new Error(
          "Schedule E PDF trust rows need a sourced Part III return",
        );
      }
      const passive = trustRows.reduce(
        (sum, row) => sum + (row.passive_income ?? 0),
        0,
      );
      const other = trustRows.reduce(
        (sum, row) => sum + (row.other_income ?? 0),
        0,
      );
      const total = passive + other;
      partIIFields = {
        ...Object.fromEntries(trustRows.flatMap((row, index) => [
          [`trust_${index}_name`, row.estate_trust_name],
          [`trust_${index}_ein`, row.estate_trust_ein],
          [`trust_${index}_passive_income`, row.passive_income],
          [`trust_${index}_other_income`, row.other_income],
        ])),
        trust_total_passive_income: passive > 0 ? passive : undefined,
        trust_total_other_income: other > 0 ? other : undefined,
        trust_line35: total,
        trust_line37: total,
        ...farmFields,
        trust_line41: total + farmNet,
      };
      if (input.schedule_es.length === 0) return partIIFields!;
    }
    if (input.schedule_es.length === 0 && input.farm_rental_net !== undefined) {
      if (!scheduleE.build(input, { pending: allPending })) {
        throw new Error(
          "Schedule E PDF farm rental needs a native Form 4835 join",
        );
      }
      return {
        ...farmFields,
        trust_line41: farmNet,
      };
    }
    const items = input.schedule_es;
    if (
      items.length === 0 ||
      input.mortgage_interest !== undefined ||
      input.expense_auto_travel !== undefined ||
      input.expense_depletion !== undefined ||
      (items.length > 1 && items.some((item) => item.f1099m_royalty_source)) ||
      (input.royalty_income !== undefined &&
        (items.length !== 1 || !items[0].f1099m_royalty_source ||
          input.royalty_income !==
            items[0].f1099m_royalty_source.box2_gross_royalties)) ||
      items.some((item) =>
        (item.property_type === 6 && !item.k1_royalty_source &&
          !item.f1099m_royalty_source) ||
        item.personal_use_days !== 0 ||
        item.main_home_or_second_home === true ||
        ((item.royalties_income ?? 0) > 0 && !item.k1_royalty_source &&
          !item.f1099m_royalty_source) ||
        (item.ownership_percent ?? 100) <= 0 ||
        (item.expense_depreciation_amt ?? 0) > 0 ||
        (item.section_1231_gain_loss ?? 0) !== 0
      )
    ) {
      throw new Error(
        "Schedule E PDF needs supported Part I rental or sourced royalty properties",
      );
    }
    const needsLine19Statement =
      items.some((item) => (item.expense_other_lines?.length ?? 0) > 1) ||
      Array.from(
        { length: Math.ceil(items.length / 3) },
        (_, pageIndex) =>
          new Set(
            items.slice(pageIndex * 3, pageIndex * 3 + 3).flatMap((item) =>
              (item.expense_other_lines ?? []).map((line) => line.description)
            ),
          ).size > 1,
      ).some(Boolean);
    const allowedByActivity = validatePassiveActivityLink(items, {
      pending: allPending,
    });
    // Native Schedule E checks every source row, limitation, and finalized total.
    if (items[0].f1099m_royalty_source) {
      verifyMiscRoyaltySource(items[0], allPending.f1099m);
    } else if (!scheduleE.build(input, { pending: allPending })) {
      throw new Error("Schedule E PDF needs native Part I properties");
    }
    const rows = items.map((item, index) => {
      const entireLoss = qualifiedEntireDispositionLoss(item);
      const entireGain = qualifiedEntireDispositionGain(item);
      if (
        (item.disposed_of === true ||
          (item.passive_property_sales?.length ?? 0) > 0) &&
        entireLoss === undefined && entireGain === undefined &&
        !qualifiedFirstYearRetainedPropertySale(item)
      ) {
        throw new Error(
          "Schedule E PDF disposition needs the sourced entire-interest overall-loss route",
        );
      }
      const fraction = (item.ownership_percent ?? 100) / 100;
      const amount = (value: number | undefined) =>
        Math.round((value ?? 0) * fraction);
      const rent = amount(item.rent_income);
      const royalty = amount(item.royalties_income);
      const mortgage = amount(item.expense_mortgage_interest);
      const depreciation = amount(
        (item.expense_depreciation ?? 0) + (item.expense_depletion ?? 0),
      );
      const otherAmount = (item.expense_other_lines ?? []).reduce(
        (sum, line) => sum + amount(line.amount),
        0,
      );
      const expenseTotal = Math.round(computeExpenses(item) * fraction);
      const net = Math.round(computePropertyNet(item));
      const allowedLoss = entireLoss ?? entireGain ??
        (item.activity_type === "A" || item.activity_type === "B"
          ? allowedByActivity.get(index) ?? 0
          : Math.max(0, -net));
      const deductibleNet = entireLoss === undefined &&
          entireGain === undefined
        ? Math.max(0, net) - allowedLoss
        : net - (item.prior_unallowed_passive_operating ?? 0);
      return {
        rent,
        royalty,
        mortgage,
        depreciation,
        expenseTotal,
        net,
        allowedLoss,
        deductibleNet,
        fields: {
          [`property_${index}_address`]: item.property_type === 6
            ? undefined
            : `${item.street_address}, ${item.city}, ${item.state} ${item.zip}`,
          [`property_${index}_type`]: item.property_type,
          [`property_${index}_fair_rental_days`]: item.property_type === 6
            ? undefined
            : item.fair_rental_days,
          [`property_${index}_personal_use_days`]: item.property_type === 6
            ? undefined
            : item.personal_use_days,
          [`property_${index}_qualified_joint_venture`]:
            item.qualified_joint_venture,
          [`property_${index}_line3`]: rent,
          [`property_${index}_line4`]: royalty,
          ...Object.fromEntries(
            expenseLines.map(([key]) => [
              `property_${index}_${key}`,
              amount(item[key]),
            ]),
          ),
          [`property_${index}_line18`]: depreciation,
          [`property_${index}_line19`]: otherAmount,
          [`property_${index}_line20`]: expenseTotal,
          [`property_${index}_line21`]: net,
          [`property_${index}_line22`]: allowedLoss > 0
            ? allowedLoss
            : undefined,
        },
      };
    });
    const sumRows = (key: keyof typeof rows[number]) =>
      rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
    const propertyTotal = sumRows("deductibleNet");
    const schedule1Line5 = allPending.schedule1?.line5_schedule_e;
    const filedLine5 = Array.isArray(schedule1Line5)
      ? schedule1Line5.reduce((sum, value) => sum + value, 0)
      : schedule1Line5;
    if (filedLine5 !== propertyTotal + k1Total + trustTotal + farmNet) {
      throw new Error(
        "Schedule E PDF line 26 must match finalized Schedule 1 line 5",
      );
    }
    const payments = items.some((item) => item.form_1099_payments_made);
    const forms1099Filed = payments
      ? items.every((item) =>
        !item.form_1099_payments_made || item.form_1099_filed
      )
      : undefined;
    const pageFields = (start: number) =>
      Object.fromEntries(
        rows.slice(start, start + 3).flatMap((row, localIndex) =>
          Object.entries(row.fields).map(([key, value]) => [
            key.replace(/^property_\d+_/, `property_${localIndex}_`),
            value,
          ])
        ),
      );
    const pageDescriptions = (start: number) => {
      const pageItems = items.slice(start, start + 3);
      const other = new Set(
        pageItems.flatMap((item) =>
          (item.expense_other_lines ?? []).map((line) => line.description)
        ),
      );
      const type8 = new Set(
        pageItems.filter((item) => item.property_type === 8).map((item) =>
          item.property_type_other_desc
        ),
      );
      return {
        other_property_description: type8.size > 1 ||
            ([...type8][0]?.length ?? 0) > 20
          ? "See attached"
          : [...type8][0],
        line19_description: other.size > 1 ? "See attached" : [...other][0],
      };
    };
    const statementRows = items.flatMap((item, index) => {
      const identity = {
        copy: Math.floor(index / 3) + 1,
        column: ["A", "B", "C"][index % 3],
        property: item.property_description,
        address: item.property_type === 6
          ? undefined
          : `${item.street_address}, ${item.city}, ${item.state} ${item.zip}`,
      };
      return [
        ...(item.property_type === 8
          ? [{
            ...identity,
            line: "Type 8",
            description: item.property_type_other_desc!,
          }]
          : []),
        ...(needsLine19Statement
          ? (item.expense_other_lines ?? []).map((line) => ({
            ...identity,
            line: "19",
            description: line.description,
            amount: Math.round(
              line.amount * (item.ownership_percent ?? 100) / 100,
            ),
          }))
          : []),
      ];
    });
    const continuationPages = Array.from(
      { length: Math.ceil(Math.max(0, rows.length - 3) / 3) },
      (_, index) => ({
        ...pageFields(3 + index * 3),
        ...pageDescriptions(3 + index * 3),
        payments_made: payments,
        forms_1099_filed: forms1099Filed,
      }),
    );
    return {
      ...partIIFields,
      ...farmFields,
      ...pageFields(0),
      partIContinuationPages: continuationPages,
      partIStatementRows: statementRows,
      payments_made: payments,
      forms_1099_filed: forms1099Filed,
      ...pageDescriptions(0),
      line23a: sumRows("rent"),
      line23b: sumRows("royalty"),
      line23c: sumRows("mortgage"),
      line23d: sumRows("depreciation"),
      line23e: sumRows("expenseTotal"),
      line24: rows.reduce((sum, row) => sum + Math.max(0, row.net), 0),
      line25: sumRows("allowedLoss") || undefined,
      line26: propertyTotal,
      trust_line41: partIIFields === undefined
        ? input.farm_rental_net === undefined
          ? undefined
          : propertyTotal + farmNet
        : propertyTotal + k1Total + trustTotal + farmNet,
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
    const continuations = fields.partIContinuationPages;
    if (!Array.isArray(continuations)) return [fields];
    const { partIContinuationPages: _continuations, ...primary } = fields;
    return [primary, ...continuations as Record<string, unknown>[]];
  },
  async appendSupplementalPages(document, fields, filer) {
    await appendScheduleEPartIStatement(
      document,
      fields.partIStatementRows,
      filer,
    );
  },
};
