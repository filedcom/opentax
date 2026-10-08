import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { FilingStatus } from "../../../../nodes/types.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { form8582 } from "../../../mef/forms/execution/f8582/f8582.ts";
import { form8582Pdf } from "../../../pdf/forms/execution/f8582.ts";
import { form4835Pdf } from "../../../pdf/forms/business/f4835.ts";

const general = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Farmer",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

const farm = {
  activity_id: "share-rent-farm-2025",
  activity_name: "Share rent farm",
  actively_participated: false,
  livestock_crop_income: 2_000,
  expense_repairs_maintenance: 7_000,
  some_investment_not_at_risk: false,
};

const rental = {
  tsj: "T",
  activity_id: "other-rental-2025",
  property_description: "Other rental",
  property_type: 1,
  activity_type: "B",
  fair_rental_days: 365,
  personal_use_days: 0,
  rent_income: 5_000,
  expense_repairs: 2_000,
  form_1099_payments_made: false,
};

function filedReturn() {
  const result = f1040_2025.executeReturn({
    general,
    w2: [{ box1_wages: 50_000, box2_fed_withheld: 8_000 }],
    f4835: [farm],
    schedule_e: [rental],
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("one farm passive loss offsets one rental profit through Form 8582 and final return", () => {
  const result = filedReturn();
  assertEquals(result.pending.form8582.current_income, 3_000);
  assertEquals(result.pending.form8582.current_loss, 5_000);
  assertEquals(result.pending.schedule1.line5_schedule_e, 0);
  assertEquals(result.pending.f1040.line11_agi, 50_000);
  assertEquals(result.carryforwards.suspended_pal_8582, 2_000);
  assertEquals(
    result.carryforwards["suspended_pal_8582:share-rent-farm-2025"],
    2_000,
  );
  const pending = normalizeAllPending(result.pending);
  const xml = form8582.build(pending.form8582, { pending });
  assertStringIncludes(
    xml,
    "<OtherActivityIncomeAmt>3000</OtherActivityIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<OtherActivityLossAmt>5000</OtherActivityLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>3000</TotalLossesAllowedAmt>",
  );
  const pdf = form8582Pdf.projectFields!(pending.form8582, pending);
  assertEquals(pdf.line2a, "3000");
  assertEquals(pdf.line2b, "5000");
  assertEquals(pdf.part7_1_form, "4835, line 34c");
  const farmPdf = form4835Pdf.projectFields!(pending.f4835, pending);
  const [farmPage] = form4835Pdf.instances!(
    farmPdf,
    extractFilerIdentity(general),
    pending,
  );
  assertEquals(farmPage.line34c_allowed_loss, 3_000);
});

Deno.test("farm/rental Form 8582 offset rejects changed source and finalized return", () => {
  const pending = normalizeAllPending(filedReturn().pending);
  const changed = (overrides: Record<string, Record<string, unknown>>) => ({
    ...pending,
    ...overrides,
  });
  const invalid = [
    changed({
      f4835: {
        ...pending.f4835,
        f4835s: [{ ...farm, expense_repairs_maintenance: 7_001 }],
      },
    }),
    changed({
      schedule_e: {
        ...pending.schedule_e,
        schedule_es: [{ ...rental, rent_income: 5_001 }],
      },
    }),
    changed({ schedule1: { ...pending.schedule1, line5_schedule_e: 1 } }),
    changed({ f1040: { ...pending.f1040, line11_agi: 49_999 } }),
  ];
  for (const altered of invalid) {
    assertThrows(
      () => form8582.build(altered.form8582, { pending: altered }),
      Error,
    );
    assertThrows(
      () => form8582Pdf.projectFields!(altered.form8582, altered),
      Error,
    );
  }
});
