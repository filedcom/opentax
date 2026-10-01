import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { FilingStatus } from "../../../nodes/types.ts";
import { EnergyType } from "../../../nodes/inputs/f8835/index.ts";
import { inputSchema as f8835InputSchema } from "../../../nodes/inputs/f8835/index.ts";
import { buildMefBundle } from "../../mef/builder.ts";
import { testFiler } from "../../mef/test-filer.ts";
import { form3800Pdf } from "./f3800.ts";
import { form8835Pdf } from "./f8835.ts";
import { form8874Pdf } from "./f8874.ts";
import { buildPdfBytes } from "../builder.ts";
import { PDFDocument } from "pdf-lib";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import { f1040_2025 } from "../../index.ts";
import { normalizeAllPending } from "../../pending.ts";
import { inputSchema as f3800InputSchema } from "../../../nodes/inputs/f3800/index.ts";
import { inputSchema as f8874InputSchema } from "../../../nodes/inputs/f8874/index.ts";
import {
  form3800PartIAndIIFields,
  form3800PartIIIFields,
  form3800PartVFields,
} from "./f3800_fields.ts";

const facility = {
  energy_type: EnergyType.Geothermal,
  subject_to_passive_activity_limit: false,
  kwh_produced: 100_000,
  kwh_sold: 100_000,
  facility_description: "Geothermal production site",
  facility_us_address: {
    line1: "100 Wind Farm Rd",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  facility_latitude: 30.267153,
  facility_longitude: -97.743061,
  facility_owned_by_filer: true,
  ac_nameplate_kw: 1_500,
  maximum_net_output_mw: 1.5,
  facility_placed_in_service_date: "2024-01-01",
  facility_construction_start_date: "2023-06-01",
  production_period_start_date: "2025-01-01",
  production_period_end_date: "2025-12-31",
  increased_credit_reason: "none" as const,
  domestic_content_bonus: false,
  energy_community_bonus: false,
  is_fiscal_year: false,
};

function pending() {
  return {
    f1040: {
      filing_status: "single",
      digital_assets: false,
      line11_agi: 50_000,
      line14_deductions_qbi_total: 15_000,
      line16_income_tax: 40_000,
      line20_nonrefundable_credits: 600,
      form3800_source_credits: {
        standardCredit: 0,
        specifiedCredit: 600,
        standardCarryforward: 0,
        specifiedCarryforward: 0,
        passiveLines: {
          line2: 0,
          line3: 0,
          line23: 0,
          line24: 0,
          line32: 0,
          line33: 0,
        },
      },
    },
    schedule3: {
      line6a_total: 600,
      line7_total: 600,
      line8_total: 600,
    },
    form6251: { line11_amt: 0, net_tmt: 20_000, regular_tax_income: 35_000 },
    f3800: {
      f8835_credit_entries: [{
        form3800_line: "4e" as const,
        credit_amount: 600,
        transfer_out_amount: 0,
        subject_to_passive_activity_limit: false,
      }],
      tax_context: {
        filingStatus: FilingStatus.Single,
        regularTax: 40_000,
        alternativeMinimumTax: 0,
        foreignTaxCredit: 0,
        priorAllowableCredits: 0,
        tentativeMinimumTax: 20_000,
        standardCredit: 0,
        specifiedCredit: 600,
        standardCarryforward: 0,
        specifiedCarryforward: 0,
      },
      allowed_credit: 600,
      specified_credit_allowed: 600,
    },
    f8835: { f8835s: [facility] },
  };
}

Deno.test("Form 3800 PDF uses the exact parts captured during MeF serialization", async () => {
  const source = pending();
  const filer = {
    ...testFiler(),
    firstNameWithInitial: "Test",
    lastName: "Taxpayer",
  };
  const bundle = await buildMefBundle(source, { filer, attachments: [] });
  assertStringIncludes(bundle.xml, "<IRS3800 ");
  assertEquals(bundle.form3800Parts?.lines.line38, 600);
  const [instance] = form3800Pdf.instances?.(
    source.f3800,
    filer,
    source,
    bundle.form3800Parts,
  ) ?? [];
  assertEquals(instance?.[form3800PartIAndIIFields.line38], 600);
  assertEquals(instance?.[form3800PartIIIFields("4e").g], 600);
  assertEquals(instance?.[form3800PartIIIFields("4e").i], 600);
  assertThrows(
    () =>
      form3800Pdf.instances?.(
        source.f3800,
        filer,
        {
          ...source,
          f1040: { ...source.f1040, line20_nonrefundable_credits: 599 },
        },
        bundle.form3800Parts,
      ),
    Error,
    "Form 1040 line 20 do not reconcile",
  );
  assertThrows(
    () =>
      form3800Pdf.instances?.(
        { ...source.f3800, allowed_credit: 601 },
        filer,
        source,
        bundle.form3800Parts,
      ),
    Error,
    "pending allowed credit differs from prepared MeF line 38",
  );
  assertThrows(
    () =>
      form3800Pdf.instances?.(
        source.f3800,
        filer,
        {
          ...source,
          f3800: { ...source.f3800, allowed_credit: 601 },
        },
        bundle.form3800Parts,
      ),
    Error,
    "pending allowed credit differs from prepared MeF line 38",
  );
  assertThrows(
    () => form3800Pdf.instances?.(source.f3800, filer, source),
    Error,
    "same prepared MeF return",
  );
  const cacheDir = await Deno.makeTempDir();
  try {
    const pdf = await buildPdfBytes(source, filer, cacheDir, bundle);
    assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 9, true);
    await assertRejects(
      () =>
        buildPdfBytes(source, filer, cacheDir, {
          ...bundle,
          form3800Parts: {
            ...bundle.form3800Parts!,
            lines: { ...bundle.form3800Parts!.lines, line38: 601 },
          },
        }),
      Error,
      "Form 3800 PDF parts differ from the prepared MeF return",
    );
    await assertRejects(
      () =>
        buildPdfBytes(
          {
            ...source,
            f3800: { ...source.f3800, allowed_credit: 601 },
          },
          filer,
          cacheDir,
          bundle,
        ),
      Error,
      "PDF source differs from the prepared MeF return",
    );
    source.f1040.line11_agi++;
    await assertRejects(
      () => buildPdfBytes(source, filer, cacheDir, bundle),
      Error,
      "PDF source differs from the prepared MeF return",
    );
    source.f1040.line11_agi--;
    await assertRejects(
      () =>
        buildPdfBytes(
          source,
          {
            ...filer,
            nameLine1: "DIFFERENT FILER",
          },
          cacheDir,
          bundle,
        ),
      Error,
      "PDF source differs from the prepared MeF return",
    );
  } finally {
    await Deno.remove(cacheDir, { recursive: true });
  }
});

