// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { createHash } from "node:crypto";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { scheduleJNonfarmW2Inputs } from "./schedule_j_nonfarm_w2.fixture.ts";
import { assertScheduleJSourceReturn } from "./schedule_j_source_return.ts";
import { assertSingleFarmQbiReturn } from "./form8995a_single_farm_reconciliation.ts";

const outputDir = Deno.env.get("SCHEDULE_J_NONFARM_W2_EVIDENCE_DIR") ??
  ".state/research/schedulej-nonfarm-w2-source";

Deno.test("issued nonfarm W-2 joins high-income farm Schedule J, SE, zero-limited QBI and no-J AMT", async () => {
  const input = scheduleJNonfarmW2Inputs();
  const without = structuredClone(input);
  delete without.schedule_j;
  const noElection = f1040_2025.executeReturn(without);
  assertEquals(noElection.diagnostics, []);
  const noJ: any = normalizeAllPending(noElection.pending);
  const actual = f1040_2025.executeReturn(input);
  assertEquals(actual.diagnostics, []);
  const pending: any = normalizeAllPending(actual.pending);
  // The W-2 belongs to Ada, but its $100,000 was paid by the separately
  // identified engineering C corporation, not her Schedule F grain farm.
  assertEquals(pending.f1040.line1a_wages, 100_000);
  assertEquals(pending.f1040.line9_total_income, 335_000);
  assertEquals(pending.schedule_se.w2_ss_wages, 100_000);
  assertEquals(pending.schedule1.line15_se_deduction, 7_396);
  assertEquals(pending.f1040.line11_agi, 327_604);
  assertEquals(
    pending.form8995a.single_schedule_f_source.owner_w2_wage_sources[0]
      .employer_ein,
    "987654321",
  );
  assertEquals(pending.form8995a.business_filing_details.business_w2_wages, 0);
  assertEquals(pending.form8995a.business_filing_details.business_ubia, 0);
  assertEquals(pending.form8995a.qbi, 192_604);
  assertEquals(pending.f1040.line13_qbi_deduction, 0);
  assertEquals(pending.schedule_j.line3, 294_854);
  assertEquals(pending.schedule_j.line4, 66_746);
  assertEquals(pending.schedule_j.line23, 68_489);
  assertEquals(pending.f1040.line16_income_tax, 69_319);
  assertEquals(noJ.f1040.line16_income_tax, 72_826);
  assertEquals(pending.form6251.regular_tax, 71_996);
  assertEquals(noJ.form6251.regular_tax, 71_996);
  assertEquals(pending.form6251.line11_amt, 53_583);
  assertEquals(pending.f1040.line24_total_tax, 139_786);
  assertEquals(pending.f1040.line37_amount_owed, 119_786);
  assertScheduleJSourceReturn(actual.pending);
  assertSingleFarmQbiReturn(pending);
  const filer = extractFilerIdentity(pending.f1040)!;
  const prepared = await f1040_2025.prepareReturn(actual.pending, filer);
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    prepared.bundle.pending,
    filer,
    ".pdf-cache",
    prepared.bundle,
    origins,
  );
  const dir = `${outputDir}/elected`;
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(
    `${dir}/source-pending.json`,
    JSON.stringify({ input, pending }, null, 2),
  );
  await Deno.writeTextFile(`${dir}/return.xml`, prepared.bundle.xml);
  await Deno.writeFile(`${dir}/return.pdf`, pdf);
  await Deno.writeTextFile(
    `${dir}/origins.json`,
    JSON.stringify(origins, null, 2),
  );
  const xsd =
    ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";
  const validation = await new Deno.Command("xmllint", {
    args: ["--noout", "--schema", xsd, `${dir}/return.xml`],
    stderr: "piped",
  }).output();
  assertEquals(validation.code, 0, new TextDecoder().decode(validation.stderr));
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
  assertEquals(origins.length, 20);
  assertEquals((prepared.bundle.xml.match(/<IRSW2 /g) ?? []).length, 1);
  assertEquals((prepared.bundle.xml.match(/<IRS8995A /g) ?? []).length, 1);
  assertEquals((prepared.bundle.xml.match(/<IRS6251 /g) ?? []).length, 1);

  const noJPrepared = await f1040_2025.prepareReturn(noElection.pending, filer);
  const noJOrigins: PdfPageOrigin[] = [];
  const noJPdf = await buildPdfBytes(
    noJPrepared.bundle.pending,
    filer,
    ".pdf-cache",
    noJPrepared.bundle,
    noJOrigins,
  );
  const noJDir = `${outputDir}/without-j`;
  await Deno.mkdir(noJDir, { recursive: true });
  await Deno.writeTextFile(
    `${noJDir}/source-pending.json`,
    JSON.stringify({ input: without, pending: noJ }, null, 2),
  );
  await Deno.writeTextFile(`${noJDir}/return.xml`, noJPrepared.bundle.xml);
  await Deno.writeFile(`${noJDir}/return.pdf`, noJPdf);
  await Deno.writeTextFile(
    `${noJDir}/origins.json`,
    JSON.stringify(noJOrigins, null, 2),
  );
  const noJValidation = await new Deno.Command("xmllint", {
    args: ["--noout", "--schema", xsd, `${noJDir}/return.xml`],
    stderr: "piped",
  }).output();
  assertEquals(
    noJValidation.code,
    0,
    new TextDecoder().decode(noJValidation.stderr),
  );
  assertEquals(
    (await PDFDocument.load(noJPdf)).getPageCount(),
    noJOrigins.length,
  );
});

