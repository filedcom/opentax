import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import {
  businessGraphFixture2026,
  jointBusinessGraphFixture2026,
} from "../inputs/business-qbi.fixture.ts";
import { payment, vehicle, wage } from "../inputs/business.fixture.ts";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { buildBusinessPdfBytes2026 } from "./business.ts";
import type { calculateBusiness2026 } from "../nodes/business.ts";
import type { calculateDeductionSelection2026 } from "../nodes/standard_deduction.ts";

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
Deno.test("Business bundle reconciles Schedule C, SE and new QBI minimum to actual 1040 lines", async () => {
  const r = await buildDraftReturnPdf2026(businessGraphFixture2026());
  const doc = await PDFDocument.load(r.bytes), t = await texts(r.bytes);
  assert(!doc.catalog.has(PDFName.of("AcroForm")));
  assert(doc.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  const c = r.attachments.find((a) => a.form === "schedule_c")!;
  const se = r.attachments.find((a) => a.form === "schedule_se")!;
  const qbi = r.attachments.find((a) => a.form === "form8995")!;
  assertEquals(
    [c.formPages.length, se.formPages.length, qbi.formPages.length],
    [2, 1, 1],
  );
  assert(
    c.formPages[1] < se.formPages[0] && se.formPages[0] < qbi.formPages[0],
  );
  assertStringIncludes(t[c.formPages[0] - 1], "10000");
  assertStringIncludes(t[se.formPages[0] - 1], "1413");
  assertStringIncludes(t[se.formPages[0] - 1], "707");
  assertStringIncludes(t[qbi.formPages[0] - 1], "9293");
  assertStringIncludes(t[qbi.formPages[0] - 1], "400");
  const p = r.calculation.pending;
  const source = p.schedule_c.calculation_2026 as ReturnType<
    typeof calculateBusiness2026
  >;
  const selection = p.standard_deduction.calculation_input_2026 as Parameters<
    typeof calculateDeductionSelection2026
  >[0];
  await assertRejects(
    () =>
      buildBusinessPdfBytes2026(
        source.source_input,
        selection,
        {
          schedule1_line3: 9999,
          schedule1_line15: 707,
          schedule2_line4: 1413,
          form1040_line11b: 9293,
          form1040_line12e: 16100,
          form1040_line12f: 0,
          form1040_line13a: 0,
          form1040_line13b: 400,
          form1040_line15: 0,
        },
        { taxpayer: { name: "Synthetic Investor", ssn: "123456789" } },
        "schedule_c",
      ),
    Error,
    "disagree",
  );
});
Deno.test("Joint business drafts preserve both owners, vehicle lines and all overflow detail", async () => {
  const r = await buildDraftReturnPdf2026(jointBusinessGraphFixture2026());
  const t = await texts(r.bytes);
  const c = r.attachments.find((a) => a.form === "schedule_c")!;
  const se = r.attachments.find((a) => a.form === "schedule_se")!;
  const qbi = r.attachments.find((a) => a.form === "form8995")!;
  assertEquals(
    [c.formPages.length, se.formPages.length, qbi.formPages.length],
    [12, 2, 1],
  );
  assertEquals([c.statementPages.length, qbi.statementPages.length], [1, 1]);
  assert(c.statementPages[0] > qbi.formPages[0]);
  assertStringIncludes(t[c.formPages[0] - 1], "65");
  assertStringIncludes(t[c.formPages[1] - 1], "648");
  assertStringIncludes(t[c.formPages[1] - 1], "15150");
  assertStringIncludes(t[c.statementPages[0] - 1], "Current expense 12");
  assertStringIncludes(t[c.statementPages[0] - 1], "303");
  assertStringIncludes(t[se.formPages[1] - 1], "Synthetic Spouse");
  assertStringIncludes(t[qbi.statementPages[0] - 1], "987654321");
});
Deno.test("Statutory net attaches Schedule C and QBI without SE; current losses print as losses", async () => {
  const f = businessGraphFixture2026(), b = f.schedule_c.claim.businesses[0];
  b.kind = "statutory_employee";
  b.receipts = [];
  b.vehicle = vehicle();
  f.w2s = [{
    ...wage("123456789", 29623),
    box13_statutory_employee: true,
    schedule_c_business_reference: "consulting",
  }];
  const r = await buildDraftReturnPdf2026(f);
  assert(!r.attachments.some((a) => a.form === "schedule_se"));
  assertEquals(r.calculation.pending.f1040.line1a_wages ?? 0, 0);
  assertEquals(r.calculation.pending.f1040.line25a_w2_withheld, 100);
  b.kind = "sole_proprietor";
  b.vehicle = undefined;
  b.expenses = [{ ...payment("loss", 1000), category: "advertising" }];
  f.w2s = [wage("123456789", 50000)];
  const loss = await buildDraftReturnPdf2026(f), t = await texts(loss.bytes);
  const c = loss.attachments.find((a) => a.form === "schedule_c")!;
  assertStringIncludes(t[c.formPages[0] - 1], "(1000)");
  assertEquals(loss.calculation.pending.f1040.line13b_qbi, 0);
});