Deno.test("prepared return prints the graph's geothermal credit on all nine Form 3800 pages", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-geothermal-general-business-credit"
  )!;
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    fixture.filer,
  );
  assertEquals(prepared.bundle.form3800Parts?.lines.line38, 600);
  assertStringIncludes(
    prepared.bundle.xml,
    "<TotalGeneralBusCreditsAppTxAmt>600</TotalGeneralBusCreditsAppTxAmt>",
  );
  const pdf = await prepared.renderPdf();
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 17);
});

Deno.test("two geothermal facilities print two Form 8835 copies and distinct Form 3800 Part V sources", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-two-geothermal-business-credits"
  )!;
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    fixture.filer,
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.lines.line38, 1_200);
  assertEquals(parts.currentRows[0].metadata.sourceCount, 2);
  const ids = parts.currentRows[0].metadata.referenceDocumentId!.split(" ");
  assertEquals(ids.length, 2);
  assertEquals(parts.currentDetails.map((row) => row.sourceDocumentId), ids);
  assertEquals((prepared.bundle.xml.match(/<IRS8835\b/g) ?? []).length, 2);
  const allPending = normalizeAllPending(prepared.bundle.pending);
  const form3800 = form3800Pdf.instances?.(
    allPending.f3800,
    fixture.filer,
    allPending,
    parts,
  )?.[0];
  assertEquals(form3800?.[form3800PartIIIFields("4e").g], 1_200);
  assertEquals(form3800?.[form3800PartVFields(1).e], 600);
  assertEquals(form3800?.[form3800PartVFields(2).e], 600);
  const copies = form8835Pdf.instances?.(
    allPending.f8835,
    fixture.filer,
    allPending,
    parts,
  ) ?? [];
  assertEquals(copies.map((copy) => copy.facility_description), [
    "Geothermal production site",
    "Second geothermal production site",
  ]);
  assertEquals(copies.map((copy) => copy.line15), [600, 600]);
  assertEquals(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount(),
    20,
  );
});

