import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../../2025/registry.ts";
import { buildMefBundle, buildMefXml } from "../../../2025/mef/builder.ts";
import { buildPending } from "../../../2025/mef/execution/pending.ts";
import { sha256Hex } from "../../../2025/domains/execution/prepared-source.ts";
import { irs1040Pdf } from "../../../2025/pdf/forms/identity/f1040.ts";
import { fillFormPdf } from "../../../2025/pdf/builder.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";

const plan = buildExecutionPlan(registry);
const context = { taxYear: 2025, formType: "f1040" };
const general = {
  filing_status: "mfj",
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Example",
  taxpayer_ssn: "111-22-3333",
  taxpayer_ssn_valid_for_employment: true,
  taxpayer_ssn_issued_before_due_date: true,
  taxpayer_tin_issued_by_due_date: true,
  taxpayer_dob: "1985-06-15",
  spouse_first_name: "Sam",
  spouse_last_name: "Example",
  spouse_ssn: "444-55-6666",
  spouse_ssn_valid_for_employment: true,
  spouse_ssn_issued_before_due_date: true,
  spouse_tin_issued_by_due_date: true,
  spouse_dob: "1987-03-10",
  address_line1: "1 Example Way",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
  digital_assets: false,
  main_home_in_us_over_half_year: true,
  prior_eic_disallowance_review: {
    status: "none",
    irs_account_record_reference: "Synthetic IRS account review",
    no_nonclerical_disallowance_since_1996_verified: true,
  },
};
const w2 = {
  employee_ssn: "111-22-3333",
  employer_ein: "12-3456789",
  employer_name: "Example Employer",
  employer_address_line1: "10 Employer Road",
  employer_address_city: "Austin",
  employer_address_state: "TX",
  employer_address_zip: "78701",
  box1_wages: 15_000,
  box2_fed_withheld: 0,
  box3_ss_wages: 15_000,
  box4_ss_withheld: 930,
  box5_medicare_wages: 15_000,
  box6_medicare_withheld: 217.5,
};

Deno.test("joint resident election gives EIC only with reviewed facts and matching signed statement PDF", async () => {
  const statement = await PDFDocument.create();
  statement.addPage();
  const bytes = await statement.save();
  const digest = await sha256Hex(bytes);
  const election = {
    status: "joint_new_election",
    elected_person: "spouse",
    elected_spouse_nonresident_at_year_end_verified: true,
    other_spouse_citizen_or_resident_at_year_end_verified: true,
    worldwide_income_included_verified: true,
    status_record_reference: "Synthetic 2025 spouse status record",
    signed_statement_file_name: "ResidentElection2025.pdf",
    signed_statement_pdf_sha256: digest,
    statement_signed_by_both_verified: true,
  };
  const noReview = execute(plan, registry, {
    general,
    w2: [w2],
  }, context);
  assertEquals(noReview.diagnostics, []);
  assertEquals(noReview.pending.f1040.line27_eitc, undefined);

  const result = execute(plan, registry, {
    general: { ...general, eic_tax_residency_review: election },
    w2: [w2],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals((result.pending.f1040.line27_eitc as number) > 0, true);
  const filer = extractFilerIdentity(result.pending.f1040);
  const pending = buildPending(result.pending);
  assertThrows(
    () => buildMefXml(pending, filer),
    Error,
    "signed statement PDF",
  );
  const bundle = await buildMefBundle(pending, {
    filer,
    attachments: [{
      fileName: "ResidentElection2025.pdf",
      description: "Signed 2025 joint resident election statement",
      bytes,
    }],
  });
  assertStringIncludes(bundle.xml, "<NRASpouseTreatedAsResidentInd>X");
  assertStringIncludes(bundle.xml, "<SpouseNm>Sam Example</SpouseNm>");
  assertStringIncludes(bundle.xml, "<EarnedIncomeCreditAmt");
  assertStringIncludes(bundle.xml, 'binaryAttachmentCnt="1"');
  const xsd = new URL(
    "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const xmlPath = await Deno.makeTempFile({ suffix: ".xml" });
  try {
    await Deno.writeTextFile(xmlPath, bundle.xml);
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, xmlPath],
      stderr: "piped",
    }).output();
    assertEquals(
      validation.code,
      0,
      new TextDecoder().decode(validation.stderr),
    );
  } finally {
    await Deno.remove(xmlPath);
  }
  const pdfFields = irs1040Pdf.projectFields?.(
    result.pending.f1040,
    result.pending,
  );
  assertEquals(pdfFields?.print_resident_election, true);
  assertEquals(pdfFields?.print_resident_election_name, "Sam Example");
  const filledPdf = await fillFormPdf(
    irs1040Pdf,
    pdfFields ?? {},
    filer,
    ".pdf-cache",
    result.pending,
  );
  assertEquals(
    filledPdf?.slice(0, 5).every((b, i) => b === [37, 80, 68, 70, 45][i]),
    true,
  );
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, filledPdf!);
    const renderedText = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
      stdout: "piped",
    }).output();
    assertEquals(renderedText.code, 0);
    assertStringIncludes(
      new TextDecoder().decode(renderedText.stdout),
      "Sam Example",
    );
  } finally {
    await Deno.remove(pdfPath);
  }

  await assertRejects(
    () => buildMefBundle(pending, { filer, attachments: [] }),
    Error,
    "signed statement PDF",
  );
  const tampered = {
    ...result.pending,
    general: { ...result.pending.general, eic_tax_residency_review: undefined },
  };
  assertThrows(
    () => buildMefXml(buildPending(tampered), filer),
    Error,
    "resident-election facts differ",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(result.pending.f1040, tampered),
    Error,
    "resident-election facts differ",
  );
});

Deno.test("continuing joint resident election prints the Form 1040 mark without a new statement", () => {
  const result = execute(plan, registry, {
    general: {
      ...general,
      eic_tax_residency_review: {
        status: "joint_prior_election",
        elected_person: "spouse",
        election_still_in_effect_verified: true,
        at_least_one_spouse_citizen_or_resident_during_2025_verified: true,
        worldwide_income_included_verified: true,
        prior_joint_return_reference: "2024 joint Form 1040",
        prior_signed_statement_reference: "2024 signed resident election",
      },
    },
    w2: [w2],
  }, context);
  assertEquals(result.diagnostics, []);
  assertEquals((result.pending.f1040.line27_eitc as number) > 0, true);
  const xml = buildMefXml(
    buildPending(result.pending),
    extractFilerIdentity(result.pending.f1040),
  );
  assertStringIncludes(xml, "<SpouseNm>Sam Example</SpouseNm>");
  assertEquals(xml.includes("<BinaryAttachment"), false);
  const projected = irs1040Pdf.projectFields?.(
    result.pending.f1040,
    result.pending,
  );
  assertEquals(projected?.print_resident_election, true);
});
