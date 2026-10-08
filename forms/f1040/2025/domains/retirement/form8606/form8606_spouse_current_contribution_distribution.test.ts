import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { FilingStatus } from "../../../../nodes/types.ts";
import { IraOwner } from "../../../../nodes/intermediate/forms/form8606/index.ts";
import { extractFilerIdentity } from "../../../../mef/filer.ts";
import { f1040_2025 } from "../../../index.ts";
import { form8606 } from "../../../mef/forms/retirement/f8606.ts";
import { form8606Pdf } from "../../../pdf/forms/retirement/f8606.ts";
import { normalizeForm8606TestPending } from "./form8606_test_pending.ts";

const general = {
  digital_assets: false,
  filing_status: FilingStatus.MFJ,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Saver",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1960-06-15",
  spouse_first_name: "Blair",
  spouse_last_name: "Saver",
  spouse_ssn: "999-88-7777",
  spouse_dob: "1962-04-01",
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};

const contributionSource = {
  form5498: {
    tax_year: 2025 as const,
    source_document_reference: "Spouse 2025 issued traditional IRA Form 5498",
    custodian_ein: "123456789",
    owner_ssn: "999887777",
    traditional_ira_confirmed: true as const,
    no_returned_contributions_confirmed: true as const,
    no_sep_or_simple_employer_contributions_confirmed: true as const,
    box1_ira_contributions: 1_000,
    box2_rollover_contributions: 0 as const,
  },
  contribution_receipt: {
    source_document_reference: "Spouse 2026 IRA receipt designated for 2025",
    custodian_ein: "123456789",
    owner_ssn: "999887777",
    designated_tax_year: 2025 as const,
    received_on: "2026-02-15",
    contribution_amount: 1_000,
  },
};

const evidence = {
  prior_form8606: {
    tax_year: 2024 as const,
    source_document_reference: "Spouse 2024 filed Form 8606",
    owner_ssn: "999887777",
    filed_line14_basis: 6_000,
  },
  year_end_statement: {
    as_of: "2025-12-31" as const,
    source_document_reference: "Spouse 2025 all-IRA statement",
    owner_ssn: "999887777",
    all_traditional_ira_balances_included_confirmed: true as const,
    total_fair_market_value: 10_000,
  },
  form1099r_source_document_reference: "Spouse 2025 issued Form 1099-R",
  no_current_nondeductible_contribution_confirmed: false,
  no_other_traditional_ira_distribution_or_conversion_confirmed: true as const,
  no_rollover_repayment_qcd_hsa_or_disaster_amount_confirmed: true as const,
};

function filedReturn(receivedOn = "2026-02-15") {
  const result = f1040_2025.executeReturn({
    general,
    w2: [{
      employee_ssn: "999-88-7777",
      box1_wages: 200_000,
      box2_fed_withheld: 25_000,
      box13_retirement_plan: true,
    }],
    f1099r: [{
      payer_name: "IRA Custodian",
      payer_ein: "123456789",
      recipient_ssn: "999-88-7777",
      source_document_reference: evidence.form1099r_source_document_reference,
      box1_gross_distribution: 20_000,
      box2a_taxable_amount: 20_000,
      box7_distribution_code: "7",
      box7_ira_simple_indicator: true,
      ts: "S",
      prior_ira_basis: 6_000,
      year_end_ira_value: 10_000,
      form8606_distribution_evidence: evidence,
    }],
    ira_deduction_worksheet: {
      filing_status: FilingStatus.MFJ,
      magi: receivedOn.startsWith("2025-") ? 215_340 : 216_000,
      ira_contribution: 1_000,
      active_participant: true,
      form8606_filing_details: {
        owner: IraOwner.Spouse,
        prior_basis_documented_from_2024_form8606: true,
        no_ira_distributions_or_conversions_confirmed: false,
      },
      form8606_current_contribution_source: {
        ...contributionSource,
        contribution_receipt: {
          ...contributionSource.contribution_receipt,
          received_on: receivedOn,
        },
      },
    },
  });
  assertEquals(result.diagnostics, []);
  return normalizeForm8606TestPending(result.pending);
}

