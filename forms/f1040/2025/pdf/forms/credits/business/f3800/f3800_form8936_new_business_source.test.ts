import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../../index.ts";
import { FilingStatus } from "../../../../../../nodes/types.ts";
import { normalizeAllPending } from "../../../../../return-processing/pending.ts";
import { testFiler } from "../../../../../mef/execution/test-filer.ts";
import {
  form3800PartIAndIIFields,
  form3800PartIIIFields,
} from "./f3800_fields.ts";
import { form3800Pdf } from "./f3800.ts";
import { form8936Pdf } from "../../individual/f8936.ts";

const filer = {
  ...testFiler(),
  firstNameWithInitial: "Alex",
  lastName: "Taxpayer",
  nameLine1: "TAXPAYER ALEX",
};

const vehicle = {
  vin: "1HGCM82633A004352",
  vehicle_year: 2025,
  vehicle_make: "Example",
  vehicle_model: "EV",
  placed_in_service_date: "2025-09-30",
  acquisition_date: "2025-09-30",
  seller_report_received: true,
  transferred_to_dealer: false,
  resold_within_30_days: false,
  acquired_for_use_not_resale: true,
  credit_kind: "new_clean_vehicle" as const,
  credit_amount: 7_500,
  msrp: 45_000,
  vehicle_type: "other" as const,
  business_credit_subject_to_passive_activity_limit: false,
  business_use: {
    kind: "mileage" as const,
    business_miles: 250,
    commuting_miles: 0,
    total_miles: 1_000,
    months_in_business_use: 12,
  },
};

const source = {
  current_year_magi: { adjusted_gross_income: 120_000 },
  prior_year_magi: { adjusted_gross_income: 100_000 },
  filing_status: FilingStatus.Single,
  prior_year_filing_status: FilingStatus.Single,
  f8936s: [vehicle],
};

function filedReturn() {
  return f1040_2025.executeReturn({
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      digital_assets: false,
    },
    w2: [{
      employee_ssn: "123-45-6789",
      box1_wages: 120_000,
      box2_fed_withheld: 20_000,
      box3_ss_wages: 120_000,
      box4_ss_withheld: 7_440,
      box5_medicare_wages: 120_000,
      box6_medicare_withheld: 1_740,
      employer_ein: "12-3456789",
      employer_name: "ACME Corp",
      employer_address_line1: "10 Payroll Way",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box12_entries: [],
    }],
    f8936: source,
  });
}

Deno.test("mixed-use new Form 8936 credit reaches Form 3800 line 1y, Schedule 3, Form 1040, and PDF", async () => {
  const result = filedReturn();
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  const businessCredit = pending.f3800.f8936_new_vehicle_credit as {
    credit_amount: number;
  };
  assertEquals(businessCredit.credit_amount, 1_875);
  assertEquals(pending.f3800.allowed_credit, 1_875);
  assertEquals(pending.schedule3.line6a_total, 1_875);
  assertEquals(pending.schedule3.line6f_total, 5_625);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 7_500);
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  assertEquals(prepared.bundle.form3800Parts?.lines.line38, 1_875);
  assertStringIncludes(prepared.bundle.xml, "<IRS8936 ");
  assertStringIncludes(prepared.bundle.xml, "<IRS3800 ");
  const [parent] = form3800Pdf.instances!(
    pending.f3800,
    filer,
    pending,
    prepared.bundle.form3800Parts,
  );
  assertEquals(parent[form3800PartIIIFields("1y").e], 1_875);
  assertEquals(parent[form3800PartIAndIIFields.line38], 1_875);
  const child = form8936Pdf.projectFields!(pending.f8936, pending);
  assertEquals(child.line6, 1_875);
  assertEquals(child.line8, 1_875);
  assertEquals(child.line13, 5_625);
  assertEquals(
    form8936Pdf.instances!(
      child,
      filer,
      pending,
      prepared.bundle.form3800Parts,
    ),
    [child],
  );
});

Deno.test("new business Form 8936 printable copy rejects source, prepared row, and final-return changes", async () => {
  const result = filedReturn();
  const pending = normalizeAllPending(result.pending);
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  const parts = prepared.bundle.form3800Parts!;
  const fields = form8936Pdf.projectFields!(pending.f8936, pending);
  assertThrows(() => form8936Pdf.instances!(fields, filer, pending));
  assertThrows(() =>
    form8936Pdf.instances!(fields, filer, {
      ...pending,
      f8936: {
        ...source,
        f8936s: [{
          ...vehicle,
          business_use: { ...vehicle.business_use, business_miles: 500 },
        }],
      },
    }, parts)
  );
  assertThrows(() =>
    form8936Pdf.instances!(fields, filer, pending, {
      ...parts,
      currentRows: parts.currentRows.map((row) =>
        row.line === "1y"
          ? {
            ...row,
            metadata: { ...row.metadata, referenceDocumentId: "IRS8936_OTHER" },
          }
          : row
      ),
    })
  );
  assertThrows(() =>
    form8936Pdf.instances!(fields, filer, pending, {
      ...parts,
      currentAmounts: parts.currentAmounts.map((row) =>
        row.line === "1y" ? { ...row, nonpassiveCredit: 1_874 } : row
      ),
    })
  );
  assertThrows(() =>
    form8936Pdf.instances!(fields, filer, pending, {
      ...parts,
      currentDetails: parts.currentDetails.map((row) =>
        row.line === "1y" ? { ...row, credit: 1_874 } : row
      ),
    })
  );
  assertThrows(() =>
    form8936Pdf.instances!(fields, filer, pending, {
      ...parts,
      lines: { ...parts.lines, line38: 1_874 },
    })
  );
  assertThrows(() =>
    form8936Pdf.instances!(fields, filer, {
      ...pending,
      schedule3: { ...pending.schedule3, line6a_total: 1_874 },
    }, parts)
  );
  assertThrows(() =>
    form8936Pdf.instances!(fields, filer, {
      ...pending,
      f1040: { ...pending.f1040, line20_nonrefundable_credits: 7_499 },
    }, parts)
  );
});
