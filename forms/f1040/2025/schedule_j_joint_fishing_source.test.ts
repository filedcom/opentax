// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "./index.ts";
import { scheduleJJointFishingInputs } from "./schedule_j_joint_fishing.fixture.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { normalizeAllPending } from "./pending.ts";
import { assertScheduleJSourceReturn } from "./schedule_j_source_return.ts";

const evidenceDir = Deno.env.get("SCHEDULE_J_JOINT_EVIDENCE_DIR") ??
  ".state/research/schedulej-joint-fishing-oct6/packets";
const xsd = Deno.env.get("SCHEDULE_J_JOINT_XSD_PATH") ??
  ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd";

async function packet(id: string, input: Record<string, unknown>) {
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const pending: any = normalizeAllPending(result.pending);
  const filer = extractFilerIdentity(pending.f1040)!;
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    prepared.bundle.pending,
    filer,
    ".pdf-cache",
    prepared.bundle,
    origins,
  );
  const dir = `${evidenceDir}/${id}`;
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
  const validation = await new Deno.Command("xmllint", {
    args: ["--noout", "--schema", xsd, `${dir}/return.xml`],
    stderr: "piped",
  }).output();
  assertEquals(validation.code, 0, new TextDecoder().decode(validation.stderr));
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
  return { result, pending, origins, xml: prepared.bundle.xml };
}

Deno.test("joint primary/spouse farm and fishing source elects owner-specific Schedule J and QBI", async () => {
  for (const fishingOwner of ["S", "T"] as const) {
    const input = scheduleJJointFishingInputs(fishingOwner);
    const noJInput = structuredClone(input) as any;
    delete noJInput.schedule_j;
    const noJ = await packet(`joint-${fishingOwner}-without-j`, noJInput);
    const elected = await packet(`joint-${fishingOwner}`, input);
    const p = elected.pending;
    assertScheduleJSourceReturn(elected.result.pending);
    assertEquals(p.f1040.filing_status, "mfj");
    assertEquals(p.schedule1.line3_schedule_c, 120_000);
    assertEquals(p.schedule1.line6_schedule_f, 200_000);
    assertEquals(p.schedule1.line15_se_deduction, 22_074);
    assertEquals(p.f1040.line13_qbi_deduction, 52_965);
    assertEquals(p.f1040.line15_taxable_income, 211_861);
    assertEquals(p.schedule_j.line2a, 15_000);
    assertEquals(p.schedule_j.line23, 34_637);
    assertEquals(p.f1040.line16_income_tax, 34_637);
    assertEquals(p.form8995.joint_owner_filing_rows.length, 2);
    assertEquals(p.form8995a, undefined);
    assertEquals(p.schedule_se.owner_instances.length, 2);
    const cOwner = p.schedule_se.owner_instances.find((row: any) =>
      row.recipient === fishingOwner
    );
    const fOwner = p.schedule_se.owner_instances.find((row: any) =>
      row.recipient !== fishingOwner
    );
    assertEquals(cOwner.line13, 8_478);
    assertEquals(fOwner.line13, 13_596);
    assertEquals(noJ.pending.f1040.line13_qbi_deduction, 52_965);
    assertEquals((elected.xml.match(/<IRS1040ScheduleSE /g) ?? []).length, 2);
    assertEquals((elected.xml.match(/<IRS1040ScheduleC /g) ?? []).length, 1);
    assertEquals((elected.xml.match(/<IRS1040ScheduleF /g) ?? []).length, 1);
    assertEquals((elected.xml.match(/<IRS8995 /g) ?? []).length, 1);
    assert(elected.origins.some((origin) => origin.formKey === "schedule_j"));
  }
});

Deno.test("joint Schedule J source and owner conflicts cannot be exported", async () => {
  const good: any = scheduleJJointFishingInputs();
  const invalid = [];
  const wrongLedger = structuredClone(good);
  wrongLedger.schedule_c[0].proprietor_recipient = "T";
  invalid.push(wrongLedger);
  const absentSpouse = structuredClone(good);
  delete absentSpouse.general.spouse_ssn;
  invalid.push(absentSpouse);
  const wrongStatus = structuredClone(good);
  wrongStatus.general.filing_status = "single";
  invalid.push(wrongStatus);
  const missingPrior = structuredClone(good);
  delete missingPrior.schedule_j.base_year_source.base_returns.year2023
    .filed_return_reference;
  invalid.push(missingPrior);
  const wrongCatch = structuredClone(good);
  wrongCatch.schedule_c[0].schedule_j_fishing_evidence.retained_catch_ledger
    .sha256 = "0".repeat(64);
  invalid.push(wrongCatch);
  for (const input of invalid) {
    assertThrows(() => f1040_2025.executeReturn(input));
  }
  const result = f1040_2025.executeReturn(good);
  assertEquals(result.diagnostics, []);
  const filer = extractFilerIdentity(
    normalizeAllPending(result.pending).f1040,
  )!;
  for (
    const change of [
      (p: any) => p.schedule_se.owner_instances[1].line13++,
      (p: any) => p.form8995.joint_owner_filing_rows[0].se_tax_deduction++,
      (p: any) => p.schedule_j_calculation.fishing_net_profit++,
    ]
  ) {
    const pending: any = structuredClone(result.pending);
    change(pending);
    assertThrows(() => assertScheduleJSourceReturn(pending));
    await assertRejects(() => f1040_2025.prepareReturn(pending, filer));
    await assertRejects(() => buildPdfBytes(pending, filer, ".pdf-cache"));
  }
});