for (
  const [receiptDate, line4, taxable, remaining] of [
    ["2026-02-15", 1_000, 16_000, 3_000],
    ["2025-12-15", 0, 15_340, 2_340],
  ] as const
) {
  Deno.test(`spouse-owned IRA contribution received ${receiptDate} reconciles Part I, joint Form 1040, native and PDF`, () => {
    const pending = filedReturn(receiptDate);
    const filer = extractFilerIdentity(general);
    const fields = pending.form8606;
    assertEquals(fields.filing_details?.owner, IraOwner.Spouse);
    assertEquals(fields.print_line1_nondeductible, 1_000);
    assertEquals(fields.print_line2_prior_basis, 6_000);
    assertEquals(fields.print_line3_total_basis, 7_000);
    assertEquals(fields.print_line4_post_year_contributions, line4);
    assertEquals(fields.print_line14_remaining_basis, remaining);
    assertEquals(fields.print_line15c_taxable, taxable);
    assertEquals(pending.f1040.line4a_ira_gross, 20_000);
    assertEquals(pending.f1040.line4b_ira_taxable, taxable);
    assertEquals(pending.schedule1?.line20_ira_deduction ?? 0, 0);
    const xml = form8606.build(fields, { filer, pending });
    assert(typeof xml === "string");
    assertStringIncludes(
      xml,
      "<Form8606IRANamelineTxt>Blair Saver</Form8606IRANamelineTxt>",
    );
    assertStringIncludes(
      xml,
      "<NondedIRATxpyrWithIRASSN>999887777</NondedIRATxpyrWithIRASSN>",
    );
    assertStringIncludes(
      xml,
      `<NondedIRATaxableAmt>${taxable}</NondedIRATaxableAmt>`,
    );
    const projected = form8606Pdf.projectFields!(fields, pending);
    const [pdf] = form8606Pdf.instances!(projected, filer, pending);
    assertEquals(pdf.print_owner_name, "Blair Saver");
    assertEquals(pdf.print_owner_ssn, "999887777");
    assertEquals(pdf.print_line4_post_year_contributions, line4);
    assertEquals(pdf.print_line15c_taxable, taxable);
  });
}

Deno.test("spouse-owned current contribution rejects changed owner, receipt, 5498, prior basis, year-end, 1099-R, worksheet and return", () => {
  const pending = filedReturn();
  const filer = extractFilerIdentity(general);
  assert(filer?.spouse);
  const source = pending.form8606
    .current_contribution_source as typeof contributionSource;
  const item = (pending.f1099r.f1099rs as Record<string, unknown>[])[0];
  const changed = [
    {
      form8606: { ...pending.form8606, print_line4_post_year_contributions: 0 },
    },
    {
      form8606: {
        ...pending.form8606,
        current_contribution_source: {
          ...source,
          form5498: { ...source.form5498, owner_ssn: "111223333" },
        },
      },
    },
    {
      form8606: {
        ...pending.form8606,
        current_contribution_source: {
          ...source,
          contribution_receipt: {
            ...source.contribution_receipt,
            owner_ssn: "111223333",
          },
        },
      },
    },
    {
      form8606: {
        ...pending.form8606,
        current_contribution_source: {
          ...source,
          contribution_receipt: {
            ...source.contribution_receipt,
            source_document_reference:
              source.form5498.source_document_reference,
          },
        },
      },
    },
    {
      form8606: {
        ...pending.form8606,
        current_contribution_source: {
          ...source,
          contribution_receipt: {
            ...source.contribution_receipt,
            received_on: "2026-04-16",
          },
        },
      },
    },
    { f1099r: { f1099rs: [{ ...item, ts: "T" }] } },
    { f1099r: { f1099rs: [{ ...item, recipient_ssn: "111-22-3333" }] } },
    {
      f1099r: {
        f1099rs: [{
          ...item,
          form8606_distribution_evidence: {
            ...evidence,
            prior_form8606: {
              ...evidence.prior_form8606,
              owner_ssn: "111223333",
            },
          },
        }],
      },
    },
    {
      f1099r: {
        f1099rs: [{
          ...item,
          form8606_distribution_evidence: {
            ...evidence,
            year_end_statement: {
              ...evidence.year_end_statement,
              owner_ssn: "111223333",
            },
          },
        }],
      },
    },
    {
      ira_deduction_worksheet: {
        ...pending.ira_deduction_worksheet,
        form8606_filing_details: {
          owner: IraOwner.Taxpayer,
          prior_basis_documented_from_2024_form8606: true,
          no_ira_distributions_or_conversions_confirmed: false,
        },
      },
    },
    {
      w2: {
        w2s: [{
          ...(pending.w2.w2s as Record<string, unknown>[])[0],
          employee_ssn: "111-22-3333",
        }],
      },
    },
    { f1040: { ...pending.f1040, line4b_ira_taxable: 15_999 } },
  ];
  for (const change of changed) {
    const tampered = Object.assign({}, pending, change);
    assertThrows(
      () => form8606.build(tampered.form8606, { filer, pending: tampered }),
      Error,
    );
    assertThrows(
      () => form8606Pdf.instances!(tampered.form8606, filer, tampered),
      Error,
    );
  }
  assertThrows(() =>
    form8606.build(pending.form8606, {
      filer: { ...filer, spouse: { ...filer.spouse!, ssn: "111223333" } },
      pending,
    })
  );
});
