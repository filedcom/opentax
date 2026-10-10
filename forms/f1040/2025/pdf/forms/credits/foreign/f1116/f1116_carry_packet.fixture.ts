import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../../../index.ts";
import { extractFilerIdentity } from "../../../../../../mef/filer.ts";
import { normalizeAllPending } from "../../../../../return-processing/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../builder.ts";
import { form1116ScheduleBPdf } from "./f1116_schedule_b.ts";

// All cases have 50,000 ordinary interest less 15,750 standard deduction.
// IRS 2025 Tax Table single 34,250–34,300 => tax 3,875 (p1040).
// Schedule B instructions: use oldest first; unused 2015 tax expires in 2025.
export async function verifyCarryoverPacket(
  raw: Parameters<typeof normalizeAllPending>[0],
  id: string,
  expected: { credit: number; carry: number; fields: Record<string, number> },
) {
  const pending = normalizeAllPending(raw);
  assertEquals(pending.f1040.line2b_taxable_interest, 50000);
  assertEquals(pending.f1040.line11_agi, 50000);
  assertEquals(pending.f1040.line15_taxable_income, 34250);
  assertEquals(pending.f1040.line16_income_tax, 3875);
  assertEquals(pending.schedule3.line1_foreign_tax_credit, expected.credit);
  assertEquals(pending.f1040.line20_nonrefundable_credits, expected.credit);
  assertEquals(pending.f1040.line24_total_tax, 3875 - expected.credit);
  const projected = form1116ScheduleBPdf.projectFields!(
    pending.form1116_schedule_b,
    pending,
  );
  assertEquals(projected.line8_total, expected.carry);
  for (const [key, value] of Object.entries(expected.fields)) {
    assertEquals(projected[key], value, key);
  }
  const filer = extractFilerIdentity(pending.f1040);
  const prepared = await f1040_2025.prepareReturn(raw, filer);
  const origins: PdfPageOrigin[] = [];
  const bytes = await buildPdfBytes(
    prepared.bundle.pending,
    filer,
    ".pdf-cache",
    prepared.bundle,
    origins,
  );
  assertEquals((await PDFDocument.load(bytes)).getPageCount(), 8);
  assertEquals(origins.filter((p) => p.formKey === "form_1116").length, 2);
  assertEquals(
    origins.filter((p) => p.formKey === "form1116_schedule_b").length,
    2,
  );
  const root = Deno.env.get("OPENTAX_FORM1116_CARRY_PROOF_DIR");
  if (root) {
    await Deno.mkdir(root, { recursive: true });
    await Deno.writeFile(`${root}/${id}.pdf`, bytes);
    await Deno.writeTextFile(`${root}/${id}.xml`, prepared.bundle.xml);
    await Deno.writeTextFile(
      `${root}/${id}.json`,
      JSON.stringify({ pending, expected, filer, origins }, null, 2),
    );
  }
  for (
    const altered of [
      { ...pending, form1116_prior_carryover: undefined },
      { ...pending, form1116_schedule_b: undefined },
      {
        ...pending,
        schedule3: {
          ...pending.schedule3,
          line1_foreign_tax_credit: expected.credit + 1,
        },
      },
      {
        ...pending,
        f1040: {
          ...pending.f1040,
          line20_nonrefundable_credits: expected.credit + 1,
        },
      },
    ]
  ) {
    await assertRejects(() => f1040_2025.prepareReturn(altered, filer), Error);
    await assertRejects(() => buildPdfBytes(altered, filer), Error);
  }
}
