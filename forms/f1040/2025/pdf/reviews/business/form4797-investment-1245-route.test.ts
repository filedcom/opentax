import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { registry } from "../../../registry.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../builder.ts";
import { pdfReviewFixtures } from "../../review-fixtures.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;

const sale = {
  property_id: "investment-1245-1",
  property_description: "Investment equipment",
  acquired_on: "2022-05-01",
  sold_on: "2025-06-01",
  gross_sales_price: 15_000,
  cost_or_other_basis_plus_sale_expense: 12_000,
  depreciation_allowed_or_allowable: 5_000,
  property_held_for_investment_not_business: true,
  section_1245_classification_reviewed: true,
  direct_cash_sale_no_special_recapture_exception: true,
  sale_document_reference: "SALE-2025-1",
  basis_document_reference: "BASIS-2022-1",
  depreciation_schedule_reference: "DEPR-2025-1",
};

async function verifyInvestmentReturn(
  sales: readonly Record<string, unknown>[],
  ordinary: number,
  excess: number,
  artifactId?: string,
): Promise<void> {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...base.inputs,
      form4797_investment_1245: {
        investment_1245_dispositions: sales,
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1.line4_other_gains, ordinary);
  assertEquals(result.pending.schedule_d.line_11_form2439, undefined);
  const pending = buildPending(result.pending);
  assertEquals((pending.form8949 as unknown[]).length, sales.length);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertEquals(
    (bundle.xml.match(/<PropertyDispositionGain>/g) ?? []).length,
    sales.length,
  );
  assertStringIncludes(bundle.xml, `<NetGainAmt>${excess}</NetGainAmt>`);
  assertStringIncludes(
    bundle.xml,
    `<OtherGainLossAmt>${ordinary}</OtherGainLossAmt>`,
  );
  assertStringIncludes(
    bundle.xml,
    `<CapitalGainLossAmt>${excess}</CapitalGainLossAmt>`,
  );
  const xsd = new URL(
    "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, bundle.xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 9);
  if (artifactId && Deno.args.includes("--write-review-artifacts")) {
    const directory = new URL(
      `../../../../.state/research/ty2025-filled-pdf-review/2026-09-30-${artifactId}/`,
      import.meta.url,
    ).pathname;
    await Deno.mkdir(directory, { recursive: true });
    await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
  }
}

Deno.test("investment section 1245 property reaches Schedule 1, Schedule D, MeF, and filled PDF", async () => {
  await verifyInvestmentReturn(
    [sale],
    5_000,
    3_000,
    "form4797-investment-1245",
  );
});

Deno.test("four investment section 1245 properties fill all Part III columns", async () => {
  const sales = Array.from({ length: 4 }, (_, index) => ({
    ...sale,
    property_id: `investment-1245-${index + 1}`,
    property_description: `Investment asset ${index + 1}`,
    gross_sales_price: 15_000 + 1_000 * index,
    sale_document_reference: `SALE-2025-${index + 1}`,
    basis_document_reference: `BASIS-2022-${index + 1}`,
    depreciation_schedule_reference: `DEPR-2025-${index + 1}`,
  }));
  await verifyInvestmentReturn(
    sales,
    20_000,
    18_000,
    "form4797-four-investment-1245",
  );
});
