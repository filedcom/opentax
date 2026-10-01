import { assertRejects, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { buildMefXml } from "./mef/builder.ts";
import { buildPdfBytes } from "./pdf/builder.ts";
import { assertNecWithholdingRecipient } from "./f1099nec-withholding-owner.ts";

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

const source = {
  f1099necs: [{
    payer_name: "Payer LLC",
    payer_tin: "123456789",
    recipient_ssn: "111223333",
    box4_federal_withheld: 75,
  }],
};

Deno.test("1099-NEC backup withholding owner is replayed by both exporters", async () => {
  assertNecWithholdingRecipient(source, filer);
  assertNecWithholdingRecipient({
    f1099necs: [{ ...source.f1099necs[0], recipient_ssn: "222334444" }],
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
  const wrongOwner = {
    f1099nec: {
      f1099necs: [{
        ...source.f1099necs[0],
        recipient_ssn: "999887777",
      }],
    },
  };
  assertThrows(
    () => buildMefXml(wrongOwner, filer),
    Error,
    "box 4 recipient must match",
  );
  await assertRejects(
    () => buildPdfBytes(wrongOwner, filer),
    Error,
    "box 4 recipient must match",
  );
});
