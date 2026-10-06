// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { PficRegime } from "../nodes/inputs/f8621/index.ts";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { executeScheduleJSourceReturn } from "./schedule_j_source_return.ts";
import {
  preferentialAmtCases,
  preferentialAmtInputs,
} from "./form4972_preferential_amt.fixture.ts";

const farmFixture = pdfReviewFixtures.find((f) =>
  f.id === "single-schedule-j-farm-income-averaging"
)!;
const adoptionFixture = pdfReviewFixtures.find((f) =>
  f.id === "single-reviewed-adoption-credit"
)!;
const cp = (id: string, value: string) => ({
  document_id: id,
  sha256: createHash("sha256").update(value).digest("hex"),
  bytes_base64: btoa(value),
});
const holding = {
  company_name: "QEF Adoption Fund",
  company_ein_or_ref: "QEFADOPT1",
  country_of_incorporation: "Ireland",
  regime: PficRegime.QEF,
  shares_owned: 100,
  fmv_at_year_end: 20_000,
  qef_ordinary_income: 2_000,
  qef_capital_gain: 0,
  parent_source: {
    corporation_address: {
      line1: "1 Fund Quay",
      city: "Dublin",
      country_code: "EI",
    },
    corporation_tax_year_start: "2025-01-01",
    corporation_tax_year_end: "2025-12-31",
    share_classes: [{
      description: "Ordinary",
      year_end_shares: 100,
      year_end_value_usd: 20_000,
    }],
    jointly_owned_with_spouse: false,
    shares_acquired_during_2025: true,
    acquisition_date: "2025-01-01",
    election_status: "qef_new_2025",
    no_outstanding_section1294_election: true,
    issuer_record: cp("issuer", "Issuer 2025 report"),
    qef_annual_statement: {
      ...cp("qef", "QEF annual 2000 ordinary"),
      ordinary_earnings_usd: 2_000,
      net_capital_gain_usd: 0,
    },
    qef_1294_activity_record: {
      ...cp("activity", "No distributions or transfers"),
      distributions_cash_and_property_usd: 0,
      transferred_share_earnings_usd: 0,
    },
  },
  qef_1294_election: {
    distributions_cash_and_property_usd: 0,
    transferred_share_earnings_usd: 0,
    undistributed_ordinary_earnings_usd: 2_000,
    undistributed_capital_gain_usd: 0,
    no_section951_inclusion: true,
  },
};

/** Alex's separately issued farm receipts, dividend, adoption and QEF records. */
function alexSources(qef: boolean): Record<string, unknown> {
  const source = structuredClone(farmFixture.inputs) as Record<string, any>;
  const farm = source.schedule_f.schedule_fs[0];
  farm.line_d_ein = "123456791";
  farm.proprietor_recipient = "T";
  farm.line2_sales_products_raised = 0;
  farm.line4a_ag_program_payments = 180_000;
  farm.line4b_ag_program_payments_taxable = 180_000;
  farm.line8_other_income = 20_000;
  source.f1099g = [{
    payer_name: "Synthetic Agricultural Program Issuer",
    payer_tin: "345678901",
    recipient_tin: "111223333",
    account_number: "ALEX-J-AGRI",
    source_document_reference:
      "2025 issued Alex farm agricultural program copy",
    farm_id: farm.farm_id,
    box_7_agriculture: 180_000,
    box_7_payment_kind: "agricultural_program",
    box_7_review_reference:
      "2025 Alex farm taxable agricultural payment review",
  }];
  source.f1099nec = [{
    payer_name: "Synthetic Farm Custom Hire Customer",
    payer_tin: "234567891",
    recipient_ssn: "111223333",
    account_number: "ALEX-J-CUSTOM",
    source_document_reference: "2025 issued Alex farm custom-work copy",
    box1_nec: 20_000,
    for_routing: "schedule_f",
    farm_id: farm.farm_id,
  }];
  source.f1099div = [{
    payerName: "Alex Domestic Equity Fund",
    payerTin: "821234567",
    recipient_tin: "111223333",
    box1a: 400,
    box1b: 100,
    box2a: 0,
    account_number: "ALEX-J-2025-DIV",
    source_document_reference: "2025 issued Alex domestic-equity 1099-DIV",
    isNominee: false,
    box11: false,
    qualified_dividend_filing_review: {
      ex_dividend_date: "2025-07-15",
      qualified_held_days_in_121_day_window: 90,
      diminished_risk_days_excluded: 0,
      ordinary_stock_rule_confirmed: true,
      eligible_issuer_and_no_disqualified_dividend_confirmed: true,
      no_related_payment_obligation_confirmed: true,
      review_reference:
        "2025 Alex owned account position and issuer eligibility review",
      reviewed_on: "2026-03-01",
    },
  }];
  source.schedule_b_part_iii = {
    foreign_accounts_question: false,
    foreign_trust_question: false,
  };
  source.schedule_j.tax_treatment.year2025.has_qualified_dividends = true;
  source.form8839 = structuredClone(adoptionFixture.inputs.form8839);
  if (qef) source.f8621 = [holding];
  return source;
}

