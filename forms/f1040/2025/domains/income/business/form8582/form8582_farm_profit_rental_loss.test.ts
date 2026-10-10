import {
  farmRentalW2,
  verifyFarmRentalPacket,
} from "./form8582_farm_rental_packet.fixture.ts";
import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { form4835 } from "../../../../mef/forms/income/business/f4835.ts";
import { form8582 } from "../../../../mef/forms/income/business/f8582/f8582.ts";
import { form4835Pdf } from "../../../../pdf/forms/income/business/f4835.ts";
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

const rental = {
  tsj: "T",
  activity_id: "rental-loss-2025",
  property_description: "Passive rental",
  property_type: 1,
  street_address: "101 Rental Lane",
  city: "Austin",
  state: "TX",
  zip: "78701",
  activity_type: "B",
  fair_rental_days: 365,
  personal_use_days: 0,
  rent_income: 2_000,
  expense_repairs: 7_000,
  some_investment_not_at_risk: false,
  form_1099_payments_made: false,
};

function filedReturn() {
  const result = f1040_2025.executeReturn({
    general,
    w2: [farmRentalW2],
    f4835: [farm],
    schedule_e: [rental],
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("Form 4835 profit allows one passive rental loss with a retained activity PAL", async () => {
  const result = filedReturn();
  assertEquals(result.pending.form8582.current_income, 3_000);
  assertEquals(result.pending.form8582.current_loss, 5_000);
  assertEquals(result.pending.schedule1.line5_schedule_e, 0);
  assertEquals(result.pending.f1040.line11_agi, 50_000);
  assertEquals(result.carryforwards.suspended_pal_8582, 2_000);
  assertEquals(
    result.carryforwards["suspended_pal_8582:rental-loss-2025"],
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
  assertStringIncludes(
    form4835.build(pending.f4835 as never, { pending })[0]!,
    "<NetFarmRentalIncomeOrLossAmt>3000</NetFarmRentalIncomeOrLossAmt>",
  );
  const pdf = form8582Pdf.projectFields!(pending.form8582, pending);
  assertEquals(pdf.line2a, "3000");
  assertEquals(pdf.line2b, "5000");
  assertEquals(pdf.line11, "3000");
  assertEquals(pdf.part5_1_name, "Passive rental");
  assertEquals(pdf.part5_2_name, "Share rent farm");
  assertEquals(pdf.part7_1_form, "Sch E, line 22");
  assertEquals(pdf.part7_1_unallowed, "2000");
  const farmPdf = form4835Pdf.projectFields!(pending.f4835, pending);
  assertEquals(
    (farmPdf.activities as Record<string, unknown>[])[0].line32_income,
    3_000,
  );
  await verifyFarmRentalPacket(result, "farm-profit-rental-loss", [
    {
      activityId: "rental-loss-2025",
      reportingForm: "schedule_e",
      amount: 2000,
    },
  ]);
});

Deno.test("Form 8582 farm-profit/rental-loss native and PDF reject changed sources and return", () => {
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
        schedule_es: [{ ...rental, expense_repairs: 7_001 }],
      },
    },
    {
      ...pending,
      schedule_e: {
        ...pending.schedule_e,
        schedule_es: [{ ...rental, activity_id: "another-rental" }],
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
