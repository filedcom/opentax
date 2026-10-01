import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../nodes/types.ts";
import { normalizeAllPending } from "./pending.ts";
import { f1040_2025 } from "./index.ts";
import { form8582 } from "./mef/forms/f8582.ts";
import { form4835 } from "./mef/forms/f4835.ts";
import { form8582Pdf } from "./pdf/forms/f8582.ts";
import { form4835Pdf } from "./pdf/forms/f4835.ts";

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
  activity_id: "share-rent-2025",
  activity_name: "Share rent farm",
  actively_participated: false,
  livestock_crop_income: 2_000,
  expense_repairs_maintenance: 7_000,
  some_investment_not_at_risk: false,
};

const rentals = [{
  tsj: "T",
  activity_id: "east-rental-2025",
  property_description: "East rental",
  property_type: 1,
  activity_type: "B",
  fair_rental_days: 365,
  personal_use_days: 0,
  rent_income: 3_000,
  expense_repairs: 1_000,
  form_1099_payments_made: false,
}, {
  tsj: "T",
  activity_id: "west-rental-2025",
  property_description: "West rental",
  property_type: 1,
  activity_type: "B",
  fair_rental_days: 365,
  personal_use_days: 0,
  rent_income: 2_000,
  expense_repairs: 1_000,
  form_1099_payments_made: false,
}];

function filedReturn() {
  const result = f1040_2025.executeReturn({
    general,
    w2: [{ box1_wages: 50_000, box2_fed_withheld: 8_000 }],
    f4835: [farm],
    schedule_e: rentals,
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("one farm loss offsets two rental profits and retains one activity PAL", () => {
  const result = filedReturn();
  assertEquals(result.pending.form8582.current_income, 3_000);
  assertEquals(result.pending.form8582.current_loss, 5_000);
  assertEquals(result.pending.schedule1.line5_schedule_e, 0);
  assertEquals(result.pending.f1040.line11_agi, 50_000);
  assertEquals(result.carryforwards.suspended_pal_8582, 2_000);
  assertEquals(
    result.carryforwards["suspended_pal_8582:share-rent-2025"],
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
  assertEquals(pdf.line11, "3000");
  assertStringIncludes(
    form4835.build(pending.f4835 as never, { pending })[0]!,
    "<FarmRentalDeductibleLossAmt>3000</FarmRentalDeductibleLossAmt>",
  );
  const farmPdf = form4835Pdf.projectFields!(pending.f4835, pending);
  assertEquals(
    (farmPdf.activities as Record<string, unknown>[])[0]
      .line34c_allowed_loss,
    3_000,
  );
});

Deno.test("one-farm/two-rental Form 8582 route rejects source and return tampering", () => {
  const pending = normalizeAllPending(filedReturn().pending);
  const changed = [{
    ...pending,
    f4835: {
      ...pending.f4835,
      f4835s: [{ ...farm, expense_repairs_maintenance: 7_001 }],
    },
  }, {
    ...pending,
    schedule_e: {
      ...pending.schedule_e,
      schedule_es: [rentals[0], { ...rentals[1], rent_income: 2_001 }],
    },
  }, {
    ...pending,
    schedule_e: {
      ...pending.schedule_e,
      schedule_es: [rentals[0], {
        ...rentals[1],
        activity_id: rentals[0].activity_id,
      }],
    },
  }, {
    ...pending,
    schedule1: { ...pending.schedule1, line5_schedule_e: 1 },
  }, {
    ...pending,
    f1040: { ...pending.f1040, line11_agi: 49_999 },
  }];
  for (const altered of changed) {
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
