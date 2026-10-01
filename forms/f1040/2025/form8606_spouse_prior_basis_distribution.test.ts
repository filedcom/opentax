import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { FilingStatus } from "../nodes/types.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { f1040_2025 } from "./index.ts";
import { form8606 } from "./mef/forms/f8606.ts";
import { form8606Pdf } from "./pdf/forms/f8606.ts";
import { normalizeForm8606TestPending } from "./form8606_test_pending.ts";

const general = {
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
  no_current_nondeductible_contribution_confirmed: true as const,
  no_other_traditional_ira_distribution_or_conversion_confirmed: true as const,
  no_rollover_repayment_qcd_hsa_or_disaster_amount_confirmed: true as const,
};

function filedReturn() {
  const result = f1040_2025.executeReturn({
    general,
    f1099r: {
      f1099rs: [{
        payer_name: "IRA Custodian",
        payer_ein: "123456789",
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
    },
  });
  assertEquals(result.diagnostics, []);
  return normalizeForm8606TestPending(result.pending);
}

Deno.test("spouse-owned prior-basis IRA distribution has one owner through Form 1040, native Form 8606, and PDF", () => {
  const pending = filedReturn();
  const filer = extractFilerIdentity(general);
  assertEquals(pending.f1040.line4a_ira_gross, 20_000);
  assertEquals(pending.f1040.line4b_ira_taxable, 16_000);
  assertEquals(pending.form8606.print_line10_basis_ratio, 0.2);
  assertEquals(pending.form8606.print_line14_remaining_basis, 2_000);
  const xml = form8606.build(pending.form8606, { filer, pending });
  assertStringIncludes(
    xml,
    "<Form8606IRANamelineTxt>Blair Saver</Form8606IRANamelineTxt>",
  );
  assertStringIncludes(
    xml,
    "<NondedIRATxpyrWithIRASSN>999887777</NondedIRATxpyrWithIRASSN>",
  );
  assertStringIncludes(xml, "<NondedIRATaxableAmt>16000</NondedIRATaxableAmt>");
  const projected = form8606Pdf.projectFields!(pending.form8606, pending);
  const [pdf] = form8606Pdf.instances!(projected, filer, pending);
  assertEquals(pdf.print_owner_name, "Blair Saver");
  assertEquals(pdf.print_owner_ssn, "999887777");
  assertEquals(pdf.print_line15c_taxable, 16_000);
});

Deno.test("spouse-owned Form 8606 rejects owner and return tampering", () => {
  const pending = filedReturn();
  const filer = extractFilerIdentity(general);
  assert(filer?.spouse);
  const item = (pending.f1099r.f1099rs as Record<string, unknown>[])[0];
  const altered = [
    { form8606: { ...pending.form8606, print_line15c_taxable: 15_999 } },
    { f1040: { ...pending.f1040, line4b_ira_taxable: 15_999 } },
    { f1099r: { f1099rs: [{ ...item, ts: "T" }] } },
    {
      f1099r: { f1099rs: [{ ...item, source_document_reference: "changed" }] },
    },
    {
      form8606: {
        ...pending.form8606,
        filing_details: {
          ...(pending.form8606.filing_details as Record<string, unknown>),
          owner: "taxpayer",
        },
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
  assertThrows(() =>
    form8606.build(pending.form8606, {
      filer: { ...filer, spouse: { ...filer.spouse!, ssn: "111223333" } },
      pending,
    })
  );
});
