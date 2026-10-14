import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { PficRegime } from "../../../../../nodes/inputs/income/foreign/f8621/index.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefXml } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";

const iso = pdfReviewFixtures.find((row) => row.id === "single-iso-amt")!;
const farm = pdfReviewFixtures.find((row) =>
  row.id === "single-schedule-j-farm-income-averaging"
)!;
const child = pdfReviewFixtures.find((row) =>
  row.id === "single-child-unearned-income"
)!;

function copy(document_id: string, content: string) {
  const bytes = new TextEncoder().encode(content);
  return {
    document_id,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes_base64: btoa(String.fromCharCode(...bytes)),
  };
}

async function assertFullXsd(xml: string): Promise<void> {
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        xmlPath,
      ],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
}

const holding = {
  company_name: "QEF AMT Source Fund",
  company_ein_or_ref: "QEFAMT1",
  country_of_incorporation: "Ireland",
  regime: PficRegime.QEF,
  shares_owned: 100,
  fmv_at_year_end: 20_000,
  qef_ordinary_income: 2_000,
  qef_capital_gain: 0,
  parent_source: {
    corporation_address: {
      line1: "1 Fund Quay",
      city: "Dublin",
      country_code: "EI",
    },
    corporation_tax_year_start: "2025-01-01",
    corporation_tax_year_end: "2025-12-31",
    share_classes: [{
      description: "Ordinary",
      year_end_shares: 100,
      year_end_value_usd: 20_000,
    }],
    jointly_owned_with_spouse: false,
    shares_acquired_during_2025: true,
    acquisition_date: "2025-01-01",
    election_status: "qef_new_2025",
    no_outstanding_section1294_election: true,
    issuer_record: copy("issuer-amt", "Issuer 2025 QEF AMT holding report"),
    qef_annual_statement: {
      ...copy("qef-amt", "QEF annual information 2000 ordinary, 0 capital"),
      ordinary_earnings_usd: 2_000,
      net_capital_gain_usd: 0,
    },
    qef_1294_activity_record: {
      ...copy("activity-amt", "Broker ledger: zero distributions/transfers"),
      distributions_cash_and_property_usd: 0,
      transferred_share_earnings_usd: 0,
    },
  },
  qef_1294_election: {
    distributions_cash_and_property_usd: 0,
    transferred_share_earnings_usd: 0,
    undistributed_ordinary_earnings_usd: 2_000,
    undistributed_capital_gain_usd: 0,
    no_section951_inclusion: true,
  },
};

Deno.test("Form 8621 Election B refigures sourced ISO AMT on the full return", async () => {
  const inputs = { ...iso.inputs, f8621: [holding] };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filed = pending.f1040! as Record<string, number>;
  const without = f1040_2025.executeReturn({
    ...inputs,
    f8621: [{
      ...holding,
      qef_ordinary_income: 0,
      qef_capital_gain: 0,
      qef_1294_election: undefined,
    }],
  });
  assertEquals(without.diagnostics, []);
  const withoutPending = buildPending(without.pending);
  const without1040 = withoutPending.f1040! as Record<string, number>;
  assertEquals(filed.form8621_1294_total_tax_before_deferral, 94_310);
  assertEquals(without1040.line24_total_tax, 93_750);
  assertEquals(filed.form8621_1294_deferred_tax, 560);
  assertEquals(filed.line24_total_tax, 93_750);
  assertEquals(
    filed.form8621_1294_deferred_tax,
    filed.form8621_1294_total_tax_before_deferral -
      without1040.line24_total_tax,
  );
  assertEquals(
    filed.form8621_1294_counterfactual_total_tax,
    without1040.line24_total_tax,
  );
  if (
    Number(pending.form6251?.line11_amt ?? 0) <= 0 ||
    Number(withoutPending.form6251?.line11_amt ?? 0) <= 0
  ) {
    throw new Error("ISO source did not yield positive AMT on both returns");
  }
  const xml = buildMefXml(pending, iso.filer);
  assertStringIncludes(xml, "<DeferredTaxAmt>");
  await assertFullXsd(xml);
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    iso.filer,
    ".pdf-cache",
    undefined,
    origins,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
  const review = Deno.env.get("FORM8621_AMT_REVIEW_PDF");
  if (review) await Deno.writeFile(review, pdf);
  const changed = structuredClone(pending) as Record<string, any>;
  changed.form8621_1294_refigure.source_inputs.f3921[0]
    .box4_fmv_per_share++;
  assertThrows(
    () => buildMefXml(changed, iso.filer),
    Error,
    "Form 8621 section 1294",
  );
});

