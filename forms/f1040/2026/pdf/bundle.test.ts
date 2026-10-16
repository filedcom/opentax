import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildDraftReturnPdf2026 } from "./bundle.ts";
import { investmentGraphInput2026 } from "../investment-assembly.fixture.ts";
import { draftBundleFixture2026 } from "./bundle.fixture.ts";
import { syntheticForm4137_2026 } from "../inputs/form4137.fixture.ts";
import { syntheticPabReview2026 } from "../inputs/investment.fixture.ts";
import {
  syntheticForeignStorage2026,
  syntheticMoving2026,
} from "../inputs/moving.fixture.ts";
import { syntheticForm8919_2026 } from "../inputs/form8919.fixture.ts";
import {
  scopeReview2026,
  zeroExclusions2026,
} from "../nodes/schedule1a.fixture.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { foreignAccountReviewFixture2026 } from "../inputs/foreign-accounts.fixture.ts";
import { foreignBankInvestmentFixture2026 } from "../inputs/foreign-bank-interest.fixture.ts";
import { foreignAssetReturnFixture2026 } from "../inputs/foreign-assets-return.fixture.ts";

Deno.test("2026 bundle retains reconciled Form 8938 and exposes its unfinished attachment", async () => {
  const raw = foreignAssetReturnFixture2026();
  const result = await buildDraftReturnPdf2026(raw);
  assert(result.unfinishedReceivers.includes("f8938"));
  assert(!result.attachments.some((a) => a.form === "f8938"));
  assert(result.attachments.some((a) => a.form === "schedule_b"));
  assertEquals(result.filingReady, false);
  assert(result.calculation.pending.f8938.calculation_2026);
  for (const snapshot of raw.f8938.claim.valuation_snapshots) {
    snapshot.values[0].native_value = 1000;
  }
  const below = await buildDraftReturnPdf2026(raw);
  assert(!below.unfinishedReceivers.includes("f8938"));
});

Deno.test("2026 foreign bank statement-only return prints reconciled interest without a synthetic 1099", async () => {
  const base = investmentGraphInput2026(0);
  const { filing_status: _status, taxpayer_ssn: _tin, ...claim } =
    foreignBankInvestmentFixture2026();
  claim.f1099ints = [];
  claim.f1099divs = [];
  const result = await buildDraftReturnPdf2026({
    ...base,
    investment_income: claim,
  });
  assertEquals(result.attachments.map((a) => a.form), ["f1040", "schedule_b"]);
  assertEquals(result.calculation.pending.f1040.line2b_taxable_interest, 1551);
  assertEquals(result.calculation.pending.f1040.line11b_agi, 1551);
  assertEquals(result.filingReady, false);
  const texts = await extract(result.bytes);
  const b = result.attachments.find((a) => a.form === "schedule_b")!;
  const text = texts[b.formPages[0] - 1];
  for (
    const value of ["SYNTHETIC SWISS BANK", "1550.51", "1551", "Switzerland"]
  ) assertStringIncludes(text, value);
});

Deno.test("2026 draft bundle includes a foreign-account-only Schedule B", async () => {
  const base = investmentGraphInput2026(100000);
  const result = await buildDraftReturnPdf2026({
    ...base,
    investment_income: {
      ...base.investment_income,
      f1099ints: [],
      f1099divs: [],
      foreign_accounts_question: true,
      foreign_account_review: foreignAccountReviewFixture2026(),
    },
  });
  assertEquals(
    result.attachments.filter((a) => a.form === "schedule_b").length,
    1,
  );
  assertEquals(result.calculation.pending.f1040.line11b_agi, 100000);
  assertEquals(result.filingReady, false);
  assertStringIncludes((await extract(result.bytes)).join("\n"), "Switzerland");
});

async function extract(bytes: Uint8Array) {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.writeFile(`${dir}/bundle.pdf`, bytes);
    const output = await new Deno.Command("pdftotext", {
      args: ["-layout", `${dir}/bundle.pdf`, "-"],
    }).output();
    assertEquals(output.code, 0);
    return new TextDecoder().decode(output.stdout).split("\f");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}
