import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { registry } from "../../../../2025/registry.ts";
import { form6251 as nativeForm6251 } from "../../../../2025/mef/forms/taxes/amt/f6251.ts";
import { form6251Pdf } from "../../../../2025/pdf/forms/taxes/amt/f6251.ts";
import { testFiler } from "../../../../2025/mef/execution/test-filer.ts";
import { buildPending } from "../../../../2025/mef/execution/pending.ts";
import { buildMefBundle } from "../../../../2025/mef/builder.ts";
import { buildPdfBytes } from "../../../../2025/pdf/builder.ts";

const contract = {
  line_a_principal_business: "Non-home construction contracting",
  line_b_business_code: "238990",
  line_c_business_name: "Taxpayer Contracting",
  business_reference: "contract-2025",
  line_f_accounting_method: "cash",
  line_g_material_participation: true,
  line_i_made_1099_payments: false,
  line_1_gross_receipts: 0,
  amt_long_term_contract_workpaper: {
    contract_reference: "contract-one",
    signed_contract_reference: "signed-contract-2025",
    cost_records_reference: "contract-cost-ledger-2025",
    cost_estimate_review_reference: "contract-estimate-review-2025",
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

function filing() {
  return execute(buildExecutionPlan(registry), registry, {
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
    schedule_c: [contract],
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      fincen_form114_required: false,
      foreign_trust_question: false,
    },
  }, { taxYear: 2025, formType: "f1040" });
}

Deno.test("Form 6251 first-year long-term contract uses AMT percentage of completion", async () => {
  const result = filing();
  assertEquals(result.diagnostics, []);
  const fields = result.pending.form6251!;
  assertEquals(result.pending.schedule1?.line3_schedule_c, 0);
  assertEquals(fields.line2p_long_term_contracts, 150_000);
  assertEquals(
    typeof fields.line11_amt === "number" && fields.line11_amt > 0,
    true,
  );
  assertEquals(result.pending.schedule2?.line2_amt, fields.line11_amt);
  assertEquals(
    result.pending.f1040?.line17_additional_taxes,
    fields.line11_amt,
  );
  const xml = nativeForm6251.build(fields, {
    pending: result.pending,
    filer: testFiler(),
  });
  assertStringIncludes(
    xml,
    "<LongTermContractAmt>150000</LongTermContractAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields!(fields, result.pending)
      .line2p_long_term_contracts,
    150_000,
  );
  assertEquals(
    form6251Pdf.fields.find((field) =>
      field.domainKey === "line2p_long_term_contracts"
    )?.pdfField,
    "topmostSubform[0].Page1[0].f1_20[0]",
  );
  const pending = buildPending(result.pending);
  const finalFiler = {
    ...testFiler(),
    nameLine1: "ALEX TAXPAYER",
    firstNameWithInitial: "Alex",
    lastName: "Taxpayer",
  };
  const bundle = await buildMefBundle(pending, {
    filer: finalFiler,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<LongTermContractAmt>150000</LongTermContractAmt>",
  );
  const pdf = await buildPdfBytes(pending, finalFiler, ".pdf-cache", bundle);
  assertEquals((await PDFDocument.load(pdf)).getPageCount() >= 4, true);

  for (
    const changed of [
      {
        ...contract,
        amt_long_term_contract_workpaper: {
          ...contract.amt_long_term_contract_workpaper,
          fixed_contract_price: 900_000,
        },
      },
      {
        ...contract,
        amt_long_term_contract_workpaper: {
          ...contract.amt_long_term_contract_workpaper,
          non_home_construction_contract_verified: false,
        },
      },
      { ...contract, line_1_gross_receipts: 1 },
    ]
  ) {
    const tampered = {
      ...result.pending,
      schedule_c: { schedule_cs: [changed] },
    };
    assertThrows(() =>
      nativeForm6251.build(fields, {
        pending: tampered,
        filer: testFiler(),
      })
    );
    assertThrows(() => form6251Pdf.projectFields!(fields, tampered));
  }
  const changedSchedule1 = {
    ...result.pending,
    schedule1: { ...result.pending.schedule1, line3_schedule_c: 1 },
  };
  assertThrows(() =>
    nativeForm6251.build(fields, {
      pending: changedSchedule1,
      filer: testFiler(),
    })
  );
  assertThrows(() => form6251Pdf.projectFields!(fields, changedSchedule1));
  assertThrows(() =>
    nativeForm6251.build({
      ...fields,
      line2p_long_term_contracts: 149_999,
    }, { pending: result.pending, filer: testFiler() })
  );
});
