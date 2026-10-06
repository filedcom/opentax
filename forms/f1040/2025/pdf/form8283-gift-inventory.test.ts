import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { registry } from "../registry.ts";
import { buildMefBundle } from "../mef/builder.ts";
import { buildPending } from "../mef/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./builder.ts";
import { form8283Pdf } from "./forms/f8283.ts";
import { reviewedGiftInventory } from "./form8283-gift-inventory.fixture.ts";

for (
  const [count, sameDonee, mixed] of [[3, false, false], [9, false, false], [
    3,
    true,
    true,
  ]] as const
) {
  Deno.test(`complete reviewed8283 inventory ${count} sameDonee${sameDonee} mixed${mixed}`, async () => {
    const source = await reviewedGiftInventory(count, sameDonee, mixed);
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      source.inputs,
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(result.diagnostics, []);
    const claim = 6000 * count + 100 * count * (count + 1) / 2;
    assertEquals(
      result.pending.schedule_a.line_12_noncash_contributions,
      Math.min(claim, 50000),
    );
    assertEquals(
      result.pending.f1040.line12e_itemized_deductions,
      Math.min(claim, 50000) + 24000,
    );
    const pending = buildPending(result.pending);
    const bundle = await buildMefBundle(pending, {
      filer: source.filer,
      attachments: source.attachments,
    });
    assertEquals((bundle.xml.match(/<IRS8283\b/g) ?? []).length, count);
    assertEquals(bundle.attachments.length, 6 * count);
    const copies = form8283Pdf.instances!(
      pending.f8283!,
      source.filer,
      {
        f8283: pending.f8283!,
        schedule_a: pending.schedule_a!,
        f1040: pending.f1040!,
      },
    );
    assertEquals(
      copies.map((p) => p.section_b_claim),
      source.items.map((i) => i.deduction_claimed),
    );
    const child = new Deno.Command("xmllint", {
      args: [
        "--noout",
        "--schema",
        "/Users/atul/projects/opentax/.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
        "-",
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(bundle.xml));
    await writer.close();
    const checked = await child.output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      source.filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const parsed = await PDFDocument.load(pdf);
    assertEquals(parsed.getForm().getFields().length, 0);
    assertEquals(parsed.getPageCount(), origins.length);
    assertEquals(
      new Set(
        origins.filter((p) => p.formKey === "f8283").map((p) => p.formCopy),
      ).size,
      count,
    );
    for (const index of [0, count - 1]) {
      const changed = structuredClone(pending);
      changed.f8283!.section_b_items![index].deduction_claimed -= 1;
      await assertRejects(() =>
        buildMefBundle(changed, {
          filer: source.filer,
          attachments: source.attachments,
        })
      );
      await assertRejects(() => buildPdfBytes(changed, source.filer));
      const changedDonee = structuredClone(pending);
      changedDonee.f8283!.section_b_items![index].donee_acknowledgment!.ein =
        "111223333";
      await assertRejects(() =>
        buildMefBundle(changedDonee, {
          filer: source.filer,
          attachments: source.attachments,
        })
      );
      await assertRejects(() => buildPdfBytes(changedDonee, source.filer));
      const altered = source.attachments.map((a) => ({ ...a }));
      altered[index * 6].bytes =
        altered[(index * 6 + 1) % altered.length].bytes;
      await assertRejects(() =>
        buildMefBundle(pending, { filer: source.filer, attachments: altered })
      );
    }
  });
}
