import { assertEquals, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../index.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { TargetGroup } from "../../../nodes/inputs/f5884/index.ts";
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

const workOpportunity = {
  subject_to_passive_activity_limit: false,
  f5884s: [{
    employee_reference: "EMP-001",
    target_group: TargetGroup.TanfRecipient,
    hired_on: "2025-01-15",
    certification: {
      path: "certified_by_start" as const,
      swa_certification_reference: "SWA-001",
      certification_received_on: "2025-01-15",
      certification_received_before_claim_confirmed: true,
      revocation: { status: "no_notice_received" as const },
    },
    qualified_wages_confirmed: true,
    not_prior_employee_confirmed: true,
    not_related_or_dependent_confirmed: true,
    more_than_half_wages_for_trade_or_business_confirmed: true,
    excluded_wages_removed_confirmed: true,
    wage_records: [{
      payroll_record_reference: "PAY-001",
      deduction_location: {
        kind: "schedule_c" as const,
        business_reference: "BUSINESS-1",
      },
      service_period_start_on: "2025-02-01",
      service_period_end_on: "2025-02-28",
      paid_or_incurred_on: "2025-02-28",
      qualified_wages: 6_000,
    }],
    hours_worked: 400,
  }],
};

const commercialVehicle = {
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

const vehicleSource = {
  current_year_magi: { adjusted_gross_income: 300_000 },
  prior_year_magi: { adjusted_gross_income: 100_000 },
  filing_status: FilingStatus.Single,
  prior_year_filing_status: FilingStatus.Single,
  f8936s: [commercialVehicle],
};

function mixedReturn() {
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
      box1_wages: 300_000,
      box2_fed_withheld: 45_000,
      box3_ss_wages: 176_100,
      box4_ss_withheld: 10_918.20,
      box5_medicare_wages: 300_000,
      box6_medicare_withheld: 4_350,
      employer_ein: "12-3456789",
      employer_name: "ACME Corp",
      employer_address_line1: "10 Payroll Way",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box12_entries: [],
    }],
    schedule_c: [{
      business_reference: "BUSINESS-1",
      line_a_principal_business: "Retail store",
      line_b_business_code: "459999",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_i_made_1099_payments: false,
      line_1_gross_receipts: 3_600,
      line_26_wages: 6_000,
    }],
    f5884: workOpportunity,
    f8936: vehicleSource,
  });
}

Deno.test("mixed work opportunity and commercial vehicle credits reach both Form 3800 PDF classes", async () => {
  const result = mixedReturn();
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(
    (pending.f3800.f5884_credit as { credit_amount: number }).credit_amount,
    2_400,
  );
  assertEquals(
    (pending.f3800.f8936_commercial_vehicle_credit as { credit_amount: number })
      .credit_amount,
    3_000,
  );
  assertEquals(pending.f3800.allowed_credit, 5_400);
  assertEquals(pending.schedule3.line6a_total, 5_400);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 5_400);
  const prepared = await f1040_2025.prepareReturn(result.pending, finalFiler);
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.lines.line17, 3_000);
  assertEquals(parts.lines.line37, 2_400);
  assertEquals(parts.lines.line38, 5_400);
  const [printed] = form3800Pdf.instances!(
    pending.f3800,
    finalFiler,
    pending,
    parts,
  );
  assertEquals(printed[form3800PartIIIFields("1aa").e], 3_000);
  assertEquals(printed[form3800PartIIIFields("4b").e], 2_400);
  assertEquals(printed[form3800PartIAndIIFields.line38], 5_400);
});

Deno.test("mixed Form 3800 PDF rejects either source, prepared row, or final-credit drift", async () => {
  const result = mixedReturn();
  const pending = normalizeAllPending(result.pending);
  const prepared = await f1040_2025.prepareReturn(result.pending, finalFiler);
  const parts = prepared.bundle.form3800Parts!;
  for (
    const altered of [
      {
        ...pending,
        f5884: {
          ...workOpportunity,
          f5884s: [{ ...workOpportunity.f5884s[0], hours_worked: 200 }],
        },
      },
      {
        ...pending,
        f8936: {
          ...vehicleSource,
          f8936s: [{
            ...commercialVehicle,
            commercial: {
              ...commercialVehicle.commercial,
              cost_or_other_basis: 9_000,
            },
          }],
        },
      },
      {
        ...pending,
        f1040: {
          ...pending.f1040,
          line20_nonrefundable_credits: 5_399,
        },
      },
    ]
  ) {
    assertThrows(
      () => form3800Pdf.instances!(pending.f3800, finalFiler, altered, parts),
      Error,
    );
  }
  assertThrows(
    () =>
      form3800Pdf.instances!(pending.f3800, finalFiler, pending, {
        ...parts,
        currentRows: parts.currentRows.map((row) =>
          row.line === "1aa"
            ? {
              ...row,
              metadata: { ...row.metadata, referenceDocumentName: "IRS5884" },
            }
            : row
        ),
      }),
    Error,
    "commercial Form 8936 source",
  );
});
