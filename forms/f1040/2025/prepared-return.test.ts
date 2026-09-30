import { assertRejects } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";

const filer =
  pdfReviewFixtures.find((item) => item.id === "single-w2-refund")!.filer;
const complete = {
  taxpayer_ssn: filer.primarySSN,
  filing_status: "single",
  digital_assets: false,
};

Deno.test("prepared Form 1040 rejects missing filing and identity answers before XML", async () => {
  await assertRejects(
    () =>
      f1040_2025.prepareReturn({
        f1040: { ...complete, digital_assets: undefined },
      }, filer),
    Error,
    "needs the digital-assets answer",
  );
  await assertRejects(
    () =>
      f1040_2025.prepareReturn({
        f1040: { ...complete, filing_status: undefined },
      }, filer),
    Error,
    "filing status must match",
  );
  await assertRejects(
    () =>
      f1040_2025.prepareReturn({
        f1040: { ...complete, taxpayer_ssn: "987654321" },
      }, filer),
    Error,
    "taxpayer source TIN differs from the filer",
  );
  await assertRejects(
    () =>
      f1040_2025.prepareReturn({ f1040: complete }, {
        ...filer,
        firstNameWithInitial: undefined,
      }),
    Error,
    "needs the identified taxpayer's SSN",
  );
});
