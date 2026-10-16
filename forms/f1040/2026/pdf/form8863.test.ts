import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { buildForm8863PdfBytes2026 } from "./form8863.ts";
import {
  educationFixture2026,
  multipleEducationFixture2026,
} from "../inputs/education.fixture.ts";
import type { calculateEducationCredit2026 } from "../nodes/f8863.ts";

Deno.test("Education draft maps AOTC, LLC and extra schools once, reconciles destinations and strips fields", async () => {
  for (
    const input of [
      educationFixture2026(),
      educationFixture2026("llc"),
      multipleEducationFixture2026(),
    ]
  ) {
    const r = await buildDraftReturnPdf2026(input);
    const a = r.attachments.find((a) => a.form === "form8863")!;
    assert(a);
    assertEquals(
      a.formPages.length,
      input.f8863.claim.students.length === 2 ? 4 : 2,
    );
    assertEquals(a.statementPages, []);
    const forms = r.attachments.map((a) => a.form);
    assert(forms.indexOf("form8863") > forms.indexOf("schedule8812"));
    const doc = await PDFDocument.load(r.bytes),
      selected = await PDFDocument.create();
    assert(!doc.catalog.has(PDFName.of("AcroForm")));
    assert(doc.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
    for (
      const page of await selected.copyPages(
        doc,
        a.formPages.map((p) => p - 1),
      )
    ) selected.addPage(page);
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, await selected.save());
      const text = await new Deno.Command("pdftotext", {
        args: ["-layout", path, "-"],
      }).output();
      assertEquals(text.code, 0);
      assertEquals(new TextDecoder().decode(text.stderr), "");
      for (let page = 1; page <= a.formPages.length; page++) {
        for (const x of [36, 350]) {
          const rendered = await new Deno.Command("pdftoppm", {
            args: [
              "-f",
              String(page),
              "-l",
              String(page),
              "-r",
              "72",
              "-x",
              String(x),
              "-y",
              "774",
              "-W",
              "100",
              "-H",
              "10",
              "-gray",
              "-singlefile",
              path,
            ],
          }).output();
          assertEquals(rendered.code, 0);
          assertEquals(new TextDecoder().decode(rendered.stderr), "");
          const header = "P5\n100 10\n255\n";
          assert(
            new TextDecoder().decode(
              rendered.stdout.subarray(0, header.length),
            ) === header,
          );
          assert(
            rendered.stdout.subarray(header.length).filter((v) => v < 200)
              .length > 40,
            `Draft and incomplete footers must be visible on education page ${page} at ${x}`,
          );
        }
      }
      const pages = new TextDecoder().decode(text.stdout).split("\f");
      assertStringIncludes(pages[0], "Synthetic Investor");
      assertStringIncludes(pages[1], "Synthetic University");
      assertStringIncludes(pages[1], "Boston, MA 02110");
      const calc = r.calculation.pending.f8863.calculation_2026 as ReturnType<
        typeof calculateEducationCredit2026
      >;
      assertStringIncludes(pages[0], String(calc.lines!.line19));
      if (input.f8863.claim.students.length === 2) {
        assertStringIncludes(pages[2], "Synthetic University 3");
        assert(!pages[2].includes("2500"));
        assertStringIncludes(pages[3], "4500");
      }
      await assertRejects(
        () =>
          buildForm8863PdfBytes2026(calc.source_input, {
            form1040_line11b: 50000,
            form1040_line18: 3823,
            form1040_line29: calc.lines!.line8,
            schedule3_line2: 0,
            schedule3_line3: calc.lines!.line19 + 1,
          }, { name: "Synthetic Investor", ssn: "123456789" }),
        Error,
        "disagree",
      );
    } finally {
      await Deno.remove(path);
    }
  }
});
Deno.test("Fully phased out education credits do not attach Form 8863", async () => {
  const r = await buildDraftReturnPdf2026(educationFixture2026("aotc", 90000));
  assert(!r.attachments.some((a) => a.form === "form8863"));
});
