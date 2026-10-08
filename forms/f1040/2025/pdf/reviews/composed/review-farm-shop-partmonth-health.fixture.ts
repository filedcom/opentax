import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { independentHealthInputs } from "../health/form7206-independent-owner.fixture.ts";
import {
  form8941FarmShopInputs,
  form8941FarmShopWotcInputs,
} from "./review-8941-farm-shop.fixture.ts";
import { form8941PartMonthInputs } from "./review-8941-partmonth.fixture.ts";
import type { PdfReviewFixture } from "../../review-fixtures.ts";

const farmForms = [
  "f1040",
  "schedule1",
  "schedule2",
  "schedule3",
  "schedule_f",
  "schedule_se",
  "f3800",
  "form6251",
  "form8995",
  "f8941",
];
const partMonthForms = [
  "f1040",
  "schedule1",
  "schedule2",
  "schedule3",
  "schedule_c",
  "schedule_se",
  "f3800",
  "form6251",
  "form8995",
  "f8941",
];
const healthForms = [
  "f1040",
  "schedule1",
  "schedule2",
  "schedule_c",
  "schedule_c",
  "schedule_se",
  "schedule_se",
  "form7206",
  "form7206",
  "form8995",
];

/** Exact public sources and copy inventories from four reviewed farm packets. */
export function ownedFarmShopReviewFixtures(
  wotcBase: PdfReviewFixture,
): readonly PdfReviewFixture[] {
  return ([
    ["full-use", form8941FarmShopInputs(250000), farmForms],
    ["limited-use", form8941FarmShopInputs(170000), farmForms],
    [
      "zero-use",
      form8941FarmShopInputs(90000),
      farmForms.filter((form) => form !== "schedule3"),
    ],
    ["shop-wotc", form8941FarmShopWotcInputs(wotcBase), [
      ...farmForms.slice(0, 7),
      "f5884",
      ...farmForms.slice(7),
    ]],
  ] as const).map(([use, inputs, expectedPdfForms]) => ({
    id: `owned-farm-shop-${use}`,
    inputs,
    filer: extractFilerIdentity(inputs.general)!,
    expectedPdfForms,
    reviewFocus: [
      "Issued farm receipts, complete payroll and paid SHOP premiums reconcile to the owned Schedule F employer",
      "Full determined Form 8941 credit reduces Schedule F employee benefits before owner SE and QBI",
      `Reviewed ${use} native return and every filled PDF copy retain the sourced credit and current Form 3800 use`,
    ],
  }));
}

/** Actual carrier daily-billed segment sources from two reviewed packets. */
export function carrierDailyBilledShopReviewFixtures(): readonly PdfReviewFixture[] {
  return ([
    ["full-use", 350000],
    ["partial-use", 210000],
  ] as const).map(([use, receipts]) => {
    const inputs = form8941PartMonthInputs(receipts);
    return {
      id: `carrier-daily-billed-shop-${use}`,
      inputs,
      filer: extractFilerIdentity(inputs.general)!,
      expectedPdfForms: partMonthForms,
      reviewFocus: [
        "Dated marriage, birth and divorce enrollment events match carrier daily-billed invoice and payment segments",
        "Full determined Form 8941 credit reduces Schedule C benefits before owner SE and QBI",
        `Reviewed ${use} full native return and all filled PDF copies retain the sourced current Form 3800 use`,
      ],
    };
  });
}

/** Six previously reviewed independent primary/spouse business health packets. */
export function independentOwnerHealthReviewFixtures(): readonly PdfReviewFixture[] {
  return ([
    ["both-full", 500, 0, 0, true],
    ["primary-income-limited", 1200, 0, 0, true],
    ["primary-months-excluded", 500, 12, 0, true],
    ["both-months-excluded", 500, 12, 12, true],
    ["one-established-plan-two-owned-businesses", 500, 0, 0, false],
    ["different-owner-eligible-months", 500, 2, 4, true],
  ] as const).map(([use, premium, excludedT, excludedS, primaryPlan]) => {
    const inputs = independentHealthInputs(
      premium,
      excludedT,
      excludedS,
      primaryPlan,
    );
    return {
      id: `independent-primary-spouse-c-health-${use}`,
      inputs,
      filer: extractFilerIdentity(inputs.general)!,
      expectedPdfForms: [
        ...healthForms.slice(0, 8),
        ...(use === "one-established-plan-two-owned-businesses"
          ? []
          : ["form7206"]),
        "form8995",
      ],
      reviewFocus: [
        "Actual primary and spouse Schedule C receipts, plan establishments, policy payments and employer-plan eligibility stay owner-specific",
        "Each allowed Form 7206 amount follows its owner's earned-income limit and flows into Schedule 1 and Form 8995",
        `Reviewed ${use} full native return and every Form 7206 and filled PDF copy retain the sourced owner results`,
      ],
    };
  });
}
