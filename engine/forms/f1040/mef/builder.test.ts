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

// ─── 24. New forms (plans 11-01 through 11-05): routing ───────────────────────

Deno.test("IRS4137 present when form4137 has data", () => {
  const xml = buildMefXml({ form4137: { allocated_tips: 500 } });
  assertStringIncludes(xml, "<IRS4137>");
});

Deno.test("IRS4137 absent when form4137 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS4137>");
});

Deno.test("IRS8919 present when form8919 has data", () => {
  const xml = buildMefXml({ form8919: { wages: 45000 } });
  assertStringIncludes(xml, "<IRS8919>");
});

Deno.test("IRS8919 absent when form8919 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8919>");
});

Deno.test("IRS4972 present when form4972 has data", () => {
  const xml = buildMefXml({ form4972: { lump_sum_amount: 100000 } });
  assertStringIncludes(xml, "<IRS4972>");
});

Deno.test("IRS4972 absent when form4972 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS4972>");
});

Deno.test("IRS1040ScheduleSE present when schedule_se has data", () => {
  const xml = buildMefXml({ schedule_se: { net_profit_schedule_c: 30000 } });
  assertStringIncludes(xml, "<IRS1040ScheduleSE>");
});

Deno.test("IRS1040ScheduleSE absent when schedule_se missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1040ScheduleSE>");
});

Deno.test("IRS8606 present when form8606 has data", () => {
  const xml = buildMefXml({ form8606: { nondeductible_contributions: 6000 } });
  assertStringIncludes(xml, "<IRS8606>");
});

Deno.test("IRS8606 absent when form8606 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8606>");
});

Deno.test("IRS1116 present when form_1116 has data", () => {
  const xml = buildMefXml({ form_1116: { foreign_tax_paid: 800 } });
  assertStringIncludes(xml, "<IRS1116>");
});

Deno.test("IRS1116 absent when form_1116 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1116>");
});

Deno.test("IRS8582 present when form8582 has data", () => {
  const xml = buildMefXml({ form8582: { current_loss: 5000 } });
  assertStringIncludes(xml, "<IRS8582>");
});

Deno.test("IRS8582 absent when form8582 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8582>");
});

Deno.test("IRS1040ScheduleF present when schedule_f has data", () => {
  const xml = buildMefXml({ schedule_f: { crop_insurance: 2000 } });
  assertStringIncludes(xml, "<IRS1040ScheduleF>");
});

Deno.test("IRS1040ScheduleF absent when schedule_f missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1040ScheduleF>");
});

Deno.test("IRS1040ScheduleB present when schedule_b has data", () => {
  const xml = buildMefXml({ schedule_b: { taxable_interest_net: 1500 } });
  assertStringIncludes(xml, "<IRS1040ScheduleB>");
});

Deno.test("IRS1040ScheduleB absent when schedule_b missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS1040ScheduleB>");
});

Deno.test("IRS4797 present when form4797 has data", () => {
  const xml = buildMefXml({ form4797: { section_1231_gain: 12000 } });
  assertStringIncludes(xml, "<IRS4797>");
});

Deno.test("IRS4797 absent when form4797 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS4797>");
});

Deno.test("IRS8880 present when form8880 has data", () => {
  const xml = buildMefXml({ form8880: { ira_contributions_taxpayer: 3000 } });
  assertStringIncludes(xml, "<IRS8880>");
});

Deno.test("IRS8880 absent when form8880 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8880>");
});

Deno.test("IRS8995 present when form8995 has data", () => {
  const xml = buildMefXml({ form8995: { qbi: 50000 } });
  assertStringIncludes(xml, "<IRS8995>");
});

Deno.test("IRS8995 absent when form8995 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8995>");
});

Deno.test("IRS4562 present when form4562 has data", () => {
  const xml = buildMefXml({ form4562: { section_179_deduction: 10000 } });
  assertStringIncludes(xml, "<IRS4562>");
});

Deno.test("IRS4562 absent when form4562 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS4562>");
});

Deno.test("IRS8995A present when form8995a has data", () => {
  const xml = buildMefXml({ form8995a: { qbi: 75000 } });
  assertStringIncludes(xml, "<IRS8995A>");
});

Deno.test("IRS8995A absent when form8995a missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8995A>");
});

Deno.test("IRS6251 present when form6251 has data", () => {
  const xml = buildMefXml({ form6251: { regular_tax_income: 80000 } });
  assertStringIncludes(xml, "<IRS6251>");
});

Deno.test("IRS6251 absent when form6251 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS6251>");
});

Deno.test("IRS5329 present when form5329 has data", () => {
  const xml = buildMefXml({ form5329: { early_distribution: 5000 } });
  assertStringIncludes(xml, "<IRS5329>");
});

Deno.test("IRS5329 absent when form5329 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS5329>");
});

Deno.test("IRS8853 present when form8853 has data", () => {
  const xml = buildMefXml({ form8853: { employer_archer_msa: 3650 } });
  assertStringIncludes(xml, "<IRS8853>");
});

Deno.test("IRS8853 absent when form8853 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8853>");
});

Deno.test("IRS8829 present when form_8829 has data", () => {
  const xml = buildMefXml({ form_8829: { mortgage_interest: 12000 } });
  assertStringIncludes(xml, "<IRS8829>");
});

