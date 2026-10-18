import { StandardFonts } from "pdf-lib";
import { assertOwnedScheduleSE } from "../../../../domains/taxes/self-employment/schedule-se/schedule-se-owner-source.ts";
import { calculateIndependentPatronBusinesses } from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import { patronProprietorSsn } from "../../../../domains/deductions/business/form8995a/form8995a_patron_reconciliation.ts";
import { assertProducingMiningZeroQbiReturn } from "../../../../domains/deductions/business/form8995a/form8995a_producing_mining_source.ts";
import { assertFarmWotcReturn } from "../../../../domains/deductions/business/form8995/form8995_farm_wotc_reconciliation.ts";
import { assertMixedFishingQbiReturn } from "../../../../domains/deductions/business/form8995a/form8995a_mixed_fishing_source.ts";
import { calculateFarmWotcLines } from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/farm-wotc.ts";
import { qbiPercentageForPdf } from "../../../reviews/general/composed-returns/qbi-percentage.ts";
import { assertSstbScheduleCSource } from "../../../../mef/forms/deductions/business/f8995a/f8995a-sstb-source.ts";
import { assertForm8995APatronReturn } from "../../../../domains/deductions/business/form8995a/form8995a_patron_reconciliation.ts";
import type {
  PdfFieldEntry,
  PdfFormDescriptor,
} from "../../../review-support/form-descriptor.ts";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import {
  assertMfsSstbOwner,
  assertPatron1099PATRSource,
  calculateLossBusinessPhase,
  calculateOneSstb8995ALines,
  calculateOwnedWotcBusinesses,
  calculateScheduleCLossLines,
  type Form8995AInput,
  inputSchema,
} from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/index.ts";
import {
  assertNoFiledForm8995,
  assertOneBusinessReitSource,
  assertScheduleCLossFiler,
  assertScheduleCLossSources,
  validateOneBusiness,
} from "../../../../mef/forms/deductions/business/f8995a/f8995a.ts";
import { assertScheduleBAggregationJoin } from "../../../../mef/forms/deductions/business/f8995a/f8995a_schedule_b.ts";
import { assertZeroReductionScheduleAReturn } from "../../../../mef/forms/deductions/business/f8995a/f8995a_schedule_a.ts";
import { assertForm8995AWotcReturn } from "../../../../domains/deductions/business/form8995a/form8995a_wotc_reconciliation.ts";
import { FilingStatus as HeaderFilingStatus } from "../../../../../mef/header.ts";
import { FilingStatus as NodeFilingStatus } from "../../../../../nodes/types.ts";
import { mefTaxYear } from "../../../../mef/support/year-config.ts";

