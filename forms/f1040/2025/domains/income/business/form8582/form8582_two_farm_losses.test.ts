import {
  farmRentalW2,
  verifyFarmRentalPacket,
} from "./form8582_farm_rental_packet.fixture.ts";
import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { form8582 } from "../../../../mef/forms/income/business/f8582/f8582.ts";
import { form4835 } from "../../../../mef/forms/income/business/f4835.ts";
import { form8582Pdf } from "../../../../pdf/forms/income/business/f8582.ts";
import { form4835Pdf } from "../../../../pdf/forms/income/business/f4835.ts";
import { buildForm8582Ledger } from "../../../../../nodes/intermediate/forms/income/business/form8582/ledger.ts";

const general = {
  filing_status: FilingStatus.Single,
  digital_assets: false,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Farmer",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

const farms = [{
  activity_id: "north-share-rent-2025",
  activity_name: "North share rent",
  actively_participated: false,
  livestock_crop_income: 2_000,
  expense_repairs_maintenance: 5_000,
  some_investment_not_at_risk: false,
}, {
  activity_id: "south-share-rent-2025",
  activity_name: "South share rent",
  actively_participated: false,
  livestock_crop_income: 1_000,
  expense_repairs_maintenance: 2_000,
  some_investment_not_at_risk: false,
}];

const rental = {
  tsj: "T",
  activity_id: "other-rental-2025",
  property_description: "Other rental",
  property_type: 1,
  street_address: "101 Rental Lane",
  city: "Austin",
  state: "TX",
  zip: "78701",
  activity_type: "B",
  fair_rental_days: 365,
  personal_use_days: 0,
  rent_income: 3_000,
  expense_repairs: 1_000,
  form_1099_payments_made: false,
};

function filedReturn() {
  const result = f1040_2025.executeReturn({
    general,
    w2: [farmRentalW2],
    f4835: farms,
    schedule_e: [rental],
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("two Form 4835 losses share one rental profit and retain distinct Form 8582 carryovers", async () => {
  const result = filedReturn();
  assertEquals(result.pending.form8582.current_income, 2_000);
  assertEquals(result.pending.form8582.current_loss, 4_000);
  assertEquals(result.pending.schedule1.line5_schedule_e, 0);
  assertEquals(result.pending.f1040.line11_agi, 50_000);
  assertEquals(result.carryforwards.suspended_pal_8582, 2_000);
  assertEquals(
    result.carryforwards["suspended_pal_8582:north-share-rent-2025"],
    1_500,
  );
  assertEquals(
    result.carryforwards["suspended_pal_8582:south-share-rent-2025"],
    500,
  );

  const pending = normalizeAllPending(result.pending);
  const xml = form8582.build(pending.form8582, { pending });
  assertStringIncludes(
    xml,
    "<OtherActivityIncomeAmt>2000</OtherActivityIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<OtherActivityLossAmt>4000</OtherActivityLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>2000</TotalLossesAllowedAmt>",
  );
  const pdf = form8582Pdf.projectFields!(pending.form8582, pending);
  assertEquals(pdf.line2a, "2000");
  assertEquals(pdf.line2b, "4000");
  assertEquals(pdf.line11, "2000");
  const farmXml = form4835.build(pending.f4835 as never, { pending });
  assertEquals(farmXml.length, 2);
  assertStringIncludes(
    farmXml[0]!,
    "<FarmRentalDeductibleLossAmt>1500</FarmRentalDeductibleLossAmt>",
  );
  assertStringIncludes(
    farmXml[1]!,
    "<FarmRentalDeductibleLossAmt>500</FarmRentalDeductibleLossAmt>",
  );
  const farmsPdf = form4835Pdf.projectFields!(pending.f4835, pending);
  assertEquals(
    (farmsPdf.activities as Record<string, unknown>[]).map((activity) =>
      activity.line34c_allowed_loss
    ),
    [1_500, 500],
  );
  const ledger = buildForm8582Ledger(
    pending.form8582,
    "synthetic accepted 2025 farm return",
  );
  assertEquals(ledger.activities.map((activity) => activity.activity_id), [
    "north-share-rent-2025",
    "south-share-rent-2025",
  ]);
  assertEquals(ledger.ending_unallowed_loss, 2_000);
  await verifyFarmRentalPacket(result, "two-farm-losses-rental-profit", [
    {
      activityId: "north-share-rent-2025",
      reportingForm: "form4835",
      amount: 1500,
    },
    {
      activityId: "south-share-rent-2025",
      reportingForm: "form4835",
      amount: 500,
    },
  ]);
});

Deno.test("two-farm Form 8582 route rejects changed activity and return totals", () => {
  const pending = normalizeAllPending(filedReturn().pending);
  const changed: Array<typeof pending> = [{
    ...pending,
    f4835: {
      ...pending.f4835,
      f4835s: [farms[0], { ...farms[1], expense_repairs_maintenance: 2_001 }],
    },
  }, {
    ...pending,
    f4835: {
      ...pending.f4835,
      f4835s: [farms[0], { ...farms[1], activity_id: farms[0].activity_id }],
    },
  }, {
    ...pending,
    schedule_e: {
      ...pending.schedule_e,
      schedule_es: [{ ...rental, rent_income: 3_001 }],
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
