import { assertEquals, assertThrows } from "@std/assert";
import { BondType } from "../../../nodes/inputs/f8912/index.ts";
import { form8912Pdf } from "./f8912.ts";

const reported = {
  bond_type: BondType.QECB,
  issue_date: "2017-12-31",
  issuer_name: "Town Energy Authority",
  issuer_ein: "123456789",
  unique_identifier_code: "O" as const,
  unique_identifier: "BOND1097",
  monthly_credit_amounts: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100],
  credit_amount: 100,
  purchase_accrued_interest: 0,
  sale_accrued_interest: 0,
  taxable_interest_reported_elsewhere: 0,
  issuer_elected_direct_payment: false,
  is_pass_through_creb_credit: false,
};

const unreported = {
  bond_type: BondType.QECB,
  issue_date: "2017-12-31",
  issuer_name: "Town Energy Authority",
  issuer_city: "Austin",
  issuer_state: "TX",
  issuer_ein: "123456789",
  maturity_date: "2030-12-31",
  acquisition_date: "2024-01-01",
  purchase_accrued_interest: 0,
  sale_accrued_interest: 0,
  taxable_interest_reported_elsewhere: 0,
  line18_rows: [{
    cusip: "123456789",
    outstanding_principal: 10_000,
    credit_rate: 0.05,
    allowance_dates: ["2025-03-15", "2025-06-15"],
  }],
  issuer_elected_direct_payment: false,
  is_pass_through_creb_credit: false,
};

const source = {
  reported_bonds: [reported],
  unreported_bonds: [unreported],
  carryforwards: [{
    bond_type: BondType.QECB,
    issue_date: "2017-12-31",
    bond_identifier: "BOND-OLD",
    origin_tax_year: 2024,
    amount: 25,
  }],
};

const pending = {
  f1040: {
    line16_income_tax: 1_000,
    line20_nonrefundable_credits: 300,
    form8912_source_lines: { line1: 100, line2: 175, line3: 25, line4: 300 },
  },
  form6251: { line11_amt: 0 },
  schedule3: { line6k_tax_credit_bonds: 300, line8_total: 300 },
};

Deno.test("Form 8912 PDF maps every printed Part I/II line to the IRS widget", () => {
  const names = Object.fromEntries(
    form8912Pdf.fields.map((field) => [field.domainKey, field.pdfField]),
  );
  assertEquals(names.line1, "topmostSubform[0].Page1[0].f1_3[0]");
  assertEquals(names.line4, "topmostSubform[0].Page1[0].f1_6[0]");
  assertEquals(names.line7, "topmostSubform[0].Page1[0].f1_9[0]");
  assertEquals(names.line10a, "topmostSubform[0].Page1[0].f1_12[0]");
  assertEquals(names.line12, "topmostSubform[0].Page1[0].f1_18[0]");
  assertEquals(
    names.part_iii_20_credit,
    "topmostSubform[0].Page2[0].Table_Part3[0].Row20[0].f2_80[0]",
  );
  assertEquals(
    names.part_iv_18_credit,
    "topmostSubform[0].Page3[0].Table1[0].Row18[0].f3_113[0]",
  );
});

Deno.test("Form 8912 PDF projects finalized credit and splits distinct IRS pages", () => {
  const projected = form8912Pdf.projectFields?.({
    f8912s: [source],
    allowed_credit: 300,
    unused_credit: 0,
  }, pending) ?? {};
  assertEquals(projected.line1, 100);
  assertEquals(projected.line2, 175);
  assertEquals(projected.line3, 25);
  assertEquals(projected.line12, 300);
  const pages = form8912Pdf.instances?.(projected) ?? [];
  assertEquals(pages.length, 3);
  assertEquals(pages.map((page) => form8912Pdf.pageIndices?.(page)), [
    [0],
    [1],
    [2],
  ]);
  assertEquals(pages[1].part_iii_1_unique_identifier, "BOND1097");
  assertEquals(pages[2].part_iv_1_base, 10_000);
  assertEquals(pages[2].line20, 175);
});

Deno.test("Form 8912 PDF repeats only Part III for reported rows over 20", () => {
  const bonds = Array.from({ length: 21 }, (_, index) => ({
    ...reported,
    unique_identifier: `BOND${index}`,
  }));
  const pages = form8912Pdf.instances?.({
    f8912s: [{
      reported_bonds: bonds,
      unreported_bonds: [],
      carryforwards: [],
    }],
    line4: 2_100,
  }) ?? [];
  assertEquals(pages.length, 3);
  assertEquals(pages.map((page) => form8912Pdf.pageIndices?.(page)), [
    [0],
    [1],
    [1],
  ]);
  assertEquals(pages[1].line14, 2_000);
  assertEquals(pages[2].line14, 100);
  assertEquals(pages[2].part_iii_1_unique_identifier, "BOND20");
});

Deno.test("Form 8912 PDF keeps each unreported bond on its own Part IV", () => {
  const pages = form8912Pdf.instances?.({
    f8912s: [{
      reported_bonds: [],
      unreported_bonds: [
        unreported,
        {
          ...unreported,
          issuer_name: "County School District",
          issuer_ein: "987654321",
          line18_rows: [{
            ...unreported.line18_rows[0],
            cusip: "987654321",
          }],
        },
      ],
      carryforwards: [],
    }],
    line4: 350,
  }) ?? [];
  assertEquals(pages.map((page) => form8912Pdf.pageIndices?.(page)), [
    [0],
    [2],
    [2],
  ]);
  assertEquals(pages[1].issuer, "Town Energy Authority, Austin, TX");
  assertEquals(pages[2].issuer, "County School District, Austin, TX");
  assertEquals(pages[1].line20, 175);
  assertEquals(pages[2].line20, 175);
});

Deno.test("Form 8912 PDF rejects a credit that differs from finalized Schedule 3", () => {
  assertThrows(
    () =>
      form8912Pdf.projectFields?.({
        f8912s: [source],
        allowed_credit: 250,
        unused_credit: 50,
      }, pending),
    Error,
    "does not reconcile",
  );
});
