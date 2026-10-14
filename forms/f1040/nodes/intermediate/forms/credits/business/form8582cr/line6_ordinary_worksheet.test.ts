import { assertEquals, assertThrows } from "@std/assert";
import { ordinaryTax2025 } from "../../../../worksheets/taxes/calculation/tax_table_2025.ts";
import { FilingStatus } from "../../../../../types.ts";
import {
  PassiveCreditCategory,
  PassiveCreditReportingRoute,
  PassiveCreditSourceOrigin,
} from "./index.ts";
import { calculateForm8582CRLine6OrdinaryWorksheet } from "./line6_ordinary_worksheet.ts";

const netPassive = 20_000;
const taxable = 104_250;
const taxAll = ordinaryTax2025(taxable, FilingStatus.Single);
const taxWithout = ordinaryTax2025(taxable - netPassive, FilingStatus.Single);
const sourceReference = "reviewed 2025 rental income ledger";
const worksheet = {
  tax_year: 2025,
  tax_method: "ordinary",
  activity_id: "rental-1",
  passive_income_source_document_reference: sourceReference,
  net_passive_income: netPassive,
  taxable_income_including_passive: taxable,
  taxable_income_without_passive: taxable - netPassive,
  tax_including_passive: taxAll,
  tax_without_passive: taxWithout,
};
const scheduleE = {
  schedule_es: [{
    tsj: "T",
    activity_id: "rental-1",
    passive_income_source_document_reference: sourceReference,
    property_description: "Rental property",
    property_type: 1,
    activity_type: "B",
    fair_rental_days: 365,
    personal_use_days: 0,
    rent_income: netPassive,
    form_1099_payments_made: false,
  }],
};
const form8582cr = {
  credit_sources: [{
    activity_reference: "credit-investment-1",
    source_form: "Form 8874",
    source_origin: { kind: PassiveCreditSourceOrigin.Self },
    source_document_reference: "2025 credit investment record",
    category: PassiveCreditCategory.Other,
    reporting_route: PassiveCreditReportingRoute.Form3800Line3,
    form3800_credit_line: "1i",
    current_year_credit: 500,
    prior_unallowed_credits: [],
    publicly_traded_partnership: false,
  }],
  regular_tax_all_income: taxAll,
  regular_tax_without_passive: taxWithout,
};
const form1040 = {
  line1z_total_wages: 100_000,
  line8_additional_income: netPassive,
  line9_total_income: 120_000,
  line11_agi: 120_000,
  line14_deductions_qbi_total: 15_750,
  line15_taxable_income: taxable,
  line16_income_tax: taxAll,
};
const schedule1 = {
  line5_schedule_e: netPassive,
  line10_total_additional_income: netPassive,
};
const general = { filing_status: FilingStatus.Single };

Deno.test("Form 8582-CR candidate line 6 recomputes both ordinary-tax sides from sourced passive income and final return", () => {
  const result = calculateForm8582CRLine6OrdinaryWorksheet(
    worksheet,
    scheduleE,
    form8582cr,
    form1040,
    schedule1,
    general,
    undefined,
  );
  assertEquals(result.line6, taxAll - taxWithout);
  assertEquals(result.activity_id, "rental-1");
  assertEquals(result.tax_without_passive, taxWithout);
});

Deno.test("Form 8582-CR line 6 candidate rejects source and final-tax tampering", () => {
  assertThrows(
    () =>
      calculateForm8582CRLine6OrdinaryWorksheet(
        worksheet,
        {
          schedule_es: [{
            ...scheduleE.schedule_es[0],
            passive_income_source_document_reference: "different ledger",
          }],
        },
        form8582cr,
        form1040,
        schedule1,
        general,
        undefined,
      ),
    Error,
    "a complete sourced passive Schedule E income inventory",
  );
  assertThrows(
    () =>
      calculateForm8582CRLine6OrdinaryWorksheet(
        { ...worksheet, tax_without_passive: taxWithout + 1 },
        scheduleE,
        form8582cr,
        form1040,
        schedule1,
        general,
        undefined,
      ),
    Error,
    "finalized Form 1040 ordinary-tax method",
  );
  assertThrows(
    () =>
      calculateForm8582CRLine6OrdinaryWorksheet(
        worksheet,
        scheduleE,
        form8582cr,
        { ...form1040, line16_income_tax: taxAll + 1 },
        schedule1,
        general,
        undefined,
      ),
    Error,
    "finalized Form 1040 ordinary-tax method",
  );
});

Deno.test("Form 8582-CR line 6 binds every rental amount and owner independent of ordering", () => {
  const rentals = [
    { ...scheduleE.schedule_es[0], rent_income: 12000 },
    {
      ...scheduleE.schedule_es[0],
      tsj: "T",
      activity_id: "rental-2",
      rent_income: 8000,
    },
  ];
  const {
    activity_id: _activity,
    passive_income_source_document_reference: _reference,
    ...taxSides
  } = worksheet;
  const review = {
    ...taxSides,
    passive_income_sources: rentals.map((r) => ({
      activity_id: r.activity_id,
      passive_income_source_document_reference:
        r.passive_income_source_document_reference,
      tsj: r.tsj,
      net_passive_income: r.rent_income,
    })).reverse(),
  };
  // A retained ledger may cover several activities; IDs, amounts and owners
  // distinguish those rows, so document references need not be unique.
  const run = (w: unknown, rows: unknown) =>
    calculateForm8582CRLine6OrdinaryWorksheet(
      w,
      { schedule_es: rows },
      form8582cr,
      form1040,
      schedule1,
      general,
      undefined,
    );
  assertEquals(run(review, rentals).line6, 4412);
  assertEquals(run(review, rentals.toReversed()).line6, 4412);
  const mutations: Array<(w: typeof review, r: typeof rentals) => void> = [
    (w) => {
      w.passive_income_sources[0].net_passive_income++;
      w.passive_income_sources[1].net_passive_income--;
    },
    (w) => {
      w.passive_income_sources[0].activity_id =
        w.passive_income_sources[1].activity_id;
    },
    (w) => {
      w.passive_income_sources[0].tsj = "S";
    },
    (w) => {
      w.net_passive_income++;
    },
    (_w, r) => {
      r[1].rent_income = 0;
    },
    (_w, r) => {
      r[1].activity_type = "D";
    },
  ];
  for (const mutate of mutations) {
    const changedReview = structuredClone(review),
      changedRentals = structuredClone(rentals);
    mutate(changedReview, changedRentals);
    assertThrows(() => run(changedReview, changedRentals));
  }
  assertThrows(() => run({ ...worksheet, ...review }, rentals));
  assertThrows(() => run({ ...review, passive_income_sources: [] }, rentals));
});
