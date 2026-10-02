import { assertEquals, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { AccountType } from "../nodes/inputs/f8888/index.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import { buildPending } from "../2025/mef/pending.ts";
import { type FilerIdentity, FilingStatus } from "../2025/mef/types.ts";
import { assertAttachmentCoverage } from "../2025/attachment-coverage.ts";

const filer: FilerIdentity = {
  primarySSN: "111223333",
  nameLine1: "TEST TAXPAYER",
  nameControl: "TEST",
  firstName: "Test",
  lastName: "Taxpayer",
  firstNameWithInitial: "Test",
  fullName: "Test Taxpayer",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

Deno.test("clergy housing cannot reach a prepared return without matched source facts", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      clergy: [{
        ministerial_wages: 50_000,
        housing_allowance_designated: 12_000,
        actual_housing_expenses: 10_000,
        fair_market_rental_value: 15_000,
        is_ordained_minister: true,
      }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(
    result.diagnostics.some((entry) =>
      entry.nodeType === "clergy" &&
      entry.message.includes("needs a matched W-2")
    ),
    true,
  );
  assertThrows(
    () => buildMefXml(buildPending(result.pending), filer),
    Error,
    "Clergy income needs matched W-2",
  );
});

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
  home_phone_number: "5125550140",
  best_time_to_call_at_home: "MORNINGS",
  proposed_monthly_payment: 100,
  payment_due_day: 15,
  payment_method: "manual_monthly_payment",
};

const stockLossInputs = {
  general: {
    filing_status: "single",
    taxpayer_first_name: "Test",
    taxpayer_last_name: "Taxpayer",
    taxpayer_ssn: "111-22-3333",
    taxpayer_dob: "1985-06-15",
    address_line1: "1 Test Way",
    address_city: "Austin",
    address_state: "TX",
    address_zip: "78701",
    digital_assets: false,
  },
  k1_s_corp: [{
    corporation_name: "Test S Corp",
    box1_ordinary_business: -4_000,
    corporation_ein: "123456789",
    source_document_reference: "2025 S corporation K-1",
    form7203_stock_loss_ledger: {
      shareholder_ssn: "111223333",
      shareholder_name_as_on_k1: "TEST TAXPAYER",
      corporation_ein: "123456789",
      beginning_stock_basis: 3_000,
      beginning_basis_workpaper_reference: "2024 shareholder stock ledger",
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
};

const seniorZeroExclusionsReview = {
  no_section933_puerto_rico_excluded_income: true,
  section933_review_source_reference: "2025 residency and income review",
  no_form2555_filed: true,
  form2555_review_source_reference: "2025 foreign-income review",
  no_form4563_filed: true,
  form4563_review_source_reference: "2025 Samoa-source income review",
};

const dependentScheduleRInputs = {
  schedule1a: { senior_zero_exclusions_review: seniorZeroExclusionsReview },
  general: {
    ...stockLossInputs.general,
    taxpayer_dob: "1960-06-15",
    taxpayer_can_be_claimed_as_dependent: true,
    dependent_earned_income: 0,
  },
  f1099int: [{
    payer_name: "Test Bank",
    recipient_tin: "111223333",
    box1: 9_500,
  }],
  schedule_b_part_iii: {
    foreign_accounts_question: false,
    foreign_trust_question: false,
  },
  schedule_r: {
    filing_status: "single",
    taxpayer_age_65_or_older: true,
    age_65_source_reference: "1960-06-15 date of birth",
    agi: 9_500,
    nontaxable_ssa: 0,
  },
};

const RETURN_XSD_PATH = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
let returnXsdAvailable = false;
try {
  Deno.statSync(RETURN_XSD_PATH);
  returnXsdAvailable = true;
} catch {
  // The official IRS schema bundle is local-only.
}

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
    "Form 1040 refund distribution requires a positive refund",
  );
});

Deno.test("reviewed Form 9465 request stays blocked in MeF and PDF", () => {
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
    "Form 9465 attached installment request remains blocked until IRS guidance establishes how its separate third-party disclosure authorization is signed",
  );
  assertThrows(
    () => assertAttachmentCoverage(pending, "pdf"),
    Error,
    "Form 9465 attached installment request remains blocked until IRS guidance establishes how its separate third-party disclosure authorization is signed",
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
        stockLossInputs,
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
        ? "Schedule R filing needs sourced taxpayer/spouse age and benefit facts"
        : `${formName} requires a native filing document`,
    );
  }
});