Deno.test("2026 draft bundle selects forms, moves payer statements to the end and exposes incomplete receivers", async () => {
  const input = draftBundleFixture2026();
  const result = await buildDraftReturnPdf2026(input);
  assertEquals(result.filingReady, false);
  assert(!result.unfinishedReceivers.includes("eitc"));
  assert(result.unfinishedReceivers.length > 0);
  assertEquals(result.attachments.map((a) => a.form), [
    "f1040",
    "schedule1",
    "schedule2",
    "schedule_a",
    "schedule_b",
    "form8959",
    "form8960",
  ]);
  const doc = await PDFDocument.load(result.bytes);
  assertEquals(doc.catalog.get(PDFName.of("AcroForm")), undefined);
  assert(doc.getPages().every((p) => !p.node.has(PDFName.of("Annots"))));
  const formPages = result.attachments.flatMap((a) => a.formPages);
  const statements = result.attachments.flatMap((a) => a.statementPages);
  assert(statements.length >= 3);
  assertEquals(
    [...formPages, ...statements],
    Array.from({ length: doc.getPageCount() }, (_, i) => i + 1),
  );
  const texts = await extract(result.bytes);
  for (const p of [...formPages, ...statements]) {
    assertStringIncludes(texts[p - 1], "INCOMPLETE 2026 IMPLEMENTATION");
  }
  const payerText = statements.map((p) => texts[p - 1]).join("\n");
  for (
    const text of [
      "SYNTHETIC BANK 32",
      "SYNTHETIC FUND 16",
      "Synthetic Buyer",
      "123456789",
    ]
  ) assertStringIncludes(payerText, text);
  assertStringIncludes(texts[0], "Synthetic");
  assertEquals(result.calculation.pending.f1040.line10_adjustments, 100);
});
Deno.test("2026 draft bundle retains zero-tax NIIT and Medicare withholding attachments", async () => {
  const input = investmentGraphInput2026(250000);
  input.investment_income.f1099ints[0].box1 = 0;
  input.investment_income.f1099divs = [];
  const result = await buildDraftReturnPdf2026(input);
  assertEquals(result.calculation.pending.schedule2.line6_niit, 0);
  assert(result.attachments.some((a) => a.form === "form8960"));
  const low = investmentGraphInput2026(100000);
  low.w2s![0].box6_medicare_withheld += 100;
  const credit = await buildDraftReturnPdf2026(low);
  assertEquals(credit.attachments.map((a) => a.form), ["f1040", "form8959"]);
  assertEquals(credit.calculation.pending.f1040.line25c_other_withheld, 100);
});
Deno.test("2026 draft bundle selects PAB AMT from the same source calculation", async () => {
  const input = investmentGraphInput2026(150000);
  Object.assign(input.investment_income.f1099ints[0], {
    box1: 0,
    box8: 100000,
    box9: 100000,
    pab_review: syntheticPabReview2026(),
  });
  input.investment_income.f1099divs = [];
  const result = await buildDraftReturnPdf2026(input);
  assertEquals(result.attachments.map((a) => a.form), [
    "f1040",
    "schedule2",
    "form6251",
  ]);
  assert(Number(result.calculation.pending.f1040.line17_additional_taxes) > 0);
});
Deno.test("2026 draft bundle keeps phased-out senior activity and joint identity", async () => {
  const input = investmentGraphInput2026(400000);
  const result = await buildDraftReturnPdf2026({
    ...input,
    general: {
      ...input.general,
      filing_status: FilingStatus.MFJ,
      taxpayer_dob: "1950-01-01",
      spouse_first_name: "Second",
      spouse_last_name: "Investor",
      spouse_ssn: "987654321",
      spouse_dob: "1980-01-01",
      spouse_blind: false,
      spouse_can_be_claimed_as_dependent: false,
      spouse_citizen_national_or_work_authorized: true,
      spouse_ssn_valid_for_employment: true,
      spouse_ssn_issued_before_due_date: true,
      spouse_tin_issued_by_due_date: true,
    },
    schedule1a: {
      tax_year: 2026,
      source_scope_review: scopeReview2026,
      part1_zero_exclusions_review: zeroExclusions2026,
    },
  });
  assertEquals(result.calculation.pending.f1040.line13a_schedule1a, 0);
  const attachment = result.attachments.find((a) => a.form === "schedule1a")!;
  assert(attachment);
  assertEquals(attachment.formPages.length, 3);
  const text = (await extract(result.bytes))[attachment.formPages[0] - 1];
  assertStringIncludes(text, "Synthetic Investor & Second Investor");
});
for (const storage of [false, true]) {
  Deno.test(`2026 draft bundle selects moving versus storage attachments (${storage})`, async () => {
    const input = investmentGraphInput2026(150001);
    const source = storage
      ? syntheticForeignStorage2026()
      : syntheticMoving2026();
    const {
      filing_status: _status,
      taxpayer_ssn: _ssn,
      spouse_ssn: _spouse,
      w2_moving_sources_2026: _w2,
      ...claim
    } = source;
    // Keep ownership and source references consistent with the issued wage record.
    const claimText = JSON.stringify(claim).replaceAll("111223333", "123456789")
      .replaceAll("issued-w2-1", "synthetic-w2");
    const result = await buildDraftReturnPdf2026({
      ...input,
      f3903: JSON.parse(claimText),
      w2s: [{
        ...input.w2s![0],
        ...(storage ? {} : { box12_entries: [{ code: "P", amount: 1000 }] }),
      }],
    });
    assertEquals(
      result.attachments.some((a) => a.form === "form3903"),
      !storage,
    );
    assert(result.attachments.some((a) => a.form === "schedule1"));
  });
}
Deno.test("2026 draft bundle connects misclassified wages and information-return withholding", async () => {
  const input = investmentGraphInput2026(180000);
  const source = syntheticForm8919_2026();
  const forms = JSON.parse(
    JSON.stringify(source.forms).replaceAll("111223333", "123456789"),
  );
  const result = await buildDraftReturnPdf2026({
    ...input,
    w2s: [{
      ...input.w2s![0],
      employer_ein: "123456789",
      employer_name: "First",
      source_document_reference: "w2-one",
    }],
    form8919: { tax_year: 2026, evidence_review_date: "2027-02-10", forms },
  });
  assert(result.attachments.some((a) => a.form === "form8919"));
  assertEquals(result.calculation.pending.f1040.line1g_wages_8919, 10000);
  assertEquals(result.calculation.pending.f1040.line25b_withheld_1099, 1000);
});
Deno.test("2026 draft bundle rejects missing identity, invented line inputs and source errors", async () => {
  await assertRejects(
    () => buildDraftReturnPdf2026({}),
    Error,
    "general filer input",
  );
  const input = investmentGraphInput2026(100000);
  await assertRejects(
    () =>
      buildDraftReturnPdf2026({ ...input, f1040: { line16_income_tax: 0 } }),
    Error,
    "Unrecognized key",
  );
  input.w2s![0].employee_ssn = "999887777";
  await assertRejects(
    () => buildDraftReturnPdf2026(input),
    Error,
    "calculation failed",
  );
});

Deno.test("2026 draft bundle carries unreported tips through Schedule 1-A and payroll tax", async () => {
  const input = investmentGraphInput2026(150000);
  const source = syntheticForm4137_2026();
  const forms = JSON.parse(
    JSON.stringify(source.forms).replaceAll("111223333", "123456789"),
  );
  const result = await buildDraftReturnPdf2026({
    ...input,
    w2s: [{
      ...input.w2s![0],
      employer_ein: "123456789",
      employer_name: "Cafe",
      source_document_reference: "issued-w2",
      box8_allocated_tips: 2000,
    }],
    form4137: { tax_year: 2026, forms },
    schedule1a: {
      tax_year: 2026,
      source_scope_review: { ...scopeReview2026, has_form4137_tips: true },
      part1_zero_exclusions_review: zeroExclusions2026,
    },
  });
  assert(result.attachments.some((a) => a.form === "form4137"));
  assert(result.attachments.some((a) => a.form === "schedule1a"));
  assertEquals(result.calculation.pending.f1040.line1c_unreported_tips, 2000);
  const attachment = result.attachments.find((a) => a.form === "form4137")!;
  assertStringIncludes(
    (await extract(result.bytes))[attachment.formPages[0] - 1],
    "Synthetic Investor",
  );
});
