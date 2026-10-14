import type { PdfPageOrigin } from "../../forms/f1040/2025/pdf/builder.ts";

/** Bind reviewed form labels to the PDF builder's actual descriptor emissions. */
export function assertReviewPageOrigins(
  caseId: string,
  actual: readonly PdfPageOrigin[],
  expectedForms: readonly string[],
  recorded: unknown,
): void {
  if (JSON.stringify(recorded) !== JSON.stringify(actual)) {
    throw new Error(`${caseId}: recorded PDF page origins differ from replay`);
  }
  const expectedCopies = new Map<string, number>();
  for (const key of expectedForms) {
    expectedCopies.set(key, (expectedCopies.get(key) ?? 0) + 1);
  }
  const emittedCopies = new Map<string, Set<number>>();
  const nextCopy = new Map<string, number>();
  const finishedCopies = new Set<string>();
  let currentCopy: string | undefined;
  for (const [index, origin] of actual.entries()) {
    if (origin.pageNumber !== index + 1) {
      throw new Error(`${caseId}: PDF page origins are out of order`);
    }
    const count = expectedCopies.get(origin.formKey);
    if (count === undefined || origin.formCopy < 1 || origin.formCopy > count) {
      throw new Error(
        `${caseId}: unexpected PDF form origin ${origin.formKey}`,
      );
    }
    const copyKey = `${origin.formKey}\u0000${origin.formCopy}`;
    if (copyKey !== currentCopy) {
      if (finishedCopies.has(copyKey)) {
        throw new Error(
          `${caseId}: PDF pages for ${origin.formKey} copy ${origin.formCopy} are not contiguous`,
        );
      }
      if (origin.formCopy !== (nextCopy.get(origin.formKey) ?? 1)) {
        throw new Error(
          `${caseId}: PDF copies of ${origin.formKey} are out of order`,
        );
      }
      nextCopy.set(origin.formKey, origin.formCopy + 1);
      if (currentCopy !== undefined) finishedCopies.add(currentCopy);
      currentCopy = copyKey;
    }
    const copies = emittedCopies.get(origin.formKey) ?? new Set<number>();
    copies.add(origin.formCopy);
    emittedCopies.set(origin.formKey, copies);
  }
  for (const [key, count] of expectedCopies) {
    if (emittedCopies.get(key)?.size !== count) {
      throw new Error(`${caseId}: expected ${key} PDF copy is missing`);
    }
  }
}

export function assertReviewedPageOrigin(
  caseId: string,
  observedForm: string,
  observedCopy: number,
  actual: PdfPageOrigin,
): void {
  if (observedForm !== actual.formKey || observedCopy !== actual.formCopy) {
    throw new Error(
      `${caseId} page ${actual.pageNumber}: reviewed form/copy differs from PDF origin`,
    );
  }
}
