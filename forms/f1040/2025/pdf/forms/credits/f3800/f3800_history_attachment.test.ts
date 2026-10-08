import { assertEquals, assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import {
  calculateForm3800Nonpassive,
  ZERO_FORM3800_PASSIVE_ACTIVITY,
} from "../../../../../nodes/inputs/f3800/calculation.ts";
import type { Form3800CarryoverVintage } from "../../../../../nodes/inputs/f3800/carryover-ledger.ts";
import { PassiveCreditSourceOrigin } from "../../../../../nodes/intermediate/forms/form8582cr/source.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import {
  buildIRS3800Document,
  type Form3800DocumentParts,
} from "../../../../mef/forms/credits/f3800/f3800_document.ts";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";
import { form3800Pdf } from "./f3800.ts";

const vintage: Form3800CarryoverVintage = {
  source_key: "2022-new-markets-1",
  source_origin: {
    kind: PassiveCreditSourceOrigin.Partnership,
    entity_reference: "2022 partnership K-1 code AD",
    ein: "123456789",
  },
  credit_type: "New markets credit",
  form3800_credit_line: "1i",
  originating_tax_year: 2022,
  originating_tax_year_end_date: "2022-12-31",
  source_document_reference: "2022 partnership K-1 code AD",
  originating_return_reference: "2022 accepted return",
  permitted_carryback_years: 1,
  credit_generated_as_filed: 2_000,
  credit_allowed_origin_year: 0,
  historical_uses: [],
  prior_adjustments: [],
  balance_carried_to_2025: 2_000,
  original_reported_balance_carried_to_2025: 2_000,
};
const entries = [{ vintage, subject_to_passive_activity_limit: false }];
const parts: Form3800DocumentParts = {
  lines: calculateForm3800Nonpassive({
    filingStatus: FilingStatus.Single,
    regularTax: 1_000,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 0,
    standardCredit: 0,
    specifiedCredit: 0,
    standardCarryforward: 2_000,
    specifiedCarryforward: 0,
  }, ZERO_FORM3800_PASSIVE_ACTIVITY),
  transferStatementIds: [],
  carryforwardSources: [{
    sourceKey: "carryforward:2022-new-markets-1",
    line: "1i",
    originatingTaxYear: 2022,
    documentId: "CarryforwardGeneralBusinessCr1",
    availableCredit: 2_000,
    revisedFromOriginal: false,
  }],
  currentRows: [],
  currentAmounts: [],
  carryoverRows: [{
    line: "1i",
    sourceKeys: ["carryforward:2022-new-markets-1"],
    originatingTaxYear: 2022,
    entity: { ein: "123456789" },
    amount: {
      line: "1i",
      passiveBeforeLimit: 0,
      passiveAfterLimit: 0,
      nonpassiveCredit: 2_000,
      appliedCredit: 1_000,
      recapturedOrAdjusted: 0,
      carryforwardCredit: 1_000,
    },
  }],
  currentDetails: [],
  carryoverDetails: [],
  passiveCurrentDetails: [],
  passiveCarryoverDetails: [],
};
const all = {
  f3800: { carryforward_vintages: entries, allowed_credit: 1_000 },
  schedule3: { line6a_total: 1_000, line8_total: 1_000 },
  f1040: { line20_nonrefundable_credits: 1_000 },
};

Deno.test("Form 3800 PDF hook appends source-linked history after its nine pages", async () => {
  buildIRS3800Document(parts);
  const filer = pdfReviewFixtures[0].filer;
  assertEquals(form3800Pdf.instances!(all.f3800, filer, all, parts).length, 1);
  const document = await PDFDocument.create();
  for (let page = 0; page < 9; page++) document.addPage();
  await form3800Pdf.appendSupplementalPages!(
    document,
    {},
    filer,
    all,
    parts,
  );
  assertEquals(document.getPageCount(), 10);
  const path = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(path, await document.save());
    const result = await new Deno.Command("pdftotext", {
      args: ["-f", "10", "-l", "10", path, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
    const text = new TextDecoder().decode(result.stdout);
    assertEquals(text.includes("Carryover Credit History"), true);
    assertEquals(text.includes("2022 partnership K-1 code AD"), true);
    assertEquals(text.includes("123456789"), true);
  } finally {
    await Deno.remove(path);
  }
});

Deno.test("Form 3800 PDF hook rejects history that differs from prepared MeF", async () => {
  const document = await PDFDocument.create();
  const filer = pdfReviewFixtures[0].filer;
  await assertRejects(
    async () => {
      await form3800Pdf.appendSupplementalPages!(document, {}, filer, all);
    },
    Error,
    "needs prepared MeF parts",
  );
  await assertRejects(
    async () => {
      await form3800Pdf.appendSupplementalPages!(document, {}, filer, all, {
        ...parts,
        carryforwardSources: [{
          ...parts.carryforwardSources[0],
          availableCredit: 1_999,
        }],
      });
    },
    Error,
    "differs from prepared MeF source",
  );
  assertEquals(document.getPageCount(), 0);
});
