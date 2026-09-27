import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import type { InputNodeEntry } from "../../../core/types/form-definition.ts";
import { FilingStatus } from "../nodes/types.ts";
import { DependentRelationship } from "../nodes/inputs/general/index.ts";
import { form6251 } from "../nodes/intermediate/forms/form6251/index.ts";
import { buildStartNode } from "../start.ts";
import { inputNodes } from "./inputs.ts";
import { f8949Item2026Schema } from "./nodes/f8949.ts";
import { registry } from "./registry.ts";
import { buildCorePdfBytes2026 } from "./pdf/core.ts";
import { buildPdfBytes2026 } from "./pdf/builder.ts";

const context = { taxYear: 2026, formType: "f1040" };

const filer = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Ada",
  taxpayer_last_name: "Rivera",
  taxpayer_ssn: "111223333",
  taxpayer_dob: "1990-07-12",
  taxpayer_tin_issued_by_due_date: true,
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_citizen_national_or_work_authorized: true,
  digital_assets: false,
  address_line1: "10 Main St",
  address_city: "Boston",
  address_state: "MA",
  address_zip: "02108",
};

const dependentChild = {
  first_name: "Maya",
  last_name: "Rivera",
  ssn: "222334444",
  ssn_valid_for_employment: true,
  ssn_issued_before_due_date: true,
  tin_issued_by_due_date: true,
  dob: "2014-06-15",
  relationship: DependentRelationship.Daughter,
  months_in_home: 12,
  lived_in_us_over_half_year: true,
  us_citizen_national_or_resident: true,
  provided_over_half_own_support: false,
  filed_joint_return_except_refund_only: false,
};

const creditLimitWorksheet = {
  schedule3_line1: 0,
  schedule3_line2: 0,
  schedule3_line3: 0,
  schedule3_line4: 0,
  schedule3_line6d: 0,
  schedule3_line6f: 0,
  schedule3_line6l: 0,
  schedule3_line6m: 0,
  worksheet_b_applies: false,
};

Deno.test("TY2026 broker and digital asset trades reach Schedule D and Form 8949 PDFs", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: { ...filer, digital_assets: true },
    schedule_d: {
      line_6_carryover: 0,
      line_14_carryover: 0,
      qof_disposition: false,
      qof_deferral_or_inclusion: false,
      other_capital_activity: false,
      form4952_filing: false,
    },
    w2: [{ box1_wages: 70_000, box2_fed_withheld: 8_000 }],
    f1099b: [
      {
        payer_name: "Broker",
        box1a_description: "Direct shares",
        box1b_date_acquired: "2026-01-10",
        box1c_date_sold: "2026-06-10",
        box1d_proceeds: 1_200,
        box1e_reported_basis: 1_000,
        box2_term: "short",
        box12_basis_reported_to_irs: true,
      },
      {
        payer_name: "Broker",
        box1a_description: "Corrected shares",
        box1b_date_acquired: "2026-01-10",
        box1c_date_sold: "2026-06-10",
        box1d_proceeds: 2_000,
        box1e_reported_basis: 1_500,
        taxpayer_cost_basis: 1_400,
        box2_term: "short",
        box12_basis_reported_to_irs: true,
      },
    ],
    f1099da: [{
      filer_name: "Digital Broker",
      box1b_digital_asset_name: "Bitcoin",
      box1d_date_acquired: "2025-01-01",
      box1e_date_sold: "2026-07-01",
      box1f_proceeds: 3_000,
      box1g_reported_basis: 2_000,
      box2_basis_reported_to_irs: true,
      box6_term: "long",
    }],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_d.print_line1a_gain, 200);
  assertEquals(result.pending.schedule_d.print_line8a_gain, 1_000);
  assertEquals(result.pending.schedule_d.print_line7_st_total, 800);
  assertEquals(result.pending.schedule_d.print_line15_lt_total, 1_000);
  assertEquals(result.pending.f1040.line7a_capital_gain, 1_800);
  const pdf = await PDFDocument.load(await buildPdfBytes2026(result.pending));
  assertEquals(pdf.getPageCount(), 5);
  assertEquals(pdf.getForm().getFields().length, 0);
  await assertRejects(
    () =>
      buildCorePdfBytes2026({
        f1040: result.pending.f1040,
        scheduleD: result.pending.schedule_d,
      }),
    Error,
    "needs Form 8949",
  );
});

