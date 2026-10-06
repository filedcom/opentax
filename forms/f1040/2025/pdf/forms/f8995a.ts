import { qbiPercentageForPdf } from "../qbi-percentage.ts";
import { assertSstbScheduleCSource } from "../../mef/forms/f8995a-sstb-source.ts";
import { assertForm8995APatronReturn } from "../../form8995a_patron_reconciliation.ts";
import type { PdfFieldEntry, PdfFormDescriptor } from "../form-descriptor.ts";
import type { FilerIdentity } from "../../../mef/header.ts";
import {
  assertMfsSstbOwner,
  assertPatron1099PATRSource,
  calculateOneSstb8995ALines,
  calculateOwnedWotcBusinesses,
  calculateScheduleCLossLines,
  inputSchema,
} from "../../../nodes/intermediate/forms/form8995a/index.ts";
import {
  assertNoFiledForm8995,
  assertOneBusinessReitSource,
  assertScheduleCLossSources,
  validateOneBusiness,
} from "../../mef/forms/f8995a.ts";
import { assertScheduleBAggregationJoin } from "../../mef/forms/f8995a_schedule_b.ts";
import { assertZeroReductionScheduleAReturn } from "../../mef/forms/f8995a_schedule_a.ts";
import { assertForm8995AWotcReturn } from "../../form8995a_wotc_reconciliation.ts";
import { FilingStatus as HeaderFilingStatus } from "../../../mef/header.ts";
import { FilingStatus as NodeFilingStatus } from "../../../nodes/types.ts";

// Official TY2025 Form 8995-A: one identified business occupies column A.
const page1 = "topmostSubform[0].Page1[0].";
const page2 = "topmostSubform[0].Page2[0].";
const partI = `${page1}Table_PartI[0].RowA[0].`;
const partIB = `${page1}Table_PartI[0].RowB[0].`;
const columnA = (line: number, fieldNumber: number): string =>
  `${page1}Table_PartII[0].Row${line}[0].f1_${
    String(fieldNumber).padStart(2, "0")
  }[0]`;

