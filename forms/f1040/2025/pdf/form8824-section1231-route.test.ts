import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes } from "./builder.ts";
import { pdfReviewFixtures } from "./review-fixtures.ts";

const base = pdfReviewFixtures.find((fixture) =>
  fixture.id === "single-w2-refund"
)!;

Deno.test("Form 8824 section 1231 exchange joins Form 4797, Schedule D, Form 1040 and PDF", async () => {
  const exchange = {
    relinquished_description: "Business investment land",
    received_description: "Replacement business land",
    replacement_property_category: "nondepreciable_land",
    relinquished_fmv: 120_000,
    relinquished_basis: 40_000,
    received_fmv: 100_000,
    cash_received: 20_000,
    date_acquired: "2020-01-01",
    date_transferred: "2025-06-01",
    date_identified: "2025-06-20",
    date_received: "2025-08-01",
    return_due_date_including_extensions: "2026-04-15",
    related_party: false,
    recapture_applies: false,
    multiple_like_kind_properties: false,
    installment_method_applies: false,
    property_used_as_home: false,
    gain_type: "section_1231",
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...base.inputs, form8824: exchange },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4797.gain_form8824, 20_000);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertEquals(bundle.attachments.length, 1);
  assertEquals(
    bundle.attachments[0].fileName,
    "Form8824RealizedRecognizedGainStatement.pdf",
  );
  assertEquals(bundle.attachments[0].bytes[0], 0x25);
  assertStringIncludes(bundle.xml, 'gainInMultiAssetExchStmtInd="true"');
  assertStringIncludes(
    bundle.xml,
    'referenceDocumentName="BinaryAttachment GeneralDependencySmall RealizedAndRecognizedGainInMultiAssetExchangesStmt"',
  );
  assertStringIncludes(
    bundle.xml,
    "<GainLossForm8824Amt>20000</GainLossForm8824Amt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<CapitalGainLossAmt>20000</CapitalGainLossAmt>",
  );
  const xsd = new URL(
    "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 8);
  if (Deno.args.includes("--write-review-artifacts")) {
    const directory = new URL(
      "../../../../.state/research/ty2025-filled-pdf-review/2026-09-30-form8824-section1231/",
      import.meta.url,
    ).pathname;
    await Deno.mkdir(directory, { recursive: true });
    await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
  }
});

Deno.test("Form 4797 retains installment and exchange gains in one filed return", async () => {
  const sale = {
    property_description: "Business land sold on installments",
    date_acquired: "2020-01-01",
    date_sold: "2025-03-01",
    sold_to_related_party: false,
    selling_price_determinable: true,
    selling_price: 80_000,
    cost_basis: 40_000,
    payments_received: 20_000,
    is_capital_asset: false,
  };
  const exchange = {
    relinquished_description: "Exchanged business land",
    received_description: "Replacement business land",
    replacement_property_category: "nondepreciable_land",
    relinquished_fmv: 120_000,
    relinquished_basis: 40_000,
    received_fmv: 100_000,
    cash_received: 20_000,
    date_acquired: "2020-01-01",
    date_transferred: "2025-06-01",
    date_identified: "2025-06-20",
    date_received: "2025-08-01",
    return_due_date_including_extensions: "2026-04-15",
    related_party: false,
    recapture_applies: false,
    multiple_like_kind_properties: false,
    installment_method_applies: false,
    property_used_as_home: false,
    gain_type: "section_1231",
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...base.inputs, form6252: [sale], form8824: exchange },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4797.gain_form6252, 10_000);
  assertEquals(result.pending.form4797.gain_form8824, 20_000);
  assertEquals(result.pending.form4797.section_1231_gain, 30_000);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertEquals(bundle.attachments.length, 1);
  assertStringIncludes(
    bundle.xml,
    "<GainInstallmentSalesFrm6252Amt>10000</GainInstallmentSalesFrm6252Amt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<GainLossForm8824Amt>20000</GainLossForm8824Amt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<CapitalGainLossAmt>30000</CapitalGainLossAmt>",
  );
  const xsd = new URL(
    "../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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
  if (Deno.args.includes("--write-review-artifacts")) {
    const directory = new URL(
      "../../../../.state/research/ty2025-filled-pdf-review/2026-09-30-form4797-mixed-part1/",
      import.meta.url,
    ).pathname;
    await Deno.mkdir(directory, { recursive: true });
    await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
  }
});