Deno.test("TY2026 unreported capital trades file C/F/I/L Form 8949 pages", async () => {
  const transactions = [
    { asset_kind: "security", term: "short", description: "Private shares" },
    { asset_kind: "security", term: "long", description: "Private land" },
    {
      asset_kind: "digital_asset",
      term: "short",
      description: "Digital token",
    },
    { asset_kind: "digital_asset", term: "long", description: "Digital token" },
  ].map((trade) => ({
    ...trade,
    date_acquired: "2025-01-01",
    date_sold: "2026-06-01",
    proceeds: 1_200,
    cost_basis: 1_000,
  }));
  assertEquals(f8949Item2026Schema.safeParse(transactions[0]).success, true);
  assertEquals(
    f8949Item2026Schema.safeParse({ ...transactions[0], part: "A" }).success,
    false,
  );
  const result = execute(buildExecutionPlan(registry), registry, {
    general: { ...filer, digital_assets: true },
    schedule_d: {
      line_6_carryover: 0,
      line_14_carryover: 0,
      qof_disposition: false,
      qof_deferral_or_inclusion: false,
      other_capital_activity: false,
      form4952_filing: false,
    },
    w2: [{ box1_wages: 70_000, box2_fed_withheld: 8_000 }],
    f8949: transactions,
    f1099b: [{
      payer_name: "Broker",
      box1a_description: "Direct shares",
      box1b_date_acquired: "2026-01-10",
      box1c_date_sold: "2026-06-10",
      box1d_proceeds: 1_200,
      box1e_reported_basis: 1_000,
      box2_term: "short",
      box12_basis_reported_to_irs: true,
    }],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_d.print_line7_st_total, 600);
  assertEquals(result.pending.schedule_d.print_line15_lt_total, 400);
  assertEquals(result.pending.f1040.line7a_capital_gain, 1_000);
  const pdf = await PDFDocument.load(await buildPdfBytes2026(result.pending));
  assertEquals(pdf.getPageCount(), 8);
});

Deno.test("TY2026 W-2 excess Social Security withholding reaches Schedule 3 and PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    w2: [
      {
        box1_wages: 150_000,
        box2_fed_withheld: 20_000,
        box3_ss_wages: 150_000,
        box4_ss_withheld: 9_300,
      },
      {
        box1_wages: 150_000,
        box2_fed_withheld: 20_000,
        box3_ss_wages: 150_000,
        box4_ss_withheld: 9_300,
      },
    ],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule3.line11_excess_ss, 7_161);
  assertEquals(result.pending.schedule3.line15_total, 7_161);
  assertEquals(result.pending.f1040.line31_other_payments, 7_161);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
      schedule3: result.pending.schedule3,
    }),
  );
  assertEquals(pdf.getPageCount(), 3);
});

Deno.test("TY2026 1099-DIV reaches qualified-dividend tax and Form 1040", async () => {
  const facts = {
    general: filer,
    w2: [{ box1_wages: 70_000, box2_fed_withheld: 8_000 }],
    f1099div: [{
      payerName: "North Bank",
      isNominee: false,
      box11: false,
      box1a: 600,
      box1b: 200,
      box4: 50,
    }],
  };
  const plan = buildExecutionPlan(registry);
  const result = execute(plan, registry, facts, context);
  const allOrdinary = execute(plan, registry, {
    ...facts,
    f1099div: [{ ...facts.f1099div[0], box1b: 0 }],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(allOrdinary.diagnostics, []);
  assertEquals(result.pending.f1040.line3a_qualified_dividends, 200);
  assertEquals(result.pending.f1040.line3b_ordinary_dividends, 600);
  assertEquals(result.pending.f1040.line25b_withheld_1099, 50);
  assertEquals(result.pending.f1040.line9_total_income, 70_600);
  assertEquals(result.pending.income_tax_calculation.qualified_dividends, 200);
  if (
    Number(result.pending.f1040.line16_income_tax) >=
      Number(allOrdinary.pending.f1040.line16_income_tax)
  ) {
    throw new Error("TY2026 qualified-dividend tax did not reduce line 16");
  }
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({ f1040: result.pending.f1040 }),
  );
  assertEquals(pdf.getPageCount(), 2);
});

Deno.test("TY2026 dividends over $1,500 reach the filed Schedule B", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    w2: [{ box1_wages: 70_000, box2_fed_withheld: 8_000 }],
    f1099div: [{
      payerName: "North Bank",
      isNominee: false,
      box11: false,
      box1a: 1_600,
      box1b: 200,
    }],
    schedule_b: { foreign_account: false, foreign_trust: false },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_b.file_schedule_b, true);
  assertEquals(result.pending.schedule_b.print_line6_total, 1_600);
  assertEquals(result.pending.schedule_b.print_div_payer_1, "North Bank");
  assertEquals(result.pending.schedule_b.print_div_amount_1, 1_600);
  assertEquals(result.pending.f1040.line3b_ordinary_dividends, 1_600);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
      scheduleB: result.pending.schedule_b,
    }),
  );
  assertEquals(pdf.getPageCount(), 3);
});

