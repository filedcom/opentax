import { assertEquals, assertThrows } from "@std/assert";
import { ZERO_FORM3800_PASSIVE_ACTIVITY } from "../../../nodes/inputs/f3800/calculation.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { testFiler } from "../../mef/test-filer.ts";
import { buildForm3800NonpassiveParts } from "../../mef/forms/f3800_nonpassive.ts";
import {
  form3800HeaderFields,
  form3800PartIAndIIFields,
  form3800PartIIIFields,
  form3800PartIVFields,
} from "./f3800_fields.ts";
import {
  projectForm3800HeaderFields,
  projectForm3800PartIAndIIFields,
  projectForm3800PartIIIFields,
  projectForm3800PartIVFields,
} from "./f3800_print_projection.ts";

const parts = buildForm3800NonpassiveParts({
  tax: {
    filingStatus: FilingStatus.Single,
    regularTax: 50_000,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 0,
    standardCredit: 100,
    specifiedCredit: 0,
  },
  passiveActivity: ZERO_FORM3800_PASSIVE_ACTIVITY,
  passiveApplied: { standard: 0, specified: 0 },
  form8820: {
    credit: 100,
    documentId: "IRS8820_1",
    appliedCredit: 100,
    sources: [{ credit: 100 }],
  },
  facilities: [],
  form8835DocumentIds: [],
  appliedCreditsByFacility: [],
  transferStatementIdsByFileName: {},
});

Deno.test("Form 3800 printable header uses the filed filer and source-backed election", () => {
  const fields = projectForm3800HeaderFields(parts, testFiler());
  assertEquals(fields[form3800HeaderFields.filerName], "TAXPAYER TEST");
  assertEquals(fields[form3800HeaderFields.filerTin], "123456789");
  assertEquals(fields[form3800HeaderFields.camtAndBeatNo], true);
  assertEquals(fields[form3800HeaderFields.transferElectionNo], true);
  assertEquals(fields[form3800HeaderFields.transferElectionYes], undefined);
  assertEquals(fields[form3800HeaderFields.transferStatementCount], undefined);

  const transferred = {
    ...parts,
    transferStatementIds: ["BinaryAttachment_1"],
    currentAmounts: parts.currentAmounts.map((row) => ({
      ...row,
      transferOutCredit: 25,
    })),
  };
  const transferFields = projectForm3800HeaderFields(
    transferred,
    testFiler(),
  );
  assertEquals(transferFields[form3800HeaderFields.transferElectionYes], true);
  assertEquals(transferFields[form3800HeaderFields.transferStatementCount], 1);
});

Deno.test("Form 3800 printable header rejects missing filer, unbound transfer and unsourced carryforward checkbox", () => {
  assertThrows(
    () =>
      projectForm3800HeaderFields(parts, {
        ...testFiler(),
        nameLine1: " ",
      }),
    Error,
    "filer identity is invalid",
  );
  assertThrows(
    () =>
      projectForm3800HeaderFields({
        ...parts,
        transferStatementIds: ["BinaryAttachment_1"],
      }, testFiler()),
    Error,
    "transfer election does not reconcile",
  );
  assertThrows(
    () =>
      projectForm3800HeaderFields({
        ...parts,
        lines: { ...parts.lines, line4: 1 },
      }, testFiler()),
    Error,
    "revised carryforward answer lacks a typed source",
  );
});

Deno.test("Form 3800 printable Parts I-II project source-backed line 38 to the exact PDF field", () => {
  const fields = projectForm3800PartIAndIIFields(parts, 100);
  assertEquals(Object.keys(fields).length, 39);
  assertEquals(fields[form3800PartIAndIIFields.line1], 100);
  assertEquals(fields[form3800PartIAndIIFields.line17], 100);
  assertEquals(fields[form3800PartIAndIIFields.line38], 100);
});

Deno.test("Form 3800 printable projection rejects Schedule 3 and source-use mismatches", () => {
  assertThrows(
    () => projectForm3800PartIAndIIFields(parts, 99),
    Error,
    "does not match Schedule 3 line 6a",
  );
  assertThrows(
    () =>
      projectForm3800PartIAndIIFields({
        ...parts,
        currentAmounts: parts.currentAmounts.map((row) => ({
          ...row,
          appliedCredit: 99,
        })),
      }, 100),
    Error,
    "source tax use does not reconcile",
  );
});

Deno.test("Form 3800 printable Part III projects source and subtotal columns from the native row", () => {
  const fields = projectForm3800PartIIIFields(parts);
  const line1h = form3800PartIIIFields("1h");
  const subtotal = form3800PartIIIFields("2");
  const total = form3800PartIIIFields("6");
  assertEquals(fields[line1h.e], 100);
  assertEquals(fields[line1h.g], 100);
  assertEquals(fields[line1h.i], 100);
  assertEquals(fields[subtotal.g], 100);
  assertEquals(fields[total.i], 100);
});

Deno.test("Form 3800 printable Part III rejects a missing source row", () => {
  assertThrows(
    () => projectForm3800PartIIIFields({ ...parts, currentRows: [] }),
    Error,
    "source rows do not reconcile",
  );
});

const carryoverParts = {
  ...parts,
  carryoverRows: [{
    line: "1h" as const,
    sourceKeys: ["clinical-2023", "clinical-2024"],
    originatingTaxYear: 2024,
    entity: { ein: "123456789" },
    amount: {
      line: "1h" as const,
      passiveBeforeLimit: 300,
      passiveAfterLimit: 230,
      nonpassiveCredit: 0,
      appliedCredit: 180,
      recapturedOrAdjusted: 0,
      carryforwardCredit: 50,
    },
  }],
};

Deno.test("Form 3800 printable Part IV retains source year, EIN, count, tax use and totals", () => {
  const fields = projectForm3800PartIVFields(carryoverParts);
  const line = form3800PartIVFields("1h");
  const subtotal = form3800PartIVFields("6");
  const total = form3800PartIVFields("7");
  assertEquals(fields[line.a], 2);
  assertEquals(fields[line.b], 2024);
  assertEquals(fields[line.c], "123456789");
  assertEquals(fields[line.d], 300);
  assertEquals(fields[line.e], 230);
  assertEquals(fields[line.g], 180);
  assertEquals(fields[line.i], 50);
  assertEquals(fields[subtotal.i], 50);
  assertEquals(fields[total.g], 180);
});

Deno.test("Form 3800 printable Part IV rejects lost provenance and impossible carryforward", () => {
  assertThrows(
    () =>
      projectForm3800PartIVFields({
        ...carryoverParts,
        carryoverRows: [{ ...carryoverParts.carryoverRows[0], sourceKeys: [] }],
      }),
    Error,
    "source identity is invalid",
  );
  assertThrows(
    () =>
      projectForm3800PartIVFields({
        ...carryoverParts,
        carryoverRows: [{
          ...carryoverParts.carryoverRows[0],
          amount: {
            ...carryoverParts.carryoverRows[0].amount,
            carryforwardCredit: 51,
          },
        }],
      }),
    Error,
    "tax use does not reconcile",
  );
});
