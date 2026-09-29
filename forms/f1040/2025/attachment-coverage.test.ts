import { assertThrows } from "@std/assert";
import { assertAttachmentCoverage } from "./attachment-coverage.ts";

Deno.test("native attachment preflight blocks unfiled public inputs", () => {
  for (
    const pending of [
      { f8997: { investment_lots: [{ lot_id: "QOF" }] } },
      { f8997: { investment_lots: [{ events: [{}] }] } },
      { f8958: { state: "CA" } },
      { f2106: { f2106s: [{ employee_type: "RESERVIST" }] } },
      { f2210: { waiver_requested: true } },
      { f2210: { partial_waiver_requested: true } },
      { f2210: { annualized_method: true } },
      { f2210: { actual_withholding_dates_method: true } },
      { f2210: { joint_filing_status_change: true } },
      { f2210: { box_e_source: {} } },
      { f3115: { f3115s: [{}] } },
      { f3903: { f3903s: [{}] } },
      { f3468: { solar_energy_property_basis: 1_000 } },
      { f6765: { method: "regular", regular_wages: 1_000 } },
      { f6765: { method: "asc", payroll_tax_election: true } },
      { f7207: { components: [{}] } },
      { f8801: { prior_year_amt_paid: 1_000 } },
      { f8275: { item_description: "Tax position" } },
      { f8833: { f8833s: [{}] } },
      { f8938: { assets: [{}] } },
      { f8828: { f8828s: [{}] } },
      { f8844: { f8844s: [{}] } },
      { f8881: { startup_costs: 100 } },
      { f8881: { has_auto_enrollment: true } },
      { f8882: { resource_referral_expenses: 100 } },
      { f8908: { f8908s: [{}] } },
      { f8994: { employees: [{}] } },
      { f1310: { claimant_type: "other" } },
      { f2120: { support_amount: 100 } },
      { f8332: { child_name: "Child" } },
      { f8379: { injured_spouse_name: "Spouse" } },
      { f5471: { f5471s: [{}] } },
      { form7203: { stock_basis: 1_000 } },
      { f9465: { monthly_payment: 100 } },
      { nol_carryforward: { nol_carryforwards: [{ nol_amount: 100 }] } },
      { schedule1: { line8a_nol_deduction: 100 } },
      { f8082: { f8082s: [{}] } },
      { f8697: { f8697s: [{}] } },
      { f8866: { f8866s: [{}] } },
      { f8867: { f8867s: [{}] } },
      { f8873: { f8873s: [{}] } },
      { f8896: { f8896s: [{}] } },
      { f970: { f970s: [{}] } },
    ]
  ) {
    assertThrows(() => assertAttachmentCoverage(pending, "mef"));
    assertThrows(() => assertAttachmentCoverage(pending, "pdf"));
  }
  assertAttachmentCoverage(
    {
      f8997: {},
      f2106: { f2106s: [] },
      f2210: {
        waiver_requested: false,
        partial_waiver_requested: false,
        annualized_method: false,
        actual_withholding_dates_method: false,
        joint_filing_status_change: false,
      },
      schedule1: { line8a_nol_deduction: 0 },
    },
    "mef",
  );
});

Deno.test("QOF code Z/Y rows cannot export without the annual Form 8997", () => {
  for (const code of ["Z", "Y"]) {
    const row = {
      source_transaction_id: `qof-${code}`,
      adjustment_codes: code,
    };
    for (
      const pending of [
        { form8949: [row] },
        { form8949: { transaction: row } },
        { form8949: { transaction: [row] } },
      ]
    ) {
      assertThrows(
        () => assertAttachmentCoverage(pending, "mef"),
        Error,
        "require the annual Form 8997 attachment",
      );
      assertThrows(
        () => assertAttachmentCoverage(pending, "pdf"),
        Error,
        "require the annual Form 8997 attachment",
      );
    }
  }
});

