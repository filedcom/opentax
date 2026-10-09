import { dependentFilingSchema } from "../../nodes/inputs/general/filing/general/index.ts";
import { irs1040 } from "../../2025/mef/forms/general/return-assembly/f1040.ts";
import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { f1040_2025 } from "../../2025/index.ts";
import { w2 as nativeW2 } from "../../2025/mef/forms/income/other/w2.ts";
import { irs1040Pdf } from "../../2025/pdf/forms/general/return-assembly/f1040.ts";
import { fillFormPdf } from "../../2025/pdf/builder.ts";
import { extractFilerIdentity } from "../../mef/filer.ts";
import {
  scenario104005HouseholdInput,
  scenario104005PartialInput,
  SCENARIO_1040_05_RECONCILIATION,
} from "./scenario_1040_05_input.ts";
import { SCENARIO_1040_05_FACTS } from "./ty2025_cases.ts";

Deno.test("ATS 1040 Scenario 5 issued wages reach calculation, native W-2 and partial PDF", async () => {
  const result = f1040_2025.executeReturn(scenario104005PartialInput());
  assertEquals(result.diagnostics, []);
  const form = result.pending.f1040;
  const expected = SCENARIO_1040_05_RECONCILIATION;
  assertEquals(form?.line1a_wages, expected.form1040Line1aWages);
  assertEquals(form?.line25a_w2_withheld, expected.form1040Line25aWithholding);
  const filer = extractFilerIdentity(form)!;
  assertEquals(filer.primarySSN.replaceAll("-", ""), "400001039");
  const copies = nativeW2.build(result.pending.w2, { filer });
  assertEquals(copies.length, 1);
  for (
    const fragment of [
      "<EmployeeSSN>400001039</EmployeeSSN>",
      "<EmployerEIN>000000029</EmployerEIN>",
      "<WagesAmt>31232</WagesAmt>",
      "<WithholdingAmt>1754</WithholdingAmt>",
      "<SocialSecurityWagesAmt>31232</SocialSecurityWagesAmt>",
      "<SocialSecurityTaxAmt>1936</SocialSecurityTaxAmt>",
      "<MedicareWagesAndTipsAmt>31232</MedicareWagesAndTipsAmt>",
      "<MedicareTaxWithheldAmt>453</MedicareTaxWithheldAmt>",
    ]
  ) assertStringIncludes(copies[0], fragment);
  const projected = irs1040Pdf.projectFields!({
    line28_actc: form?.line28_actc,
    filing_status: form?.filing_status,
    presidential_campaign_fund_taxpayer: form
      ?.presidential_campaign_fund_taxpayer,
    taxpayer_blind: form?.taxpayer_blind,
    digital_assets: form?.digital_assets,
    line1a_wages: form?.line1a_wages,
    line25a_w2_withheld: form?.line25a_w2_withheld,
  }, result.pending);
  assertEquals(form?.line28_actc ?? 0, 0);
  assertEquals(projected.line28_actc ?? 0, 0);
  assertEquals(projected.print_do_not_claim_actc, true);
  const native1040 = irs1040.build(projected, {
    filer,
    pending: result.pending,
  });
  assertStringIncludes(native1040, "<DoNotClaimACTCInd>X</DoNotClaimACTCInd>");
  assertEquals(native1040.includes("<AdditionalChildTaxCreditAmt>"), false);
  assertEquals(projected.filing_status, "hoh");
  assertEquals(projected.presidential_campaign_fund_taxpayer, true);
  assertEquals(projected.taxpayer_blind, true);
  assertEquals(projected.digital_assets, false);
  assertEquals(projected.line1a_wages, 31_232);
  assertEquals(projected.line25a_w2_withheld, 1_754);
  const pdf = await fillFormPdf(irs1040Pdf, projected, filer, ".pdf-cache");
  assertEquals((await PDFDocument.load(pdf!)).getPageCount(), 2);
});

Deno.test("ATS 1040 Scenario 5 wage fixture retains printed identity without inventing credit or refund targets", () => {
  const input = scenario104005PartialInput();
  assertEquals(input.general.taxpayer_blind, true);
  assertEquals(input.general.filing_status, "hoh");
  assertEquals(input.general.digital_assets, false);
  assertEquals(input.general.presidential_campaign_fund_taxpayer, true);
  assertEquals(Object.keys(input).sort(), ["f8812", "general", "w2"]);
  assertEquals(SCENARIO_1040_05_FACTS.form2441.printedCredit, null);
  assertEquals(
    SCENARIO_1040_05_FACTS.form8863.printedLine30AmericanOpportunityCredit,
    null,
  );
  assertEquals(SCENARIO_1040_05_FACTS.form8862.creditBoxesMarkedOnLine2, []);
  assertEquals(SCENARIO_1040_05_RECONCILIATION.missing.length, 5);
});

Deno.test("ATS 1040 Scenario 5 opt-out cannot coexist with a positive ACTC in native or PDF output", () => {
  const input = scenario104005PartialInput();
  assertEquals(input.f8812, [{ do_not_claim_actc: true }]);
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const fields = {
    line28_actc: 1,
    presidential_campaign_fund_taxpayer: true,
    filing_status: "hoh",
  };
  assertThrows(
    () => irs1040.build(fields, { pending: result.pending }),
    Error,
    "opt-out requires zero",
  );
  assertThrows(
    () => irs1040Pdf.projectFields!(fields, result.pending),
    Error,
    "opt-out requires zero",
  );
});

Deno.test("ATS 1040 Scenario 5 household identities survive without inferred credit eligibility", () => {
  const input = scenario104005HouseholdInput();
  const result = f1040_2025.executeReturn(input);
  assertEquals(result.diagnostics, []);
  const form = result.pending.f1040;
  assertEquals(form.dependent_count, 2);
  assertEquals(form.qualifying_child_tax_credit_count, 0);
  assertEquals(result.pending.eitc.credit_amount, 0);
  assertEquals(form.line28_actc ?? 0, 0);
  const filer = extractFilerIdentity(form)!;
  const fields = {
    dependent_count: input.general.dependents.length,
    dependent_details: dependentFilingSchema.array().parse(
      form.dependent_details,
    ),
    filing_status: input.general.filing_status,
    presidential_campaign_fund_taxpayer:
      input.general.presidential_campaign_fund_taxpayer,
  };
  assertThrows(
    () => irs1040.build(fields, { filer, pending: result.pending }),
    Error,
    "dependent 1 needs a confirmed answer to the dependent joint-return test",
  );
  const projected = irs1040Pdf.projectFields!(fields, result.pending);
  assertEquals(projected.dependent_0_first_name, "Skylar");
  assertEquals(projected.dependent_1_first_name, "Kaylee");
  assertEquals(projected.dependent_0_tin, "400001057");
  assertEquals(projected.dependent_1_tin, "400001058");
  assertEquals(projected.dependent_0_credit_category, undefined);
  assertEquals(projected.dependent_1_credit_category, undefined);
  for (const child of input.general.dependents) {
    assertEquals(Object.hasOwn(child, "ssn_valid_for_employment"), false);
    assertEquals(Object.hasOwn(child, "provided_over_half_own_support"), false);
    assertEquals(
      Object.hasOwn(child, "filed_joint_return_except_refund_only"),
      false,
    );
  }
});
