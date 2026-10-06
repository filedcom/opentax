// deno-lint-ignore-file no-explicit-any
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "./index.ts";
import { normalizeAllPending } from "./pending.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import {
  scheduleJFishingCases,
  scheduleJFishingInputs,
} from "./schedule_j_fishing_source.fixture.ts";
import { assertScheduleJSourceReturn } from "./schedule_j_source_return.ts";

const evidenceDir = Deno.env.get("SCHEDULE_J_FISHING_EVIDENCE_DIR") ??
  ".state/research/schedulej-fishing-preferential-source";
const xsd = Deno.env.get("SCHEDULE_J_FISHING_XSD_PATH") ??
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

Deno.test("retained commercial catch, one/two farms and dividends refigure actual Schedule J source", async () => {
  for (const kind of scheduleJFishingCases) {
    const input = scheduleJFishingInputs(kind);
    const without = structuredClone(input) as any;
    delete without.schedule_j;
    const noJ = await packet(`${kind}-without-j`, without);
    const elected = await packet(kind, input);
    const p = elected.pending;
    assertScheduleJSourceReturn(elected.result.pending);
    assertEquals(
      p.schedule1.line3_schedule_c,
      kind === "fishing" ? 320_000 : 120_000,
    );
    assertEquals(
      p.schedule1.line6_schedule_f ?? 0,
      kind === "fishing" ? 0 : 200_000,
    );
    assertEquals(p.f1040.line3b_ordinary_dividends, 35_000);
    assertEquals(p.f1040.line3a_qualified_dividends, 30_000);
    assertEquals(p.schedule1.line15_se_deduction, 15_203);
    assertEquals(p.f1040.line11_agi, 339_797);
    assertEquals(p.f1040.line15_taxable_income, 322_047);
    // $322,047 exceeds the $197,300 single threshold plus its $100,000
    // wage/property phase-in. The three actual businesses report no W-2
    // wages or UBIA, so the current QBI deduction is zero.
    assertEquals(p.f1040.line13_qbi_deduction, undefined);
    assertEquals(p.form8995a, undefined);
    assertEquals(p.schedule_j.line2a, 15_000);
    assertEquals(p.schedule_j.line3, 307_047);
    assertEquals(p.schedule_j.line4, 71_014);
    assertEquals(p.schedule_j.line23, 72_757);
    assertEquals(p.f1040.line16_income_tax, 73_587);
    assertEquals(p.form6251.regular_tax, 76_264);
    assertEquals(noJ.pending.form6251.regular_tax, 76_264);
    assertEquals(
      elected.xml.includes(
        "<ElectedFarmIncomeAmt>15000</ElectedFarmIncomeAmt>",
      ),
      true,
    );
    assertEquals((elected.xml.match(/<IRS1040ScheduleC /g) ?? []).length, 1);
    assertEquals(
      (elected.xml.match(/<IRS1040ScheduleF /g) ?? []).length,
      kind === "fishing" ? 0 : kind === "mixed-one-farm" ? 1 : 2,
    );
    assertEquals(elected.xml.includes("<IRS8995A "), false);
    assert(elected.origins.some((o) => o.formKey === "schedule_j"));
  }
});

Deno.test("fishing attribution rejects absent, mutated and mismatched source bytes", async () => {
  const good: any = scheduleJFishingInputs("mixed-one-farm");
  const bads: any[] = [];
  const missing = structuredClone(good);
  delete missing.schedule_c[0].schedule_j_fishing_evidence
    .retained_catch_ledger;
  bads.push(missing);
  const changed = structuredClone(good);
  changed.schedule_c[0].schedule_j_fishing_evidence.retained_catch_ledger
    .sha256 = "0".repeat(64);
  bads.push(changed);
  const rehash = (edit: (ledger: any) => void) => {
    const input = structuredClone(good);
    const proof =
      input.schedule_c[0].schedule_j_fishing_evidence.retained_catch_ledger;
    const ledger = JSON.parse(atob(proof.bytes_base64));
    edit(ledger);
    const bytes = new TextEncoder().encode(JSON.stringify(ledger));
    proof.bytes_base64 = btoa(String.fromCharCode(...bytes));
    proof.sha256 = createHash("sha256").update(bytes).digest("hex");
    return input;
  };
  bads.push(rehash((ledger) => ledger.taxpayer_ssn = "999999999"));
  bads.push(rehash((ledger) => ledger.business_reference = "other-business"));
  bads.push(rehash((ledger) => ledger.sales[0].amount = 139_999));
  bads.push(rehash((ledger) => ledger.supplies[0].amount = 19_999));
  bads.push(rehash((ledger) => {
    ledger.sales[0].amount = 70_000;
    ledger.sales.push({ ...ledger.sales[0] });
  }));
  const otherExpense = structuredClone(good);
  otherExpense.schedule_c[0].line_18_office_expense = 1;
  bads.push(otherExpense);
  for (const input of bads) {
    assertThrows(() => f1040_2025.executeReturn(input), Error);
  }
  const result = f1040_2025.executeReturn(good);
  assertEquals(result.diagnostics, []);
  const pending: any = structuredClone(result.pending);
  pending.schedule_j_calculation.fishing_net_profit += 1;
  assertThrows(() => assertScheduleJSourceReturn(pending), Error);
  const filer = extractFilerIdentity(
    normalizeAllPending(result.pending).f1040,
  )!;
  await assertRejects(() => f1040_2025.prepareReturn(pending, filer));
  await assertRejects(() => buildPdfBytes(pending, filer, ".pdf-cache"));
});

Deno.test("mixed fishing QBI within phase-in retains its required per-business filing guard", async () => {
  const input: any = scheduleJFishingInputs("mixed-one-farm");
  const proof =
    input.schedule_c[0].schedule_j_fishing_evidence.retained_catch_ledger;
  const ledger = JSON.parse(atob(proof.bytes_base64));
  ledger.sales[0].amount = 100_000;
  input.schedule_c[0].line_1_gross_receipts = 100_000;
  const bytes = new TextEncoder().encode(JSON.stringify(ledger));
  proof.bytes_base64 = btoa(String.fromCharCode(...bytes));
  proof.sha256 = createHash("sha256").update(bytes).digest("hex");
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040?.line15_taxable_income, 282_582);
  assert(result.pending.form8995a !== undefined);
  const filer = extractFilerIdentity(
    normalizeAllPending(result.pending).f1040,
  )!;
  await assertRejects(
    () => f1040_2025.prepareReturn(result.pending, filer),
    Error,
    "per-business QBI source details",
  );
});
