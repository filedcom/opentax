import { assertEquals, assertThrows } from "@std/assert";
import { alternativeCompensationStatementId } from "./f1116_alternative_compensation_source.ts";

Deno.test("Form 1116 line 1b requires its native statement ID even without a document map", () => {
  assertThrows(
    () => alternativeCompensationStatementId(1, undefined),
    Error,
    "needs one linked alternative compensation statement",
  );
  assertThrows(
    () =>
      alternativeCompensationStatementId(1, { documentIdsByPendingKey: {} }),
    Error,
    "needs one linked alternative compensation statement",
  );
  assertThrows(
    () =>
      alternativeCompensationStatementId(1, {
        documentIdsByPendingKey: {
          form1116_alternative_compensation_statement: ["  "],
        },
      }),
    Error,
    "needs one linked alternative compensation statement",
  );
});

Deno.test("Form 1116 line 1b accepts exactly one linked native statement", () => {
  assertEquals(
    alternativeCompensationStatementId(1, {
      documentIdsByPendingKey: {
        form1116_alternative_compensation_statement: ["AltBasisStmt1"],
      },
    }),
    "AltBasisStmt1",
  );
  assertThrows(
    () =>
      alternativeCompensationStatementId(1, {
        documentIdsByPendingKey: {
          form1116_alternative_compensation_statement: ["A", "B"],
        },
      }),
    Error,
    "needs one linked alternative compensation statement",
  );
  assertEquals(alternativeCompensationStatementId(0, undefined), undefined);
});
