import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildMefXml } from "./builder.ts";
import type { FilerIdentity } from "./types.ts";

function sampleFiler(): FilerIdentity {
  return {
    primarySSN: "123456789",
    nameLine1: "SMITH JOHN A",
    nameControl: "SMIT",
    address: { line1: "123 MAIN ST", city: "SPRINGFIELD", state: "IL", zip: "62701" },
    filingStatus: 1,
  };
}

function assertNotIncludes(actual: string, expected: string) {
  assertEquals(actual.includes(expected), false, `Expected NOT to include: ${expected}`);
}

// ─── 1. Root element ──────────────────────────────────────────────────────────

Deno.test("root element tag", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, "<Return");
});

Deno.test("root returnVersion attribute", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, 'returnVersion="2025v3.0"');
});

Deno.test("root xmlns attribute", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, 'xmlns="http://www.irs.gov/efile"');
});

Deno.test("root returnVersion appears before xmlns", () => {
  const xml = buildMefXml({});
  const rvIdx = xml.indexOf("returnVersion");
  const nsIdx = xml.indexOf("xmlns");
  assertEquals(rvIdx < nsIdx, true, "returnVersion must appear before xmlns in root element");
});

// ─── 2. ReturnHeader always present ──────────────────────────────────────────

Deno.test("ReturnHeader present", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, "<ReturnHeader");
});

Deno.test("ReturnType is 1040", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, "<ReturnType>1040</ReturnType>");
});

Deno.test("TaxPeriodBeginDate is 2025-01-01", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, "<TaxPeriodBeginDate>2025-01-01</TaxPeriodBeginDate>");
});

Deno.test("TaxPeriodEndDate is 2025-12-31", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, "<TaxPeriodEndDate>2025-12-31</TaxPeriodEndDate>");
});

// ─── 3. ReturnData always present ─────────────────────────────────────────────

Deno.test("ReturnData present when pending is empty", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, "<ReturnData");
});

Deno.test("ReturnData present when only f1040 has data", () => {
  const xml = buildMefXml({ f1040: { line1a_wages: 50000 } });
  assertStringIncludes(xml, "<ReturnData");
});

Deno.test("ReturnData present when both forms have data", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule1: { line7_unemployment: 4800 },
  });
  assertStringIncludes(xml, "<ReturnData");
});

// ─── 4. documentCnt — empty / zero cases ──────────────────────────────────────

Deno.test("documentCnt=0 when pending is empty", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, 'documentCnt="0"');
});

Deno.test("documentCnt=0 when f1040 has only unknown keys", () => {
  const xml = buildMefXml({ f1040: { junk: 999 } });
  assertStringIncludes(xml, 'documentCnt="0"');
});

Deno.test("documentCnt=0 when schedule1 has only unknown keys", () => {
  const xml = buildMefXml({ schedule1: { junk: 999 } });
  assertStringIncludes(xml, 'documentCnt="0"');
});

// ─── 5. documentCnt — only f1040 ─────────────────────────────────────────────

Deno.test("documentCnt=1 when only f1040 has data", () => {
  const xml = buildMefXml({ f1040: { line1a_wages: 50000 } });
  assertStringIncludes(xml, 'documentCnt="1"');
});

// ─── 6. documentCnt — only schedule1 ─────────────────────────────────────────

Deno.test("documentCnt=1 when only schedule1 has data", () => {
  const xml = buildMefXml({ schedule1: { line7_unemployment: 4800 } });
  assertStringIncludes(xml, 'documentCnt="1"');
});

// ─── 7. documentCnt — both forms ─────────────────────────────────────────────

Deno.test("documentCnt=2 when both f1040 and schedule1 have data", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule1: { line7_unemployment: 4800 },
  });
  assertStringIncludes(xml, 'documentCnt="2"');
});

// ─── 8. f1040 routing ─────────────────────────────────────────────────────────

Deno.test("IRS1040 present when f1040 has data", () => {
  const xml = buildMefXml({ f1040: { line1a_wages: 50000 } });
  assertStringIncludes(xml, "<IRS1040>");
});