// Official TY2025 Form 8995-A: one identified business occupies column A.
const page1 = "topmostSubform[0].Page1[0].";
const page2 = "topmostSubform[0].Page2[0].";
const partI = `${page1}Table_PartI[0].RowA[0].`;
const partIB = `${page1}Table_PartI[0].RowB[0].`;
const partIC = `${page1}Table_PartI[0].RowC[0].`;
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
  { kind: "text", domainKey: "business_name_c", pdfField: `${partIC}f1_07[0]` },
  { kind: "text", domainKey: "business_ein_c", pdfField: `${partIC}f1_08[0]` },
  { kind: "checkbox", domainKey: "patron", pdfField: `${partI}c1_3[0]` },
  { kind: "checkbox", domainKey: "patron_b", pdfField: `${partIB}c1_6[0]` },
  { kind: "checkbox", domainKey: "patron_c", pdfField: `${partIC}c1_9[0]` },
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
  ...([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const).map((
    line,
  ): PdfFieldEntry => ({
    kind: "text",
    domainKey: `line${line}_c`,
    pdfField: columnA(line, 11 + (line - 2) * 3),
  })),
  ...([17, 18, 19, 25, 26] as const).map((line): PdfFieldEntry => ({
    kind: "text",
    domainKey: `line${line}_c`,
    pdfField: `${page2}Table_PartIII[0].Row${line}[0].f2_${
      String(({ 17: 3, 18: 6, 19: 9, 25: 32, 26: 35 } as const)[line]).padStart(
        2,
        "0",
      )
    }[0]`,
    printZero: line === 19 || line === 25,
  })),
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
  assertProducingMiningZeroQbiReturn(input, allPending, mefTaxYear());
  const { source, parent } = assertScheduleBAggregationJoin(input, {
    filer,
    pending: allPending,
  });
  return {
    business_name: source.group_name,
    aggregated: true,
    ...parent,
    ...(parent.phaseInRequired
      ? {
        line17: parent.line3,
        line18: parent.line10,
        line20: parent.line33,
        line21: parent.patronThreshold,
        line22: parent.line33 - parent.patronThreshold!,
        line23: parent.patronPhaseInRange,
        line24: qbiPercentageForPdf(parent.phaseIn!),
      }
      : Object.fromEntries([17, 18, 19, 20, 21, 22, 23, 24, 25, 26].map(
        (line) => [`line${line}`, undefined],
      ))),
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
  assertFarmWotcReturn(input as unknown as Record<string, unknown>, allPending, mefTaxYear());
  if (!input.farm_wotc_filing_source) {
    assertForm8995AWotcReturn(input, allPending, mefTaxYear());
  }
  assertForm8995APatronReturn(input, allPending, mefTaxYear());
  if (
    input.aggregation_filing_details || input.rpe_aggregation_source ||
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
  if (
    input.independent_patron_sources || input.wotc_business_sources ||
    input.farm_wotc_filing_source ||
    input.mixed_fishing_qbi_source
  ) {
    assertNoFiledForm8995(allPending);
    const mixed = assertMixedFishingQbiReturn(input, allPending, mefTaxYear());
    const oldMulti = input.independent_patron_sources
      ? calculateIndependentPatronBusinesses(input, mefTaxYear())
      : input.farm_wotc_filing_source
      ? calculateFarmWotcLines(input, mefTaxYear())
      : mixed
      ? undefined
      : calculateOwnedWotcBusinesses(input, mefTaxYear());
    const parent = mixed?.parent ?? oldMulti!.parent;
    const rows = mixed
      ? mixed.rows.map((row) => ({ details: row.details, lines: row.lines }))
      : oldMulti!.rows.map((row) => ({
        details: row.input.business_filing_details!,
        lines: row.lines,
      }));
    if (allPending.f1040?.line13_qbi_deduction !== parent.line39) {
      throw new Error("Owned WOTC PDF differs from actual1040 deduction");
    }
    const projection: Record<string, unknown> = { ...parent, ...rows[0].lines };
    rows.forEach((row, index) => {
      const suffix = ["", "_b", "_c"][index],
        details = row.details;
      projection[`business_name${suffix}`] = details.business_name;
      projection[`business_ein${suffix}`] = details.ein;
      projection[`patron${suffix}`] =
        input.independent_patron_sources !== undefined;
      for (const line of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) {
        projection[`line${line}${suffix}`] = input.independent_patron_sources &&
            input.taxable_income <= row.lines.patronThreshold! && line >= 4 &&
            line <= 11
          ? undefined
          : (row.lines as Record<string, unknown>)[`line${line}`];
      }
      for (const line of [19, 25, 26]) {
        projection[`line${line}${suffix}`] = row.lines.phaseInRequired
          ? (row.lines as Record<string, unknown>)[`line${line}`]
          : undefined;
      }
      projection[`line17${suffix}`] = row.lines.phaseInRequired
        ? row.lines.line3
        : undefined;
      projection[`line18${suffix}`] = row.lines.phaseInRequired
        ? row.lines.line10
        : undefined;
    });
    for (const line of [16, 32, 37, 39]) {
      projection[`line${line}`] =
        (parent as Record<string, unknown>)[`line${line}`];
    }
    return {
      ...projection,
      patron: input.patron_of_specified_cooperative === true,
      line38: parent.line38,
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
    assertScheduleCLossSources(input, allPending, mefTaxYear());
    const lines = calculateScheduleCLossLines(input, mefTaxYear());
    if (allPending.f1040?.line13_qbi_deduction !== lines.parent.line39) {
      throw new Error(
        "Form 8995-A PDF Schedule C line 39 differs from Form 1040 line 13",
      );
    }
    return projectLossParentCopies(input)[0];
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
    assertSstbScheduleCSource(input, allPending, mefTaxYear());
    const lines = calculateOneSstb8995ALines(input, mefTaxYear());
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
  const { details, lines } = validateOneBusiness(input, mefTaxYear());
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

function projectLossParentCopies(
  input: Form8995AInput,
): Record<string, unknown>[] {
  const lines = calculateScheduleCLossLines(input, mefTaxYear());
  const first =
    lines.businessLines.find((row) => row.business === lines.positive) ??
      lines.businessLines[0];
  const rows = [first, ...lines.businessLines.filter((row) => row !== first)];
  const copies: Record<string, unknown>[] = [];
  for (let start = 0; start < rows.length; start += 3) {
    const chunk = rows.slice(start, start + 3);
    const phases = chunk.map(({ parent }) =>
      calculateLossBusinessPhase(
        input.taxable_income,
        parent.line3,
        parent.line10,
        input.filing_status,
        mefTaxYear(),
      )
    );
    const phaseIn = phases.find((phase) => phase !== undefined);
    const hasPhaseIn = phaseIn !== undefined;
    copies.push({
      ...(phaseIn
        ? {
          line20: Math.round(input.taxable_income),
          line21: phaseIn.threshold,
          line22: phaseIn.excess,
          line23: phaseIn.range,
          line24: qbiPercentageForPdf(phaseIn.ratio),
        }
        : {}),
      ...(start === 0
        ? { ...lines.parent, line27: lines.parent.line16, line40: 0 }
        : {}),
      ...Object.fromEntries(
        chunk.flatMap(({ business, parent }, index) => {
          const phase = phases[index];
          const phaseFields = phase
            ? {
              line12: phase.line12,
              line17: phase.line17,
              line18: phase.line18,
              line19: phase.line19,
              line25: phase.line25,
              line26: phase.line26,
            }
            : {};
          const suffix = ["", "_b", "_c"][index];
          return [
            [`business_name${suffix}`, business.business_name],
            [`business_ein${suffix}`, business.ein],
            ...Object.entries({ ...parent, ...phaseFields }).map((
              [key, value],
            ) => [`${key}${suffix}`, value]),
          ];
        }),
      ),
      qbi_loss_continuation: start > 0,
      qbi_loss_phase_in: hasPhaseIn,
      qbi_loss_page_note: rows.length > 3
        ? `Form 8995-A business details ${start + 1}-${
          Math.min(start + 3, rows.length)
        } of ${rows.length}; totals on first form`
        : undefined,
    });
  }
  return copies;
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
  pageIndices: (instance) =>
    instance.qbi_loss_continuation === true &&
      instance.qbi_loss_phase_in !== true
      ? [0]
      : [0, 1],
  async decoratePages(document, pages, instance) {
    if (typeof instance.qbi_loss_page_note !== "string") return;
    const font = await document.embedFont(StandardFonts.Helvetica);
    pages[0].drawText(instance.qbi_loss_page_note, {
      x: 40,
      y: 9,
      size: 8,
      font,
    });
  },
  instances(raw, filer, allPending) {
    if (Object.keys(raw).length === 0) return [];
    // The builder passes projected print fields here; validate owner and
    // aggregation details against the retained source instead.
    const input = inputSchema.strict().parse(allPending?.form8995a ?? raw);
    assertSstbScheduleCSource(input, allPending, mefTaxYear(), filer?.primarySSN, filer);
    if (input.patron_business_source) patronProprietorSsn(input, filer);
    if (input.independent_patron_sources) {
      assertOwnedScheduleSE(allPending!, mefTaxYear(), filer);
    }
    if (
      (input.patron_filing_details?.source_1099patr
          .box6_section199ag_deduction ?? 0) > 0 &&
      input.patron_filing_details?.source_1099patr.recipient_tin !==
        patronProprietorSsn(input, filer)
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
      if (
        !input.sstb_filing_details &&
        input.schedule_c_qbi_businesses?.some((business) => business.qbi < 0)
      ) {
        calculateScheduleCLossLines(input, mefTaxYear());
      } else if (
        !input.aggregation_filing_details && !input.rpe_aggregation_source &&
        !input.patron_business_source
      ) {
        assertMfsSstbOwner(input, filer.primarySSN);
      }
      // Aggregations use their separate-income review and complete return join
      // in projectStagedAggregatedParentPdf below, rather than the SSTB owner.
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
      input.aggregation_filing_details || input.rpe_aggregation_source ||
      (input.aggregation_groups ?? []).length > 0
    ) {
      if (!filer || !allPending) {
        throw new Error(
          "Form 8995-A aggregation PDF needs filer and pending sources",
        );
      }
      return [projectStagedAggregatedParentPdf(input, filer, allPending)];
    }
    if (input.schedule_c_qbi_businesses?.some((business) => business.qbi < 0)) {
      if (!allPending) {
        throw new Error("Form 8995-A loss copies need retained return sources");
      }
      assertScheduleCLossFiler(input, allPending, filer, mefTaxYear());
      projectOneBusiness8995A(allPending.form8995a, allPending);
      return projectLossParentCopies(input);
    }
    return [raw];
  },
};