Deno.test("Form 8621 Election B refigures sourced Schedule J farm tax", async () => {
  const inputs = { ...farm.inputs, f8621: [holding] };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const filed = pending.f1040! as Record<string, number>;
  const without = f1040_2025.executeReturn({
    ...inputs,
    f8621: [{
      ...holding,
      qef_ordinary_income: 0,
      qef_capital_gain: 0,
      qef_1294_election: undefined,
    }],
  });
  assertEquals(without.diagnostics, []);
  const without1040 = buildPending(without.pending).f1040! as Record<
    string,
    number
  >;
  assertEquals(filed.form8621_1294_total_tax_before_deferral, 21_433);
  assertEquals(without1040.line24_total_tax, 21_241);
  assertEquals(filed.form8621_1294_deferred_tax, 192);
  assertEquals(
    filed.form8621_1294_deferred_tax,
    filed.form8621_1294_total_tax_before_deferral -
      without1040.line24_total_tax,
  );
  const xml = buildMefXml(pending, farm.filer);
  assertStringIncludes(xml, "<DeferredTaxAmt>");
  await assertFullXsd(xml);
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    farm.filer,
    ".pdf-cache",
    undefined,
    origins,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
  const review = Deno.env.get("FORM8621_SCHEDULEJ_REVIEW_PDF");
  if (review) await Deno.writeFile(review, pdf);
  const changed = structuredClone(pending) as Record<string, any>;
  changed.schedule_j_calculation.nonfarm_qef_ordinary++;
  assertThrows(
    () => buildMefXml(changed, farm.filer),
    Error,
    "Form 8621 section 1294",
  );
});

Deno.test("Form 8621 Election B refigures child Form 8615 tax", async () => {
  const inputs = {
    ...child.inputs,
    f8615: {
      ...(child.inputs.f8615 as Record<string, unknown>),
      child_unearned_income: 7_000,
    },
    f8621: [holding],
  };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  if (
    f1040_2025.executeReturn({
      ...inputs,
      f8615: child.inputs.f8615,
    }).diagnostics.length === 0
  ) {
    throw new Error("Form 8615 child unearned source omitted QEF income");
  }
  const pending = buildPending(result.pending);
  const filed = pending.f1040! as Record<string, number>;
  const without = f1040_2025.executeReturn({
    ...inputs,
    f8615: child.inputs.f8615,
    f8621: [{
      ...holding,
      qef_ordinary_income: 0,
      qef_capital_gain: 0,
      qef_1294_election: undefined,
    }],
  });
  assertEquals(without.diagnostics, []);
  const without1040 = buildPending(without.pending).f1040! as Record<
    string,
    number
  >;
  assertEquals(filed.form8621_1294_total_tax_before_deferral, 652);
  assertEquals(without1040.line24_total_tax, 412);
  assertEquals(filed.form8621_1294_deferred_tax, 240);
  assertEquals(
    filed.form8621_1294_deferred_tax,
    filed.form8621_1294_total_tax_before_deferral -
      without1040.line24_total_tax,
  );
  const xml = buildMefXml(pending, child.filer);
  assertStringIncludes(xml, "<DeferredTaxAmt>");
  await assertFullXsd(xml);
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    child.filer,
    ".pdf-cache",
    undefined,
    origins,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
  const review = Deno.env.get("FORM8621_8615_REVIEW_PDF");
  if (review) await Deno.writeFile(review, pdf);
  const changed = structuredClone(pending) as Record<string, any>;
  changed.form8621_1294_refigure.source_inputs.f8615
    .child_unearned_income++;
  assertThrows(
    () => buildMefXml(changed, child.filer),
    Error,
    "Form 8621 section 1294",
  );
});
