import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../index.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { TargetGroup } from "../../../nodes/inputs/f5884/index.ts";
import { normalizeAllPending } from "../../pending.ts";
import { testFiler } from "../../mef/test-filer.ts";
import {
  form3800PartIAndIIFields,
  form3800PartIIIFields,
} from "./f3800_fields.ts";
import { form3800Pdf } from "./f3800.ts";

const orphan = {
  f8820s: [{
    generic_name: "Test Orphan Drug",
    designation_application_number: "FDA-2025-123",
    designation_date: "2024-03-15",
    qualified_clinical_testing_expenses: 10_000,
    qualifying_testing_confirmed: true,
    expenses_exclude_third_party_funding: true,
    expenses_not_used_for_research_credit: true,
  }],
  reduced_section280c_credit_election: true,
  form8932_overlapping_wage_credit: 0,
  subject_to_passive_activity_limit: false,
};

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
const commercialSource = {
  current_year_magi: { adjusted_gross_income: 300_000 },
  prior_year_magi: { adjusted_gross_income: 100_000 },
  filing_status: FilingStatus.Single,
  prior_year_filing_status: FilingStatus.Single,
  f8936s: [commercialVehicle],
};

function mixedReturn(includeCommercial = false) {
  return f1040_2025.executeReturn({
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
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
      box12_entries: [],
    }],
    schedule_c: [{
      business_reference: "BUSINESS-1",
      line_a_principal_business: "Retail store",
      line_b_business_code: "459999",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_1_gross_receipts: 6_000,
      line_26_wages: 6_000,
    }],
    f8820: orphan,
    f5884: workOpportunity,
    ...(includeCommercial ? { f8936: commercialSource } : {}),
  });
}

Deno.test("self-earned orphan-drug and work-opportunity credits share Form 3800, Form 1040, native XML, and PDF", async () => {
  const result = mixedReturn();
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(
    (pending.f3800.f8820_credit as { credit_amount: number }).credit_amount,
    1_975,
  );
  assertEquals(
    (pending.f3800.f5884_credit as { credit_amount: number }).credit_amount,
    2_400,
  );
  assertEquals(pending.f3800.allowed_credit, 4_375);
  assertEquals(pending.schedule3.line6a_total, 4_375);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 4_375);
  const prepared = await f1040_2025.prepareReturn(result.pending, testFiler());
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.lines.line17, 1_975);
  assertEquals(parts.lines.line37, 2_400);
  assertEquals(parts.lines.line38, 4_375);
  assertEquals(
    parts.currentRows.map((row) => row.line),
    ["1h", "4b"],
  );
  assertEquals(
    new Set(parts.currentRows.map((row) => row.metadata.referenceDocumentId))
      .size,
    2,
  );
  assertStringIncludes(prepared.bundle.xml, "<IRS8820 ");
  assertStringIncludes(prepared.bundle.xml, "<IRS5884 ");
  assertStringIncludes(prepared.bundle.xml, "<IRS3800 ");
  const [printed] = form3800Pdf.instances!(
    pending.f3800,
    testFiler(),
    pending,
    parts,
  );
  assertEquals(printed[form3800PartIIIFields("1h").e], 1_975);
  assertEquals(printed[form3800PartIIIFields("4b").e], 2_400);
  assertEquals(printed[form3800PartIAndIIFields.line38], 4_375);
  assertEquals(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() >= 9,
    true,
  );
});

