import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../index.ts";
import { FilingStatus } from "../../../../nodes/types.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import { form8582 } from "../../../mef/forms/execution/f8582/f8582.ts";
import { scheduleE } from "../../../mef/forms/business/schedule_e.ts";
import { form8582Pdf } from "../../../pdf/forms/execution/f8582.ts";
import { scheduleEPdf } from "../../../pdf/forms/business/schedule_e.ts";
import { buildForm8582Ledger } from "../../../../nodes/intermediate/forms/form8582/ledger.ts";
import { reconcileForm8582NextYearOpening } from "../../../../nodes/intermediate/forms/form8582/next_year_import.ts";

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
      () => form8582.build(pending.form8582, { pending: changed }),
      Error,
    );
    assertThrows(
      () => form8582Pdf.projectFields!(pending.form8582, changed),
      Error,
    );
  }
});

const twoLossRentals = [
  rental("rental-loss-north-2025", "North rental", "10 North St", 1_000, 5_000),
  rental("rental-profit-east-2025", "East rental", "20 East St", 3_000, 1_000),
  rental("rental-loss-south-2025", "South rental", "30 South St", 1_000, 3_000),
];

function twoLossReturn() {
  const result = f1040_2025.executeReturn({
    general,
    w2: [{ box1_wages: 50_000, box2_fed_withheld: 8_000 }],
    schedule_e: twoLossRentals,
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("one rental profit offsets two identified losses and leaves two 2026 ledger rows", () => {
  const result = twoLossReturn();
  assertEquals(result.pending.form8582.current_income, 2_000);
  assertEquals(result.pending.form8582.current_loss, 6_000);
  assertEquals(result.pending.schedule1.line5_schedule_e, 0);
  assertEquals(result.pending.f1040.line11_agi, 50_000);
  assertEquals(result.carryforwards.suspended_pal_8582, 4_000);
  const pending = normalizeAllPending(result.pending);
  const native = form8582.build(pending.form8582, { pending });
  assertStringIncludes(
    native,
    "<OtherActivityIncomeAmt>2000</OtherActivityIncomeAmt>",
  );
  assertStringIncludes(
    native,
    "<OtherActivityLossAmt>6000</OtherActivityLossAmt>",
  );
  assertStringIncludes(
    native,
    "<TotalLossesAllowedAmt>2000</TotalLossesAllowedAmt>",
  );
  const formPdf = form8582Pdf.projectFields!(pending.form8582, pending);
  assertEquals(formPdf.line2a, "2000");
  assertEquals(formPdf.line2b, "6000");
  assertEquals(formPdf.line11, "2000");
  assertStringIncludes(
    scheduleE.build(pending.schedule_e, { pending }),
    "<TotalIncomeOrLossAmt>0</TotalIncomeOrLossAmt>",
  );
  const schedulePdf = scheduleEPdf.projectFields!(pending.schedule_e, pending);
  assertEquals(typeof schedulePdf.property_0_line22, "number");
  assertEquals(typeof schedulePdf.property_2_line22, "number");
  const acceptedReference = "synthetic accepted 2025 two-loss return";
  const ledger = buildForm8582Ledger(pending.form8582, acceptedReference);
  assertEquals(ledger.activities.map((activity) => activity.activity_id), [
    "rental-loss-north-2025",
    "rental-loss-south-2025",
  ]);
  assertEquals(ledger.ending_unallowed_loss, 4_000);
  for (const activity of ledger.activities) {
    assertEquals(activity.reporting_part, "viii");
    assertEquals(activity.lines[0].reporting_form, "schedule_e");
    assertEquals(
      result.carryforwards[`suspended_pal_8582:${activity.activity_id}`],
      activity.ending_unallowed_loss,
    );
  }
  const opening = {
    tax_year: 2026,
    prior_accepted_return_reference: acceptedReference,
    rows: ledger.activities.map((activity) => ({
      activity_id: activity.activity_id,
      reporting_part: activity.reporting_part,
      reporting_form: activity.lines[0].reporting_form,
      prior_unallowed_loss: activity.ending_unallowed_loss,
    })),
  };
  assertEquals(
    reconcileForm8582NextYearOpening(
      opening,
      ledger,
      pending.form8582,
      acceptedReference,
    ),
    opening,
  );
  assertThrows(
    () =>
      reconcileForm8582NextYearOpening(
        { ...opening, rows: opening.rows.slice(0, 1) },
        ledger,
        pending.form8582,
        acceptedReference,
      ),
    Error,
    "activity, character, and loss ledger",
  );
  assertThrows(
    () =>
      reconcileForm8582NextYearOpening(
        {
          ...opening,
          rows: [
            opening.rows[0],
            { ...opening.rows[1], prior_unallowed_loss: 1 },
          ],
        },
        ledger,
        pending.form8582,
        acceptedReference,
      ),
    Error,
    "activity, character, and loss ledger",
  );
});

Deno.test("two-loss rental packet rejects changed activity and final return", () => {
  const pending = normalizeAllPending(twoLossReturn().pending);
  for (
    const changed of [{
      ...pending,
      schedule_e: {
        ...pending.schedule_e,
        schedule_es: [
          { ...twoLossRentals[0], expense_repairs: 5_001 },
          ...twoLossRentals.slice(1),
        ],
      },
    }, {
      ...pending,
      schedule1: { ...pending.schedule1, line5_schedule_e: 1 },
    }, {
      ...pending,
      f1040: { ...pending.f1040, line11_agi: 49_999 },
    }]
  ) {
    assertThrows(
      () => form8582.build(pending.form8582, { pending: changed }),
      Error,
    );
    assertThrows(
      () => form8582Pdf.projectFields!(pending.form8582, changed),
      Error,
    );
  }
});
