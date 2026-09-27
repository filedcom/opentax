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
  w2_tip_sources: [{
    employer_name: "CAFE",
    employer_ein: "12-3456789",
    allocated_tips: 0,
    ss_wages_and_tips: 30_000,
  }],
};
const baseW2 = {
  employer_name: "CAFE",
  employer_ein: "12-3456789",
  box1_wages: 30_000,
  box2_fed_withheld: 0,
  box3_ss_wages: 30_000,
};

Deno.test("Form 4137 emits no document without tip activity", () => {
  assertEquals(form4137.build({}, { filer: testFiler() }), []);
});

Deno.test("Form 4137 emits identity, employer detail and calculated lines in XSD order", () => {
  const [xml] = form4137.build(base, {
    filer: testFiler(),
    pending: { w2: { w2s: [baseW2] } },
  });
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

Deno.test("Form 4137 MeF reconciles tip sources with W-2 documents", () => {
  assertThrows(
    () => form4137.build(base, { filer: testFiler() }),
    Error,
    "needs its filed W-2 documents",
  );
  assertThrows(
    () =>
      form4137.build(base, {
        filer: testFiler(),
        pending: {
          w2: { w2s: [{ ...baseW2, box3_ss_wages: 29_000 }] },
        },
      }),
    Error,
    "tip sources disagree with filed W-2 documents",
  );
  assertThrows(
    () =>
      form4137.build(base, {
        filer: testFiler(),
        pending: {
          w2: { w2s: [{ ...baseW2, employer_name: "DINER" }] },
        },
      }),
    Error,
    "tip sources disagree with filed W-2 documents",
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
    w2_tip_sources: [{
      employer_name: "TOWN",
      employer_ein: "Applied For",
      allocated_tips: 0,
      ss_wages_and_tips: 0,
    }],
  }, {
    filer: testFiler(),
    pending: {
      w2: {
        w2s: [{
          employer_name: "TOWN",
          employer_ein: "Applied For",
          box1_wages: 0,
          box2_fed_withheld: 0,
          box3_ss_wages: 0,
        }],
      },
    },
  });
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
        taxpayer_ssn: "123-45-6789",
        spouse_ssn: "987-65-4321",
        w2_tip_sources: [{
          ...base.w2_tip_sources[0],
          employee_ssn: "987-65-4321",
        }],
      }, {
        filer: testFiler(),
        pending: {
          w2: { w2s: [{ ...baseW2, employee_ssn: "987-65-4321" }] },
        },
      }),
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
    taxpayer_ssn: "123-45-6789",
    spouse_ssn: "987-65-4321",
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
    w2_tip_sources: [
      { ...base.w2_tip_sources[0], employee_ssn: "123-45-6789" },
      {
        employee_ssn: "987-65-4321",
        employer_name: "DINER",
        employer_ein: "987654321",
        allocated_tips: 0,
        ss_wages_and_tips: 176_100,
      },
    ],
  }, {
    filer,
    pending: {
      w2: {
        w2s: [
          { ...baseW2, employee_ssn: "123-45-6789" },
          {
            employee_ssn: "987-65-4321",
            employer_name: "DINER",
            employer_ein: "987654321",
            box1_wages: 176_100,
            box2_fed_withheld: 0,
            box3_ss_wages: 176_100,
          },
        ],
      },
    },
  });
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
