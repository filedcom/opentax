import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { socialSecurityGraphFixture2026 } from "../inputs/social-security.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";

Deno.test("2026 benefit statements print net and taxable benefits with reconciled withholding and student-loan deduction", async () => {
  const input = socialSecurityGraphFixture2026();
  const result = await buildDraftReturnPdf2026(input);
  assertEquals(result.attachments.map((a) => a.form), ["f1040", "schedule1"]);
  const doc = await PDFDocument.load(result.bytes);
  assertEquals(doc.getPageCount(), 4);
  assertEquals(doc.catalog.get(PDFName.of("AcroForm")), undefined);
  assert(doc.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  const dir = await Deno.makeTempDir();
  try {
    await Deno.writeFile(`${dir}/return.pdf`, result.bytes);
    const output = await new Deno.Command("pdftotext", {
      args: ["-layout", `${dir}/return.pdf`, "-"],
    }).output();
    assertEquals(output.code, 0);
    const pages = new TextDecoder().decode(output.stdout).split("\f");
    assert(
      /Social security benefits.*10000.*Taxable amount.*8500/.test(pages[0]),
    );
    assertStringIncludes(pages[0], "92417");
    assert(/1099.*900/.test(pages[1]));
    assert(/Student loan interest deduction.*1083/.test(pages[3]));
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
Deno.test("2026 MFS benefits print zero taxable benefits and the lived-apart indicator", async () => {
  const base = socialSecurityGraphFixture2026(0, FilingStatus.MFS);
  const { student_loan_interest: _loan, ...input } = base;
  const result = await buildDraftReturnPdf2026({
    ...input,
    general: { ...input.general, mfs_spouse_lived_with_taxpayer: false },
  });
  assertEquals(result.calculation.pending.f1040.line6b_ss_taxable, 0);
  assertEquals(result.calculation.pending.f1040.line6d_mfs_lived_apart, true);
  assertEquals(result.attachments.map((a) => a.form), ["f1040"]);
  const dir = await Deno.makeTempDir();
  try {
    await Deno.writeFile(`${dir}/apart.pdf`, result.bytes);
    const output = await new Deno.Command("pdftotext", {
      args: ["-layout", `${dir}/apart.pdf`, "-"],
    }).output();
    assertEquals(output.code, 0);
    const text = new TextDecoder().decode(output.stdout);
    assert(/Social security benefits.*10000.*Taxable amount.*0/.test(text));
    assert(/lived apart from your spouse the entire year.*[✗✓✔X]/.test(text));
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
