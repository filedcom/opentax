import { assertEquals } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { appendDependentContinuation } from "./dependent_continuation.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";

Deno.test("Form 1040 dependent continuation paginates every extra row", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-five-dependent-continuation"
  );
  if (!fixture) throw new Error("Missing five-dependent fixture");
  const source = (fixture.inputs.general as {
    dependents: Array<Record<string, unknown>>;
  }).dependents.map((dependent) => ({
    ...dependent,
    credit_category: "odc",
  }));
  const document = await PDFDocument.create();
  await appendDependentContinuation(document, source, fixture.filer);
  assertEquals(document.getPageCount(), 1);

  const many = [...source, ...Array(9).fill(source[0])];
  const overflow = await PDFDocument.create();
  await appendDependentContinuation(overflow, many, fixture.filer);
  assertEquals(overflow.getPageCount(), 2);
});
