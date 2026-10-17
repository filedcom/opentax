import { test } from "bun:test";
import { assertEquals, assertMatch } from "@std/assert";
import { f4868_2026 } from "../index.ts";
import {
  BankAccountType,
  type F4868Input,
  OriginatorType,
  PinType,
} from "../../nodes/inputs/general/filing/f4868/index.ts";
import { form4868RuleReport } from "../../validation/rules/index.ts";
import { return4868XsdAvailable, validateReturn4868Xsd } from "./xsd.ts";

const joint: F4868Input = {
  taxpayer: {
    first_name: "Carl",
    middle_initial: "A",
    last_name: "Jones",
    ssn: "400-00-2001",
    signature_pin: "11111",
    signature_date: "2027-04-01",
  },
  spouse: {
    first_name: "Angie",
    last_name: "Myer",
    ssn: "400-00-2002",
    signature_pin: "22222",
    signature_date: "2027-04-01",
  },
  address: {
    line1: "10 Downing Street",
    city: "London",
    foreign_country_code: "UK",
    foreign_postal_code: "SW1A 2AA",
  },
  in_care_of: "Pat Smith",
  line4_estimated_total_tax: 30_000,
  line5_total_payments: 31_000,
  line7_amount_paying: 1_250,
  line8_out_of_country: true,
  payment: {
    routing_transit_number: "012345672",
    bank_account_number: "98765",
    bank_account_type: BankAccountType.Savings,
    amount: 1_250,
    requested_payment_date: "2027-06-10",
    daytime_phone: "5125550100",
  },
  pin_type: PinType.Practitioner,
  originator: {
    efin: "123456",
    type: OriginatorType.ERO,
    practitioner_pin: "54321",
  },
  software_id: "12345678",
};

function exported(input: F4868Input) {
  const pending = f4868_2026.executeReturn({ f4868: input }).pending;
  const xml = f4868_2026.buildMefXml(pending);
  return { xml, report: form4868RuleReport(xml) };
}

test("Form 4868 joint practitioner return with an abroad payment files cleanly", async () => {
  const { xml, report } = exported(joint);
  assertEquals(report.entries, []);
  assertMatch(
    xml,
    /<NameLine1Txt>CARL A&lt;JONES&lt;&amp; ANGIE MYER<\/NameLine1Txt>/,
  );
  assertMatch(
    xml,
    /<JuratDisclosureCd>Form 4868 with Practitioner PIN and EFW<\/JuratDisclosureCd>/,
  );
  assertMatch(
    xml,
    /<PractitionerPINGrp><EFIN>123456<\/EFIN><PIN>54321<\/PIN><\/PractitionerPINGrp>/,
  );
  assertMatch(xml, /<SpouseNameControlTxt>MYER<\/SpouseNameControlTxt>/);
  assertMatch(xml, /<InCareOfNm>% Pat Smith<\/InCareOfNm>/);
  assertMatch(xml, /<BalanceDueAmt>0<\/BalanceDueAmt>/);
  assertMatch(xml, /<TaxpayerAbroadInd>X<\/TaxpayerAbroadInd>/);
  assertMatch(
    xml,
    /<PaymentAmt>1250.00<\/PaymentAmt><RequestedPaymentDt>2027-06-10/,
  );
  assertMatch(xml, /<BankAccountTypeCd>2<\/BankAccountTypeCd>/);
  if (return4868XsdAvailable()) await validateReturn4868Xsd(xml);
});

test("Form 4868 without a payment carries no signature or IRSPayment", async () => {
  const { xml, report } = exported({
    taxpayer: { first_name: "Ann", last_name: "Lee", ssn: "400001111" },
    address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
    line4_estimated_total_tax: 0,
    line5_total_payments: 0,
    line9_1040nr_no_wages_withheld: true,
  });
  assertEquals(report.entries, []);
  assertEquals(xml.includes("IRSPayment"), false);
  assertEquals(xml.includes("PINTypeCd"), false);
  assertMatch(xml, /<ReturnData documentCnt="1">/);
  assertMatch(
    xml,
    /<NonresWithNoWagesSubjToWhInd>X<\/NonresWithNoWagesSubjToWhInd>/,
  );
  if (return4868XsdAvailable()) await validateReturn4868Xsd(xml);
});

test("Form 4868 PDF export is refused rather than faked", async () => {
  const pending = f4868_2026.executeReturn({ f4868: joint }).pending;
  const prepared = await f4868_2026.prepareReturn(pending, undefined);
  let message = "";
  await prepared.renderPdf().catch((error: Error) => message = error.message);
  assertMatch(message, /no PDF export/);
});
