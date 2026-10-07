import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { ZERO_FORM3800_PASSIVE_ACTIVITY } from "../../../nodes/inputs/f3800/calculation.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { form8941FiledFixture } from "../../../nodes/inputs/f8941/fixture.ts";
import { form8941Pdf } from "../../pdf/forms/f8941.ts";
import { testFiler } from "../test-filer.ts";
import { form8941 } from "./f8941.ts";
import { buildForm3800NonpassiveParts } from "./f3800_nonpassive.ts";

Deno.test("staged IRS8941 and official PDF project the same direct credit", () => {
  const filed = form8941FiledFixture();
  const filer = {
    ...testFiler(),
    primarySSN: filed.f8941.owner_ssn,
    fullName: filed.f8941.owner_name,
  };
  const xml = form8941.build(filed.f8941, {
    pending: filed,
    filer,
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
  }).join("");
  assertStringIncludes(xml, "<SHOPInd>true</SHOPInd>");
  assertStringIncludes(
    xml,
    "<SmllEmplrHIPFTEEmplForTaxYrCnt>5</SmllEmplrHIPFTEEmplForTaxYrCnt>",
  );
  assertStringIncludes(
    xml,
    "<SmallerAnnualWgPdOrHIPPdAmt>11698</SmallerAnnualWgPdOrHIPPdAmt>",
  );
  assertStringIncludes(
    xml,
    "<SumSmllrAmtAndCreditForHIPAmt>11698</SumSmllrAmtAndCreditForHIPAmt>",
  );
  const pdf = form8941Pdf.projectFields!(filed.f8941, filed);
  assertEquals(pdf.line4, 25_000);
  assertEquals(pdf.line5, 23_395);
  assertEquals(pdf.line12, 11_698);
  assertEquals(pdf.line16, 11_698);
  assertEquals(pdf.shop_yes, true);
  assertEquals(pdf.prior_year_shop_no, true);
});

