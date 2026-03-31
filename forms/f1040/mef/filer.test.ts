import { assertEquals } from "@std/assert";
import { extractFilerIdentity } from "./filer.ts";
import { AccountType, FilingStatus, PINEnteredBy } from "./header.ts";

function baseFiler(): Record<string, unknown> {
  return {
    taxpayer_ssn: "123456789",
    taxpayer_first_name: "JOHN",
    taxpayer_last_name: "SMITH",
    taxpayer_middle_initial: "A",
    filing_status: FilingStatus.Single,
    address_line1: "123 MAIN ST",
    address_city: "SPRINGFIELD",
    address_state: "IL",
    address_zip: "62701",
  };
}

// ─── Returns undefined when missing required fields ──────────────────────────

Deno.test("returns undefined when SSN is missing", () => {
  const { taxpayer_ssn: _, ...data } = baseFiler();
  assertEquals(extractFilerIdentity(data), undefined);
});

Deno.test("returns undefined when last name is missing", () => {
  const { taxpayer_last_name: _, ...data } = baseFiler();
  assertEquals(extractFilerIdentity(data), undefined);
});

Deno.test("returns undefined for empty object", () => {
  assertEquals(extractFilerIdentity({}), undefined);
});

// ─── Basic identity extraction ───────────────────────────────────────────────

Deno.test("extracts primarySSN", () => {
  const filer = extractFilerIdentity(baseFiler())!;
  assertEquals(filer.primarySSN, "123456789");
});

Deno.test("builds nameLine1 as LAST FIRST MI", () => {
  const filer = extractFilerIdentity(baseFiler())!;
  assertEquals(filer.nameLine1, "SMITH JOHN A");
});

Deno.test("derives 4-char nameControl from last name", () => {
  const filer = extractFilerIdentity(baseFiler())!;
  assertEquals(filer.nameControl, "SMIT");
});

Deno.test("extracts filing status", () => {
  const filer = extractFilerIdentity(baseFiler())!;
  assertEquals(filer.filingStatus, FilingStatus.Single);
});

Deno.test("defaults to Single when filing_status not a number", () => {
  const data = { ...baseFiler(), filing_status: undefined };
  const filer = extractFilerIdentity(data)!;
  assertEquals(filer.filingStatus, FilingStatus.Single);
});

// ─── Address extraction ──────────────────────────────────────────────────────

Deno.test("extracts domestic address", () => {
  const filer = extractFilerIdentity(baseFiler())!;
  assertEquals(filer.address.line1, "123 MAIN ST");
  assertEquals(filer.address.city, "SPRINGFIELD");
  assertEquals(filer.address.state, "IL");
  assertEquals(filer.address.zip, "62701");
});

Deno.test("extracts address line 2 when present", () => {
  const data = { ...baseFiler(), address_line2: "APT 4B" };
  const filer = extractFilerIdentity(data)!;
  assertEquals(filer.address.line2, "APT 4B");
});

Deno.test("extracts foreign address fields", () => {
  const data = {
    ...baseFiler(),
    address_foreign_country: "CA",
    address_foreign_province_state: "Ontario",
    address_foreign_postal_code: "M5V 2H1",
  };
  const filer = extractFilerIdentity(data)!;
  assertEquals(filer.address.foreignCountry, "CA");
  assertEquals(filer.address.foreignProvinceState, "Ontario");
  assertEquals(filer.address.foreignPostalCode, "M5V 2H1");
});

// ─── Optional taxpayer fields ────────────────────────────────────────────────

Deno.test("extracts IP PIN", () => {
  const data = { ...baseFiler(), taxpayer_ip_pin: "123456" };
  const filer = extractFilerIdentity(data)!;
  assertEquals(filer.ipPin, "123456");
});

Deno.test("extracts signature PIN", () => {
  const data = { ...baseFiler(), taxpayer_signature_pin: "12345" };
  const filer = extractFilerIdentity(data)!;
  assertEquals(filer.signaturePin, "12345");
});

