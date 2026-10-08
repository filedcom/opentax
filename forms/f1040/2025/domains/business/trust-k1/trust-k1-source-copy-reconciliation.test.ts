import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { inputSchema } from "../../../../nodes/inputs/k1_trust/index.ts";
import { FilingStatus } from "../../../../nodes/types.ts";
import { IncomeCategory } from "../../../../nodes/intermediate/forms/form_1116/index.ts";
import { f1040_2025 } from "../../../index.ts";
import { normalizeAllPending } from "../../execution/pending.ts";
import {
  fieldName,
  filer,
  fixture,
  reference,
} from "./trust-k1-issued-copy.fixture.ts";
import { reconcileTrustK1SourceCopies } from "./trust-k1-source-copy-reconciliation.ts";

const recipient = {
  pdf_reference: reference,
  person_name: "Test Taxpayer",
  address: {
    kind: "us",
    line1: "1 Test Way",
    city: "Austin",
    state: "TX",
    zip: "78701",
  },
};
async function matchedFixture(
  values: Record<string, string> = {},
  extra: Record<string, unknown> = {},
  change?: (pdf: PDFDocument) => void,
) {
  const { source, documents } = await fixture((pdf) => {
    const form = pdf.getForm();
    for (
      const [key, value] of Object.entries({
        "f1_52[0]": "",
        "f1_53[0]": "",
        "f1_56[0]": "",
        "f1_57[0]": "",
        ...values,
      })
    ) form.getTextField(fieldName(key)).setText(value);
    change?.(pdf);
    form.updateFieldAppearances(form.getDefaultFont());
  });
  return {
    source: inputSchema.parse({
      k1_trusts: [{ ...source.k1_trusts[0], box1_interest: 234.56, ...extra }],
    }),
    documents,
  };
}

