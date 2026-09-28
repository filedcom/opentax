import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { IraOwner } from "../../../nodes/intermediate/forms/form8606/index.ts";
import { form8606 } from "./f8606.ts";

const filer = {
  primarySSN: "123456789",
  nameLine1: "SMITH JOHN A",
  nameControl: "SMIT",
  fullName: "John A Smith",
  address: { line1: "1 MAIN ST", city: "AUSTIN", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
};

const partI = {
  print_line1_nondeductible: 6_000,
  print_line2_prior_basis: 5_000,
  print_line3_total_basis: 11_000,
  print_line14_remaining_basis: 11_000,
  source_traditional_distributions: 0,
  source_roth_conversion: 0,
  source_roth_distribution: 0,
  source_roth_basis_contributions: 0,
  source_roth_basis_conversions: 0,
  filing_details: {
    owner: IraOwner.Taxpayer,
    prior_basis_documented_from_2024_form8606: true as const,
    no_ira_distributions_or_conversions_confirmed: true as const,
  },
};

Deno.test("Form 8606: absent pending produces no document", () => {
  assertEquals(form8606.build([]), "");
});

Deno.test("Form 8606: taxpayer-owned no-activity Part I uses native ordered fields", () => {
  const xml = form8606.build(partI, { filer });
  assertStringIncludes(
    xml,
    "<IRS8606><Form8606IRANamelineTxt>John A Smith</Form8606IRANamelineTxt>",
  );
  assertStringIncludes(
    xml,
    "<NondedIRATxpyrWithIRASSN>123456789</NondedIRATxpyrWithIRASSN>",
  );
  assertStringIncludes(
    xml,
    "<NondedIRACurrTYNondedContriAmt>6000</NondedIRACurrTYNondedContriAmt>",
  );
  assertStringIncludes(
    xml,
    "<NondedIRABasisForPYAmt>5000</NondedIRABasisForPYAmt>",
  );
  assertStringIncludes(
    xml,
    "<NondedIRATotalIRAValueAmt>11000</NondedIRATotalIRAValueAmt>",
  );
  assertStringIncludes(
    xml,
    "<NondedIRATotalIRABasisAmt>11000</NondedIRATotalIRABasisAmt>",
  );
  assertEquals(xml.includes("NondeductibleContriAmt"), false);
});

Deno.test("Form 8606: flat legacy and explicit empty records cannot file", () => {
  const emptyRecord: unknown = {};
  const legacyRecord: unknown = { nondeductible_contributions: 6_000 };
  assertThrows(
    () => form8606.build(emptyRecord as Parameters<typeof form8606.build>[0]),
    Error,
    "empty pending record",
  );
  assertThrows(() =>
    form8606.build(
      legacyRecord as Parameters<typeof form8606.build>[0],
      { filer },
    )
  );
});

Deno.test("Form 8606: spouse owner and joint return reject instead of guessing", () => {
  assertThrows(
    () =>
      form8606.build({
        ...partI,
        filing_details: { ...partI.filing_details, owner: IraOwner.Spouse },
      }, { filer }),
    Error,
    "spouse-owned IRA",
  );
  assertThrows(
    () =>
      form8606.build(partI, {
        filer: { ...filer, filingStatus: FilingStatus.MarriedFilingJointly },
      }),
    Error,
    "joint returns",
  );
});

Deno.test("Form 8606: distributions, conversions, and Roth activity reject", () => {
  for (
    const sourceField of [
      "source_traditional_distributions",
      "source_roth_conversion",
      "source_roth_distribution",
      "source_roth_basis_contributions",
      "source_roth_basis_conversions",
    ] as const
  ) {
    assertThrows(
      () => form8606.build({ ...partI, [sourceField]: 1 }, { filer }),
      Error,
      "no-distribution, no-conversion",
    );
  }
});

Deno.test("Form 8606: line arithmetic and owner source confirmations are required", () => {
  assertThrows(
    () =>
      form8606.build({ ...partI, print_line14_remaining_basis: 10_000 }, {
        filer,
      }),
    Error,
    "line 3 = line 14",
  );
  assertThrows(
    () => form8606.build({ ...partI, filing_details: undefined }, { filer }),
    Error,
    "IRA owner",
  );
  assertThrows(
    () => form8606.build(partI),
    Error,
    "return header",
  );
});
