import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { IraOwner } from "../../../../../nodes/intermediate/forms/income/retirement/form8606/index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { form8606 } from "../../../../mef/forms/income/retirement/f8606.ts";
import { form8606Pdf } from "../../../../pdf/forms/income/retirement/f8606.ts";
import { normalizeForm8606TestPending } from "./form8606_test_pending.ts";

const general = {
  digital_assets: false,
  filing_status: FilingStatus.MFJ,
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Saver",
  taxpayer_ssn: "111-22-3333",
  taxpayer_dob: "1985-06-15",
  spouse_first_name: "Blair",
  spouse_last_name: "Saver",
  spouse_ssn: "999-88-7777",
  spouse_dob: "1986-04-01",
  address_line1: "1 Main St",
  address_city: "Austin",
  address_state: "TX",
  address_zip: "78701",
};
const filingDetails = {
  owner: IraOwner.Spouse,
  prior_basis_documented_from_2024_form8606: true as const,
  no_ira_distributions_or_conversions_confirmed: true,
  other_spouse_form8606_not_required_confirmed: true as const,
};
const source = {
  form5498: {
    tax_year: 2025 as const,
    source_document_reference: "Spouse 2025 issued traditional IRA Form 5498",
    custodian_ein: "123456789",
    owner_ssn: "999887777",
    traditional_ira_confirmed: true as const,
    no_returned_contributions_confirmed: true as const,
    no_sep_or_simple_employer_contributions_confirmed: true as const,
    box1_ira_contributions: 7_000,
    box2_rollover_contributions: 0 as const,
  },
  prior_form8606: {
    tax_year: 2024 as const,
    source_document_reference: "Spouse 2024 filed Form 8606 line 14",
    owner_ssn: "999887777",
    filed_line14_basis: 0 as const,
  },
};

function filedReturn() {
  const result = f1040_2025.executeReturn({
    general,
    w2: [{
      employee_ssn: "999-88-7777",
      box1_wages: 200_000,
      box2_fed_withheld: 25_000,
      box13_retirement_plan: true,
    }],
    ira_deduction_worksheet: {
      filing_status: FilingStatus.MFJ,
      magi: 200_000,
      ira_contribution: 7_000,
      active_participant: true,
      form8606_filing_details: filingDetails,
      form8606_zero_basis_source: source,
    },
  });
  assertEquals(result.diagnostics, []);
  return normalizeForm8606TestPending(result.pending);
}

Deno.test("spouse zero-opening-basis contribution reconciles joint return, native owner and PDF", () => {
  const pending = filedReturn();
  const filer = extractFilerIdentity(general);
  assertEquals(pending.form8606.print_line1_nondeductible, 7_000);
  assertEquals(pending.form8606.print_line2_prior_basis, 0);
  assertEquals(pending.form8606.print_line14_remaining_basis, 7_000);
  assertEquals(pending.schedule1?.line20_ira_deduction ?? 0, 0);
  const xml = form8606.build(pending.form8606, { filer, pending });
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
    "<NondedIRATotalIRABasisAmt>7000</NondedIRATotalIRABasisAmt>",
  );
  const [pdf] = form8606Pdf.instances!(pending.form8606, filer, pending);
  assertEquals(pdf.print_owner_name, "Blair Saver");
  assertEquals(pdf.print_owner_ssn, "999887777");
  assertEquals(pdf.print_line14_remaining_basis, 7_000);
});

Deno.test("spouse zero-opening-basis route rejects missing separate-form review and owner, source or return tampering", () => {
  const pending = filedReturn();
  const filer = extractFilerIdentity(general);
  const changed = (next: Record<string, Record<string, unknown>>) => ({
    ...pending,
    ...next,
  });
  const alterations: Array<Record<string, Record<string, unknown>>> = [
    {
      form8606: {
        ...pending.form8606,
        filing_details: {
          ...pending.form8606.filing_details,
          other_spouse_form8606_not_required_confirmed: undefined,
        },
      },
    },
    {
      form8606: {
        ...pending.form8606,
        zero_basis_source: {
          ...source,
          form5498: { ...source.form5498, owner_ssn: "111223333" },
        },
      },
    },
    {
      form8606: {
        ...pending.form8606,
        zero_basis_source: {
          ...source,
          prior_form8606: {
            ...source.prior_form8606,
            source_document_reference: "Changed prior return",
          },
        },
      },
    },
    {
      w2: {
        ...pending.w2,
        w2s: [{
          ...((pending.w2.w2s as Record<string, unknown>[])[0]),
          employee_ssn: "111-22-3333",
        }],
      },
    },
    { f1040: { ...pending.f1040, line11_agi: 199_999 } },
  ];
  for (const alteration of alterations) {
    const altered = changed(alteration);
    assertThrows(
      () => form8606.build(altered.form8606, { filer, pending: altered }),
      Error,
    );
    assertThrows(
      () => form8606Pdf.instances!(altered.form8606, filer, altered),
      Error,
    );
  }
});