Deno.test("Schedule J nonfarm W-2 source and complete filed return reject conflicting wage attribution", async () => {
  const good = scheduleJNonfarmW2Inputs() as any;
  const rehash = (input: any, mutate: (record: any) => void) => {
    const proof = input.schedule_j.nonfarm_wage_source;
    const record = JSON.parse(atob(proof.bytes_base64));
    mutate(record);
    const bytes = new TextEncoder().encode(JSON.stringify(record));
    proof.bytes_base64 = btoa(String.fromCharCode(...bytes));
    proof.sha256 = createHash("sha256").update(bytes).digest("hex");
  };
  for (
    const [index, mutate] of [
      (i: any) => delete i.schedule_j.nonfarm_wage_source,
      (i: any) => i.schedule_j.nonfarm_wage_source.sha256 = "0".repeat(64),
      (i: any) => rehash(i, (r) => r.naics_code = "111100"),
      (i: any) => rehash(i, (r) => r.legal_entity_type = "s_corporation"),
      (i: any) => rehash(i, (r) => r.employer_ein = "123456789"),
      (i: any) => i.w2[0].employer_ein = "123456789",
      (i: any) => i.w2[0].employee_ssn = "999887777",
      (i: any) => i.w2[0].box1_wages++,
      (i: any) => i.w2[0].source_document_reference = "different-copy",
    ].entries()
  ) {
    const input = structuredClone(good);
    mutate(input);
    assertThrows(
      () => f1040_2025.executeReturn(input),
      Error,
      undefined,
      `source mutation ${index}`,
    );
  }
  const result = f1040_2025.executeReturn(good);
  assertEquals(result.diagnostics, []);
  const pending: any = normalizeAllPending(result.pending);
  const filer = extractFilerIdentity(pending.f1040)!;
  for (
    const mutate of [
      (p: any) => p.w2.w2s[0].box1_wages++,
      (p: any) =>
        p.form8995a.single_schedule_f_source.owner_w2_wage_sources[0]
          .box3_ss_wages++,
      (p: any) => p.schedule_se.w2_ss_wages++,
      (p: any) => p.schedule_j.line23++,
      (p: any) => p.f1040.line1z_total_wages++,
    ]
  ) {
    const altered = structuredClone(pending);
    mutate(altered);
    await assertRejects(() => f1040_2025.prepareReturn(altered, filer));
    await assertRejects(() => buildPdfBytes(altered, filer));
  }
});
