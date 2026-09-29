import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { FilingStatus } from "../../../nodes/types.ts";
import { EnergyType } from "../../../nodes/inputs/f8835/index.ts";
import { buildMefBundle } from "../../mef/builder.ts";
import { testFiler } from "../../mef/test-filer.ts";
import { form3800Pdf } from "./f3800.ts";
import { form8835Pdf } from "./f8835.ts";
import { buildPdfBytes } from "../builder.ts";
import { PDFDocument } from "pdf-lib";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import { f1040_2025 } from "../../index.ts";
import { normalizeAllPending } from "../../pending.ts";
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
  ac_nameplate_kw: 900,
  facility_placed_in_service_date: "2023-01-01",
  facility_construction_start_date: "2022-12-01",
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
      line11_agi: 50_000,
      line14_deductions_qbi_total: 15_000,
      line16_income_tax: 40_000,
      line20_nonrefundable_credits: 600,
      form3800_source_credits: {
        standardCredit: 0,
        specifiedCredit: 600,
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
      },
      allowed_credit: 600,
      specified_credit_allowed: 600,
    },
    f8835: { f8835s: [facility] },
  };
}

Deno.test("Form 3800 PDF uses the exact parts captured during MeF serialization", async () => {
  const source = pending();
  const filer = testFiler();
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
