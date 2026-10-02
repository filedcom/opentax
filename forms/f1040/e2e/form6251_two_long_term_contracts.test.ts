import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { execute } from "../../../core/runtime/executor.ts";
import { registry } from "../2025/registry.ts";
import { form6251 as nativeForm6251 } from "../2025/mef/forms/f6251.ts";
import { form6251Pdf } from "../2025/pdf/forms/f6251.ts";
import { testFiler } from "../2025/mef/test-filer.ts";
import { buildPending } from "../2025/mef/pending.ts";
import { buildMefBundle } from "../2025/mef/builder.ts";

const first = {
  line_a_principal_business: "Non-home construction contracting",
  line_b_business_code: "238990",
  line_c_business_name: "First Contracting Business",
  business_reference: "contract-business-one-2025",
  line_f_accounting_method: "cash",
  line_g_material_participation: true,
  line_i_made_1099_payments: false,
  line_1_gross_receipts: 0,
  amt_long_term_contract_workpaper: {
    contract_reference: "contract-one-2025",
    signed_contract_reference: "signed-contract-one-2025",
    cost_records_reference: "cost-ledger-one-2025",
    cost_estimate_review_reference: "estimate-review-one-2025",
    fixed_contract_price: 1_000_000,
    amt_allocable_costs_incurred_2025: 100_000,
    amt_estimated_total_allocable_costs: 400_000,
    began_in_2025: true,
    uncompleted_at_2025_year_end: true,
    non_home_construction_contract_verified: true,
    regular_section_460_e_1_exception_verified: true,
    regular_receipts_and_costs_deferred_verified: true,
    amt_cost_allocation_reviewed: true,
  },
} as const;

const second = {
  ...first,
  line_c_business_name: "Second Contracting Business",
  business_reference: "contract-business-two-2025",
  amt_long_term_contract_workpaper: {
    ...first.amt_long_term_contract_workpaper,
    contract_reference: "contract-two-2025",
    signed_contract_reference: "signed-contract-two-2025",
    cost_records_reference: "cost-ledger-two-2025",
    cost_estimate_review_reference: "estimate-review-two-2025",
    fixed_contract_price: 600_000,
    amt_allocable_costs_incurred_2025: 80_000,
    amt_estimated_total_allocable_costs: 300_000,
  },
} as const;

function filing() {
  const result = execute(buildExecutionPlan(registry), registry, {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "123-45-6789",
      taxpayer_dob: "1980-06-15",
      digital_assets: false,
    },
    w2: [{
      employee_ssn: "123-45-6789",
      box1_wages: 300_000,
      box2_fed_withheld: 65_000,
      box3_ss_wages: 176_100,
      box4_ss_withheld: 10_918.2,
      box5_medicare_wages: 300_000,
      box6_medicare_withheld: 4_350,
      employer_ein: "12-3456789",
      employer_name: "ACME Corp",
      employer_address_line1: "2 Payroll Road",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box12_entries: [],
    }],
    schedule_c: [first, second],
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      fincen_form114_required: false,
      foreign_trust_question: false,
    },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  const fields = result.pending.form6251;
  assert(fields);
  return { fields, pending: result.pending };
}

Deno.test("two first-year contracts reach Form 6251 line 2p, Schedule 2, Form 1040, native and PDF", async () => {
  const { fields, pending } = filing();
  assertEquals(pending.schedule1?.line3_schedule_c, 0);
  assertEquals(fields.line2p_long_term_contracts, 230_000);
  assert(typeof fields.line11_amt === "number" && fields.line11_amt > 0);
  assertEquals(pending.schedule2?.line2_amt, fields.line11_amt);
  assertEquals(pending.f1040?.line17_additional_taxes, fields.line11_amt);
  assertStringIncludes(
    nativeForm6251.build(fields, { pending, filer: testFiler() }),
    "<LongTermContractAmt>230000</LongTermContractAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields!(fields, pending).line2p_long_term_contracts,
    230_000,
  );
  const bundle = await buildMefBundle(buildPending(pending), {
    filer: testFiler(),
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<LongTermContractAmt>230000</LongTermContractAmt>",
  );
});

Deno.test("two contracts reject duplicate identity, changed costs, receipts and final tax", () => {
  const { fields, pending } = filing();
  for (
    const changed of [
      {
        ...second,
        business_reference: first.business_reference,
      },
      {
        ...second,
        amt_long_term_contract_workpaper: {
          ...second.amt_long_term_contract_workpaper,
          signed_contract_reference:
            first.amt_long_term_contract_workpaper.signed_contract_reference,
        },
      },
      {
        ...second,
        amt_long_term_contract_workpaper: {
          ...second.amt_long_term_contract_workpaper,
          amt_allocable_costs_incurred_2025: 90_000,
        },
      },
      { ...second, line_1_gross_receipts: 1 },
    ]
  ) {
    const tampered = {
      ...pending,
      schedule_c: { schedule_cs: [first, changed] },
    };
    assertThrows(() =>
      nativeForm6251.build(fields, { pending: tampered, filer: testFiler() })
    );
    assertThrows(() => form6251Pdf.projectFields!(fields, tampered));
  }
  for (
    const tampered of [
      { ...pending, schedule1: { ...pending.schedule1, line3_schedule_c: 1 } },
      { ...pending, schedule2: { ...pending.schedule2, line2_amt: 0 } },
    ]
  ) {
    assertThrows(() =>
      nativeForm6251.build(fields, { pending: tampered, filer: testFiler() })
    );
    assertThrows(() => form6251Pdf.projectFields!(fields, tampered));
  }
  assertThrows(() =>
    nativeForm6251.build(
      { ...fields, line2p_long_term_contracts: 229_999 },
      { pending, filer: testFiler() },
    )
  );
});
