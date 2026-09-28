import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../types.ts";
import { w2g } from "./w2g.ts";

const filer: FilerIdentity = {
  primarySSN: "111223333",
  nameLine1: "Test Taxpayer",
  nameControl: "TAXP",
  fullName: "Test Taxpayer",
  firstName: "Test",
  lastName: "Taxpayer",
  address: {
    line1: "123 Main St",
    city: "Springfield",
    state: "IL",
    zip: "62701",
  },
  filingStatus: FilingStatus.Single,
};

const issued = {
  calendar_year: 2025 as const,
  source_document_reference: "Payer-issued W-2G 2025-0001",
  payer_name: "Casino Inc",
  payer_name_control: "CASI",
  payer_us_address: {
    line1: "500 Casino Way",
    city: "Las Vegas",
    state: "NV",
    zip: "89101",
  },
  payer_ein: "12-3456789",
  winner_name: "Test Taxpayer",
  winner_us_address: filer.address,
  box9_winner_tin: "111-22-3333",
  box1_winnings: 10_000,
  box2_date_won: "2025-06-01",
  box3_type_of_wager: "Slot machines",
  box4_federal_withheld: 2_400,
  box7_identical_wagers: 300,
  box13_state: "NV",
  box13_payer_state_id: "NV123",
  box14_state_winnings: 10_000,
  box15_state_withheld: 100,
  standard_or_nonstandard_code: "S" as const,
};

Deno.test("withheld W-2G emits one native document in TY2025 order", () => {
  const xml = w2g.build({ w2gs: [issued, { box1_winnings: 500 }] }, { filer });
  assertEquals(xml.length, 1);
  const tags = [
    "<CalendarYr>",
    "<PayerNameControlTxt>",
    "<PayerName>",
    "<PayerUSAddress>",
    "<PayerEIN>",
    "<GamblingReportableWinningAmt>",
    "<FederalIncomeTaxWithheldAmt>",
    "<RecipientNm>",
    "<RecipientUSAddress>",
    "<RecipientSSN>",
    "<W2GStateLocalTaxGrp>",
    "<StandardOrNonStandardCd>",
  ];
  let previous = -1;
  for (const tag of tags) {
    const current = xml[0].indexOf(tag);
    assertEquals(current > previous, true, `${tag} must follow prior tag`);
    previous = current;
  }
  assertStringIncludes(xml[0], "<PayerEIN>123456789</PayerEIN>");
  assertStringIncludes(xml[0], "<RecipientSSN>111223333</RecipientSSN>");
  assertStringIncludes(
    xml[0],
    "<GamblingReportableWinningAmt>10000</GamblingReportableWinningAmt>",
  );
  assertStringIncludes(
    xml[0],
    "<GamblingWinFromIdntclWagersAmt>300</GamblingWinFromIdntclWagersAmt>",
  );
  assertStringIncludes(
    xml[0],
    "<FederalIncomeTaxWithheldAmt>2400</FederalIncomeTaxWithheldAmt>",
  );
});

Deno.test("withheld W-2G rejects incomplete issued form and winner mismatch", () => {
  assertThrows(
    () =>
      w2g.build({ w2gs: [{ ...issued, payer_us_address: undefined }] }, {
        filer,
      }),
    Error,
    "structured payer identity",
  );
  assertThrows(
    () =>
      w2g.build({ w2gs: [{ ...issued, box9_winner_tin: "999-88-7777" }] }, {
        filer,
      }),
    Error,
    "matching the taxpayer",
  );
  assertThrows(
    () =>
      w2g.build({ w2gs: [{ ...issued, calendar_year: undefined }] }, { filer }),
    Error,
    "issued 2025 form",
  );
  assertThrows(
    () =>
      w2g.build({ w2gs: [{ ...issued, payer_address: "500 Casino Way" }] }, {
        filer,
      }),
  );
});

Deno.test("withheld W-2G accepts a matching joint-filing spouse but not a separate-filing spouse", () => {
  const jointFiler: FilerIdentity = {
    ...filer,
    filingStatus: FilingStatus.MarriedFilingJointly,
    spouse: {
      ssn: "222334444",
      firstName: "Joint",
      lastName: "Spouse",
      nameControl: "SPOU",
    },
  };
  const spouseIssued = {
    ...issued,
    winner_name: "Joint Spouse",
    box9_winner_tin: "222-33-4444",
  };
  const xml = w2g.build({ w2gs: [spouseIssued] }, { filer: jointFiler });
  assertEquals(xml.length, 1);
  assertStringIncludes(xml[0], "<RecipientSSN>222334444</RecipientSSN>");
  assertThrows(
    () =>
      w2g.build({ w2gs: [spouseIssued] }, {
        filer: {
          ...jointFiler,
          filingStatus: FilingStatus.MarriedFilingSeparately,
        },
      }),
    Error,
    "joint-filing spouse",
  );
});
