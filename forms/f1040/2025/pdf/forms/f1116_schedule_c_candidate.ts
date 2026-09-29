import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import type { RedeterminationDisclosure } from "../../../nodes/intermediate/forms/form_1116/index.ts";
import {
  buildScheduleCProjection,
  recomputeScheduleCAffectedYear,
  type ScheduleCFiledYearEvidence,
} from "../../mef/forms/f1116_schedule_c.ts";

// The December 2025 IRS AcroForm has separate Part I and II tables. This
// candidate is deliberately absent from the PDF registry while the amended
// affected-year return and later-year attribute review remain unresolved.
const p1 = "topmostSubform[0].Page1[0]";
const p2 = "topmostSubform[0].Page2[0]";
const text = (domainKey: string, pdfField: string): PdfFieldEntry => ({
  kind: "text",
  domainKey,
  pdfField,
});
const numbered = (page: string, number: number): string =>
  `${page}.f${page === p1 ? 1 : 2}_${String(number).padStart(2, "0")}[0]`;
const row = (part: 1 | 2, index: number, column: number): string => {
  const page = part === 1 ? p1 : p2;
  const prefix = part === 1
    ? `${page}.RowB_ReadOrder[0].Table_Part1_RowA_Cols2a-5[0]`
    : `${page}.RowB_ReadOrder[0].Table_Part2_RowA_Cols2a-5[0]`;
  const base = part === 1 ? 12 : 2;
  return `${prefix}.BodyRowA${index + 1}[0].f${part}_${
    String(base + index * 5 + column).padStart(2, "0")
  }[0]`;
};
const amountRow = (part: 1 | 2, index: number, column: number): string => {
  const page = part === 1 ? p1 : p2;
  const prefix = part === 1
    ? `${page}.Table_Part1_RowA_ReadOrder[0].Table_Part1_RowA_Cols6-13[0]`
    : `${page}.Table_Part2_RowA_ReadOrder[0].Table_Part2_RowA_Cols6-13[0]`;
  const base = part === 1 ? 43 : 33;
  return `${prefix}.BodyRowA${index + 1}[0].f${part}_${
    String(base + index * (part === 1 ? 8 : 7) + column).padStart(2, "0")
  }[0]`;
};
const date = (value: string): string =>
  `${value.slice(5, 7)}/${value.slice(8, 10)}/${value.slice(0, 4)}`;

const fields: readonly PdfFieldEntry[] = [
  text("tax_year_suffix", numbered(p1, 1)),
  text("filer_name", numbered(p1, 6)),
  text("filer_ssn", numbered(p1, 7)),
  {
    kind: "checkboxWhen",
    domainKey: "category",
    pdfField: `${p1}.CheckboxC-D_ReadOrder[0].c1_01[0]`,
    whenValue: "passive",
  },
  {
    kind: "checkboxWhen",
    domainKey: "category",
    pdfField: `${p1}.CheckboxC-D_ReadOrder[0].c1_01[1]`,
    whenValue: "general",
  },
  ...([1, 2] as const).flatMap((part) => [
    text(
      `part${part}_year`,
      part === 1
        ? `${p1}.RowA_ReadOrder[0].f1_11[0]`
        : `${p2}.RowA_ReadOrder[0].f2_01[0]`,
    ),
    ...([0, 1, 2] as const).flatMap((index) => [
      ...(["2a", "2b", "3", "4", "5"] as const).map((column, offset) =>
        text(
          `part${part}_row${index + 1}_col${column}`,
          row(part, index, offset),
        )
      ),
      ...([0, 1, 2, 3, 4, 5, 6] as const).map((column) =>
        text(
          `part${part}_row${index + 1}_col${column + 6}`,
          amountRow(part, index, column),
        )
      ),
      ...(part === 1
        ? [text(`part1_row${index + 1}_col13`, amountRow(1, index, 7))]
        : [{
          kind: "checkbox" as const,
          domainKey: `part2_row${index + 1}_two_year_rule`,
          pdfField:
            `${p2}.Table_Part2_RowA_ReadOrder[0].Table_Part2_RowA_Cols6-13[0].BodyRowA${
              index + 1
            }[0].c2_${index + 1}[0]`,
        }]),
    ]),
    ...([0, 1, 2] as const).map((column) =>
      text(
        `part${part}_subtotal_col${column + 10}`,
        part === 1
          ? `${p1}.Table_Part1_RowA_ReadOrder[0].f1_${67 + column}[0]`
          : `${p2}.Table_Part2_RowA_ReadOrder[0].f2_${54 + column}[0]`,
      )
    ),
  ]),
  ...([1, 2, 3, 4, 5] as const).map((column) =>
    text(
      `part3_col${column}`,
      `${p2}.Table_Part3[0].BodyRowA[0].f2_${80 + column}[0]`,
    )
  ),
  ...([1, 2, 3, 4] as const).map((column) =>
    text(
      `part4_col${column}`,
      `${p2}.Table_Part4[0].BodyRowA[0].f2_${90 + column}[0]`,
    )
  ),
];