Deno.test("wind and geothermal facilities keep separate Form 8835 lines and Form 3800 sources", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-wind-and-geothermal-business-credits"
  )!;
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    fixture.filer,
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.lines.line38, 1_200);
  assertEquals(parts.currentRows[0].metadata.sourceCount, 2);
  assertEquals(parts.currentDetails.map((row) => row.credit), [600, 600]);
  assertEquals((prepared.bundle.xml.match(/<IRS8835\b/g) ?? []).length, 2);
  assertStringIncludes(
    prepared.bundle.xml,
    "<KwHrsPrdcdAndSoldWindCrAmt>600</KwHrsPrdcdAndSoldWindCrAmt>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<KwHrsPrdcdAndSoldGthrmlAmt>600</KwHrsPrdcdAndSoldGthrmlAmt>",
  );
  const allPending = normalizeAllPending(prepared.bundle.pending);
  const copies = form8835Pdf.instances?.(
    allPending.f8835,
    fixture.filer,
    allPending,
    parts,
  ) ?? [];
  assertEquals(copies.map((copy) => copy.facility_type), [
    "Wind",
    "Geothermal",
  ]);
  assertEquals(copies.map((copy) => copy.line15), [600, 600]);
  assertEquals(copies[0].line1a_credit, 600);
  assertEquals(copies[1].line1c_credit, 600);
  assertEquals(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount(),
    20,
  );
});

Deno.test("source-backed New Markets credit prints Form 8874 with its prepared Form 3800 parent", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-new-markets-business-credit"
  )!;
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    fixture.filer,
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.lines.line38, 500);
  const sourceRow = parts.currentRows.find((row) => row.line === "1i")!;
  assertEquals(sourceRow.metadata.sourceCount, 1);
  assertEquals(
    parts.currentDetails.find((row) => row.line === "1i")?.credit,
    500,
  );
  assertStringIncludes(prepared.bundle.xml, "<IRS8874 ");
  assertStringIncludes(
    prepared.bundle.xml,
    "<CDETotalCreditAmt>500</CDETotalCreditAmt>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<TotalGeneralBusCreditsAppTxAmt>500</TotalGeneralBusCreditsAppTxAmt>",
  );
  const allPending = normalizeAllPending(prepared.bundle.pending);
  const printed8874 = form8874Pdf.projectFields!(allPending.f8874, allPending);
  assertEquals(printed8874.row_1_investment, 10_000);
  assertEquals(printed8874.row_1_rate, 5);
  assertEquals(printed8874.row_1_credit, 500);
  assertEquals(printed8874.line3, 500);
  const printed3800 = form3800Pdf.instances?.(
    allPending.f3800,
    fixture.filer,
    allPending,
    parts,
  )?.[0];
  assertEquals(printed3800?.[form3800PartIIIFields("1i").g], 500);
  assertEquals(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount(),
    15,
  );
});

