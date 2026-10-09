import { assertEquals, assertRejects } from "@std/assert";
import { FilingStatus, TS } from "../../../../../nodes/types.ts";
import { Box12Code } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { IraOwner } from "../../../../../nodes/intermediate/forms/income/retirement/form8606/index.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";

const cases = [
  {
    name: "single-deductible",
    status: FilingStatus.Single,
    contribution: 2000,
    deferral: 0,
    deduction: 2000,
  },
  {
    name: "single-mixed",
    status: FilingStatus.Single,
    contribution: 1000,
    deferral: 1000,
    deduction: 1000,
  },
  {
    name: "mfs-nondeductible",
    status: FilingStatus.MFS,
    contribution: 2000,
    deferral: 0,
    deduction: 0,
  },
  {
    name: "mfs-mixed",
    status: FilingStatus.MFS,
    contribution: 1000,
    deferral: 1000,
    deduction: 0,
  },
];
for (const item of cases) {
  Deno.test(`IRA contribution ${item.name} joins deduction basis and saver credit`, async () => {
    const general = {
      filing_status: item.status,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Saver",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1964-06-15",
      ...(item.status === FilingStatus.MFS
        ? {
          spouse_first_name: "Sam",
          spouse_last_name: "Saver",
          spouse_ssn: "999-88-7777",
          mfs_spouse_itemizing: false,
          mfs_spouse_lived_with_taxpayer: true,
        }
        : {}),
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
      taxpayer_form8880_student_five_months: false,
      taxpayer_form8880_claimed_as_dependent: false,
      form8880_nonjoint_distribution_review: {
        taxpayer_ssn: "111223333",
        reviewed_by: "IRA Reviewer",
        reviewed_on: "2026-04-10",
        filing_due_date: "2026-04-15",
        complete_distribution_inventory_confirmed: true,
        reviewed_distribution_sources_ref: "reviewed-empty-lookback",
        entries: [],
      },
    };
    const wages = 25000 + item.deduction;
    const contributionSource = {
      form5498: {
        tax_year: 2025 as const,
        source_document_reference: "2025-issued-5498",
        custodian_ein: "123456789",
        owner_ssn: "111223333",
        traditional_ira_confirmed: true as const,
        no_returned_contributions_confirmed: true as const,
        no_sep_or_simple_employer_contributions_confirmed: true as const,
        box1_ira_contributions: item.contribution,
        box2_rollover_contributions: 0 as const,
      },
      prior_form8606: {
        tax_year: 2024 as const,
        source_document_reference: "2024-filed-8606",
        owner_ssn: "111223333",
        filed_line14_basis: 0 as const,
      },
    };
    const worksheet = {
      filing_status: item.status,
      magi: wages,
      ira_contribution: item.contribution,
      active_participant: true,
      form8606_filing_details: {
        owner: IraOwner.Taxpayer,
        prior_basis_documented_from_2024_form8606: true as const,
        no_ira_distributions_or_conversions_confirmed: true,
        other_spouse_form8606_not_required_confirmed: true as const,
      },
      form8606_zero_basis_source: contributionSource,
    };
    const inputs = {
      general,
      w2: [{
        ts: TS.T,
        employee_ssn: general.taxpayer_ssn,
        employer_ein: "98-7654321",
        employer_name: "Example Employer",
        employer_address_line1: "2 Main St",
        employer_address_city: "Austin",
        employer_address_state: "TX",
        employer_address_zip: "78701",
        box1_wages: wages,
        box2_fed_withheld: 2000,
        box13_retirement_plan: true,
        ...(item.deferral > 0
          ? { box12_entries: [{ code: Box12Code.D, amount: item.deferral }] }
          : {}),
      }],
      ira_deduction_worksheet: worksheet,
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    assertEquals(pending.schedule1?.line20_ira_deduction ?? 0, item.deduction);
    assertEquals(pending.f1040?.line11_agi, 25000);
    assertEquals(pending.f1040?.line18_total_tax_before_credits, 928);
    assertEquals(pending.f1040?.line20_nonrefundable_credits, 400);
    assertEquals(pending.f1040?.line24_total_tax, 528);
    assertEquals(pending.f1040?.line33_total_payments, 2000);
    assertEquals(pending.f1040?.line35a_refund, 1472);
    assertEquals(pending.form8880?.print_line1a_ira, item.contribution);
    assertEquals(pending.form8880?.print_line2a_deferrals, item.deferral);
    assertEquals(
      result.carryforwards.ira_remaining_basis_8606 ?? 0,
      item.contribution - item.deduction,
    );
    const filer = extractFilerIdentity(general);
    if (item.status === FilingStatus.MFS) {
      const reason =
        "Form 8606 MeF does not yet support joint returns with spouse IRA filing ambiguity";
      await assertRejects(
        () => buildMefBundle(pending, { filer, attachments: [] }),
        Error,
        reason,
      );
      await assertRejects(
        () => buildPdfBytes(pending, filer, ".pdf-cache"),
        Error,
        reason,
      );
      const dir = Deno.env.get("FORM8880_IRA_EVIDENCE");
      if (dir) {
        const output = `${dir}/${item.name}`;
        await Deno.mkdir(output, { recursive: true });
        await Deno.writeTextFile(
          `${output}/source.json`,
          JSON.stringify(inputs, null, 2),
        );
        await Deno.writeTextFile(
          `${output}/pending.json`,
          JSON.stringify(result.pending, null, 2),
        );
        await Deno.writeTextFile(
          `${output}/blocked.json`,
          JSON.stringify(
            { reason, nativeRejected: true, fullPdfRejected: true },
            null,
            2,
          ),
        );
      }
      return;
    }
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const outcomes = [];
    for (
      const [name, alteredWorksheet] of [
        ["missing-worksheet", undefined],
        ["changed-contribution", {
          ...worksheet,
          ira_contribution: item.contribution + 1,
        }],
        ["changed-custodian-owner", {
          ...worksheet,
          form8606_zero_basis_source: {
            ...contributionSource,
            form5498: {
              ...contributionSource.form5498,
              owner_ssn: "999887777",
            },
          },
        }],
        ["changed-5498-amount", {
          ...worksheet,
          form8606_zero_basis_source: {
            ...contributionSource,
            form5498: {
              ...contributionSource.form5498,
              box1_ira_contributions: item.contribution + 1,
            },
          },
        }],
      ] as const
    ) {
      const changed = { ...pending, ira_deduction_worksheet: alteredWorksheet };
      let native = "accepted", fullPdf = "accepted";
      try {
        await buildMefBundle(changed, { filer, attachments: [] });
      } catch (error) {
        native = error instanceof Error ? error.message : String(error);
      }
      try {
        const changedBundle = await buildMefBundle(changed, {
          filer,
          attachments: [],
        });
        await buildPdfBytes(changed, filer, ".pdf-cache", changedBundle);
      } catch (error) {
        fullPdf = error instanceof Error ? error.message : String(error);
      }
      outcomes.push({ name, native, fullPdf });
    }
    // Deferred98 observation: rebuilding a package currently accepts all four
    // source inconsistencies. This records the gap, not successful validation.
    assertEquals(
      outcomes.map(({ native, fullPdf }) => [native, fullPdf]),
      Array.from({ length: 4 }, () => ["accepted", "accepted"]),
    );
    const dir = Deno.env.get("FORM8880_IRA_EVIDENCE");
    if (dir) {
      const output = `${dir}/${item.name}`;
      await Deno.mkdir(output, { recursive: true });
      for (
        const [name, value] of [
          ["source", inputs],
          ["pending", result.pending],
          ["origins", origins],
          ["mutations", outcomes],
        ] as const
      ) {
        await Deno.writeTextFile(
          `${output}/${name}.json`,
          JSON.stringify(value, null, 2),
        );
      }
      await Deno.writeTextFile(`${output}/return.xml`, bundle.xml);
      await Deno.writeFile(`${output}/return.pdf`, pdf);
    }
  });
}
