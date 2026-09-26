import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { buildMefXml } from "../builder.ts";
import { testFiler } from "../test-filer.ts";
import { form4835 } from "./f4835.ts";
import { scheduleE } from "./schedule_e.ts";

Deno.test("Form 4835 emits each paper line in TY2025 XSD order", () => {
  const [xml] = form4835.build({
    f4835s: [{
      activity_name: "Farm",
      ein: "123456789",
      actively_participated: true,
      livestock_crop_income: 10000,
      cooperative_distributions_gross: 1000,
      cooperative_distributions_taxable: 600,
      crop_insurance_disaster_received: 2000,
      crop_insurance_disaster_taxable: 1500,
      expense_feed: 1000,
      expense_other_details: [{ description: "Tolls", amount: 100 }],
      expense_capitalized_263a: 300,
    }],
  });
  assertStringIncludes(
    xml,
    "<GrossFarmRentalIncomeAmt>12100</GrossFarmRentalIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<OtherExpenseDetail><Desc>Capitalized expenses</Desc><Amt>-300</Amt></OtherExpenseDetail>",
  );
  assertStringIncludes(
    xml,
    "<Section263AIndicatorCd>263A</Section263AIndicatorCd>",
  );
  assertStringIncludes(xml, "<TotalExpensesAmt>800</TotalExpensesAmt>");
  assertStringIncludes(
    xml,
    "<NetFarmRentalIncomeOrLossAmt>11300</NetFarmRentalIncomeOrLossAmt>",
  );
  assertEquals(
    xml.indexOf("<EIN>") < xml.indexOf("<LivestockAndCropIncomeAmt>"),
    true,
  );
  assertEquals(
    xml.indexOf("<GrossFarmRentalIncomeAmt>") <
      xml.indexOf("<FeedPurchasedExpenseAmt>"),
    true,
  );
});

Deno.test("Form 4835 CCC election links its itemized loan statement", () => {
  const xml = buildMefXml({
    f4835: {
      f4835s: [{
        activity_name: "Farm",
        livestock_crop_income: 1_000,
        ccc_loans_reported_election: 4_000,
        ccc_loan_details: [
          { description: "Corn loan", amount: 2_500 },
          { description: "Wheat loan", amount: 1_500 },
        ],
      }],
    },
    schedule_e: { farm_rental_net: 5_000, farm_rental_gross: 5_000 },
  }, testFiler());
  assertStringIncludes(
    xml,
    '<CCCLoanReportedElectionAmt referenceDocumentId="CCCLoanDetailCashMethodStmt3" referenceDocumentName="CCCLoanDetailCashMethodStatement">4000</CCCLoanReportedElectionAmt>',
  );
  assertStringIncludes(
    xml,
    '<CCCLoanDetailCashMethodStmt documentId="CCCLoanDetailCashMethodStmt3">',
  );
  assertStringIncludes(
    xml,
    "<CCCLoanDetail><LoanDesc>Corn loan</LoanDesc><LoanAmt>2500</LoanAmt></CCCLoanDetail>",
  );
  assertStringIncludes(
    xml,
    "<CCCLoanDetail><LoanDesc>Wheat loan</LoanDesc><LoanAmt>1500</LoanAmt></CCCLoanDetail>",
  );
});

Deno.test("Form 4835 links separate CCC statements across farm activities", () => {
  const xml = buildMefXml({
    f4835: {
      f4835s: [
        {
          activity_name: "First",
          livestock_crop_income: 100,
          ccc_loans_reported_election: 200,
          ccc_loan_details: [{ description: "Corn", amount: 200 }],
        },
        { activity_name: "No election", livestock_crop_income: 300 },
        {
          activity_name: "Third",
          livestock_crop_income: 400,
          ccc_loans_reported_election: 500,
          ccc_loan_details: [{ description: "Wheat", amount: 500 }],
        },
      ],
    },
    schedule_e: { farm_rental_net: 1500, farm_rental_gross: 1500 },
  }, testFiler());
  const references = [
    ...xml.matchAll(
      /<CCCLoanReportedElectionAmt referenceDocumentId="([^"]+)"[^>]*>/g,
    ),
  ]
    .map((match) => match[1]);
  const statementIds = [
    ...xml.matchAll(/<CCCLoanDetailCashMethodStmt documentId="([^"]+)"/g),
  ]
    .map((match) => match[1]);
  assertEquals(references, statementIds);
  assertEquals(references.length, 2);
  assertStringIncludes(xml, "<LoanDesc>Corn</LoanDesc><LoanAmt>200</LoanAmt>");
  assertStringIncludes(xml, "<LoanDesc>Wheat</LoanDesc><LoanAmt>500</LoanAmt>");
});

