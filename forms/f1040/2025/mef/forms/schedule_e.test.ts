import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { itemSchema } from "../../../nodes/inputs/schedule_e/index.ts";
import { buildMefBundle, buildMefXml } from "../builder.ts";
import { FilingStatus } from "../types.ts";
import { scheduleE } from "./schedule_e.ts";
import { SCHEDULE_E_TYPE8_STATEMENT_FILE } from "./schedule_e_type8_statement.ts";

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

Deno.test("Schedule E long type 8 description is preserved in a bundled statement", async () => {
  const description = "Detached mixed-use storage facility";
  const pending = {
    schedule_e: {
      schedule_es: [property({
        property_type: 8,
        property_type_other_desc: description,
        property_description: "Storage rental",
      })],
    },
  };
  const filer = {
    primarySSN: "123456789",
    fullName: "John A Smith",
    nameLine1: "SMITH JOHN A",
    nameControl: "SMIT",
    address: {
      line1: "123 MAIN ST",
      city: "SPRINGFIELD",
      state: "IL",
      zip: "62701",
    },
    filingStatus: FilingStatus.Single,
  };
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "needs its binary PDF attachment",
  );
  const bundle = await buildMefBundle(pending, { filer, attachments: [] });
  assertEquals(bundle.attachments.length, 1);
  assertEquals(bundle.attachments[0].fileName, SCHEDULE_E_TYPE8_STATEMENT_FILE);
  assertEquals(
    (await PDFDocument.load(bundle.attachments[0].bytes)).getPageCount(),
    1,
  );
  assertStringIncludes(
    bundle.xml,
    "<OtherPropertyTypeDesc>SEE ATTACHED</OtherPropertyTypeDesc>",
  );
  assertStringIncludes(
    bundle.xml,
    "<Desc>Schedule E Type 8 Property Descriptions</Desc>",
  );
  assertEquals(bundle.xml.includes(description), false);
});

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

Deno.test("Schedule E Part III matches a trust K-1 box 5 source", () => {
  const source = {
    estate_trust_name: "Family Trust",
    estate_trust_ein: "123456789",
    source_document_reference: "K1-2025-A",
    box5_other_portfolio: 750,
  };
  const row = {
    estate_trust_name: source.estate_trust_name,
    estate_trust_ein: source.estate_trust_ein,
    source_document_reference: source.source_document_reference,
    other_income: 750,
  };
  const xml = scheduleE.build({ estate_trust_rows: [row] }, {
    pending: {
      k1_trust: { k1_trusts: [source] },
      schedule1: { line5_schedule_e: 750 },
    },
  });
  assertStringIncludes(xml, "<EstateOrTrustEIN>123456789</EstateOrTrustEIN>");
  assertStringIncludes(xml, "<OtherIncomeAmt>750</OtherIncomeAmt>");
  assertStringIncludes(xml, "<TotalOtherIncomeAmt>750</TotalOtherIncomeAmt>");
  assertStringIncludes(
    xml,
    "<TotEstateAndTrustIncOrLossAmt>750</TotEstateAndTrustIncOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalSuppIncomeOrLossAmt>750</TotalSuppIncomeOrLossAmt>",
  );
  assertThrows(
    () =>
      scheduleE.build({ estate_trust_rows: [row] }, {
        pending: {
          k1_trust: { k1_trusts: [{ ...source, box5_other_portfolio: 751 }] },
          schedule1: { line5_schedule_e: 750 },
        },
      }),
    Error,
    "must match one",
  );
  assertThrows(
    () =>
      scheduleE.build({ estate_trust_rows: [row] }, {
        pending: {
          k1_trust: { k1_trusts: [source] },
          schedule1: { line5_schedule_e: 751 },
        },
      }),
    Error,
    "finalized Schedule 1 line 5",
  );
});

Deno.test("Schedule E Part III carries sourced passive trust income", () => {
  const source = {
    estate_trust_name: "Family Trust",
    estate_trust_ein: "123456789",
    source_document_reference: "K1-2025-A",
    box6_ordinary_business: 300,
    box7_rental_real_estate: 200,
    box8_other_rental: 100,
    box6_8_activity_statement: [
      {
        box: "6",
        activity_name: "Shop",
        statement_reference: "A-6",
        income: 300,
      },
      {
        box: "7",
        activity_name: "House",
        statement_reference: "A-7",
        income: 200,
      },
      {
        box: "8",
        activity_name: "Equipment",
        statement_reference: "A-8",
        income: 100,
      },
    ],
  };
  const row = {
    estate_trust_name: "Family Trust",
    estate_trust_ein: "123456789",
    source_document_reference: "K1-2025-A",
    passive_income: 600,
  };
  const xml = scheduleE.build({ estate_trust_rows: [row] }, {
    pending: {
      k1_trust: { k1_trusts: [source] },
      schedule1: { line5_schedule_e: 600 },
    },
  });
  assertStringIncludes(
    xml,
    "<EstateAndTrustPassiveIncomeAmt>600</EstateAndTrustPassiveIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<EstateAndTrustTotPssvIncmAmt>600</EstateAndTrustTotPssvIncmAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalSuppIncomeOrLossAmt>600</TotalSuppIncomeOrLossAmt>",
  );
});

Deno.test("Schedule E combines passive and other income from one trust once", () => {
  const source = {
    estate_trust_name: "Family Trust",
    estate_trust_ein: "123456789",
    source_document_reference: "K1-2025-A",
    box5_other_portfolio: 750,
    box6_ordinary_business: 600,
    box6_8_activity_statement: [{
      box: "6",
      activity_name: "Shop",
      statement_reference: "A-6",
      income: 600,
    }],
  };
  const xml = scheduleE.build({
    estate_trust_rows: [{
      estate_trust_name: "Family Trust",
      estate_trust_ein: "123456789",
      source_document_reference: "K1-2025-A",
      other_income: 750,
      passive_income: 600,
    }],
  }, {
    pending: {
      k1_trust: { k1_trusts: [source] },
      schedule1: { line5_schedule_e: 1350 },
    },
  });
  assertStringIncludes(
    xml,
    "<EstateAndTrustTotPssvIncmAmt>600</EstateAndTrustTotPssvIncmAmt>",
  );
  assertStringIncludes(xml, "<TotalOtherIncomeAmt>750</TotalOtherIncomeAmt>");
  assertStringIncludes(
    xml,
    "<TotEstateAndTrustIncOrLossAmt>1350</TotEstateAndTrustIncOrLossAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalSuppIncomeOrLossAmt>1350</TotalSuppIncomeOrLossAmt>",
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
  }, {
    pending: {
      f4835: {
        f4835s: [{
          activity_name: "Farm",
          livestock_crop_income: 5000,
          expense_feed: 2000,
        }],
      },
    },
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
