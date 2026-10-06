// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { createHash } from "node:crypto";
import { f1040_2025 } from "./index.ts";
import { scheduleJJointFishingPositiveLimitsInputs } from "./schedule_j_joint_fishing.fixture.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { normalizeAllPending } from "./pending.ts";
import { assertScheduleJSourceReturn } from "./schedule_j_source_return.ts";
import { calculateMixedFishingQbi } from "../nodes/intermediate/forms/form8995a/mixed-fishing.ts";

const evidenceDir = Deno.env.get("SCHEDULE_J_JOINT_POSITIVE_EVIDENCE_DIR") ??
  ".state/research/schedulej-joint-positive-oct6/packets";
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

Deno.test("joint C/F wages and UBIA derive three distinct full phase-out limits", async () => {
  for (
    const [kind, owner, wages, ubia, rowDed, preQbi, tax, noJTax] of [
      ["wages", "S", 20_000, 0, 10_000, 614_167, 146_803, 150_553],
      ["property", "S", 0, 400_000, 10_000, 635_690, 154_336, 158_086],
      ["combined", "S", 20_000, 400_000, 15_000, 614_167, 145_053, 148_803],
      ["combined", "T", 20_000, 400_000, 15_000, 614_167, 145_053, 148_803],
    ] as const
  ) {
    const input = scheduleJJointFishingPositiveLimitsInputs(kind, owner);
    const noJInput: any = structuredClone(input);
    delete noJInput.schedule_j;
    const noJ = await packet(`${kind}-${owner}-without-j`, noJInput);
    const elected = await packet(`${kind}-${owner}`, input);
    const p = elected.pending;
    const q = calculateMixedFishingQbi(p.form8995a);
    assertScheduleJSourceReturn(elected.result.pending);
    assertEquals(q.profits[0], 200_000);
    assertEquals(q.profits[1], wages ? 478_185 : 500_000);
    assertEquals(q.rows.map((row) => row.lines.line15), [0, rowDed]);
    assertEquals(q.rows.map((row) => row.details.business_w2_wages), [
      0,
      wages,
    ]);
    assertEquals(q.rows.map((row) => row.details.business_ubia), [0, ubia]);
    assertEquals(p.form8995a.taxable_income, preQbi);
    assertEquals(p.f1040.line13_qbi_deduction, rowDed);
    assertEquals(p.f1040.line16_income_tax, tax);
    assertEquals(p.schedule_j.line23, tax);
    assertEquals(p.form6251.regular_tax, noJTax);
    assertEquals(noJ.pending.form6251.regular_tax, noJTax);
    assertEquals(noJ.pending.f1040.line16_income_tax, noJTax);
    assertEquals(noJ.pending.f1040.line13_qbi_deduction, rowDed);
    assertEquals(
      (elected.xml.match(/<QBIDeductionInformationGrp>/g) ?? []).length,
      2,
    );
    assertEquals((elected.xml.match(/<IRS8995A /g) ?? []).length, 1);
    assertEquals((elected.xml.match(/<IRS1040ScheduleSE /g) ?? []).length, 2);
    assert(elected.origins.some((origin) => origin.formKey === "form8995a"));
  }
});

Deno.test("joint positive QBI source rejects payroll, W-2, ownership, property, and final export conflicts", async () => {
  const good: any = scheduleJJointFishingPositiveLimitsInputs("combined");
  const invalid = [
    (v: any) =>
      v.schedule_f.schedule_fs[0].qbi_positive_limit_inventory.sha256 = "0"
        .repeat(64),
    (v: any) => v.schedule_f.schedule_fs[0].line22_labor_hired++,
    (v: any) => v.schedule_f.schedule_fs[0].line29_taxes++,
    (v: any) => v.schedule_f.schedule_fs[0].qbi_unadjusted_basis++,
  ];
  for (const change of invalid) {
    const v = structuredClone(good);
    change(v);
    assertThrows(() => f1040_2025.executeReturn(v));
  }
  const mutateBook = (change: (book: any) => void) => {
    const v = structuredClone(good);
    const proof = v.schedule_f.schedule_fs[0].qbi_positive_limit_inventory;
    const book = JSON.parse(atob(proof.bytes_base64));
    change(book);
    const bytes = new TextEncoder().encode(JSON.stringify(book));
    proof.bytes_base64 = btoa(String.fromCharCode(...bytes));
    proof.sha256 = createHash("sha256").update(bytes).digest("hex");
    assertThrows(() => f1040_2025.executeReturn(v));
  };
  mutateBook((b) => b.owner_ssn = "999999999");
  mutateBook((b) => b.issued_employee_w2_copies[0].box1_wages++);
  mutateBook((b) => b.issued_employee_w2_copies[0].issued_on = "2026-02-30");
  mutateBook((b) =>
    b.issued_employee_w2_copies[0].box3_social_security_wages = 176_101
  );
  mutateBook((b) => b.farm_product_sales[0].amount++);
  mutateBook((b) => b.months[9].payments[0].net_check_paid++);
  mutateBook((b) => b.months[9].payments[0].paid_on = "2025-10-32");
  mutateBook((b) => b.unemployment.state_tax_payment.amount++);
  mutateBook((b) => b.unemployment.futa_tax_payment.amount++);
  mutateBook((b) => b.unemployment.state_tax_payment.paid_on = "2025-02-30");
  mutateBook((b) =>
    b.owned_property_register[0].placed_in_service_on = "2010-01-01"
  );
  mutateBook((b) => b.owned_property_register[0].owner_ssn = "999999999");
  mutateBook((b) =>
    b.owned_property_register[0].prior_depreciation_ledger[0].deduction++
  );
  const result = f1040_2025.executeReturn(good);
  const filer = extractFilerIdentity(
    normalizeAllPending(result.pending).f1040,
  )!;
  const pending: any = structuredClone(result.pending);
  pending.form8995a.mixed_fishing_qbi_source.schedule_f
    .qbi_positive_limit_inventory.sha256 = "0".repeat(64);
  assertThrows(() => assertScheduleJSourceReturn(pending));
  await assertRejects(() => f1040_2025.prepareReturn(pending, filer));
  await assertRejects(() => buildPdfBytes(pending, filer, ".pdf-cache"));
});

Deno.test("cash farm deducts unemployment only when actually paid in 2025", () => {
  const input: any = scheduleJJointFishingPositiveLimitsInputs("wages");
  const f = input.schedule_f.schedule_fs[0];
  const proof = f.qbi_positive_limit_inventory;
  const book = JSON.parse(atob(proof.bytes_base64));
  book.unemployment.state_tax_payment.paid_on = "2026-01-15";
  book.unemployment.futa_tax_payment.paid_on = "2026-01-15";
  const bytes = new TextEncoder().encode(JSON.stringify(book));
  proof.bytes_base64 = btoa(String.fromCharCode(...bytes));
  proof.sha256 = createHash("sha256").update(bytes).digest("hex");
  f.line29_taxes = 1_530;
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const pending: any = normalizeAllPending(result.pending);
  assertEquals(calculateMixedFishingQbi(pending.form8995a).profits[1], 478_470);
  assertEquals(pending.f1040.line16_income_tax, 146_902);
  assertEquals(pending.f1040.line13_qbi_deduction, 10_000);
});