Deno.test("TY2026 plain capital gain distributions reach line 7a and PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    schedule_d: {
      line_6_carryover: 0,
      line_14_carryover: 0,
      qof_disposition: false,
      qof_deferral_or_inclusion: false,
      other_capital_activity: false,
      form4952_filing: false,
    },
    w2: [{ box1_wages: 70_000, box2_fed_withheld: 8_000 }],
    f1099div: [{
      payerName: "North Bank",
      isNominee: false,
      box11: false,
      box1a: 0,
      box2a: 5_000,
    }],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line7a_capital_gain, 5_000);
  assertEquals(result.pending.f1040.line7b_schedule_d_not_required, true);
  assertEquals(result.pending.f1040.line9_total_income, 75_000);
  assertEquals(result.pending.income_tax_calculation.net_capital_gain, 5_000);
  assertEquals(result.pending.form8960.line5a_net_gain, 5_000);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({ f1040: result.pending.f1040 }),
  );
  assertEquals(pdf.getPageCount(), 2);
  await assertRejects(
    () =>
      buildCorePdfBytes2026({
        f1040: {
          ...result.pending.f1040,
          line7b_schedule_d_not_required: false,
        },
      }),
    Error,
    "needs Schedule D",
  );
});

Deno.test("TY2026 direct capital-gain reporting requires return-level facts", async () => {
  const facts = {
    general: filer,
    f1099div: [{
      payerName: "North Bank",
      isNominee: false,
      box11: false,
      box1a: 0,
      box2a: 5_000,
    }],
  };
  const plan = buildExecutionPlan(registry);
  const missing = execute(plan, registry, facts, context);
  assertEquals(missing.diagnostics.length, 1);
  assertMatch(
    missing.diagnostics[0].message,
    /needs carryover amounts and capital-activity declarations/,
  );
  const carryover = execute(plan, registry, {
    ...facts,
    schedule_d: {
      line_6_carryover: 0,
      line_14_carryover: 1_000,
      qof_disposition: false,
      qof_deferral_or_inclusion: false,
      other_capital_activity: false,
      form4952_filing: false,
    },
  }, context);
  assertEquals(carryover.diagnostics, []);
  assertEquals(carryover.pending.f1040.line7a_capital_gain, 4_000);
  assertEquals(carryover.pending.f1040.line7b_schedule_d_not_required, false);
  const filedPdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: carryover.pending.f1040,
      scheduleD: carryover.pending.schedule_d,
    }),
  );
  assertEquals(filedPdf.getPageCount(), 4);
  const qof = execute(plan, registry, {
    ...facts,
    schedule_d: {
      line_6_carryover: 0,
      line_14_carryover: 0,
      qof_disposition: true,
      qof_deferral_or_inclusion: false,
      other_capital_activity: false,
      form4952_filing: false,
    },
  }, context);
  assertEquals(qof.diagnostics.length, 1);
  assertMatch(qof.diagnostics[0].message, /needs the QOF/);
  const form4952 = execute(plan, registry, {
    ...facts,
    schedule_d: {
      line_6_carryover: 0,
      line_14_carryover: 0,
      qof_disposition: false,
      qof_deferral_or_inclusion: false,
      other_capital_activity: false,
      form4952_filing: true,
    },
  }, context);
  assertEquals(form4952.diagnostics.length, 1);
  assertMatch(form4952.diagnostics[0].message, /Form 4952/);
});

