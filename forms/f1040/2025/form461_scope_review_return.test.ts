import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../mef/header.ts";
import { filedForm461Schema } from "../nodes/intermediate/forms/form461/index.ts";
import { f1040_2025 } from "./index.ts";
import { form461 as native } from "./mef/forms/f461.ts";
import { normalizeAllPending } from "./pending.ts";
import { form461Pdf } from "./pdf/forms/f461.ts";

const review = {
  only_schedule_c_and_f_business_items: true,
  other_part_i_lines_zero: true,
  part_ii_adjustments_zero: true,
  post_at_risk_and_passive_limits_confirmed: true,
  line2_schedule_c_amount: -400_000,
  line6_schedule_f_amount: 0,
  source_document_refs: ["2025 sole proprietor source ledger"],
};
const filer = {
  primarySSN: "111223333",
  fullName: "Alex Owner",
  nameLine1: "Alex Owner",
  nameControl: "OWNE",
  filingStatus: FilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

function preparedReturn() {
  return f1040_2025.executeReturn({
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Owner",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-15",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      form461_scope_review: review,
    },
    w2: [{ box1_wages: 200_000, box2_fed_withheld: 40_000 }],
    schedule_c: [{
      line_a_principal_business: "Retail",
      line_b_business_code: "459999",
      line_c_business_name: "South Shop",
      business_reference: "south-2025",
      line_f_accounting_method: "cash",
      line_g_material_participation: true,
      line_32_at_risk: "a",
      line_1_gross_receipts: 0,
      line_27b_other_expenses: 400_000,
    }],
  });
}

Deno.test("signed Schedule C loss reaches Form 461, Schedule 1 addback, native, and PDF", () => {
  const result = preparedReturn();
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.form461?.line2_business_income_loss, -400_000);
  assertEquals(pending.form461?.line6_net_farm_profit_loss, 0);
  assertEquals(pending.form461?.line16_excess_business_loss, -87_000);
  assertEquals(pending.schedule1?.line8p_excess_business_loss, 87_000);
  assertEquals(result.carryforwards.excess_business_loss_nol_origin, 87_000);
  assertStringIncludes(
    native.build(filedForm461Schema.parse(pending.form461), { filer, pending }),
    "<ExcessBusinessLossAmt>-87000</ExcessBusinessLossAmt>",
  );
  assertEquals(
    form461Pdf.instances?.(pending.form461!, filer, pending)?.[0]
      .line16_excess_business_loss,
    -87_000,
  );
});

Deno.test("Form 461 full return rejects changed review, filed business line, and status", () => {
  const pending = normalizeAllPending(preparedReturn().pending);
  const changed = [
    {
      ...pending,
      general: {
        ...pending.general,
        form461_scope_review: {
          ...review,
          line2_schedule_c_amount: -399_999,
        },
      },
    },
    {
      ...pending,
      schedule1: { ...pending.schedule1, line3_schedule_c: -399_999 },
    },
    {
      ...pending,
      f1040: { ...pending.f1040, filing_status: "mfj" },
    },
  ];
  for (const altered of changed) {
    assertThrows(() =>
      native.build(filedForm461Schema.parse(pending.form461), {
        filer,
        pending: altered,
      })
    );
    assertThrows(() =>
      form461Pdf.instances?.(pending.form461!, filer, altered)
    );
  }
});
