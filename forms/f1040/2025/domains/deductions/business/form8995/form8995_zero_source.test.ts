import { assertEquals, assertStringIncludes } from "@std/assert";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
Deno.test("actual identified Single business retains zero-income-limit QBI source filing", async () => {
  const fixture = pdfReviewFixtures.find((f) => f.id === "single-schedule-c")!;
  const inputs: any = structuredClone(fixture.inputs);
  inputs.schedule_c[0].line_1_gross_receipts = 6000.50;
  inputs.schedule_c[0].proprietor_recipient = "T";
  inputs.schedule_c[0].line_32_at_risk = "a";
  const r = f1040_2025.executeReturn(inputs);
  assertEquals(r.diagnostics, []);
  const p = normalizeAllPending(r.pending);
  assertEquals(
    (p.schedule_c.schedule_cs as any[])[0].line_1_gross_receipts,
    6000.50,
  );
  assertEquals(p.schedule1.line3_schedule_c, 6001);
  assertEquals(p.form8995.line11, 0);
  assertEquals(p.form8995.qbi_deduction, 0);
  const prepared = await f1040_2025.prepareReturn(r.pending, fixture.filer);
  assertStringIncludes(prepared.bundle.xml, "<IRS8995 ");
  const validation = new Deno.Command("xmllint", {
    args: [
      "--noout",
      "--schema",
      ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      "-",
    ],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = validation.stdin.getWriter();
  await writer.write(new TextEncoder().encode(prepared.bundle.xml));
  await writer.close();
  const checked = await validation.output();
  assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  assertEquals((await prepared.renderPdf()).length > 0, true);
});
