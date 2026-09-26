import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { scheduleH } from "./schedule_h.ts";

const filer: FilerIdentity = {
  primarySSN: "400001032",
  nameLine1: "BLACK TARA",
  nameControl: "BLAC",
  fullName: "Tara Black",
  address: {
    line1: "17 Lexington Drive",
    city: "Cincinnati",
    state: "OH",
    zip: "45223",
  },
  filingStatus: FilingStatus.Single,
};

Deno.test("Schedule H uses the form's required identity and line-level tax amounts", () => {
  const xml = scheduleH.build({
    employer_ein: "000000029",
    cash_wages_over_2025_limit: true,
    cash_wages_over_quarter_limit: false,
    ss_wages: 3_100,
    medicare_wages: 3_100,
    federal_income_tax_withheld: 0,
  }, { filer });
  assertStringIncludes(
    xml,
    "<HouseholdEmployerNm>Tara Black</HouseholdEmployerNm>",
  );
  assertStringIncludes(xml, "<EmployerEIN>000000029</EmployerEIN>");
  assertStringIncludes(xml, "<SocialSecurityTaxAmt>384</SocialSecurityTaxAmt>");
  assertStringIncludes(
    xml,
    "<MedicareTaxWithheldAmt>90</MedicareTaxWithheldAmt>",
  );
  assertStringIncludes(
    xml,
    "<CombinedFUTATaxPlusNetTaxesAmt>474</CombinedFUTATaxPlusNetTaxesAmt>",
  );
});

Deno.test("Schedule H reports Additional Medicare wage excess and withholding on lines 5 and 6", () => {
  const xml = scheduleH.build({
    employer_ein: "123456789",
    cash_wages_over_2025_limit: true,
    cash_wages_over_quarter_limit: false,
    ss_wages: 176_100,
    medicare_wages: 220_000,
    additional_medicare_wages: 20_000,
  }, { filer });
  assertStringIncludes(
    xml,
    "<TotMedcrTaxCashWagesAddnlWhAmt>20000</TotMedcrTaxCashWagesAddnlWhAmt>",
  );
  assertStringIncludes(
    xml,
    "<AddnlMedicareTaxWithholdingAmt>180</AddnlMedicareTaxWithholdingAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotSocSecMedcrAndFedIncmTaxAmt>28396</TotSocSecMedcrAndFedIncmTaxAmt>",
  );
});

Deno.test("Schedule H emits single-state Section A facts and computed FUTA", () => {
  const xml = scheduleH.build({
    employer_ein: "123456789",
    cash_wages_over_2025_limit: true,
    cash_wages_over_quarter_limit: true,
    ss_wages: 10_000,
    medicare_wages: 10_000,
    federal_unemployment: {
      paid_only_one_state: true,
      all_contributions_paid_on_time: true,
      all_futa_wages_state_taxable: true,
      state: "OH",
      contributions_paid: 100,
      taxable_wages: 7_000,
    },
  }, { filer });
  assertStringIncludes(
    xml,
    "<UnemplPaidOnlyOneStateInd>true</UnemplPaidOnlyOneStateInd>",
  );
  assertStringIncludes(xml, "<StateCd>OH</StateCd>");
  assertStringIncludes(xml, "<FUTATaxAmt>42</FUTATaxAmt>");
  assertStringIncludes(
    xml,
    "<CombinedFUTATaxPlusNetTaxesAmt>1572</CombinedFUTATaxPlusNetTaxesAmt>",
  );
});

Deno.test("Schedule H Section A identifies a state-granted zero experience rate", () => {
  const xml = scheduleH.build({
    employer_ein: "123456789",
    cash_wages_over_2025_limit: false,
    cash_wages_over_quarter_limit: true,
    federal_unemployment: {
      paid_only_one_state: true,
      all_contributions_paid_on_time: true,
      all_futa_wages_state_taxable: true,
      state: "OH",
      zero_experience_rate: true,
      taxable_wages: 7_000,
    },
  }, { filer });
  assertStringIncludes(
    xml,
    "<UnemploymentFundZeroRateCd>0% RATE</UnemploymentFundZeroRateCd>",
  );
  assertStringIncludes(xml, "<FUTATaxAmt>42</FUTATaxAmt>");
});

Deno.test("Schedule H Section B computes state-rate credit and CA credit reduction", () => {
  const xml = scheduleH.build({
    employer_ein: "123456789",
    cash_wages_over_2025_limit: false,
    cash_wages_over_quarter_limit: true,
    federal_unemployment: {
      paid_only_one_state: false,
      all_contributions_paid_on_time: true,
      all_futa_wages_state_taxable: true,
      taxable_futa_wages: 7_000,
      state_rows: [{
        state: "CA",
        taxable_state_wages: 7_000,
        experience_rate: 0.05,
        rate_period_from: "2025-01-01",
        rate_period_to: "2025-12-31",
        contributions_paid_by_due_date: 350,
      }],
      credit_reduction_wages: [{ state: "CA", taxable_futa_wages: 7_000 }],
    },
  }, { filer });
  assertStringIncludes(xml, "<UnemplFundMultiStateGroup>");
  assertStringIncludes(
    xml,
    "<UnemploymentTaxCrAt54RateAmt>378</UnemploymentTaxCrAt54RateAmt>",
  );
  assertStringIncludes(
    xml,
    "<UnemploymentAdditionalTaxCrAmt>28</UnemploymentAdditionalTaxCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<UnemplSmallerTaxAdjustmentAmt>294</UnemplSmallerTaxAdjustmentAmt>",
  );
  assertStringIncludes(xml, "<FUTATaxAmt>126</FUTATaxAmt>");
  assertStringIncludes(
    xml,
    "<CreditReductionStateWrkshtInd>X</CreditReductionStateWrkshtInd>",
  );
});

