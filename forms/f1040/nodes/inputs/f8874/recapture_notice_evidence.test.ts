import { assertEquals, assertThrows } from "@std/assert";
import { withReviewedForm8874A } from "./issuance_fixture.ts";
import { calculateForm8874Recapture } from "./recapture_node.ts";
import { schedule2 } from "../../../2025/mef/forms/taxes/schedule2.ts";
import { schedule2Pdf } from "../../../2025/pdf/forms/taxes/schedule2.ts";
import {
  form8874BNoticeSchema,
  reconcileForm8874BReportedEvent,
} from "./recapture_notice_evidence.ts";

const issuance = withReviewedForm8874A(
  {
    cde_name: "Community Development Entity",
    cde_ein: "123456789",
    initial_investment_date: "2022-05-01",
    qualified_equity_investment_amount: 100_000,
    designation_notice_reference: "2022 QEI designation",
  },
  "Alex Owner",
  "111223333",
).reviewed_form8874a;
const notice = form8874BNoticeSchema.parse({
  notice_document_reference: "CDE 2025 Form 8874-B",
  cde_name: issuance.cde_name,
  cde_ein: issuance.cde_ein,
  investor_name: issuance.investor_name,
  investor_tin: issuance.investor_tin,
  initial_investment_date: issuance.initial_investment_date,
  qualified_equity_investment_amount:
    issuance.qualified_equity_investment_amount,
  recapture_event_date: "2025-06-01",
  notice_credit_amount: 21_000,
  recapture_event: "cde_redeemed_investment",
  aggregate_decrease_by_credit_year: [5_000, 5_000, 5_000, 6_000, 0, 0, 0],
  cde_official_signed_notice_confirmed: true,
  cde_awareness_date: "2025-06-02",
  cde_signature_date: "2025-06-05",
  notice_provided_to_investor_date: "2025-06-20",
});
const recapture = {
  reviewed_form8874a: issuance,
  reviewed_form8874b: notice,
  notice_reference: notice.notice_document_reference,
  investment_reference: issuance.notice_document_reference,
  cde_name: notice.cde_name,
  cde_ein: notice.cde_ein,
  notice_taxpayer_tin: notice.investor_tin,
  initial_investment_date: notice.initial_investment_date,
  qualified_equity_investment_amount: notice.qualified_equity_investment_amount,
  notice_credit_amount: notice.notice_credit_amount,
  recapture_event_date: notice.recapture_event_date,
  recapture_event: notice.recapture_event,
  prior_years: [{
    tax_year: 2024,
    original_return_due_date: "2025-04-15",
    section38_credit_allowed_as_filed: 9_000,
    section38_credit_allowed_without_this_qei: 7_000,
    recomputation_reference: "2024 Form 3800 recomputation",
  }],
  carryover_ledger_reference: "2024 Form 3800 Part IV and QEI workpaper",
  carryover_vintages: [{
    originating_tax_year: 2024,
    credit_generated_as_filed: 5_000,
    credit_carried_to_2025_before_recapture: 3_000,
    source_document_reference: "2024 QEI carryover workpaper",
    historical_uses: [{
      tax_year: 2024,
      credit_allowed: 2_000,
      return_reference: "2024 filed Form 3800",
    }],
  }],
};
const recaptureSource = { recaptures: [recapture] };
const pending = {
  f1040: {
    taxpayer_first_name: "Alex",
    taxpayer_last_name: "Owner",
    taxpayer_ssn: "111-22-3333",
  },
  f8874_recapture: recaptureSource,
  schedule2: {
    line17a_new_markets_credit_recapture: calculateForm8874Recapture(
      recaptureSource,
    ),
  },
};

Deno.test("Form 8874-B event joins issuance, recapture source and Schedule 2", () => {
  const result = reconcileForm8874BReportedEvent(notice, issuance, pending);
  assertEquals(
    result.schedule2Line17a,
    pending.schedule2.line17a_new_markets_credit_recapture,
  );
  assertEquals(
    result.recapture.notice_reference,
    notice.notice_document_reference,
  );
});

Deno.test("Form 8874-B native and PDF Schedule 2 preflight the reviewed event", () => {
  const fields = {
    line17a_new_markets_credit_recapture:
      pending.schedule2.line17a_new_markets_credit_recapture,
  };
  const native = schedule2.build(fields, { pending });
  assertEquals(native.includes("<OtherCreditsCd>NMCR</OtherCreditsCd>"), true);
  const printed = schedule2Pdf.projectFields!(fields, pending);
  assertEquals(printed.line17a_description, "NMCR");
  for (
    const changedPending of [
      { ...pending, f1040: { ...pending.f1040, taxpayer_ssn: "222334444" } },
      {
        ...pending,
        f8874_recapture: {
          recaptures: [{
            ...recapture,
            reviewed_form8874b: { ...notice, cde_ein: "999999999" },
          }],
        },
      },
    ]
  ) {
    assertThrows(
      () => schedule2.build(fields, { pending: changedPending }),
      Error,
    );
    assertThrows(
      () => schedule2Pdf.projectFields!(fields, changedPending),
      Error,
    );
  }
  assertThrows(
    () =>
      schedule2Pdf.projectFields!(
        { line17a_new_markets_credit_recapture: 1 },
        pending,
      ),
    Error,
  );
});

Deno.test("Form 8874-B rejects absent, late or tampered event evidence", () => {
  for (
    const changed of [
      { ...notice, cde_official_signed_notice_confirmed: false },
      { ...notice, notice_provided_to_investor_date: "2025-09-01" },
      { ...notice, cde_ein: "999999999" },
      { ...notice, investor_tin: "222334444" },
      { ...notice, recapture_event_date: "2025-07-01" },
      {
        ...notice,
        aggregate_decrease_by_credit_year: [
          5_001,
          5_000,
          5_000,
          6_000,
          0,
          0,
          0,
        ],
      },
    ]
  ) {
    assertThrows(
      () => reconcileForm8874BReportedEvent(changed, issuance, pending),
      Error,
    );
  }
  assertThrows(
    () => reconcileForm8874BReportedEvent(undefined, issuance, pending),
    Error,
  );
  assertThrows(
    () =>
      calculateForm8874Recapture({
        recaptures: [{
          ...recapture,
          reviewed_form8874b: { ...notice, investor_tin: "222334444" },
        }],
      }),
    Error,
  );
  assertThrows(
    () =>
      calculateForm8874Recapture({
        recaptures: [{
          ...recapture,
          reviewed_form8874a: { ...issuance, cde_ein: "999999999" },
        }],
      }),
    Error,
  );
  assertThrows(
    () =>
      reconcileForm8874BReportedEvent(notice, issuance, {
        ...pending,
        f8874_recapture: {
          recaptures: [{ ...recapture, notice_reference: "wrong" }],
        },
      }),
    Error,
  );
  assertThrows(
    () =>
      reconcileForm8874BReportedEvent(notice, issuance, {
        ...pending,
        schedule2: { line17a_new_markets_credit_recapture: 1 },
      }),
    Error,
    "Schedule 2",
  );
});
