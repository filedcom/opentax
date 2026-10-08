import { assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";

Deno.test("Form 8874 direct QEI stays outside prepared child PDF assembly until authenticated", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-new-markets-business-credit"
  )!;
  const result = f1040_2025.executeReturn({ ...fixture.inputs });
  assertEquals(result.diagnostics, []);
  await assertRejects(
    () => f1040_2025.prepareReturn(result.pending, fixture.filer),
    Error,
    "Form 8874 direct QEI needs authenticated CDE status and recapture history",
  );
});
