import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { compareAtsAttachments } from "./ty2025-attachment-coverage.ts";

const requirement = ["Transfer Election Statement"];
const retained = {
  description: requirement[0],
  fileName: "transfer.pdf",
  byteLength: 100,
  sha256: "a".repeat(64),
};

test("ATS attachment coverage distinguishes missing, blocked and uninventoried evidence", () => {
  assertEquals(
    compareAtsAttachments(requirement, []).rows?.[0].result,
    "missing",
  );
  assertEquals(
    compareAtsAttachments(requirement, null).rows?.[0].result,
    "not-evaluated",
  );
  assertEquals(
    compareAtsAttachments(requirement, null).allKnownRequiredPresent,
    null,
  );
  assertEquals(compareAtsAttachments(null, []).requirementsInventoried, false);
  assertEquals(compareAtsAttachments(null, []).knownRequiredCount, null);
  assertEquals(compareAtsAttachments(null, []).allKnownRequiredPresent, null);
});

test("ATS attachment names cannot replace exact descriptions or retained bytes", () => {
  assertEquals(
    compareAtsAttachments(requirement, [retained]).allKnownRequiredPresent,
    true,
  );
  for (
    const mutation of [
      { ...retained, description: "Transfer election statement" },
      {
        ...retained,
        description: "Other statement",
        fileName: "Transfer Election Statement.pdf",
      },
      { ...retained, byteLength: 0 },
      { ...retained, sha256: "unverified" },
    ]
  ) {
    assertEquals(
      compareAtsAttachments(requirement, [mutation]).allKnownRequiredPresent,
      false,
    );
  }
  assertEquals(
    compareAtsAttachments(requirement, [retained, retained]).rows?.[0].result,
    "invalid-or-ambiguous",
  );
});

test("ATS empty reviewed cover inventories do not certify complete attachment requirements", () => {
  for (const observed of [null, []]) {
    const coverage = compareAtsAttachments([], observed);
    assertEquals(coverage.requirementsInventoried, true);
    assertEquals(coverage.knownRequiredCount, 0);
    assertEquals(coverage.rows, []);
    assertEquals(coverage.completeRequirementsInventoried, false);
    assertEquals(
      coverage.allKnownRequiredPresent,
      observed === null ? null : true,
    );
  }
});
