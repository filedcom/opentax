import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { buildPdfBytes, type PdfPageOrigin } from "./pdf/builder.ts";
import education from "./pdf/review-8863-scholarship-source.json" with {
  type: "json",
};
import { PficRegime } from "../nodes/inputs/f8621/index.ts";
import { f1040_2025 } from "./index.ts";
import { buildPending } from "./mef/pending.ts";
import { assertForm8621QefRefigureSource } from "./form8621_1294_refigure.ts";
import { executeForm8863TwoPass } from "./form8863_two_pass.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import {
  filer as claimantFiler,
  fixture as claimantFixture,
} from "./pdf/form8863-claimant-source.fixture.ts";

const cp = (id: string, value: string) => ({
  document_id: id,
  sha256: createHash("sha256").update(value).digest("hex"),
  bytes_base64: btoa(value),
});
const holding = {
  company_name: "QEF Education Fund",
  company_ein_or_ref: "QEFEDU2025",
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
    issuer_record: cp("education-issuer", "2025 issuer QEF report"),
    qef_annual_statement: {
      ...cp("education-qef", "2025 QEF ordinary earnings 2000"),
      ordinary_earnings_usd: 2_000,
      net_capital_gain_usd: 0,
    },
    qef_1294_activity_record: {
      ...cp("education-activity", "2025 no distributions or transfers"),
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

function source() {
  const input = structuredClone(education.inputs) as Record<string, unknown>;
  const students = input.f8863 as Record<string, unknown>[];
  students[0].filer_magi = 83_000;
  const worksheet = (input.f8863_credit_limit_worksheet as {
    credit_limit_worksheet: Record<string, unknown>;
  }).credit_limit_worksheet;
  worksheet.form1040_line18_tax = 9_715;
  input.f8621 = [holding];
  return input;
}

Deno.test("QEF Election B refigures actual education MAGI, phaseout, and credit capacity", async () => {
  const input = source();
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertForm8621QefRefigureSource(pending);
  const filed = pending.f1040 as Record<string, number>;
  assertEquals(filed.line11_agi, 83_000);
  assertEquals(filed.line18_total_tax_before_credits, 9_715);
  assertEquals(pending.schedule3?.line3_education_credit, 1_050);
  assertEquals(filed.line29_refundable_aoc, 700);
  assertEquals(filed.form8621_1294_total_tax_before_deferral, 8_665);
  assertEquals(filed.form8621_1294_counterfactual_total_tax, 7_925);
  assertEquals(filed.form8621_1294_deferred_tax, 740);
  assertEquals(filed.line24_total_tax, 7_925);
  const withoutInputs = structuredClone(input);
  withoutInputs.f8621 = [{
    ...holding,
    qef_ordinary_income: 0,
    qef_capital_gain: 0,
    qef_1294_election: undefined,
  }];
  const without = buildPending(
    executeForm8863TwoPass(withoutInputs, true).pending,
  );
  assertEquals(without.f1040?.line11_agi, 81_000);
  assertEquals(without.f1040?.line18_total_tax_before_credits, 9_275);
  assertEquals(without.schedule3?.line3_education_credit, 1_350);
  assertEquals(without.f1040?.line29_refundable_aoc, 900);
  assertEquals(without.f1040?.line24_total_tax, 7_925);
  const packet = await f1040_2025.prepareReturn(pending, educationFiler());
  const xml = packet.bundle.xml;
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    educationFiler(),
    ".pdf-cache",
    packet.bundle,
    origins,
  );
  const out = Deno.env.get("FORM8621_EDUCATION_EVIDENCE_DIR") ??
    ".state/research/form8621-qef-education";
  await Deno.mkdir(out, { recursive: true });
  await Deno.writeTextFile(
    `${out}/source-pending.json`,
    JSON.stringify({ input, pending }, null, 2),
  );
  await Deno.writeTextFile(`${out}/return.xml`, xml);
  await Deno.writeFile(`${out}/return.pdf`, pdf);
  await Deno.writeTextFile(
    `${out}/origins.json`,
    JSON.stringify(origins, null, 2),
  );
  const xsd = await new Deno.Command("xmllint", {
    args: [
      "--noout",
      "--schema",
      ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      `${out}/return.xml`,
    ],
    stderr: "piped",
  }).output();
  assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), 10);
  assertEquals(origins.length, 10);
});

function educationFiler() {
  return education.filer as Parameters<typeof f1040_2025.prepareReturn>[1];
}

