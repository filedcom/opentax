import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { buildMefBundle } from "../../mef/builder.ts";
import { buildPdfBytes } from "../../pdf/builder.ts";

const filer = {
  primarySSN: "111223333",
  firstNameWithInitial: "Alex",
  lastName: "Example",
  fullName: "Alex Example",
  nameLine1: "ALEX EXAMPLE",
  nameControl: "EXAM",
  address: {
    line1: "1 Example Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
  filingStatus: FilingStatus.Single,
};

Deno.test("Schedule 2 line 9 rejects bare household employment tax", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      digital_assets: false,
      line23_other_taxes: 100,
    },
    schedule2: { line9_household_employment: 100 },
  };
  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "Schedule 2 line 9 differs from retained Schedule H tax",
  );
  await assertRejects(
    () => buildPdfBytes(pending, filer),
    Error,
    "Schedule 2 line 9 differs from retained Schedule H tax",
  );
});

Deno.test("Schedule 2 line 9 retains a sourced Schedule H withholding-only tax", async () => {
  const pending = {
    f1040: {
      filing_status: "single" as const,
      taxpayer_ssn: "111223333",
      digital_assets: false,
      line23_other_taxes: 100,
    },
    schedule2: { line9_household_employment: 100 },
    schedule_h: {
      employer_ein: "123456789",
      cash_wages_over_2025_limit: false,
      cash_wages_over_quarter_limit: false,
      federal_income_tax_withheld: 100,
      family_withholding_only_payroll: {
        all_household_employees_included: true as const,
        employer_ssn: "111223333",
        employee: {
          employee_id: "child-payroll-2025",
          employee_ssn: "222334444",
          relationship: "child" as const,
          relationship_source_reference: "2025 child relationship review",
          birth_date: "2006-06-15",
          birth_date_source_reference: "child birth record",
          payroll_source_reference: "2025 child payroll ledger",
          ordinary_cash_only: true as const,
          annual_cash_wages: 5_000,
          quarterly_cash_wages: [1_250, 1_250, 1_250, 1_250] as [
            number,
            number,
            number,
            number,
          ],
          federal_income_tax_withholding_requested_and_agreed: true as const,
          w4_source_reference: "2025 child Form W-4",
          w2: {
            source_reference: "2025 child Form W-2",
            employee_ssn: "222334444",
            box1_wages: 5_000,
            box2_federal_income_tax_withheld: 100,
            box3_social_security_wages: 0,
            box5_medicare_wages: 0,
          },
        },
      },
    },
  };
  const native = await buildMefBundle(pending, { filer, attachments: [] });
  assertStringIncludes(
    native.xml,
    "<CombinedFUTATaxPlusNetTaxesAmt>100</CombinedFUTATaxPlusNetTaxesAmt>",
  );
  const xsd = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
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
  for (
    const build of [
      () =>
        buildMefBundle({
          ...pending,
          schedule2: { line9_household_employment: 99 },
        }, { filer, attachments: [] }),
      () =>
        buildPdfBytes({
          ...pending,
          schedule2: { line9_household_employment: 99 },
        }, filer),
    ]
  ) {
    await assertRejects(
      build,
      Error,
      "Schedule 2 line 9 differs from retained Schedule H tax",
    );
  }
});
