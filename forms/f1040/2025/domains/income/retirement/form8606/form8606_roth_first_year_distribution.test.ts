import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { f1040_2025 } from "../../../../index.ts";
import { form8606 } from "../../../../mef/forms/income/retirement/f8606.ts";
import { form8606Pdf } from "../../../../pdf/forms/income/retirement/f8606.ts";
import { normalizeForm8606TestPending } from "./form8606_test_pending.ts";

const general = {
  digital_assets: false,
  filing_status: FilingStatus.Single,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Saver",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};
const evidence = {
  opening_statement: {
    source_document_reference: "2025 first Roth account opening statement",
    owner_ssn: "111223333",
    first_roth_ira_opened_on: "2025-01-10",
    all_roth_iras_and_prior_activity_reviewed: true as const,
    no_prior_roth_contributions_or_distributions: true as const,
    no_conversions_or_plan_rollovers: true as const,
  },
  form5498: {
    tax_year: 2025 as const,
    source_document_reference: "2025 issued Form 5498",
    owner_ssn: "111223333",
    custodian_ein: "123456789",
    roth_ira_confirmed: true as const,
    roth_sep_or_simple_ira: false as const,
    box10_roth_ira_contributions: 5_000,
    box2_rollover_contributions: 0 as const,
    box3_roth_conversion_amount: 0 as const,
  },
  contribution_receipt: {
    source_document_reference: "2025 Roth contribution receipt",
    owner_ssn: "111223333",
    custodian_ein: "123456789",
    received_on: "2025-02-01",
    amount: 5_000,
  },
  form1099r_source_document_reference: "2025 issued Roth Form 1099-R",
  no_homebuyer_disaster_repayment_qcd_or_hsa_transfer: true as const,
  no_other_2025_roth_distribution: true as const,
};

function filedReturn() {
  const result = f1040_2025.executeReturn({
    general,
    f1099r: [{
      payer_name: "IRA Custodian",
      payer_ein: "123456789",
      recipient_ssn: "111-22-3333",
      source_document_reference: evidence.form1099r_source_document_reference,
      box1_gross_distribution: 7_000,
      box2b_not_determined: true,
      box7_distribution_code: "J",
      box7_ira_simple_indicator: false,
      box13_date_of_payment: "2025-09-01",
      ts: "T",
      exclude_8606_roth: true,
      roth_distribution_evidence: evidence,
    }],
  });
  assertEquals(result.diagnostics, []);
  return normalizeForm8606TestPending(result.pending);
}

Deno.test("first-year Roth contribution and code J distribution print Form 8606 Part III with 1040/5329 joins", () => {
  const pending = filedReturn();
  const filer = extractFilerIdentity(general);
  assertEquals(pending.form8606.print_roth_line19_distributions, 7_000);
  assertEquals(pending.form8606.print_roth_line22_contribution_basis, 5_000);
  assertEquals(pending.form8606.print_roth_line25c_taxable, 2_000);
  assertEquals(pending.f1040.line4a_ira_gross, 7_000);
  assertEquals(pending.f1040.line4b_ira_taxable, 2_000);
  const ownerForms = pending.form5329.owner_forms as Record<string, unknown>[];
  assertEquals(ownerForms[0].early_distribution, 2_000);
  const xml = form8606.build(pending.form8606, { filer, pending });
  assert(typeof xml === "string");
  assertStringIncludes(
    xml,
    "<TotNonQlfyDistriFromRothIRAAmt>7000</TotNonQlfyDistriFromRothIRAAmt>",
  );
  assertStringIncludes(
    xml,
    "<ROTHIRAContributionBasisAmt>5000</ROTHIRAContributionBasisAmt>",
  );
  assertStringIncludes(
    xml,
    "<TaxableIRADistributionAmt>2000</TaxableIRADistributionAmt>",
  );
  const [pdf] = form8606Pdf.instances!(pending.form8606, filer, pending);
  assertEquals(
    form8606Pdf.fields.find((entry) =>
      entry.domainKey === "print_roth_line25c_taxable"
    )?.pdfField,
    "topmostSubform[0].Page2[0].f2_15[0]",
  );
  assertEquals(pdf.print_roth_line25c_taxable, 2_000);
  assertEquals(pdf.print_line2_prior_basis, undefined);
  assertEquals(pdf.print_owner_ssn, "111223333");
});

Deno.test("first-year Roth Part III rejects source, owner, Form 5329, and finalized return tampering", () => {
  const pending = filedReturn();
  const filer = extractFilerIdentity(general);
  const item = (pending.f1099r.f1099rs as Record<string, unknown>[])[0];
  const mismatchedSource = f1040_2025.executeReturn({
    general,
    f1099r: [{ ...item, recipient_ssn: "999-88-7777" }],
  });
  assertEquals(mismatchedSource.diagnostics.length > 0, true);
  const altered = [
    {
      form8606: {
        ...pending.form8606,
        print_roth_line22_contribution_basis: 4_999,
      },
    },
    { form8606: { ...pending.form8606, print_roth_line25c_taxable: 1_999 } },
    { f1040: { ...pending.f1040, line4b_ira_taxable: 1_999 } },
    { f1099r: { f1099rs: [{ ...item, ts: "S" }] } },
    { f1099r: { f1099rs: [{ ...item, recipient_ssn: "999-88-7777" }] } },
    { f1099r: { f1099rs: [{ ...item, recipient_ssn: undefined }] } },
    { f1099r: { f1099rs: [{ ...item, box1_gross_distribution: 7_001 }] } },
    {
      form5329: {
        ...pending.form5329,
        owner_forms: [{ owner: "T", early_distribution: 1_999 }],
      },
    },
  ];
  for (const change of altered) {
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
});