Deno.test("QEF education source and stale worksheet conflicts are rejected", () => {
  const stale = source();
  (stale.f8863 as Record<string, unknown>[])[0].filer_magi = 81_000;
  assertThrows(() => f1040_2025.executeReturn(stale), Error, "filed MAGI");
  const detached = source();
  const worksheet = (detached.f8863_credit_limit_worksheet as {
    credit_limit_worksheet: Record<string, unknown>;
  }).credit_limit_worksheet;
  worksheet.form1040_line18_tax = 9_275;
  assertThrows(() => f1040_2025.executeReturn(detached), Error, "credit limit");
  const adoption = pdfReviewFixtures.find((row) =>
    row.id === "single-reviewed-adoption-credit"
  )!;
  const combined = { ...source(), form8839: adoption.inputs.form8839 };
  assertThrows(
    () => f1040_2025.executeReturn(combined),
    Error,
    "combined counterfactual",
  );
});

Deno.test("native and PDF education copies reject a changed filed credit", async () => {
  const result = f1040_2025.executeReturn(source());
  assertEquals(result.diagnostics, []);
  const pending = structuredClone(buildPending(result.pending));
  pending.schedule3!.line3_education_credit = 1_250;
  await assertRejects(
    () => f1040_2025.prepareReturn(pending, educationFiler()),
    Error,
    "differs from full source",
  );
  await assertRejects(
    () => buildPdfBytes(pending, educationFiler()),
    Error,
    "differs from full source",
  );
});

Deno.test("QEF counterfactual cannot defer a change in Chapter 2A NIIT", () => {
  const base = pdfReviewFixtures.find((row) =>
    row.id === "single-high-wage-no-niit"
  )!;
  const input = structuredClone(base.inputs) as Record<string, unknown>;
  const wage = (input.w2 as Record<string, unknown>[])[0];
  Object.assign(wage, {
    box1_wages: 198_000,
    box3_ss_wages: 176_100,
    box4_ss_withheld: 10_918.20,
    box5_medicare_wages: 198_000,
    box6_medicare_withheld: 2_871,
  });
  input.f1099int = [{
    payer_name: "Interest Bank",
    recipient_tin: base.filer.primarySSN,
    box1: 1_000,
  }];
  input.f8621 = [holding];
  const fullWithoutDeferral = f1040_2025.executeReturn({
    ...input,
    f8621: [{ ...holding, qef_1294_election: undefined }],
  });
  const withoutQef = f1040_2025.executeReturn({
    ...input,
    f8621: [{
      ...holding,
      qef_ordinary_income: 0,
      qef_1294_election: undefined,
    }],
  });
  assertEquals(fullWithoutDeferral.diagnostics, []);
  assertEquals(withoutQef.diagnostics, []);
  assertEquals(fullWithoutDeferral.pending.f1040.line23_other_taxes, 38);
  assertEquals(withoutQef.pending.f1040.line23_other_taxes ?? 0, 0);
  assertThrows(
    () => f1040_2025.executeReturn(input),
    Error,
    "non-Chapter-1 taxes",
  );
});

