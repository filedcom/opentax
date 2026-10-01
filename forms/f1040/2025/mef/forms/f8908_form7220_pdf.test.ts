import { assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import {
  form7220ReviewedFixture,
  form7220StatementFixture,
} from "../../form8908_form7220_fixture.ts";
import {
  form8908NoAlterationsStatementDescription,
  form8908PwaAttachmentDescription,
} from "../../form8908_source.ts";
import { assertForm8908Form7220PdfContents } from "./f8908_form7220_pdf.ts";
import { assertForm8908NoAlterationsStatementPdf } from "./f8908_no_alterations_pdf.ts";
import { assertForm8908PwaSubmittedPdfs } from "./f8908_pwa.ts";

function source() {
  return {
    contractor_ssn: "111223333",
    eligible_contractor_and_program_participation_verified: true as const,
    basis_during_construction_verified: true as const,
    no_duplicate_rehabilitation_or_energy_credit_verified: true as const,
    homes: [{
      street: "1 Main Street",
      city: "Albany",
      state: "NY",
      zip: "12207",
      acquired_on: "2025-06-01",
      acquired_by_other_person_for_residence_verified: true as const,
      acquisition_record_reference: "SALE-1",
      contractor_basis_record_reference: "BASIS-1",
      program: "multifamily" as const,
      zero_energy_ready: false,
      prevailing_wage_met: true,
      form7220: {
        review_reference: "PWA-1",
        acquisition_record_reference: "SALE-1",
        residence: {
          street: "1 Main Street",
          city: "Albany",
          state: "NY",
          zip: "12207",
          acquired_on: "2025-06-01",
        },
        pdf_file_name: "Form7220-1.pdf",
        pdf_sha256: "a".repeat(64),
        completed_for_residence_confirmed: true as const,
        reviewed_record: form7220ReviewedFixture(),
        signed_no_alterations_statement: form7220StatementFixture(
          1,
          "1 Main Street",
          "SALE-1",
          "PWA-1",
        ),
      },
      certifier: { kind: "business" as const, name: "Certifier", state: "NY" },
      certification_reference: "CERT-1",
      certified_on: "2025-05-01",
      certification_modified: false,
    }],
  };
}

async function completedPdf(changes: Record<string, string> = {}) {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < 5; index++) pdf.addPage();
  const form = pdf.getForm();
  const page1 = "topmostSubform[0].Page1[0].";
  const texts = new Map<string, string>([
    ["f1_1", "Sample Contractor"],
    ["f1_2", "111223333"],
    ["f1_4", "Energy efficient multifamily residence"],
    ["f1_5", "1 Main Street"],
    ["f1_6", "Albany, NY 12207"],
    ["f1_13", "01/15/2024"],
    ["f1_14", "06/01/2025"],
  ]);
  for (const [name, value] of texts) {
    const fullName = `${page1}${name}[0]`;
    form.createTextField(fullName).setText(changes[fullName] ?? value);
  }
  const marks: readonly [string, readonly number[], number][] = [
    ["c1_1", [0], 2],
    ["c1_2", [9], 12],
    ["c1_3", [1], 2],
    ["c1_4", [1], 2],
    ["c1_5", [2], 3],
    ["c1_6", [1], 2],
  ];
  for (const [group, selected, count] of marks) {
    for (let index = 0; index < count; index++) {
      const name = `${page1}${group}[${index}]`;
      const box = form.createCheckBox(name);
      if (
        changes[name] === "checked" ||
        (changes[name] !== "off" && selected.includes(index))
      ) box.check();
    }
  }
  const wage = form7220ReviewedFixture().wage_rows[0];
  const rowValues = [
    wage.employer_name,
    wage.employer_ein,
    wage.work_classification,
    String(wage.laborers_and_mechanics),
    String(wage.hours_worked),
    String(wage.hourly_wages_paid),
    String(wage.fringe_benefits_paid),
    String(wage.hourly_wages_paid + wage.fringe_benefits_paid),
  ];
  for (let row = 1; row <= 18; row++) {
    for (let column = 0; column < 8; column++) {
      const name =
        `topmostSubform[0].Page2[0].Table_PartII[0].Line${row}[0].f2_${
          (row - 1) * 8 + column + 1
        }[0]`;
      form.createTextField(name).setText(
        changes[name] ?? (row === 1 ? rowValues[column] : ""),
      );
    }
  }
  const totals = ["2", "80", "3000", "500", "3500"];
  for (let index = 145; index <= 154; index++) {
    const name = `topmostSubform[0].Page2[0].f2_${index}[0]`;
    form.createTextField(name).setText(
      changes[name] ?? (index >= 150 ? totals[index - 150] : ""),
    );
  }
  return await pdf.save();
}

async function reviewedSource(bytes: Uint8Array) {
  const reviewed = source();
  reviewed.homes[0].form7220.pdf_sha256 = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
    ),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  return reviewed;
}

