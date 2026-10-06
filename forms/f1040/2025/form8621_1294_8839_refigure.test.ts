import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { buildMefBundle } from "./mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { assertForm8621QefRefigureSource } from "./form8621_1294_refigure.ts";
import { f1040_2025 } from "./index.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { PficRegime } from "../nodes/inputs/f8621/index.ts";
import { createHash } from "node:crypto";
import { buildPending } from "./mef/pending.ts";
const base = pdfReviewFixtures.find((x) =>
  x.id === "single-reviewed-adoption-credit"
)!;
const cp = (id: string, s: string) => ({
  document_id: id,
  sha256: createHash("sha256").update(s).digest("hex"),
  bytes_base64: btoa(s),
});
const holding = {
  company_name: "QEF Adoption Fund",
  company_ein_or_ref: "QEFADOPT1",
  country_of_incorporation: "Ireland",
  regime: PficRegime.QEF,
  shares_owned: 100,
  fmv_at_year_end: 20000,
  qef_ordinary_income: 2000,
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
      year_end_value_usd: 20000,
    }],
    jointly_owned_with_spouse: false,
    shares_acquired_during_2025: true,
    acquisition_date: "2025-01-01",
    election_status: "qef_new_2025",
    no_outstanding_section1294_election: true,
    issuer_record: cp("issuer", "Issuer 2025 report"),
    qef_annual_statement: {
      ...cp("qef", "QEF annual 2000 ordinary"),
      ordinary_earnings_usd: 2000,
      net_capital_gain_usd: 0,
    },
    qef_1294_activity_record: {
      ...cp("activity", "No distributions or transfers"),
      distributions_cash_and_property_usd: 0,
      transferred_share_earnings_usd: 0,
    },
  },
  qef_1294_election: {
    distributions_cash_and_property_usd: 0,
    transferred_share_earnings_usd: 0,
    undistributed_ordinary_earnings_usd: 2000,
    undistributed_capital_gain_usd: 0,
    no_section951_inclusion: true,
  },
};
Deno.test("Form 8621 Election B composes the reviewed Form 8839 staged return in both tax runs", async () => {
  const input = { ...base.inputs, f8621: [holding] };
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertForm8621QefRefigureSource(pending);
  const filed = pending.f1040! as Record<string, number>;
  const without = f1040_2025.executeReturn({
    ...input,
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
  assertEquals(filed.line24_total_tax, without1040.line24_total_tax);
  assertEquals(filed.form8621_1294_total_tax_before_deferral, 7895);
  assertEquals(filed.form8621_1294_deferred_tax, 440);
  assertEquals(filed.line24_total_tax, 7455);
  assertEquals(pending.schedule3?.line6c_adoption_credit, 6000);
  assertEquals(filed.line30_refundable_adoption, 5000);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: base.attachments!,
  });
  assertStringIncludes(bundle.xml, "<IRS8621");
  assertStringIncludes(bundle.xml, "<IRS8839");
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    base.filer,
    ".pdf-cache",
    bundle,
    origins,
  );
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
  assertEquals(origins.map(({ formKey }) => formKey), [
    "f1040",
    "f1040",
    "schedule1",
    "schedule1",
    "schedule1",
    "schedule3",
    "form8621",
    "form8621",
    "form8839",
  ]);
  const dir = Deno.env.get("FORM8621_ADOPTION_EVIDENCE_DIR") ??
    ".state/research/form8621-qef-adoption";
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(
    `${dir}/source-pending.json`,
    JSON.stringify({ input, pending }, null, 2),
  );
  await Deno.writeFile(`${dir}/return.pdf`, pdf);
  await Deno.writeTextFile(
    `${dir}/return.xml`,
    bundle.xml,
  );
  await Deno.writeTextFile(
    `${dir}/origins.json`,
    JSON.stringify(origins, null, 2),
  );
  const xsd = await new Deno.Command("xmllint", {
    args: [
      "--noout",
      "--schema",
      ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      `${dir}/return.xml`,
    ],
    stderr: "piped",
  }).output();
  assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
  const tampered = structuredClone(pending) as Record<string, unknown>;
  const marker = tampered.form8621_1294_refigure as {
    source_inputs: { w2: { box1_wages: number }[] };
  };
  marker.source_inputs.w2[0].box1_wages += 1;
  assertThrows(
    () => assertForm8621QefRefigureSource(tampered),
    Error,
    "differs from full source",
  );
  await assertRejects(
    () =>
      buildMefBundle(tampered, {
        filer: base.filer,
        attachments: base.attachments!,
      }),
    Error,
    "Form 8621 section 1294",
  );
  await assertRejects(
    () => buildPdfBytes(tampered, base.filer),
    Error,
    "Form 8621 section 1294",
  );
});