Deno.test("issued Form 1098-T and payments retain an LLC credit-limit refigure", async () => {
  const base = pdfReviewFixtures.find((row) =>
    row.id === "single-form8863-lifetime-learning-scholarship"
  )!;
  const input = structuredClone(base.inputs) as Record<string, unknown>;
  const wage = (input.w2 as Record<string, unknown>[])[0];
  Object.assign(wage, {
    box1_wages: 17_000,
    box2_fed_withheld: 1_000,
    box3_ss_wages: 17_000,
    box4_ss_withheld: 1_054,
    box5_medicare_wages: 17_000,
    box6_medicare_withheld: 246.50,
  });
  const student = (input.f8863 as Record<string, unknown>[])[0];
  student.filer_magi = 19_000;
  const workpaper = student.education_expense_workpaper as Record<
    string,
    unknown
  >;
  workpaper.issued_form1098t_source = {
    student_ssn: base.filer.primarySSN,
    institution_name: "Test University",
    institution_ein: "12-3456789",
    tax_year: 2025,
    document_id: "1098T-2025-LLC-STUDENT",
    box1_payments: 8_000,
    box5_scholarships: 1_000,
  };
  workpaper.payment_sources = [{
    student_ssn: base.filer.primarySSN,
    institution_name: "Test University",
    tax_year: 2025,
    payment_record_id: "TUITION-2025-LLC",
    category: "tuition_required_fees",
    amount: 8_000,
  }, {
    student_ssn: base.filer.primarySSN,
    institution_name: "Test University",
    tax_year: 2025,
    payment_record_id: "BOOKS-2025-LLC",
    category: "institution_materials",
    amount: 500,
  }];
  workpaper.assistance_sources = [{
    student_ssn: base.filer.primarySSN,
    institution_name: "Test University",
    tax_year: 2025,
    source_document_reference: "2025-LLC-issued-tax-free-scholarship",
    amount: 1_000,
    tax_treatment: "tax_free",
  }];
  const worksheet = (input.f8863_credit_limit_worksheet as {
    credit_limit_worksheet: Record<string, unknown>;
  }).credit_limit_worksheet;
  worksheet.form1040_line18_tax = 328;
  input.f8621 = [holding];
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertForm8621QefRefigureSource(pending);
  assertEquals(pending.f1040?.line11_agi, 19_000);
  assertEquals(pending.f1040?.line18_total_tax_before_credits, 328);
  assertEquals(pending.schedule3?.line3_education_credit, 328);
  assertEquals(pending.f1040?.form8621_1294_deferred_tax, 0);
  assertEquals(pending.f1040?.line24_total_tax, 0);
  const withoutInputs = structuredClone(input);
  withoutInputs.f8621 = [{
    ...holding,
    qef_ordinary_income: 0,
    qef_1294_election: undefined,
  }];
  const without = buildPending(
    executeForm8863TwoPass(withoutInputs, true).pending,
  );
  assertEquals(without.f1040?.line11_agi, 17_000);
  assertEquals(without.f1040?.line18_total_tax_before_credits, 126);
  assertEquals(without.schedule3?.line3_education_credit, 126);
  assertEquals(without.f1040?.line24_total_tax, 0);
  const packet = await f1040_2025.prepareReturn(pending, base.filer);
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    base.filer,
    ".pdf-cache",
    packet.bundle,
    origins,
  );
  const out = `${
    Deno.env.get("FORM8621_EDUCATION_EVIDENCE_DIR") ??
      ".state/research/form8621-qef-education"
  }/issued`;
  await Deno.mkdir(out, { recursive: true });
  await Deno.writeTextFile(
    `${out}/source-pending.json`,
    JSON.stringify({ input, pending }, null, 2),
  );
  await Deno.writeTextFile(`${out}/return.xml`, packet.bundle.xml);
  await Deno.writeFile(`${out}/return.pdf`, pdf);
  await Deno.writeTextFile(
    `${out}/origins.json`,
    JSON.stringify(origins, null, 2),
  );
  const xsd = await new Deno.Command("xmllint", {
    args: [
      "--noout",
      "--schema",
      ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      `${out}/return.xml`,
    ],
    stderr: "piped",
  }).output();
  assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
});

Deno.test("dependent education and Schedule 8812 worksheets refigure together", async () => {
  const reviewed = claimantFixture("parent-two");
  const input = structuredClone(reviewed.inputs) as Record<string, unknown>;
  for (const student of input.f8863 as Record<string, unknown>[]) {
    student.filer_magi = 77_000;
  }
  const educationWorksheet = (input.f8863_credit_limit_worksheet as {
    credit_limit_worksheet: Record<string, unknown>;
  }).credit_limit_worksheet;
  educationWorksheet.form1040_line18_tax = 8_395;
  const dependent = (input.f8812 as Record<string, unknown>[])[0];
  dependent.agi = 77_000;
  dependent.income_tax_liability = 8_395;
  input.f8621 = [holding];
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertForm8621QefRefigureSource(pending);
  assertEquals(pending.f1040?.line11_agi, 77_000);
  assertEquals(pending.f1040?.line18_total_tax_before_credits, 8_395);
  assertEquals(pending.schedule3?.line3_education_credit, 3_000);
  assertEquals(pending.f1040?.line19_child_tax_credit, 1_000);
  assertEquals(pending.f1040?.form8621_1294_deferred_tax, 440);
  assertEquals(pending.f1040?.line24_total_tax, 3_955);
  const withoutInputs = structuredClone(input);
  withoutInputs.f8621 = [{
    ...holding,
    qef_ordinary_income: 0,
    qef_1294_election: undefined,
  }];
  const without = buildPending(
    executeForm8863TwoPass(withoutInputs, true).pending,
  );
  assertEquals(without.f1040?.line11_agi, 75_000);
  assertEquals(without.f1040?.line18_total_tax_before_credits, 7_955);
  assertEquals(without.schedule3?.line3_education_credit, 3_000);
  assertEquals(without.f1040?.line19_child_tax_credit, 1_000);
  assertEquals(without.f1040?.line24_total_tax, 3_955);
  const packet = await f1040_2025.prepareReturn(pending, claimantFiler);
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    claimantFiler,
    ".pdf-cache",
    packet.bundle,
    origins,
  );
  const out = `${
    Deno.env.get("FORM8621_EDUCATION_EVIDENCE_DIR") ??
      ".state/research/form8621-qef-education"
  }/dependent`;
  await Deno.mkdir(out, { recursive: true });
  await Deno.writeTextFile(
    `${out}/source-pending.json`,
    JSON.stringify({ input, pending }, null, 2),
  );
  await Deno.writeTextFile(`${out}/return.xml`, packet.bundle.xml);
  await Deno.writeFile(`${out}/return.pdf`, pdf);
  await Deno.writeTextFile(
    `${out}/origins.json`,
    JSON.stringify(origins, null, 2),
  );
  const xsd = await new Deno.Command("xmllint", {
    args: [
      "--noout",
      "--schema",
      ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      `${out}/return.xml`,
    ],
    stderr: "piped",
  }).output();
  assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
  const stale = structuredClone(input);
  (stale.f8812 as Record<string, unknown>[])[0].agi = 75_000;
  assertThrows(
    () => f1040_2025.executeReturn(stale),
    Error,
    "Schedule 8812 filed AGI",
  );
});