Deno.test("long New Markets CDE identity prints on an attached page without losing its credit", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-long-name-new-markets-investment"
  )!;
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    fixture.filer,
  );
  assertEquals(prepared.bundle.form3800Parts?.lines.line38, 500);
  const allPending = normalizeAllPending(prepared.bundle.pending);
  const printed8874 = form8874Pdf.projectFields!(allPending.f8874, allPending);
  assertEquals(printed8874.row_1_cde, undefined);
  assertEquals(printed8874.row_6_cde, "See attached");
  assertEquals(printed8874.row_6_credit, 500);
  assertEquals(printed8874.line3, 500);
  assertEquals((printed8874.print_overflow_rows as unknown[]).length, 1);
  assertEquals(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount(),
    16,
  );
});

Deno.test("two New Markets investments retain separate Form 8874 rows and one parent credit", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-two-new-markets-investments"
  )!;
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    fixture.filer,
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.lines.line38, 1_100);
  assertEquals(
    parts.currentDetails.find((row) => row.line === "1i")?.credit,
    1_100,
  );
  assertEquals(
    [...prepared.bundle.xml.matchAll(/<CurrentYearCreditInfo>/g)].length,
    2,
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<CDETotalCreditAmt>1100</CDETotalCreditAmt>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<TotalGeneralBusCreditsAppTxAmt>1100</TotalGeneralBusCreditsAppTxAmt>",
  );
  const allPending = normalizeAllPending(prepared.bundle.pending);
  const printed8874 = form8874Pdf.projectFields!(allPending.f8874, allPending);
  assertEquals(printed8874.row_1_rate, 5);
  assertEquals(printed8874.row_1_credit, 500);
  assertEquals(printed8874.row_2_rate, 6);
  assertEquals(printed8874.row_2_credit, 600);
  assertEquals(printed8874.line3, 1_100);
  const printed3800 = form3800Pdf.instances?.(
    allPending.f3800,
    fixture.filer,
    allPending,
    parts,
  )?.[0];
  assertEquals(printed3800?.[form3800PartIIIFields("1i").g], 1_100);
  assertEquals(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount(),
    15,
  );
});

Deno.test("six New Markets investments fill the last Form 8874 row and reconcile to Form 3800", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-six-new-markets-investments"
  )!;
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    fixture.filer,
  );
  assertEquals(prepared.bundle.form3800Parts?.lines.line38, 3_000);
  assertEquals(
    [...prepared.bundle.xml.matchAll(/<CurrentYearCreditInfo>/g)].length,
    6,
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<CDETotalCreditAmt>3000</CDETotalCreditAmt>",
  );
  const allPending = normalizeAllPending(prepared.bundle.pending);
  const printed8874 = form8874Pdf.projectFields!(allPending.f8874, allPending);
  assertEquals(
    printed8874.row_6_cde,
    "Community Entity 6\n15 Example Way, Dover, DE 19901",
  );
  assertEquals(printed8874.row_6_credit, 500);
  assertEquals(printed8874.line3, 3_000);
  const printed3800 = form3800Pdf.instances?.(
    allPending.f3800,
    fixture.filer,
    allPending,
    prepared.bundle.form3800Parts,
  )?.[0];
  assertEquals(printed3800?.[form3800PartIIIFields("1i").g], 3_000);
  assertEquals(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount(),
    15,
  );
});

Deno.test("seven New Markets investments print an attached Form 8874 detail page and reconcile to Form 3800", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-seven-new-markets-investments"
  )!;
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    fixture.filer,
  );
  assertEquals(prepared.bundle.form3800Parts?.lines.line38, 3_500);
  assertEquals(
    [...prepared.bundle.xml.matchAll(/<CurrentYearCreditInfo>/g)].length,
    7,
  );
  const allPending = normalizeAllPending(prepared.bundle.pending);
  const printed8874 = form8874Pdf.projectFields!(allPending.f8874, allPending);
  assertEquals(printed8874.row_5_credit, 500);
  assertEquals(printed8874.row_6_cde, "See attached");
  assertEquals(printed8874.row_6_credit, 1_000);
  assertEquals(printed8874.line3, 3_500);
  assertEquals((printed8874.print_overflow_rows as unknown[]).length, 2);
  const printed3800 = form3800Pdf.instances?.(
    allPending.f3800,
    fixture.filer,
    allPending,
    prepared.bundle.form3800Parts,
  )?.[0];
  assertEquals(printed3800?.[form3800PartIIIFields("1i").g], 3_500);
  const packet = await PDFDocument.load(await prepared.renderPdf());
  assertEquals(packet.getPageCount(), 16);
});