Deno.test("age-65 Schedule R cannot create a credit on a zero-tax Form 1040", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    schedule1a: { senior_zero_exclusions_review: seniorZeroExclusionsReview },
    general: {
      ...stockLossInputs.general,
      taxpayer_dob: "1950-06-15",
      taxpayer_age_65_or_older: true,
    },
    w2: [{
      employer_ein: "12-3456789",
      employer_name: "ACME CORP",
      employer_address_line1: "500 Market St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      employee_ssn: "111-22-3333",
      box1_wages: 10_000,
      box2_fed_withheld: 0,
      box3_ss_wages: 10_000,
      box4_ss_withheld: 620,
      box5_medicare_wages: 10_000,
      box6_medicare_withheld: 145,
    }],
    schedule_r: {
      filing_status: "single",
      taxpayer_age_65_or_older: true,
      age_65_source_reference: "1950-06-15 date of birth",
      agi: 10_000,
      nontaxable_ssa: 0,
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(
    result.diagnostics.some((diagnostic) =>
      diagnostic.nodeType === "f1040" &&
      diagnostic.message.includes("Schedule R line 22 exceeds")
    ),
    true,
  );
  assertEquals(
    Object.hasOwn(
      buildPending(result.pending).f1040 ?? {},
      "line21_credits_total",
    ),
    false,
  );
  assertThrows(
    () => buildMefXml(buildPending(result.pending), filer),
    Error,
    "Schedule R credit and tax limit",
  );
});

Deno.test("Schedule R cannot override a conflicting Form 1040 birth date", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    ...dependentScheduleRInputs,
    general: {
      ...dependentScheduleRInputs.general,
      taxpayer_dob: "1985-06-15",
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(
    result.diagnostics.some((entry) =>
      entry.nodeType === "f1040" &&
      entry.message.includes("Schedule R credit needs")
    ),
    true,
  );
  assertThrows(
    () => buildMefXml(buildPending(result.pending), filer),
    Error,
    "Schedule R age-65 source must match",
  );
});

Deno.test({
  name: "XSD: dependent age-65 Schedule R credit reaches a full Form 1040",
  ignore: !returnXsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    dependentScheduleRInputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(
    result.diagnostics.filter((entry) => entry.severity === "error"),
    [],
  );
  const pending = buildPending(result.pending);
  assertEquals(pending.f1040?.line11_agi, 9_500);
  assertEquals(pending.f1040?.line12a_standard_deduction, 3_350);
  assertEquals(pending.f1040?.line18_total_tax_before_credits, 618);
  assertEquals(pending.schedule3?.line6d_elderly_disabled_credit, 600);
  assertEquals(pending.f1040?.line20_nonrefundable_credits, 600);
  assertEquals(pending.f1040?.line22_tax_after_credits, 18);
  const xml = buildMefXml(pending, filer);
  assertEquals(xml.includes("<PrimaryClaimAsDependentInd>X"), true);
  assertEquals(xml.includes("<IRS1040ScheduleB"), true);
  assertEquals(xml.includes("<IRS1040ScheduleR"), true);
  assertEquals(
    xml.includes(
      "<CreditForElderlyOrDisabledAmt>600</CreditForElderlyOrDisabledAmt>",
    ),
    true,
  );
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", RETURN_XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(path);
  }
});

