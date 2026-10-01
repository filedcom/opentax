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

Deno.test("Form 6252 mortgage-assumed land sale joins Schedule D, Form 1040, native XML and PDF", async () => {
  const sale = {
    property_description: "Vacant land",
    date_acquired: "2020-01-01",
    date_sold: "2025-03-01",
    sold_to_related_party: false,
    selling_price_determinable: true,
    selling_price: 100_000,
    mortgage_assumed: 60_000,
    cost_basis: 40_000,
    payments_received: 10_000,
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...base.inputs, form6252: [sale] },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_d.gain_form6252_lt, 30_000);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<InstallmentSaleIncomeAmt>30000</InstallmentSaleIncomeAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<LTGainOrLossFromFormsAmt>30000</LTGainOrLossFromFormsAmt>",
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
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 5);
  if (Deno.args.includes("--write-review-artifacts")) {
    const directory = new URL(
      "../../../../.state/research/ty2025-filled-pdf-review/2026-09-30-form6252-land/",
      import.meta.url,
    ).pathname;
    await Deno.mkdir(directory, { recursive: true });
    await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
  }
});

Deno.test("three installment sales retain individual PDFs and capital/business destinations", async () => {
  const common = {
    date_acquired: "2020-01-01",
    date_sold: "2025-03-01",
    sold_to_related_party: false,
    selling_price_determinable: true,
  };
  const sales = [
    {
      ...common,
      property_description: "Land A",
      selling_price: 100_000,
      cost_basis: 40_000,
      payments_received: 10_000,
    },
    {
      ...common,
      property_description: "Land B",
      selling_price: 50_000,
      cost_basis: 25_000,
      payments_received: 10_000,
    },
    {
      ...common,
      property_description: "Business land",
      selling_price: 80_000,
      cost_basis: 40_000,
      payments_received: 20_000,
      is_capital_asset: false,
    },
  ];
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...base.inputs, form6252: sales },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_d.gain_form6252_lt, 11_000);
  assertEquals(result.pending.form4797.gain_form6252, 10_000);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertEquals((bundle.xml.match(/<IRS6252 documentId=/g) ?? []).length, 3);
  assertStringIncludes(
    bundle.xml,
    "<LTGainOrLossFromFormsAmt>21000</LTGainOrLossFromFormsAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<GainInstallmentSalesFrm6252Amt>10000</GainInstallmentSalesFrm6252Amt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<CapitalGainLossAmt>21000</CapitalGainLossAmt>",
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
      "../../../../.state/research/ty2025-filled-pdf-review/2026-09-30-form6252-three-sales/",
      import.meta.url,
    ).pathname;
    await Deno.mkdir(directory, { recursive: true });
    await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
  }
});

Deno.test("2024 land sale final payment joins 2025 Schedule D, Form 1040, native XML and PDF", async () => {
  const sale = {
    property_description: "Vacant land",
    date_acquired: "2020-01-01",
    date_sold: "2024-03-01",
    sold_to_related_party: false,
    selling_price_determinable: true,
    selling_price: 100_000,
    mortgage_assumed: 0,
    cost_basis: 40_000,
    payments_received: 80_000,
    payments_received_prior_years: 20_000,
    prior_year_form6252_source: {
      filed_form_reference: "2024 Form 6252 review record, vacant land",
      property_description: "Vacant land",
      date_acquired: "2020-01-01",
      date_sold: "2024-03-01",
      line16_gross_profit: 60_000,
      line18_contract_price: 100_000,
      line19_gross_profit_ratio: 0.6,
      line20_year_of_sale_payment: 0,
      line22_total_payments: 20_000,
      line23_prior_payments: 0,
      line26_gain: 12_000,
    },
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { ...base.inputs, form6252: [sale] },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_d.gain_form6252_lt, 48_000);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<PaymentsReceivedPriorYearsAmt>20000</PaymentsReceivedPriorYearsAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<InstallmentSaleIncomeAmt>48000</InstallmentSaleIncomeAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<LTGainOrLossFromFormsAmt>48000</LTGainOrLossFromFormsAmt>",
  );
  assertStringIncludes(
    bundle.xml,
    "<CapitalGainLossAmt>48000</CapitalGainLossAmt>",
  );
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 5);

  const tampered = {
    ...sale,
    prior_year_form6252_source: {
      ...sale.prior_year_form6252_source,
      line19_gross_profit_ratio: 0.5,
    },
  };
  const rejected = execute(
    buildExecutionPlan(registry),
    registry,
    { ...base.inputs, form6252: [tampered] },
    { taxYear: 2025, formType: "f1040" },
  );
  assertStringIncludes(
    rejected.diagnostics.find((entry) => entry.nodeType === "form6252")
      ?.message ?? "",
    "filed 2024 source conflicts",
  );
});
