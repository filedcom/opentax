import { assertEquals, assertExists, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import {
  allocateForm3800CreditUse,
  calculateForm3800Nonpassive,
  type Form3800PassiveTaxUseVintage,
  ZERO_FORM3800_PASSIVE_ACTIVITY,
} from "../../../../../../nodes/inputs/credits/business/f3800/calculation.ts";
import type { Form3800CarryoverVintage } from "../../../../../../nodes/inputs/credits/business/f3800/carryover-ledger.ts";
import { PassiveCreditSourceOrigin } from "../../../../../../nodes/intermediate/forms/credits/business/form8582cr/source.ts";
import { PassiveCreditReportingRoute } from "../../../../../../nodes/intermediate/forms/credits/business/form8582cr/credit-route.ts";
import { FilingStatus } from "../../../../../../nodes/types.ts";
import {
  buildForm3800CarryforwardRows,
  form3800CarryforwardCreditUseRows,
} from "../../../../../mef/forms/credits/business/f3800/f3800_carryforward_rows.ts";
import {
  buildIRS3800Document,
  type Form3800DocumentParts,
} from "../../../../../mef/forms/credits/business/f3800/f3800_document.ts";
import { joinForm3800DocumentParts } from "../../../../../mef/forms/credits/business/f3800/f3800_join.ts";
import { buildForm3800PassiveRowXml } from "../../../../../mef/forms/credits/business/f3800/f3800_passive_rows.ts";
import { form3800CarryforwardStatement } from "../../../../../mef/forms/credits/business/f3800/f3800_carryforward_statement.ts";
import { documentId } from "../../../../../mef/identity/document-identity.ts";
import { fillFormPdf } from "../../../../builder.ts";
import { pdfReviewFixtures } from "../../../../review-fixtures.ts";
import { form3800Pdf } from "./f3800.ts";
import { form3800PartVIFields } from "./f3800_fields.ts";
import {
  projectForm3800PartVIFields,
  projectForm3800PartVIPages,
} from "./f3800_detail_projection.ts";

// Component-only evidence: these synthetic histories are not authenticated filings.
function fixture(count: number, passiveCount = 0) {
  // A single oldest vintage absorbs the tax cap; later vintages remain unused.
  // Partial same-year allocation remains guarded by the production allocator.
  const entries = Array.from({ length: count - passiveCount }, (_, index) => {
    const year = index === 0 ? 2021 : 2022 + index % 3;
    const credit = index === 0 ? 2000 : 100 + index;
    const vintage: Form3800CarryoverVintage = {
      source_key: `source-${String(index).padStart(3, "0")}`,
      source_origin: {
        kind: PassiveCreditSourceOrigin.Partnership,
        entity_reference: `Synthetic partnership ${index}`,
        ein: String(100000000 + index),
      },
      credit_type: "New markets credit",
      form3800_credit_line: "1i",
      originating_tax_year: year,
      originating_tax_year_end_date: `${year}-12-31`,
      source_document_reference: `Synthetic K-1 ${index}`,
      originating_return_reference: `Synthetic ${year} return ${index}`,
      permitted_carryback_years: 1,
      credit_generated_as_filed: credit + 50,
      credit_allowed_origin_year: 50,
      historical_uses: [],
      prior_adjustments: [],
      balance_carried_to_2025: credit,
      original_reported_balance_carried_to_2025: credit,
    };
    return { vintage, subject_to_passive_activity_limit: false };
  });
  const total = entries.reduce(
    (s, e) => s + e.vintage.balance_carried_to_2025,
    0,
  );
  const lines = calculateForm3800Nonpassive({
    filingStatus: FilingStatus.Single,
    regularTax: 1000,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 0,
    standardCredit: 0,
    specifiedCredit: 0,
    standardCarryforward: total,
    specifiedCarryforward: 0,
  }, { ...ZERO_FORM3800_PASSIVE_ACTIVITY, line2: passiveCount * 200 });
  const rows = buildForm3800CarryforwardRows(
    entries,
    entries.map((_, i) => documentId("CarryforwardGeneralBusinessCr", i)),
    allocateForm3800CreditUse(
      form3800CarryforwardCreditUseRows(entries),
      lines,
    ),
  );
  const nonpassive: Form3800DocumentParts = {
    lines,
    transferStatementIds: [],
    carryforwardSources: rows.sources,
    carryoverRows: rows.rows,
    carryoverDetails: rows.details,
    currentRows: [],
    currentAmounts: [],
    currentDetails: [],
    passiveCurrentDetails: [],
    passiveCarryoverDetails: [],
  };
  const passive: Form3800PassiveTaxUseVintage[] = Array.from({
    length: passiveCount,
  }, (_, i) => ({
    sourceKey: `passive-${i}`,
    activityReference: `Synthetic passive activity ${i}`,
    sourceForm: "Form 8874",
    sourceDocumentReference: `Synthetic passive K-1 ${i}`,
    sourceOrigin: {
      kind: PassiveCreditSourceOrigin.Partnership,
      entity_reference: `Passive ${i}`,
      ein: String(200000000 + i),
    },
    form3800CreditLine: "1i",
    reportingRoute: PassiveCreditReportingRoute.Form3800Line3,
    originatingTaxYear: 2024,
    beforePassiveLimit: 200,
    afterPassiveLimit: 0,
    availableAfterPassiveLimit: 0,
    appliedAgainstTax: 0,
    unusedAfterTaxLimit: 0,
  }));
  const parts = joinForm3800DocumentParts(
    lines,
    nonpassive,
    buildForm3800PassiveRowXml(passive, {}),
  );
  const all = {
    f3800: { carryforward_vintages: entries, allowed_credit: 1000 },
    schedule3: { line6a_total: 1000, line8_total: 1000 },
    f1040: { line20_nonrefundable_credits: 1000 },
  };
  return { parts, entries, all, total };
}

for (const count of [35, 36, 70, 71]) {
  Deno.test(`Form 3800 Part VI preserves ${count} source histories across page boundaries`, () => {
    const { parts, total } = fixture(count);
    const pages = projectForm3800PartVIPages(parts);
    assertEquals(pages.length, Math.ceil(count / 35));
    const printed = pages.flatMap((page) =>
      Array.from({ length: 35 }, (_, i) => {
        const k = form3800PartVIFields(i + 1);
        return [
          page[k.a],
          page[k.b],
          page[k.c],
          page[k.f],
          page[k.g],
          page[k.i],
        ];
      }).filter((row) => row[0] !== undefined)
    );
    assertEquals(
      printed,
      parts.carryoverDetails.map((
        row,
      ) => [
        row.line,
        row.originatingTaxYear,
        row.entity && "ein" in row.entity ? row.entity.ein : undefined,
        row.nonpassiveCredit,
        row.appliedCredit,
        row.carryforwardCredit,
      ]),
    );
    assertEquals(printed.reduce((s, row) => s + Number(row[3]), 0), total);
    assertEquals(printed.reduce((s, row) => s + Number(row[4]), 0), 1000);
    assertEquals(
      printed.reduce((s, row) => s + Number(row[5]), 0),
      total - 1000,
    );
    if (count > 35) {
      assertThrows(
        () => projectForm3800PartVIFields(parts),
        Error,
        "continuation",
      );
    } else assertEquals(projectForm3800PartVIFields(parts), pages[0]);
    const last = parts.carryoverDetails.length - 1;
    const mutations: Form3800DocumentParts[] = [
      { ...parts, carryoverDetails: parts.carryoverDetails.slice(0, -1) },
      { ...parts, carryoverDetails: [...parts.carryoverDetails].reverse() },
      { ...parts, carryforwardSources: parts.carryforwardSources.slice(0, -1) },
      {
        ...parts,
        carryforwardSources: parts.carryforwardSources.map((r, i) =>
          i === last
            ? { ...r, documentId: parts.carryforwardSources[0].documentId }
            : r
        ),
      },
      {
        ...parts,
        carryoverDetails: parts.carryoverDetails.map((r, i) =>
          i === last ? { ...r, originatingTaxYear: 2025 } : r
        ),
      },
      {
        ...parts,
        carryoverDetails: parts.carryoverDetails.map((r, i) =>
          i === last ? { ...r, appliedCredit: r.appliedCredit + 1 } : r
        ),
      },
    ];
    for (const mutation of mutations) {
      assertThrows(() => projectForm3800PartVIPages(mutation), Error);
    }
  });
}

Deno.test("Form 3800 mixed Part VI component prints 71 rows and one history attachment", async () => {
  const { parts, all, entries, total } = fixture(71, 35);
  const filer = pdfReviewFixtures[0].filer;
  const instances = form3800Pdf.instances!(all.f3800, filer, all, parts);
  assertEquals(instances.length, 3);
  assertEquals(instances.slice(1).map((i) => form3800Pdf.pageIndices!(i)), [
    [8],
    [8],
  ]);
  const second = instances[1], third = instances[2];
  assertEquals(
    second[form3800PartVIFields(1).f],
    parts.carryoverDetails[35].nonpassiveCredit,
  );
  assertEquals(second[form3800PartVIFields(2).d], 200);
  assertEquals(third[form3800PartVIFields(1).c], "200000034");
  assertEquals(third[form3800PartVIFields(2).a], undefined);
  const xml = buildIRS3800Document(parts).replace(
    "<IRS3800>",
    '<IRS3800 xmlns="http://www.irs.gov/efile" documentId="IRS3800-1">',
  );
  const computations = form3800CarryforwardStatement.build({}, {
    pending: all,
    documentIdsByTag: {
      CarryforwardGeneralBusinessCr: parts.carryforwardSources.map((s) =>
        s.documentId
      ),
    },
  });
  assertExists(computations);
  assertEquals(computations.length, entries.length);
  const document = await PDFDocument.create();
  let historyPages = 0;
  for (const [index, instance] of instances.entries()) {
    const bytes = await fillFormPdf(
      form3800Pdf,
      instance,
      filer,
      ".pdf-cache",
      all,
    );
    assertExists(bytes);
    const source = await PDFDocument.load(bytes);
    const copied = await document.copyPages(source, [
      ...form3800Pdf.pageIndices!(instance),
    ]);
    await form3800Pdf.decoratePages!(document, copied, instance, filer);
    for (const page of copied) document.addPage(page);
    const before = document.getPageCount();
    await form3800Pdf.appendSupplementalPages!(
      document,
      instance,
      filer,
      all,
      parts,
    );
    if (index === 0) {
      historyPages = document.getPageCount() - before;
      assertEquals(historyPages > 0, true);
    } else assertEquals(document.getPageCount(), before);
  }
  assertEquals(document.getPageCount(), 11 + historyPages);
  const bytes = await document.save();
  const reopened = await PDFDocument.load(bytes);
  assertEquals(reopened.getForm().getFields().length, 0);
  let root: string | undefined;
  try {
    root = Deno.env.get("FORM3800_PART_VI_EVIDENCE");
  } catch (e) {
    if (!(e instanceof Deno.errors.NotCapable)) throw e;
  }
  if (root) {
    await Deno.mkdir(root, { recursive: true });
    await Deno.writeFile(`${root}/mixed-71-component.pdf`, bytes);
    await Deno.writeTextFile(`${root}/mixed-71-component.xml`, xml);
    await Deno.writeTextFile(
      `${root}/mixed-71-component.json`,
      JSON.stringify(
        {
          parts,
          entries,
          instances,
          total,
          historyPages,
          pageCount: document.getPageCount(),
          componentOnly: true,
          computations,
        },
        null,
        2,
      ),
    );
  }
});
