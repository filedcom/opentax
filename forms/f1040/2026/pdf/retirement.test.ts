import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { createHash } from "node:crypto";
import {
  retirementCopy2026,
  retirementGraph2026,
} from "../inputs/retirement.fixture.ts";
import { DistributionCode as Code } from "../../nodes/inputs/income/retirement/f1099r/distribution-code.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import type { RetirementCopy2026 } from "../inputs/retirement-source.ts";
import {
  disabilityMovingGraph2026,
  monthlyDisabilityCareGraph2026,
} from "../inputs/retirement-earned.fixture.ts";

Deno.test("2026 retirement draft prints combined line 1h while Form 3903 retains only the moving component", async () => {
  const r = await buildDraftReturnPdf2026(disabilityMovingGraph2026());
  const moving = r.attachments.find((a) => a.form === "form3903")!;
  assertEquals(moving.formPages.length, 1);
  await inspect(r.bytes, async (read) => {
    assertEquals(await read(1, [505, 246, 71, 12]), "7957");
    assertEquals(await read(1, [505, 150, 71, 12]), "3000");
    const text = await read(moving.formPages[0]);
    assertStringIncludes(text, "3000");
    assertEquals(text.includes("7001"), false);
    assertEquals(text.includes("7957"), false);
  });
});
Deno.test("2026 retirement draft prints monthly care income and leaves source payment evidence private", async () => {
  const r = await buildDraftReturnPdf2026(monthlyDisabilityCareGraph2026());
  assertEquals(r.attachments.some((a) => a.form === "form2441"), true);
  await inspect(r.bytes, async (read) => {
    assertEquals(await read(1, [505, 246, 71, 12]), "300");
    for (
      let page = 1;
      page <= (await PDFDocument.load(r.bytes)).getPageCount();
      page++
    ) {
      const text = await read(page);
      assertEquals(text.includes("plan-minimum-retirement-age-record"), false);
      assertEquals(text.includes("june-wages"), false);
    }
  });
});

