import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { FilingStatus } from "../nodes/types.ts";
import { IraOwner } from "../nodes/intermediate/forms/form8606/index.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { f1040_2025 } from "./index.ts";
import { form8606 } from "./mef/forms/f8606.ts";
import { form8606Pdf } from "./pdf/forms/f8606.ts";
import { normalizeForm8606TestPending } from "./form8606_test_pending.ts";

const general = {
  digital_assets: false,
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Saver",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1960-06-15",
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};
const contributionSource = {
  form5498: {
    tax_year: 2025 as const,
    source_document_reference: "2025 issued traditional IRA Form 5498",
    custodian_ein: "123456789",
    owner_ssn: "111223333",
    traditional_ira_confirmed: true as const,
    no_returned_contributions_confirmed: true as const,
    no_sep_or_simple_employer_contributions_confirmed: true as const,
    box1_ira_contributions: 1_000,
    box2_rollover_contributions: 0 as const,
  },
  contribution_receipt: {
    source_document_reference: "2026 IRA receipt designated for 2025",
    custodian_ein: "123456789",
    owner_ssn: "111223333",
    designated_tax_year: 2025 as const,
    received_on: "2026-02-15",
    contribution_amount: 1_000,
  },
};
const evidence = {
  prior_form8606: {
    tax_year: 2024 as const,
    source_document_reference: "2024 filed Form 8606",
    owner_ssn: "111223333",
    filed_line14_basis: 6_000,
  },
  year_end_statement: {
    as_of: "2025-12-31" as const,
    source_document_reference: "2025 all-IRA custodian statement",
    owner_ssn: "111223333",
    all_traditional_ira_balances_included_confirmed: true as const,
    total_fair_market_value: 10_000,
  },
  form1099r_source_document_reference: "2025 issued Form 1099-R",
  no_current_nondeductible_contribution_confirmed: false,
  no_other_traditional_ira_distribution_or_conversion_confirmed: true as const,
  no_rollover_repayment_qcd_hsa_or_disaster_amount_confirmed: true as const,
};

function filedReturn(receivedOn = "2026-02-15") {
  const result = f1040_2025.executeReturn({
    general,
    w2: [{
      employee_ssn: "111-22-3333",
      employer_ein: "987654321",
      employer_name: "Austin Employer",
      employer_address_line1: "2 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box1_wages: 100_000,
      box2_fed_withheld: 15_000,
      box13_retirement_plan: true,
    }],
    f1099r: [{
      payer_name: "IRA Custodian",
      payer_ein: "123456789",
      recipient_ssn: general.taxpayer_ssn,
      source_document_reference: evidence.form1099r_source_document_reference,
      box1_gross_distribution: 20_000,
      box2a_taxable_amount: 20_000,
      box7_distribution_code: "7",
      box7_ira_simple_indicator: true,
      ts: "T",
      prior_ira_basis: 6_000,
      year_end_ira_value: 10_000,
      form8606_distribution_evidence: evidence,
    }],
    ira_deduction_worksheet: {
      filing_status: FilingStatus.Single,
      magi: receivedOn.startsWith("2025-") ? 115_340 : 116_000,
      ira_contribution: 1_000,
      active_participant: true,
      form8606_filing_details: {
        owner: IraOwner.Taxpayer,
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
  return result;
}

Deno.test("2025 IRA contribution received in early 2026 prints Form 8606 line 4 and does not offset a 2025 distribution", async () => {
  const result = filedReturn();
  const pending = normalizeForm8606TestPending(result.pending);
  const filer = extractFilerIdentity(general);
  assertEquals(pending.form8606.print_line1_nondeductible, 1_000);
  assertEquals(pending.form8606.print_line2_prior_basis, 6_000);
  assertEquals(pending.form8606.print_line3_total_basis, 7_000);
  assertEquals(pending.form8606.print_line4_post_year_contributions, 1_000);
  assertEquals(pending.form8606.print_line5_current_basis, 6_000);
  assertEquals(pending.form8606.print_line10_basis_ratio, 0.2);
  assertEquals(pending.form8606.print_line12_nontaxable_distribution, 4_000);
  assertEquals(pending.form8606.print_line14_remaining_basis, 3_000);
  assertEquals(pending.form8606.print_line15c_taxable, 16_000);
  assertEquals(pending.f1040.line4a_ira_gross, 20_000);
  assertEquals(pending.f1040.line4b_ira_taxable, 16_000);
  assertEquals(pending.schedule1?.line20_ira_deduction ?? 0, 0);
  const xml = form8606.build(pending.form8606, { filer, pending });
  assertStringIncludes(
    xml,
    "<NondedIRAPostTaxYrContriAmt>1000</NondedIRAPostTaxYrContriAmt>",
  );
  assertStringIncludes(
    xml,
    "<NondedIRATotalIRABasisAmt>3000</NondedIRATotalIRABasisAmt>",
  );
  const [pdf] = form8606Pdf.instances!(pending.form8606, filer, pending);
  assertEquals(pdf.print_line4_post_year_contributions, 1_000);
  assertEquals(pdf.print_line15c_taxable, 16_000);
  const prepared = await f1040_2025.prepareReturn(result.pending, filer);
  assertStringIncludes(prepared.bundle.xml, "<IRS8606");
  assert(
    (await PDFDocument.load(await prepared.renderPdf())).getPageCount() >= 2,
  );
});

Deno.test("2025 IRA contribution received in 2025 contributes to the distribution basis and leaves line 4 zero", () => {
  const pending = normalizeForm8606TestPending(
    filedReturn("2025-12-15").pending,
  );
  const filer = extractFilerIdentity(general);
  assertEquals(pending.form8606.print_line4_post_year_contributions, 0);
  assertEquals(pending.form8606.print_line5_current_basis, 7_000);
  assertEquals(pending.form8606.print_line14_remaining_basis, 2_340);
  assertEquals(pending.form8606.print_line15c_taxable, 15_340);
  assertStringIncludes(
    form8606.build(pending.form8606, { filer, pending }),
    "<NondedIRATaxableAmt>15340</NondedIRATaxableAmt>",
  );
});

Deno.test("Form 8606 contribution and distribution reject changed receipt, Form 5498, worksheet, line 4 and owner", () => {
  const pending = normalizeForm8606TestPending(filedReturn().pending);
  const filer = extractFilerIdentity(general);
  const source = pending.form8606
    .current_contribution_source as typeof contributionSource;
  const cases = [
    {
      form8606: { ...pending.form8606, print_line4_post_year_contributions: 0 },
    },
    {
      form8606: {
        ...pending.form8606,
        current_contribution_source: {
          ...source,
          form5498: { ...source.form5498, box1_ira_contributions: 999 },
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
    {
      form8606: {
        ...pending.form8606,
        current_contribution_source: {
          ...source,
          contribution_receipt: {
            ...source.contribution_receipt,
            owner_ssn: "999887777",
          },
        },
      },
    },
    {
      ira_deduction_worksheet: {
        ...pending.ira_deduction_worksheet,
        ira_contribution: 999,
      },
    },
    { f1040: { ...pending.f1040, line4b_ira_taxable: 15_999 } },
  ];
  for (const change of cases) {
    const changed = Object.assign({}, pending, change);
    assertThrows(
      () => form8606.build(changed.form8606, { filer, pending: changed }),
      Error,
    );
    assertThrows(
      () => form8606Pdf.instances!(changed.form8606, filer, changed),
      Error,
    );
  }
});