Deno.test("TY2026 1099-INT and 1099-DIV exempt income reaches 1040 and AMT", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    w2: [{ box1_wages: 100_000, box2_fed_withheld: 10_000 }],
    f1099int: [{ payer_name: "Municipal Bond", box8: 20_000, box9: 10_000 }],
    f1099div: [{
      payerName: "Bond Fund",
      isNominee: false,
      box11: false,
      box1a: 0,
      box12: 280_000,
      box13: 280_000,
    }],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line2a_tax_exempt, 300_000);
  assertEquals(result.pending.agi_aggregator.tax_exempt_interest, [
    20_000,
    280_000,
  ]);
  assertEquals(result.pending.form8962.taxpayer_modified_agi, 400_000);
  assertEquals(result.pending.form6251.private_activity_bond_interest, 290_000);
  const amt = Number(result.pending.form6251.line11_amt);
  assertEquals(amt > 0, true);
  assertEquals(result.pending.schedule2.line2_amt, amt);
  assertEquals(result.pending.f1040.line17_additional_taxes, amt);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
      schedule2: result.pending.schedule2,
      form6251: result.pending.form6251,
    }),
  );
  assertEquals(pdf.getPageCount(), 6);
});

Deno.test("TY2026 registered dependent reaches Schedule 8812, Form 1040, and PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      ...filer,
      dependents: [dependentChild],
    },
    w2: [{ box1_wages: 80_000, box2_fed_withheld: 10_000 }],
    f8812: {
      credit_limit_worksheet_2026: creditLimitWorksheet,
    },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f8812.line4, 1);
  assertEquals(result.pending.f8812.line14, 2_200);
  assertEquals(result.pending.f1040.line19_child_tax_credit, 2_200);
  assertEquals(result.pending.f1040.line28_actc, 0);
  assertEquals(result.pending.f1040.dependent_count, 1);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
      f8812: result.pending.f8812,
    }),
  );
  assertEquals(pdf.getPageCount(), 4);
});

Deno.test("TY2026 prints a dependent without a credit or Schedule 8812", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      ...filer,
      dependents: [{
        ...dependentChild,
        ssn_issued_before_due_date: false,
        tin_issued_by_due_date: false,
      }],
    },
    w2: [{ box1_wages: 80_000, box2_fed_withheld: 10_000 }],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.dependent_count, 1);
  assertEquals(result.pending.f1040.qualifying_child_tax_credit_count, 0);
  assertEquals(result.pending.f1040.other_dependent_count, 0);
  assertEquals(result.pending.f8812.line14, undefined);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
    }),
  );
  assertEquals(pdf.getPageCount(), 2);
});

Deno.test("TY2026 phased-out CTC keeps the dependent row without Schedule 8812 PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: { ...filer, dependents: [dependentChild] },
    w2: [{ box1_wages: 300_000, box2_fed_withheld: 60_000 }],
    f8812: { credit_limit_worksheet_2026: creditLimitWorksheet },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f8812.file_schedule_8812, false);
  assertEquals(result.pending.f1040.line19_child_tax_credit, 0);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
      f8812: result.pending.f8812,
    }),
  );
  assertEquals(pdf.getPageCount(), 2);
});

Deno.test("TY2026 dependent PDF requires Schedule 8812 calculation", async () => {
  await assertRejects(
    () =>
      buildCorePdfBytes2026({
        f1040: {
          dependent_count: 1,
          qualifying_child_tax_credit_count: 1,
          other_dependent_count: 0,
        },
      }),
    Error,
    "needs Schedule 8812 calculation",
  );
});

Deno.test("TY2026 registered 1099-G reaches Schedule 1, 1040, and the PDF bundle", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099g: [{
      box_1_unemployment: 9,
      box_2_state_refund: 300,
      box_2_taxable_amount: 80,
      box_4_federal_withheld: 2,
    }],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1.line1_state_refund, 80);
  assertEquals(result.pending.schedule1.line7_unemployment, 9);
  assertEquals(result.pending.schedule1.line10_total_additional_income, 89);
  assertEquals(result.pending.f1040.line8_additional_income, 89);
  assertEquals(result.pending.f1040.line11b_agi, 89);
  assertEquals(result.pending.f1040.line25b_withheld_1099, 2);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
      schedule1: result.pending.schedule1,
    }),
  );
  assertEquals(pdf.getPageCount(), 4);
});