Deno.test("QEF Election B replays sourced Form 3800 tax-limited business credit", async () => {
  const base = pdfReviewFixtures.find((row) =>
    row.id === "single-employer-childcare-facility-and-referral-credit"
  )!;
  const input = { ...base.inputs, f8621: [holding] };
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertForm8621QefRefigureSource(pending);
  assertEquals(pending.f1040?.line18_total_tax_before_credits, 18_347);
  assertEquals(pending.schedule3?.line6a_total, 9_533);
  assertEquals(pending.f1040?.form8621_1294_total_tax_before_deferral, 8_814);
  assertEquals(pending.f1040?.form8621_1294_counterfactual_total_tax, 8_294);
  assertEquals(pending.f1040?.form8621_1294_deferred_tax, 520);
  assertEquals(pending.f1040?.line24_total_tax, 8_294);
  const without = f1040_2025.executeReturn({
    ...base.inputs,
    f8621: [{
      ...holding,
      qef_ordinary_income: 0,
      qef_1294_election: undefined,
    }],
  });
  assertEquals(without.diagnostics, []);
  const withoutPending = buildPending(without.pending);
  assertEquals(withoutPending.f1040?.line18_total_tax_before_credits, 17_867);
  assertEquals(withoutPending.schedule3?.line6a_total, 9_573);
  assertEquals(withoutPending.f1040?.line24_total_tax, 8_294);
  const packet = await f1040_2025.prepareReturn(pending, base.filer);
  const origins: PdfPageOrigin[] = [];
  const pdf = await buildPdfBytes(
    pending,
    base.filer,
    ".pdf-cache",
    packet.bundle,
    origins,
  );
  const out = Deno.env.get("FORM8621_BUSINESS_EVIDENCE_DIR") ??
    ".state/research/form8621-qef-business-credit";
  await Deno.mkdir(out, { recursive: true });
  await Deno.writeTextFile(
    `${out}/source-pending.json`,
    JSON.stringify({ input, pending }, null, 2),
  );
  await Deno.writeTextFile(`${out}/return.xml`, packet.bundle.xml);
  await Deno.writeFile(`${out}/return.pdf`, pdf);
  await Deno.writeTextFile(
    `${out}/origins.json`,
    JSON.stringify(origins, null, 2),
  );
  const xsd = await new Deno.Command("xmllint", {
    args: [
      "--noout",
      "--schema",
      ".state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
      `${out}/return.xml`,
    ],
    stderr: "piped",
  }).output();
  assertEquals(xsd.code, 0, new TextDecoder().decode(xsd.stderr));
  assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
});

Deno.test("native and PDF business-credit copies reject a changed allowed credit", async () => {
  const base = pdfReviewFixtures.find((row) =>
    row.id === "single-employer-childcare-facility-and-referral-credit"
  )!;
  const result = f1040_2025.executeReturn({
    ...base.inputs,
    f8621: [holding],
  });
  assertEquals(result.diagnostics, []);
  const pending = structuredClone(buildPending(result.pending));
  pending.schedule3!.line6a_total = 9_532;
  await assertRejects(
    () => f1040_2025.prepareReturn(pending, base.filer),
    Error,
    "differs from full source",
  );
  await assertRejects(
    () => buildPdfBytes(pending, base.filer),
    Error,
    "differs from full source",
  );
});