Deno.test("PDF-only coverage gaps do not suppress a native MeF form", () => {
  const pending = { f8863: { f8863s: [{}] } };
  assertAttachmentCoverage(pending, "mef");
  // The Form 8863 PDF is registered; its descriptor checks supported rows.
  assertAttachmentCoverage(pending, "pdf");
  assertAttachmentCoverage(
    { form461: { line16_excess_business_loss: -100 } },
    "mef",
  );
  assertAttachmentCoverage(
    { f8888: { account_1: { amount: 500 } } },
    "mef",
  );
  assertAttachmentCoverage(
    { f8888: { account_1: { amount: 500 } } },
    "pdf",
  );
  assertAttachmentCoverage(
    { form461: { line16_excess_business_loss: -100 } },
    "pdf",
  );
  for (const kind of ["mef", "pdf"] as const) {
    assertAttachmentCoverage(
      { form7203: { stock_basis_beginning: 3_000, ordinary_loss: 4_000 } },
      kind,
    );
    assertThrows(
      () =>
        assertAttachmentCoverage(
          {
            form7203: {
              stock_basis_beginning: 3_000,
              ordinary_loss: 4_000,
              debt_basis_beginning: 100,
            },
          },
          kind,
        ),
      Error,
      "outside the reviewed stock-only ordinary loss",
    );
  }
  assertAttachmentCoverage(
    { form1116_schedule_b: { case: "current_year_excess" } },
    "pdf",
  );
  assertAttachmentCoverage(
    { form1116_schedule_b: { case: "prior_year_use" } },
    "pdf",
  );
  assertAttachmentCoverage(
    { schedule_r: { taxpayer_age_65_or_older: true } },
    "mef",
  );
  assertAttachmentCoverage(
    { schedule_r: { taxpayer_age_65_or_older: true } },
    "pdf",
  );
});

Deno.test("active native-only taxpayer forms cannot disappear from the PDF packet", () => {
  const active = [
    { f965: { f965s: [{}] } },
    { form8582cr: { credit_sources: [{}] } },
    { f4255: { rows: [{}] } },
    { form8621: { items: [{}] } },
    { f8611: { f8611s: [{}] } },
    {
      f8826: {
        eligible_expenditures: 20_000,
        prior_year_gross_receipts: 900_000,
        prior_year_full_time_employee_count: 40,
        subject_to_passive_activity_limit: false,
      },
    },
    { f8854: { initial_filing: true } },
    { f8854_annual: { annual_filing: true } },
  ];
  for (const pending of active) {
    assertAttachmentCoverage(pending, "mef");
    assertThrows(
      () => assertAttachmentCoverage(pending, "pdf"),
      Error,
      "native filing but no",
    );
  }
  assertAttachmentCoverage(
    { f3800: { f8826_credit_entries: [{ credit_amount: 500 }] } },
    "pdf",
  );
  assertAttachmentCoverage({ f3800: { tax_context: {} } }, "pdf");
  assertAttachmentCoverage({ f965: { f965s: [] } }, "pdf");
  assertAttachmentCoverage({ form8582cr: { credit_sources: [] } }, "pdf");
  assertAttachmentCoverage({ f4255: { rows: [] } }, "pdf");
  assertAttachmentCoverage({ form8621: { items: [] } }, "pdf");
  assertAttachmentCoverage({ f8611: { f8611s: [] } }, "pdf");
  assertAttachmentCoverage(
    {
      f8826: {
        eligible_expenditures: 0,
        subject_to_passive_activity_limit: false,
      },
    },
    "pdf",
  );
  assertAttachmentCoverage({ f8874: { investments: [{}] } }, "pdf");
  assertAttachmentCoverage({ f8854: {} }, "pdf");
  assertAttachmentCoverage({ f8854_annual: {} }, "pdf");
});

Deno.test("Form 8862 requires an explicit ban status and routes active-ban appeals to paper", () => {
  const claim = { claim_eitc: true };
  assertThrows(
    () => assertAttachmentCoverage({ f8862: claim }, "mef"),
    Error,
    "explicit active-ban status",
  );
  assertThrows(
    () => assertAttachmentCoverage({ f8862: claim }, "pdf"),
    Error,
    "explicit active-ban status",
  );
  const appeal = {
    f8862: { ...claim, credit_disallowance_ban_active: true },
  };
  assertThrows(
    () => assertAttachmentCoverage(appeal, "mef"),
    Error,
    "must be mailed",
  );
  assertAttachmentCoverage(appeal, "pdf");
  assertAttachmentCoverage(
    { f8862: { ...claim, credit_disallowance_ban_active: false } },
    "mef",
  );
});