Deno.test("IRS1040 absent when f1040 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1040>");
});

Deno.test("IRS1040 absent when f1040 has only unknown keys", () => {
  const xml = buildMefXml({ f1040: { junk: 999 } });
  assertNotIncludes(xml, "<IRS1040>");
});

// ─── 9. schedule1 routing ─────────────────────────────────────────────────────

Deno.test("IRS1040Schedule1 present when schedule1 has data", () => {
  const xml = buildMefXml({ schedule1: { line7_unemployment: 4800 } });
  assertStringIncludes(xml, "<IRS1040Schedule1>");
});

Deno.test("IRS1040Schedule1 absent when schedule1 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1040Schedule1>");
});

Deno.test("IRS1040Schedule1 absent when schedule1 has only unknown keys", () => {
  const xml = buildMefXml({ schedule1: { junk: 999 } });
  assertNotIncludes(xml, "<IRS1040Schedule1>");
});

// ─── 10. Form order ───────────────────────────────────────────────────────────

Deno.test("IRS1040 appears before IRS1040Schedule1 when both present", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule1: { line7_unemployment: 4800 },
  });
  const f1040Idx = xml.indexOf("<IRS1040>");
  const sched1Idx = xml.indexOf("<IRS1040Schedule1>");
  assertEquals(
    f1040Idx < sched1Idx,
    true,
    "IRS1040 must appear before IRS1040Schedule1 in output",
  );
});

// ─── 11. Filer absent ─────────────────────────────────────────────────────────

Deno.test("no Filer block when filer undefined", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<Filer>");
});

Deno.test("no FilingStatusCd when filer undefined", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<FilingStatusCd>");
});

// ─── 12. Filer present ────────────────────────────────────────────────────────

Deno.test("Filer block present when filer provided", () => {
  const xml = buildMefXml({}, sampleFiler());
  assertStringIncludes(xml, "<Filer>");
});

Deno.test("FilingStatusCd present when filer provided", () => {
  const xml = buildMefXml({}, sampleFiler());
  assertStringIncludes(xml, "<FilingStatusCd>1</FilingStatusCd>");
});

// ─── 13. No XML declaration ───────────────────────────────────────────────────

Deno.test("no XML declaration in output", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<?xml");
});

Deno.test("output starts with Return element not XML declaration", () => {
  const xml = buildMefXml({});
  const trimmed = xml.trimStart();
  assertEquals(trimmed.startsWith("<Return"), true, "Output must start with <Return");
});

// ─── 14. f1040 field pass-through ─────────────────────────────────────────────

Deno.test("f1040 WagesAmt value appears in output", () => {
  const xml = buildMefXml({ f1040: { line1a_wages: 72500 } });
  assertStringIncludes(xml, "<WagesAmt>72500</WagesAmt>");
});

Deno.test("f1040 QualifiedDividendsAmt value appears in output", () => {
  const xml = buildMefXml({ f1040: { line3a_qualified_dividends: 1500 } });
  assertStringIncludes(xml, "<QualifiedDividendsAmt>1500</QualifiedDividendsAmt>");
});

// ─── 15. schedule1 field pass-through ────────────────────────────────────────

Deno.test("schedule1 UnemploymentCompAmt value appears in output", () => {
  const xml = buildMefXml({ schedule1: { line7_unemployment: 4800 } });
  assertStringIncludes(xml, "<UnemploymentCompAmt>4800</UnemploymentCompAmt>");
});

Deno.test("schedule1 BusinessIncomeLossAmt negative value appears in output", () => {
  const xml = buildMefXml({ schedule1: { line3_schedule_c: -5000 } });
  assertStringIncludes(xml, "<BusinessIncomeLossAmt>-5000</BusinessIncomeLossAmt>");
});

// ─── 16. schedule2 routing ───────────────────────────────────────────────────

Deno.test("IRS1040Schedule2 present when schedule2 has data", () => {
  const xml = buildMefXml({ schedule2: { line1_amt: 5000 } });
  assertStringIncludes(xml, "<IRS1040Schedule2>");
});

