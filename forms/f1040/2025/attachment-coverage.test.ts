import { assertThrows } from "@std/assert";
import { assertAttachmentCoverage } from "./attachment-coverage.ts";
import { form8992Pending } from "./form8992.fixture.ts";
import { form8882Fixture } from "../nodes/inputs/f8882/fixture.ts";
import { form8941FiledFixture } from "../nodes/inputs/f8941/fixture.ts";

Deno.test("reviewed no-distribution Category 4/5a Form 5471 stays gated at both exports", () => {
  for (const kind of ["mef", "pdf"] as const) {
    assertThrows(
      () => assertAttachmentCoverage(form8992Pending, kind),
      Error,
      "Schedule R all-zero treatment",
    );
  }
});

Deno.test("only a trust K-1 with box 13 code B needs the unregistered attachment", () => {
  const ordinary = { estate_trust_name: "First Trust", box1_interest: 100 };
  const backup = {
    estate_trust_name: "Second Trust",
    box13_code_b_backup_withholding: 125,
  };
  for (const kind of ["mef", "pdf"] as const) {
    assertAttachmentCoverage({ k1_trust: { k1_trusts: [ordinary] } }, kind);
    assertThrows(
      () =>
        assertAttachmentCoverage(
          { k1_trust: { k1_trusts: [ordinary, backup] } },
          kind,
        ),
      Error,
      "trust K-1 backup withholding",
    );
  }
});

Deno.test("native attachment preflight blocks unfiled public inputs", () => {
  for (
    const pending of [
      { clergy: { clergys: [{ ministerial_wages: 50_000 }] } },
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
      { f8881: { startup: { startup_costs: 100 } } },
      { f8881: { auto_enrollment: { maintained_in_2025_confirmed: true } } },
      { f3800: { f8881_credit: { part_i_credit: 750 } } },
      { f8874: { investments: [{}] } },
      { f8882: { facility_contract: {} } },
      { f8941: {} },
      { f8908: { f8908s: [{}] } },
      { f1310: { claimant_type: "other" } },
      { f2120: { support_amount: 100 } },
      { f8332: { child_name: "Child" } },
      { f8379: { injured_spouse_name: "Spouse" } },
      { f5471: { f5471s: [{}] } },
      { form8582: { prior_unallowed: 5_000 } },
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

Deno.test("Form 8882 guard admits only its sourced direct employer contract", () => {
  const source = form8882Fixture();
  for (const kind of ["mef", "pdf"] as const) {
    assertAttachmentCoverage({ f8882: source }, kind);
    assertThrows(() => assertAttachmentCoverage({ f8882: {} }, kind));
  }
});

Deno.test("Form 8941 guard binds source, allowed credit, and Schedule C", () => {
  const pending = form8941FiledFixture();
  for (const kind of ["mef", "pdf"] as const) {
    assertAttachmentCoverage(pending, kind);
    assertThrows(() =>
      assertAttachmentCoverage({ f3800: pending.f3800 }, kind)
    );
    assertThrows(() =>
      assertAttachmentCoverage({ ...pending, schedule_c: undefined }, kind)
    );
  }
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

Deno.test("Form 8886 review blocks a single $2 million gross disposition loss in both exports", () => {
  // This is a raw attachment-coverage negative fixture, not a filed 1099-B:
  // no recipient/filer is supplied because the reportable-transaction gate
  // must reject before a source-owner claim is made.
  const row = {
    source_transaction_id: "sale-2025-large-loss",
    proceeds: 100_000,
    cost_basis: 2_100_000,
    adjustment_amount: 1_500_000,
  };
  for (const kind of ["mef", "pdf"] as const) {
    for (
      const pending of [
        { f8949: { f8949s: [row] } },
        { f1099b: { f1099bs: [row] } },
        { form8949: [row] },
        { form8949: { transaction: row } },
      ]
    ) {
      assertThrows(
        () => assertAttachmentCoverage(pending, kind),
        Error,
        "Form 8886 review required for a single Form 8949/1099-B disposition",
      );
    }
    assertAttachmentCoverage({
      f8949: { f8949s: [{ ...row, cost_basis: 2_099_999 }] },
    }, kind);
  }
});

Deno.test("Form 8886 review blocks a $2 million Form 4684 business casualty before netting", () => {
  const casualty = {
    business_fmv_before: 3_000_000,
    business_fmv_after: 500_000,
    business_basis: 2_100_000,
    business_insurance: 100_000,
    business_is_section_1231: true,
  };
  for (const kind of ["mef", "pdf"] as const) {
    assertThrows(
      () => assertAttachmentCoverage({ form4684: casualty }, kind),
      Error,
      "Form 8886 review required for a Form 4684 business casualty",
    );
    assertAttachmentCoverage({
      form4684: { ...casualty, business_insurance: 100_001 },
    }, kind);
    assertAttachmentCoverage({
      form4684: { ...casualty, business_fmv_after: 1_100_000 },
    }, kind);
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
      "outside the reviewed stock loss or one new formal note",
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
    { f8854: { initial_filing: true } },
    { f8854_annual: { annual_filing: true } },
  ];
  for (const pending of active) {
    assertAttachmentCoverage(pending, "mef");
    assertThrows(
      () => assertAttachmentCoverage(pending, "pdf"),
      Error,
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
        eligible_expenditures: 5_000,
        prior_year_gross_receipts: 500_000,
        prior_year_full_time_employee_count: 20,
        subject_to_passive_activity_limit: false,
      },
    },
    "pdf",
  );
  assertAttachmentCoverage(
    {
      f8826: {
        eligible_expenditures: 0,
        subject_to_passive_activity_limit: false,
      },
    },
    "pdf",
  );
  assertThrows(
    () => assertAttachmentCoverage({ f8874: { investments: [{}] } }, "pdf"),
    Error,
    "authenticated CDE status and recapture history",
  );
  assertAttachmentCoverage({ f8874: { investments: [] } }, "pdf");
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