Deno.test("extracts phone and email", () => {
  const data = {
    ...baseFiler(),
    taxpayer_daytime_phone: "555-1234",
    taxpayer_email: "john@example.com",
  };
  const filer = extractFilerIdentity(data)!;
  assertEquals(filer.phone, "555-1234");
  assertEquals(filer.email, "john@example.com");
});

Deno.test("extracts deceased info", () => {
  const data = {
    ...baseFiler(),
    taxpayer_deceased: true,
    taxpayer_death_date: "2025-06-15",
  };
  const filer = extractFilerIdentity(data)!;
  assertEquals(filer.deceased, true);
  assertEquals(filer.deathDate, "2025-06-15");
});

// ─── Spouse extraction ───────────────────────────────────────────────────────

Deno.test("spouse is undefined when no spouse SSN", () => {
  const filer = extractFilerIdentity(baseFiler())!;
  assertEquals(filer.spouse, undefined);
});

Deno.test("extracts spouse identity when SSN and last name present", () => {
  const data = {
    ...baseFiler(),
    spouse_ssn: "987654321",
    spouse_first_name: "JANE",
    spouse_last_name: "SMITH",
    spouse_middle_initial: "B",
    spouse_ip_pin: "654321",
    spouse_signature_pin: "54321",
  };
  const filer = extractFilerIdentity(data)!;
  assertEquals(filer.spouse?.ssn, "987654321");
  assertEquals(filer.spouse?.firstName, "JANE");
  assertEquals(filer.spouse?.lastName, "SMITH");
  assertEquals(filer.spouse?.nameControl, "SMIT");
  assertEquals(filer.spouse?.ipPin, "654321");
  assertEquals(filer.spouse?.signaturePin, "54321");
});

Deno.test("spouse is undefined when SSN present but no last name", () => {
  const data = { ...baseFiler(), spouse_ssn: "987654321" };
  const filer = extractFilerIdentity(data)!;
  assertEquals(filer.spouse, undefined);
});

// ─── Bank account extraction ─────────────────────────────────────────────────

Deno.test("bankAccount is undefined when routing missing", () => {
  const filer = extractFilerIdentity(baseFiler())!;
  assertEquals(filer.bankAccount, undefined);
});

Deno.test("extracts checking account", () => {
  const data = {
    ...baseFiler(),
    bank_routing_number: "021000021",
    bank_account_number: "123456789",
    bank_account_type: "checking",
  };
  const filer = extractFilerIdentity(data)!;
  assertEquals(filer.bankAccount?.routingNumber, "021000021");
  assertEquals(filer.bankAccount?.accountNumber, "123456789");
  assertEquals(filer.bankAccount?.accountType, AccountType.Checking);
});

Deno.test("extracts savings account", () => {
  const data = {
    ...baseFiler(),
    bank_routing_number: "021000021",
    bank_account_number: "987654321",
    bank_account_type: "savings",
  };
  const filer = extractFilerIdentity(data)!;
  assertEquals(filer.bankAccount?.accountType, AccountType.Savings);
});

Deno.test("bankAccount undefined when partial fields", () => {
  const data = { ...baseFiler(), bank_routing_number: "021000021" };
  const filer = extractFilerIdentity(data)!;
  assertEquals(filer.bankAccount, undefined);
});

// ─── Default values ──────────────────────────────────────────────────────────

Deno.test("sets pinEnteredBy to Taxpayer by default", () => {
  const filer = extractFilerIdentity(baseFiler())!;
  assertEquals(filer.pinEnteredBy, PINEnteredBy.Taxpayer);
});

Deno.test("generates a timestamp", () => {
  const filer = extractFilerIdentity(baseFiler())!;
  assertEquals(typeof filer.timestamp, "string");
  assertEquals(filer.timestamp!.length > 0, true);
});
