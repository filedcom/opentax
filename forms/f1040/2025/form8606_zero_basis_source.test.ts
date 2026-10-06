import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { FilingStatus } from "../nodes/types.ts";
import { IraOwner } from "../nodes/intermediate/forms/form8606/index.ts";
import { extractFilerIdentity } from "../mef/filer.ts";
import { form8606 } from "./mef/forms/f8606.ts";
import { form8606Pdf } from "./pdf/forms/f8606.ts";
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
const source = {
  form5498: {
    tax_year: 2025 as const,
    source_document_reference: "2025 issued traditional IRA Form 5498",
    custodian_ein: "123456789",
    owner_ssn: "111223333",
    traditional_ira_confirmed: true as const,
    no_returned_contributions_confirmed: true as const,
    no_sep_or_simple_employer_contributions_confirmed: true as const,
    box1_ira_contributions: 7_000,
    box2_rollover_contributions: 0 as const,
  },
  prior_form8606: {
    tax_year: 2024 as const,
    source_document_reference: "2024 filed Form 8606 line 14",
    owner_ssn: "111223333",
    filed_line14_basis: 0 as const,
  },
};

function filedReturn() {
  const result = f1040_2025.executeReturn({
    general,
    w2: [{
      employee_ssn: "111-22-3333",
      box1_wages: 100_000,
      box2_fed_withheld: 15_000,
      box13_retirement_plan: true,
    }],
    ira_deduction_worksheet: {
      filing_status: FilingStatus.Single,
      magi: 100_000,
      ira_contribution: 7_000,
      active_participant: true,
      form8606_filing_details: {
        owner: IraOwner.Taxpayer,
        prior_basis_documented_from_2024_form8606: true,
        no_ira_distributions_or_conversions_confirmed: true,
      },
      form8606_zero_basis_source: source,
    },
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("sourced zero-opening-basis IRA contribution joins Form 8606, Form 1040, native and PDF", () => {
  const result = filedReturn();
  assertEquals(result.pending.form8606?.print_line1_nondeductible, 7_000);
  assertEquals(result.pending.form8606?.print_line2_prior_basis, 0);
  assertEquals(result.pending.form8606?.print_line14_remaining_basis, 7_000);
  assertEquals(result.pending.schedule1?.line20_ira_deduction ?? 0, 0);
  assertEquals(result.pending.f1040?.line4a_ira_gross ?? 0, 0);
  assertEquals(result.pending.f1040?.line4b_ira_taxable ?? 0, 0);
  assertEquals(result.carryforwards.ira_remaining_basis_8606, 7_000);
  const pending = normalizeForm8606TestPending(result.pending);
  const filer = extractFilerIdentity(general);
  const xml = form8606.build(pending.form8606, { filer, pending });
  assert(typeof xml === "string");
  assertStringIncludes(
    xml,
    "<NondedIRACurrTYNondedContriAmt>7000</NondedIRACurrTYNondedContriAmt>",
  );
  assertStringIncludes(
    xml,
    "<NondedIRABasisForPYAmt>0</NondedIRABasisForPYAmt>",
  );
  assertStringIncludes(
    xml,
    "<NondedIRATotalIRABasisAmt>7000</NondedIRATotalIRABasisAmt>",
  );
  const [pdf] = form8606Pdf.instances!(pending.form8606, filer, pending);
  assertEquals(pdf.print_line1_nondeductible, 7_000);
  assertEquals(pdf.print_line2_prior_basis, 0);
  assertEquals(pdf.print_line14_remaining_basis, 7_000);
});

Deno.test("Form 8606 zero basis rejects a changed issuer, owner, prior record, worksheet or return", () => {
  const result = filedReturn();
  const pending = normalizeForm8606TestPending(result.pending);
  const filer = extractFilerIdentity(general);
  const changed = (next: Record<string, Record<string, unknown>>) => ({
    ...pending,
    ...next,
  });
  const sourceField = pending.form8606.zero_basis_source as typeof source;
  for (
    const alteration of [
      {
        form5498: { ...sourceField.form5498, box1_ira_contributions: 6_999 },
        prior_form8606: sourceField.prior_form8606,
      },
      {
        form5498: { ...sourceField.form5498, owner_ssn: "999887777" },
        prior_form8606: sourceField.prior_form8606,
      },
      {
        form5498: sourceField.form5498,
        prior_form8606: {
          ...sourceField.prior_form8606,
          source_document_reference: "Different 2024 return",
        },
      },
    ]
  ) {
    const altered = changed({
      form8606: { ...pending.form8606, zero_basis_source: alteration },
    });
    assertThrows(
      () => form8606.build(altered.form8606, { filer, pending: altered }),
      Error,
    );
    assertThrows(
      () => form8606Pdf.instances!(altered.form8606, filer, altered),
      Error,
    );
  }
  assertThrows(
    () =>
      form8606.build(pending.form8606, {
        filer,
        pending: changed({
          ira_deduction_worksheet: {
            ...pending.ira_deduction_worksheet,
            ira_contribution: 6_999,
          },
        }),
      }),
    Error,
  );
  assertThrows(
    () =>
      form8606.build(pending.form8606, {
        filer,
        pending: changed({
          f1040: { ...pending.f1040, line4b_ira_taxable: 1 },
        }),
      }),
    Error,
  );
  assertThrows(
    () =>
      form8606.build(pending.form8606, {
        filer,
        pending: changed({
          w2: {
            ...pending.w2,
            w2s: [{
              ...((pending.w2.w2s as Record<string, unknown>[])[0]),
              box13_retirement_plan: false,
            }],
          },
        }),
      }),
    Error,
  );
  assertThrows(
    () =>
      form8606.build(pending.form8606, {
        filer,
        pending: changed({
          f1040: { ...pending.f1040, line11_agi: 99_999 },
        }),
      }),
    Error,
  );
});
