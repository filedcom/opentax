// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { createHash } from "node:crypto";
import { f1040_2025 } from "../../../index.ts";
import { scheduleJJointFishingZeroLimitInputs } from "./schedule_j_joint_fishing.fixture.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../pdf/builder.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { assertScheduleJSourceReturn } from "./schedule_j_source_return.ts";
import { calculateMixedFishingQbi } from "../../../../nodes/intermediate/forms/form8995a/mixed-fishing.ts";

const evidenceDir = Deno.env.get("SCHEDULE_J_JOINT_ZERO_EVIDENCE_DIR") ??
  ".state/research/schedulej-joint-zero-oct6/packets";
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

Deno.test("joint C/F above full MFJ QBI phase-out retains two zero-limited 8995-A rows", async () => {
  for (const fishingOwner of ["S", "T"] as const) {
    const input = scheduleJJointFishingZeroLimitInputs(fishingOwner);
    const noJInput: any = structuredClone(input);
    delete noJInput.schedule_j;
    const noJ = await packet(`zero-${fishingOwner}-without-j`, noJInput);
    const elected = await packet(`zero-${fishingOwner}`, input);
    const p = elected.pending;
    const q = calculateMixedFishingQbi(p.form8995a);
    assertScheduleJSourceReturn(elected.result.pending);
    assertEquals(q.profits, [200_000, 400_000]);
    assertEquals(q.allocations, [13_596, 16_275]);
    assertEquals(q.rows.map((row) => row.lines.line15), [0, 0]);
    assertEquals(q.parent.line39, 0);
    assertEquals(p.form8995a.taxable_income, 537_029);
    assertEquals(p.f1040.line13_qbi_deduction, 0);
    assertEquals(p.f1040.line15_taxable_income, 537_029);
    assertEquals(p.f1040.line16_income_tax, 123_305);
    assertEquals(p.schedule_j.line23, 123_305);
    assertEquals(noJ.pending.f1040.line16_income_tax, 127_055);
    assertEquals(p.form6251.regular_tax, 127_055);
    assertEquals(noJ.pending.form6251.regular_tax, p.form6251.regular_tax);
    assertEquals(noJ.pending.f1040.line13_qbi_deduction, 0);
    assertEquals(
      (elected.xml.match(/<QBIDeductionInformationGrp>/g) ?? []).length,
      2,
    );
    assertEquals((elected.xml.match(/<IRS8995A /g) ?? []).length, 1);
    assertEquals((elected.xml.match(/<IRS1040ScheduleSE /g) ?? []).length, 2);
    assert(elected.origins.some((origin) => origin.formKey === "form8995a"));
  }
});

Deno.test("full-phase-out QBI requires byte-bound complete owner-specific zero-limit books", async () => {
  const good: any = scheduleJJointFishingZeroLimitInputs();
  const missing = structuredClone(good);
  delete missing.schedule_c[0].qbi_zero_limit_inventory;
  assertThrows(() => f1040_2025.executeReturn(missing));
  const digest = structuredClone(good);
  digest.schedule_f.schedule_fs[0].qbi_zero_limit_inventory.sha256 = "0".repeat(
    64,
  );
  assertThrows(() => f1040_2025.executeReturn(digest));
  const wrongOwner = structuredClone(good);
  const proof = wrongOwner.schedule_f.schedule_fs[0].qbi_zero_limit_inventory;
  const book = JSON.parse(atob(proof.bytes_base64));
  book.owner_ssn = "999999999";
  const bytes = new TextEncoder().encode(JSON.stringify(book));
  proof.bytes_base64 = btoa(String.fromCharCode(...bytes));
  proof.sha256 = createHash("sha256").update(bytes).digest("hex");
  assertThrows(() => f1040_2025.executeReturn(wrongOwner));
  const hiddenPayroll = structuredClone(good);
  const payroll = hiddenPayroll.schedule_c[0].qbi_zero_limit_inventory;
  const ledger = JSON.parse(atob(payroll.bytes_base64));
  ledger.months[0].employee_payments.push({
    employee_ssn: "987654321",
    amount: 100,
  });
  const newBytes = new TextEncoder().encode(JSON.stringify(ledger));
  payroll.bytes_base64 = btoa(String.fromCharCode(...newBytes));
  payroll.sha256 = createHash("sha256").update(newBytes).digest("hex");
  assertThrows(() => f1040_2025.executeReturn(hiddenPayroll));
  const hiddenProperty = structuredClone(good);
  const propertyProof = hiddenProperty.schedule_f.schedule_fs[0]
    .qbi_zero_limit_inventory;
  const propertyBook = JSON.parse(atob(propertyProof.bytes_base64));
  propertyBook.months[5].qualifying_property.push({
    asset_reference: "grain-tractor-2025",
    unadjusted_basis: 12_000,
  });
  const propertyBytes = new TextEncoder().encode(JSON.stringify(propertyBook));
  propertyProof.bytes_base64 = btoa(String.fromCharCode(...propertyBytes));
  propertyProof.sha256 = createHash("sha256").update(propertyBytes).digest(
    "hex",
  );
  assertThrows(() => f1040_2025.executeReturn(hiddenProperty));
  const filedLabor = structuredClone(good);
  filedLabor.schedule_f.schedule_fs[0].line22_labor_hired = 1_000;
  assertThrows(() => f1040_2025.executeReturn(filedLabor));
  const unsourcedWages = structuredClone(good);
  unsourcedWages.schedule_c[0].qbi_w2_wages = 1;
  assertThrows(() => f1040_2025.executeReturn(unsourcedWages));
  const result = f1040_2025.executeReturn(good);
  const filer = extractFilerIdentity(
    normalizeAllPending(result.pending).f1040,
  )!;
  const pending: any = structuredClone(result.pending);
  pending.form8995a.mixed_fishing_qbi_source.schedule_f.qbi_zero_limit_inventory
    .sha256 = "0".repeat(64);
  assertThrows(() => assertScheduleJSourceReturn(pending));
  await assertRejects(() => f1040_2025.prepareReturn(pending, filer));
  await assertRejects(() => buildPdfBytes(pending, filer, ".pdf-cache"));
});
