import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import {
  earlyRetirementGraph2026,
  earlyRetirementSource2026,
} from "../inputs/retirement-early.fixture.ts";
import { buildForm5329PdfBytes2026 } from "./form5329.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { FilingStatus } from "../../nodes/types.ts";

export function jointEarlyRetirementGraph2026() {
  const graph = earlyRetirementGraph2026(true);
  Object.assign(graph.general, {
    filing_status: FilingStatus.MFJ,
    spouse_first_name: "Alex",
    spouse_last_name: "Wheat",
    spouse_ssn: "555667777",
    spouse_dob: "1991-01-01",
    spouse_blind: false,
    spouse_can_be_claimed_as_dependent: false,
    spouse_citizen_national_or_work_authorized: true,
  });
  const spouse = earlyRetirementSource2026(true, 4000);
  const c = spouse.claim.copies[0];
  c.source_document_reference = "spouse-early";
  c.statement_identifier = "spouse-early";
  c.account_number = "spouse-account";
  c.recipient = "spouse";
  c.recipient_tin = "555667777";
  spouse.claim.reviews[0].source_document_reference =
    c.source_document_reference;
  graph.f1099r.claim.copies.push(c);
  graph.f1099r.claim.reviews.push(spouse.claim.reviews[0]);
  return graph;
}
async function inspect(
  bytes: Uint8Array,
  check: (
    read: (page: number, rect?: number[]) => Promise<string>,
  ) => Promise<void>,
) {
  const doc = await PDFDocument.load(bytes);
  assertEquals(doc.catalog.has(PDFName.of("AcroForm")), false);
  assertEquals(
    doc.getPages().some((p) => p.node.has(PDFName.of("Annots"))),
    false,
  );
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes);
    await check(async (page, rect) => {
      const args = ["-layout", "-f", String(page), "-l", String(page)];
      if (rect) {
        const [x, y, w, h] = rect;
        args.push(
          "-x",
          String(x),
          "-y",
          String(y),
          "-W",
          String(w),
          "-H",
          String(h),
        );
      }
      const r = await new Deno.Command("pdftotext", {
        args: [...args, path, "-"],
      }).output();
      assertEquals(r.code, 0);
      return new TextDecoder().decode(r.stdout).trim();
    });
  } finally {
    await Deno.remove(path);
  }
}
Deno.test("2026 all-code-1 draft uses direct Schedule 2 tax without Form 5329", async () => {
  const b = await buildDraftReturnPdf2026(earlyRetirementGraph2026());
  assertEquals(b.attachments.map((a) => a.form), ["f1040", "schedule2"]);
  assertEquals(b.calculation.pending.schedule2.line5_form5329_early_tax, 1000);
  await inspect(b.bytes, async (read) => {
    assertStringIncludes(await read(3), "1000");
    assertEquals(await read(3, [467, 421, 9, 9]), "✔");
    assertStringIncludes(await read(2), "1000");
  });
});
Deno.test("2026 SIMPLE draft prints source-derived Part I and omits unused parts and draft cover", async () => {
  const b = await buildDraftReturnPdf2026(earlyRetirementGraph2026(true));
  const part = b.attachments.find((a) => a.form === "form5329:taxpayer")!;
  assertEquals(part.formPages, [5, 6, 7]);
  assertEquals(part.statementPages, []);
  await inspect(b.bytes, async (read) => {
    assertEquals(await read(3, [467, 421, 9, 9]), "");
    assertEquals(await read(5, [36, 94, 438, 14]), "Sam Wheat");
    assertEquals(await read(5, [476, 94, 100, 14]), "400001037");
    assertEquals(await read(5, [505, 252, 71, 12]), "10000");
    assertEquals(await read(5, [505, 276, 71, 12]), "");
    assertEquals(await read(5, [505, 288, 71, 12]), "10000");
    assertEquals(await read(5, [505, 300, 71, 12]), "2500");
    assertStringIncludes(await read(7), "DRAFT - NOT FOR FILING");
  });
});
Deno.test("2026 joint early drafts retain separate owner identities and reconcile the combined tax", async () => {
  const b = await buildDraftReturnPdf2026(jointEarlyRetirementGraph2026());
  const forms = b.attachments.filter((a) => a.form.startsWith("form5329:"));
  assertEquals(forms.map((a) => a.form), [
    "form5329:taxpayer",
    "form5329:spouse",
  ]);
  assertEquals(b.calculation.pending.schedule2.line5_form5329_early_tax, 3500);
  await inspect(b.bytes, async (read) => {
    assertEquals(await read(forms[0].formPages[0], [505, 300, 71, 12]), "2500");
    assertEquals(
      await read(forms[1].formPages[0], [36, 94, 438, 14]),
      "Alex Wheat",
    );
    assertEquals(
      await read(forms[1].formPages[0], [476, 94, 100, 14]),
      "555667777",
    );
    assertEquals(await read(forms[1].formPages[0], [505, 300, 71, 12]), "1000");
  });
  const s = earlyRetirementSource2026(true);
  await assertRejects(
    () =>
      buildForm5329PdfBytes2026(s, "taxpayer", 2499, {
        name: "Sam Wheat",
        ssn: s.taxpayer_ssn,
      }),
    Error,
    "Schedule 2",
  );
  await assertRejects(
    () =>
      buildForm5329PdfBytes2026(s, "taxpayer", 2500, {
        name: "Alex Wheat",
        ssn: "555667777",
      }),
    Error,
    "identity",
  );
  await assertRejects(
    () =>
      buildForm5329PdfBytes2026(earlyRetirementSource2026(), "taxpayer", 1000, {
        name: "Sam Wheat",
        ssn: s.taxpayer_ssn,
      }),
    Error,
    "source-derived",
  );
});