export function projectScheduleCPdfCandidate(
  ledger: RedeterminationDisclosure,
  evidence: ScheduleCFiledYearEvidence,
): Record<string, unknown> {
  // Share the native candidate's bounded category, payor, and filed-year checks.
  buildScheduleCProjection(ledger, evidence);
  const changed = recomputeScheduleCAffectedYear(ledger, evidence);
  const increases = ledger.payor_events.filter((payor) =>
    payor.event_kind === "additional_accrued_tax"
  );
  const decreases = ledger.payor_events.filter((payor) =>
    payor.event_kind !== "additional_accrued_tax"
  );
  const payorRows = (part: 1 | 2, payors: typeof ledger.payor_events) =>
    payors.flatMap((
      payor,
      index,
    ): ReadonlyArray<readonly [string, unknown]> => [
      [`part${part}_row${index + 1}_col2a`, payor.payor_name],
      [`part${part}_row${index + 1}_col2b`, payor.payor_identifier.value],
      [`part${part}_row${index + 1}_col3`, payor.irs_country_code],
      [`part${part}_row${index + 1}_col4`, date(payor.event_date)],
      [`part${part}_row${index + 1}_col5`, date(payor.foreign_tax_year_end)],
      [
        `part${part}_row${index + 1}_col6`,
        payor.payor_foreign_income_subject_to_tax,
      ],
      [`part${part}_row${index + 1}_col7`, payor.tax_change_local_currency],
      [
        `part${part}_row${index + 1}_col8`,
        payor.tax_change_functional_currency,
      ],
      [`part${part}_row${index + 1}_col9`, payor.original_local_units_per_usd],
      [`part${part}_row${index + 1}_col10`, payor.tax_change_usd],
      [
        `part${part}_row${index + 1}_col11`,
        payor.payor_tax_usd_on_filed_return,
      ],
      [`part${part}_row${index + 1}_col12`, payor.payor_revised_tax_usd],
      ...(part === 1 ? [] : [
        [
          `part2_row${index + 1}_two_year_rule`,
          payor.event_kind === "accrued_tax_unpaid_after_24_months",
        ] as const,
      ]),
    ]);
  const payors = Object.fromEntries(
    [...payorRows(1, increases), ...payorRows(2, decreases)],
  );
  const subtotal = (part: 1 | 2, rows: typeof ledger.payor_events) => {
    if (rows.length === 0) return {};
    const sum = (select: (payor: typeof rows[number]) => number) =>
      rows.reduce((total, payor) => total + select(payor), 0);
    return {
      [`part${part}_year`]: date(ledger.relation_back_year_end),
      [`part${part}_subtotal_col10`]: sum((payor) => payor.tax_change_usd),
      [`part${part}_subtotal_col11`]: sum((payor) =>
        payor.payor_tax_usd_on_filed_return
      ),
      [`part${part}_subtotal_col12`]: sum((payor) =>
        payor.payor_revised_tax_usd
      ),
    };
  };
  return {
    tax_year_suffix: "25",
    category: ledger.income_category,
    ...subtotal(1, increases),
    ...subtotal(2, decreases),
    ...payors,
    part3_col1: date(ledger.relation_back_year_end),
    part3_col2: ledger.redetermined_form1116.foreign_taxes_paid_or_accrued_usd,
    part3_col3: ledger.filed_form1116.foreign_taxes_paid_or_accrued_usd,
    part3_col4: changed.filedCredit,
    part3_col5: changed.revisedCredit,
    part4_col1: date(ledger.relation_back_year_end),
    part4_col2: changed.revisedLiability,
    part4_col3: changed.filedLiability,
    part4_col4: changed.revisedLiability - changed.filedLiability,
  };
}

/** Staged field map only. Do not add this descriptor to PDF_FORMS yet. */
export const form1116ScheduleCPdfCandidate: PdfFormDescriptor = {
  pendingKey: "form1116_schedule_c_candidate",
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1116sc.pdf",
  pageIndices: () => [0, 1, 2],
  instances(projected, filer) {
    if (Object.keys(projected).length === 0) return [];
    const name = filer?.fullName ?? [
      filer?.firstName,
      filer?.middleInitial,
      filer?.lastName,
    ].filter(Boolean).join(" ");
    const ssn = filer?.primarySSN.replaceAll("-", "");
    if (!name || !ssn || !/^\d{9}$/.test(ssn)) {
      throw new Error(
        "Form 1116 Schedule C PDF candidate needs filer name and SSN",
      );
    }
    return [{ ...projected, filer_name: name, filer_ssn: ssn }];
  },
  fields,
};
