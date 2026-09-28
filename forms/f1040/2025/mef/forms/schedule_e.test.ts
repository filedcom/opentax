import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { itemSchema } from "../../../nodes/inputs/schedule_e/index.ts";
import { scheduleE } from "./schedule_e.ts";

function property(overrides: Record<string, unknown> = {}) {
  return itemSchema.parse({
    tsj: "T",
    property_description: "Rental house",
    activity_id: "rental-house",
    property_type: 1,
    activity_type: "A",
    fair_rental_days: 365,
    personal_use_days: 0,
    rent_income: 12000,
    form_1099_payments_made: false,
    street_address: "12 Main Street",
    city: "Austin",
    state: "TX",
    zip: "78701",
    ...overrides,
  });
}

Deno.test("Schedule E serializes property lines and totals in XSD order", () => {
  const xml = scheduleE.build({
    schedule_es: [property({
      expense_advertising: 100,
      expense_mortgage_interest: 2000,
      expense_depreciation: 1500,
      expense_other_lines: [{ description: "Bank fees", amount: 50 }],
    })],
  });
  assertStringIncludes(
    xml,
    "<PropertyUSAddress><AddressLine1Txt>12 Main Street</AddressLine1Txt>",
  );
  assertStringIncludes(
    xml,
    "<PropertyDesc>SINGLE FAMILY RESIDENCE</PropertyDesc>",
  );
  assertStringIncludes(xml, "<RentsReceivedAmt>12000</RentsReceivedAmt>");
  assertStringIncludes(xml, "<TotalExpensesAmt>3650</TotalExpensesAmt>");
  assertStringIncludes(
    xml,
    "<NetRentalIncomeOrLossAmt>8350</NetRentalIncomeOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotAllPaymentsAllRentalPropAmt>12000</TotAllPaymentsAllRentalPropAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalIncomeOrLossAmt>8350</TotalIncomeOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalSuppIncomeOrLossAmt>8350</TotalSuppIncomeOrLossAmt>",
  );
  assertEquals(
    xml.indexOf("<PropertyRealEstAndRoyaltyGroup>") <
      xml.indexOf("<IncomeAmt>"),
    true,
  );
});

Deno.test("Schedule E combines two properties and Form 4835 farm income", () => {
  const xml = scheduleE.build({
    schedule_es: [
      property({ rent_income: 10000, expense_taxes: 1000 }),
      property({
        property_description: "Other house",
        rent_income: 5000,
        expense_insurance: 500,
      }),
    ],
    farm_rental_net: 3000,
    farm_rental_gross: 5000,
  });
  assertStringIncludes(
    xml,
    "<TotAllPaymentsAllRentalPropAmt>15000</TotAllPaymentsAllRentalPropAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalIncomeOrLossAmt>13500</TotalIncomeOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalSuppIncomeOrLossAmt>16500</TotalSuppIncomeOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<FarmingAndFishingIncomeAmt>5000</FarmingAndFishingIncomeAmt>",
  );
});

Deno.test("Schedule E royalty income is not excluded by zero rental days", () => {
  const xml = scheduleE.build({
    schedule_es: [property({
      property_type: 6,
      fair_rental_days: 0,
      rent_income: 0,
      royalties_income: 4000,
      street_address: undefined,
      city: undefined,
      state: undefined,
      zip: undefined,
    })],
  });
  assertStringIncludes(xml, "<PropertyDesc>ROYALTIES</PropertyDesc>");
  assertStringIncludes(
    xml,
    "<TotalRoyaltiesReceivedAmt>4000</TotalRoyaltiesReceivedAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalIncomeOrLossAmt>4000</TotalIncomeOrLossAmt>",
  );
});

Deno.test("Schedule E excludes under-15-day rentals only when used as a home", () => {
  assertEquals(
    scheduleE.build({
      schedule_es: [property({ fair_rental_days: 14, personal_use_days: 15 })],
    }),
    "",
  );
  assertStringIncludes(
    scheduleE.build({
      schedule_es: [property({ fair_rental_days: 14, personal_use_days: 0 })],
    }),
    "<RentsReceivedAmt>12000</RentsReceivedAmt>",
  );
});

Deno.test("Schedule E accepts determinable nonpassive loss", () => {
  const xml = scheduleE.build({
    schedule_es: [property({
      activity_type: "D",
      rent_income: 1000,
      expense_taxes: 2000,
    })],
  });
  assertStringIncludes(
    xml,
    "<NetRentalIncomeOrLossAmt>-1000</NetRentalIncomeOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>1000</DedRentalRealEstateLossAmt>",
  );
  assertStringIncludes(xml, "<LossesAmt>1000</LossesAmt>");
  assertStringIncludes(
    xml,
    "<TotalIncomeOrLossAmt>-1000</TotalIncomeOrLossAmt>",
  );
});

Deno.test("Schedule E emits active rental loss for linked Form 8582 reconciliation", () => {
  const rental = property({ rent_income: 1_000, expense_taxes: 2_000 });
  const xml = scheduleE.build({
    schedule_es: [rental],
  }, {
    pending: {
      schedule_e: { schedule_es: [rental] },
      form8582: {
        activities: [{
          activity_id: "rental-house",
          name: "Rental house",
          activity_type: "A",
          property_type: 1,
          current_net: -1_000,
          prior_unallowed_operating: 0,
          prior_unallowed_4797_part1: 0,
          prior_unallowed_4797_part2: 0,
        }],
        current_loss: 1_000,
        rental_current_loss: 1_000,
        has_active_rental: true,
        active_participation: true,
        modified_agi: 0,
        filing_status: "single",
      },
    },
  });
  assertStringIncludes(
    xml,
    "<NetRentalIncomeOrLossAmt>-1000</NetRentalIncomeOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<DedRentalRealEstateLossAmt>1000</DedRentalRealEstateLossAmt>",
  );
});

Deno.test("Schedule E rejects active rental loss without its Form 8582", () => {
  assertThrows(
    () =>
      scheduleE.build({
        schedule_es: [property({ rent_income: 1_000, expense_taxes: 2_000 })],
      }),
    Error,
    "matching Form 8582",
  );
});

Deno.test("Schedule E real estate professional net is reconciled on line 43", () => {
  const xml = scheduleE.build({
    schedule_es: [property({
      activity_type: "C",
      rent_income: 1000,
      expense_taxes: 2000,
    })],
  });
  assertStringIncludes(
    xml,
    "<RecnclForREProfessionalsAmt>-1000</RecnclForREProfessionalsAmt>",
  );
});

Deno.test("Schedule E rejects unresolved loss and expense limitations", () => {
  assertThrows(() =>
    scheduleE.build({
      schedule_es: [
        property({
          activity_type: "B",
          rent_income: 1000,
          expense_taxes: 2000,
        }),
      ],
    })
  );
  assertThrows(() =>
    scheduleE.build({
      schedule_es: [
        property({
          fair_rental_days: 200,
          personal_use_days: 20,
          rent_income: 1000,
          expense_taxes: 2000,
        }),
      ],
    })
  );
  assertThrows(() =>
    scheduleE.build({
      schedule_es: [
        property({ rent_income: 1000, prior_unallowed_passive_operating: 50 }),
      ],
    })
  );
  assertThrows(() =>
    scheduleE.build({
      schedule_es: [property({ personal_use_days: 5, expense_taxes: 100 })],
    })
  );
  assertThrows(() =>
    scheduleE.build({
      schedule_es: [property({ rent_income: 1000, street_address: undefined })],
    })
  );
});
