import { assertEquals, assertMatch, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../../../core/runtime/planner.ts";
import { registry } from "../../../../registry.ts";
import { fillFormPdf } from "../../../builder.ts";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";
import { scheduleDPdf } from "./schedule_d.ts";

const trustLoss = pdfReviewFixtures.find((item) =>
  item.id === "single-final-trust-k1-long-term-capital-loss"
)!;

Deno.test("Schedule D loss answers line 22 from filed Form 1040 qualified dividends", async () => {
  const checkboxPaths = scheduleDPdf.fields.filter((field) =>
    field.domainKey === "print_line22_qualified_dividends"
  ).map((field) => field.pdfField);
  assertEquals(checkboxPaths, [
    "topmostSubform[0].Page2[0].c2_3[0]",
    "topmostSubform[0].Page2[0].c2_3[1]",
  ]);
  for (const qualifiedDividends of [false, true]) {
    const inputs = {
      ...trustLoss.inputs,
      ...(qualifiedDividends
        ? {
          f1099div: [{
            payerName: "Investment Fund",
            recipient_tin: trustLoss.filer.primarySSN,
            isNominee: false,
            box11: false,
            box1a: 400,
            box1b: 100,
          }],
        }
        : {}),
    };
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      inputs,
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.schedule_d.print_line16_combined, -900);
    assertEquals(
      result.pending.f1040.line3a_qualified_dividends,
      qualifiedDividends ? 100 : undefined,
    );
    const projected = scheduleDPdf.projectFields?.(
      result.pending.schedule_d,
      result.pending,
    ) ?? {};
    assertEquals(
      projected.print_line22_qualified_dividends,
      qualifiedDividends,
    );
    const bytes = await fillFormPdf(
      scheduleDPdf,
      projected,
      trustLoss.filer,
      ".pdf-cache",
      result.pending,
    );
    if (!bytes) throw new Error("Schedule D loss was not rendered");
    assertEquals((await PDFDocument.load(bytes)).getPageCount(), 2);
    const path = await Deno.makeTempFile({ suffix: ".pdf" });
    try {
      await Deno.writeFile(path, bytes);
      const extracted = await new Deno.Command("pdftotext", {
        args: ["-f", "2", "-l", "2", "-layout", path, "-"],
      }).output();
      assertEquals(extracted.code, 0);
      const printed = new TextDecoder().decode(extracted.stdout);
      assertStringIncludes(printed, "Do you have qualified dividends");
      assertStringIncludes(printed, "-900");
      assertMatch(
        printed,
        qualifiedDividends ? /✔\s+Yes\./ : /✔\s+No\./,
      );
    } finally {
      await Deno.remove(path);
    }
  }
});
