import { assertEquals, assertThrows } from "@std/assert";
import { form8995aPdf } from "./f8995a.ts";
import { form8995aScheduleAPdf } from "./f8995a_schedule_a.ts";
import { FilingStatus as HeaderFilingStatus } from "../../../../../mef/header.ts";

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

Deno.test("Form 8995-A Schedule A PDF maps the joint threshold and range", () => {
  const joint = {
    ...sstb,
    filing_status: "mfj",
    taxable_income: 444_600,
  };
  const jointPending = {
    form8995a: joint,
    form8995a_schedule_a: joint,
    f1040: { line13_qbi_deduction: 6_250 },
  };
  const schedule = form8995aScheduleAPdf.projectFields?.(joint, jointPending);
  const parent = form8995aPdf.projectFields?.(joint, jointPending);
  assertEquals(schedule?.line6, 394_600);
  assertEquals(schedule?.line8, 100_000);
  assertEquals(schedule?.line9, 50);
  assertEquals(parent?.line21, 394_600);
  assertEquals(parent?.line23, 100_000);
  assertEquals(parent?.line39, 6_250);
});

Deno.test("Form 8995-A Schedule A PDF maps head-of-household phase-in", () => {
  const household = { ...sstb, filing_status: "hoh" };
  const householdPending = {
    form8995a: household,
    form8995a_schedule_a: household,
    f1040: { line13_qbi_deduction: 6_250 },
  };
  const schedule = form8995aScheduleAPdf.projectFields?.(
    household,
    householdPending,
  );
  const parent = form8995aPdf.projectFields?.(household, householdPending);
  assertEquals(schedule?.line6, 197_300);
  assertEquals(schedule?.line8, 50_000);
  assertEquals(schedule?.line9, 50);
  assertEquals(parent?.line21, 197_300);
  assertEquals(parent?.line23, 50_000);
  assertEquals(parent?.line39, 6_250);
});

Deno.test("Form 8995-A Schedule A PDF binds surviving-spouse phase-in to final filer", () => {
  const survivor = { ...sstb, filing_status: "qss" };
  const survivorPending = {
    form8995a: survivor,
    form8995a_schedule_a: survivor,
    f1040: { line13_qbi_deduction: 6_250 },
  };
  const filer = {
    primarySSN: "123456789",
    nameLine1: "SMITH JOHN A",
    nameControl: "SMIT",
    address: { line1: "1 MAIN ST", city: "AUSTIN", state: "TX", zip: "78701" },
    filingStatus: HeaderFilingStatus.QualifyingSurvivingSpouse,
  };
  const schedule = form8995aScheduleAPdf.projectFields?.(
    survivor,
    survivorPending,
  );
  const parent = form8995aPdf.projectFields?.(survivor, survivorPending);
  assertEquals(schedule?.line6, 197_300);
  assertEquals(schedule?.line8, 50_000);
  assertEquals(parent?.line21, 197_300);
  assertEquals(parent?.line23, 50_000);
  assertEquals(parent?.line39, 6_250);
  assertEquals(
    form8995aPdf.instances?.(survivor, filer, survivorPending),
    [survivor],
  );
  assertEquals(
    form8995aScheduleAPdf.instances?.(survivor, filer, survivorPending),
    [survivor],
  );
  assertThrows(
    () => form8995aPdf.instances?.(survivor, {
      ...filer,
      filingStatus: HeaderFilingStatus.HeadOfHousehold,
    }, survivorPending),
    Error,
    "surviving-spouse status differs",
  );
  assertThrows(
    () => form8995aScheduleAPdf.instances?.(survivor, {
      ...filer,
      filingStatus: HeaderFilingStatus.Single,
    }, survivorPending),
    Error,
    "surviving-spouse status differs",
  );
});

Deno.test("Form 8995-A Schedule A PDF MFS owner and final filer reconcile", () => {
  const separate = {
    ...sstb,
    filing_status: "mfs",
    sstb_filing_details: {
      ...sstb.sstb_filing_details,
      mfs_owner_ssn: "123456789",
      mfs_allocation_source_reference: "2025 separate-return SSTB allocation workpaper",
      mfs_no_spouse_share_confirmed: true,
    },
  };
  const separatePending = {
    form8995a: separate,
    form8995a_schedule_a: separate,
    f1040: { line13_qbi_deduction: 6_250 },
  };
  const filer = {
    primarySSN: "123456789",
    nameLine1: "SMITH JOHN A",
    nameControl: "SMIT",
    address: { line1: "1 MAIN ST", city: "AUSTIN", state: "TX", zip: "78701" },
    filingStatus: HeaderFilingStatus.MarriedFilingSeparately,
  };
  assertEquals(form8995aPdf.instances?.(separate, filer, separatePending), [separate]);
  assertEquals(form8995aScheduleAPdf.instances?.(separate, filer, separatePending), [separate]);
  const parent = form8995aPdf.projectFields?.(separate, separatePending);
  const schedule = form8995aScheduleAPdf.projectFields?.(separate, separatePending);
  assertEquals(parent?.line21, 197_300);
  assertEquals(parent?.line23, 50_000);
  assertEquals(parent?.line39, 6_250);
  assertEquals(schedule?.line6, 197_300);
  assertEquals(schedule?.line8, 50_000);
  assertThrows(
    () => form8995aPdf.instances?.(separate, { ...filer, primarySSN: "987654321" }, separatePending),
    Error,
    "owner differs",
  );
  assertThrows(
    () => form8995aScheduleAPdf.instances?.(separate, { ...filer, filingStatus: HeaderFilingStatus.Single }, separatePending),
    Error,
    "status differs",
  );
});