Deno.test("twenty-four New Markets investments retain two statement pages and the full return credit", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-twenty-four-new-markets-investments"
  )!;
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    fixture.filer,
  );
  assertEquals(prepared.bundle.form3800Parts?.lines.line38, 12_000);
  assertEquals(
    [...prepared.bundle.xml.matchAll(/<CurrentYearCreditInfo>/g)].length,
    24,
  );
  const allPending = normalizeAllPending(prepared.bundle.pending);
  const printed8874 = form8874Pdf.projectFields!(allPending.f8874, allPending);
  assertEquals(printed8874.row_6_cde, "See attached");
  assertEquals(printed8874.row_6_credit, 9_500);
  assertEquals(printed8874.line3, 12_000);
  assertEquals((printed8874.print_overflow_rows as unknown[]).length, 19);
  const printed3800 = form3800Pdf.instances?.(
    allPending.f3800,
    fixture.filer,
    allPending,
    prepared.bundle.form3800Parts,
  )?.[0];
  assertEquals(printed3800?.[form3800PartIIIFields("1i").g], 12_000);
  assertEquals(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount(),
    21,
  );
});

Deno.test("geothermal and New Markets credits retain separate Form 3800 lines and one return total", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-geothermal-and-new-markets-credits"
  )!;
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    fixture.filer,
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.lines.line38, 1_100);
  assertEquals(
    Object.fromEntries(parts.currentRows.map((row) => [
      row.line,
      row.metadata.sourceCount,
    ])),
    { "1i": 1, "4e": 1 },
  );
  assertEquals(
    Object.fromEntries(parts.currentDetails.map((row) => [
      row.line,
      row.credit,
    ])),
    { "1i": 500, "4e": 600 },
  );
  const sourceIds = parts.currentRows.map((row) =>
    row.metadata.referenceDocumentId
  );
  assertEquals(sourceIds.every(Boolean), true);
  assertEquals(new Set(sourceIds).size, 2);
  assertEquals((prepared.bundle.xml.match(/<IRS8835\b/g) ?? []).length, 1);
  assertEquals((prepared.bundle.xml.match(/<IRS8874\b/g) ?? []).length, 1);
  assertStringIncludes(
    prepared.bundle.xml,
    "<TotalGeneralBusCreditsAppTxAmt>1100</TotalGeneralBusCreditsAppTxAmt>",
  );
  const allPending = normalizeAllPending(prepared.bundle.pending);
  const printed3800 = form3800Pdf.instances?.(
    allPending.f3800,
    fixture.filer,
    allPending,
    parts,
  )?.[0];
  assertEquals(printed3800?.[form3800PartIIIFields("1i").g], 500);
  assertEquals(printed3800?.[form3800PartIIIFields("4e").g], 600);
  assertEquals(printed3800?.[form3800PartIAndIIFields.line38], 1_100);
  assertEquals(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount(),
    18,
  );
});

