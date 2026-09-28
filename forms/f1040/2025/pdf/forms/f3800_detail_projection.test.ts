import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm3800Nonpassive,
  type Form3800PassiveTaxUseVintage,
  ZERO_FORM3800_PASSIVE_ACTIVITY,
} from "../../../nodes/inputs/f3800/calculation.ts";
import { PassiveCreditReportingRoute } from "../../../nodes/intermediate/forms/form8582cr/credit-route.ts";
import { PassiveCreditSourceOrigin } from "../../../nodes/intermediate/forms/form8582cr/source.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import type { Form3800DocumentParts } from "../../mef/forms/f3800_document.ts";
import { buildForm3800PassiveRowXml } from "../../mef/forms/f3800_passive_rows.ts";
import {
  projectForm3800PartVFields,
  projectForm3800PartVIFields,
} from "./f3800_detail_projection.ts";
import { form3800PartVFields, form3800PartVIFields } from "./f3800_fields.ts";

const lines = calculateForm3800Nonpassive({
  filingStatus: FilingStatus.Single,
  regularTax: 50_000,
  alternativeMinimumTax: 0,
  foreignTaxCredit: 0,
  priorAllowableCredits: 0,
  tentativeMinimumTax: 0,
  standardCredit: 250,
  specifiedCredit: 0,
}, ZERO_FORM3800_PASSIVE_ACTIVITY);

const current: Form3800DocumentParts = {
  lines,
  transferStatementIds: [],
  currentRows: [{
    line: "1f",
    xml: "<Form8835PartIICYCreditsGrp/>",
    metadata: { sourceCount: 2, transferRegistrationNumber: "CAABC12ABCDE" },
    entityCredits: [],
  }],
  currentAmounts: [{
    line: "1f",
    nonpassiveCredit: 300,
    transferOutCredit: 50,
    passiveBeforeLimit: 0,
    passiveAfterLimit: 0,
    totalCredit: 250,
    appliedCredit: 150,
  }],
  carryoverRows: [],
  currentDetails: [{
    line: "1f",
    credit: 200,
    transferOutCredit: 50,
    transferRegistrationNumber: "CAABC12ABCDE",
    appliedCredit: 100,
    sourceDocumentId: "IRS8835_1",
  }, {
    line: "1f",
    credit: 100,
    appliedCredit: 50,
    sourceDocumentId: "IRS8835_2",
  }],
  carryoverDetails: [],
  passiveCurrentDetails: [],
  passiveCarryoverDetails: [],
};

Deno.test("Form 3800 Part V prints both facility sources, sale, tax use, and carryforward", () => {
  const fields = projectForm3800PartVFields(current);
  const first = form3800PartVFields(1);
  const second = form3800PartVFields(2);
  assertEquals(fields[first.a], "1f");
  assertEquals(fields[first.b], "CAABC12ABCDE");
  assertEquals(fields[first.e], 200);
  assertEquals(fields[first.f1], -50);
  assertEquals(fields[first.g], 150);
  assertEquals(fields[first.h2], 150);
  assertEquals(fields[first.i1], 100);
  assertEquals(fields[first.k], 50);
  assertEquals(fields[second.e], 100);
  assertEquals(fields[second.k], 50);
});

Deno.test("Form 3800 Part V rejects an omitted aggregate source or impossible sale", () => {
  assertThrows(
    () =>
      projectForm3800PartVFields({
        ...current,
        currentDetails: current.currentDetails.slice(0, 1),
      }),
    Error,
    "source count does not reconcile",
  );
  assertThrows(
    () =>
      projectForm3800PartVFields({
        ...current,
        currentDetails: [{
          ...current.currentDetails[0],
          transferOutCredit: 201,
        }, current.currentDetails[1]],
      }),
    Error,
    "nonpassive source is invalid",
  );
});

