import { assertEquals, assertRejects } from "@std/assert";
import { withReviewedForm8874A } from "./issuance_fixture.ts";
import {
  form8874NoEventStatusSchema,
  reconcileForm8874NoEventStatus,
} from "./no_event_status_evidence.ts";

const utf8 = new TextEncoder();
const issuanceBytes = utf8.encode(
  "Synthetic signed CDE Form 8874-A: one 2023 QEI",
);
const statusBytes = utf8.encode(
  "Synthetic signed CDE status statement: no event through 2025",
);
const sha = async (bytes: Uint8Array) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
const issuance = withReviewedForm8874A(
  {
    cde_name: "Community Development Entity",
    cde_ein: "123456789",
    initial_investment_date: "2023-04-15",
    qualified_equity_investment_amount: 10_000,
    designation_notice_reference: "2023 CDE 8874-A original QEI",
  },
  "Alex Owner",
  "111223333",
).reviewed_form8874a;
const status = form8874NoEventStatusSchema.parse({
  status_statement_document_reference: "CDE 2025 QEI status statement",
  status_statement_sha256: await sha(statusBytes),
  issuance_notice_document_reference: issuance.notice_document_reference,
  issuance_notice_sha256: await sha(issuanceBytes),
  cde_name: issuance.cde_name,
  cde_ein: issuance.cde_ein,
  investor_name: issuance.investor_name,
  investor_tin: issuance.investor_tin,
  initial_investment_date: issuance.initial_investment_date,
  qualified_equity_investment_amount:
    issuance.qualified_equity_investment_amount,
  coverage_start_date: issuance.initial_investment_date,
  coverage_end_date: "2025-12-31",
  cde_internal_status_records_reference: "CDE compliance ledger through 2025",
  complete_notice_history_reviewed: true,
  reviewed_form8874b_notice_references: [],
  no_recapture_event_through_2025_confirmed: true,
  cde_certification_active_through_2025_confirmed: true,
  substantially_all_requirement_maintained_through_2025_confirmed: true,
  investment_not_redeemed_through_2025_confirmed: true,
  signed_by_authorized_cde_official_confirmed: true,
  cde_official_name: "Casey CDE Officer",
  cde_signature_date: "2026-01-15",
});
const evidenceBytes = {
  statusStatement: statusBytes,
  issuanceNotice: issuanceBytes,
};

Deno.test("Form 8874 affirmative CDE no-event statement binds distinct issuance and status bytes", async () => {
  const result = await reconcileForm8874NoEventStatus(
    status,
    issuance,
    [],
    evidenceBytes,
  );
  assertEquals(result.status.coverage_end_date, "2025-12-31");
  assertEquals(result.reviewedForm8874BHistory, []);
});

Deno.test("Form 8874 no-event path rejects silence, altered bytes and mismatched source facts", async () => {
  for (
    const changed of [
      undefined,
      { ...status, investor_tin: "222334444" },
      { ...status, complete_notice_history_reviewed: false },
      { ...status, no_recapture_event_through_2025_confirmed: false },
      { ...status, cde_signature_date: "2025-12-31" },
      {
        ...status,
        status_statement_document_reference: issuance.notice_document_reference,
      },
      { ...status, issuance_notice_sha256: status.status_statement_sha256 },
    ]
  ) {
    await assertRejects(
      () =>
        reconcileForm8874NoEventStatus(changed, issuance, [], evidenceBytes),
      Error,
    );
  }
  await assertRejects(
    () =>
      reconcileForm8874NoEventStatus(status, issuance, [], {
        ...evidenceBytes,
        statusStatement: utf8.encode("altered status bytes"),
      }),
    Error,
    "bytes differ",
  );
  await assertRejects(
    () =>
      reconcileForm8874NoEventStatus(status, issuance, [], {
        ...evidenceBytes,
        issuanceNotice: utf8.encode("altered issuance bytes"),
      }),
    Error,
    "bytes differ",
  );
});

Deno.test("Form 8874 no-event statement rejects conflicting Form 8874-B history", async () => {
  const notice = {
    notice_document_reference: "2025 CDE Form 8874-B event",
    cde_name: issuance.cde_name,
    cde_ein: issuance.cde_ein,
    investor_name: issuance.investor_name,
    investor_tin: issuance.investor_tin,
    initial_investment_date: issuance.initial_investment_date,
    qualified_equity_investment_amount:
      issuance.qualified_equity_investment_amount,
    recapture_event_date: "2025-06-01",
    notice_credit_amount: 1_500,
    recapture_event: "cde_redeemed_investment",
    aggregate_decrease_by_credit_year: [500, 500, 500, 0, 0, 0, 0],
    cde_official_signed_notice_confirmed: true,
    cde_awareness_date: "2025-06-02",
    cde_signature_date: "2025-06-05",
    notice_provided_to_investor_date: "2025-06-20",
  };
  const noticeBytes = utf8.encode(
    "Synthetic signed CDE Form 8874-B: 2025 event",
  );
  const history = [{
    notice,
    noticeBytes,
    noticeSha256: await sha(noticeBytes),
  }];
  await assertRejects(
    () =>
      reconcileForm8874NoEventStatus(status, issuance, history, evidenceBytes),
    Error,
    "history conflicts",
  );
  await assertRejects(
    () =>
      reconcileForm8874NoEventStatus(
        {
          ...status,
          reviewed_form8874b_notice_references: [
            notice.notice_document_reference,
          ],
        },
        issuance,
        history,
        evidenceBytes,
      ),
    Error,
    "history conflicts",
  );
  await assertRejects(
    () =>
      reconcileForm8874NoEventStatus(status, issuance, [{
        ...history[0],
        noticeBytes: utf8.encode("altered Form 8874-B bytes"),
      }], evidenceBytes),
    Error,
    "history bytes differ",
  );
});
