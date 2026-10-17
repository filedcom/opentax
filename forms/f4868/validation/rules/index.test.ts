import { test } from "bun:test";
import { assertEquals } from "@std/assert";
import { f4868_2026 } from "../../2026/index.ts";
import {
  BankAccountType,
  type F4868Input,
  PinType,
} from "../../nodes/inputs/general/filing/f4868/index.ts";
import { form4868RuleReport } from "./index.ts";

const signed: F4868Input = {
  taxpayer: {
    first_name: "Ann",
    last_name: "Lee",
    ssn: "400001111",
    birth_date: "1970-05-05",
    prior_year_agi: 42_000,
    signature_pin: "13579",
    signature_date: "2027-04-01",
  },
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
  line4_estimated_total_tax: 5_000,
  line5_total_payments: 2_000,
  line7_amount_paying: 3_000,
  payment: {
    routing_transit_number: "012345672",
    bank_account_number: "1234567",
    bank_account_type: BankAccountType.Checking,
    amount: 3_000,
    requested_payment_date: "2027-04-15",
    daytime_phone: "5125550100",
  },
  pin_type: PinType.SelfSelectOnLine,
};

function rejects(input: F4868Input, edit = (xml: string) => xml): string[] {
  const pending = f4868_2026.executeReturn({ f4868: input }).pending;
  const xml = edit(f4868_2026.buildMefXml(pending));
  return form4868RuleReport(xml, {
    atsTestSubmission: input.ats_test_submission,
  }).entries.map((e) => e.ruleNumber);
}

test("a signed Self-Select On-Line extension with a payment passes", () => {
  assertEquals(rejects(signed), []);
});

test("payment rules: amount, cents, routing number and due dates", () => {
  assertEquals(rejects({ ...signed, line7_amount_paying: 2_000 }), [
    "FPYMT-052-02",
  ]);
  // TaxpayerIsPayingAmt is whole dollars; a cents debit cannot match it.
  assertEquals(
    rejects({
      ...signed,
      line7_amount_paying: 3_000.5,
      payment: { ...signed.payment!, amount: 3_000.5 },
    }),
    ["FPYMT-052-02"],
  );
  assertEquals(
    rejects({
      ...signed,
      payment: { ...signed.payment!, routing_transit_number: "012345678" },
    }),
    ["R0000-075-03"],
  );
  const late = { ...signed.payment!, requested_payment_date: "2027-04-16" };
  assertEquals(rejects({ ...signed, payment: late }), ["FPYMT-050-01"]);
  assertEquals(
    rejects({ ...signed, payment: late, line8_out_of_country: true }),
    [],
  );
  assertEquals(
    rejects({
      ...signed,
      line8_out_of_country: true,
      payment: { ...signed.payment!, requested_payment_date: "2027-06-16" },
    }),
    ["FPYMT-051-01"],
  );
});

test("signature rules follow the PIN type", () => {
  const { birth_date: _, ...noBirthDate } = signed.taxpayer;
  assertEquals(rejects({ ...signed, taxpayer: noBirthDate }), ["R0000-681-01"]);
  const { signature_pin: __, ...unsigned } = signed.taxpayer;
  assertEquals(rejects({ ...signed, taxpayer: unsigned }), [
    "R0000-098-01",
    "R0000-681-01",
  ]);
  assertEquals(rejects({ ...signed, pin_type: PinType.Practitioner }), [
    "IND-699-02",
    "R0000-697-01",
  ]);
  assertEquals(
    rejects(signed, (xml) =>
      xml.replace(
        "<JuratDisclosureCd>Form 4868</JuratDisclosureCd>",
        "<JuratDisclosureCd>Form 4868 with Practitioner PIN and EFW</JuratDisclosureCd>",
      )),
    ["F4868-009-01"],
  );
});

test("header rules: joint name, test SSNs and document count", () => {
  const joint: F4868Input = {
    ...signed,
    spouse: {
      first_name: "Bo",
      last_name: "Lee",
      ssn: "400001111",
      birth_date: "1971-01-01",
      prior_year_agi: 0,
      signature_pin: "24680",
    },
  };
  assertEquals(rejects(joint), ["IND-006"]);
  assertEquals(
    rejects(
      { ...joint, spouse: { ...joint.spouse!, ssn: "400002222" } },
      (xml) => xml.replace("ANN &amp; BO&lt;LEE", "ANN&lt;LEE"),
    ),
    ["F4868-003-01"],
  );
  assertEquals(
    rejects({
      ...signed,
      ats_test_submission: true,
      taxpayer: { ...signed.taxpayer, ssn: "400121111" },
    }),
    ["R0000-129-01"],
  );
  assertEquals(
    rejects(signed, (xml) => xml.replace('documentCnt="2"', 'documentCnt="3"')),
    ["R0000-019"],
  );
  assertEquals(
    rejects({ ...signed, address: { ...signed.address, zip: "78700" } }),
    ["R0000-046-01"],
  );
});
