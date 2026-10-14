import { assertEquals, assertMatch } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";

Deno.test("zero taxable income and tax after credits print as required on the filled Form 1040", async () => {
  const base = pdfReviewFixtures.find((fixture) =>
    fixture.id === "single-w2-refund"
  )!;
  const originalW2 = (base.inputs.w2 as Record<string, unknown>[])[0];
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    general: {
      ...base.inputs.general as Record<string, unknown>,
      do_not_claim_eic: true,
    },
    w2: [{
      ...originalW2,
      box1_wages: 10_000,
      box2_fed_withheld: 1_000,
      box3_ss_wages: 10_000,
      box4_ss_withheld: 620,
      box5_medicare_wages: 10_000,
      box6_medicare_withheld: 145,
    }],
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line15_taxable_income, 0);
  assertEquals(result.pending.f1040.line22_tax_after_credits, 0);
  const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
  const pdf = await prepared.renderPdf();
  const file = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(file, pdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", file, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0, new TextDecoder().decode(extracted.stderr));
    const text = new TextDecoder().decode(extracted.stdout);
    assertMatch(text, /This is your taxable income[^\n]*15\s+0\s*\n/);
    assertMatch(text, /Subtract line 21 from line 18[^\n]*22\s+0\s*\n/);
    if (Deno.args.includes("--write-review-artifacts")) {
      await Deno.mkdir("/tmp/opentax-form1040-zero-lines-review", {
        recursive: true,
      });
      await Deno.writeFile(
        "/tmp/opentax-form1040-zero-lines-review/filled-return.pdf",
        pdf,
      );
      await Deno.writeTextFile(
        "/tmp/opentax-form1040-zero-lines-review/return.xml",
        prepared.bundle.xml,
      );
    }
  } finally {
    await Deno.remove(file);
  }
});