Deno.test("Schedule H Section B gives only 90 percent of the available late credit", () => {
  const xml = scheduleH.build({
    employer_ein: "123456789",
    cash_wages_over_2025_limit: false,
    cash_wages_over_quarter_limit: true,
    federal_unemployment: {
      paid_only_one_state: true,
      all_contributions_paid_on_time: false,
      all_futa_wages_state_taxable: true,
      taxable_futa_wages: 7_000,
      state_rows: [{
        state: "OH",
        taxable_state_wages: 7_000,
        experience_rate: 0.03,
        rate_period_from: "2025-01-01",
        rate_period_to: "2025-12-31",
        contributions_paid_by_due_date: 100,
      }],
      late_contributions: 278,
    },
  }, { filer });
  assertStringIncludes(
    xml,
    "<TentativeFUTACreditAmt>268</TentativeFUTACreditAmt>",
  );
  assertStringIncludes(
    xml,
    "<UnemplSmallerTaxAdjustmentAmt>367</UnemplSmallerTaxAdjustmentAmt>",
  );
  assertStringIncludes(xml, "<FUTATaxAmt>53</FUTATaxAmt>");
});

Deno.test("Schedule H does not infer required employer or unemployment facts", () => {
  assertEquals(scheduleH.build({}), "");
  const basic = {
    employer_ein: "000000029",
    cash_wages_over_2025_limit: true,
    ss_wages: 3_100,
    medicare_wages: 3_100,
  };
  assertThrows(() => scheduleH.build(basic), Error, "filer identity");
  assertThrows(
    () => scheduleH.build({ ...basic, employer_ein: undefined }, { filer }),
    Error,
    "employer EIN",
  );
  assertThrows(
    () =>
      scheduleH.build({ ...basic, cash_wages_over_2025_limit: undefined }, {
        filer,
      }),
    Error,
    "line A",
  );
  assertThrows(
    () => scheduleH.build(basic, { filer }),
    Error,
    "line 9",
  );
  assertThrows(
    () =>
      scheduleH.build({
        ...basic,
        cash_wages_over_2025_limit: false,
        cash_wages_over_quarter_limit: false,
      }, { filer }),
    Error,
    "conflict",
  );
  assertThrows(
    () =>
      scheduleH.build({ ...basic, cash_wages_over_quarter_limit: true }, {
        filer,
      }),
    Error,
    "Part II",
  );
  assertThrows(
    () =>
      scheduleH.build({
        ...basic,
        cash_wages_over_quarter_limit: false,
        futa_tax: 42,
      }, { filer }),
    Error,
    "futa_tax",
  );
});

Deno.test("Schedule H refuses contradictory Section B source facts", () => {
  const base = {
    employer_ein: "123456789",
    cash_wages_over_2025_limit: false,
    cash_wages_over_quarter_limit: true,
    federal_unemployment: {
      paid_only_one_state: false,
      all_contributions_paid_on_time: true,
      all_futa_wages_state_taxable: true,
      taxable_futa_wages: 7_000,
      state_rows: [{
        state: "CA",
        taxable_state_wages: 7_000,
        experience_rate: 0.05,
        rate_period_from: "2025-01-01",
        rate_period_to: "2025-12-31",
        contributions_paid_by_due_date: 350,
      }],
    },
  };
  assertThrows(
    () => scheduleH.build(base, { filer }),
    Error,
    "CA credit reduction FUTA wages",
  );
  assertThrows(
    () =>
      scheduleH.build({
        ...base,
        federal_unemployment: {
          ...base.federal_unemployment,
          credit_reduction_wages: [{
            state: "CA" as const,
            taxable_futa_wages: 7_000,
          }],
          late_contributions: 100,
        },
      }, { filer }),
    Error,
    "late contributions",
  );
  assertThrows(
    () =>
      scheduleH.build({
        ...base,
        federal_unemployment: {
          ...base.federal_unemployment,
          credit_reduction_wages: [{
            state: "CA" as const,
            taxable_futa_wages: 7_000,
          }],
          state_rows: [{
            ...base.federal_unemployment.state_rows[0],
            rate_period_to: "2025-02-30",
          }],
        },
      }, { filer }),
    Error,
    "Expected a valid ISO calendar date",
  );
});