Deno.test("TY2026 1099-G rejects unfiled branches before routing any amounts", () => {
  for (
    const key of [
      "box_7_agriculture",
      "box_9_market_gain",
      "box_10_family_leave",
    ]
  ) {
    const result = execute(buildExecutionPlan(registry), registry, {
      general: filer,
      f1099g: [{ box_1_unemployment: 200, [key]: 10 }],
    }, context);
    assertEquals(result.diagnostics.length, 1);
    assertEquals(result.diagnostics[0].nodeType, "f1099g");
    assertMatch(result.diagnostics[0].message, new RegExp(key));
    assertEquals(result.pending.schedule1, undefined);
  }
  const businessRefund = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099g: [{
      box_2_state_refund: 100,
      box_2_taxable_amount: 100,
      box_8_trade_or_business: true,
    }],
  }, context);
  assertMatch(businessRefund.diagnostics[0].message, /business refund/);
  assertEquals(businessRefund.pending.schedule1, undefined);

  const staleStateBoxes = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099g: [{ box_1_unemployment: 100, box_10a_state: "MA" }],
  }, context);
  assertEquals(staleStateBoxes.diagnostics[0].nodeType, "start");
  assertMatch(staleStateBoxes.diagnostics[0].message, /box_10a_state/);
});

Deno.test("TY2026 1099-G prints same-year unemployment repayment", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099g: [{ box_1_unemployment: 1_000, box_1_repaid: 400 }],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1.line7_unemployment, 600);
  assertEquals(result.pending.schedule1.line7_repaid, 400);
  assertEquals(result.pending.schedule1.line10_total_additional_income, 600);
  assertEquals(result.pending.f1040.line8_additional_income, 600);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
      schedule1: result.pending.schedule1,
    }),
  );
  assertEquals(pdf.getPageCount(), 4);

  const invalid = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099g: [{ box_1_unemployment: 100, box_1_repaid: 101 }],
  }, context);
  assertMatch(invalid.diagnostics[0].message, /repayment exceeds/);
  assertEquals(invalid.pending.schedule1, undefined);

  const fullyRepaid = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099g: [{ box_1_unemployment: 100, box_1_repaid: 100 }],
  }, context);
  assertEquals(fullyRepaid.diagnostics, []);
  assertEquals(fullyRepaid.pending.schedule1.line7_unemployment, 0);
  assertEquals(fullyRepaid.pending.schedule1.line7_repaid, 100);
  assertEquals(fullyRepaid.pending.schedule1.file_schedule1, true);
});

Deno.test("TY2026 1099-G RTAA and taxable grants get a typed line 8z statement", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099g: [{ box_5_rtaa: 599, box_6_taxable_grants: 750 }],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1.line8z_rtaa, 599);
  assertEquals(result.pending.schedule1.line8z_taxable_grants, 750);
  assertEquals(result.pending.schedule1.line8z_total, 1_349);
  assertEquals(
    result.pending.schedule1.line8z_print_description,
    "See attached statement",
  );
  assertEquals(result.pending.schedule1.line8z_statement_rows, [
    { description: "RTAA payments", amount: 599 },
    { description: "Taxable grants", amount: 750 },
  ]);
  assertEquals(result.pending.schedule1.line9_total_other_income, 1_349);
  assertEquals(result.pending.f1040.line8_additional_income, 1_349);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
      schedule1: result.pending.schedule1,
    }),
  );
  assertEquals(pdf.getPageCount(), 5);

  const rtaaOnly = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099g: [{ box_5_rtaa: 599 }],
  }, context);
  assertEquals(rtaaOnly.diagnostics, []);
  assertEquals(
    rtaaOnly.pending.schedule1.line8z_print_description,
    "RTAA payments",
  );
  assertEquals(rtaaOnly.pending.schedule1.line8z_statement_rows, undefined);
  const singlePdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: rtaaOnly.pending.f1040,
      schedule1: rtaaOnly.pending.schedule1,
    }),
  );
  assertEquals(singlePdf.getPageCount(), 4);
});