const fields: ReadonlyArray<PdfFieldEntry> = [
  { kind: "text", domainKey: "business_name", pdfField: `${partI}f1_03[0]` },
  {
    kind: "checkbox",
    domainKey: "specified_service",
    pdfField: `${partI}c1_1[0]`,
  },
  { kind: "checkbox", domainKey: "aggregated", pdfField: `${partI}c1_2[0]` },
  { kind: "text", domainKey: "business_ein", pdfField: `${partI}f1_04[0]` },
  { kind: "text", domainKey: "business_name_b", pdfField: `${partIB}f1_05[0]` },
  { kind: "text", domainKey: "business_ein_b", pdfField: `${partIB}f1_06[0]` },
  { kind: "checkbox", domainKey: "patron", pdfField: `${partI}c1_3[0]` },
  ...([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const).map(
    (line): PdfFieldEntry => ({
      kind: "text",
      domainKey: `line${line}`,
      pdfField: columnA(line, 9 + (line - 2) * 3),
    }),
  ),
  ...([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const).map(
    (line): PdfFieldEntry => ({
      kind: "text",
      domainKey: `line${line}_b`,
      pdfField: columnA(line, 10 + (line - 2) * 3),
    }),
  ),
  { kind: "text", domainKey: "line16", pdfField: columnA(16, 51) },
  ...([17, 18, 19, 25, 26] as const).map((line): PdfFieldEntry => ({
    kind: "text",
    domainKey: `line${line}`,
    pdfField: `${page2}Table_PartIII[0].Row${line}[0].f2_${
      String(
        ({ 17: 1, 18: 4, 19: 7, 25: 30, 26: 33 } as const)[line],
      ).padStart(2, "0")
    }[0]`,
    printZero: line === 19 || line === 25,
  })),
  ...([17, 18, 19, 25, 26] as const).map((line): PdfFieldEntry => ({
    kind: "text",
    domainKey: `line${line}_b`,
    pdfField: `${page2}Table_PartIII[0].Row${line}[0].f2_${
      String(({ 17: 2, 18: 5, 19: 8, 25: 31, 26: 34 } as const)[line]).padStart(
        2,
        "0",
      )
    }[0]`,
    printZero: line === 19 || line === 25,
  })),
  ...([20, 21, 22, 23, 24] as const).map((line): PdfFieldEntry => ({
    kind: "text",
    domainKey: `line${line}`,
    pdfField: `${page2}Table_PartIII[0].Row${line}[0].Ln${line}[0].f2_${
      String(
        ({ 20: 10, 21: 14, 22: 18, 23: 22, 24: 26 } as const)[line],
      ).padStart(2, "0")
    }[0]`,
  })),
  ...([27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40] as const).map(
    (line): PdfFieldEntry => ({
      kind: "text",
      domainKey: `line${line}`,
      pdfField: `${page2}f2_${String(line + 9).padStart(2, "0")}[0]`,
      printZero: line === 40,
    }),
  ),
];

// Parent PDF projection for the bounded aggregation route.
export function projectStagedAggregatedParentPdf(
  raw: unknown,
  filer: FilerIdentity,
  allPending: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  const input = inputSchema.strict().parse(raw);
  const { source, parent } = assertScheduleBAggregationJoin(input, {
    filer,
    pending: allPending,
  });
  return {
    business_name: source.group_name,
    aggregated: true,
    ...parent,
    line27: parent.line16,
    line40: 0,
  };
}

export function projectOneBusiness8995A(
  raw: Record<string, unknown>,
  allPending: Record<string, Record<string, unknown>>,
): Record<string, unknown> {
  if (Object.keys(raw).length === 0) return {};
  const input = inputSchema.strict().parse(raw);
  assertForm8995AWotcReturn(input, allPending);
  assertForm8995APatronReturn(input, allPending);
  if (
    input.aggregation_filing_details ||
    (input.aggregation_groups ?? []).length > 0
  ) {
    return input;
  }
  const retained = inputSchema.strict().safeParse(allPending.form8995a);
  if (
    !retained.success || JSON.stringify(retained.data) !== JSON.stringify(input)
  ) {
    throw new Error("Form 8995-A PDF needs matching parent pending source");
  }
  if (input.wotc_business_sources) {
    assertNoFiledForm8995(allPending);
    const { rows, parent } = calculateOwnedWotcBusinesses(input);
    if (allPending.f1040?.line13_qbi_deduction !== parent.line39) {
      throw new Error(
        "Form8995A owned WOTC PDF differs from actual1040 deduction",
      );
    }
    const a = rows[0], b = rows[1];
    return {
      ...parent,
      ...a.lines,
      business_name: a.source.business.business_name,
      business_ein: a.source.business.ein,
      business_name_b: b.source.business.business_name,
      business_ein_b: b.source.business.ein,
      ...Object.fromEntries(
        [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 19, 25, 26].map(
          (line) => [`line${line}_b`, (b.lines as any)[`line${line}`]],
        ),
      ),
      ...Object.fromEntries(
        [16, 32, 37, 39].map(
          (line) => [`line${line}`, (parent as any)[`line${line}`]],
        ),
      ),
      line19: a.lines.phaseInRequired ? a.lines.line19 : undefined,
      line25: a.lines.phaseInRequired ? a.lines.line25 : undefined,
      line26: a.lines.phaseInRequired ? a.lines.line26 : undefined,
      line19_b: b.lines.phaseInRequired ? b.lines.line19 : undefined,
      line25_b: b.lines.phaseInRequired ? b.lines.line25 : undefined,
      line26_b: b.lines.phaseInRequired ? b.lines.line26 : undefined,
      line17: a.lines.phaseInRequired ? a.lines.line3 : undefined,
      line18: a.lines.phaseInRequired ? a.lines.line10 : undefined,
      line17_b: b.lines.phaseInRequired ? b.lines.line3 : undefined,
      line18_b: b.lines.phaseInRequired ? b.lines.line10 : undefined,
      line20: parent.phaseInRequired ? parent.line33 : undefined,
      line21: parent.phaseInRequired ? parent.patronThreshold : undefined,
      line22: parent.phaseInRequired
        ? parent.line33 - parent.patronThreshold!
        : undefined,
      line23: parent.phaseInRequired ? parent.patronPhaseInRange : undefined,
      line24: parent.phaseInRequired
        ? qbiPercentageForPdf(parent.phaseIn!)
        : undefined,
      line27: parent.line16,
      line40: 0,
    };
  }
  if (input.schedule_c_qbi_businesses?.some((business) => business.qbi < 0)) {
    const companion = inputSchema.strict().safeParse(
      allPending.form8995a_schedule_c,
    );
    if (
      !companion.success ||
      JSON.stringify(companion.data) !== JSON.stringify(input) ||
      allPending.form8995a_schedule_a !== undefined ||
      allPending.form8995a_schedule_b !== undefined ||
      allPending.form8995a_schedule_d !== undefined
    ) {
      throw new Error(
        "Form 8995-A PDF Schedule C needs matching parent and no other QBI companion",
      );
    }
    assertNoFiledForm8995(allPending);
    assertScheduleCLossSources(input, allPending);
    const lines = calculateScheduleCLossLines(input);
    if (allPending.f1040?.line13_qbi_deduction !== lines.parent.line39) {
      throw new Error(
        "Form 8995-A PDF Schedule C line 39 differs from Form 1040 line 13",
      );
    }
    return {
      business_name: (lines.positive ?? lines.negative).business_name,
      business_ein: (lines.positive ?? lines.negative).ein,
      ...(lines.positive
        ? {
          business_name_b: lines.negative.business_name,
          business_ein_b: lines.negative.ein,
        }
        : {}),
      ...lines.parent,
      ...Object.fromEntries(
        [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
          .map((line) => [`line${line}_b`, 0]),
      ),
      line27: lines.parent.line16,
      // This validated Schedule C route excludes REIT/PTP income and losses.
      line40: 0,
    };
  }
  if (
    input.sstb_filing_details || (input.sstb_qbi ?? 0) !== 0 ||
    (input.sstb_w2_wages ?? 0) !== 0 ||
    (input.sstb_unadjusted_basis ?? 0) !== 0
  ) {
    const companion = inputSchema.strict().safeParse(
      allPending.form8995a_schedule_a,
    );
    if (
      !companion.success ||
      JSON.stringify(companion.data) !== JSON.stringify(input)
    ) {
      throw new Error(
        "Form 8995-A PDF needs matching Schedule A companion source",
      );
    }
    if (allPending.form8995a_schedule_d !== undefined) {
      throw new Error(
        "Form 8995-A PDF Schedule A cannot accompany Schedule D",
      );
    }
    assertNoFiledForm8995(allPending);
    assertSstbScheduleCSource(input, allPending);
    const lines = calculateOneSstb8995ALines(input);
    assertZeroReductionScheduleAReturn(input, lines, allPending);
    if (allPending.f1040?.line13_qbi_deduction !== lines.line39) {
      throw new Error(
        "Form 8995-A PDF Schedule A line 39 differs from Form 1040 line 13",
      );
    }
    return {
      business_name: lines.source.business_name,
      business_ein: lines.source.ein,
      specified_service: true,
      ...lines,
      line17: lines.line3,
      line18: lines.line10,
      line20: lines.line33,
      line21: lines.threshold,
      line22: lines.line33 - lines.threshold,
      line23: lines.phaseInRange,
      line24: qbiPercentageForPdf(lines.phaseIn),
      line27: lines.line16,
      line40: 0,
    };
  }
  const { details, lines } = validateOneBusiness(input);
  assertOneBusinessReitSource(input, allPending);
  if (allPending.form8995a_schedule_a !== undefined) {
    throw new Error("Form 8995-A PDF has Schedule A without an SSTB parent");
  }
  assertNoFiledForm8995(allPending);
  if (input.patron_of_specified_cooperative === true) {
    assertPatron1099PATRSource(input, allPending.f1099patr);
    const companion = inputSchema.strict().safeParse(
      allPending.form8995a_schedule_d,
    );
    if (
      !companion.success ||
      JSON.stringify(companion.data) !== JSON.stringify(input)
    ) {
      throw new Error(
        "Form 8995-A PDF needs a matching Schedule D companion source",
      );
    }
  } else if (allPending.form8995a_schedule_d !== undefined) {
    throw new Error("Form 8995-A PDF has Schedule D without a patron parent");
  }
  if (allPending.f1040?.line13_qbi_deduction !== lines.line39) {
    throw new Error("Form 8995-A PDF line 39 differs from Form 1040 line 13");
  }
  return {
    business_name: details.business_name,
    business_ein: details.ein,
    patron: input.patron_of_specified_cooperative === true,
    ...lines,
    ...(lines.phaseInRequired
      ? {
        line17: lines.line3,
        line18: lines.line10,
        line20: lines.line33,
        line21: lines.patronThreshold,
        line22: lines.line33 - lines.patronThreshold!,
        line23: lines.patronPhaseInRange,
        line24: qbiPercentageForPdf(lines.phaseIn!),
      }
      : Object.fromEntries([17, 18, 19, 20, 21, 22, 23, 24, 25, 26].map(
        (line) => [`line${line}`, undefined],
      ))),
    ...(input.patron_business_source &&
        input.taxable_income <= lines.patronThreshold!
      ? Object.fromEntries(
        [4, 5, 6, 7, 8, 9, 10, 11].map((line) => [`line${line}`, undefined]),
      )
      : {}),
    line27: lines.line16,
    line28: lines.line28,
    line29: lines.line29,
    line30: lines.line30,
    line31: lines.line31,
    line40: 0,
  };
}

export const form8995aPdf: PdfFormDescriptor = {
  pendingKey: "form8995a",
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8995a--2025.pdf",
  filerFields: [
    { kind: "text", domainKey: "nameLine1", pdfField: `${page1}f1_01[0]` },
    { kind: "text", domainKey: "primarySSN", pdfField: `${page1}f1_02[0]` },
  ],
  fields,
  projectFields: projectOneBusiness8995A,
  instances(raw, filer, allPending) {
    if (Object.keys(raw).length === 0) return [];
    // The builder passes projected print fields here; validate owner and
    // aggregation details against the retained source instead.
    const input = inputSchema.strict().parse(allPending?.form8995a ?? raw);
    assertSstbScheduleCSource(input, allPending, filer?.primarySSN, filer);
    if (
      (input.patron_filing_details?.source_1099patr
          .box6_section199ag_deduction ?? 0) > 0 &&
      input.patron_filing_details?.source_1099patr.recipient_tin !==
        filer?.primarySSN.replaceAll("-", "")
    ) {
      throw new Error(
        "Form 8995-A PDF cooperative box 6 recipient differs from the final filer",
      );
    }
    if (input.filing_status === NodeFilingStatus.MFS) {
      if (
        !filer ||
        filer.filingStatus !== HeaderFilingStatus.MarriedFilingSeparately
      ) {
        throw new Error(
          "Form 8995-A PDF MFS status differs from the final filer",
        );
      }
      assertMfsSstbOwner(input, filer.primarySSN);
    }
    if (
      input.filing_status === NodeFilingStatus.QSS &&
      filer?.filingStatus !== HeaderFilingStatus.QualifyingSurvivingSpouse
    ) {
      throw new Error(
        "Form 8995-A PDF surviving-spouse status differs from the final filer",
      );
    }
    if (
      input.aggregation_filing_details ||
      (input.aggregation_groups ?? []).length > 0
    ) {
      if (!filer || !allPending) {
        throw new Error(
          "Form 8995-A aggregation PDF needs filer and pending sources",
        );
      }
      return [projectStagedAggregatedParentPdf(input, filer, allPending)];
    }
    return [raw];
  },
};