export async function addRetirementIssuedPdf2026(c: RetirementCopy2026) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  page.drawText("SYNTHETIC 2026 FORM 1099-R SOURCE - TEST ONLY", {
    x: 36,
    y: 730,
    size: 12,
  });
  page.drawText(
    `${c.source_document_reference}\nRecipient: ${c.recipient_tin}\nBox 1: ${c.box1_gross_distribution}\nBox 2a: ${
      c.box2a_taxable_amount ?? "undetermined"
    }\nBox 4: ${c.box4_federal_withheld ?? 0}\nBox 7a: ${
      c.box7a_distribution_codes.join(" ")
    }`,
    { x: 36, y: 690, size: 10, lineHeight: 18 },
  );
  const bytes = await doc.save({ useObjectStreams: false });
  Object.assign(c, {
    issued_copy_pdf_base64: btoa(String.fromCharCode(...bytes)),
    issued_copy_pdf_sha256: createHash("sha256").update(bytes).digest("hex"),
    issued_copy_attachment_file_name: `${c.source_document_reference}.pdf`,
  });
  return bytes;
}
async function inspect(
  bytes: Uint8Array,
  body: (
    read: (page: number, rect?: number[]) => Promise<string>,
  ) => Promise<void>,
) {
  const doc = await PDFDocument.load(bytes);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(
    doc.getPages().some((p) => p.node.has(PDFName.of("Annots"))),
    false,
  );
  const file = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(file, bytes);
    await body(async (page, rect) => {
      const args = ["-layout", "-f", String(page), "-l", String(page)];
      if (rect) {
        const [x, y, w, h] = rect;
        args.push(
          "-x",
          String(x),
          "-y",
          String(792 - y - h),
          "-W",
          String(w),
          "-H",
          String(h),
        );
      }
      const r = await new Deno.Command("pdftotext", {
        args: [...args, file, "-"],
      }).output();
      assertEquals(r.code, 0);
      return new TextDecoder().decode(r.stdout).trim();
    });
  } finally {
    await Deno.remove(file);
  }
}
Deno.test("2026 retirement PDF prints only taxable-only IRA and both partial pension lines, keeping exact withheld originals", async () => {
  const ira = retirementCopy2026("ira", true),
    pension = retirementCopy2026("pension");
  pension.box2a_taxable_amount = 10000.25;
  const original = await addRetirementIssuedPdf2026(ira),
    original2 = await addRetirementIssuedPdf2026(pension);
  const r = await buildDraftReturnPdf2026(retirementGraph2026([ira, pension]));
  assertEquals(r.sourceAttachments.length, 2);
  assertEquals(r.sourceAttachments[0].bytes, original);
  assertEquals(r.sourceAttachments[1].bytes, original2);
  assertEquals(r.sourceAttachments[0].requiredForForms, ["f1040"]);
  assertEquals(r.sourceAttachments[0].pages, 1);
  await inspect(r.bytes, async (read) => {
    assertEquals(await read(1, [253, 174, 70, 12]), "");
    assertEquals(await read(1, [505, 174, 71, 12]), "12000");
    assertEquals(await read(1, [253, 150, 70, 12]), "12000");
    assertEquals(await read(1, [505, 150, 71, 12]), "10000");
    assertEquals(await read(2, [411, 456, 71, 12]), "2001");
    assertStringIncludes(await read(1), "DRAFT - NOT FOR FILING");
  });
});
Deno.test("2026 pension PDF leaves fully taxable gross blank but retains direct rollover gross and zero taxable", async () => {
  const c = retirementCopy2026();
  c.box4_federal_withheld = 0;
  await inspect(
    (await buildDraftReturnPdf2026(retirementGraph2026([c]))).bytes,
    async (read) => {
      assertEquals(await read(1, [253, 150, 70, 12]), "");
      assertEquals(await read(1, [505, 150, 71, 12]), "12000");
    },
  );
  c.box7a_distribution_codes = [Code.CodeG];
  c.box2a_taxable_amount = 0;
  const graph = retirementGraph2026([c]);
  graph.f1099r.claim.reviews[0].direct_rollover = {
    record_reference: "transfer-proof",
    transfer_date: "2026-12-01",
    destination_account_reference: "destination-ira",
    destination_type: "traditional_ira",
    amount_transferred: 12000.25,
    source_after_tax_basis: 0,
    eligible_direct_transfer_no_rmd_or_other_ineligible_amount_verified: true,
    no_cash_received_by_filer_verified: true,
  };
  const b = await buildDraftReturnPdf2026(graph);
  assertEquals(b.calculation.pending.f1040.line5c_rollover, true);
  await inspect(b.bytes, async (read) => {
    assertEquals(await read(1, [253, 150, 70, 12]), "12000");
    assertEquals(await read(1, [505, 150, 71, 12]), "0");
  });
});
Deno.test("2026 retirement PDFs require unchanged readable current issued copies for positive withholding", async () => {
  const graph = retirementGraph2026();
  await assertRejects(
    () => buildDraftReturnPdf2026(graph),
    Error,
    "original issued PDF",
  );
  const old = graph.f1099r.claim.copies[0];
  await addRetirementIssuedPdf2026(old);
  const corrected = {
    ...old,
    corrected: true,
    source_document_reference: "corrected",
    supersedes_document_reference: old.source_document_reference,
    box4_federal_withheld: 777,
  };
  const bytes = await addRetirementIssuedPdf2026(corrected);
  graph.f1099r.claim.copies.push(corrected);
  graph.f1099r.claim.reviews[0].source_document_reference = "corrected";
  const b = await buildDraftReturnPdf2026(graph);
  assertEquals(b.sourceAttachments.length, 1);
  assertEquals(b.sourceAttachments[0].bytes, bytes);
  assertEquals(b.sourceAttachments[0].reference, "corrected");
  corrected.issued_copy_pdf_sha256 = "0".repeat(64);
  await assertRejects(() => buildDraftReturnPdf2026(graph), Error, "digest");
  const first = retirementCopy2026("first"),
    second = retirementCopy2026("second");
  await addRetirementIssuedPdf2026(first);
  await addRetirementIssuedPdf2026(second);
  second.issued_copy_attachment_file_name =
    first.issued_copy_attachment_file_name;
  await assertRejects(
    () => buildDraftReturnPdf2026(retirementGraph2026([first, second])),
    Error,
    "distinct filenames",
  );
});