Deno.test("orphan-drug and New Markets credits retain distinct current-year source rows", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-geothermal-and-new-markets-credits"
  )!;
  const { f8835: _facility, ...otherInputs } = fixture.inputs;
  const orphanSource = {
    f8820s: [{
      generic_name: "Test Orphan Drug",
      designation_application_number: "FDA-2025-123",
      designation_date: "2024-03-15",
      qualified_clinical_testing_expenses: 10_000,
      qualifying_testing_confirmed: true,
      expenses_exclude_third_party_funding: true,
      expenses_not_used_for_research_credit: true,
    }],
    reduced_section280c_credit_election: true,
    form8932_overlapping_wage_credit: 0,
    subject_to_passive_activity_limit: false,
  };
  const result = f1040_2025.executeReturn({
    ...otherInputs,
    f8820: orphanSource,
  });
  assertEquals(result.diagnostics, []);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    fixture.filer,
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.lines.line1, 2_475);
  assertEquals(parts.lines.line6, 2_475);
  assertEquals(parts.lines.line17, 2_475);
  assertEquals(parts.lines.line38, 2_475);
  assertEquals(
    Object.fromEntries(parts.currentRows.map((row) => [
      row.line,
      row.metadata.sourceCount,
    ])),
    { "1h": 1, "1i": 1 },
  );
  assertEquals(
    Object.fromEntries(parts.currentDetails.map((row) => [
      row.line,
      row.credit,
    ])),
    { "1h": 1_975, "1i": 500 },
  );
  assertEquals(
    parts.currentRows.map((row) => row.metadata.referenceDocumentName)
      .sort(),
    ["IRS8820", "IRS8874"],
  );
  assertEquals(
    new Set(parts.currentRows.map((row) => row.metadata.referenceDocumentId))
      .size,
    2,
  );
  assertEquals((prepared.bundle.xml.match(/<IRS8820\b/g) ?? []).length, 1);
  assertEquals((prepared.bundle.xml.match(/<IRS8874\b/g) ?? []).length, 1);
  assertStringIncludes(prepared.bundle.xml, "<Form8820CYCreditsGrp");
  assertStringIncludes(prepared.bundle.xml, "<Form8874CYCreditsGrp");
  assertStringIncludes(
    prepared.bundle.xml,
    "<TotalGeneralBusCreditsAppTxAmt>2475</TotalGeneralBusCreditsAppTxAmt>",
  );
  const allPending = normalizeAllPending(prepared.bundle.pending);
  const pending3800 = f3800InputSchema.parse(allPending.f3800);
  const pending8874 = f8874InputSchema.parse(allPending.f8874);
  assertEquals(allPending.schedule3?.line6a_total, 2_475);
  assertEquals(allPending.f1040?.line20_nonrefundable_credits, 2_475);
  const printed3800 = form3800Pdf.instances?.(
    allPending.f3800,
    fixture.filer,
    allPending,
    parts,
  )?.[0];
  assertEquals(printed3800?.[form3800PartIIIFields("1h").g], 1_975);
  assertEquals(printed3800?.[form3800PartIIIFields("1i").g], 500);
  assertEquals(printed3800?.[form3800PartIAndIIFields.line38], 2_475);
  assertEquals(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() > 0,
    true,
  );
  assertThrows(
    () =>
      form3800Pdf.instances?.(
        {
          ...pending3800,
          f8820_credit: {
            ...pending3800.f8820_credit,
            credit_amount: 1_974,
          },
        },
        fixture.filer,
        allPending,
        parts,
      ),
    Error,
    "mixed orphan-drug/New Markets rows",
  );
  assertThrows(
    () =>
      form3800Pdf.instances?.(
        allPending.f3800,
        fixture.filer,
        {
          ...allPending,
          f8874: {
            ...pending8874,
            investments: [{
              ...pending8874.investments[0],
              qualified_equity_investment_amount: 9_000,
            }],
          },
        },
        parts,
      ),
    Error,
    "mixed orphan-drug/New Markets rows",
  );
  assertThrows(
    () =>
      form3800Pdf.instances?.(
        allPending.f3800,
        fixture.filer,
        allPending,
        {
          ...parts,
          currentAmounts: parts.currentAmounts.map((row) =>
            row.line === "1i"
              ? { ...row, nonpassiveCredit: row.nonpassiveCredit - 1 }
              : row
          ),
        },
      ),
    Error,
    "mixed orphan-drug/New Markets rows",
  );
});

