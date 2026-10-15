import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { businessLossGraphFixture2026 } from "../inputs/business-loss-graph.fixture.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
async function texts(bytes: Uint8Array) {
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, bytes);
    const r = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
    }).output();
    assertEquals(r.code, 0);
    return new TextDecoder().decode(r.stdout).split("\f");
  } finally {
    await Deno.remove(path);
  }
}
Deno.test("2026 loss bundle reconciles Form 461, Schedule 1, 1040 and allowed-loss QBI", async () => {
  const r = await buildDraftReturnPdf2026(businessLossGraphFixture2026());
  const doc = await PDFDocument.load(r.bytes), t = await texts(r.bytes);
  assert(!doc.catalog.has(PDFName.of("AcroForm")));
  assert(doc.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  const form = (name: string) => r.attachments.find((a) => a.form === name)!;
  const loss = form("form461"), qbi = form("form8995"), s1 = form("schedule1");
  assertEquals(loss.formPages.length, 1);
  assert(qbi.formPages[0] < loss.formPages[0]);
  assertStringIncludes(t[loss.formPages[0] - 1], "(144000)");
  assertStringIncludes(t[s1.formPages[0] - 1], "144000");
  assertStringIncludes(t[qbi.formPages[0] - 1], "256000");
  assertEquals(r.calculation.pending.f1040.line11b_agi, 144000);
});
Deno.test("2026 bundle includes filing-only Form 461 and omits the exact-trigger form", async () => {
  for (const [loss, required] of [[128001, true], [128000, false]] as const) {
    const r = await buildDraftReturnPdf2026(
      businessLossGraphFixture2026([-loss], 300000),
    );
    assertEquals(r.attachments.some((a) => a.form === "form461"), required);
    if (required) {
      const t = await texts(r.bytes),
        p = r.attachments.find((a) => a.form === "form461")!.formPages[0];
      assertStringIncludes(t[p - 1], "127999");
    }
  }
  const f = businessLossGraphFixture2026([-128001], 300000);
  delete (f.schedule_c.claim as any).loss_limit_review;
  await assertRejects(
    () => buildDraftReturnPdf2026(f),
    Error,
    "business-loss review",
  );
});
