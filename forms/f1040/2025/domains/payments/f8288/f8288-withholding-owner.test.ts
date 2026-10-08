import { assertRejects, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../../mef/header.ts";
import { WithholdingRate } from "../../../../nodes/inputs/f8288/index.ts";
import { assertF8288WithholdingOwner } from "./f8288-withholding-owner.ts";
import { buildMefXml } from "../../../mef/builder.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";

const filer: FilerIdentity = {
  primarySSN: "111223333",
  nameLine1: "TAXPAYER TEST",
  nameControl: "TEST",
  firstName: "Taxpayer",
  lastName: "Test",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

const item = {
  property_address: "1 Oak St, Austin, TX 78701",
  gross_sales_price: 100_000,
  withholding_rate: WithholdingRate.RATE_15,
  amount_withheld: 15_000,
  buyer_name: "Buyer LLC",
  buyer_tin: "123456789",
  disposition_date: "2025-06-01",
  seller_tin: "111223333",
  stamped_copy_b_reference: "irs-stamped-8288a-copy-b-1",
};

Deno.test("Form 8288-A credit owner may be taxpayer or joint spouse", () => {
  assertF8288WithholdingOwner({ f8288s: [item] }, filer);
  assertF8288WithholdingOwner({
    f8288s: [{ ...item, seller_tin: "222334444" }],
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
  assertF8288WithholdingOwner({
    f8288s: [{
      ...item,
      seller_tin: undefined,
      stamped_copy_b_reference: undefined,
      amount_withheld: 0,
    }],
  }, filer);
});

Deno.test("positive Form 8288-A needs seller and stamped Copy B before export", async () => {
  for (
    const changed of [
      { seller_tin: undefined },
      { seller_tin: "999887777" },
      { stamped_copy_b_reference: undefined },
    ]
  ) {
    const source = { f8288: { f8288s: [{ ...item, ...changed }] } };
    const message = "stamped_copy_b_reference" in changed
      ? "needs an IRS-stamped Copy B reference"
      : "seller TIN must match";
    assertThrows(
      () => assertF8288WithholdingOwner(source.f8288, filer),
      Error,
      message,
    );
    assertThrows(
      () => buildMefXml(source, filer),
      Error,
      "line 25c is less than sourced Form 8288-A withholding",
    );
    await assertRejects(
      () => buildPdfBytes(source, filer),
      Error,
      "line 25c is less than sourced Form 8288-A withholding",
    );
  }
});

Deno.test("Form 8288-A repeated stamped copy cannot claim credit twice", async () => {
  const source = {
    f8288: { f8288s: [item, { ...item, amount_withheld: 10_000 }] },
  };
  assertThrows(
    () => buildMefXml(source, filer),
    Error,
    "same stamped Form 8288-A Copy B cannot be claimed twice",
  );
  await assertRejects(
    () => buildPdfBytes(source, filer),
    Error,
    "same stamped Form 8288-A Copy B cannot be claimed twice",
  );
});
