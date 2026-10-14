import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { ZERO_FORM3800_PASSIVE_ACTIVITY } from "../../../../../nodes/inputs/credits/business/f3800/calculation.ts";
import { form8994MatchedPending } from "../../../../../nodes/inputs/credits/business/f8994/fixture.ts";
import { reconcileForm8994DirectEmployer } from "../../../../domains/credits/business/form8994/form8994_source.ts";
import { buildForm3800NonpassiveParts } from "./f3800/f3800_nonpassive.ts";
import { form8994 } from "./f8994.ts";

const tax = {
  filingStatus: FilingStatus.Single as const,
  regularTax: 40_000,
  alternativeMinimumTax: 0,
  foreignTaxCredit: 0,
  priorAllowableCredits: 0,
  tentativeMinimumTax: 20_000,
  standardCredit: 0,
  specifiedCredit: 1_250,
  standardCarryforward: 0,
  specifiedCarryforward: 0,
};

function parts(credit = 1_250, appliedCredit = 1_250) {
  return buildForm3800NonpassiveParts({
    tax,
    passiveActivity: ZERO_FORM3800_PASSIVE_ACTIVITY,
    passiveApplied: { standard: 0, specified: 0 },
    form8994: {
      credit,
      documentId: "IRS8994_1",
      appliedCredit,
    },
    facilities: [],
    form8835DocumentIds: [],
    appliedCreditsByFacility: [],
    transferStatementIdsByFileName: {},
  });
}

Deno.test("Form 8994 stages one sourced specified Form 3800 line 4j and Part V row", () => {
  const filed = parts();
  assertEquals(filed.currentRows.map((row) => row.line), ["4j"]);
  assertEquals(filed.currentAmounts.map((row) => row.line), ["4j"]);
  assertEquals(filed.currentDetails.map((row) => row.line), ["4j"]);
  assertEquals(filed.currentAmounts[0].appliedCredit, 1_250);
  assertEquals(filed.lines.line38, 1_250);
  assertStringIncludes(
    filed.currentRows[0].xml,
    'referenceDocumentId="IRS8994_1"',
  );
  assertThrows(
    () => parts(1_249, 1_249),
    Error,
    "credit amounts do not reconcile",
  );
  assertThrows(
    () => parts(1_249),
    Error,
    "invalid Form 8994 line 4j allocation",
  );
});

Deno.test("Form 8994 full Schedule C wage reduction persists under partial tax use", () => {
  const pending = {
    ...form8994MatchedPending,
    f3800: {
      ...form8994MatchedPending.f3800,
      form8994_applied_credit: 500,
    },
    schedule_c: {
      ...form8994MatchedPending.schedule_c,
      schedule_cs: [{
        ...form8994MatchedPending.schedule_c.schedule_cs[0],
      }],
    },
  };
  assertEquals(
    reconcileForm8994DirectEmployer(pending.f8994, pending, 500).lines.line3,
    1_250,
  );
  assertThrows(
    () => reconcileForm8994DirectEmployer(pending.f8994, pending, 1251),
    Error,
    "deduction reduction differs",
  );
  assertThrows(
    () =>
      reconcileForm8994DirectEmployer(pending.f8994, {
        ...pending,
        schedule_c: {
          ...pending.schedule_c,
          schedule_cs: [{
            ...pending.schedule_c.schedule_cs[0],
            line_26_wages: 49_999,
          }],
        },
      }),
    Error,
    "gross wage ledger",
  );
});

Deno.test("IRS8994 native projection uses the verified A–D and lines 1–3 tags", () => {
  const xml = form8994.build(form8994MatchedPending.f8994, {
    pending: form8994MatchedPending,
    documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
  });
  assertStringIncludes(
    xml,
    "<WrttnPlcy2WksPdFamMedLvInd>true</WrttnPlcy2WksPdFamMedLvInd>",
  );
  assertStringIncludes(
    xml,
    "<WrttnPolicyNoninterferenceInd>true</WrttnPolicyNoninterferenceInd>",
  );
  assertStringIncludes(
    xml,
    "<TotPaidFamilyMedicalLeaveCrAmt>1250</TotPaidFamilyMedicalLeaveCrAmt>",
  );
  assertStringIncludes(
    xml,
    "<EmplrCrPdFamilyMedLeaveAmt>1250</EmplrCrPdFamilyMedLeaveAmt>",
  );
  assertThrows(
    () =>
      form8994.build(form8994MatchedPending.f8994, {
        pending: form8994MatchedPending,
      }),
    Error,
    "one sourced Form 3800 document",
  );
  assertThrows(
    () =>
      form8994.build(form8994MatchedPending.f8994, {
        pending: {
          ...form8994MatchedPending,
          f3800: {
            ...form8994MatchedPending.f3800,
            f8994_direct_employer_credit: {
              ...form8994MatchedPending.f3800.f8994_direct_employer_credit,
              credit_amount: 1_249,
            },
          },
        },
        documentIdsByPendingKey: { f3800: ["IRS3800_1"] },
      }),
    Error,
    "source credit differs from filed form",
  );
});
