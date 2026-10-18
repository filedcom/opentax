import { test } from "bun:test";
import { assertEquals, assertThrows } from "@std/assert";
import { form8995 } from "./index.ts";
import { FilingStatus } from "../../../../../types.ts";

function compute(input: Record<string, unknown>, taxYear = 2026) {
  return form8995.compute({ taxYear, formType: "f1040" }, input);
}

function deduction(result: ReturnType<typeof compute>) {
  return result.outputs.find((o) => o.nodeType === "f1040")?.fields
    .line13_qbi_deduction;
}

function oneBusiness(qbi: number, materiallyParticipates = true) {
  return {
    qbi_from_schedule_c: qbi,
    filing_status: FilingStatus.Single,
    agi: 50_000,
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
      source_schedule_c: {
        business_reference: "c-1",
        line_a_principal_business: "Repairs",
        line_b_business_code: "811490",
        line_c_business_name: "Example Repairs",
        line_d_ein: "12-3456789",
        line_f_accounting_method: "cash",
        line_g_material_participation: materiallyParticipates,
        line_1_gross_receipts: qbi,
        qbi_no_other_adjustments_confirmed: true,
      },
    }],
  };
}

test("TY2026 Form 8995 line 17 is at least the $400 minimum deduction", () => {
  // IRC §199A(i) (P.L. 119-21 §70105); draft 2026 Form 8995 lines 15-17 and
  // instructions for line 16: $1,500 of active QBI gives 20% = $300, less
  // than $400, and the active QBI is at least $1,000.
  const result = compute(oneBusiness(1_500));
  assertEquals(deduction(result), 400);
  const form = result.outputs.find((o) => o.nodeType === "form8995")?.fields;
  assertEquals(form?.line15, 300);
  assertEquals(form?.minimum_deduction, 400);
  // TY2025 has no minimum deduction.
  assertEquals(deduction(compute(oneBusiness(1_500), 2025)), 300);
});

test("TY2026 minimum deduction needs $1,000 of materially participating QBI", () => {
  // $999 of active QBI: 20% = $199.80, rounded on line 5 to $200.
  assertEquals(deduction(compute(oneBusiness(999))), 200);
  // Passive business income does not qualify (instructions for line 16).
  assertEquals(deduction(compute(oneBusiness(1_500, false))), 300);
  // A deduction already above $400 is unchanged.
  assertEquals(deduction(compute(oneBusiness(5_000))), 1_000);
});

test("TY2026 minimum deduction refuses QBI it cannot attribute to active businesses", () => {
  assertThrows(
    () =>
      compute({
        ...oneBusiness(1_500),
        // $200 of other (K-1) QBI whose participation is unknown.
        qbi: 200,
      }),
    Error,
    "line 16 minimum deduction",
  );
});
