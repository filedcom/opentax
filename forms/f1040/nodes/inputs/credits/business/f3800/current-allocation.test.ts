import { assertEquals, assertThrows } from "@std/assert";
import {
  assertCurrentOrphanAllocationSource,
  currentOrphanAllocationSchema,
  reconcileCurrentOrphanAllocation,
} from "./current-allocation.ts";
const source = {
  source_type: "partnership",
  source_ein: "123456789",
  source_document_reference: "Synthetic 2025 K-1 A",
  credit_amount: 1000,
  subject_to_passive_activity_limit: false,
};
const other = {
  ...source,
  source_type: "s_corporation",
  source_ein: "987654321",
  source_document_reference: "Synthetic 2025 K-1 B",
  credit_amount: 2000,
};
const review = {
  tax_year: 2025,
  return_primary_ssn: "111223333",
  review_reference: "Synthetic allocation workpaper",
  complete_current_orphan_drug_inventory_confirmed: true,
  sources: [
    {
      source_type: other.source_type,
      source_ein: other.source_ein,
      source_document_reference: other.source_document_reference,
      credit_amount: other.credit_amount,
      applied_credit: 600,
    },
    {
      source_type: source.source_type,
      source_ein: source.source_ein,
      source_document_reference: source.source_document_reference,
      credit_amount: source.credit_amount,
      applied_credit: 400,
    },
  ],
};
Deno.test("Form 3800 source review maps reordered credit use and checks finalized limit", () => {
  assertEquals(
    reconcileCurrentOrphanAllocation(review, [source, other], {
      primarySSN: "111-22-3333",
      appliedCredit: 1000,
    }),
    [400, 600],
  );
  assertEquals(
    reconcileCurrentOrphanAllocation(review, [other, source], {
      primarySSN: "111223333",
      appliedCredit: 1000,
    }),
    [600, 400],
  );
  assertCurrentOrphanAllocationSource(review, structuredClone(review));
});
Deno.test("Form 3800 source review rejects incomplete, contradictory, or unsupported allocations", () => {
  const failures = [
    () => reconcileCurrentOrphanAllocation(review, [source]),
    () => reconcileCurrentOrphanAllocation(review, [source, source]),
    () =>
      reconcileCurrentOrphanAllocation({
        ...review,
        sources: [review.sources[0], review.sources[0]],
      }, [source, other]),
    () =>
      reconcileCurrentOrphanAllocation(review, [source, {
        ...other,
        credit_amount: 1999,
      }]),
    () =>
      reconcileCurrentOrphanAllocation(review, [source, {
        ...other,
        source_document_reference: "Changed source",
      }]),
    () =>
      reconcileCurrentOrphanAllocation(review, [source, {
        ...other,
        subject_to_passive_activity_limit: true,
      }]),
    () =>
      reconcileCurrentOrphanAllocation({
        ...review,
        sources: [
          { ...review.sources[0], applied_credit: 2001 },
          review.sources[1],
        ],
      }, [source, other]),
    () =>
      reconcileCurrentOrphanAllocation(review, [source, other], {
        primarySSN: "999887777",
        appliedCredit: 1000,
      }),
    () =>
      reconcileCurrentOrphanAllocation(review, [source, other], {
        primarySSN: "111223333",
        appliedCredit: 999,
      }),
    () => assertCurrentOrphanAllocationSource(review, undefined),
    () => assertCurrentOrphanAllocationSource(undefined, review),
    () =>
      assertCurrentOrphanAllocationSource(review, {
        ...review,
        review_reference: "Changed workpaper",
      }),
    () => currentOrphanAllocationSchema.parse({ ...review, tax_year: 2024 }),
    () =>
      currentOrphanAllocationSchema.parse({
        ...review,
        complete_current_orphan_drug_inventory_confirmed: false,
      }),
    () =>
      currentOrphanAllocationSchema.parse({
        ...review,
        sources: [{ ...review.sources[0], applied_credit: -1 }],
      }),
    () =>
      currentOrphanAllocationSchema.parse({
        ...review,
        sources: [{ ...review.sources[0], applied_credit: 1.001 }],
      }),
    () =>
      currentOrphanAllocationSchema.parse({
        ...review,
        sources: [{ ...review.sources[0], source_type: "trust" }],
      }),
  ];
  for (const reject of failures) assertThrows(reject);
});
