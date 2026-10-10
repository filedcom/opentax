import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";

const base = pdfReviewFixtures.find((f) =>
  f.id === "mfj-form2210f-first-joint-filing"
)!;
for (
  const [id, withholding, paidOn, days, penalty] of [
    ["paid-march", 1000, "2026-03-01", 45, 69],
    ["unpaid-april", 1000, null, 90, 138],
    ["withholding-covered", 9000, null, 0, 0],
  ] as const
) {
  Deno.test(`Form 2210-F public packet reconciles ${id}`, async () => {
    const input = structuredClone(base.inputs) as Record<string, any>;
    input.w2[0].box2_fed_withheld = withholding;
    Object.assign(input.f2210f.source, {
      current_withholding: withholding,
      full_underpayment_paid_on: paidOn,
    });
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    const fields = pending.f2210f as Record<string, any>;
    assertEquals(fields.filed_lines.line11, 9000);
    assertEquals(fields.filed_lines.line13, 9000 - withholding);
    assertEquals(fields.filed_lines.line15, days);
    // Independent printed line16 formula: underpayment * days / 365 * 0.07.
    assertEquals(fields.filed_lines.line16, penalty);
    assertEquals(pending.f1040?.line24_total_tax, 26898);
    assertEquals(pending.f1040?.line38_underpayment_penalty ?? 0, penalty);
    assertEquals(
      pending.f1040?.line37_amount_owed,
      26898 - withholding + penalty,
    );
    const packet = await f1040_2025.prepareReturn(pending, base.filer);
    assertStringIncludes(packet.bundle.xml, "<IRS2210F ");
    assertStringIncludes(
      packet.bundle.xml,
      "<JointReturnInd>X</JointReturnInd>",
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      base.filer,
      ".pdf-cache",
      packet.bundle,
      origins,
    );
    const out = Deno.env.get("FORM2210F_PACKETS_DIR");
    if (out) {
      const dir = `${out}/${id}`;
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        `${dir}/source-pending.json`,
        JSON.stringify({ input, pending, origins }, null, 2),
      );
      await Deno.writeTextFile(`${dir}/return.xml`, packet.bundle.xml);
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
    }
    for (const key of ["line1", "line8", "line13", "line16"]) {
      const changed = {
        ...pending,
        f2210f: {
          ...fields,
          filed_lines: {
            ...fields.filed_lines,
            [key]: fields.filed_lines[key] + 1,
          },
        },
      };
      await assertRejects(() => f1040_2025.prepareReturn(changed, base.filer));
      await assertRejects(() => buildPdfBytes(changed, base.filer));
    }
  });
}

Deno.test("ordinary Form 2210 mandatory methods retain both public export guards", async () => {
  const input = structuredClone(base.inputs) as Record<string, any>;
  delete input.f2210f;
  const baseline = buildPending(f1040_2025.executeReturn(input).pending);
  for (
    const flag of [
      "waiver_requested",
      "partial_waiver_requested",
      "annualized_method",
      "actual_withholding_dates_method",
      "joint_filing_status_change",
    ]
  ) {
    const result = f1040_2025.executeReturn({
      ...input,
      f2210: { [flag]: true },
    });
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    assertEquals(pending.f1040, baseline.f1040);
    await assertRejects(() => f1040_2025.prepareReturn(pending, base.filer));
    await assertRejects(() => buildPdfBytes(pending, base.filer));
  }
});
