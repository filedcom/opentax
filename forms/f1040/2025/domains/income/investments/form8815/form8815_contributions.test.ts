import type { Form8815Input } from "../../../../../nodes/intermediate/forms/income/investments/form8815/index.ts";
import { institutionInputs } from "./form8815_institutions.fixture.ts";
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { EducationAccountKind } from "../../../../../nodes/intermediate/forms/income/investments/form8815/education_contributions.ts";
import {
  contributionCases,
  contributionInputs,
} from "./form8815_contributions.fixture.ts";

for (const kind of contributionCases) {
  Deno.test(`Form 8815 contribution source through final tax and packet: ${kind}`, async () => {
    const inputs = contributionInputs(kind);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const joint = kind === "joint-spouse-qtp" ||
      kind === "joint-mixed-continuation";
    const phase = kind === "mixed-single-phaseout";
    const dependent = kind === "coverdell-dependent";
    // Form 8815 ratios are rounded to 3 places before multiplying:
    // dependent .167 * 2000 = 334; mixed .500 * 2000 = 1000,
    // then single .167 or joint .425 phaseout gives 833 or 575.
    const exclusion = dependent ? 334 : joint ? 575 : phase ? 833 : 2000;
    const agi = dependent ? 71666 : joint ? 161425 : phase ? 101167 : 70000;
    // Dependent single tax table 55,900-55,950: 7,218 less 500 ODC.
    const tax = dependent ? 6718 : joint ? 18412 : phase ? 13708 : 6855;
    assertEquals(pending.form8815.line14, exclusion);
    assertEquals(pending.schedule_b.ee_bond_exclusion, exclusion);
    assertEquals(pending.f1040.line2b_taxable_interest ?? 0, 2000 - exclusion);
    assertEquals(pending.f1040.line11_agi, agi);
    assertEquals(
      pending.f1040.line15_taxable_income,
      agi - (joint ? 31500 : 15750),
    );
    assertEquals(pending.f1040.line24_total_tax, tax);
    assertEquals(pending.f1040.line33_total_payments, 7000);
    if (tax > 7000) assertEquals(pending.f1040.line37_amount_owed, tax - 7000);
    else assertEquals(pending.f1040.line35a_refund, 7000 - tax);
    const filer = extractFilerIdentity(pending.f1040);
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    for (const student of inputs.form8815.eligible_students) {
      const kind = student.contribution_account?.kind;
      if (kind) {
        assertStringIncludes(
          prepared.bundle.xml,
          kind === EducationAccountKind.Qtp
            ? `qualifiedTuitionProgramCd="QSTP">${student.institution_name}`
            : `coverdellEducationalSavAcctCd="COVERDELL ESA">${student.institution_name}`,
        );
      }
    }
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals((await PDFDocument.load(pdf)).getPageCount(), origins.length);
    const root = Deno.env.get("OPENTAX_FORM8815_CONTRIBUTION_PROOF_DIR");
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${kind}.pdf`, pdf);
      await Deno.writeTextFile(`${root}/${kind}.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${root}/${kind}.json`,
        JSON.stringify(
          { inputs, pending, filer, origins, acceptanceVerified: false },
          null,
          2,
        ),
      );
    }
    const review = inputs.form8815.education_contributions!;
    const firstPayment = review.payments[0];
    const firstAccount = inputs.form8815.eligible_students.findIndex((row) =>
      row.contribution_account
    );
    const replacementAccounts = (
      replacement: Partial<
        NonNullable<
          typeof inputs.form8815.eligible_students[number][
            "contribution_account"
          ]
        >
      >,
    ) =>
      inputs.form8815.eligible_students.map((row, i) =>
        i === firstAccount
          ? {
            ...row,
            contribution_account: {
              ...row.contribution_account!,
              ...replacement,
            },
          }
          : row
      );
    const changes: Partial<Form8815Input>[] = [
      { education_facts: institutionInputs("three").form8815.education_facts },
      { education_contributions: undefined },
      {
        line2_qualified_education_expenses:
          inputs.form8815.line2_qualified_education_expenses + 1,
      },
      {
        education_contributions: {
          ...review,
          payments: [...review.payments, firstPayment],
        },
      },
      {
        education_contributions: {
          ...review,
          payments: review.payments.map((row, i) =>
            i === 0 ? { ...row, amount: row.amount + 1 } : row
          ),
        },
      },
      {
        education_contributions: {
          ...review,
          payments: review.payments.map((row, i) =>
            i === 0 ? { ...row, line1_entry_number: 99 } : row
          ),
        },
      },
      {
        education_contributions: {
          ...review,
          payments: review.payments.map((row, i) =>
            i === 0 ? { ...row, paid_date: "2025-02-30" } : row
          ),
        },
      },
      {
        education_contributions: {
          ...review,
          payments: review.payments.map((row, i) =>
            i === 0 ? { ...row, contributor_tin: "999887777" } : row
          ),
        },
      },
      {
        eligible_students: replacementAccounts({
          beneficiary_tin: "999887777",
        }),
      },
      {
        eligible_students: replacementAccounts({
          qualification_record_reference: "",
        }),
      },
      {
        eligible_students: inputs.form8815.eligible_students.map((row, i) =>
          i === firstAccount ? { ...row, person_name: "Unrelated Person" } : row
        ),
      },
    ];
    if (review.coverdell_beneficiaries.length) {
      changes.push({
        education_contributions: { ...review, coverdell_beneficiaries: [] },
      });
      changes.push({
        education_contributions: {
          ...review,
          coverdell_beneficiaries: review.coverdell_beneficiaries.map((
            row,
          ) => ({ ...row, other_2025_contributions_all_sources: 2000 })),
        },
      });
      changes.push({
        education_contributions: {
          ...review,
          coverdell_beneficiaries: review.coverdell_beneficiaries.map((
            row,
          ) => ({
            ...row,
            beneficiary_dob: "1990-01-01",
            special_needs_record_reference: undefined,
          })),
        },
      });
    }
    for (const inventory of review.coverdell_beneficiaries) {
      changes.push({
        education_contributions: {
          ...review,
          coverdell_beneficiaries: [
            { ...inventory, beneficiary_dob: "2008-01-01" },
          ],
        },
      });
    }
    if (phase) {
      // Still under the beneficiary's $2,000 total, but 1,500 from this
      // filer exceeds the 1,178 limit at final AGI 101,167.
      changes.push({
        education_contributions: {
          ...review,
          coverdell_beneficiaries: review.coverdell_beneficiaries.map((
            row,
          ) => ({
            ...row,
            other_2025_contributions_by_filers: 500,
          })),
        },
      });
    }
    for (const change of changes) {
      const altered = {
        ...pending,
        form8815: { ...pending.form8815, ...change },
      };
      await assertRejects(
        () => f1040_2025.prepareReturn(altered, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(altered, filer), Error);
    }
  });
}
