import { assertEquals } from "@std/assert";
import {
  form3800SpecifiedCreditLineSchema,
  form3800StandardCreditLineSchema,
  PassiveCreditReportingRoute,
} from "../../../nodes/intermediate/forms/form8582cr/credit-route.ts";
import { PassiveCreditSourceOrigin } from "../../../nodes/intermediate/forms/form8582cr/index.ts";
import { groupForm3800PassiveCreditVintages } from "../../../nodes/inputs/f3800/calculation.ts";
import {
  form3800CarryoverDetailXmlTags,
  form3800CurrentDetailXmlTags,
  form3800PassiveXmlTags,
  planForm3800PassiveXmlRows,
} from "./f3800_passive_tags.ts";

Deno.test("Form 3800 passive XML tags cover every source credit line", () => {
  assertEquals(
    Object.keys(form3800PassiveXmlTags).sort(),
    [
      ...form3800StandardCreditLineSchema.options,
      "3",
      ...form3800SpecifiedCreditLineSchema.options,
    ].sort(),
  );
  assertEquals(form3800PassiveXmlTags["1h"], {
    current: "Form8820CYCreditsGrp",
    carryover: "Frm8820CYCyovCrGrp",
  });
  assertEquals(form3800PassiveXmlTags["3"], {
    current: "Form8844CYCreditsGrp",
    carryover: "Frm8844CYCrovCrGrp",
  });
  assertEquals(form3800PassiveXmlTags["4d"], {
    current: "Form8586CYCreditsGrp",
    carryover: "Frm8586CYSpcfdCrGrp",
  });
  assertEquals(form3800PassiveXmlTags["2h"], {
    carryover: "Frm8931CYCfwdAllwCrGrp",
  });
  assertEquals(
    Object.keys(form3800CarryoverDetailXmlTags).sort(),
    Object.keys(form3800PassiveXmlTags).sort(),
  );
  assertEquals(
    form3800CarryoverDetailXmlTags["1h"],
    "Frm8820CYCyovCrAggrgtGrp",
  );
  assertEquals(
    form3800CarryoverDetailXmlTags["4d"],
    "Frm8586CYSpcfdCrAggrgtGrp",
  );
  assertEquals(
    Object.keys(form3800CurrentDetailXmlTags).sort(),
    Object.entries(form3800PassiveXmlTags).flatMap(([line, tags]) =>
      tags.current ? [line] : []
    ).sort(),
  );
  assertEquals(
    form3800CurrentDetailXmlTags["1h"],
    "Frm8820CYAggrgtAmtGrp",
  );
});

Deno.test("Form 3800 passive XML plan keeps one carryover group with source detail", () => {
  const source = (year: number, before: number, after: number) => ({
    activityReference: "Clinical activity",
    sourceForm: "Form 8820",
    sourceOrigin: { kind: PassiveCreditSourceOrigin.Self } as const,
    sourceDocumentReference: `${year} clinical credit statement`,
    form3800CreditLine: "1h" as const,
    reportingRoute: PassiveCreditReportingRoute.Form3800Line3,
    originatingTaxYear: year,
    beforePassiveLimit: before,
    afterPassiveLimit: after,
  });
  const planned = planForm3800PassiveXmlRows(
    groupForm3800PassiveCreditVintages([
      source(2025, 300, 200),
      source(2022, 100, 100),
      source(2024, 200, 150),
    ]),
  );
  assertEquals(
    planned.map((row) => ({
      part: row.part,
      tag: row.tag,
      currentDetailTag: row.currentDetailTag,
      detailTag: row.carryoverDetailTag,
      year: row.latestOriginatingTaxYear,
      before: row.beforePassiveLimit,
      after: row.afterPassiveLimit,
      sourceYears: row.sources.map((entry) => entry.originatingTaxYear),
      needsDetail: row.requiresSourceBreakdown,
    })),
    [
      {
        part: "current",
        tag: "Form8820CYCreditsGrp",
        currentDetailTag: "Frm8820CYAggrgtAmtGrp",
        detailTag: undefined,
        year: 2025,
        before: 300,
        after: 200,
        sourceYears: [2025],
        needsDetail: false,
      },
      {
        part: "carryover",
        tag: "Frm8820CYCyovCrGrp",
        currentDetailTag: undefined,
        detailTag: "Frm8820CYCyovCrAggrgtGrp",
        year: 2024,
        before: 300,
        after: 250,
        sourceYears: [2022, 2024],
        needsDetail: true,
      },
    ],
  );
});

Deno.test("Form 3800 passive XML summary year survives same-year sources", () => {
  const planned = planForm3800PassiveXmlRows(
    groupForm3800PassiveCreditVintages([
      {
        activityReference: "Rental A",
        sourceForm: "Form 8820",
        sourceOrigin: { kind: PassiveCreditSourceOrigin.Self },
        sourceDocumentReference: "2023 A statement",
        form3800CreditLine: "1h",
        reportingRoute: PassiveCreditReportingRoute.Form3800Line3,
        originatingTaxYear: 2023,
        beforePassiveLimit: 100,
        afterPassiveLimit: 60,
      },
      {
        activityReference: "Rental B",
        sourceForm: "Form 8820",
        sourceOrigin: {
          kind: PassiveCreditSourceOrigin.Partnership,
          entity_reference: "Rental partnership B",
          ein: "123456789",
        },
        sourceDocumentReference: "2023 B statement",
        form3800CreditLine: "1h",
        reportingRoute: PassiveCreditReportingRoute.Form3800Line3,
        originatingTaxYear: 2023,
        beforePassiveLimit: 200,
        afterPassiveLimit: 140,
      },
    ]),
  );
  assertEquals(planned.length, 1);
  assertEquals(planned[0].latestOriginatingTaxYear, 2023);
  assertEquals(planned[0].requiresSourceBreakdown, true);
  assertEquals(planned[0].sources.length, 2);
  assertEquals(planned[0].sources[1].sourceOrigin, {
    kind: PassiveCreditSourceOrigin.Partnership,
    entity_reference: "Rental partnership B",
    ein: "123456789",
  });
});
