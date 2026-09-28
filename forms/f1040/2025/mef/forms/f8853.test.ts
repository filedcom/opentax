import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import { MsaOwner } from "../../../nodes/intermediate/forms/form8853/index.ts";
import { form8853 } from "./f8853.ts";

const filer = {
  primarySSN: "123456789",
  nameLine1: "SMITH JOHN A",
  nameControl: "SMIT",
  address: { line1: "1 MAIN ST", city: "AUSTIN", state: "TX", zip: "78701" },
  filingStatus: FilingStatus.Single,
};

const source = {
  archer_msa_distributions: 3_000,
  archer_msa_rollover: 0,
  archer_msa_qualified_expenses: 3_000,
  archer_msa_exception: false,
  archer_distribution_filing_details: {
    owner: MsaOwner.Taxpayer,
    single_archer_msa_distribution_confirmed: true as const,
    gross_amount_confirmed_from_1099sa: true as const,
    qualified_expenses_unreimbursed_confirmed: true as const,
    no_other_form8853_activity_confirmed: true as const,
  },
};

const context = { filer, pending: {} };

Deno.test("Form 8853: absent pending produces no document", () => {
  assertEquals(form8853.build([]), "");
});

Deno.test("Form 8853: fully qualified Archer distribution emits native group even with zero tax", () => {
  const xml = form8853.build(source, context);
  assertStringIncludes(xml, "<IRS8853><ArcherMSAAndMedcrAdvntgMSAGrp>");
  assertStringIncludes(xml, "<MSAHolderSSN>123456789</MSAHolderSSN>");
  assertStringIncludes(
    xml,
    "<TotalArcherMSADistributionAmt>3000</TotalArcherMSADistributionAmt>",
  );
  assertStringIncludes(
    xml,
    "<ArcherMSADistriRollOverAmt>0</ArcherMSADistriRollOverAmt>",
  );
  assertStringIncludes(
    xml,
    "<ArcherMSANetDistributionAmt>3000</ArcherMSANetDistributionAmt>",
  );
  assertStringIncludes(
    xml,
    "<ArcherMSAUnreimbQualMedExpAmt>3000</ArcherMSAUnreimbQualMedExpAmt>",
  );
  assertStringIncludes(
    xml,
    "<TaxableArcherMSADistriAmt>0</TaxableArcherMSADistriAmt>",
  );
  assertEquals(xml.includes("SectCLTCInsuranceCntrctGrp"), false);
  assertEquals(xml.includes("EmployerArcherMSAContriAmt"), false);
});

Deno.test("Form 8853: flat source and explicit empty records reject", () => {
  assertThrows(() => form8853.build({}), Error, "empty pending record");
  assertThrows(
    () => form8853.build({ employer_archer_msa: 3_650 }, context),
    Error,
    "source confirmations",
  );
});

Deno.test("Form 8853: missing source attestations and owner reject", () => {
  assertThrows(
    () =>
      form8853.build({
        ...source,
        archer_distribution_filing_details: undefined,
      }, context),
    Error,
    "source confirmations",
  );
  assertThrows(
    () =>
      form8853.build({
        ...source,
        archer_distribution_filing_details: {
          ...source.archer_distribution_filing_details,
          owner: MsaOwner.Spouse,
        },
      }, context),
    Error,
    "spouse-owned MSA",
  );
});

Deno.test("Form 8853: partial medical use, rollover, and exception paths reject", () => {
  assertThrows(
    () =>
      form8853.build(
        { ...source, archer_msa_qualified_expenses: 2_000 },
        context,
      ),
    Error,
    "fully matched",
  );
  assertThrows(
    () => form8853.build({ ...source, archer_msa_rollover: 500 }, context),
    Error,
    "no rollover",
  );
  assertThrows(
    () => form8853.build({ ...source, archer_msa_exception: true }, context),
    Error,
    "no rollover or tax exception",
  );
});

Deno.test("Form 8853: contribution, Medicare, and LTC activity reject", () => {
  assertThrows(
    () =>
      form8853.build(
        { ...source, taxpayer_archer_msa_contributions: 1_000 },
        context,
      ),
    Error,
    "without contributions",
  );
  assertThrows(
    () =>
      form8853.build(
        { ...source, medicare_advantage_distributions: 1_000 },
        context,
      ),
    Error,
    "Medicare MSA",
  );
  assertThrows(
    () => form8853.build({ ...source, ltc_gross_payments: 1_000 }, context),
    Error,
    "LTC activity",
  );
});

Deno.test("Form 8853: joint header and conflicting schedules reject", () => {
  assertThrows(
    () =>
      form8853.build(source, {
        filer: { ...filer, filingStatus: FilingStatus.MarriedFilingJointly },
        pending: {},
      }),
    Error,
    "joint returns",
  );
  assertThrows(
    () =>
      form8853.build(source, {
        filer,
        pending: { schedule1: { line8e_archer_msa_dist: 100 } },
      }),
    Error,
    "conflicts with Schedule 1 or 2",
  );
  assertThrows(
    () => form8853.build(source, { filer }),
    Error,
    "pending return reconciliation context",
  );
});
