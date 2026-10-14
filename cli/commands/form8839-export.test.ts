import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { copy, ensureDir } from "@std/fs";
import { join } from "@std/path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { sha256Hex } from "../../forms/f1040/2025/return-processing/prepared-source.ts";
import { appendInput } from "../store/store.ts";
import { createReturnCommand, getReturnCommand } from "./return.ts";
import {
  exportMefCommand,
  exportPdfCommand,
  runReturnPipeline,
} from "./export.ts";
import { formAddCommand, formUpdateCommand } from "./form.ts";

for (
  const scenario of [
    {
      name: "fully-used",
      wages: 100_000,
      withheld: 15_000,
      used: 6_000,
      carry: undefined,
    },
    { name: "unused", wages: 10_000, withheld: 0, used: 0, carry: 6_000 },
    {
      name: "partial",
      wages: 50_000,
      withheld: 4_000,
      used: 3_875,
      carry: 2_125,
    },
  ] as const
) {
  Deno.test(`CLI Form 8839 ${scenario.name} credit survives saved-return reload and exact-byte export`, async () => {
    const baseDir = await Deno.makeTempDir();
    try {
      const { returnId } = await createReturnCommand({ year: 2025, baseDir });
      const returnPath = join(baseDir, returnId);
      const attachmentPath = join(returnPath, "attachments");
      await ensureDir(attachmentPath);
      const ids = ["decree-1", "birth-1", "invoice-1", "payment-1"];
      const documents = await Promise.all(ids.map(async (id) => {
        const pdf = await PDFDocument.create();
        const page = pdf.addPage([200, 200]);
        page.drawText(id, {
          x: 20,
          y: 150,
          font: await pdf.embedFont(StandardFonts.Helvetica),
        });
        const bytes = await pdf.save();
        const fileName = `${id}.pdf`;
        await Deno.writeFile(join(attachmentPath, fileName), bytes);
        return {
          source_document_id: id,
          file_name: fileName,
          description: `Form 8839 reviewed ${id}`,
          sha256: await sha256Hex(bytes),
        };
      }));
      const hashes = Object.fromEntries(documents.map((document) => [
        document.source_document_id,
        document.sha256,
      ]));
      const source = {
        filing_status: "single",
        adoption_benefits: 0,
        children: [{
          first_name: "Ada",
          last_name: "Example",
          birth_year: 2020,
          ssn: "111223334",
          final_decree: {
            source_document_id: "decree-1",
            finalization_date: "2025-07-15",
            issuing_jurisdiction: "TX",
            child_origin: "US",
          },
          expenses: [{
            source_document_id: "invoice-1",
            paid_date: "2025-03-12",
            category: "attorney_fee",
            payee: "Adoption Counsel",
            amount: 11_000,
            reimbursed_amount: 0,
          }],
        }],
        reviewed_source: {
          reviewed_by: "Adoption Reviewer",
          reviewed_on: "2026-04-01",
          adoption_case_reference: "case-TX-2025-1",
          decree: {
            source_document_id: "decree-1",
            document_sha256: hashes["decree-1"],
            child_first_name: "Ada",
            child_last_name: "Example",
            child_ssn: "111223334",
            finalization_date: "2025-07-15",
            issuing_jurisdiction: "TX",
            child_origin: "US",
            taxpayer_named_as_adoptive_parent_confirmed: true,
          },
          birth_record: {
            source_document_id: "birth-1",
            document_sha256: hashes["birth-1"],
            child_first_name: "Ada",
            child_last_name: "Example",
            date_of_birth: "2020-02-01",
          },
          reviewed_facts: {
            child_us_citizen_or_resident_when_effort_began_confirmed: true,
            child_under_18_on_2025_12_31_confirmed: true,
            child_not_taxpayers_spouses_child_confirmed: true,
            no_other_nonspouse_taxpayer_claim_confirmed: true,
            no_prior_form8839_claim_for_child_confirmed: true,
            no_employer_adoption_benefits_confirmed: true,
            all_reimbursements_disclosed_confirmed: true,
            no_other_federal_credit_or_deduction_for_expenses_confirmed: true,
            no_surrogacy_or_illegal_expenses_confirmed: true,
          },
          expenses: [{
            source_document_id: "invoice-1",
            receipt_sha256: hashes["invoice-1"],
            payment_proof_document_id: "payment-1",
            payment_proof_sha256: hashes["payment-1"],
            paid_date: "2025-03-12",
            category: "attorney_fee",
            payee: "Adoption Counsel",
            amount: 11_000,
            directly_related_to_legal_adoption_confirmed: true,
          }],
        },
        magi_review: {
          reviewed_by: "Return Reviewer",
          reviewed_on: "2026-04-01",
          section933: {
            no_puerto_rico_excluded_income_confirmed: true,
            return_wide_review_reference: "territory-review",
          },
          form2555: {
            no_form2555_filing_or_exclusion_confirmed: true,
            return_wide_review_reference: "foreign-income-review",
          },
          form4563: {
            no_form4563_filing_or_exclusion_confirmed: true,
            return_wide_review_reference: "territory-return-review",
          },
        },
        documents,
      };
      await appendInput(returnPath, "general", {
        filing_status: "single",
        taxpayer_first_name: "Alex",
        taxpayer_last_name: "Example",
        taxpayer_ssn: "111-22-3333",
        taxpayer_dob: "1985-06-15",
        address_line1: "1 Main St",
        address_city: "Austin",
        address_state: "TX",
        address_zip: "78701",
        digital_assets: false,
      });
      const wageFields = {
        employee_ssn: "111-22-3333",
        employer_ein: "12-3456789",
        employer_name: "Example Employer",
        employer_address_line1: "2 Main St",
        employer_address_city: "Austin",
        employer_address_state: "TX",
        employer_address_zip: "78701",
        box1_wages: scenario.wages,
        box2_fed_withheld: scenario.withheld,
        box3_ss_wages: scenario.wages,
        box4_ss_withheld: Math.round(scenario.wages * 0.062),
        box5_medicare_wages: scenario.wages,
        box6_medicare_withheld: Math.round(scenario.wages * 0.0145),
      };
      const wageEntry = await appendInput(returnPath, "w2", wageFields);
      await formAddCommand({
        returnId,
        baseDir,
        nodeType: "form8839",
        dataJson: JSON.stringify(source),
      });
      const original = await runReturnPipeline({ returnId, baseDir });
      const reloadedBaseDir = join(baseDir, "reloaded");
      await ensureDir(reloadedBaseDir);
      const reloadedPath = join(reloadedBaseDir, returnId);
      await copy(returnPath, reloadedPath);
      await Deno.remove(returnPath, { recursive: true });
      const args = { returnId, baseDir: reloadedBaseDir, force: true };
      const reopened = await runReturnPipeline(args);
      assertEquals(
        reopened.pending.form8839_carryforward,
        original.pending.form8839_carryforward,
      );
      assertEquals(reopened.executorDiagnostics, []);
      const summary = await getReturnCommand(args);
      assertEquals(summary.carryforwards.adoption_credit_2025, scenario.carry);
      assertEquals(summary.lines.line30_refundable_adoption, 5_000);
      assertEquals(
        reopened.pending.schedule3?.line6c_adoption_credit,
        scenario.used,
      );
      if (scenario.carry !== undefined) {
        assertEquals(
          reopened.pending.form8839_carryforward.status,
          "computed_unfiled",
        );
        assertEquals(
          reopened.pending.form8839_carryforward.carryforward_amount,
          scenario.carry,
        );
      }
      const xml = await exportMefCommand(args);
      assertStringIncludes(xml, "<IRS8839");
      assertStringIncludes(xml, "<BinaryAttachment");
      const pdfPath = await exportPdfCommand(args);
      const pdfBytes = await Deno.readFile(pdfPath);
      assertStringIncludes(
        new TextDecoder().decode(pdfBytes.subarray(0, 5)),
        "%PDF-",
      );
      const evidenceRoot = Deno.env.get("FORM8839_CLI_CARRY_EVIDENCE");
      if (evidenceRoot && scenario.carry !== undefined) {
        const evidencePath = join(evidenceRoot, scenario.name);
        await ensureDir(evidencePath);
        await copy(reloadedPath, join(evidencePath, "saved-return"));
        await Deno.writeTextFile(join(evidencePath, "return.xml"), xml);
        await Deno.writeTextFile(
          join(evidencePath, "summary.json"),
          JSON.stringify(summary, null, 2),
        );
        await Deno.writeTextFile(
          join(evidencePath, "pending.json"),
          JSON.stringify(reopened.pending, null, 2),
        );
      }
      if (scenario.name === "partial") {
        await formUpdateCommand({
          returnId,
          baseDir: reloadedBaseDir,
          entryId: wageEntry.id,
          dataJson: JSON.stringify({
            ...wageFields,
            box1_wages: 100_000,
            box2_fed_withheld: 15_000,
            box3_ss_wages: 100_000,
            box4_ss_withheld: 6_200,
            box5_medicare_wages: 100_000,
            box6_medicare_withheld: 1_450,
          }),
        });
        const updated = await runReturnPipeline(args);
        assertEquals(updated.pending.form8839_carryforward, undefined);
        assertEquals(
          (await getReturnCommand(args)).carryforwards.adoption_credit_2025,
          undefined,
        );
        assertEquals(updated.pending.schedule3?.line6c_adoption_credit, 6_000);
        await exportMefCommand(args);
        await exportPdfCommand(args);
      }
      await Deno.writeFile(
        join(reloadedPath, "attachments", "decree-1.pdf"),
        new TextEncoder().encode("%PDF-1.7 altered decree"),
      );
      await assertRejects(() => exportMefCommand(args));
      await assertRejects(() => exportPdfCommand(args));
    } finally {
      await Deno.remove(baseDir, { recursive: true });
    }
  });
}
