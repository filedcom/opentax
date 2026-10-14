import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { FilingStatus } from "../../../../mef/header.ts";
import { BondType } from "../../../../nodes/inputs/credits/individual/f8912/index.ts";
import { buildMefBundle } from "../../../mef/builder.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";

const filer = {
  primarySSN: "123456789",
  firstNameWithInitial: "Alex",
  lastName: "Taxpayer",
  fullName: "Alex Taxpayer",
  nameLine1: "ALEX TAXPAYER",
  nameControl: "TAXP",
  address: {
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
};

Deno.test("Schedule 3 line 6k rejects bare tax-credit-bond credit", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line20_nonrefundable_credits: 100,
    },
    schedule3: {
      line6k_tax_credit_bonds: 100,
      line7_total: 100,
      line8_total: 100,
    },
  };
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "Schedule 3 line 6k differs from retained Form 8912 credit",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "Schedule 3 line 6k differs from retained Form 8912 credit",
  );
});

Deno.test("Schedule 3 line 6k replays a sourced Form 8912 bond credit", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line11_agi: 10_000,
      line14_deductions_qbi_total: 0,
      line16_income_tax: 1_000,
      line20_nonrefundable_credits: 100,
      form8912_source_lines: { line1: 100, line2: 0, line3: 0, line4: 100 },
    },
    schedule3: {
      line6k_tax_credit_bonds: 100,
      line7_total: 100,
      line8_total: 100,
    },
    form6251: { line11_amt: 0, regular_tax_income: 10_000 },
    f8912: {
      f8912s: [{
        reported_bonds: [{
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
          taxable_interest_reported_elsewhere: 100,
          issuer_elected_direct_payment: false,
          is_pass_through_creb_credit: false,
        }],
        unreported_bonds: [],
        carryforwards: [],
      }],
      allowed_credit: 100,
      unused_credit: 0,
    },
  };
  const native = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(
    native.xml,
    '<CurrentYearAllowableCreditAmt referenceDocumentId="IRS8912',
  );
  const xsd = new URL(
    "../../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, native.xml);
    const validated = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(validated.code, 0, new TextDecoder().decode(validated.stderr));
  } finally {
    await Deno.remove(xmlPath);
  }
  assert((await buildPdfBytes(pending, filer)).length > 0);
  const changed = {
    ...pending,
    f1040: { ...pending.f1040, line20_nonrefundable_credits: 99 },
    schedule3: {
      line6k_tax_credit_bonds: 99,
      line7_total: 99,
      line8_total: 99,
    },
  };
  for (
    const build of [
      () => buildMefBundle(changed, { filer, attachments: [] }),
      () => buildPdfBytes(changed, filer),
    ]
  ) {
    await assertRejects(
      build,
      Error,
      "Schedule 3 line 6k differs from retained Form 8912 credit",
    );
  }
});
