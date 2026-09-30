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

async function verifyReturn(
  id: string,
  partnerships: readonly Record<string, unknown>[],
  sCorps: readonly Record<string, unknown>[],
  expectedGain: number,
  expectedPages: number,
): Promise<void> {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...base.inputs,
      ...(partnerships.length ? { k1_partnership: partnerships } : {}),
      ...(sCorps.length ? { k1_s_corp: sCorps } : {}),
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4797.section_1231_gain, expectedGain);
  assertEquals(result.pending.schedule_d.line_11_form2439, expectedGain);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertEquals(
    (bundle.xml.match(/<PropertySaleOrExchange>/g) ?? []).length,
    partnerships.length + sCorps.length,
  );
  assertStringIncludes(
    bundle.xml,
    `<CapitalGainLossAmt>${expectedGain}</CapitalGainLossAmt>`,
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
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), expectedPages);
  if (Deno.args.includes("--write-review-artifacts")) {
    const directory = new URL(
      `../../../../.state/research/ty2025-filled-pdf-review/2026-09-30-${id}/`,
      import.meta.url,
    ).pathname;
    await Deno.mkdir(directory, { recursive: true });
    await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
  }
}

Deno.test("partnership and S corporation K-1 section 1231 rows reach filled Form 4797", async () => {
  await verifyReturn(
    "form4797-two-k1-line2",
    [{
      partnership_name: "Partner One",
      partnership_ein: "123456789",
      source_document_reference: "2025 partner K-1 source",
      recipient_tin: "111223333",
      box10_net_1231: 10_000,
    }],
    [{
      corporation_name: "Corp Two",
      corporation_ein: "987654321",
      source_document_reference: "2025 S corporation K-1 source",
      recipient_tin: "111223333",
      box9_net_1231: -3_000,
    }],
    7_000,
    6,
  );
});

Deno.test("six K-1 section 1231 rows print with a reconciled line 2 continuation", async () => {
  const amounts = [10_000, 2_000, -1_000, 3_000, -2_000, 4_000];
  const partnerships = amounts.map((amount, index) => ({
    partnership_name: `Partner ${index + 1}`,
    partnership_ein: String(123456780 + index),
    source_document_reference: `2025 partner K-1 source ${index + 1}`,
    recipient_tin: "111223333",
    box10_net_1231: amount,
  }));
  await verifyReturn(
    "form4797-six-k1-line2",
    partnerships,
    [],
    16_000,
    7,
  );
});

Deno.test("a net K-1 section 1231 loss reaches the ordinary Form 1040 path", async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...base.inputs,
      k1_partnership: [{
        partnership_name: "Partner Loss",
        partnership_ein: "123456789",
        source_document_reference: "2025 partner loss K-1 source",
        recipient_tin: "111223333",
        box10_net_1231: -4_000,
      }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.form4797.section_1231_gain, -4_000);
  assertEquals(result.pending.schedule1.line4_other_gains, -4_000);
  const pending = buildPending(result.pending);
  const bundle = await buildMefBundle(pending, {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<OtherGainLossAmt>-4000</OtherGainLossAmt>",
  );
  const pdf = await buildPdfBytes(pending, base.filer, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 6);
});
