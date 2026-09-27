import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { TS } from "../../../nodes/types.ts";
import { form4972 } from "./f4972.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  fullName: "Alex Taxpayer",
  nameLine1: "TAXPAYER ALEX",
  nameControl: "TAXP",
  filingStatus: FilingStatus.MFJ,
  address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
  spouse: {
    ssn: "987654321",
    firstName: "Sam",
    lastName: "Taxpayer",
    nameControl: "TAXP",
  },
};

const qualified = {
  born_before_1936: true,
  entire_balance_distributed: true,
  rolled_over_any: false,
  beneficiary_distribution: false,
  participant_five_year_member: true,
  prior_election_after_1986: false,
};

Deno.test("Form 4972 emits no XML for source facts without calculated form lines", () => {
  assertEquals(form4972.build({ lump_sum_amount: 100_000 }), "");
});

Deno.test("Form 4972 emits recipient identity and the 2025 Part II element names", () => {
  const xml = form4972.build(
    { ...qualified, recipient: TS.T, line6: 10_000, line7: 2_000 },
    { filer },
  );
  assertStringIncludes(xml, "<PersonNm>Alex Taxpayer</PersonNm>");
  assertStringIncludes(xml, "<SSN>123456789</SSN>");
  assertStringIncludes(
    xml,
    "<CapitalGainElectionAmt>10000</CapitalGainElectionAmt>",
  );
  assertStringIncludes(
    xml,
    "<CapitalGainTimesElectionPctAmt>2000</CapitalGainTimesElectionPctAmt>",
  );
  assertEquals(xml.includes("<LumpSumDistriAmt>"), false);
});

Deno.test("Form 4972 spouse recipient is distinct from the taxpayer", () => {
  const xml = form4972.build(
    {
      ...qualified,
      recipient: TS.S,
      line8: 90_000,
      line29: 12_705,
      line30: 14_705,
    },
    { filer },
  );
  assertStringIncludes(xml, "<PersonNm>Sam Taxpayer</PersonNm>");
  assertStringIncludes(xml, "<SSN>987654321</SSN>");
  assertStringIncludes(
    xml,
    "<LumpSumDistriOrdinaryIncmAmt>90000</LumpSumDistriOrdinaryIncmAmt>",
  );
  assertStringIncludes(
    xml,
    "<LumpSumDistributionTaxAmt>14705</LumpSumDistributionTaxAmt>",
  );
});

Deno.test("Form 4972 MeF keeps own-plan and beneficiary prior elections separate", () => {
  const xml = form4972.build(
    {
      ...qualified,
      recipient: TS.T,
      beneficiary_distribution: true,
      participant_five_year_member: false,
      prior_election_after_1986: true,
      prior_beneficiary_election_after_1986: false,
      line8: 10_000,
      line29: 550,
      line30: 550,
    },
    { filer },
  );
  assertStringIncludes(
    xml,
    "<PriorYearDistributionInd>true</PriorYearDistributionInd>",
  );
  assertStringIncludes(
    xml,
    "<BeneficiaryDistributionInd>false</BeneficiaryDistributionInd>",
  );
});

Deno.test("Form 4972 writes elected NUA amounts on lines 6 and 8", () => {
  const xml = form4972.build(
    {
      ...qualified,
      recipient: TS.T,
      line6: 36_000,
      line6_nua_capital_gain: 6_000,
      line7: 7_200,
      line8: 84_000,
      line8_nua_included: 14_000,
      line30: 20_000,
    },
    { filer },
  );
  assertStringIncludes(
    xml,
    '<CapitalGainElectionAmt capitalGainElectionNUAAmt="6000" capitalGainElectionNUACd="NUA">36000</CapitalGainElectionAmt>',
  );
  assertStringIncludes(
    xml,
    '<LumpSumDistriOrdinaryIncmAmt netUnrealizedAppreciationAmt="14000" netUnrealizedAppreciationCd="NUA">84000</LumpSumDistriOrdinaryIncmAmt>',
  );
});

Deno.test("Form 4972 rejects NUA attributes without their form lines", () => {
  assertThrows(
    () =>
      form4972.build(
        { ...qualified, recipient: TS.T, line7: 1, line6_nua_capital_gain: 1 },
        { filer },
      ),
    Error,
    "capital NUA needs line 6",
  );
});

Deno.test("Form 4972 refuses to guess which recipient owns the distribution", () => {
  assertThrows(
    () => form4972.build({ ...qualified, line7: 2_000 }, { filer }),
    Error,
    "requires the recipient",
  );
});