Deno.test("Alex's issued farm and dividend sources compose Schedule J, adoption and QEF", async () => {
  const input = alexSources(true);
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const out = Deno.env.get("SCHEDULE_J_STAGED_EVIDENCE_DIR") ??
    ".state/research/schedulej-staged-source";
  const bundle = await f1040_2025.prepareReturn(
    pending,
    adoptionFixture.filer,
    adoptionFixture.attachments,
  );
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    adoptionFixture.filer,
    ".pdf-cache",
    bundle.bundle,
    origins,
  );
  await Deno.mkdir(out, { recursive: true });
  await Deno.writeTextFile(
    `${out}/source-pending.json`,
    JSON.stringify({ input, pending }, null, 2),
  );
  await Deno.writeTextFile(`${out}/return.xml`, bundle.bundle.xml);
  await Deno.writeFile(`${out}/return.pdf`, pdf);
  await Deno.writeTextFile(
    `${out}/origins.json`,
    JSON.stringify(origins, null, 2),
  );
  const check = await new Deno.Command("xmllint", {
    args: [
      "--noout",
      "--schema",
      ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      `${out}/return.xml`,
    ],
    stderr: "piped",
  }).output();
  assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
  for (
    const mutate of [
      (p: Record<string, any>) => p.schedule_j.line4++,
      (p: Record<string, any>) => p.f1040.form8621_1294_deferred_tax++,
      (p: Record<string, any>) => p.schedule3.line6c_adoption_credit++,
      (p: Record<string, any>) => p.f1099g.f1099gs[0].box_7_agriculture++,
    ]
  ) {
    const changed = structuredClone(pending) as Record<string, any>;
    mutate(changed);
    await assertRejects(() =>
      f1040_2025.prepareReturn(
        changed,
        adoptionFixture.filer,
        adoptionFixture.attachments,
      )
    );
    await assertRejects(() => buildPdfBytes(changed, adoptionFixture.filer));
  }
});

Deno.test("Alex's Schedule J and adoption source retains staged credit without QEF", async () => {
  const input = alexSources(false);
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(Number(pending.schedule3?.line6c_adoption_credit) > 0, true);
  assertEquals(
    Number((pending.schedule_j as Record<string, number>)?.line23) > 0,
    true,
  );
  const out = (Deno.env.get("SCHEDULE_J_STAGED_EVIDENCE_DIR") ??
    ".state/research/schedulej-staged-source") + "/adoption-only";
  const bundle = await f1040_2025.prepareReturn(
    pending,
    adoptionFixture.filer,
    adoptionFixture.attachments,
  );
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    adoptionFixture.filer,
    ".pdf-cache",
    bundle.bundle,
    origins,
  );
  await Deno.mkdir(out, { recursive: true });
  await Deno.writeTextFile(
    `${out}/source-pending.json`,
    JSON.stringify({ input, pending }, null, 2),
  );
  await Deno.writeTextFile(`${out}/return.xml`, bundle.bundle.xml);
  await Deno.writeFile(`${out}/return.pdf`, pdf);
  await Deno.writeTextFile(
    `${out}/origins.json`,
    JSON.stringify(origins, null, 2),
  );
  const check = await new Deno.Command("xmllint", {
    args: [
      "--noout",
      "--schema",
      ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      `${out}/return.xml`,
    ],
    stderr: "piped",
  }).output();
  assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
});

