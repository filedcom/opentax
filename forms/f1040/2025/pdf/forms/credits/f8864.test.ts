import { assertEquals, assertThrows } from "@std/assert";
import {
  directAgriBiodieselPending,
  directAgriBiodieselSource,
} from "../../../../nodes/inputs/f8864/fixture.ts";
import { FilingStatus } from "../../../../nodes/types.ts";
import { ZERO_FORM3800_PASSIVE_ACTIVITY } from "../../../../nodes/inputs/f3800/calculation.ts";
import { buildForm3800NonpassiveParts } from "../../../mef/forms/credits/f3800/f3800_nonpassive.ts";
import { form8864Pdf } from "./f8864.ts";

const prepared = buildForm3800NonpassiveParts({
  tax: {
    filingStatus: FilingStatus.Single,
    regularTax: 40_000,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 20_000,
    standardCredit: 500,
    specifiedCredit: 0,
    standardCarryforward: 0,
    specifiedCarryforward: 0,
  },
  passiveActivity: ZERO_FORM3800_PASSIVE_ACTIVITY,
  passiveApplied: { standard: 0, specified: 0 },
  form8864: { credit: 500, documentId: "IRS8864_1", appliedCredit: 500 },
  facilities: [],
  form8835DocumentIds: [],
  appliedCreditsByFacility: [],
  transferStatementIdsByFileName: {},
});
const finalPending = {
  ...directAgriBiodieselPending,
  f1040: {
    ...directAgriBiodieselPending.f1040,
    line20_nonrefundable_credits: 500,
  },
  schedule3: { line6a_total: 500, line8_total: 500 },
};

Deno.test("Form 8864 official PDF projects the dated direct producer lines", () => {
  const fields = Object.fromEntries(
    form8864Pdf.fields.map((entry) => [entry.domainKey, entry.pdfField]),
  );
  assertEquals(
    fields.line7_gallons,
    "topmostSubform[0].Page1[0].Table_Lines1-7[0].Line7[0].f1_22[0]",
  );
  assertEquals(
    fields.line8,
    "topmostSubform[0].Page1[0].Table_Lines1-7[0].Line8[0].f1_27[0]",
  );
  assertEquals(fields.line11, "topmostSubform[0].Page1[0].f1_30[0]");
  const projected = form8864Pdf.projectFields?.(
    directAgriBiodieselSource,
    directAgriBiodieselPending,
  );
  assertEquals(projected?.line7_gallons, undefined);
  assertEquals(projected?.line7_rate, undefined);
  assertEquals(projected?.line8_gallons, 2_500);
  assertEquals(projected?.line8_rate, "0.20");
  assertEquals(projected?.line11, 500);
  assertEquals(
    form8864Pdf.instances?.(
      projected ?? {},
      undefined,
      finalPending,
      prepared,
    )?.length,
    1,
  );
});

Deno.test("Form 8864 PDF rejects a missing Schedule C income inclusion", () => {
  const business = directAgriBiodieselPending.schedule_c.schedule_cs[0];
  assertThrows(
    () =>
      form8864Pdf.projectFields?.(
        directAgriBiodieselSource,
        {
          ...directAgriBiodieselPending,
          schedule_c: {
            schedule_cs: [{
              ...business,
              line_6_other_income: 0,
            }],
          },
        },
      ),
    Error,
    "line 6 other-income inclusion",
  );
});

Deno.test("Form 8864 PDF rejects missing or altered Form 3800 document identity", () => {
  const fields = form8864Pdf.projectFields?.(
    directAgriBiodieselSource,
    directAgriBiodieselPending,
  ) ?? {};
  assertThrows(
    () => form8864Pdf.instances?.(fields, undefined, finalPending),
    Error,
    "prepared MeF Form 3800 document",
  );
  assertThrows(
    () =>
      form8864Pdf.instances?.(fields, undefined, finalPending, {
        ...prepared,
        currentRows: prepared.currentRows.map((row) => ({
          ...row,
          metadata: { ...row.metadata, referenceDocumentId: "IRS8864_OTHER" },
        })),
      }),
    Error,
    "document ID",
  );
  assertEquals(form8864Pdf.projectFields?.({}, {}), {});
  assertEquals(form8864Pdf.instances?.({}, undefined, {}), []);
});

Deno.test("Form 8864 PDF joins applied credit to Schedule 3 and finalized Form 1040", () => {
  const fields = form8864Pdf.projectFields!(
    directAgriBiodieselSource,
    finalPending,
  );
  assertEquals(
    form8864Pdf.instances!(fields, undefined, finalPending, prepared),
    [fields],
  );
  assertThrows(() =>
    form8864Pdf.instances!(fields, undefined, finalPending, {
      ...prepared,
      currentAmounts: prepared.currentAmounts.map((row) => ({
        ...row,
        appliedCredit: 499,
      })),
      currentDetails: prepared.currentDetails.map((row) => ({
        ...row,
        appliedCredit: 499,
      })),
    })
  );
  assertThrows(() =>
    form8864Pdf.instances!(fields, undefined, {
      ...finalPending,
      f3800: {
        ...finalPending.f3800,
        form8864_applied_credit: 499,
      },
    }, prepared)
  );
  assertThrows(() =>
    form8864Pdf.instances!(fields, undefined, {
      ...finalPending,
      f1040: {
        ...finalPending.f1040,
        line20_nonrefundable_credits: 499,
      },
    }, prepared)
  );
  assertThrows(() =>
    form8864Pdf.instances!(fields, undefined, {
      ...finalPending,
      schedule3: { line6a_total: 499, line8_total: 499 },
    }, prepared)
  );
});