Deno.test("TY2026 registered 1099-INT reaches Schedule B, Schedule 1, 1040, and PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    f1099int: [{
      payer_name: "Test Bank",
      box1: 2_000,
      box2: 100,
      box4: 50,
    }],
    schedule_b: { foreign_account: false, foreign_trust: false },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_b.print_line4_total, 2_000);
  assertEquals(result.pending.schedule1.line18_early_withdrawal, 100);
  assertEquals(result.pending.f1040.line2b_taxable_interest, 2_000);
  assertEquals(result.pending.f1040.line10_adjustments, 100);
  assertEquals(result.pending.f1040.line11b_agi, 1_900);
  assertEquals(result.pending.f1040.line25b_withheld_1099, 50);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
      schedule1: result.pending.schedule1,
      scheduleB: result.pending.schedule_b,
    }),
  );
  assertEquals(pdf.getPageCount(), 5);
});

Deno.test("TY2026 1099-INT rejects unfiled or unelected routes", () => {
  for (
    const [fields, message] of [
      [{ box6: 20 }, /foreign tax/],
      [{ investment_property_for_form4952: true }, /investment interest/],
      [{ box3: 100, box12: 20 }, /amortization election/],
    ] as const
  ) {
    const result = execute(buildExecutionPlan(registry), registry, {
      general: filer,
      f1099int: [{ payer_name: "Test Bank", box1: 100, ...fields }],
    }, context);
    assertEquals(result.diagnostics[0].nodeType, "f1099int");
    assertMatch(result.diagnostics[0].message, message);
    assertEquals(result.pending.schedule_b, undefined);
  }
});

Deno.test("TY2026 1099-INT private-activity bond interest reaches Form 6251 and PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: filer,
    w2: [{ box1_wages: 100_000, box2_fed_withheld: 10_000 }],
    f1099int: [{
      payer_name: "Municipal Bond Fund",
      box8: 300_000,
      box9: 300_000,
    }],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line2a_tax_exempt, 300_000);
  assertEquals(result.pending.form6251.private_activity_bond_interest, 300_000);
  const amt = Number(result.pending.form6251.line11_amt);
  assertEquals(amt > 0, true);
  assertEquals(result.pending.schedule2.line2_amt, amt);
  assertEquals(result.pending.f1040.line17_additional_taxes, amt);
  const pdf = await PDFDocument.load(
    await buildCorePdfBytes2026({
      f1040: result.pending.f1040,
      schedule2: result.pending.schedule2,
      form6251: result.pending.form6251,
    }),
  );
  assertEquals(pdf.getPageCount(), 6);
});

Deno.test("TY2026 registry executes a wages-only return", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Ada",
      taxpayer_last_name: "Rivera",
      taxpayer_ssn: "111223333",
      taxpayer_dob: "1990-07-12",
      taxpayer_tin_issued_by_due_date: true,
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_citizen_national_or_work_authorized: true,
      address_line1: "10 Main St",
      address_city: "Boston",
      address_state: "MA",
      address_zip: "02108",
    },
    w2: [{ box1_wages: 80_000, box2_fed_withheld: 10_000 }],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f1040.line9_total_income, 80_000);
  assertEquals(result.pending.f1040.line16_income_tax, 8_770);
  assertEquals(result.pending.f1040.line35a_refund, 1_230);
  assertEquals(
    result.pending.f1040.taxpayer_citizen_national_or_work_authorized,
    true,
  );
});

