import { assertRejects, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { assert1099BRecipientOwner } from "./f1099b-recipient-owner.ts";

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
  recipient_ssn: "111223333",
  part: "A" as const,
  description: "10 shares ABC",
  date_acquired: "01012024",
  date_sold: "01022025",
  proceeds: 1_000,
  cost_basis: 800,
};

Deno.test("1099-B recipient belongs to taxpayer or joint spouse", () => {
  assert1099BRecipientOwner({ f1099bs: [row] }, filer);
  assert1099BRecipientOwner({
    f1099bs: [{ ...row, recipient_ssn: "222334444" }],
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
});

Deno.test("1099-B wrong recipient blocks native and PDF final return", async () => {
  const pending = {
    f1099b: { f1099bs: [{ ...row, recipient_ssn: "999887777" }] },
  };
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "1099-B recipient must match",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "1099-B recipient must match",
  );
});

Deno.test("1099-B missing issued recipient blocks native and PDF filing", async () => {
  const pending = {
    f1099b: { f1099bs: [{ ...row, recipient_ssn: undefined }] },
  };
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "1099-B filing needs an issued recipient SSN",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "1099-B filing needs an issued recipient SSN",
  );
});
