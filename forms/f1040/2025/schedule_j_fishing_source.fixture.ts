// deno-lint-ignore-file no-explicit-any
import { createHash } from "node:crypto";
import { scheduleJNonfarmW2Inputs } from "./schedule_j_nonfarm_w2.fixture.ts";

export const scheduleJFishingCases = [
  "fishing",
  "mixed-one-farm",
  "mixed-two-farm",
] as const;
export type ScheduleJFishingCase = typeof scheduleJFishingCases[number];

/** Ada's reviewed investment and farm return, with a retained 2025 catch and paid-supplies ledger. */
export function scheduleJFishingInputs(
  kind: ScheduleJFishingCase,
): Record<string, unknown> {
  const input = scheduleJNonfarmW2Inputs() as any;
  delete input.w2;
  delete input.schedule_j.nonfarm_wage_source;
  if (input.schedule_f) {
    input.schedule_f.schedule_fs[0].proprietor_recipient = "T";
    input.schedule_f.schedule_fs[0].qbi_no_other_adjustments_confirmed = true;
  }
  if (kind === "fishing") delete input.schedule_f;
  if (kind === "mixed-two-farm") {
    const first = input.schedule_f.schedule_fs[0];
    first.line2_sales_products_raised = 120_000;
    input.schedule_f.schedule_fs.push({
      ...structuredClone(first),
      farm_id: "ada-orchard",
      line_a_principal_crop_activity: "FRUIT FARMING",
      line_b_agricultural_activity_code: "111300",
      line2_sales_products_raised: 80_000,
    });
  }
  const owner = String(input.general.taxpayer_ssn).replaceAll("-", "");
  const ledger = {
    tax_year: 2025,
    taxpayer_ssn: owner,
    business_reference: "ada-commercial-fishing",
    catch_sales_record_reference: "ada-catch-ledger-2025",
    vessel_name: "Sea Harvest",
    commercial_harvest: true,
    scientific_research_vessel: false,
    sales: [{
      sold_on: "2025-09-10",
      buyer: "Gulf Fish Market",
      buyer_invoice_reference: "GFM-2025-011",
      catch_description: "Commercial gulf shrimp catch",
      amount: kind === "fishing" ? 340_000 : 140_000,
    }],
    supplies: [{
      paid_on: "2025-08-15",
      supplier: "Harbor Marine Supply",
      paid_receipt_reference: "HMS-2025-028",
      amount: 20_000,
    }],
  };
  const bytes = new TextEncoder().encode(JSON.stringify(ledger));
  input.schedule_c = [{
    business_reference: ledger.business_reference,
    line_a_principal_business: "Commercial fishing",
    line_c_business_name: "Ada Commercial Fishing",
    line_d_ein: "87-6543210",
    proprietor_recipient: "T",
    line_b_business_code: "114110",
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    line_i_made_1099_payments: false,
    qbi_no_other_adjustments_confirmed: true,
    line_1_gross_receipts: kind === "fishing" ? 340_000 : 140_000,
    line_22_supplies: 20_000,
    schedule_j_fishing_evidence: {
      business_reference: ledger.business_reference,
      catch_sales_record_reference: ledger.catch_sales_record_reference,
      harvested_fish_entered_commerce_verified: true,
      scientific_research_vessel: false,
      retained_catch_ledger: {
        document_id: ledger.catch_sales_record_reference,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        bytes_base64: btoa(String.fromCharCode(...bytes)),
      },
    },
  }];
  return input;
}
