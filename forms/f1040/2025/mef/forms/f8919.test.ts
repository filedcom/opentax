import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { testFiler } from "../test-filer.ts";
import { form8919 } from "./f8919.ts";

const base = {
  taxpayer_ssn: "123-45-6789",
  forms: [{
    recipient: "taxpayer" as const,
    employers: [{
      name: "Employer Inc",
      tin_type: "ein" as const,
      tin: "12-3456789",
      reason_code: "A" as const,
      correspondence_received_date: "2025-06-01",
      correspondence_reference: "IRS determination letter",
      ss8_filed_date: "2025-03-01",
      ss8_filing_reference: "SS-8 delivery receipt",
      form1099_received: true,
      wages: 50_000,
      form1099_payer_tin: "12-3456789",
    }],
  }],
  form1099_sources: [{
    kind: "1099nec" as const,
    recipient_ssn: "123-45-6789",
    payer_name: "Employer Inc",
    payer_tin: "12-3456789",
    amount: 50_000,
  }],
  w2_sources: [{
    employee_ssn: "123-45-6789",
    employer_name: "Other Employer",
    employer_ein: "22-2222222",
    ss_wages_and_tips: 150_000,
    rrta_compensation: 0,
  }],
};

const pendingNec = {
  f1099nec: {
    f1099necs: [{
      payer_name: "Employer Inc",
      payer_tin: "12-3456789",
      recipient_ssn: "123-45-6789",
      box1_nec: 50_000,
      for_routing: "form_8919" as const,
    }],
  },
  w2: {
    w2s: [{
      employee_ssn: "123-45-6789",
      employer_name: "Other Employer",
      employer_ein: "22-2222222",
      box1_wages: 150_000,
      box2_fed_withheld: 0,
      box3_ss_wages: 150_000,
    }],
  },
};

Deno.test("Form 8919 emits no document without firms", () => {
  assertEquals(form8919.build({}, { filer: testFiler() }), []);
});

Deno.test("Form 8919 emits firm detail and calculated 2025 line tags in XSD order", () => {
  const [xml] = form8919.build(base, {
    filer: testFiler(),
    pending: pendingNec,
  });
  assertStringIncludes(xml, "<IRS8919><PersonNm>");
  assertStringIncludes(xml, "<SSN>123456789</SSN>");
  assertStringIncludes(xml, "<EmployerEIN>123456789</EmployerEIN>");
  assertStringIncludes(
    xml,
    "<UncollectedSocSecMedReasonCd>A</UncollectedSocSecMedReasonCd>",
  );
  assertStringIncludes(
    xml,
    "<CorrespondenceReceivedDt>2025-06-01</CorrespondenceReceivedDt>",
  );
  assertStringIncludes(xml, "<Form1099ReceivedInd>X</Form1099ReceivedInd>");
  assertStringIncludes(
    xml,
    "<TotalWagesWithNoWithholdingAmt>50000</TotalWagesWithNoWithholdingAmt>",
  );
  assertStringIncludes(
    xml,
    "<TotalWagesAndUnreportedTipsAmt>150000</TotalWagesAndUnreportedTipsAmt>",
  );
  assertStringIncludes(
    xml,
    "<WagesSubjectToSSTAmt>26100</WagesSubjectToSSTAmt>",
  );
  assertStringIncludes(
    xml,
    "<UncollectedSocSecMedTaxAmt>2343</UncollectedSocSecMedTaxAmt>",
  );
});

Deno.test("Form 8919 MeF rejects missing or changed filed 1099-NEC", () => {
  assertThrows(() => form8919.build(base, { filer: testFiler() }));
  assertThrows(() =>
    form8919.build(base, {
      filer: testFiler(),
      pending: {
        ...pendingNec,
        f1099nec: {
          f1099necs: [{
            ...pendingNec.f1099nec.f1099necs[0],
            box1_nec: 49_999,
          }],
        },
      },
    })
  );
});

