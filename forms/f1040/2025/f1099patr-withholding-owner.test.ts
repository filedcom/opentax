import { assertRejects, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { assertPatrWithholdingRecipient } from "./f1099patr-withholding-owner.ts";

const filer: FilerIdentity = {
  primarySSN: "111223333",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TEST",
  firstName: "Taxpayer",
  lastName: "Test",
  filingStatus: FilingStatus.Single,
  address: {
    line1: "1 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
};

const row = {
  payer_name: "Cooperative",
  payer_tin: "123456789",
  recipient_tin: "111223333",
  box4_federal_withheld: 40,
};

Deno.test("1099-PATR box 4 recipient may be taxpayer or joint spouse", () => {
  assertPatrWithholdingRecipient({ f1099patrs: [row] }, filer);
  assertPatrWithholdingRecipient({
    f1099patrs: [{ ...row, recipient_tin: "222334444" }],
  }, {
    ...filer,
    filingStatus: FilingStatus.MarriedFilingJointly,
    spouse: {
      ssn: "222334444",
      firstName: "Joint",
      lastName: "Spouse",
      nameControl: "SPOU",
    },
  });
  assertPatrWithholdingRecipient({
    f1099patrs: [{ box1_patronage_dividends: 0 }],
  }, filer);
});

Deno.test("1099-PATR box 4 without a filed recipient rejects in both exports", async () => {
  for (const recipient_tin of [undefined, "999887777"]) {
    const pending = {
      f1099patr: { f1099patrs: [{ ...row, recipient_tin }] },
    };
    assertThrows(
      () => buildMefXml(pending, filer),
      Error,
      "1099-PATR box 4 recipient must match",
    );
    await assertRejects(
      () => buildPdfBytes(pending, filer),
      Error,
      "1099-PATR box 4 recipient must match",
    );
  }
});

Deno.test("1099-PATR repeated issued account rejects direct native and PDF export", async () => {
  const issued = {
    ...row,
    account_number: "P-1",
    box1_patronage_dividends: 300,
    distribution_treatment: {
      kind: "farm" as const,
      farm_id: "FARM-1",
      verified_taxable_amount: 300,
    },
  };
  const pending = {
    f1099patr: {
      f1099patrs: [issued, { ...issued, box4_federal_withheld: 30 }],
    },
  };
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "1099-PATR repeats the same payer, recipient, and account",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "1099-PATR repeats the same payer, recipient, and account",
  );
});