Deno.test("IRS8829 absent when form_8829 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8829>");
});

Deno.test("IRS8839 present when form8839 has data", () => {
  const xml = buildMefXml({ form8839: { adoption_benefits: 14890 } });
  assertStringIncludes(xml, "<IRS8839>");
});

Deno.test("IRS8839 absent when form8839 missing from pending", () => {
  const xml = buildMefXml({});
  assertNotIncludes(xml, "<IRS8839>");
});

// ─── 25. Full 29-form smoke test ──────────────────────────────────────────────

Deno.test("documentCnt=29 when all 29 forms have data", () => {
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
    form4137: { allocated_tips: 500 },
    form8919: { wages: 45000 },
    form4972: { lump_sum_amount: 100000 },
    schedule_se: { net_profit_schedule_c: 30000 },
    form8606: { nondeductible_contributions: 6000 },
    form_1116: { foreign_tax_paid: 800 },
    form8582: { current_loss: 5000 },
    schedule_f: { crop_insurance: 2000 },
    schedule_b: { taxable_interest_net: 1500 },
    form4797: { section_1231_gain: 12000 },
    form8880: { ira_contributions_taxpayer: 3000 },
    form8995: { qbi: 50000 },
    form4562: { section_179_deduction: 10000 },
    form8995a: { qbi: 75000 },
    form6251: { regular_tax_income: 80000 },
    form5329: { early_distribution: 5000 },
    form8853: { employer_archer_msa: 3650 },
    form_8829: { mortgage_interest: 12000 },
    form8839: { adoption_benefits: 14890 },
  });
  assertStringIncludes(xml, 'documentCnt="29"');
});

Deno.test("all 29 forms populated: XML contains all 29 document tags", () => {
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
    form4137: { allocated_tips: 500 },
    form8919: { wages: 45000 },
    form4972: { lump_sum_amount: 100000 },
    schedule_se: { net_profit_schedule_c: 30000 },
    form8606: { nondeductible_contributions: 6000 },
    form_1116: { foreign_tax_paid: 800 },
    form8582: { current_loss: 5000 },
    schedule_f: { crop_insurance: 2000 },
    schedule_b: { taxable_interest_net: 1500 },
    form4797: { section_1231_gain: 12000 },
    form8880: { ira_contributions_taxpayer: 3000 },
    form8995: { qbi: 50000 },
    form4562: { section_179_deduction: 10000 },
    form8995a: { qbi: 75000 },
    form6251: { regular_tax_income: 80000 },
    form5329: { early_distribution: 5000 },
    form8853: { employer_archer_msa: 3650 },
    form_8829: { mortgage_interest: 12000 },
    form8839: { adoption_benefits: 14890 },
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
  assertStringIncludes(xml, "<IRS4137>");
  assertStringIncludes(xml, "<IRS8919>");
  assertStringIncludes(xml, "<IRS4972>");
  assertStringIncludes(xml, "<IRS1040ScheduleSE>");
  assertStringIncludes(xml, "<IRS8606>");
  assertStringIncludes(xml, "<IRS1116>");
  assertStringIncludes(xml, "<IRS8582>");
  assertStringIncludes(xml, "<IRS1040ScheduleF>");
  assertStringIncludes(xml, "<IRS1040ScheduleB>");
  assertStringIncludes(xml, "<IRS4797>");
  assertStringIncludes(xml, "<IRS8880>");
  assertStringIncludes(xml, "<IRS8995>");
  assertStringIncludes(xml, "<IRS4562>");
  assertStringIncludes(xml, "<IRS8995A>");
  assertStringIncludes(xml, "<IRS6251>");
  assertStringIncludes(xml, "<IRS5329>");
  assertStringIncludes(xml, "<IRS8853>");
  assertStringIncludes(xml, "<IRS8829>");
  assertStringIncludes(xml, "<IRS8839>");
});

Deno.test("empty MefFormsPending: documentCnt=0, no new form tags present", () => {
  const xml = buildMefXml({});
  assertStringIncludes(xml, 'documentCnt="0"');
  assertNotIncludes(xml, "<IRS4137>");
  assertNotIncludes(xml, "<IRS8919>");
  assertNotIncludes(xml, "<IRS4972>");
  assertNotIncludes(xml, "<IRS1040ScheduleSE>");
  assertNotIncludes(xml, "<IRS8606>");
  assertNotIncludes(xml, "<IRS1116>");
  assertNotIncludes(xml, "<IRS8582>");
  assertNotIncludes(xml, "<IRS1040ScheduleF>");
  assertNotIncludes(xml, "<IRS1040ScheduleB>");
  assertNotIncludes(xml, "<IRS4797>");
  assertNotIncludes(xml, "<IRS8880>");
  assertNotIncludes(xml, "<IRS8995>");
  assertNotIncludes(xml, "<IRS4562>");
  assertNotIncludes(xml, "<IRS8995A>");
  assertNotIncludes(xml, "<IRS6251>");
  assertNotIncludes(xml, "<IRS5329>");
  assertNotIncludes(xml, "<IRS8853>");
  assertNotIncludes(xml, "<IRS8829>");
  assertNotIncludes(xml, "<IRS8839>");
});
