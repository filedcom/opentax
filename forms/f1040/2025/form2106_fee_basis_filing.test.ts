import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { EmployeeType, VehicleMethod } from "../nodes/inputs/f2106/index.ts";
import { FilingStatus } from "../nodes/types.ts";
import { assertAttachmentCoverage } from "./attachment-coverage.ts";
import { f1040_2025 } from "./index.ts";
import { form2106 } from "./mef/forms/f2106.ts";
import { normalizeAllPending } from "./pending.ts";
import { form2106Pdf } from "./pdf/forms/f2106.ts";

const job = {
  job: {
    tax_year: 2025,
    owner: "taxpayer",
    employee_name: "Casey Rivera",
    employee_ssn: "123-45-6789",
    occupation: "County hearing officer",
    employer_name: "Sample County",
    employer_ein: "12-3456789",
    employment_record_reference: "2025 county appointment and W-2",
  },
  qualification: {
    kind: EmployeeType.FEE_BASIS_OFFICIAL,
    state_or_local_government_employer: true,
    compensated_on_fee_basis: true,
    qualifying_service_reference: "2025 county fee schedule",
  },
  vehicle: { method: VehicleMethod.NONE },
  expenses: {
    line2_parking_tolls_local_transportation: 0,
    line3_overnight_travel_excluding_meals: 0,
    line4_other_business_expenses: 1_200,
    line5_meals: 0,
    standard_50_percent_meal_limit_confirmed: true,
    expense_records_reference: "2025 county expense ledger",
    job_business_purpose: "Hearing preparation",
  },
  reimbursements: {
    line7_column_a_nonmeals: 0,
    line7_column_b_meals: 0,
    employer_reimbursement_record_reference: "2025 reimbursement ledger",
    excluded_from_w2_box1_confirmed: true,
  },
};

function filedReturn() {
  const result = f1040_2025.executeReturn({
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Casey",
      taxpayer_last_name: "Rivera",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    w2: [{
      employer_ein: "12-3456789",
      employer_name: "Sample County",
      employee_ssn: "123-45-6789",
      box1_wages: 50_000,
      box2_fed_withheld: 8_000,
    }],
    f2106: [job],
  });
  assertEquals(result.diagnostics, []);
  return normalizeAllPending(result.pending);
}

Deno.test("one sourced fee-basis job reaches Schedule 1 and attached MeF/PDF Form 2106", () => {
  const pending = filedReturn();
  assertEquals(pending.schedule1.line12_business_expenses, 1_200);
  assertEquals(pending.f1040.line10_adjustments, 1_200);
  assertEquals(pending.f1040.line11_agi, 48_800);
  assertAttachmentCoverage(pending, "mef");
  assertAttachmentCoverage(pending, "pdf");
  const xml = form2106.build(pending.f2106, { pending });
  assertEquals(xml.length, 1);
  assertStringIncludes(
    xml[0]!,
    "<UnreimEmployeeBusExpnsAmt>1200</UnreimEmployeeBusExpnsAmt>",
  );
  const pdf = form2106Pdf.instances!(pending.f2106, undefined, pending);
  assertEquals(pdf.length, 1);
  assertEquals(pdf[0].line10_deduction, 1_200);
  assertEquals(pdf[0].employee_name, "Casey Rivera");
});

Deno.test("fee-basis filing rejects changed W-2, job, and finalized totals", () => {
  const pending = filedReturn();
  const changed: Record<string, Record<string, unknown>>[] = [{
    ...pending,
    w2: {
      ...pending.w2,
      w2s: [{
        ...(pending.w2.w2s as Record<string, unknown>[])[0],
        employer_ein: "98-7654321",
      }],
    },
  }, {
    ...pending,
    f2106: {
      ...pending.f2106,
      f2106s: [{
        ...job,
        expenses: { ...job.expenses, line4_other_business_expenses: 1_201 },
      }],
    },
  }, {
    ...pending,
    schedule1: { ...pending.schedule1, line12_business_expenses: 1_199 },
  }, {
    ...pending,
    f1040: { ...pending.f1040, line11_agi: 48_801 },
  }];
  for (const altered of changed) {
    assertThrows(
      () => form2106.build(altered.f2106, { pending: altered }),
      Error,
    );
    assertThrows(
      () => form2106Pdf.instances!(altered.f2106, undefined, altered),
      Error,
    );
  }
});