Deno.test("trust K-1 copy reconciliation joins ordinary public source through the real graph while credit/export remain guarded", async () => {
  const { source, documents } = await matchedFixture({
    "f1_13[0]": "100",
    "f1_14[0]": "50",
    "f1_15[0]": "30",
    "f1_16[0]": "80",
    "f1_19[0]": "200",
  }, {
    box2a_ordinary_dividends: 100,
    box2b_qualified_dividends: 50,
    box3_net_st_cap_gain: 30,
    box4a_net_lt_cap_gain: 80,
    box5_other_portfolio: 200,
  });
  const [copy] = await reconcileTrustK1SourceCopies(source, filer, documents, [
    recipient,
  ]);
  assertEquals(copy.directPrintedFactsMatched, true);
  assertEquals(copy.requiredStatements, []);
  assertEquals(copy.filingReady, false);
  const result = f1040_2025.executeReturn({
    general: {
      filing_status: FilingStatus.Single,
      taxpayer_first_name: "Test",
      taxpayer_last_name: "Taxpayer",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-15",
      digital_assets: false,
      address_line1: "1 Test Way",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    k1_trust: source.k1_trusts,
  });
  assertEquals(result.diagnostics, []);
  const pending = normalizeAllPending(result.pending);
  assertEquals(pending.f1040.line2b_taxable_interest, 234.56);
  assertEquals(pending.f1040.line3b_ordinary_dividends, 100);
  assertEquals(pending.f1040.line3a_qualified_dividends, 50);
  assertEquals(pending.schedule_d.line_5_k1_st, 30);
  assertEquals(pending.schedule_d.line_12_k1_lt, 80);
  assertEquals(pending.f1040.line8_additional_income, 200);
  assertEquals(pending.f1040.line25c_other_withheld, 125.25);
  assertEquals(pending.f1040.line25c_total, 125.25);
  assertEquals(pending.f1040.line25d_total_withholding, 125.25);
  assertEquals(pending.f1040.line33_total_payments, 125.25);
  assertEquals(pending.f1040.line34_overpayment, 125);
  assertThrows(
    () => f1040_2025.buildMefXml(pending, filer),
    Error,
    "trust K-1 backup withholding",
  );
  await assertRejects(
    () => f1040_2025.buildPdfBytes(pending, filer),
    Error,
    "trust K-1 backup withholding",
  );
});

Deno.test("trust K-1 copy reconciliation retains all currently modeled coded facts and outstanding statement references", async () => {
  const { source, documents } = await matchedFixture({
    "f1_20[0]": "300",
    "f1_21[0]": "400",
    "f1_22[0]": "500",
    "f1_30[0]": "A",
    "f1_31[0]": "10",
    "f1_32[0]": "C",
    "f1_33[0]": "20",
    "f1_34[0]": "D",
    "f1_35[0]": "30",
    "f1_40[0]": "A",
    "f1_41[0]": "-40",
    "f1_52[0]": "ZZ",
    "f1_53[0]": "50",
    "f1_56[0]": "B",
    "f1_57[0]": "25",
  }, {
    entity_type: "trust",
    box6_ordinary_business: 300,
    box7_rental_real_estate: 400,
    box8_other_rental: 500,
    box6_8_activity_statement: [{
      box: "6",
      activity_name: "Business",
      statement_reference: "business-stmt",
      income: 300,
    }, {
      box: "7",
      activity_name: "Rental",
      statement_reference: "rental-stmt",
      income: 400,
    }, {
      box: "8",
      activity_name: "Other rental",
      statement_reference: "other-rental-stmt",
      income: 500,
    }],
    box11_code_a_section67e_excess_deduction: 10,
    box11_code_a_statement_reference: "termination-a",
    box11_code_c_short_term_capital_loss_carryover: 20,
    box11_code_c_statement_reference: "termination-c",
    box11_code_d_long_term_capital_loss_carryover: 30,
    box11_code_d_statement_reference: "termination-d",
    box11_final_k1: true,
    box11_beneficiary_succeeds_to_property: true,
    box12_code_a_amt_adjustment: -40,
    box12_codes_b_through_f_absent: true,
    box12_codes_g_through_i_absent: true,
    box13_code_zz_new_markets_credit: 20,
    box13_code_zz_new_markets_statement_reference: "new-market-stmt",
    new_markets_credit_subject_to_passive_activity_limit: false,
    box13_code_zz_disabled_access_credit: 30,
    box13_code_zz_disabled_access_statement_reference: "disabled-access-stmt",
    disabled_access_credit_subject_to_passive_activity_limit: false,
    box14_foreign_tax: 25,
    box14_foreign_income: 100,
    box14_foreign_income_category: IncomeCategory.Passive,
  });
  const [copy] = await reconcileTrustK1SourceCopies(source, filer, documents, [
    recipient,
  ]);
  assertEquals(copy.directPrintedFactsMatched, true);
  assertEquals(
    copy.requiredStatements.map((
      { box, sourceReference },
    ) => [box, sourceReference]),
    [
      ["11:A", "termination-a"],
      ["11:C", "termination-c"],
      ["11:D", "termination-d"],
      ["13:ZZ:new-markets", "new-market-stmt"],
      ["13:ZZ:disabled-access", "disabled-access-stmt"],
      ["14:B:foreign-tax-information", undefined],
      ["6", "business-stmt"],
      ["7", "rental-stmt"],
      ["8", "other-rental-stmt"],
    ],
  );
  assertEquals(copy.filingReady, false);
});

for (
  const [key, value] of [
    ["f1_12[0]", "235.56"],
    ["f1_13[0]", "10"],
    ["f1_14[0]", "10"],
    ["f1_15[0]", "10"],
    ["f1_16[0]", "10"],
    ["f1_19[0]", "10"],
    ["f1_20[0]", "10"],
    ["f1_21[0]", "10"],
    ["f1_22[0]", "10"],
    ["f1_30[0]", "A"],
    ["f1_40[0]", "A"],
    ["f1_56[0]", "B"],
  ] as const
) {
  Deno.test(`trust K-1 copy reconciliation rejects unreported printed fact ${key}`, async () => {
    const values: Record<string, string> = { [key]: value };
    if (key === "f1_30[0]") values["f1_31[0]"] = "10";
    if (key === "f1_40[0]") values["f1_41[0]"] = "10";
    if (key === "f1_56[0]") values["f1_57[0]"] = "10";
    const { source, documents } = await matchedFixture(values);
    await assertRejects(
      () => reconcileTrustK1SourceCopies(source, filer, documents, [recipient]),
      Error,
      "differs from public source facts",
    );
  });
}

for (
  const [box, values] of [
    ["box9", { "f1_23[0]": "A", "f1_24[0]": "10" }],
    ["box11", { "f1_30[0]": "B", "f1_31[0]": "10" }],
    ["box12", { "f1_40[0]": "B", "f1_41[0]": "10" }],
    ["box13", { "f1_52[0]": "A", "f1_53[0]": "10" }],
    ["box14", { "f1_56[0]": "E", "f1_57[0]": "10" }],
  ] as const
) {
  Deno.test(`trust K-1 copy reconciliation rejects unmodeled ${box} without dropping it`, async () => {
    const { source, documents } = await matchedFixture(values);
    await assertRejects(
      () => reconcileTrustK1SourceCopies(source, filer, documents, [recipient]),
      Error,
      `printed ${box}`,
    );
  });
}

Deno.test("trust K-1 copy reconciliation rejects claimed amounts absent from the copy and changed trust name", async () => {
  const { source, documents } = await matchedFixture();
  source.k1_trusts[0].box2a_ordinary_dividends = 10;
  await assertRejects(
    () => reconcileTrustK1SourceCopies(source, filer, documents, [recipient]),
    Error,
    "box2a_ordinary_dividends",
  );
  source.k1_trusts[0].box2a_ordinary_dividends = undefined;
  source.k1_trusts[0].estate_trust_name = "Other Trust";
  await assertRejects(
    () => reconcileTrustK1SourceCopies(source, filer, documents, [recipient]),
    Error,
    "trust name",
  );
});

Deno.test("trust K-1 copy reconciliation requires the claimed final-year mark", async () => {
  const { source, documents } = await matchedFixture({
    "f1_30[0]": "A",
    "f1_31[0]": "10",
  }, {
    box11_code_a_section67e_excess_deduction: 10,
    box11_code_a_statement_reference: "termination-stmt",
    box11_final_k1: true,
    box11_beneficiary_succeeds_to_property: true,
  }, (pdf) => pdf.getForm().getCheckBox(fieldName("c1_1[0]")).uncheck());
  await assertRejects(
    () => reconcileTrustK1SourceCopies(source, filer, documents, [recipient]),
    Error,
    "printed final K1 indicator",
  );
});

Deno.test("trust K-1 copy reconciliation flags entered foreign workpaper facts for statement review even without a printed tax amount", async () => {
  const { source, documents } = await matchedFixture({}, {
    box14_foreign_deductions: 5,
    box14_foreign_deductions_explanation: "Foreign expenses workpaper",
  });
  const [copy] = await reconcileTrustK1SourceCopies(source, filer, documents, [
    recipient,
  ]);
  assertEquals(copy.requiredStatements, [{
    box: "14:B:foreign-tax-information",
  }]);
  assertEquals(copy.filingReady, false);
});
