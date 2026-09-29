import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { form8995Pdf } from "../../pdf/forms/f8995.ts";
import { form8995 } from "./f8995.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { registry } from "../../registry.ts";
import { pdfReviewFixtures } from "../../pdf/review-fixtures.ts";
import { buildMefXml } from "../builder.ts";
import { testFiler } from "../test-filer.ts";

const return1040Xsd = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

async function assertReturnXsd(xml: string): Promise<void> {
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", return1040Xsd, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
}

Deno.test("profitable Schedule C with half-SE deduction reaches Form 8995 MeF and PDF", () => {
  const fixture = pdfReviewFixtures.find((item) =>
    item.id === "single-schedule-c"
  );
  if (!fixture) throw new Error("missing Schedule C review fixture");
  const result = execute(buildExecutionPlan(registry), registry, {
    ...fixture.inputs,
  }, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  const fields = pending.form8995;
  assertEquals(pending.schedule1?.line3_schedule_c, 80_000);
  assertEquals(typeof pending.schedule1?.line15_se_deduction, "number");
  assertEquals(
    fields?.line1_qbi,
    Math.round(
      80_000 - (pending.schedule1?.line15_se_deduction as number),
    ),
  );
  assertEquals(fields?.line15, pending.f1040?.line13_qbi_deduction);
  const xml = form8995.build(fields, { pending });
  assertEquals(xml.includes("<EIN>123456789</EIN>"), true);
  assertEquals(xml.includes("<QualifiedBusinessIncomeDedAmt>"), true);
  const pdf = form8995Pdf.projectFields?.(fields, pending);
  assertEquals(pdf?.line1_qbi, fields?.line1_qbi);
  assertEquals(pdf?.line15, fields?.line15);
  assertThrows(
    () =>
      form8995.build(fields, {
        pending: {
          ...pending,
          schedule1: { ...pending.schedule1, line15_se_deduction: 0 },
        },
      }),
    Error,
    "source reconciliation",
  );
});

Deno.test("one sourced Schedule F farm reaches Form 8995 MeF, PDF, and full-return XSD", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Sam",
      taxpayer_last_name: "Farmer",
      taxpayer_ssn: "123-45-6789",
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    schedule_f: {
      schedule_fs: [{
        farm_id: "north",
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_c_farm_name: "North Farm",
        line_d_ein: "123456789",
        line_e_material_participation: true,
        accounting_method: "cash",
        line1_sales_livestock_resale: 0,
        line2_sales_products_raised: 80_000,
        ccc_loan_election_in_effect: false,
        qbi_no_other_adjustments_confirmed: true,
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  const fields = pending.form8995;
  const farmSource = pending.schedule_f as {
    schedule_fs: Record<string, unknown>[];
  };
  assertEquals(pending.schedule1?.line6_schedule_f, 80_000);
  assertEquals(
    fields?.line1_qbi,
    Math.round(
      80_000 - (pending.schedule1?.line15_se_deduction as number),
    ),
  );
  assertEquals(fields?.line15, pending.f1040?.line13_qbi_deduction);
  const xml = form8995.build(fields, { pending });
  assertEquals(
    xml.includes("<BusinessNameLine1Txt>North Farm</BusinessNameLine1Txt>"),
    true,
  );
  assertEquals(xml.includes("<EIN>123456789</EIN>"), true);
  const pdf = form8995Pdf.projectFields?.(fields, pending);
  assertEquals(pdf?.line1_qbi, fields?.line1_qbi);
  assertEquals(pdf?.line15, fields?.line15);
  const returnXml = buildMefXml(pending, testFiler());
  assertEquals(returnXml.includes("<IRS8995 documentId="), true);
  await assertReturnXsd(returnXml);
  assertThrows(
    () =>
      form8995.build(fields, {
        pending: {
          ...pending,
          schedule1: { ...pending.schedule1, line6_schedule_f: 1 },
        },
      }),
    Error,
    "source reconciliation",
  );
  assertThrows(
    () =>
      form8995.build(fields, {
        pending: {
          ...pending,
          schedule_se: { ...pending.schedule_se, net_profit_schedule_f: 1 },
        },
      }),
    Error,
    "source reconciliation",
  );
  assertThrows(
    () =>
      form8995Pdf.projectFields?.(fields, {
        ...pending,
        general: {
          ...pending.general,
          qbi_not_patron_of_specified_cooperative_confirmed: undefined,
        },
      }),
    Error,
    "source reconciliation",
  );
  assertThrows(
    () =>
      form8995.build(fields, {
        pending: { ...pending, f1099patr: { f1099patrs: [] } },
      }),
    Error,
    "source reconciliation",
  );
  assertThrows(
    () =>
      form8995.build(fields, {
        pending: {
          ...pending,
          schedule_f: {
            ...pending.schedule_f,
            schedule_fs: [{
              ...farmSource.schedule_fs[0],
              line3a_cooperative_distributions: 100,
            }],
          },
        },
      }),
    Error,
    "source reconciliation",
  );
  assertThrows(() =>
    form8995.build(fields, {
      pending: {
        ...pending,
        schedule_f: {
          ...pending.schedule_f,
          farm_sources: [{
            farm_id: "north",
            kind: "1099nec_farm_income",
            amount: 100,
          }],
        },
      },
    }), Error);
});

Deno.test("profitable accrual Schedule F farm reaches Form 8995 MeF, PDF, and full-return XSD", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Sam",
      taxpayer_last_name: "Farmer",
      taxpayer_ssn: "123-45-6789",
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    schedule_f: {
      schedule_fs: [{
        farm_id: "accrual-north",
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_c_farm_name: "North Accrual Farm",
        line_d_ein: "123456789",
        line_e_material_participation: true,
        accounting_method: "accrual",
        part_iii: {
          line37_sales_products: 80_000,
          line45_beginning_inventory: 0,
          line46_products_purchased: 0,
          line48_ending_inventory: 0,
          inventory_method: "cost",
        },
        qbi_no_other_adjustments_confirmed: true,
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  const fields = pending.form8995;
  assertEquals(pending.schedule1?.line6_schedule_f, 80_000);
  assertEquals(fields?.line15, pending.f1040?.line13_qbi_deduction);
  const fragment = form8995.build(fields, { pending });
  assertStringIncludes(
    fragment,
    "<BusinessNameLine1Txt>North Accrual Farm</BusinessNameLine1Txt>",
  );
  assertStringIncludes(fragment, "<EIN>123456789</EIN>");
  const projected = form8995Pdf.projectFields?.(fields, pending);
  assertEquals(projected?.line1_qbi, fields?.line1_qbi);
  assertEquals(projected?.line15, fields?.line15);
  const xml = buildMefXml(pending, testFiler());
  assertStringIncludes(xml, "<IRS8995 documentId=");
  await assertReturnXsd(xml);
});

Deno.test("single-filer farm without EIN uses the sourced SSN on Form 8995", async () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Sam",
      taxpayer_last_name: "Farmer",
      taxpayer_ssn: "123-45-6789",
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    schedule_f: {
      schedule_fs: [{
        farm_id: "north",
        line_a_principal_crop_activity: "GRAIN FARMING",
        line_b_agricultural_activity_code: "111100",
        line_c_farm_name: "North Farm",
        line_e_material_participation: true,
        accounting_method: "cash",
        line1_sales_livestock_resale: 0,
        line2_sales_products_raised: 80_000,
        ccc_loan_election_in_effect: false,
        qbi_no_other_adjustments_confirmed: true,
      }],
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  const fields = pending.form8995;
  assertEquals(fields?.line1_ein, undefined);
  assertEquals(fields?.line1_ssn, "123456789");
  const fragment = form8995.build(fields, { pending });
  assertEquals(fragment.includes("<SSN>123456789</SSN>"), true);
  assertEquals(fragment.includes("<EIN>"), false);
  const projected = form8995Pdf.projectFields?.(fields, pending);
  assertEquals(projected?.line1_ein, "123456789");
  const xml = buildMefXml(pending, testFiler());
  await assertReturnXsd(xml);
  assertThrows(
    () =>
      form8995.build(fields, {
        pending: {
          ...pending,
          general: {
            ...pending.general,
            filing_status: "married_filing_jointly",
          },
        },
      }),
    Error,
    "source reconciliation",
  );
  assertThrows(
    () =>
      form8995.build(fields, {
        pending: {
          ...pending,
          general: { ...pending.general, taxpayer_ssn: "987-65-4321" },
        },
      }),
    Error,
    "source reconciliation",
  );
});

Deno.test("sole Schedule C business without EIN uses the filed taxpayer SSN", () => {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Sam",
      taxpayer_last_name: "Builder",
      taxpayer_ssn: "123-45-6789",
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    schedule_c: [{
      business_reference: "builder-c",
      line_a_principal_business: "Repairs",
      line_b_business_code: "811490",
      line_c_business_name: "Builder Repairs",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: 80_000,
      qbi_no_other_adjustments_confirmed: true,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  const fields = pending.form8995;
  assertEquals(fields?.line1_ein, undefined);
  assertEquals(fields?.line1_ssn, "123456789");
  const fragment = form8995.build(fields, { pending });
  assertStringIncludes(fragment, "<SSN>123456789</SSN>");
  assertEquals(fragment.includes("<EIN>"), false);
  assertEquals(
    form8995Pdf.projectFields?.(fields, pending)?.line1_ein,
    "123456789",
  );
  assertThrows(
    () =>
      form8995.build(fields, {
        pending: {
          ...pending,
          general: { ...pending.general, taxpayer_ssn: "987-65-4321" },
        },
      }),
    Error,
    "source reconciliation",
  );
});

Deno.test("Form 8995 omits no-claim tracking fields in both exports", () => {
  assertEquals(form8995.build({}), "");
  assertEquals(form8995.build({ qbi_deduction: 0 }), "");
  assertEquals(form8995.build({ qbi_from_schedule_c: 50_000 }), "");
  assertEquals(form8995Pdf.projectFields?.({}, {}), {});
  assertEquals(
    form8995Pdf.projectFields?.({ qbi_from_schedule_c: 50_000 }, {}),
    {},
  );
});

Deno.test("Form 8995 rejects a positive aggregate-only QBI claim in both exports", () => {
  const fields = {
    qbi_from_schedule_c: 50_000,
    qbi: 50_000,
    taxable_income: 70_000,
    net_capital_gain: 0,
    qbi_deduction: 10_000,
  };
  assertThrows(
    () => form8995.build(fields),
    Error,
    "needs its complete source and final return pending graph",
  );
  assertThrows(
    () => form8995Pdf.projectFields?.(fields, {}),
    Error,
    "needs one identified Schedule C business",
  );
});

Deno.test("Form 8995 rejects a positive deduction even without other source fields", () => {
  assertThrows(
    () => form8995.build({ qbi_deduction: 1 }),
    Error,
    "needs its complete source and final return pending graph",
  );
  assertThrows(
    () => form8995Pdf.projectFields?.({ qbi_deduction: 1 }, {}),
    Error,
    "needs one identified Schedule C business",
  );
});

const scheduleC = {
  business_reference: "c-1",
  line_a_principal_business: "Repairs",
  line_b_business_code: "811490",
  line_c_business_name: "Example Repairs",
  line_d_ein: "12-3456789",
  line_f_accounting_method: "cash",
  line_g_material_participation: true,
  line_1_gross_receipts: 300,
  qbi_no_other_adjustments_confirmed: true,
} as const;

function oneBusinessClaim(qbi = 300) {
  const source = { ...scheduleC, line_1_gross_receipts: qbi };
  const deduction = Math.round(qbi * 0.2);
  const fields = {
    qbi_from_schedule_c: qbi,
    qbi_no_prior_loss_or_suspended_loss_confirmed: true as const,
    qbi_not_patron_of_specified_cooperative_confirmed: true as const,
    schedule_c_qbi_businesses: [{
      business_reference: "c-1",
      business_name: "Example Repairs",
      ein: "123456789",
      qbi,
      w2_wages: 0,
      ubia: 0,
      no_other_adjustments_confirmed: true as const,
      source_schedule_c: source,
    }],
    line1_business_reference: "c-1",
    line1_business_name: "Example Repairs",
    line1_ein: "12-3456789",
    line1_qbi: qbi,
    line2: qbi,
    line3: 0,
    line4: qbi,
    line5: deduction,
    line6: 0,
    line7: 0,
    line8: 0,
    line9: 0,
    line10: deduction,
    line11: 34_250,
    line12: 0,
    line13: 34_250,
    line14: 6_850,
    line15: deduction,
    line16: 0,
    line17: 0,
    qbi_deduction: deduction,
  };
  const pending = {
    general: {
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    schedule_c: { schedule_cs: [source] },
    schedule1: { line3_schedule_c: qbi },
    f1040: {
      line11_agi: 50_000,
      line12c_deduction_total: 15_750,
      line13_qbi_deduction: deduction,
    },
    form8995: fields,
  };
  return { fields, pending };
}

Deno.test("Form 8995 emits all 17 lines and the identified Schedule C native group", () => {
  const { fields, pending } = oneBusinessClaim();
  const xml = form8995.build(fields, { pending });
  assertEquals(
    xml.includes(
      "<TradeOrBusinessName><BusinessNameLine1Txt>Example Repairs</BusinessNameLine1Txt></TradeOrBusinessName>",
    ),
    true,
  );
  assertEquals(xml.includes("<EIN>123456789</EIN>"), true);
  assertEquals(
    xml.includes(
      "<QualifiedBusinessIncomeDedAmt>60</QualifiedBusinessIncomeDedAmt>",
    ),
    true,
  );
  assertEquals(
    xml.includes(
      "<TotQlfyREITDivPTPLossCfwdAmt>0</TotQlfyREITDivPTPLossCfwdAmt>",
    ),
    true,
  );
  const projected = form8995Pdf.projectFields?.(fields, pending);
  assertEquals(projected?.line1_business_name, "Example Repairs");
  assertEquals(projected?.line1_ein, "123456789");
  assertEquals(projected?.line15, 60);
  assertEquals(projected?.line17, 0);
});

Deno.test("Form 8995 blocks a source or final-return change after calculation", () => {
  const { fields, pending } = oneBusinessClaim();
  for (
    const altered of [
      {
        ...pending,
        schedule1: { ...pending.schedule1, line15_se_deduction: 1 },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line3a_qualified_dividends: 1 },
      },
      { ...pending, f1040: { ...pending.f1040, line13_qbi_deduction: 59 } },
      {
        ...pending,
        f1040: { ...pending.f1040, line12c_deduction_total: 15_751 },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line13b_additional_deductions: 1 },
      },
      { ...pending, schedule1: { line3_schedule_c: 299 } },
      { ...pending, schedule_f: { line9_net_profit: 1 } },
      { ...pending, f1099div: { box5_section199a_dividends: 1 } },
      { ...pending, schedule_se: { net_profit_schedule_c: 300 } },
      {
        ...pending,
        form7206: {
          schedule_c_source: { businesses: [] },
          single_schedule_c_plan: { business_reference: "c-1" },
        },
      },
      {
        ...pending,
        general: {
          ...pending.general,
          qbi_not_patron_of_specified_cooperative_confirmed: undefined,
        },
      },
    ]
  ) {
    assertThrows(() => form8995.build(fields, { pending: altered }), Error);
    assertThrows(() => form8995Pdf.projectFields?.(fields, altered), Error);
  }
  assertThrows(
    () => form8995.build({ ...fields, qbi_deduction: 1 }, { pending }),
    Error,
    "lines 1-17 must reconcile",
  );
  assertThrows(
    () => form8995.build({ ...fields, qbi_deduction: 60.1 }, { pending }),
    Error,
    "lines 1-17 must reconcile",
  );
  assertThrows(
    () =>
      form8995Pdf.projectFields?.(
        { ...fields, qbi_deduction: 60.1 },
        pending,
      ),
    Error,
    "lines 1-17 must reconcile",
  );
});

Deno.test("Form 8995 files whole-dollar line 15 for a fractional 20% calculation", () => {
  const { fields, pending } = oneBusinessClaim(301);
  const xml = form8995.build(fields, { pending });
  assertEquals(fields.qbi_deduction, 60);
  assertEquals(
    xml.includes(
      "<QualifiedBusinessIncomeDedAmt>60</QualifiedBusinessIncomeDedAmt>",
    ),
    true,
  );
  assertEquals(form8995Pdf.projectFields?.(fields, pending)?.line15, 60);
});

Deno.test("Form 8995 rejects malformed claimed deductions rather than omitting them", () => {
  for (const value of ["100", -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assertThrows(
      () => form8995.build({ qbi_deduction: value as number }),
      Error,
      "valid nonnegative QBI deduction",
    );
    assertThrows(
      () => form8995Pdf.projectFields?.({ qbi_deduction: value }, {}),
      Error,
      "valid nonnegative QBI deduction",
    );
  }
});
