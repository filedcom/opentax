// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../../index.ts";
import { scheduleJJointFishingAdvancedInputs } from "./schedule_j_joint_fishing.fixture.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { assertScheduleJSourceReturn } from "./schedule_j_source_return.ts";
import { calculateMixedFishingQbi } from "../../../../../nodes/intermediate/forms/deductions/business/form8995a/mixed-fishing.ts";

const evidenceDir = Deno.env.get("SCHEDULE_J_JOINT_ADVANCED_EVIDENCE_DIR") ??
  ".state/research/schedulej-joint-advanced-oct6/packets";
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

Deno.test("joint C/F above MFJ QBI threshold files two owner-specific 8995-A phase-in rows", async () => {
  for (const fishingOwner of ["S", "T"] as const) {
    const input = scheduleJJointFishingAdvancedInputs(fishingOwner);
    const noJInput = structuredClone(input) as any;
    delete noJInput.schedule_j;
    const noJ = await packet(`advanced-${fishingOwner}-without-j`, noJInput);
    const elected = await packet(`advanced-${fishingOwner}`, input);
    const p = elected.pending;
    const q = calculateMixedFishingQbi(p.form8995a);
    assertScheduleJSourceReturn(elected.result.pending);
    assertEquals(q.profits, [200_000, 300_000]);
    assertEquals(q.allocations, [13_596, 14_935]);
    assertEquals(q.rows.map((row) => row.lines.line2), [186_404, 285_065]);
    assertEquals(q.rows.map((row) => row.lines.line25), [16_318, 24_954]);
    assertEquals(q.rows.map((row) => row.lines.line26), [20_963, 32_059]);
    assertEquals(q.parent.line39, 53_022);
    assertEquals(p.form8995a.taxable_income, 438_369);
    assertEquals(p.f1040.line13_qbi_deduction, 53_022);
    assertEquals(p.f1040.line15_taxable_income, 385_347);
    assertEquals(p.f1040.line16_income_tax, 76_077);
    assertEquals(p.form6251.regular_tax, 78_177);
    assertEquals(noJ.pending.form6251.regular_tax, 78_177);
    assertEquals(noJ.pending.f1040.line16_income_tax, 78_177);
    assertEquals(noJ.pending.f1040.line13_qbi_deduction, 53_022);
    assertEquals(
      p.form8995a.mixed_fishing_qbi_source.joint_se_source.businesses.map(
        (row: any) => row.recipient,
      ),
      fishingOwner === "S" ? ["S", "T"] : ["T", "S"],
    );
    assertEquals(p.form8995?.line15, undefined); // no filed simplified calculation
    assertEquals(
      (elected.xml.match(/<QBIDeductionInformationGrp>/g) ?? []).length,
      2,
    );
    assertEquals((elected.xml.match(/<IRS1040ScheduleSE /g) ?? []).length, 2);
    assertEquals((elected.xml.match(/<IRS8995A /g) ?? []).length, 1);
    assert(elected.origins.some((origin) => origin.formKey === "form8995a"));
  }
});

Deno.test("advanced joint owner source and final filed 8995-A conflicts are rejected", async () => {
  const good: any = scheduleJJointFishingAdvancedInputs();
  const swapped = structuredClone(good);
  swapped.schedule_c[0].proprietor_recipient = "T";
  assertThrows(() => f1040_2025.executeReturn(swapped));
  const wrongLedger = structuredClone(good);
  wrongLedger.schedule_c[0].schedule_j_fishing_evidence.retained_catch_ledger
    .sha256 = "0".repeat(64);
  assertThrows(() => f1040_2025.executeReturn(wrongLedger));
  const unsourcedWages = structuredClone(good);
  unsourcedWages.schedule_c[0].qbi_w2_wages = 1_000;
  assertThrows(() => f1040_2025.executeReturn(unsourcedWages));
  const unsourcedUbia = structuredClone(good);
  unsourcedUbia.schedule_f.schedule_fs[0].qbi_unadjusted_basis = 10_000;
  assertThrows(() => f1040_2025.executeReturn(unsourcedUbia));
  const result = f1040_2025.executeReturn(good);
  assertEquals(result.diagnostics, []);
  const filer = extractFilerIdentity(
    normalizeAllPending(result.pending).f1040,
  )!;
  for (
    const change of [
      (p: any) => p.form8995a.mixed_fishing_qbi_source.se_tax_deduction++,
      (p: any) =>
        p.form8995a.mixed_fishing_qbi_source.joint_se_source.businesses[0]
          .net_profit++,
      (p: any) => p.form8995a.qbi++,
      (p: any) => p.f1040.line13_qbi_deduction++,
    ]
  ) {
    const pending: any = structuredClone(result.pending);
    change(pending);
    assertThrows(() => assertScheduleJSourceReturn(pending));
    await assertRejects(() => f1040_2025.prepareReturn(pending, filer));
    await assertRejects(() => buildPdfBytes(pending, filer, ".pdf-cache"));
  }
});
