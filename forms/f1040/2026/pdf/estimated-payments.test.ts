import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { estimatedPaymentGraph2026 } from "../inputs/estimated-payments.fixture.ts";
import { executeDraftSources2026 } from "../execute.ts";
import { calculateEstimatedPayments2026 } from "../inputs/estimated-payments.ts";
import { buildF1040PdfBytes2026 } from "./f1040.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";

async function inspect(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(
    doc.getPages().some((p) => p.node.has(PDFName.of("Annots"))),
    false,
  );
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes);
    const result = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
    }).output();
    assertEquals(result.code, 0);
    return new TextDecoder().decode(result.stdout).split("\f");
  } finally {
    await Deno.remove(path);
  }
}

Deno.test("2026 estimated receipts and prior credit reconcile through the 1040 and split-refund drafts", async () => {
  const input = estimatedPaymentGraph2026();
  const bundle = await buildDraftReturnPdf2026(input);
  const pages = await inspect(bundle.bytes);
  for (const value of ["1801", "12069", "8186"]) {
    assertStringIncludes(pages[1], value);
  }
  const refund = pages[
    bundle.attachments.find((a) => a.form === "form8888")!.formPages[0] - 1
  ];
  for (const value of ["7186", "1000", "8186"]) {
    assertStringIncludes(refund, value);
  }
  assertEquals(bundle.filingReady, false);
  assertEquals(bundle.calculation.diagnostics, []);
});

Deno.test("2026 agreed allocations print a former-spouse SSN only for the divorced payment route", async () => {
  for (const kind of ["divorced", "mfs"] as const) {
    const bundle = await buildDraftReturnPdf2026(
      estimatedPaymentGraph2026(kind),
    );
    const pages = await inspect(bundle.bytes);
    assertStringIncludes(pages[1], "300");
    assertStringIncludes(pages[1], "6685");
    assertEquals(
      pages[1].replace(/\s/g, "").includes("400001038"),
      kind === "divorced",
    );
    if (kind === "mfs") {
      assertStringIncludes(pages[0].replace(/\s/g, ""), "400001038");
      assertEquals(pages[0].match(/Pat Wheat/g)?.length, 1);
      assertStringIncludes(
        pages[0].split("\n").find((line) => line.includes("Pat Wheat"))!,
        "spouse",
      );
    }
    assert(!bundle.attachments.some((a) => a.form === "f1040es"));
  }
});

Deno.test("2026 Form 1040 payment printing requires the retained sources, amounts and correct owner", async () => {
  const input = estimatedPaymentGraph2026("divorced");
  const result = await executeDraftSources2026(input);
  const source =
    (result.pending.estimated_payments.calculation_2026 as ReturnType<
      typeof calculateEstimatedPayments2026
    >).source_input;
  const f = result.pending.f1040;
  await assertRejects(
    () => buildF1040PdfBytes2026(f, input.refund_allocation.claim),
    Error,
    "retained estimated-payment",
  );
  await assertRejects(
    () =>
      buildF1040PdfBytes2026(
        { ...f, line26_estimated_payments: 301 },
        input.refund_allocation.claim,
        source,
      ),
    Error,
    "disagrees",
  );
  await assertRejects(
    () =>
      buildF1040PdfBytes2026(
        { ...f, line26_former_spouse_ssn: "999887777" },
        input.refund_allocation.claim,
        source,
      ),
    Error,
    "disagrees",
  );
  await assertRejects(
    () =>
      buildF1040PdfBytes2026(
        { ...f, taxpayer_ssn: "999887777" },
        input.refund_allocation.claim,
        source,
      ),
    Error,
    "another filer",
  );
});