Deno.test({
  name:
    "XSD: sourced under-65 disability Schedule R credit reaches a full Form 1040",
  ignore: !returnXsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const disabilityInputs = {
    ...dependentScheduleRInputs,
    general: {
      ...dependentScheduleRInputs.general,
      taxpayer_dob: "1985-06-15",
      taxpayer_age_65_or_older: false,
      dependent_earned_income: 5_000,
    },
    w2: [{
      employer_ein: "12-3456789",
      employer_name: "ACME CORP",
      employer_address_line1: "500 Market St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      employee_ssn: "111-22-3333",
      box1_wages: 5_000,
      box2_fed_withheld: 0,
      box3_ss_wages: 5_000,
      box4_ss_withheld: 310,
      box5_medicare_wages: 5_000,
      box6_medicare_withheld: 72.5,
    }],
    schedule_r: {
      filing_status: "single",
      taxpayer_age_65_or_older: false,
      taxpayer_disabled: true,
      taxpayer_disability_income: 5_000,
      taxpayer_disability_evidence: {
        retired_on_permanent_total_disability: true,
        below_mandatory_retirement_age_on_january_1: true,
        unable_to_perform_substantial_gainful_activity: true,
        condition_expected_to_last_one_year_or_result_in_death_verified: true,
        disability_income_source_reference: "ACME disability W-2",
        disability_income_reported_on: "wages",
        eligibility_source_reference: "Retirement and work-capacity review",
        physician_statement: "current_year",
        physician_statement_source_reference: "Signed 2025 physician statement",
        physician_or_va_statement_signed_verified: true,
      },
      agi: 14_500,
      nontaxable_ssa: 0,
    },
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    disabilityInputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(
    result.diagnostics.filter((entry) => entry.severity === "error"),
    [],
  );
  const pending = buildPending(result.pending);
  assertEquals(pending.schedule3?.line6d_elderly_disabled_credit, 225);
  const xml = buildMefXml(pending, filer);
  assertEquals(
    xml.includes(
      "<Und65RtdPermnntTotDsbltyInd>X</Und65RtdPermnntTotDsbltyInd>",
    ),
    true,
  );
  assertEquals(
    xml.includes("<TaxableDisabilityAmt>5000</TaxableDisabilityAmt>"),
    true,
  );
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", RETURN_XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(path);
  }
});

Deno.test({
  name:
    "XSD: reviewed Form 7203 loss joins full Form 1040, Schedule 1 and Schedule E",
  ignore: !returnXsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    stockLossInputs,
    { taxYear: 2025, formType: "f1040" },
  );
  const pending = buildPending(result.pending);
  const xml = buildMefXml(pending, filer);
  for (
    const value of [
      "<IRS1040 documentId=",
      "<IRS1040Schedule1 documentId=",
      "<IRS1040ScheduleE documentId=",
      "<IRS7203 documentId=",
      "<TotalAdditionalIncomeAmt>-3000</TotalAdditionalIncomeAmt>",
      "<TotalSuppIncomeOrLossAmt>-3000</TotalSuppIncomeOrLossAmt>",
      "<ShrCarryoverAmountsGrp><OrdinaryBusinessLossAmt>1000</OrdinaryBusinessLossAmt>",
    ]
  ) {
    assertEquals(xml.includes(value), true, value);
  }
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", RETURN_XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(path);
  }
});

Deno.test({
  name: "XSD: split Form 8888 refund matches a W-2 Form 1040 refund",
  ignore: !returnXsdAvailable,
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const inputs = {
    general: stockLossInputs.general,
    w2: [{
      employer_ein: "12-3456789",
      employer_name: "ACME CORP",
      employer_address_line1: "500 Market St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      employee_ssn: "111-22-3333",
      box1_wages: 30_000,
      box2_fed_withheld: 3_000,
      box3_ss_wages: 30_000,
      box4_ss_withheld: 1_860,
      box5_medicare_wages: 30_000,
      box6_medicare_withheld: 435,
    }],
    f8888: {
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
        amount: 1_225,
        owner_name: "Test Taxpayer",
      },
    },
  };
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  const pending = buildPending(result.pending);
  assertEquals(pending.f1040?.line34_overpayment, 1_525);
  assertEquals(pending.f1040?.line35a_refund, 1_525);
  const xml = buildMefXml(pending, filer);
  for (
    const value of [
      "<RefundAmt>1525</RefundAmt>",
      "<IRS8888 documentId=",
      "<DirectDepositRefundAmt>300</DirectDepositRefundAmt>",
      "<DirectDepositRefundAmt>1225</DirectDepositRefundAmt>",
      "<TotalAllocationOfRefundAmt>1525</TotalAllocationOfRefundAmt>",
    ]
  ) {
    assertEquals(xml.includes(value), true, value);
  }
  const path = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(path, xml);
    const checked = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", RETURN_XSD_PATH, path],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  } finally {
    await Deno.remove(path);
  }
});
