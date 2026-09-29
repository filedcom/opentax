import { assertEquals, assertThrows } from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { buildMefXml } from "../2025/mef/builder.ts";
import { buildPending } from "../2025/mef/pending.ts";
import { type FilerIdentity, FilingStatus } from "../2025/mef/types.ts";

const filer: FilerIdentity = {
  primarySSN: "111223333",
  nameLine1: "TEST TAXPAYER",
  nameControl: "TEST",
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
  softwareId: "12345678",
  originator: { efin: "123456", originatorType: "ERO" },
};

// These source inputs have no registered native TY2025 document. Exercise
// graph routing where a complete source exists; otherwise feed the normalized
// pending shape to the export gate so a rejected input cannot mask a missing
// attachment guard.
Deno.test("QOF holding-only Form 8997 source cannot disappear from MeF", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      f8997: {
        tax_year: 2025,
        complete_annual_ledger_confirmed: true,
        reviewed_annual_workpaper_reference: "qof-ledger-2025",
        prior_year: {
          kind: "continuing",
          filed_form8997_reference: "filed-2024-8997",
          closing_lots: [{
            lot_id: "qof-lot-1",
            qof_ein: "123456789",
            acquired_date: "2022-06-01",
            short_term: 0,
            long_term: 1000,
          }],
        },
        investment_lots: [{
          lot_id: "qof-lot-1",
          qof_ein: "123456789",
          acquired_date: "2022-06-01",
          description: "QOF interest",
          qof_source_document_reference: "fund-2025-statement",
          reviewed_workpaper_reference: "qof-lot-1-workpaper",
          opening_deferred_gain: { short_term: 0, long_term: 1000 },
          events: [],
          closing_deferred_gain: { short_term: 0, long_term: 1000 },
        }],
        uninvested_deferred_gain_at_year_end: { short_term: 0, long_term: 0 },
        foreign_eligible_taxpayer: false,
        treaty_benefits_waived: false,
        no_form1099b_for_disposition: false,
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  const pending = buildPending(result.pending);
  assertEquals(Object.hasOwn(pending, "f8997"), true);
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "Form 8997 requires a native annual QOF holdings document",
  );
});

Deno.test("community-property Form 8958 allocation cannot disappear from MeF", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      f8958: {
        domicile_state: "CA",
        federal_filing_status: "mfs",
        taxpayer: {
          first_name: "Alex",
          last_name: "Example",
          ssn: "111223333",
        },
        spouse: {
          first_name: "Blair",
          last_name: "Example",
          ssn: "222334444",
        },
        community_property_period: {
          from: "2025-01-01",
          through: "2025-12-31",
          domicile_workpaper_reference: "CA-domicile-review",
        },
        reviewed_by: "Reviewer",
        reviewed_on: "2026-04-01",
        return_wide_items_review_reference: "both-spouses-return-review",
        rows: [{
          item_id: "wage-1",
          form_line: 1,
          description: "Employer A",
          source_document_id: "w2-A",
          source_record_reference: "w2-A-box1",
          allocation_basis: "community_equal",
          state_law_workpaper_reference: "CA-wages",
          total_amount: 100_000,
          taxpayer_share: 50_000,
          other_person_share: 50_000,
        }],
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  const pending = buildPending(result.pending);
  assertEquals(Object.hasOwn(pending, "f8958"), true);
  assertThrows(
    () =>
      buildMefXml(pending, {
        ...filer,
        filingStatus: FilingStatus.MarriedFilingSeparately,
      }),
    Error,
    "Form 8958 requires a native community-property allocation document",
  );
});

Deno.test("positive employee-business deduction cannot file without Form 2106", () => {
  const pending = buildPending({
    f2106: { f2106s: [{ other_expenses: 200 }] },
  });
  assertEquals(Object.hasOwn(pending, "f2106"), true);
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "Form 2106 employee expenses require a native attachment",
  );
});

Deno.test("Form 2210 waiver request cannot vanish while a plain penalty remains optional", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    { f2210: { waiver_requested: true, current_year_tax: 2000 } },
    { taxYear: 2025, formType: "f1040" },
  );
  const pending = buildPending(result.pending);
  assertEquals(Object.hasOwn(pending, "f2210"), true);
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "Form 2210 Part II filing reason requires a sourced native attachment",
  );
});

Deno.test("automatic accounting-method change cannot file without Form 3115", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      f3115: [{
        designated_change_number: "7",
        filing_type: "automatic",
        section_481_adjustment: 4000,
        spread_period: 4,
      }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  const pending = buildPending(result.pending);
  assertEquals(Object.hasOwn(pending, "f3115"), true);
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "Form 3115 accounting-method change requires a native attachment",
  );
});

