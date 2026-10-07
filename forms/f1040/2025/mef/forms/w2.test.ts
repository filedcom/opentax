import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type W2Item, w2ItemSchema } from "../../../nodes/inputs/w2/index.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { w2 } from "./w2.ts";

function filer(): FilerIdentity {
  return {
    primarySSN: "111223333",
    nameLine1: "TAXPAYER TEST",
    nameControl: "TAXP",
    firstName: "Test",
    lastName: "Taxpayer",
    fullName: "Test Taxpayer",
    address: {
      line1: "123 Main St",
      city: "Springfield",
      state: "IL",
      zip: "62701",
    },
    filingStatus: FilingStatus.Single,
  };
}

function item(overrides: Partial<W2Item> = {}): W2Item {
  return {
    employer_ein: "12-3456789",
    employer_name: "Acme Corporation",
    employer_address_line1: "500 Market St",
    employer_address_city: "Chicago",
    employer_address_state: "IL",
    employer_address_zip: "60601",
    box1_wages: 30_000,
    box2_fed_withheld: 3_000,
    box3_ss_wages: 30_000,
    box4_ss_withheld: 1_860,
    box5_medicare_wages: 30_000,
    box6_medicare_withheld: 435,
    ...overrides,
  };
}

Deno.test("w2 builds one IRSW2 document per wage statement", () => {
  const result = w2.build({
    w2s: [item(), item({ employer_ein: "98-7654321" })],
  }, {
    filer: filer(),
  });

  assertEquals(result.length, 2);
  assertStringIncludes(result[0], "<IRSW2>");
  assertStringIncludes(result[1], "<EmployerEIN>987654321</EmployerEIN>");
});

Deno.test("w2 emits required identity, address, wage, and withholding fields in XSD order", () => {
  const [result] = w2.build({ w2s: [item()] }, { filer: filer() });
  const tags = [
    "<EmployeeSSN>",
    "<EmployerEIN>",
    "<EmployerNameControlTxt>",
    "<EmployerName>",
    "<EmployerUSAddress>",
    "<EmployeeNm>",
    "<EmployeeUSAddress>",
    "<WagesAmt>",
    "<WithholdingAmt>",
    "<StandardOrNonStandardCd>",
  ];

  let previous = -1;
  for (const tag of tags) {
    const current = result.indexOf(tag);
    assertEquals(
      current > previous,
      true,
      `${tag} must follow the prior IRSW2 element`,
    );
    previous = current;
  }
  assertStringIncludes(result, "<EmployeeSSN>111223333</EmployeeSSN>");
  assertStringIncludes(result, "<EmployerEIN>123456789</EmployerEIN>");
  assertStringIncludes(result, "<WagesAmt>30000</WagesAmt>");
  assertStringIncludes(result, "<WithholdingAmt>3000</WithholdingAmt>");
  assertStringIncludes(
    result,
    "<StandardOrNonStandardCd>S</StandardOrNonStandardCd>",
  );
});

Deno.test("reviewed nonstandard W-2 emits code N only for its identified copy", () => {
  const review = {
    kind: "handwritten" as const,
    source_document_reference: "2025 handwritten W-2 copy",
    reviewer_confirmed_nonstandard: true as const,
  };
  const nonstandard = item({
    source_document_reference: review.source_document_reference,
    nonstandard_document_review: review,
  });
  const [xml] = w2.build({ w2s: [nonstandard] }, { filer: filer() });
  assertStringIncludes(
    xml,
    "<StandardOrNonStandardCd>N</StandardOrNonStandardCd>",
  );
  assertEquals(
    w2ItemSchema.safeParse({
      ...nonstandard,
      source_document_reference: "different copy",
    }).success,
    false,
  );
  assertEquals(
    w2ItemSchema.safeParse({
      ...nonstandard,
      source_document_reference: undefined,
    }).success,
    false,
  );
  assertThrows(
    () =>
      w2.build({
        w2s: [item({
          ...nonstandard,
          source_document_reference: "different copy",
        })],
      }, { filer: filer() }),
    Error,
    "Nonstandard W-2 review must match the retained issued-copy reference",
  );
});