Deno.test("Alex's issued education sources compose the J and QEF shadow at the actual phaseout", async () => {
  const source = alexSources(true);
  delete source.form8839;
  const pre = buildPending(executeScheduleJSourceReturn(source).pending);
  const education = pdfReviewFixtures.find((row) =>
    row.id === "single-form8863-lifetime-learning-scholarship"
  )!;
  source.f8863 = structuredClone(education.inputs.f8863);
  source.f8863_credit_limit_worksheet = structuredClone(
    education.inputs.f8863_credit_limit_worksheet,
  );
  const student = (source.f8863 as Record<string, any>[])[0];
  student.filer_magi = pre.f1040!.line11_agi;
  const workpaper = student.education_expense_workpaper;
  workpaper.issued_form1098t_source = {
    student_ssn: "111223333",
    institution_name: "Test University",
    institution_ein: "12-3456789",
    tax_year: 2025,
    document_id: "1098T-2025-LLC-STUDENT",
    box1_payments: 8_000,
    box5_scholarships: 1_000,
  };
  workpaper.payment_sources = [{
    student_ssn: "111223333",
    institution_name: "Test University",
    tax_year: 2025,
    payment_record_id: "TUITION-2025-LLC",
    category: "tuition_required_fees",
    amount: 8_000,
  }, {
    student_ssn: "111223333",
    institution_name: "Test University",
    tax_year: 2025,
    payment_record_id: "BOOKS-2025-LLC",
    category: "institution_materials",
    amount: 500,
  }];
  workpaper.assistance_sources = [{
    student_ssn: "111223333",
    institution_name: "Test University",
    tax_year: 2025,
    source_document_reference: "2025-LLC-issued-tax-free-scholarship",
    amount: 1_000,
    tax_treatment: "tax_free",
  }];
  (source.f8863_credit_limit_worksheet as Record<string, any>)
    .credit_limit_worksheet.form1040_line18_tax =
      pre.f1040!.line18_total_tax_before_credits;
  const result = f1040_2025.executeReturn(source);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.schedule3?.line3_education_credit ?? 0, 0);
  assertEquals(Number(pending.f1040?.form8621_1294_deferred_tax) > 0, true);
  const out = (Deno.env.get("SCHEDULE_J_STAGED_EVIDENCE_DIR") ??
    ".state/research/schedulej-staged-source") + "/education";
  const bundle = await f1040_2025.prepareReturn(pending, adoptionFixture.filer);
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    adoptionFixture.filer,
    ".pdf-cache",
    bundle.bundle,
    origins,
  );
  await Deno.mkdir(out, { recursive: true });
  await Deno.writeTextFile(
    `${out}/source-pending.json`,
    JSON.stringify({ source, pending }, null, 2),
  );
  await Deno.writeTextFile(`${out}/return.xml`, bundle.bundle.xml);
  await Deno.writeFile(`${out}/return.pdf`, pdf);
  await Deno.writeTextFile(
    `${out}/origins.json`,
    JSON.stringify(origins, null, 2),
  );
  const check = await new Deno.Command("xmllint", {
    args: [
      "--noout",
      "--schema",
      ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      `${out}/return.xml`,
    ],
    stderr: "piped",
  }).output();
  assertEquals(check.code, 0, new TextDecoder().decode(check.stderr));
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
});

Deno.test("original 200k farm and 35k dividend QEF cannot defer changed NIIT", () => {
  const farm = structuredClone(farmFixture.inputs) as Record<string, any>;
  const source = preferentialAmtInputs(preferentialAmtCases[0]);
  delete source.w2;
  source.general.qbi_no_prior_loss_or_suspended_loss_confirmed = true;
  source.general.qbi_not_patron_of_specified_cooperative_confirmed = true;
  source.schedule_f = farm.schedule_f;
  source.schedule_f.schedule_fs[0].line2_sales_products_raised = 200_000;
  source.schedule_f.schedule_fs[0].line_d_ein = "12-3456789";
  source.schedule_j = farm.schedule_j;
  source.schedule_j.tax_treatment.year2025.has_qualified_dividends = true;
  source.f8621 = [holding];
  assertThrows(
    () => f1040_2025.executeReturn(source),
    Error,
    "non-Chapter-1 taxes",
  );
});
