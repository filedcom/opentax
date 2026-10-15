import { assert, assertEquals } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { lumpSumGraphFixture2026 } from "../inputs/social-security-election.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";

Deno.test("2026 lump-sum election prints line 6c and the reduced taxable amount without attaching private worksheets", async () => {
  const input = lumpSumGraphFixture2026();
  const elected = await buildDraftReturnPdf2026(input);
  input.ssa1099.lump_sum_election = {
    method: "regular_method",
    election_review_reference: "regular-method-review",
  };
  const regular = await buildDraftReturnPdf2026(input);
  const dir = await Deno.makeTempDir();
  try {
    for (
      const [result, taxable, isElected] of [[elected, 2500, true], [
        regular,
        3000,
        false,
      ]] as const
    ) {
      assertEquals(result.attachments.map((a) => a.form), ["f1040"]);
      const doc = await PDFDocument.load(result.bytes);
      assertEquals(doc.getPageCount(), 2);
      assertEquals(doc.catalog.get(PDFName.of("AcroForm")), undefined);
      assert(doc.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
      await Deno.writeFile(`${dir}/return.pdf`, result.bytes);
      const output = await new Deno.Command("pdftotext", {
        args: ["-layout", `${dir}/return.pdf`, "-"],
      }).output();
      assertEquals(output.code, 0);
      const text = new TextDecoder().decode(output.stdout);
      assert(
        new RegExp(
          `Social security benefits.*11000.*Taxable amount.*${taxable}`,
        ).test(text),
      );
      assertEquals(/lump-sum election method.*✔/.test(text), isElected);
      assert(!text.includes("synthetic-prior-return"));
    }
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
Deno.test("2026 MFS election can print both line 6c and 6d with zero taxable benefits", async () => {
  const input = lumpSumGraphFixture2026(40000, FilingStatus.MFS);
  const s = input.ssa1099.statements[0];
  s.box3_gross_benefits = 2000;
  s.box5_net_benefits = 2000;
  s.workers_compensation_offset_in_box3 = 0;
  const result = await buildDraftReturnPdf2026({
    ...input,
    general: { ...input.general, mfs_spouse_lived_with_taxpayer: false },
  });
  assertEquals(result.calculation.pending.f1040.line6b_ss_taxable, 0);
  assertEquals(result.calculation.pending.f1040.line6c_lump_sum_election, true);
  assertEquals(result.calculation.pending.f1040.line6d_mfs_lived_apart, true);
  const dir = await Deno.makeTempDir();
  try {
    await Deno.writeFile(`${dir}/return.pdf`, result.bytes);
    const output = await new Deno.Command("pdftotext", {
      args: ["-layout", `${dir}/return.pdf`, "-"],
    }).output();
    assertEquals(output.code, 0);
    const text = new TextDecoder().decode(output.stdout);
    assert(/Social security benefits.*2000.*Taxable amount.*0/.test(text));
    assert(/lump-sum election method.*✔/.test(text));
    assert(/lived apart from your spouse the entire year.*✔/.test(text));
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