const own: Form3800PassiveTaxUseVintage = {
  sourceKey: "own-2023",
  activityReference: "Clinical activity",
  sourceForm: "Form 8820",
  sourceDocumentReference: "2023 clinical credit statement",
  sourceOrigin: { kind: PassiveCreditSourceOrigin.Self },
  form3800CreditLine: "1h",
  reportingRoute: PassiveCreditReportingRoute.Form3800Line3,
  originatingTaxYear: 2023,
  beforePassiveLimit: 100,
  afterPassiveLimit: 80,
  availableAfterPassiveLimit: 80,
  appliedAgainstTax: 80,
  unusedAfterTaxLimit: 0,
};
const partnership: Form3800PassiveTaxUseVintage = {
  ...own,
  sourceKey: "partnership-2024",
  sourceDocumentReference: "2024 partnership K-1 statement",
  sourceOrigin: {
    kind: PassiveCreditSourceOrigin.Partnership,
    entity_reference: "Clinical partnership",
    ein: "123456789",
  },
  originatingTaxYear: 2024,
  beforePassiveLimit: 200,
  afterPassiveLimit: 150,
  availableAfterPassiveLimit: 150,
  appliedAgainstTax: 100,
  unusedAfterTaxLimit: 50,
};
const carryover = buildForm3800PassiveRowXml([own, partnership], {});
const withCarryover: Form3800DocumentParts = {
  ...current,
  currentRows: [],
  currentAmounts: [],
  currentDetails: [],
  carryoverRows: carryover.partIV,
  passiveCarryoverDetails: carryover.partVI,
};

Deno.test("Form 3800 Part V preserves a passive source beside nonpassive facilities", () => {
  const passive = {
    ...partnership,
    sourceKey: "partnership-2025",
    form3800CreditLine: "1f" as const,
    originatingTaxYear: 2025,
    beforePassiveLimit: 120,
    afterPassiveLimit: 80,
    availableAfterPassiveLimit: 80,
    appliedAgainstTax: 40,
    unusedAfterTaxLimit: 40,
  };
  const fields = projectForm3800PartVFields({
    ...current,
    currentRows: [{
      ...current.currentRows[0],
      metadata: { ...current.currentRows[0].metadata, sourceCount: 3 },
    }],
    currentAmounts: [{
      ...current.currentAmounts[0],
      passiveBeforeLimit: 120,
      passiveAfterLimit: 80,
      totalCredit: 330,
      appliedCredit: 190,
    }],
    passiveCurrentDetails: [{ line: "1f", source: passive }],
  });
  const third = form3800PartVFields(3);
  assertEquals(fields[third.a], "1f");
  assertEquals(fields[third.c1], "123456789");
  assertEquals(fields[third.d1], 120);
  assertEquals(fields[third.d4], 80);
  assertEquals(fields[third.g], 80);
  assertEquals(fields[third.i1], 40);
  assertEquals(fields[third.k], 40);
});

Deno.test("Form 3800 Part VI prints each source year, EIN, passive allowance, and unused credit", () => {
  const fields = projectForm3800PartVIFields(withCarryover);
  const first = form3800PartVIFields(1);
  const second = form3800PartVIFields(2);
  assertEquals(fields[first.a], "1h");
  assertEquals(fields[first.b], 2023);
  assertEquals(fields[first.d], 100);
  assertEquals(fields[first.e], 80);
  assertEquals(fields[first.g], 80);
  assertEquals(fields[first.i], 0);
  assertEquals(fields[second.b], 2024);
  assertEquals(fields[second.c], "123456789");
  assertEquals(fields[second.i], 50);
});

Deno.test("Form 3800 Part VI rejects a missing or reordered vintage", () => {
  assertThrows(
    () =>
      projectForm3800PartVIFields({
        ...withCarryover,
        passiveCarryoverDetails: withCarryover.passiveCarryoverDetails.slice(
          0,
          1,
        ),
      }),
    Error,
    "sources do not reconcile",
  );
  assertThrows(
    () =>
      projectForm3800PartVIFields({
        ...withCarryover,
        passiveCarryoverDetails: [...withCarryover.passiveCarryoverDetails]
          .reverse(),
      }),
    Error,
    "sources do not reconcile",
  );
});
