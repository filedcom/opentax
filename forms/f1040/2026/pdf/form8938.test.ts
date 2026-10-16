import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import { calculateForeignAssetReturn2026 } from "../inputs/foreign-assets-return.ts";
import { foreignAssetReturnFixture2026 } from "../inputs/foreign-assets-return.fixture.ts";
import { foreignBeneficialFixture2026 } from "../inputs/foreign-beneficial-interest.fixture.ts";
import { ForeignAssetType } from "../../nodes/inputs/general/foreign/f8938/index.ts";
import {
  buildForm8938PdfBytes2026,
  foreignAssetPrintPlan2026,
} from "./form8938.ts";

const filer = { name: "Synthetic Investor", ssn: "123456789" };
export function foreignPdfSource2026() {
  const result = execute(
    buildExecutionPlan(sourceRegistry2026),
    sourceRegistry2026,
    foreignAssetReturnFixture2026(),
    { taxYear: 2026, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  return (result.pending.f8938.calculation_2026 as NonNullable<
    ReturnType<typeof calculateForeignAssetReturn2026>
  >).source_input;
}
async function inspect(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  assert(!doc.catalog.has(PDFName.of("AcroForm")));
  assert(doc.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  const file = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(file, bytes);
    const r = await new Deno.Command("pdftotext", {
      args: ["-layout", file, "-"],
    }).output();
    assertEquals(r.code, 0);
    assertEquals(new TextDecoder().decode(r.stderr), "");
    return {
      doc,
      pages: new TextDecoder().decode(r.stdout).split("\f").slice(0, -1),
    };
  } finally {
    await Deno.remove(file);
  }
}
function otherAssets() {
  const raw = foreignPdfSource2026();
  for (let i = 0; i < 3; i++) {
    const a = structuredClone(raw.claim!.assets[0]);
    a.asset_id = `stock-${i}`;
    a.asset_identifier = `STOCK-${i}`;
    a.asset_type = ForeignAssetType.ForeignStock;
    a.foreign_entity_type = "corporation";
    a.tax_items = [];
    a.description = `Foreign stock ${i}`;
    a.opened_or_acquired_date = "2026-01-02";
    a.giin = "ABC123.12345.LE.756";
    raw.claim!.assets.push(a);
    raw.claim!.valuation_snapshots.forEach((s) =>
      s.values.push({ ...s.values[0], asset_reference: a.asset_id })
    );
  }
  return raw;
}

Deno.test("2026 Form 8938 prints bound foreign income, annual values and supplied GIIN", async () => {
  const raw = foreignPdfSource2026();
  raw.claim!.assets[0].giin = "ABC123.12345.LE.756";
  const plan = foreignAssetPrintPlan2026(raw, filer);
  assertEquals(plan.copies.length, 1);
  assertEquals(plan.copies[0].fields.line13_interest_amount, 1551);
  assertEquals(plan.copies[0].fields.accountMaximumValueUsd, 80000);
  assertEquals(plan.copies[0].fields.accountNoTaxItem, false);
  assertEquals(plan.copies[0].fields.accountExchangeSource, undefined);
  const { doc, pages } = await inspect(
    await buildForm8938PdfBytes2026(raw, filer),
  );
  assertEquals(doc.getPageCount(), 2);
  for (
    const value of ["1551", "Form 1040 line 2b", "Schedule B line 1", "80000"]
  ) assertStringIncludes(pages[0], value);
  for (
    const value of [
      "foreign-account-1",
      "ABC123",
      "12345",
      "756",
      "1.25",
      "SYNTHETIC SWISS BANK",
    ]
  ) assertStringIncludes(pages[1], value);
  for (const page of pages) {
    assertStringIncludes(page, filer.name);
    assertStringIncludes(page, filer.ssn);
    assertStringIncludes(page, "NOT FOR FILING");
  }
  assert(!pages.join("").includes("The draft you are looking for"));
});

Deno.test("2026 Form 8938 gives each additional asset its own detail statement", async () => {
  const raw = otherAssets(), plan = foreignAssetPrintPlan2026(raw, filer);
  assertEquals(plan.copies.length, 3);
  assertEquals(plan.copies[0].fields.otherAcquired, "01/02/2026");
  assertEquals(plan.copies[0].fields.otherAssetCount, 3);
  assertEquals(plan.copies[0].fields.otherMaximumValueUsd, 240000);
  for (const c of plan.copies.slice(1)) {
    assertEquals(c.pages, [2]);
    assertEquals(c.fields.accountIdentifier, undefined);
  }
  const { pages } = await inspect(await buildForm8938PdfBytes2026(raw, filer));
  assertEquals(pages.length, 4);
  for (let i = 0; i < 3; i++) {
    assertStringIncludes(pages[i + 1], `STOCK-${i}`);
    assertStringIncludes(pages[i + 1], "ABC123");
    assertEquals(pages.filter((p) => p.includes(`STOCK-${i}`)).length, 1);
  }
  assertStringIncludes(pages[0], "240000");
  assert(/Number of additional statements\s+2/.test(pages[0]));
});

Deno.test("2026 Form 8938 retains long detail text on counted supplements", async () => {
  const raw = otherAssets();
  raw.claim!.assets[1].description = "Long foreign investment description "
    .repeat(5).trim();
  const { pages } = await inspect(await buildForm8938PdfBytes2026(raw, filer));
  assert(pages.length > 4);
  assertStringIncludes(pages[1], "S1");
  assertStringIncludes(pages[4], "supplement S1");
  assertStringIncludes(
    pages[4].replace(/\s+/g, " "),
    raw.claim!.assets[1].description,
  );
  assert(
    new RegExp(`Number of additional statements\\s+${pages.length - 2}`).test(
      pages[0],
    ),
  );
});

Deno.test("2026 Form 8938 uses reported pension value instead of the threshold peak", async () => {
  const raw = foreignPdfSource2026(), source = foreignBeneficialFixture2026();
  const a = source.claim.assets[0];
  a.beneficial_interest!.beneficiary_tin = filer.ssn;
  a.beneficial_interest!.distributions = [];
  raw.claim!.assets.push(a);
  raw.claim!.valuation_snapshots.forEach((s, i) =>
    s.values.push(source.claim.valuation_snapshots[i].values[0])
  );
  const p = foreignAssetPrintPlan2026(raw, filer);
  assertEquals(p.result.assets[1].maximum_value_usd, 80000);
  assertEquals(p.copies[0].fields.otherMaximumValueUsd, 55000);
  assertEquals(p.copies[0].fields.otherValueBand2, true);
  assertEquals(p.copies[0].fields.otherNoTaxItem, true);
  const { pages } = await inspect(await buildForm8938PdfBytes2026(raw, filer));
  assertStringIncludes(pages[0], "55000");
  assertStringIncludes(pages[1], "Synthetic Foreign Administrator");
});

Deno.test("2026 Form 8938 rejects mismatched filer, stale destination and invalid GIIN", async () => {
  const raw = foreignPdfSource2026();
  assertThrows(
    () => foreignAssetPrintPlan2026(raw, { ...filer, ssn: "999887777" }),
    Error,
    "identity",
  );
  raw.settled_return.line2b_taxable_interest = 1;
  await assertRejects(() => buildForm8938PdfBytes2026(raw, filer));
  const invalid = foreignPdfSource2026();
  invalid.claim!.assets[0].giin = "bad";
  assertThrows(() => foreignAssetPrintPlan2026(invalid, filer));
  const below = foreignPdfSource2026();
  below.claim!.valuation_snapshots.forEach((s) =>
    s.values[0].native_value = 1000
  );
  assertThrows(
    () => foreignAssetPrintPlan2026(below, filer),
    Error,
    "does not require",
  );
});

Deno.test("2026 Form 8938 additional no-income account has independent flags and FX source", async () => {
  const raw = foreignPdfSource2026(), a = structuredClone(raw.claim!.assets[0]);
  a.asset_id = "additional-deposit";
  a.asset_identifier = "ADDITIONAL-200";
  a.tax_items = [];
  a.opened_or_acquired_date = "2026-01-02";
  a.fx.source = "other_public_source";
  a.fx.treasury_rate_unavailable_verified = true;
  a.fx.document_reference = "Reviewed alternate FX publisher";
  raw.claim!.assets.push(a);
  raw.claim!.valuation_snapshots.forEach((s) =>
    s.values.push({ ...s.values[0], asset_reference: a.asset_id })
  );
  const account = structuredClone(
    raw.investment_sources_2026!.foreign_account_review!.accounts[0],
  );
  account.record_reference = "additional-account-review";
  account.account_number = a.asset_identifier;
  account.relationship_started_on = "2026-01-02";
  account.income_review = {
    kind: "no_reportable_income",
    no_income_reportable_by_subject_from_this_account_verified: true,
    source_document: a.ownership_and_classification_document,
  };
  raw.investment_sources_2026!.foreign_account_review!.accounts.push(account);
  raw.account_bindings!.push({
    asset_reference: a.asset_id,
    foreign_account_references: [account.record_reference],
  });
  const p = foreignAssetPrintPlan2026(raw, filer);
  assertEquals(p.copies.length, 2);
  assertEquals(p.copies[1].fields.accountNoTaxItem, true);
  assertEquals(p.copies[1].fields.accountOpened, true);
  assertEquals(
    p.copies[1].fields.accountExchangeSource,
    a.fx.document_reference,
  );
  assertEquals(p.copies[1].fields.otherUsedFx, undefined);
  const { pages } = await inspect(await buildForm8938PdfBytes2026(raw, filer));
  assertEquals(pages.length, 3);
  assertStringIncludes(pages[2], a.asset_identifier);
  assertStringIncludes(pages[2], a.fx.document_reference);
  assert(/Number of additional statements\s+1/.test(pages[0]));
});