Deno.test("mixed orphan-drug and work-opportunity Form 3800 PDF rejects source, document, and final-tax drift", async () => {
  const result = mixedReturn();
  const pending = normalizeAllPending(result.pending);
  const prepared = await f1040_2025.prepareReturn(result.pending, testFiler());
  const parts = prepared.bundle.form3800Parts!;
  for (
    const drift of [
      {
        ...pending,
        f8820: {
          ...orphan,
          f8820s: [{
            ...orphan.f8820s[0],
            qualified_clinical_testing_expenses: 9_000,
          }],
        },
      },
      {
        ...pending,
        f5884: {
          ...workOpportunity,
          f5884s: [{ ...workOpportunity.f5884s[0], hours_worked: 200 }],
        },
      },
      {
        ...pending,
        f1040: { ...pending.f1040, line20_nonrefundable_credits: 4_374 },
      },
    ]
  ) {
    assertThrows(
      () => form3800Pdf.instances!(pending.f3800, testFiler(), drift, parts),
      Error,
    );
  }
  assertThrows(
    () =>
      form3800Pdf.instances!(pending.f3800, testFiler(), pending, {
        ...parts,
        currentRows: parts.currentRows.map((row) =>
          row.line === "4b"
            ? {
              ...row,
              metadata: {
                ...row.metadata,
                referenceDocumentId: parts.currentRows[0].metadata
                  .referenceDocumentId,
              },
            }
            : row
        ),
      }),
    Error,
    "one filed self-earned Form 8820 source",
  );
});

Deno.test("three distinct self-earned credits reconcile to Form 3800, Form 1040, native XML, and PDF", async () => {
  const result = mixedReturn(true);
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(
    (pending.f3800.f8820_credit as { credit_amount: number }).credit_amount,
    1_975,
  );
  assertEquals(
    (pending.f3800.f8936_commercial_vehicle_credit as { credit_amount: number })
      .credit_amount,
    3_000,
  );
  assertEquals(
    (pending.f3800.f5884_credit as { credit_amount: number }).credit_amount,
    2_400,
  );
  assertEquals(pending.f3800.allowed_credit, 7_375);
  assertEquals(pending.schedule3.line6a_total, 7_375);
  assertEquals(pending.f1040.line20_nonrefundable_credits, 7_375);
  const prepared = await f1040_2025.prepareReturn(result.pending, testFiler());
  const parts = prepared.bundle.form3800Parts!;
  assertEquals(parts.lines.line17, 4_975);
  assertEquals(parts.lines.line37, 2_400);
  assertEquals(parts.lines.line38, 7_375);
  assertEquals(parts.currentRows.map((row) => row.line), ["1h", "1aa", "4b"]);
  assertEquals(
    new Set(parts.currentRows.map((row) => row.metadata.referenceDocumentId))
      .size,
    3,
  );
  for (const form of ["IRS8820", "IRS8936", "IRS5884", "IRS3800"]) {
    assertStringIncludes(prepared.bundle.xml, `<${form} `);
  }
  const [printed] = form3800Pdf.instances!(
    pending.f3800,
    testFiler(),
    pending,
    parts,
  );
  assertEquals(printed[form3800PartIIIFields("1h").e], 1_975);
  assertEquals(printed[form3800PartIIIFields("1aa").e], 3_000);
  assertEquals(printed[form3800PartIIIFields("4b").e], 2_400);
  assertEquals(printed[form3800PartIAndIIFields.line38], 7_375);
  assertEquals(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() >= 9,
    true,
  );
});

Deno.test("three-source Form 3800 PDF rejects vehicle, document, and final-tax drift", async () => {
  const result = mixedReturn(true);
  const pending = normalizeAllPending(result.pending);
  const prepared = await f1040_2025.prepareReturn(result.pending, testFiler());
  const parts = prepared.bundle.form3800Parts!;
  for (
    const drift of [
      {
        ...pending,
        f8936: {
          ...commercialSource,
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
        f1040: { ...pending.f1040, line20_nonrefundable_credits: 7_374 },
      },
    ]
  ) {
    assertThrows(
      () => form3800Pdf.instances!(pending.f3800, testFiler(), drift, parts),
      Error,
    );
  }
  assertThrows(
    () =>
      form3800Pdf.instances!(pending.f3800, testFiler(), pending, {
        ...parts,
        currentRows: parts.currentRows.map((row) =>
          row.line === "1aa"
            ? {
              ...row,
              metadata: {
                ...row.metadata,
                referenceDocumentId:
                  parts.currentRows[0].metadata.referenceDocumentId,
              },
            }
            : row
        ),
      }),
    Error,
    "one filed self-earned Form 8820 source",
  );
});
