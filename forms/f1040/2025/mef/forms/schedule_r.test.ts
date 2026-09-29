import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../nodes/types.ts";
import { scheduleR } from "./schedule_r.ts";

const source = {
  filing_status: FilingStatus.Single,
  taxpayer_age_65_or_older: true,
  age_65_source_reference: "Taxpayer date of birth on ID",
  agi: 7_000,
  nontaxable_ssa: 0,
  nontaxable_pension: 0,
  nontaxable_va: 0,
};
const pending = {
  schedule_r: source,
  f1040: {
    filing_status: "single",
    line11_agi: 7_000,
    line18_total_tax_before_credits: 900,
    line20_nonrefundable_credits: 750,
  },
  schedule3: { line6d_elderly_disabled_credit: 750 },
};

Deno.test("Schedule R emits the bounded 65-plus single-taxpayer form", () => {
  const xml = scheduleR.build({}, { pending });
  assertStringIncludes(xml, "<Primary65OrOlderInd>X</Primary65OrOlderInd>");
  assertStringIncludes(xml, "<FilingStatusAmt>5000</FilingStatusAmt>");
  assertStringIncludes(xml, "<TaxReturnAGIAmt>7000</TaxReturnAGIAmt>");
  assertStringIncludes(
    xml,
    "<TotalTaxLessCreditsAmt>900</TotalTaxLessCreditsAmt>",
  );
  assertStringIncludes(
    xml,
    "<CreditForElderlyOrDisabledAmt>750</CreditForElderlyOrDisabledAmt>",
  );
  assertEquals(
    xml.indexOf("<Primary65OrOlderInd>") < xml.indexOf("<FilingStatusAmt>"),
    true,
  );
});

Deno.test("Schedule R rejects missing age evidence, wrong AGI, and a tax-limited credit", () => {
  assertThrows(
    () =>
      scheduleR.build({}, {
        pending: {
          ...pending,
          schedule_r: { ...source, age_65_source_reference: undefined },
        },
      }),
    Error,
    "sourced single-taxpayer",
  );
  assertThrows(
    () =>
      scheduleR.build({}, {
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line11_agi: 7_001 },
        },
      }),
    Error,
    "AGI/status",
  );
  assertThrows(
    () =>
      scheduleR.build({}, {
        pending: {
          ...pending,
          f1040: { ...pending.f1040, line18_total_tax_before_credits: 500 },
        },
      }),
    Error,
    "credit and tax limit",
  );
});

Deno.test("Schedule R leaves a zero-credit age-65 source unfiled", () => {
  assertEquals(
    scheduleR.build({}, {
      pending: {
        schedule_r: { ...source, agi: 20_000 },
      },
    }),
    "",
  );
});

Deno.test("Schedule R ties nontaxable Social Security to filed 1040 lines 6a and 6b", () => {
  const withBenefits = {
    ...pending,
    schedule_r: {
      ...source,
      nontaxable_ssa: 100,
      nontaxable_ssa_source_reference: "SSA-1099 benefit statement",
    },
    f1040: {
      ...pending.f1040,
      line6a_ss_gross: 300,
      line6b_ss_taxable: 200,
      line20_nonrefundable_credits: 735,
    },
    schedule3: { line6d_elderly_disabled_credit: 735 },
  };
  assertStringIncludes(
    scheduleR.build({}, { pending: withBenefits }),
    "<NontxSocSecAndRlrdBenefitsAmt>100</NontxSocSecAndRlrdBenefitsAmt>",
  );
  assertThrows(
    () =>
      scheduleR.build({}, {
        pending: {
          ...withBenefits,
          f1040: { ...withBenefits.f1040, line6b_ss_taxable: 201 },
        },
      }),
    Error,
    "must match finalized Form 1040 lines 6a and 6b",
  );
});
