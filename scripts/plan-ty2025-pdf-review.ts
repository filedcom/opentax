/** Print a source-only plan for the held TY2025 filled-PDF review. */
import { ALL_PDF_FORMS } from "../forms/f1040/2025/pdf/forms/index.ts";
import { pdfReviewFixtures } from "../forms/f1040/2025/pdf/review-fixtures.ts";

const registered = new Set(ALL_PDF_FORMS.map((form) => form.pendingKey));
const fixtureIds = new Set<string>();
const expected = new Set<string>();

const cases = pdfReviewFixtures.map((fixture) => {
  if (fixtureIds.has(fixture.id)) {
    throw new Error(`Duplicate PDF review fixture: ${fixture.id}`);
  }
  fixtureIds.add(fixture.id);
  if (
    fixture.expectedPdfForms.length === 0 || fixture.reviewFocus.length === 0
  ) {
    throw new Error(
      `${fixture.id}: expected forms and review focus are required`,
    );
  }
  for (const key of fixture.expectedPdfForms) {
    if (!registered.has(key)) {
      throw new Error(`${fixture.id}: unregistered expected PDF form ${key}`);
    }
    expected.add(key);
  }
  return {
    id: fixture.id,
    expectedPdfForms: fixture.expectedPdfForms,
    reviewFocus: fixture.reviewFocus.map((focus) =>
      focus.replace(/\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/g, "[identifier redacted]")
    ),
  };
});

const uncoveredPdfKeys = [...registered].filter((key) => !expected.has(key))
  .sort();

console.log(JSON.stringify(
  {
    taxYear: 2025,
    fixtureCount: cases.length,
    registeredPdfDescriptorCount: ALL_PDF_FORMS.length,
    registeredPdfKeyCount: registered.size,
    expectedPdfKeyCount: expected.size,
    uncoveredPdfKeys,
    cases,
  },
  null,
  2,
));
