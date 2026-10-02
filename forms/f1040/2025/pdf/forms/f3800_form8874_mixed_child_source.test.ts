import { assertEquals, assertRejects } from "@std/assert";
import { f1040_2025 } from "../../index.ts";
import { pdfReviewFixtures } from "../review-fixtures.ts";

const partnership = {
  partnership_name: "Community Partnership",
  partnership_ein: "987654321",
  source_document_reference: "2025 partnership K-1 code AD",
  box15_code_ad_new_markets_credit: 1_250,
  new_markets_credit_subject_to_passive_activity_limit: false,
};

Deno.test("mixed Form 8874 direct QEI and K-1 credit stays outside prepared PDF assembly", async () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-new-markets-business-credit"
  )!;
  const result = f1040_2025.executeReturn({
    ...fixture.inputs,
    k1_partnership: [partnership],
  });
  assertEquals(result.diagnostics, []);
  await assertRejects(
    () => f1040_2025.prepareReturn(result.pending, fixture.filer),
    Error,
    "Form 8874 direct QEI needs authenticated CDE status and recapture history",
  );
});
