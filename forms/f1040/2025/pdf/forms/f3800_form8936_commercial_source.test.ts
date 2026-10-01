import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../index.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { normalizeAllPending } from "../../pending.ts";
import { testFiler } from "../../mef/test-filer.ts";

const finalFiler = {
  ...testFiler(),
  firstNameWithInitial: "Alex",
  lastName: "Taxpayer",
  nameLine1: "TAXPAYER ALEX",
};
import {
  form3800PartIAndIIFields,
  form3800PartIIIFields,
} from "./f3800_fields.ts";
import { form3800Pdf } from "./f3800.ts";
import { form8936Pdf } from "./f8936.ts";

const vehicle = {
  vin: "1HGCM82633A004352",
  vehicle_year: 2025,
  vehicle_make: "Example",
  vehicle_model: "Electric Van",
  acquisition_date: "2025-09-30",
  placed_in_service_date: "2025-09-30",
  transferred_to_dealer: false,
  resold_within_30_days: false,
  acquired_for_use_not_resale: true,
  credit_kind: "qualified_commercial_clean_vehicle" as const,
  business_credit_subject_to_passive_activity_limit: false,
  commercial: {
    owned_by_taxpayer: true,
    qualified_manufacturer: true,
    original_use_begins_with_taxpayer: true,
    claimed_new_clean_credit_for_vin: false,
    primarily_used_in_us: true,
    subject_to_depreciation: true,
    vehicle_design: "street_vehicle" as const,
    powered_partly_by_gas_or_diesel: false,
    gvwr_pounds: 10_000,
    cost_or_other_basis: 10_000,
    section179_expense_deduction: 0,
    incremental_cost: {
      kind: "2025_light_street_safe_harbor" as const,
      is_compact_car_phev: false,
    },
    propulsion: {
      kind: "plug_in_electric" as const,
      battery_capacity_kwh: 80,
      externally_rechargeable: true,
    },
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

Deno.test("one commercial Form 8936 credit reaches Form 3800 line 1aa, Form 1040 and nine-page PDF", async () => {
  const result = filedReturn();
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  const commercialCredit = pending.f3800.f8936_commercial_vehicle_credit as {
    credit_amount: number;
  };
  assertEquals(
    commercialCredit.credit_amount,
    3_000,
  );
  assertEquals(pending.f3800.allowed_credit, 3_000);
  assertEquals(pending.schedule3.line6a_total, 3_000);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 3_000);
  const prepared = await f1040_2025.prepareReturn(result.pending, finalFiler);
  assertEquals(prepared.bundle.form3800Parts?.lines.line38, 3_000);
  assertStringIncludes(prepared.bundle.xml, "<IRS8936 ");
  assertStringIncludes(prepared.bundle.xml, "<IRS3800 ");
  const [printed] = form3800Pdf.instances!(
    pending.f3800,
    finalFiler,
    pending,
    prepared.bundle.form3800Parts,
  );
  assertEquals(printed[form3800PartIIIFields("1aa").e], 3_000);
  assertEquals(printed[form3800PartIAndIIFields.line38], 3_000);
  const child = form8936Pdf.projectFields!(pending.f8936, pending);
  assertEquals(child.line21, 3_000);
  assertEquals(
    form8936Pdf.instances!(
      child,
      finalFiler,
      pending,
      prepared.bundle.form3800Parts,
    ),
    [child],
  );
});

Deno.test("commercial Form 8936 printable copy rejects changed parent document and final credit", async () => {
  const result = filedReturn();
  const pending = normalizeAllPending(result.pending);
  const prepared = await f1040_2025.prepareReturn(result.pending, finalFiler);
  const parts = prepared.bundle.form3800Parts!;
  const fields = form8936Pdf.projectFields!(pending.f8936, pending);
  assertThrows(() => form8936Pdf.instances!(fields, finalFiler, pending));
  assertThrows(() =>
    form8936Pdf.instances!(fields, finalFiler, pending, {
      ...parts,
      currentRows: parts.currentRows.map((row) =>
        row.line === "1aa"
          ? {
            ...row,
            metadata: {
              ...row.metadata,
              referenceDocumentId: "IRS8936_OTHER",
            },
          }
          : row
      ),
    })
  );
  assertThrows(() =>
    form8936Pdf.instances!(fields, finalFiler, pending, {
      ...parts,
      currentDetails: parts.currentDetails.map((row) =>
        row.line === "1aa" ? { ...row, credit: 2_999 } : row
      ),
    })
  );
  assertThrows(() =>
    form8936Pdf.instances!(fields, finalFiler, {
      ...pending,
      f1040: { ...pending.f1040, line20_nonrefundable_credits: 2_999 },
    }, parts)
  );
});

Deno.test("commercial vehicle source, prepared row and Form 1040 tampering stop Form 3800 PDF", async () => {
  const result = filedReturn();
  const pending = normalizeAllPending(result.pending);
  const prepared = await f1040_2025.prepareReturn(result.pending, finalFiler);
  const parts = prepared.bundle.form3800Parts!;
  for (
    const altered of [
      {
        ...pending,
        f8936: {
          ...source,
          f8936s: [{
            ...vehicle,
            commercial: { ...vehicle.commercial, cost_or_other_basis: 9_000 },
          }],
        },
      },
      {
        ...pending,
        f8936: {
          ...source,
          f8936s: [{ ...vehicle, acquisition_date: "2025-10-01" }],
        },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line20_nonrefundable_credits: 2_999 },
      },
    ]
  ) {
    assertThrows(
      () => form3800Pdf.instances!(pending.f3800, finalFiler, altered, parts),
      Error,
    );
  }
  assertThrows(() =>
    form3800Pdf.instances!(
      pending.f3800,
      finalFiler,
      pending,
      {
        ...parts,
        currentRows: parts.currentRows.map((row) =>
          row.line === "1aa"
            ? {
              ...row,
              metadata: { ...row.metadata, referenceDocumentName: "IRS8820" },
            }
            : row
        ),
      },
    ), Error);
  assertThrows(() =>
    form3800Pdf.instances!(
      {
        ...pending.f3800,
        f8936_commercial_vehicle_credit: {
          credit_amount: 2_999,
          subject_to_passive_activity_limit: false,
        },
      },
      finalFiler,
      pending,
      parts,
    ), Error);
});
