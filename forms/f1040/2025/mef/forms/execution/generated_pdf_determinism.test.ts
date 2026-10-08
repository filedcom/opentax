import { assertEquals } from "@std/assert";
import { FilingStatus } from "../../types.ts";
import { Form8978Source } from "../../../../nodes/inputs/f8978/index.ts";
import { buildForm8978Statements } from "../taxes/f8978_statement.ts";
import { buildAdditionalQmidAttachment } from "../credits/f5695_qmid_attachment.ts";

Deno.test("generated Form 8978 and QMID attachment bytes are stable across builds", async () => {
  const filer = {
    primarySSN: "123456789",
    fullName: "Alex Taxpayer",
    nameLine1: "TAXPAYER ALEX",
    nameControl: "TAXP",
    address: { line1: "1 Test Way", city: "Austin", state: "TX", zip: "78701" },
    filingStatus: FilingStatus.Single,
  };
  const form8978 = {
    filings: [{
      source: Form8978Source.BbaAudit,
      columns: [{
        tax_year_end: "2022-12-31",
        original_income: 20_000,
        income_adjustments: [{
          description: "Schedule K-1 ordinary income",
          amount: 2_000,
          tracking_number: "20240101-000001",
        }],
        original_deductions: 5_000,
        deduction_adjustments: [],
        corrected_income_tax: 1_500,
        corrected_amt: 0,
        original_credits: 0,
        credit_adjustments: [],
        original_tax_liability: 1_000,
        tax_calculation_explanation: "2022 tax recomputation.",
      }],
    }],
  };
  const form5695 = {
    part_ii_section_a: {
      main_home_in_us: true,
      original_user: true,
      five_year_use: true,
      home_address: filer.address,
      related_to_new_home: false,
      exterior_doors: [
        { cost: 1_000, qmid: "A1B2" },
        { cost: 900, qmid: "C3D4" },
        { cost: 800, qmid: "E5F6" },
        { cost: 700, qmid: "G7H8" },
      ],
    },
  };
  const [first8978, firstQmid] = await Promise.all([
    buildForm8978Statements(form8978, filer),
    buildAdditionalQmidAttachment(form5695, filer),
  ]);
  await new Promise((resolve) => setTimeout(resolve, 1_200));
  const [second8978, secondQmid] = await Promise.all([
    buildForm8978Statements(form8978, filer),
    buildAdditionalQmidAttachment(form5695, filer),
  ]);
  assertEquals(first8978.length, 1);
  assertEquals(first8978[0].bytes, second8978[0].bytes);
  assertEquals(firstQmid?.bytes, secondQmid?.bytes);
});