Deno.test("Form 4835 links each farm's crop deferral to its own statement", () => {
  const deferral = (crop: string, amount: number) => ({
    activity_name: crop,
    livestock_crop_income: 0,
    defer_crop_insurance: true,
    crop_insurance_disaster_received: amount,
    crop_insurance_deferral_details: {
      cash_method: true as const,
      normal_practice_next_year_percent: 75,
      damaged_crops: [{ crop, damage_date: "2025-08-15", cause: "Hail" }],
      payments: [{
        crop,
        received_date: "2025-10-01",
        amount,
        carrier: "Farm Mutual",
      }],
    },
  });
  const xml = buildMefXml({
    f4835: {
      f4835s: [
        deferral("Corn", 200),
        { activity_name: "No deferral", livestock_crop_income: 100 },
        deferral("Wheat", 300),
      ],
    },
    schedule_e: { farm_rental_net: 100, farm_rental_gross: 100 },
  }, testFiler());
  const references = [
    ...xml.matchAll(
      /<ElectionDeferCropInsProcInd referenceDocumentId="([^"]+)"[^>]*>/g,
    ),
  ]
    .map((match) => match[1]);
  const statementIds = [
    ...xml.matchAll(/<PostponementCropInsDsstrStmt documentId="([^"]+)"/g),
  ]
    .map((match) => match[1]);
  assertEquals(references, statementIds);
  assertEquals(references.length, 2);
  assertStringIncludes(
    xml,
    "<DestroyedOrDamagedCropDsc>Corn</DestroyedOrDamagedCropDsc>",
  );
  assertStringIncludes(
    xml,
    "<DestroyedOrDamagedCropDsc>Wheat</DestroyedOrDamagedCropDsc>",
  );
});

Deno.test("Form 4835 loss cannot be filed without linked limitation forms", () => {
  assertThrows(() =>
    form4835.build({
      f4835s: [{
        activity_name: "Farm",
        livestock_crop_income: 500,
        expense_feed: 2000,
        some_investment_not_at_risk: false,
      }],
    })
  );
});

Deno.test("Form 4835 rejects unsupported elections and unchecked losses", () => {
  assertThrows(() =>
    form4835.build({
      f4835s: [{
        activity_name: "Farm",
        livestock_crop_income: 0,
        defer_crop_insurance: true,
      }],
    })
  );
  assertThrows(() =>
    form4835.build({
      f4835s: [{
        activity_name: "Farm",
        livestock_crop_income: 0,
        expense_feed: 1,
      }],
    })
  );
});

Deno.test("Schedule E includes farm rental lines 40, 41, and 42", () => {
  assertEquals(
    scheduleE.build({ farm_rental_net: 600, farm_rental_gross: 1000 }),
    "<IRS1040ScheduleE><NetFarmRentalIncomeOrLossAmt>600</NetFarmRentalIncomeOrLossAmt><TotalSuppIncomeOrLossAmt>600</TotalSuppIncomeOrLossAmt><FarmingAndFishingIncomeAmt>1000</FarmingAndFishingIncomeAmt></IRS1040ScheduleE>",
  );
  assertThrows(() => scheduleE.build({ farm_rental_net: 1 }));
  assertThrows(() =>
    scheduleE.build({ farm_rental_net: -600, farm_rental_gross: 500 })
  );
  assertThrows(() => scheduleE.build({ rental_income: 100 }));
});