Deno.test("IRS1040Schedule2 absent when schedule2 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1040Schedule2>");
});

Deno.test("IRS1040Schedule2 absent when schedule2 has only unknown keys", () => {
  const xml = buildMefXml({ schedule2: { junk: 999 } });
  assertNotIncludes(xml, "<IRS1040Schedule2>");
});

// ─── 17. schedule3 routing ───────────────────────────────────────────────────

Deno.test("IRS1040Schedule3 present when schedule3 has data", () => {
  const xml = buildMefXml({ schedule3: { line2_childcare_credit: 1200 } });
  assertStringIncludes(xml, "<IRS1040Schedule3>");
});

Deno.test("IRS1040Schedule3 absent when schedule3 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1040Schedule3>");
});

Deno.test("IRS1040Schedule3 absent when schedule3 has only unknown keys", () => {
  const xml = buildMefXml({ schedule3: { junk: 999 } });
  assertNotIncludes(xml, "<IRS1040Schedule3>");
});

// ─── 18. documentCnt with new forms ──────────────────────────────────────────

Deno.test("documentCnt=1 when only schedule2 has data", () => {
  const xml = buildMefXml({ schedule2: { line1_amt: 5000 } });
  assertStringIncludes(xml, 'documentCnt="1"');
});

Deno.test("documentCnt=1 when only schedule3 has data", () => {
  const xml = buildMefXml({ schedule3: { line2_childcare_credit: 1200 } });
  assertStringIncludes(xml, 'documentCnt="1"');
});

Deno.test("documentCnt=2 when f1040 + schedule2 have data", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule2: { line1_amt: 5000 },
  });
  assertStringIncludes(xml, 'documentCnt="2"');
});

Deno.test("documentCnt=3 when f1040 + schedule1 + schedule2 have data", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule1: { line7_unemployment: 4800 },
    schedule2: { line1_amt: 5000 },
  });
  assertStringIncludes(xml, 'documentCnt="3"');
});

Deno.test("documentCnt=4 when all four forms have data", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule1: { line7_unemployment: 4800 },
    schedule2: { line1_amt: 5000 },
    schedule3: { line2_childcare_credit: 1200 },
  });
  assertStringIncludes(xml, 'documentCnt="4"');
});

// ─── 19. Form order ───────────────────────────────────────────────────────────

Deno.test("IRS1040 appears before IRS1040Schedule2 when both present", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule2: { line1_amt: 5000 },
  });
  const f1040Idx = xml.indexOf("<IRS1040>");
  const sched2Idx = xml.indexOf("<IRS1040Schedule2>");
  assertEquals(
    f1040Idx < sched2Idx,
    true,
    "IRS1040 must appear before IRS1040Schedule2",
  );
});

Deno.test("IRS1040Schedule1 appears before IRS1040Schedule2 when both present", () => {
  const xml = buildMefXml({
    schedule1: { line7_unemployment: 4800 },
    schedule2: { line1_amt: 5000 },
  });
  const sched1Idx = xml.indexOf("<IRS1040Schedule1>");
  const sched2Idx = xml.indexOf("<IRS1040Schedule2>");
  assertEquals(
    sched1Idx < sched2Idx,
    true,
    "IRS1040Schedule1 must appear before IRS1040Schedule2",
  );
});

Deno.test("IRS1040Schedule2 appears before IRS1040Schedule3 when both present", () => {
  const xml = buildMefXml({
    schedule2: { line1_amt: 5000 },
    schedule3: { line2_childcare_credit: 1200 },
  });
  const sched2Idx = xml.indexOf("<IRS1040Schedule2>");
  const sched3Idx = xml.indexOf("<IRS1040Schedule3>");
  assertEquals(
    sched2Idx < sched3Idx,
    true,
    "IRS1040Schedule2 must appear before IRS1040Schedule3",
  );
});

// ─── 20. Field pass-through ───────────────────────────────────────────────────

Deno.test("schedule2 AlternativeMinimumTaxAmt value appears in assembled output", () => {
  const xml = buildMefXml({ schedule2: { line1_amt: 5000 } });
  assertStringIncludes(xml, "<AlternativeMinimumTaxAmt>5000</AlternativeMinimumTaxAmt>");
});