async function completedStatementPdf(changes: Record<string, string> = {}) {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const form = pdf.getForm();
  const prefix = "Form7220NoAlterationsStatement.";
  const fields = {
    TaxpayerName: "Sample Contractor",
    TaxpayerTIN: "111223333",
    FacilityDescription: "Energy efficient multifamily residence",
    OwnerName: "Residence Owner",
    HomeStreet: "1 Main Street",
    HomeCityStateZIP: "Albany, NY 12207",
    AcquiredOn: "06/01/2025",
    Form7220ReviewReference: "PWA-1",
    AcquisitionRecordReference: "SALE-1",
    StatementReviewReference: "STATEMENT-REVIEW-1",
    SignerName: "Sample Contractor",
    SignedOn: "01/20/2026",
    NoAlterationsText:
      "No alterations or repairs were performed to the facility during the tax year.",
    PerjuryDeclarationText:
      "Under penalties of perjury, I declare that I have examined this statement, including accompanying documents, and to the best of my knowledge and belief, the facts presented in support of this statement are true, correct, and complete.",
  };
  for (const [name, value] of Object.entries(fields)) {
    form.createTextField(`${prefix}${name}`).setText(changes[name] ?? value);
  }
  for (
    const name of ["NoAlterationsOrRepairs", "PerjuryDeclarationAcknowledged"]
  ) {
    const box = form.createCheckBox(`${prefix}${name}`);
    if (changes[name] !== "off") box.check();
  }
  return await pdf.save();
}

async function statementReviewedSource(
  formBytes: Uint8Array,
  statementBytes: Uint8Array,
) {
  const reviewed = await reviewedSource(formBytes);
  reviewed.homes[0].form7220.signed_no_alterations_statement.pdf_sha256 = Array
    .from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", Uint8Array.from(statementBytes)),
      ),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
  return reviewed;
}

Deno.test("Form 8908 Form 7220 PDF matches reviewed home, employer, wage and required marks", async () => {
  const bytes = await completedPdf();
  await assertForm8908Form7220PdfContents(
    await reviewedSource(bytes),
    "SALE-1",
    bytes,
  );
});

Deno.test("Form 8908 Form 7220 PDF rejects mismatched home, employer, wage and mark", async () => {
  const page1 = "topmostSubform[0].Page1[0].";
  const wage = "topmostSubform[0].Page2[0].Table_PartII[0].Line1[0].";
  for (
    const changes of [
      { [`${page1}f1_5[0]`]: "9 Other Street" },
      { [`${wage}f2_1[0]`]: "Other Employer" },
      { [`${wage}f2_6[0]`]: "2000" },
      { [`${page1}c1_2[9]`]: "off" },
    ]
  ) {
    const bytes = await completedPdf(changes);
    await assertRejects(
      async () =>
        assertForm8908Form7220PdfContents(
          await reviewedSource(bytes),
          "SALE-1",
          bytes,
        ),
      Error,
      "Form 8908 Form 7220",
    );
  }
});

Deno.test("Form 8908 Form 7220 PDF rejects bytes outside the reviewed digest", async () => {
  const bytes = await completedPdf();
  await assertRejects(
    () => assertForm8908Form7220PdfContents(source(), "SALE-1", bytes),
    Error,
    "differs from reviewed exact bytes",
  );
});

Deno.test("Form 8908 MeF preparation binds exact Form 7220 bytes and rejects an unbound signed statement", async () => {
  const bytes = await completedPdf();
  const statementBytes = await completedStatementPdf();
  const reviewed = await statementReviewedSource(bytes, statementBytes);
  const attachment = {
    fileName: "Form7220-1.pdf",
    description: form8908PwaAttachmentDescription(reviewed.homes[0]),
    bytes,
  };
  const alteredBytes = await completedPdf({
    "topmostSubform[0].Page2[0].Table_PartII[0].Line1[0].f2_1[0]":
      "Other Employer",
  });
  const statementAttachment = {
    fileName: "Form7220Statement-1.pdf",
    description: form8908NoAlterationsStatementDescription(reviewed.homes[0]),
    bytes: statementBytes,
  };
  await assertRejects(
    () => assertForm8908PwaSubmittedPdfs(reviewed, []),
    Error,
    "needs one reviewed Form 7220 binary attachment",
  );
  await assertRejects(
    () =>
      assertForm8908PwaSubmittedPdfs(reviewed, [{
        ...attachment,
        bytes: alteredBytes,
      }]),
    Error,
    "differs from reviewed exact bytes",
  );
  await assertRejects(
    () => assertForm8908PwaSubmittedPdfs(reviewed, [attachment]),
    Error,
    "distinct signed no-alterations statement attachment",
  );
  await assertRejects(
    () =>
      assertForm8908PwaSubmittedPdfs(reviewed, [
        attachment,
        statementAttachment,
      ]),
    Error,
    "signature authenticity is not verified",
  );
});

Deno.test("Form 8908 signed statement PDF rejects changed home, signer date, and declaration", async () => {
  const formBytes = await completedPdf();
  for (
    const changes of [
      { HomeStreet: "9 Other Street" },
      { SignedOn: "01/21/2026" },
      { PerjuryDeclarationAcknowledged: "off" },
    ]
  ) {
    const statementBytes = await completedStatementPdf(changes);
    const reviewed = await statementReviewedSource(formBytes, statementBytes);
    await assertRejects(
      () =>
        assertForm8908NoAlterationsStatementPdf(
          reviewed,
          "SALE-1",
          statementBytes,
        ),
      Error,
      "Form 8908 signed statement",
    );
  }
});
