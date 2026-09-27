import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { testFiler } from "../test-filer.ts";
import { form4137 } from "./f4137.ts";

const base = {
  forms: [{
    recipient: "taxpayer" as const,
    employers: [{
      name: "CAFE",
      ein: "12-3456789",
      tips_received: 5_000,
      tips_reported: 2_000,
    }],
    ss_wages_from_w2: 30_000,
  }],
};

Deno.test("Form 4137 emits no document without tip activity", () => {
  assertEquals(form4137.build({}, { filer: testFiler() }), []);
});

Deno.test("Form 4137 emits identity, employer detail and calculated lines in XSD order", () => {
  const [xml] = form4137.build(base, { filer: testFiler() });
  assertStringIncludes(xml, "<IRS4137><PersonNm>");
  assertStringIncludes(xml, "<SSN>123456789</SSN>");
  assertStringIncludes(
    xml,
    "<BusinessNameLine1Txt>CAFE</BusinessNameLine1Txt>",
  );
  assertStringIncludes(xml, "<EmployerEIN>123456789</EmployerEIN>");
  assertStringIncludes(
    xml,
    "<TotalTipsReceivedMinusRptAmt>3000</TotalTipsReceivedMinusRptAmt>",
  );
  assertStringIncludes(
    xml,
    "<SocialSecurityTaxTipAmt>186</SocialSecurityTaxTipAmt>",
  );
  assertStringIncludes(xml, "<MedicareTaxTipsAmt>44</MedicareTaxTipsAmt>");
  assertStringIncludes(
    xml,
    "<SocSecMedicareTaxUnrptdTipAmt>230</SocSecMedicareTaxUnrptdTipAmt>",
  );
});

Deno.test("Form 4137 supports applied-for EIN and Medicare-only government tips", () => {
  const [xml] = form4137.build({
    forms: [{
      recipient: "taxpayer",
      employers: [{
        name: "TOWN",
        applied_for_ein: true,
        tips_received: 1_000,
        tips_reported: 0,
      }],
      government_employee_tips: 1_000,
      ss_wages_from_w2: 0,
    }],
  }, { filer: testFiler() });
  assertStringIncludes(
    xml,
    "<AppliedForEINReasonCd>APPLIED FOR</AppliedForEINReasonCd>",
  );
  assertStringIncludes(xml, 'governmentEmployeeTipCd="1.45% TIPS"');
  assertStringIncludes(
    xml,
    "<SocialSecurityTaxTipAmt>0</SocialSecurityTaxTipAmt>",
  );
});

Deno.test("Form 4137 refuses allocated tips without employer detail", () => {
  assertThrows(
    () =>
      form4137.build({
        w2_tip_sources: [{
          allocated_tips: 500,
          ss_wages_and_tips: 30_000,
        }],
      }, { filer: testFiler() }),
    Error,
    "need employer tip records",
  );
});

Deno.test("Form 4137 refuses a spouse form without spouse identity", () => {
  assertThrows(
    () =>
      form4137.build({
        forms: [{
          ...base.forms[0],
          recipient: "spouse",
        }],
      }, { filer: testFiler() }),
    Error,
    "spouse name and SSN",
  );
});

Deno.test("Form 4137 emits separate taxpayer and spouse documents", () => {
  const filer = {
    ...testFiler(),
    filingStatus: FilingStatus.MarriedFilingJointly,
    spouse: {
      firstName: "Sam",
      lastName: "Tipster",
      ssn: "987654321",
      nameControl: "TIPS",
    },
  };
  const documents = form4137.build({
    forms: [
      base.forms[0],
      {
        recipient: "spouse",
        employers: [{
          name: "DINER",
          ein: "987654321",
          tips_received: 1_000,
          tips_reported: 0,
        }],
        ss_wages_from_w2: 176_100,
      },
    ],
  }, { filer });
  assertEquals(documents.length, 2);
  assertStringIncludes(documents[0], "<SSN>123456789</SSN>");
  assertStringIncludes(
    documents[0],
    "<SocSecMedicareTaxUnrptdTipAmt>230</SocSecMedicareTaxUnrptdTipAmt>",
  );
  assertStringIncludes(documents[1], "<PersonNm>Sam Tipster</PersonNm>");
  assertStringIncludes(documents[1], "<SSN>987654321</SSN>");
  assertStringIncludes(
    documents[1],
    "<SocSecMedicareTaxUnrptdTipAmt>15</SocSecMedicareTaxUnrptdTipAmt>",
  );
});