Deno.test("schedule3 CreditForChildAndDepdCareAmt value appears in assembled output", () => {
  const xml = buildMefXml({ schedule3: { line2_childcare_credit: 1200 } });
  assertStringIncludes(xml, "<CreditForChildAndDepdCareAmt>1200</CreditForChildAndDepdCareAmt>");
});

Deno.test("schedule2 aggregated UncollSSMedcrRRTAGrpInsTxAmt appears in assembled output", () => {
  const xml = buildMefXml({
    schedule2: { uncollected_fica: 3000, uncollected_fica_gtl: 500 },
  });
  assertStringIncludes(xml, "<UncollSSMedcrRRTAGrpInsTxAmt>3500</UncollSSMedcrRRTAGrpInsTxAmt>");
});

// ─── 21. New forms: routing ───────────────────────────────────────────────────

Deno.test("IRS1040ScheduleD present when schedule_d has data", () => {
  const xml = buildMefXml({ schedule_d: { line_4_other_st: 1000 } });
  assertStringIncludes(xml, "<IRS1040ScheduleD>");
});

Deno.test("IRS1040ScheduleD absent when schedule_d missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1040ScheduleD>");
});

Deno.test("IRS1040ScheduleD absent when schedule_d has only unknown keys", () => {
  const xml = buildMefXml({ schedule_d: { junk: 999 } });
  assertNotIncludes(xml, "<IRS1040ScheduleD>");
});

Deno.test("IRS8889 present when form8889 has data", () => {
  const xml = buildMefXml({ form8889: { taxpayer_hsa_contributions: 3600 } });
  assertStringIncludes(xml, "<IRS8889>");
});

Deno.test("IRS8889 absent when form8889 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8889>");
});

Deno.test("IRS2441 present when form2441 has data", () => {
  const xml = buildMefXml({ form2441: { dep_care_benefits: 5000 } });
  assertStringIncludes(xml, "<IRS2441>");
});

Deno.test("IRS2441 absent when form2441 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS2441>");
});

Deno.test("IRS8949 present when form8949 has transactions", () => {
  const xml = buildMefXml({
    form8949: [{
      part: "A",
      description: "AAPL",
      date_acquired: "2024-01-15",
      date_sold: "2025-06-01",
      proceeds: 5000,
      cost_basis: 3000,
      gain_loss: 2000,
      is_long_term: false,
    }],
  });
  assertStringIncludes(xml, "<IRS8949>");
});

Deno.test("IRS8949 absent when form8949 is empty array", () => {
  const xml = buildMefXml({ form8949: [] });
  assertNotIncludes(xml, "<IRS8949>");
});

Deno.test("IRS8949 absent when form8949 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8949>");
});

Deno.test("IRS8959 present when form8959 has data", () => {
  const xml = buildMefXml({ form8959: { medicare_wages: 250000 } });
  assertStringIncludes(xml, "<IRS8959>");
});

Deno.test("IRS8959 absent when form8959 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8959>");
});

Deno.test("IRS8960 present when form8960 has data", () => {
  const xml = buildMefXml({ form8960: { line1_taxable_interest: 1200 } });
  assertStringIncludes(xml, "<IRS8960>");
});

Deno.test("IRS8960 absent when form8960 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8960>");
});

// ─── 22. documentCnt with all 10 forms ───────────────────────────────────────

Deno.test("documentCnt=10 when all 10 forms have data", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule1: { line7_unemployment: 4800 },
    schedule2: { line1_amt: 5000 },
    schedule3: { line2_childcare_credit: 1200 },
    schedule_d: { line_4_other_st: 1000 },
    form8889: { taxpayer_hsa_contributions: 3600 },
    form2441: { dep_care_benefits: 5000 },
    form8949: [{
      part: "A",
      description: "AAPL",
      date_acquired: "2024-01-15",
      date_sold: "2025-06-01",
      proceeds: 5000,
      cost_basis: 3000,
      gain_loss: 2000,
      is_long_term: false,
    }],
    form8959: { medicare_wages: 250000 },
    form8960: { line1_taxable_interest: 1200 },
  });
  assertStringIncludes(xml, 'documentCnt="10"');
});