Deno.test("TY2026 registry routes W-2 and Form 4137 tips through Schedule 2", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Ada",
      taxpayer_last_name: "Rivera",
      taxpayer_ssn: "111223333",
      taxpayer_dob: "1990-07-12",
      taxpayer_tin_issued_by_due_date: true,
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      address_line1: "10 Main St",
      address_city: "Boston",
      address_state: "MA",
      address_zip: "02108",
    },
    w2: [{
      employee_ssn: "111223333",
      employer_ein: "12-3456789",
      employer_name: "CAFE",
      box1_wages: 70_000,
      box3_ss_wages: 70_000,
      box8_allocated_tips: 1_000,
      box2_fed_withheld: 0,
      box12_entries: [{ code: "TP", amount: 3_000 }],
      box14b_tipped_codes: ["102"],
    }],
    form4137: {
      forms: [{
        recipient: "taxpayer",
        employers: [{
          name: "CAFE",
          ein: "12-3456789",
          tips_received: 5_000,
          tips_reported: 3_000,
        }],
        ss_wages_from_w2: 70_000,
      }],
    },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1a.line15_qualified_tips, 5_000);
  assertEquals(
    (result.pending.form4137.w2_tip_sources as Record<string, unknown>[])[0]
      .employee_ssn,
    "111223333",
  );
  assertEquals(result.pending.schedule2.line16c_additional_fica, 153);
  assertEquals(result.pending.f1040.line1c_unreported_tips, 2_000);
  assertEquals(result.pending.f1040.line23_other_taxes, 153);
});

Deno.test("TY2026 Schedule H reaches Schedule 2, Form 1040, and its PDF", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Ada",
      taxpayer_last_name: "Rivera",
      taxpayer_ssn: "111223333",
      taxpayer_dob: "1990-07-12",
      taxpayer_tin_issued_by_due_date: true,
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_citizen_national_or_work_authorized: true,
      digital_assets: false,
      address_line1: "10 Main St",
      address_city: "Boston",
      address_state: "MA",
      address_zip: "02108",
    },
    w2: [{ box1_wages: 70_000, box2_fed_withheld: 8_000 }],
    schedule_h: {
      employer_ein: "123456789",
      line_a_any_employee_3000: true,
      line1_ss_wages: 4_100,
      line3_medicare_wages: 4_100,
      line9_futa_quarter: false,
    },
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_h.line8_fica_and_withholding, 627);
  assertEquals(result.pending.schedule2.line17a_household_employment_tax, 627);
  assertEquals(result.pending.f1040.line23_other_taxes, 627);
  const pdf = await PDFDocument.load(await buildPdfBytes2026(result.pending));
  assertEquals(pdf.getPageCount(), 6);
  assertEquals(pdf.getForm().getFields().length, 0);
  await assertRejects(
    () =>
      buildCorePdfBytes2026({
        f1040: result.pending.f1040,
        schedule2: result.pending.schedule2,
      }),
    Error,
    "needs Schedule H",
  );
});

Deno.test("TY2026 AMT reaches Schedule 2 and Form 1040 from an ISO adjustment", () => {
  const directInputs: readonly InputNodeEntry[] = [
    ...inputNodes,
    {
      node: form6251,
      inputSchema: form6251.inputSchema.pick({ iso_adjustment: true }),
      isArray: false,
    },
  ];
  const graph = { ...registry, start: buildStartNode(directInputs) };
  const result = execute(buildExecutionPlan(graph), graph, {
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Ada",
      taxpayer_last_name: "Rivera",
      taxpayer_ssn: "111223333",
      taxpayer_dob: "1990-07-12",
      taxpayer_tin_issued_by_due_date: true,
      taxpayer_ssn_valid_for_employment: true,
      taxpayer_ssn_issued_before_due_date: true,
      taxpayer_citizen_national_or_work_authorized: true,
      address_line1: "10 Main St",
      address_city: "Boston",
      address_state: "MA",
      address_zip: "02108",
    },
    w2: [{ box1_wages: 100_000, box2_fed_withheld: 10_000 }],
    form6251: { iso_adjustment: 300_000 },
  }, context);
  assertEquals(result.diagnostics, []);
  const amt = Number(result.pending.form6251.line11_amt);
  assertEquals(amt > 0, true);
  assertEquals(result.pending.form6251.amti, 400_000);
  assertEquals(result.pending.form6251.exemption, 90_100);
  assertEquals(result.pending.form6251.tentative_tax, 81_882);
  assertEquals(result.pending.schedule2.line2_amt, amt);
  assertEquals(result.pending.schedule2.line3_part1_tax, amt);
  assertEquals(result.pending.f1040.line17_additional_taxes, amt);
  assertEquals(
    result.pending.f1040.line24a_total_tax,
    Number(result.pending.f1040.line16_income_tax) + amt,
  );
});
