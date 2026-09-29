import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus as HeaderFilingStatus } from "../../../mef/header.ts";
import { FilingStatus as NodeFilingStatus } from "../../../nodes/types.ts";
import { form8995a } from "./f8995a.ts";

const filer = {
  primarySSN: "123456789",
  nameLine1: "SMITH JOHN A",
  nameControl: "SMIT",
  address: { line1: "1 MAIN ST", city: "AUSTIN", state: "TX", zip: "78701" },
  filingStatus: HeaderFilingStatus.Single,
};

const oneBusiness = {
  filing_status: NodeFilingStatus.Single,
  taxable_income: 300_000,
  net_capital_gain: 0,
  qbi: 100_000,
  w2_wages: 20_000,
  unadjusted_basis: 200_000,
  business_filing_details: {
    business_name: "Smith Design LLC",
    ein: "123456789",
    business_qbi: 100_000,
    business_w2_wages: 20_000,
    business_ubia: 200_000,
    one_non_sstb_business_confirmed: true as const,
    no_aggregation_confirmed: true as const,
    no_reit_ptp_or_loss_carryforward_confirmed: true as const,
    qualified_dividends_zero_confirmed: true as const,
    qbi_wages_ubia_sources_confirmed: true as const,
    taxable_income_before_qbi_confirmed: true as const,
  },
};

const context = {
  filer,
  pending: { f1040: { line13_qbi_deduction: 10_000 } },
};

Deno.test("Form 8995-A: absent pending produces no document", () => {
  assertEquals(form8995a.build([]), "");
});

Deno.test("Form 8995-A: one identified business emits native row and Part IV in XSD order", () => {
  const xml = form8995a.build(oneBusiness, context);
  assertStringIncludes(xml, "<IRS8995A><QBIDeductionInformationGrp>");
  assertStringIncludes(
    xml,
    "<TradeOrBusinessName><BusinessNameLine1Txt>Smith Design LLC</BusinessNameLine1Txt></TradeOrBusinessName><EIN>123456789</EIN>",
  );
  assertStringIncludes(
    xml,
    "<QualifiedBusinessIncomeAmt>100000</QualifiedBusinessIncomeAmt>",
  );
  assertStringIncludes(
    xml,
    "<QlfyBusinessIncome20PctAmt>20000</QlfyBusinessIncome20PctAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllocableShareW2WagesAmt>20000</AllocableShareW2WagesAmt>",
  );
  assertStringIncludes(
    xml,
    "<AllocableShareUBIAQlfyPropAmt>200000</AllocableShareUBIAQlfyPropAmt>",
  );
  assertStringIncludes(
    xml,
    "<GrtrAllcblShrW2WageQlfyPropAmt>10000</GrtrAllcblShrW2WageQlfyPropAmt>",
  );
  assertStringIncludes(
    xml,
    "<QBIComponentAmt>10000</QBIComponentAmt></QBIDeductionInformationGrp><TotalQBIComponentAmt>10000</TotalQBIComponentAmt>",
  );
  assertStringIncludes(
    xml,
    "<TaxableIncomeBeforeQBIDedAmt>300000</TaxableIncomeBeforeQBIDedAmt>",
  );
  assertStringIncludes(xml, "<NetCapitalGainAmt>0</NetCapitalGainAmt>");
  assertStringIncludes(
    xml,
    "<QualifiedBusinessIncomeDedAmt>10000</QualifiedBusinessIncomeDedAmt>",
  );
  assertEquals(xml.includes("<TaxableIncomeAmt>"), false);
  assertEquals(xml.includes("<PhaseInPct>"), false);
});

Deno.test("Form 8995-A: aggregate-only legacy shape and explicit empty record reject", () => {
  assertThrows(
    () => form8995a.build({} as typeof oneBusiness),
    Error,
    "empty pending record",
  );
  const legacy: unknown = { qbi: 75_000 };
  assertThrows(
    () =>
      form8995a.build(legacy as Parameters<typeof form8995a.build>[0], context),
  );
});

Deno.test("Form 8995-A: missing business identity or lower income rejects", () => {
  assertThrows(
    () =>
      form8995a.build(
        { ...oneBusiness, business_filing_details: undefined },
        context,
      ),
    Error,
    "per-business QBI source details",
  );
  assertThrows(
    () => form8995a.build({ ...oneBusiness, taxable_income: 230_000 }, context),
    Error,
    "fully above",
  );
  assertThrows(
    () => form8995a.build({ ...oneBusiness, qbi: 99_000 }, context),
    Error,
    "matching whole-dollar per-business QBI",
  );
});

Deno.test("Form 8995-A: SSTB, gain, REIT, and aggregation paths reject", () => {
  assertThrows(
    () => form8995a.build({ ...oneBusiness, sstb_qbi: 10_000 }, context),
    Error,
    "SSTB",
  );
  assertThrows(
    () => form8995a.build({ ...oneBusiness, net_capital_gain: 1_000 }, context),
    Error,
    "capital-gain",
  );
  assertThrows(
    () =>
      form8995a.build(
        { ...oneBusiness, line6_sec199a_dividends: 100 },
        context,
      ),
    Error,
    "REIT/PTP",
  );
  assertThrows(
    () =>
      form8995a.build({
        ...oneBusiness,
        aggregation_groups: [{
          group_name: "Combined",
          business_names: ["Smith Design LLC"],
          combined_for_limitation: true,
        }],
      }, context),
    Error,
    "aggregation",
  );
  assertThrows(
    () =>
      form8995a.build(
        { ...oneBusiness, patron_of_specified_cooperative: true },
        context,
      ),
    Error,
    "Schedule D cooperative and 1099-PATR source details",
  );
});

Deno.test("Form 8995-A: Form 1040 mismatch and concurrent Form 8995 reject", () => {
  assertThrows(
    () =>
      form8995a.build(oneBusiness, {
        filer,
        pending: { f1040: { line13_qbi_deduction: 9_999 } },
      }),
    Error,
    "Form 1040 line 13",
  );
  assertThrows(
    () =>
      form8995a.build(oneBusiness, {
        filer,
        pending: {
          f1040: { line13_qbi_deduction: 10_000 },
          form8995: { qbi: 1 },
        },
      }),
    Error,
    "cannot both be pending",
  );
});

Deno.test("Form 8995-A: fractional source that XML would round rejects", () => {
  assertThrows(
    () =>
      form8995a.build({
        ...oneBusiness,
        w2_wages: 20_001,
        business_filing_details: {
          ...oneBusiness.business_filing_details,
          business_w2_wages: 20_001,
        },
      }, context),
    Error,
    "whole-dollar calculated",
  );
});
