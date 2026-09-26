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

Deno.test("Form 4972 refuses to guess which recipient owns the distribution", () => {
  assertThrows(
    () => form4972.build({ ...qualified, line7: 2_000 }, { filer }),
    Error,
    "requires the recipient",
  );
});