Deno.test("all 10 forms populated: XML contains all 10 document tags", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    schedule1: { line7_unemployment: 4800 },
    schedule2: { line1_amt: 5000 },
    schedule3: { line2_childcare_credit: 1200 },
    schedule_d: { line_4_other_st: 1000 },
    form8889: { taxpayer_hsa_contributions: 3600 },
    form2441: { dep_care_benefits: 5000 },
    form8949: [{
      part: "A",
      description: "AAPL",
      date_acquired: "2024-01-15",
      date_sold: "2025-06-01",
      proceeds: 5000,
      cost_basis: 3000,
      gain_loss: 2000,
      is_long_term: false,
    }],
    form8959: { medicare_wages: 250000 },
    form8960: { line1_taxable_interest: 1200 },
  });
  assertStringIncludes(xml, "<IRS1040>");
  assertStringIncludes(xml, "<IRS1040Schedule1>");
  assertStringIncludes(xml, "<IRS1040Schedule2>");
  assertStringIncludes(xml, "<IRS1040Schedule3>");
  assertStringIncludes(xml, "<IRS1040ScheduleD>");
  assertStringIncludes(xml, "<IRS8889>");
  assertStringIncludes(xml, "<IRS2441>");
  assertStringIncludes(xml, "<IRS8949>");
  assertStringIncludes(xml, "<IRS8959>");
  assertStringIncludes(xml, "<IRS8960>");
});

Deno.test("only f1040 and form8889 populated: documentCnt=2", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    form8889: { taxpayer_hsa_contributions: 3600 },
  });
  assertStringIncludes(xml, 'documentCnt="2"');
});

Deno.test("only f1040 and form8889 populated: only IRS1040 and IRS8889 present", () => {
  const xml = buildMefXml({
    f1040: { line1a_wages: 50000 },
    form8889: { taxpayer_hsa_contributions: 3600 },
  });
  assertStringIncludes(xml, "<IRS1040>");
  assertStringIncludes(xml, "<IRS8889>");
  assertNotIncludes(xml, "<IRS1040Schedule1>");
  assertNotIncludes(xml, "<IRS1040ScheduleD>");
  assertNotIncludes(xml, "<IRS8949>");
});

// ─── 23. New form field pass-through ──────────────────────────────────────────

Deno.test("schedule_d STGainOrLossFromFormsAmt value appears in assembled output", () => {
  const xml = buildMefXml({ schedule_d: { line_4_other_st: 1000 } });
  assertStringIncludes(xml, "<STGainOrLossFromFormsAmt>1000</STGainOrLossFromFormsAmt>");
});

Deno.test("form8889 HSAContributionAmt value appears in assembled output", () => {
  const xml = buildMefXml({ form8889: { taxpayer_hsa_contributions: 3600 } });
  assertStringIncludes(xml, "<HSAContributionAmt>3600</HSAContributionAmt>");
});

Deno.test("form2441 DependentCareBenefitsAmt value appears in assembled output", () => {
  const xml = buildMefXml({ form2441: { dep_care_benefits: 5000 } });
  assertStringIncludes(xml, "<DependentCareBenefitsAmt>5000</DependentCareBenefitsAmt>");
});

Deno.test("form8959 TotalW2MedicareWagesAndTipsAmt value appears in assembled output", () => {
  const xml = buildMefXml({ form8959: { medicare_wages: 250000 } });
  assertStringIncludes(xml, "<TotalW2MedicareWagesAndTipsAmt>250000</TotalW2MedicareWagesAndTipsAmt>");
});

Deno.test("form8960 TaxableInterestAmt value appears in assembled output", () => {
  const xml = buildMefXml({ form8960: { line1_taxable_interest: 1200 } });
  assertStringIncludes(xml, "<TaxableInterestAmt>1200</TaxableInterestAmt>");
});
