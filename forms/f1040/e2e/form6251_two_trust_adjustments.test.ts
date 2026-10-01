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
  estate_trust_name: "North Trust",
  estate_trust_ein: "123456789",
  source_document_reference: "north-issued-2025-k1",
  beneficiary_ssn: "123456789",
  box12_code_a_amt_adjustment: 200_000,
  box12_codes_b_through_f_absent: true,
  box12_codes_g_through_i_absent: true,
} as const;
const second = {
  estate_trust_name: "South Estate",
  estate_trust_ein: "987654321",
  source_document_reference: "south-issued-2025-k1",
  beneficiary_ssn: "123456789",
  box12_code_a_amt_adjustment: -10_000,
  box12_codes_b_through_f_absent: true,
  box12_codes_g_through_i_absent: true,
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
    k1_trust: [first, second],
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

Deno.test("two signed trust K-1 adjustments reach 6251, Schedule 2, 1040, native and PDF", async () => {
  const { fields, pending } = filing();
  assertEquals(fields.line2j_estates_and_trusts, 190_000);
  assert(typeof fields.line11_amt === "number" && fields.line11_amt > 0);
  assertEquals(pending.schedule2?.line2_amt, fields.line11_amt);
  assertEquals(pending.f1040?.line17_additional_taxes, fields.line11_amt);
  assertStringIncludes(
    nativeForm6251.build(fields, { pending, filer: testFiler() }),
    "<EstatesAndTrustsAmt>190000</EstatesAndTrustsAmt>",
  );
  assertEquals(
    form6251Pdf.projectFields!(fields, pending).line2j_estates_and_trusts,
    190_000,
  );
  const bundle = await buildMefBundle(buildPending(pending), {
    filer: testFiler(),
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<EstatesAndTrustsAmt>190000</EstatesAndTrustsAmt>",
  );
});

Deno.test("two trust adjustments reject changed owner, source, and return tax", () => {
  const { fields, pending } = filing();
  for (
    const tampered of [
      {
        ...pending,
        k1_trust: {
          k1_trusts: [first, { ...second, beneficiary_ssn: "999887777" }],
        },
      },
      {
        ...pending,
        k1_trust: {
          k1_trusts: [first, {
            ...second,
            box12_code_a_amt_adjustment: -9_999,
          }],
        },
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
    nativeForm6251.build({ ...fields, line2j_estates_and_trusts: 189_999 }, {
      pending,
      filer: testFiler(),
    })
  );
});
