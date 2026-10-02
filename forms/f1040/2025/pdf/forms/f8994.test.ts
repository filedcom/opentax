import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../nodes/types.ts";
import { ZERO_FORM3800_PASSIVE_ACTIVITY } from "../../../nodes/inputs/f3800/calculation.ts";
import {
  form8994DirectEmployer,
  form8994MatchedPending,
} from "../../../nodes/inputs/f8994/fixture.ts";
import { buildForm3800NonpassiveParts } from "../../mef/forms/f3800_nonpassive.ts";
import { form8994Pdf } from "./f8994.ts";

Deno.test("Form 8994 PDF maps official yes boxes and the direct credit", () => {
  const fields = Object.fromEntries(
    form8994Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(fields.line_a_yes, "topmostSubform[0].Page1[0].c1_1[0]");
  assertEquals(fields.line_d_yes, "topmostSubform[0].Page1[0].c1_4[0]");
  assertEquals(fields.line1, "topmostSubform[0].Page1[0].f1_03[0]");
  assertEquals(fields.line3, "topmostSubform[0].Page1[0].f1_05[0]");
  const projected = form8994Pdf.projectFields?.(
    form8994DirectEmployer,
    form8994MatchedPending,
  );
  assertEquals(projected?.line_a_yes, true);
  assertEquals(projected?.line_d_yes, true);
  assertEquals(projected?.line1, 1_250);
  assertEquals(projected?.line2, undefined);
  assertEquals(projected?.line3, 1_250);
});

Deno.test("Form 8994 PDF skips unrelated returns", () => {
  assertEquals(form8994Pdf.projectFields?.({}, {}), {});
});

Deno.test("Form 8994 PDF rejects a mismatched Schedule C wage reduction", () => {
  const business = form8994MatchedPending.schedule_c.schedule_cs[0];
  assertThrows(
    () =>
      form8994Pdf.projectFields?.(form8994DirectEmployer, {
        ...form8994MatchedPending,
        schedule_c: {
          schedule_cs: [{
            ...business,
            line_26_other_employment_credits: 0,
          }],
        },
      }),
    Error,
    "deduction reduction",
  );
});

Deno.test("Form 8994 printable copy binds Form 3800 line 4j document and final credit", () => {
  const pending = {
    ...form8994MatchedPending,
    f1040: {
      ...form8994MatchedPending.f1040,
      line20_nonrefundable_credits: 1_250,
    },
    schedule3: { line6a_total: 1_250, line8_total: 1_250 },
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
      specifiedCredit: 1_250,
      standardCarryforward: 0,
      specifiedCarryforward: 0,
    },
    passiveActivity: ZERO_FORM3800_PASSIVE_ACTIVITY,
    passiveApplied: { standard: 0, specified: 0 },
    form8994: {
      credit: 1_250,
      appliedCredit: 1_250,
      documentId: "IRS8994_1",
    },
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
  const fields = form8994Pdf.projectFields!(pending.f8994, pending);
  assertEquals(
    form8994Pdf.instances!(fields, undefined, pending, prepared),
    [fields],
  );
  assertThrows(() => form8994Pdf.instances!(fields, undefined, pending));
  assertThrows(() =>
    form8994Pdf.instances!(fields, undefined, pending, {
      ...prepared,
      currentRows: prepared.currentRows.map((row) => ({
        ...row,
        metadata: { ...row.metadata, referenceDocumentId: "IRS8994_OTHER" },
      })),
    })
  );
  assertThrows(() =>
    form8994Pdf.instances!(fields, undefined, pending, {
      ...prepared,
      currentAmounts: prepared.currentAmounts.map((row) => ({
        ...row,
        appliedCredit: 1_249,
      })),
    })
  );
  assertThrows(() =>
    form8994Pdf.instances!(fields, undefined, {
      ...pending,
      f1040: {
        ...pending.f1040,
        line20_nonrefundable_credits: 1_249,
      },
    }, prepared)
  );
});
