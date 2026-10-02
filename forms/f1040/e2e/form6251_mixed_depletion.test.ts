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

const business = {
  line_a_principal_business: "Natural resource extraction",
  line_b_business_code: "212000",
  line_c_business_name: "Resource Business",
  business_reference: "resource-business-2025",
  line_f_accounting_method: "cash",
  line_g_material_participation: true,
  line_i_made_1099_payments: false,
  line_1_gross_receipts: 200_000,
  line_12_depletion: 200_000,
  amt_depletion_worksheet: {
    source_reference: "2025 property depletion and income/basis workpaper",
    all_property_income_and_basis_limits_applied_verified: true,
    no_at_risk_or_basis_limitation_verified: true,
    properties: [
      {
        property_reference: "property-a-2025",
        regular_allowed_depletion: 180_000,
        amt_allowed_depletion: 20_000,
      },
      {
        property_reference: "property-b-2025",
        regular_allowed_depletion: 20_000,
        amt_allowed_depletion: 30_000,
      },
    ],
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
    schedule_c: [business],
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

Deno.test("mixed property depletion reaches 6251, Schedule 2, 1040, MeF and PDF", async () => {
  const { fields, pending } = filing();
  assertEquals(pending.schedule1?.line3_schedule_c, 0);
  assertEquals(fields.line2d_depletion, 150_000);
  assert(typeof fields.line11_amt === "number" && fields.line11_amt > 0);
  assertEquals(pending.schedule2?.line2_amt, fields.line11_amt);
  assertEquals(pending.f1040?.line17_additional_taxes, fields.line11_amt);
  assertStringIncludes(
    nativeForm6251.build(fields, { pending, filer: testFiler() }),
    "<DepletionAmt>150000</DepletionAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields!(fields, pending).line2d_depletion,
    150_000,
  );
  const bundle = await buildMefBundle(buildPending(pending), {
    filer: testFiler(),
    attachments: [],
  });
  assertStringIncludes(bundle.xml, "<DepletionAmt>150000</DepletionAmt>");
});

Deno.test("mixed depletion rejects changed property and final-return facts", () => {
  const { fields, pending } = filing();
  const changedProperty = {
    ...pending,
    schedule_c: {
      schedule_cs: [{
        ...business,
        amt_depletion_worksheet: {
          ...business.amt_depletion_worksheet,
          properties: [
            business.amt_depletion_worksheet.properties[0],
            {
              ...business.amt_depletion_worksheet.properties[1],
              amt_allowed_depletion: 29_999,
            },
          ],
        },
      }],
    },
  };
  for (
    const tampered of [
      changedProperty,
      {
        ...pending,
        schedule1: { ...pending.schedule1, line3_schedule_c: 299_999 },
      },
      { ...pending, schedule2: { ...pending.schedule2, line2_amt: 0 } },
      {
        ...pending,
        f1040: { ...pending.f1040, line17_additional_taxes: 0 },
      },
    ]
  ) {
    assertThrows(() =>
      nativeForm6251.build(fields, { pending: tampered, filer: testFiler() })
    );
    assertThrows(() => form6251Pdf.projectFields!(fields, tampered));
  }
  assertThrows(() =>
    nativeForm6251.build({ ...fields, line2d_depletion: 149_999 }, {
      pending,
      filer: testFiler(),
    })
  );
});