Deno.test("orphan-drug ordinary and geothermal specified credits keep separate Form 3800 limits", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-geothermal-and-new-markets-credits"
  )!;
  const { f8874: _investment, ...otherInputs } = fixture.inputs;
  const result = f1040_2025.executeReturn({
    ...otherInputs,
    f8820: {
      f8820s: [{
        generic_name: "Test Orphan Drug",
        designation_application_number: "FDA-2025-456",
        designation_date: "2024-03-15",
        qualified_clinical_testing_expenses: 10_000,
        qualifying_testing_confirmed: true,
        expenses_exclude_third_party_funding: true,
        expenses_not_used_for_research_credit: true,
      }],
      reduced_section280c_credit_election: true,
      form8932_overlapping_wage_credit: 0,
      subject_to_passive_activity_limit: false,
    },
  });
  assertEquals(result.diagnostics, []);
  const prepared = await f1040_2025.prepareReturn(
    result.pending,
    fixture.filer,
  );
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.lines.line1, 1_975);
  assertEquals(parts.lines.line6, 1_975);
  assertEquals(parts.lines.line17, 1_975);
  assertEquals(parts.lines.line30, 600);
  assertEquals(parts.lines.line37, 600);
  assertEquals(parts.lines.line38, 2_575);
  assertEquals(
    Object.fromEntries(parts.currentRows.map((row) => [
      row.line,
      [row.metadata.sourceCount, row.metadata.referenceDocumentName],
    ])),
    { "1h": [1, "IRS8820"], "4e": [1, "IRS8835"] },
  );
  assertEquals(
    Object.fromEntries(parts.currentDetails.map((row) => [
      row.line,
      row.credit,
    ])),
    { "1h": 1_975, "4e": 600 },
  );
  assertEquals(
    new Set(parts.currentRows.map((row) => row.metadata.referenceDocumentId))
      .size,
    2,
  );
  assertEquals((prepared.bundle.xml.match(/<IRS8820\b/g) ?? []).length, 1);
  assertEquals((prepared.bundle.xml.match(/<IRS8835\b/g) ?? []).length, 1);
  assertStringIncludes(prepared.bundle.xml, "<Form8820CYCreditsGrp");
  assertStringIncludes(
    prepared.bundle.xml,
    "<TotalGeneralBusCreditsAppTxAmt>2575</TotalGeneralBusCreditsAppTxAmt>",
  );
  const allPending = normalizeAllPending(prepared.bundle.pending);
  const pending3800 = f3800InputSchema.parse(allPending.f3800);
  const pending8835 = f8835InputSchema.parse(allPending.f8835);
  assertEquals(allPending.schedule3?.line6a_total, 2_575);
  assertEquals(allPending.f1040?.line20_nonrefundable_credits, 2_575);
  const printed = form3800Pdf.instances?.(
    allPending.f3800,
    fixture.filer,
    allPending,
    parts,
  )?.[0];
  assertEquals(printed?.[form3800PartIIIFields("1h").g], 1_975);
  assertEquals(printed?.[form3800PartIIIFields("4e").g], 600);
  assertEquals(printed?.[form3800PartIAndIIFields.line38], 2_575);
  assertEquals(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() > 0,
    true,
  );
  assertThrows(
    () =>
      form3800Pdf.instances?.(
        {
          ...pending3800,
          f8835_credit_entries: [{
            ...pending3800.f8835_credit_entries![0],
            credit_amount: 599,
          }],
        },
        fixture.filer,
        allPending,
        parts,
      ),
    Error,
    "mixed orphan-drug/geothermal sources",
  );
  assertThrows(
    () =>
      form3800Pdf.instances?.(
        allPending.f3800,
        fixture.filer,
        {
          ...allPending,
          f8835: {
            f8835s: [{ ...pending8835.f8835s[0], kwh_sold: 90_000 }],
          },
        },
        parts,
      ),
    Error,
    "Form 8835 PDF production credit disagrees",
  );
  assertThrows(
    () =>
      form3800Pdf.instances?.(
        allPending.f3800,
        fixture.filer,
        allPending,
        { ...parts, lines: { ...parts.lines, line17: 1_974 } },
      ),
    Error,
    "mixed orphan-drug/geothermal sources",
  );
});
