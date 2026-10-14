import {
  farmRentalW2,
  verifyFarmRentalPacket,
} from "./form8582_farm_rental_packet.fixture.ts";
import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { form8582 } from "../../../../mef/forms/income/business/f8582/f8582.ts";
import { form8582Pdf } from "../../../../pdf/forms/income/business/f8582.ts";

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

const farm = {
  activity_id: "farm-profit-2025",
  activity_name: "Share rent farm",
  actively_participated: false,
  livestock_crop_income: 5_000,
  expense_repairs_maintenance: 2_000,
  some_investment_not_at_risk: false,
};

const rentals = [{
  tsj: "T",
  activity_id: "east-loss-2025",
  property_description: "East rental",
  property_type: 1,
  street_address: "101 Rental Lane",
  city: "Austin",
  state: "TX",
  zip: "78701",
  activity_type: "B",
  fair_rental_days: 365,
  personal_use_days: 0,
  rent_income: 1_000,
  expense_repairs: 3_000,
  some_investment_not_at_risk: false,
  form_1099_payments_made: false,
}, {
  tsj: "T",
  activity_id: "west-loss-2025",
  property_description: "West rental",
  property_type: 1,
  street_address: "102 Rental Lane",
  city: "Austin",
  state: "TX",
  zip: "78701",
  activity_type: "B",
  fair_rental_days: 365,
  personal_use_days: 0,
  rent_income: 1_000,
  expense_repairs: 5_000,
  some_investment_not_at_risk: false,
  form_1099_payments_made: false,
}];

function filedReturn() {
  const result = f1040_2025.executeReturn({
    general,
    w2: [farmRentalW2],
    f4835: [farm],
    schedule_e: rentals,
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("farm profit releases two passive rental losses with separate Part VII carryforwards", async () => {
  const result = filedReturn();
  assertEquals(result.pending.form8582.current_income, 3_000);
  assertEquals(result.pending.form8582.current_loss, 6_000);
  assertEquals(result.pending.schedule1.line5_schedule_e, 0);
  assertEquals(result.pending.f1040.line11_agi, 50_000);
  assertEquals(result.carryforwards.suspended_pal_8582, 3_000);
  assertEquals(
    result.carryforwards["suspended_pal_8582:east-loss-2025"],
    1_000,
  );
  assertEquals(
    result.carryforwards["suspended_pal_8582:west-loss-2025"],
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
    "<OtherActivityLossAmt>6000</OtherActivityLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalLossesAllowedAmt>3000</TotalLossesAllowedAmt>",
  );
  const pdf = form8582Pdf.projectFields!(pending.form8582, pending);
  assertEquals(pdf.line2a, "3000");
  assertEquals(pdf.line2b, "6000");
  assertEquals(pdf.line11, "3000");
  assertEquals(pdf.part7_1_name, "East rental");
  assertEquals(pdf.part7_1_ratio, "0.33333");
  assertEquals(pdf.part7_1_unallowed, "1000");
  assertEquals(pdf.part7_2_name, "West rental");
  assertEquals(pdf.part7_2_ratio, "0.66667");
  assertEquals(pdf.part7_2_unallowed, "2000");
  assertEquals(pdf.partVIII_1_allowed, "1000");
  assertEquals(pdf.partVIII_2_allowed, "2000");
  await verifyFarmRentalPacket(result, "farm-profit-two-rental-losses", [
    { activityId: "east-loss-2025", reportingForm: "schedule_e", amount: 1000 },
    { activityId: "west-loss-2025", reportingForm: "schedule_e", amount: 2000 },
  ]);
});

Deno.test("farm-profit/two-rental Form 8582 native and PDF reject changed source or return", () => {
  const pending = normalizeAllPending(filedReturn().pending);
  const altered: Array<typeof pending> = [
    {
      ...pending,
      f4835: {
        ...pending.f4835,
        f4835s: [{ ...farm, livestock_crop_income: 5_001 }],
      },
    },
    {
      ...pending,
      schedule_e: {
        ...pending.schedule_e,
        schedule_es: [rentals[0], {
          ...rentals[1],
          expense_repairs: 5_001,
        }],
      },
    },
    {
      ...pending,
      schedule_e: {
        ...pending.schedule_e,
        schedule_es: [rentals[0], {
          ...rentals[1],
          activity_id: rentals[0].activity_id,
        }],
      },
    },
    { ...pending, schedule1: { ...pending.schedule1, line5_schedule_e: 1 } },
    { ...pending, f1040: { ...pending.f1040, line11_agi: 50_001 } },
  ];
  for (const graph of altered) {
    assertThrows(
      () => form8582.build(graph.form8582, { pending: graph }),
      Error,
    );
    assertThrows(
      () => form8582Pdf.projectFields!(graph.form8582, graph),
      Error,
    );
  }
});
