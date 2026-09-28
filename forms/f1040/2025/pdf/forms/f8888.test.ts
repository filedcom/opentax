import { assertEquals, assertThrows } from "@std/assert";
import {
  AccountType as HeaderAccountType,
  FilingStatus,
} from "../../../mef/header.ts";
import { AccountType } from "../../../nodes/inputs/f8888/index.ts";
import { form8888Pdf } from "./f8888.ts";

const filer = {
  primarySSN: "999887777",
  nameLine1: "Jane Smith",
  nameControl: "SMIT",
  firstName: "Jane",
  lastName: "Smith",
  fullName: "Jane Smith",
  address: {
    line1: "1 Main St",
    city: "Anyplace",
    state: "NY",
    zip: "10001",
  },
  filingStatus: FilingStatus.Single,
};
const source = {
  account_1: {
    routing_number: "021000021",
    account_number: "111222333",
    account_type: AccountType.Checking,
    amount: 300,
    owner_name: "Jane Smith",
  },
  account_2: {
    routing_number: "021000021",
    account_number: "444555666",
    account_type: AccountType.Savings,
    amount: 700,
    owner_name: "Jane Smith",
  },
};
const pending = {
  f1040: { line34_overpayment: 1000, line35a_refund: 1000 },
};

Deno.test("Form 8888 PDF uses canonical Dec 2025 AcroForm fields only", () => {
  const map = new Map(
    form8888Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(form8888Pdf.pageIndices?.({}), [0]);
  assertEquals(
    map.get("account_1_amount"),
    "topmostSubform[0].Page1[0].f1_4[0]",
  );
  assertEquals(
    map.get("account_2_routing"),
    "topmostSubform[0].Page1[0].Line2bCombfield[0].f1_8[0]",
  );
  assertEquals(
    map.get("account_3_number"),
    "topmostSubform[0].Page1[0].Line3dCombfield[0].f1_12[0]",
  );
  assertEquals(
    map.get("line5_total"),
    "topmostSubform[0].Page1[0].f1_14[0]",
  );
  assertEquals(form8888Pdf.fields.length, 19);
  assertEquals(
    form8888Pdf.fields.some((field) => field.pdfField.endsWith("f1_13[0]")),
    false,
  );
});

Deno.test("Form 8888 PDF projects two accounts and exact refund total", () => {
  const instances = form8888Pdf.instances?.(source, filer, pending) ?? [];
  assertEquals(instances.length, 1);
  assertEquals(instances[0].calendar_year, "25");
  assertEquals(instances[0].header_name, "Jane Smith");
  assertEquals(instances[0].account_1_amount, 300);
  assertEquals(instances[0].account_1_type, AccountType.Checking);
  assertEquals(instances[0].account_2_type, AccountType.Savings);
  assertEquals(instances[0].account_3_amount, undefined);
  assertEquals(instances[0].line5_total, 1000);
});

Deno.test("Form 8888 PDF rejects amount and single-account routing conflicts", () => {
  assertThrows(
    () =>
      form8888Pdf.instances?.(source, filer, {
        f1040: { line34_overpayment: 1000, line35a_refund: 999 },
      }),
    Error,
    "line 35a refund",
  );
  assertThrows(
    () =>
      form8888Pdf.instances?.(
        source,
        {
          ...filer,
          bankAccount: {
            routingNumber: "021000021",
            accountNumber: "111222333",
            accountType: HeaderAccountType.Checking,
          },
        },
        pending,
      ),
    Error,
    "cannot also use Form 1040 direct deposit",
  );
});
