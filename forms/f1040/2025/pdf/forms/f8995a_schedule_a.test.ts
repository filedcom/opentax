import { assertEquals, assertThrows } from "@std/assert";
import { form8995aPdf } from "./f8995a.ts";
import { form8995aScheduleAPdf } from "./f8995a_schedule_a.ts";

const sstb = {
  filing_status: "single",
  taxable_income: 222_300,
  net_capital_gain: 0,
  sstb_qbi: 100_000,
  sstb_w2_wages: 10_000,
  sstb_unadjusted_basis: 0,
  sstb_filing_details: {
    business_name: "Smith Accounting LLC",
    ein: "123456789",
    business_qbi: 100_000,
    business_w2_wages: 10_000,
    business_ubia: 0,
    one_non_ptp_sstb_confirmed: true,
    no_other_business_or_aggregation_confirmed: true,
    no_reit_ptp_or_loss_carryforward_confirmed: true,
    qualified_dividends_zero_confirmed: true,
    qbi_wages_ubia_source_reference:
      "2025 K-1 statement 199A accounting activity",
    taxable_income_before_qbi_confirmed: true,
  },
};

const pending = {
  form8995a: sstb,
  form8995a_schedule_a: sstb,
  f1040: { line13_qbi_deduction: 6_250 },
};

function mapped(
  descriptor: typeof form8995aPdf,
  key: string,
): string | undefined {
  return descriptor.fields.find((field) => field.domainKey === key)?.pdfField;
}

Deno.test("Form 8995-A Schedule A PDF maps SSTB source and parent phase-in column A", () => {
  const schedule = form8995aScheduleAPdf.projectFields?.(sstb, pending);
  const parent = form8995aPdf.projectFields?.(sstb, pending);
  assertEquals(schedule?.line2, 100_000);
  assertEquals(schedule?.line9, 50);
  assertEquals(schedule?.line10, 50);
  assertEquals(schedule?.line11, 50_000);
  assertEquals(schedule?.line12, 5_000);
  assertEquals(parent?.specified_service, true);
  assertEquals(parent?.line2, 50_000);
  assertEquals(parent?.line12, 6_250);
  assertEquals(parent?.line19, 7_500);
  assertEquals(parent?.line24, 50);
  assertEquals(parent?.line25, 3_750);
  assertEquals(parent?.line39, 6_250);
  assertEquals(
    mapped(form8995aScheduleAPdf, "line11"),
    "topmostSubform[0].Page1[0].Table_PartI[0].Row11[0].f1_42[0]",
  );
  assertEquals(
    mapped(form8995aPdf, "specified_service"),
    "topmostSubform[0].Page1[0].Table_PartI[0].RowA[0].c1_1[0]",
  );
  assertEquals(
    mapped(form8995aPdf, "line24"),
    "topmostSubform[0].Page2[0].Table_PartIII[0].Row24[0].Ln24[0].f2_26[0]",
  );
});

Deno.test("Form 8995-A Schedule A PDF rejects missing companion, altered source, or 1040 mismatch", () => {
  assertThrows(
    () =>
      form8995aPdf.projectFields?.(
        sstb,
        Object.fromEntries(
          Object.entries(pending).filter(([key]) =>
            key !== "form8995a_schedule_a"
          ),
        ),
      ),
    Error,
    "matching Schedule A companion",
  );
  assertThrows(
    () =>
      form8995aScheduleAPdf.projectFields?.(
        { ...sstb, sstb_qbi: 99_999 },
        pending,
      ),
    Error,
    "matching parent",
  );
  assertThrows(
    () =>
      form8995aScheduleAPdf.projectFields?.(sstb, {
        ...pending,
        f1040: { line13_qbi_deduction: 6_249 },
      }),
    Error,
    "Form 1040 line 13",
  );
});