Deno.test("Form 8941 line 16 has one specified Form 3800 line 4h and Part V source", () => {
  const parts = buildForm3800NonpassiveParts({
    tax: {
      filingStatus: FilingStatus.Single,
      regularTax: 40_000,
      alternativeMinimumTax: 0,
      foreignTaxCredit: 0,
      priorAllowableCredits: 0,
      tentativeMinimumTax: 20_000,
      standardCredit: 0,
      specifiedCredit: 11_698,
      standardCarryforward: 0,
      specifiedCarryforward: 0,
    },
    passiveActivity: ZERO_FORM3800_PASSIVE_ACTIVITY,
    passiveApplied: { standard: 0, specified: 0 },
    form8941: {
      credit: 11_698,
      appliedCredit: 11_698,
      documentId: "IRS8941_1",
    },
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
  assertEquals(parts.currentRows.map((row) => row.line), ["4h"]);
  assertEquals(parts.currentDetails.map((row) => row.line), ["4h"]);
  assertEquals(parts.currentAmounts[0].appliedCredit, 11_698);
  assertEquals(parts.lines.line38, 11_698);
  assertStringIncludes(
    parts.currentRows[0].xml,
    'referenceDocumentId="IRS8941_1"',
  );
  assertThrows(
    () =>
      buildForm3800NonpassiveParts({
        tax: {
          filingStatus: FilingStatus.Single,
          regularTax: 40_000,
          alternativeMinimumTax: 0,
          foreignTaxCredit: 0,
          priorAllowableCredits: 0,
          tentativeMinimumTax: 20_000,
          standardCredit: 0,
          specifiedCredit: 11_697,
          standardCarryforward: 0,
          specifiedCarryforward: 0,
        },
        passiveActivity: ZERO_FORM3800_PASSIVE_ACTIVITY,
        passiveApplied: { standard: 0, specified: 0 },
        form8941: {
          credit: 11_698,
          appliedCredit: 11_698,
          documentId: "IRS8941_1",
        },
        facilities: [],
        form8835DocumentIds: [],
        appliedCreditsByFacility: [],
        transferStatementIdsByFileName: {},
      }),
    Error,
    "credit amounts do not reconcile",
  );
});

Deno.test("Form 8941 printable copy binds Form 3800 line 4h document and final credit", () => {
  const filed = form8941FiledFixture();
  const pending = {
    ...filed,
    schedule3: { line6a_total: 11_698, line8_total: 11_698 },
    f1040: { line20_nonrefundable_credits: 11_698 },
  };
  const prepared = buildForm3800NonpassiveParts({
    tax: {
      filingStatus: FilingStatus.Single,
      regularTax: 40_000,
      alternativeMinimumTax: 0,
      foreignTaxCredit: 0,
      priorAllowableCredits: 0,
      tentativeMinimumTax: 20_000,
      standardCredit: 0,
      specifiedCredit: 11_698,
      standardCarryforward: 0,
      specifiedCarryforward: 0,
    },
    passiveActivity: ZERO_FORM3800_PASSIVE_ACTIVITY,
    passiveApplied: { standard: 0, specified: 0 },
    form8941: {
      credit: 11_698,
      appliedCredit: 11_698,
      documentId: "IRS8941_1",
    },
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
  const fields = form8941Pdf.projectFields!(filed.f8941, pending);
  assertEquals(
    form8941Pdf.instances!(fields, undefined, pending, prepared),
    [fields],
  );
  assertThrows(() => form8941Pdf.instances!(fields, undefined, pending));
  assertThrows(() =>
    form8941Pdf.instances!(fields, undefined, pending, {
      ...prepared,
      currentRows: prepared.currentRows.map((row) => ({
        ...row,
        metadata: { ...row.metadata, referenceDocumentId: "IRS8941_OTHER" },
      })),
    })
  );
  assertThrows(() =>
    form8941Pdf.instances!(fields, undefined, pending, {
      ...prepared,
      currentAmounts: prepared.currentAmounts.map((row) => ({
        ...row,
        appliedCredit: 11_697,
      })),
    })
  );
  assertThrows(() =>
    form8941Pdf.instances!(fields, undefined, {
      ...pending,
      f1040: { line20_nonrefundable_credits: 11_697 },
    }, prepared)
  );
});

Deno.test("staged Form 8941 rejects Schedule C payroll, deduction, owner and source tampering", () => {
  const filed = form8941FiledFixture();
  const filer = {
    ...testFiler(),
    primarySSN: filed.f8941.owner_ssn,
    fullName: filed.f8941.owner_name,
  };
  assertThrows(
    () =>
      form8941.build(filed.f8941, {
        pending: {
          ...filed,
          schedule_c: {
            schedule_cs: [{
              ...filed.schedule_c.schedule_cs[0],
              line_14_employee_benefits: 14_000,
            }],
          },
        },
        filer,
        documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      }),
    Error,
    "payroll or premium deduction differs from Schedule C",
  );
  assertThrows(
    () =>
      form8941.build(filed.f8941, {
        pending: filed,
        filer: { ...filer, primarySSN: "999887777" },
        documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      }),
    Error,
    "owner SSN differs",
  );
  assertThrows(
    () =>
      form8941.build({ ...filed.f8941, employment_ein: "999887777" }, {
        pending: filed,
        filer,
        documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      }),
    Error,
    "source differs from filed return",
  );
  assertThrows(
    () => form8941.build(filed.f8941, { pending: filed, filer }),
    Error,
    "one sourced Form 3800 document",
  );
  assertThrows(
    () =>
      form8941.build(filed.f8941, {
        pending: {
          ...filed,
          f3800: {
            ...filed.f3800,
            form8941_applied_credit: 11_697,
            tax_context: { specifiedCredit: 11_698 },
          },
        },
        filer,
        documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      }),
    Error,
    "tax-use allocation differs",
  );
});