Deno.test("active-duty move cannot file without Form 3903", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      f3903: [{
        active_duty_military: true,
        transportation_storage: 1000,
        travel_expenses: 200,
      }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  const pending = buildPending(result.pending);
  assertEquals(Object.hasOwn(pending, "f3903"), true);
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "Form 3903 moving expenses require a native attachment",
  );
});

Deno.test("direct credit and disclosure sources require their missing native documents", () => {
  for (
    const [key, fields, reason] of [
      [
        "f3468",
        { rehab_certified_historic_qre: 10_000 },
        "Form 3468 direct investment credit requires a native attachment",
      ],
      [
        "f6765",
        { method: "regular", regular_wages: 10_000 },
        "Form 6765 direct research credit requires a native attachment",
      ],
      [
        "f7207",
        { components: [{ component_type: "solar_module", quantity: 100 }] },
        "Form 7207 direct production credit requires a native attachment",
      ],
      [
        "f8801",
        { prior_year_carryforward: 500, current_year_regular_tax: 0 },
        "Form 8801 prior minimum-tax credit requires a native attachment",
      ],
      [
        "f8275",
        { disclosure_type: "position", item_description: "Basis position" },
        "Form 8275 or 8275-R disclosure requires a native attachment",
      ],
      [
        "f8833",
        {
          f8833s: [{
            treaty_country: "Sweden",
            treaty_article: "Article 18",
            description_of_position: "Pension treaty position",
          }],
        },
        "Form 8833 treaty disclosure requires a native attachment",
      ],
      [
        "f8938",
        { max_value_all_assets: 100_000 },
        "Form 8938 foreign-asset disclosure requires a native attachment",
      ],
    ] as const
  ) {
    const pending = buildPending({ [key]: fields });
    assertEquals(Object.hasOwn(pending, key), true, key);
    assertThrows(() => buildMefXml(pending, filer), Error, reason);
  }
});

Deno.test("recapture and employer-credit sources cannot export without native forms", () => {
  for (
    const [key, fields, reason] of [
      [
        "f8828",
        {
          f8828s: [{
            original_loan_amount: 100_000,
            subsidy_rate: 0.03,
            holding_period_years: 2,
            gain_on_sale: 0,
            modified_agi: 50_000,
            repayment_income_limit: 100_000,
          }],
        },
        "Form 8828 mortgage-credit recapture needs a native attachment",
      ],
      [
        "f8844",
        {
          f8844s: [{
            qualified_zone_wages: 1_000,
            employee_lives_in_zone: true,
            employee_works_in_zone: true,
          }],
        },
        "Form 8844 direct employer wage credit needs a native attachment",
      ],
      [
        "f8881",
        {
          plan_type: "401k",
          non_hce_count: 5,
          employee_count: 5,
          startup_costs: 1_000,
        },
        "Form 8881 startup or auto-enrollment credit needs a native attachment",
      ],
      [
        "f8882",
        { qualified_childcare_expenses: 1_000 },
        "Form 8882 employer child-care credit needs a native attachment",
      ],
      [
        "f8908",
        {
          f8908s: [{
            construction_type: "single_family",
            energy_certification: "zero_energy_ready",
          }],
        },
        "Form 8908 energy-efficient home credit needs a native attachment",
      ],
      [
        "f8994",
        { employees: [{ fmla_wages: 1_000, wage_replacement_pct: 0.6 }] },
        "Form 8994 paid-leave credit needs a native attachment",
      ],
    ] as const
  ) {
    const pending = buildPending({ [key]: fields });
    assertEquals(Object.hasOwn(pending, key), true, key);
    assertThrows(() => buildMefXml(pending, filer), Error, reason);
  }
});

Deno.test("refund, dependent, allocation, and foreign-corporation sources cannot vanish", () => {
  for (
    const [key, fields, reason] of [
      [
        "f1310",
        {
          deceased_name: "DECEASED TAXPAYER",
          deceased_ssn: "111223333",
          date_of_death: "2025-04-01",
          claimant_name: "REFUND CLAIMANT",
          claimant_type: "other",
        },
        "Form 1310 refund-claim authority needs a native filing review",
      ],
      [
        "f2120",
        { dependent_name: "SUPPORTED RELATIVE", calendar_year: 2025 },
        "Form 2120 multiple-support claim needs a native filing review",
      ],
      [
        "f8332",
        {
          custodial_parent_name: "CUSTODIAL PARENT",
          noncustodial_parent_name: "CLAIMING PARENT",
          children: [{ name: "CHILD" }],
          tax_years_released: [2025],
        },
        "Form 8332 dependent-release facts need a native filing review",
      ],
      [
        "f8379",
        { debt_type: "student_loan", debt_amount: 100 },
        "Form 8379 injured-spouse allocation needs a native filing review",
      ],
      [
        "f5471",
        {
          f5471s: [{
            foreign_corp_name: "FOREIGN CORPORATION",
            country_of_incorporation: "SE",
            filing_category: "4",
          }],
        },
        "Form 5471 foreign-corporation reporting needs native schedules",
      ],
    ] as const
  ) {
    const pending = buildPending({ [key]: fields });
    assertEquals(Object.hasOwn(pending, key), true, key);
    assertThrows(() => buildMefXml(pending, filer), Error, reason);
  }
});