Deno.test("W-2 MeF retains RRTA box 14 compensation and Additional Medicare Tax", () => {
  const [xml] = w2.build({
    w2s: [item({
      box3_ss_wages: undefined,
      box4_ss_withheld: undefined,
      box5_medicare_wages: undefined,
      box6_medicare_withheld: undefined,
      box14_entries: [
        {
          description: "RRTA compensation",
          amount: 220_000,
          is_state_sdi_pfml: false,
        },
        {
          description: "Additional Medicare Tax",
          amount: 180,
          is_state_sdi_pfml: false,
        },
      ],
    })],
  }, { filer: filer() });
  assertStringIncludes(
    xml,
    "<OtherDeductionsBenefitsGrp><Desc>RRTA compensation</Desc><Amt>220000</Amt></OtherDeductionsBenefitsGrp>",
  );
  assertStringIncludes(
    xml,
    "<OtherDeductionsBenefitsGrp><Desc>Additional Medicare Tax</Desc><Amt>180</Amt></OtherDeductionsBenefitsGrp>",
  );
  assertEquals(xml.includes("<MedicareWagesAndTipsAmt>"), false);
});

Deno.test("w2 refuses a finalized document with missing employer filing data", () => {
  assertThrows(
    () =>
      w2.build({ w2s: [item({ employer_address_line1: undefined })] }, {
        filer: filer(),
      }),
    Error,
    "employer_address_line1",
  );
});

Deno.test("w2 refuses an Applied For employer EIN that IRSW2 cannot export", () => {
  assertThrows(
    () =>
      w2.build({ w2s: [item({ employer_ein: "Applied For" })] }, {
        filer: filer(),
      }),
    Error,
    "employer EIN must be nine digits",
  );
});

Deno.test("w2 refuses a finalized document without filer identity", () => {
  assertThrows(
    () => w2.build({ w2s: [item()] }),
    Error,
    "filer identity",
  );
});

Deno.test("W-2 MeF binds an explicit employee SSN to the return owner", () => {
  const jointFiler: FilerIdentity = {
    ...filer(),
    filingStatus: FilingStatus.MarriedFilingJointly,
    spouse: {
      ssn: "222334444",
      firstName: "Joint",
      lastName: "Spouse",
      nameControl: "SPOU",
    },
  };
  const [spouseXml] = w2.build({
    w2s: [item({ employee_ssn: "222-33-4444" })],
  }, { filer: jointFiler });
  assertStringIncludes(spouseXml, "<EmployeeSSN>222334444</EmployeeSSN>");
  assertStringIncludes(spouseXml, "<EmployeeNm>Joint Spouse</EmployeeNm>");

  assertThrows(
    () =>
      w2.build({ w2s: [item({ employee_ssn: "999-88-7777" })] }, {
        filer: jointFiler,
      }),
    Error,
    "employee SSN must match the taxpayer or joint spouse",
  );
  assertThrows(
    () =>
      w2.build({ w2s: [item({ employee_ssn: "222334444" })] }, {
        filer: {
          ...jointFiler,
          filingStatus: FilingStatus.MarriedFilingSeparately,
        },
      }),
    Error,
    "spouse wages require a joint Form 1040",
  );
});

Deno.test("W2 native business-name formatting preserves legal source spelling, EIN and name control", () => {
  const source = item({
    employer_name: "Harbor Retail Inc.",
    employer_ein: "34-5678901",
  });
  const original = structuredClone(source);
  const [xml] = w2.build({ w2s: [source] }, { filer: filer() });
  assertStringIncludes(
    xml,
    "<BusinessNameLine1Txt>Harbor Retail Inc</BusinessNameLine1Txt>",
  );
  assertStringIncludes(xml, "<EmployerEIN>345678901</EmployerEIN>");
  assertStringIncludes(
    xml,
    "<EmployerNameControlTxt>HARB</EmployerNameControlTxt>",
  );
  assertEquals(source, original);
  assertThrows(
    () =>
      w2.build({ w2s: [item({ employer_name: "A+B Retail" })] }, {
        filer: filer(),
      }),
    Error,
    "MeF-supported",
  );
});