Deno.test("Form 8919 MeF rejects line 8 W-2 source drift", () => {
  assertThrows(() =>
    form8919.build(base, {
      filer: testFiler(),
      pending: {
        ...pendingNec,
        w2: {
          w2s: [{
            ...pendingNec.w2.w2s[0],
            box3_ss_wages: 149_999,
          }],
        },
      },
    })
  );
});

Deno.test("Form 8919 MeF reconciles 1099-MISC and 1099-NEC from one firm", () => {
  const mixed = {
    ...base,
    forms: [{
      ...base.forms[0],
      employers: [{ ...base.forms[0].employers[0], wages: 60_000 }],
    }],
    form1099_sources: [
      ...base.form1099_sources,
      {
        kind: "1099misc" as const,
        recipient_ssn: "123456789",
        payer_name: "Employer Inc",
        payer_tin: "123456789",
        amount: 10_000,
      },
    ],
  };
  const pending = {
    ...pendingNec,
    f1099m: {
      f1099ms: [{
        payer_name: "Employer Inc",
        payer_tin: "12-3456789",
        recipient_tin: "123-45-6789",
        box3_other_income: 10_000,
        box3_other_income_routing: "form_8919" as const,
      }],
    },
  };
  const [xml] = form8919.build(mixed, { filer: testFiler(), pending });
  assertStringIncludes(
    xml,
    "<TotalWagesWithNoWithholdingAmt>60000</TotalWagesWithNoWithholdingAmt>",
  );
  assertThrows(() =>
    form8919.build(mixed, { filer: testFiler(), pending: pendingNec })
  );
});

Deno.test("Form 8919 MeF rejects a recipient SSN different from return header", () => {
  assertThrows(() =>
    form8919.build({ ...base, taxpayer_ssn: "999-99-9999" }, {
      filer: testFiler(),
      pending: pendingNec,
    })
  );
});

Deno.test("Form 8919 emits one document for each spouse", () => {
  const forms = [
    {
      ...base.forms[0],
      employers: [{
        ...base.forms[0].employers[0],
        form1099_payer_tin: undefined,
        form1099_received: false,
      }],
    },
    {
      recipient: "spouse" as const,
      employers: [{
        name: "Another Firm",
        tin_type: "ein" as const,
        tin: "22-2222222",
        reason_code: "H" as const,
        form1099_received: true,
        form1099_payer_tin: "22-2222222",
        wages: 20_000,
      }],
    },
  ];
  const filer = {
    ...testFiler(),
    spouse: {
      firstName: "Jane",
      lastName: "Smith",
      ssn: "987654321",
      nameControl: "SMIT",
    },
  };
  const xml = form8919.build({
    taxpayer_ssn: "123-45-6789",
    spouse_ssn: "987-65-4321",
    forms,
    form1099_sources: [{
      kind: "1099misc",
      recipient_ssn: "987654321",
      payer_name: "Another Firm",
      payer_tin: "222222222",
      amount: 20_000,
    }],
    w2_sources: [{
      employee_ssn: "987-65-4321",
      employer_name: "Another Firm",
      employer_ein: "22-2222222",
      ss_wages_and_tips: 0,
      rrta_compensation: 0,
    }],
  }, {
    filer,
    pending: {
      f1099m: {
        f1099ms: [{
          payer_name: "Another Firm",
          payer_tin: "22-2222222",
          recipient_tin: "987-65-4321",
          box3_other_income: 20_000,
          box3_other_income_routing: "form_8919",
        }],
      },
      w2: {
        w2s: [{
          employee_ssn: "987-65-4321",
          employer_name: "Another Firm",
          employer_ein: "22-2222222",
          box1_wages: 1_000,
          box2_fed_withheld: 0,
        }],
      },
    },
  });
  assertEquals(xml.length, 2);
  assertStringIncludes(xml[1], "<SSN>987654321</SSN>");
  assertStringIncludes(xml[1], "<SSN>987654321</SSN>");
});
