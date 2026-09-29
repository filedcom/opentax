import { assertEquals, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { AccountType } from "../nodes/inputs/f8888/index.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import { buildPending } from "../2025/mef/pending.ts";
import { type FilerIdentity, FilingStatus } from "../2025/mef/types.ts";

const filer: FilerIdentity = {
  primarySSN: "111223333",
  nameLine1: "TEST TAXPAYER",
  nameControl: "TEST",
  fullName: "Test Taxpayer",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

const attached9465 = {
  filing_mode: "attached_2025_1040",
  tax_year: 2025,
  reviewed_source: {
    reviewed_by: "Reviewer One",
    reviewed_on: "2026-04-01",
    final_form1040_reference: "reviewed-final-2025-1040",
    irs_account_review_reference: "reviewed-irs-account-2026-04-01",
    no_other_tax_period_balance_confirmed: true,
    no_payment_with_request_confirmed: true,
    cannot_pay_in_full_within_180_days_confirmed: true,
    no_existing_installment_agreement_confirmed: true,
    no_default_in_last_12_months_confirmed: true,
    no_bankruptcy_or_offer_in_compromise_confirmed: true,
    address_unchanged_since_last_return_confirmed: true,
    taxpayer_authorized_attached_request_confirmed: true,
  },
  final_1040_line37_amount_owed: 7_200,
  proposed_monthly_payment: 100,
  payment_due_day: 15,
  payment_method: "manual_monthly_payment",
};

Deno.test("Form 8888 split refund cannot export without a matching final refund", () => {
  const fields = {
    account_1: {
      routing_number: "021000021",
      account_number: "111222333",
      account_type: AccountType.Checking,
      amount: 300,
      owner_name: "Test Taxpayer",
    },
    account_2: {
      routing_number: "021000021",
      account_number: "444555666",
      account_type: AccountType.Savings,
      amount: 700,
      owner_name: "Test Taxpayer",
    },
  };
  const result = execute(buildExecutionPlan(registry), registry, {
    f8888: fields,
  }, { taxYear: 2025, formType: "f1040" });
  const pending = buildPending(result.pending);
  assertEquals(pending.f8888, fields);
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "Form 8888 line 5 must equal finalized Form 1040 line 35a refund",
  );
});

Deno.test("Form 9465 installment request cannot disappear from MeF", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    f9465: attached9465,
  }, { taxYear: 2025, formType: "f1040" });
  const pending = buildPending(result.pending);
  assertEquals(
    (pending as unknown as Record<string, unknown>).f9465,
    attached9465,
  );
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "Form 9465 requires a native filing document",
  );
});

Deno.test("Schedule R stays blocked and reviewed S-corporation stock loss emits its native forms", () => {
  for (
    const [inputs, key, formName] of [
      [
        {
          schedule_r: {
            filing_status: "single",
            taxpayer_age_65_or_older: true,
            agi: 0,
          },
        },
        "schedule_r",
        "Schedule R",
      ],
      [
        {
          k1_s_corp: [{
            corporation_name: "Test S Corp",
            box1_ordinary_business: -4000,
            corporation_ein: "123456789",
            source_document_reference: "2025 S corporation K-1",
            form7203_stock_loss_ledger: {
              shareholder_ssn: "111223333",
              shareholder_name_as_on_k1: "TEST TAXPAYER",
              corporation_ein: "123456789",
              beginning_stock_basis: 3000,
              beginning_basis_workpaper_reference:
                "2024 shareholder stock ledger",
              original_shareholder: true,
              all_shares_one_stock_block: true,
              no_current_year_stock_transactions: true,
              no_section_1367_1_g_election: true,
              no_other_2025_stock_basis_changes: true,
              no_other_schedule_e_activity: true,
              materially_participated_in_s_corporation: true,
              material_participation_workpaper_reference:
                "2025 shareholder participation log",
              no_shareholder_debt_or_repayments: true,
              no_prior_year_suspended_losses: true,
              no_at_risk_or_passive_limitation: true,
            },
          }],
        },
        "form7203",
        "Form 7203",
      ],
    ] as const
  ) {
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      inputs,
      { taxYear: 2025, formType: "f1040" },
    );
    const pending = buildPending(result.pending);
    assertEquals(Object.hasOwn(pending, key), true);
    if (key === "form7203") {
      const filed = pending as unknown as Record<
        string,
        Record<string, unknown>
      >;
      assertEquals(filed.schedule1.line5_schedule_e, -3_000);
      assertEquals(filed.schedule1.line10_total_additional_income, -3_000);
      assertEquals(filed.f1040.line8_additional_income, -3_000);
      const xml = buildMefXml(pending, filer);
      assertEquals(xml.includes("<IRS1040ScheduleE"), true);
      assertEquals(xml.includes("<IRS7203"), true);
      assertEquals(
        xml.includes("<NonpassiveLossAmt>3000</NonpassiveLossAmt>"),
        true,
      );
      assertEquals(
        xml.includes(
          "<TotalSuppIncomeOrLossAmt>-3000</TotalSuppIncomeOrLossAmt>",
        ),
        true,
      );
      continue;
    }
    assertThrows(
      () => buildMefXml(pending, filer),
      Error,
      key === "schedule_r"
        ? "Schedule R native filing needs sourced single-taxpayer age-65 facts"
        : `${formName} requires a native filing document`,
    );
  }
});
