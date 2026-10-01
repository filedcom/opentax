import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { FilingStatus } from "../nodes/types.ts";
import { normalizeAllPending } from "./pending.ts";
import { form8582 } from "./mef/forms/f8582.ts";
import { scheduleE } from "./mef/forms/schedule_e.ts";
import { form8582Pdf } from "./pdf/forms/f8582.ts";
import { scheduleEPdf } from "./pdf/forms/schedule_e.ts";

const general = {
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Owner",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

const rental = (
  activityId: string,
  name: string,
  street: string,
  income: number,
  repairs: number,
) => ({
  tsj: "T",
  activity_id: activityId,
  property_description: name,
  property_type: 1,
  activity_type: "B",
  street_address: street,
  city: "Austin",
  state: "TX",
  zip: "78701",
  fair_rental_days: 365,
  personal_use_days: 0,
  rent_income: income,
  expense_repairs: repairs,
  form_1099_payments_made: false,
});

const rentals = [
  rental("rental-profit-east-2025", "East rental", "10 East St", 3_000, 1_000),
  rental("rental-profit-west-2025", "West rental", "20 West St", 2_000, 1_000),
  rental("rental-loss-south-2025", "South rental", "30 South St", 1_000, 6_000),
];

function filedReturn() {
  const result = f1040_2025.executeReturn({
    general,
    w2: [{ box1_wages: 50_000, box2_fed_withheld: 8_000 }],
    schedule_e: rentals,
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("two passive rental profits offset a third rental loss through Form 8582 and final return", () => {
  const result = filedReturn();
  assertEquals(result.pending.form8582.current_income, 3_000);
  assertEquals(result.pending.form8582.current_loss, 5_000);
  assertEquals(result.pending.schedule1.line5_schedule_e, 0);
  assertEquals(result.pending.f1040.line11_agi, 50_000);
  assertEquals(result.carryforwards.suspended_pal_8582, 2_000);
  assertEquals(
    result.carryforwards["suspended_pal_8582:rental-loss-south-2025"],
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
    scheduleE.build(pending.schedule_e, { pending }),
    "<TotalIncomeOrLossAmt>0</TotalIncomeOrLossAmt>",
  );
  const formPdf = form8582Pdf.projectFields!(pending.form8582, pending);
  assertEquals(formPdf.line2a, "3000");
  assertEquals(formPdf.line2b, "5000");
  const schedulePdf = scheduleEPdf.projectFields!(pending.schedule_e, pending);
  assertEquals(schedulePdf.property_0_line22, undefined);
  assertEquals(schedulePdf.property_1_line22, undefined);
  assertEquals(schedulePdf.property_2_line22, 3_000);
});

Deno.test("three-rental passive offset rejects changed source and final return", () => {
  const pending = normalizeAllPending(filedReturn().pending);
  const altered = [
    {
      ...pending,
      schedule_e: {
        ...pending.schedule_e,
        schedule_es: [
          ...(pending.schedule_e.schedule_es as Record<string, unknown>[])
            .slice(0, 2),
          { ...rentals[2], expense_repairs: 6_001 },
        ],
      },
    },
    {
      ...pending,
      schedule1: { ...pending.schedule1, line5_schedule_e: 1 },
    },
    {
      ...pending,
      f1040: { ...pending.f1040, line11_agi: 49_999 },
    },
  ];
  for (const changed of altered) {
    assertThrows(
      () => form8582.build(changed.form8582, { pending: changed }),
      Error,
    );
    assertThrows(
      () => form8582Pdf.projectFields!(changed.form8582, changed),
      Error,
    );
  }
});
