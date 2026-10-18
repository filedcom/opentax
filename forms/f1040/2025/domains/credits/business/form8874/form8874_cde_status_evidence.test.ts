import { test } from "bun:test";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { withReviewedForm8874A } from "../../../../../nodes/inputs/credits/business/f8874/issuance_fixture.ts";
import { withSyntheticCdeYearEndStatus } from "../../../../../nodes/inputs/credits/business/f8874/cde_status_fixture.ts";
import { assertAttachmentCoverage } from "../../../../return-processing/attachment-coverage.ts";
import { assertForm8874CdeStatusEvidence } from "./form8874_cde_status_evidence.ts";

const investment = withReviewedForm8874A(
  {
    cde_name: "Community Development Entity",
    cde_ein: "123456789",
    cde_address: {
      line1: "10 Community Way",
      city: "Wilmington",
      state: "DE",
      zip: "19801",
    },
    initial_investment_date: "2025-04-15",
    credit_allowance_date: "2025-04-15",
    qualified_equity_investment_amount: 10_000,
    designation_notice_reference: "Synthetic 2025 QEI notice",
    held_on_credit_allowance_date: true,
    qualified_on_credit_allowance_date: true,
    recapture_notice_received: false,
    subject_to_passive_activity_limit: false,
  },
  "Alex Example",
  "111223333",
);
const statused = await withSyntheticCdeYearEndStatus([investment]);
const pending = { f8874: { investments: statused.investments } };

// Form 8874 instructions: the credit needs a CDE holding an allocation and a
// QEI still held and qualified on the allowance date; Form 8874-B reports a
// recapture event, so its absence alone shows nothing.
test("Form 8874 export needs each QEI's CDE year-end status, not silence", async () => {
  assertThrows(
    () =>
      assertAttachmentCoverage(
        { f8874: { investments: [investment] } },
        "mef",
      ),
    Error,
    "needs authenticated CDE status and recapture history",
  );
  assertAttachmentCoverage(pending, "mef");
  await assertForm8874CdeStatusEvidence(
    pending,
    statused.retainedSourceDocuments,
    2025,
  );
  await assertRejects(
    () =>
      assertForm8874CdeStatusEvidence(
        { f8874: { investments: [investment] } },
        statused.retainedSourceDocuments,
        2025,
      ),
    Error,
    "needs authenticated CDE status",
  );
});

test("Form 8874 CDE status binds retained bytes and the return's tax year", async () => {
  const [issuance, statement] = statused.retainedSourceDocuments;
  assertEquals(
    statement.document_reference,
    statused.investments[0].cde_year_end_status.status_statement_document_reference,
  );
  await assertRejects(
    () => assertForm8874CdeStatusEvidence(pending, [issuance], 2025),
    Error,
    "exactly one retained copy",
  );
  await assertRejects(
    () =>
      assertForm8874CdeStatusEvidence(pending, [
        issuance,
        { ...statement, bytes: new TextEncoder().encode("altered") },
      ], 2025),
    Error,
    "bytes differ",
  );
  await assertRejects(
    () =>
      assertForm8874CdeStatusEvidence(
        pending,
        statused.retainedSourceDocuments,
        2026,
      ),
    Error,
    "through December 31, 2026",
  );
});
