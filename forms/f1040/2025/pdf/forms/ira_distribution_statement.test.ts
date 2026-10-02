import { assertEquals, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { inputSchema as f1099rInputSchema } from "../../../nodes/inputs/f1099r/index.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";
import { appendIraDistributionStatement } from "./ira_distribution_statement.ts";

Deno.test("IRA frozen-deposit explanation prints on the PDF statement", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-ira-late-frozen-deposit"
  )!;
  const source = f1099rInputSchema.parse({ f1099rs: fixture.inputs.f1099r });
  const document = await PDFDocument.create();
  await appendIraDistributionStatement(document, source, fixture.filer);
  assertEquals(document.getPageCount(), 1);

  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, await document.save());
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", path, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0);
    const text = new TextDecoder().decode(extracted.stdout);
    assertStringIncludes(text, "Form 1040 line 4c(1) rollover explanation");
    assertStringIncludes(text, "frozen-deposit extension");
    assertStringIncludes(text, "2025-09-30");
    assertEquals(text.includes("synthetic-"), false);
  } finally {
    await Deno.remove(path);
  }
});