Deno.test("NOL carryforward cannot lower AGI from asserted loss and taxable-income amounts", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      nol_carryforward: {
        nol_carryforwards: [{
          year: 2023,
          nol_amount: 10_000,
          nol_type: "POST2017",
        }],
        current_year_taxable_income: 50_000,
      },
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(
    result.diagnostics.some((entry) =>
      entry.nodeType === "nol_carryforward" &&
      entry.message.includes("NOL carryforward needs sourced Form 172")
    ),
    true,
  );
});

Deno.test("Form 8082 inconsistent K-1 notice cannot disappear from the filed return", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      f8082: [{
        entity_type: "PARTNERSHIP",
        entity_name: "PARTNERSHIP",
        entity_ein: "12-3456789",
        schedule_k1_item_description: "Ordinary income",
        amount_as_reported: 10_000,
        amount_as_claimed: 8_000,
      }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  const pending = buildPending(result.pending);
  assertEquals(Object.hasOwn(pending, "f8082"), true);
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "Form 8082 inconsistent-treatment notice requires a native attachment",
  );
});

Deno.test("Form 8697 interest owed/refund source rejects before a wrong Schedule 1 route", () => {
  for (const net_interest of [300, -200, 0]) {
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      { f8697: [{ contract_type: "regular", net_interest }] },
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(
      result.diagnostics.some((entry) =>
        entry.nodeType === "f8697" &&
        entry.message.includes(
          "Form 8697 look-back interest needs its Schedule 2 line 17n or separate-refund filing branch",
        )
      ),
      true,
    );
  }
});

Deno.test("Form 8866 income-forecast look-back source rejects before wrong Schedule 1 route", () => {
  for (const interest_owed_or_due of [300, -200, 0]) {
    const result = execute(
      buildExecutionPlan(registry),
      registry,
      {
        f8866: [{
          property_description: "Film",
          date_placed_in_service: "2022-01-15",
          lookback_year: "3rd",
          interest_owed_or_due,
        }],
      },
      { taxYear: 2025, formType: "f1040" },
    );
    assertEquals(
      result.diagnostics.some((entry) =>
        entry.nodeType === "f8866" &&
        entry.message.includes(
          "Form 8866 look-back interest needs its Schedule 2 line 17n or separate-refund filing branch",
        )
      ),
      true,
    );
  }
});

Deno.test("paid-preparer Form 8867 source cannot disappear from MeF", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      f8867: [{
        credits_claimed: ["EITC"],
        taxpayer_interview_conducted: true,
      }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  const pending = buildPending(result.pending);
  assertEquals(Object.hasOwn(pending, "f8867"), true);
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "Form 8867 preparer due-diligence checklist needs native filing review",
  );
});

Deno.test("Form 8873 asserted extraterritorial exclusion cannot file without attachment", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      f8873: [{
        qualifying_foreign_trade_income: 1_000,
        extraterritorial_income_excluded: 300,
      }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  const pending = buildPending(result.pending);
  assertEquals(Object.hasOwn(pending, "f8873"), true);
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "Form 8873 exclusion needs a native attachment",
  );
});

Deno.test("Form 8896 small-refiner credit cannot file without attachment", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      f8896: [{ gallons_ulsd_produced: 1_000, qualified_capital_costs: 1_000 }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  const pending = buildPending(result.pending);
  assertEquals(Object.hasOwn(pending, "f8896"), true);
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "Form 8896 credit needs a native attachment",
  );
});

Deno.test("Form 970 sole-proprietor LIFO election cannot disappear from MeF", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      f970: [{
        business_name: "TEST BUSINESS",
        employer_id: "12-3456789",
        first_year_lifo_elected: 2025,
        inventory_method_before: "cost",
      }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  const pending = buildPending(result.pending);
  assertEquals(Object.hasOwn(pending, "f970"), true);
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "Form 970 LIFO election needs a native filing review",
  );
});
