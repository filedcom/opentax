import { assertEquals, assertThrows } from "@std/assert";
import { form8995Pdf } from "../../pdf/forms/f8995.ts";
import { form8995 } from "./f8995.ts";

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
    qbi_no_prior_loss_or_suspended_loss_confirmed: true,
    qbi_not_patron_of_specified_cooperative_confirmed: true,
    schedule_c_qbi_businesses: [{
      business_reference: "c-1",
      business_name: "Example Repairs",
      ein: "123456789",
      qbi,
      w2_wages: 0,
      ubia: 0,
      no_other_adjustments_confirmed: true,
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
    schedule_c: {
      schedule_cs: [source],
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
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
        schedule_c: {
          ...pending.schedule_c,
          qbi_not_patron_of_specified_cooperative_confirmed: undefined,
        },
      },
    ]
  ) {
    assertThrows(() => form8995.build(fields, { pending: altered }), Error);
    assertThrows(() => form8995Pdf.projectFields?.(fields, altered), Error);
  }
  assertThrows(
    () => form8995.build({ ...fields, line12: 1 }, { pending }),
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
