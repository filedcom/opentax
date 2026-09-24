import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import type { W2Item } from "../../../nodes/inputs/w2/index.ts";
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

Deno.test("w2 refuses a finalized document without filer identity", () => {
  assertThrows(
    () => w2.build({ w2s: [item()] }),
    Error,
    "filer identity",
  );
});
