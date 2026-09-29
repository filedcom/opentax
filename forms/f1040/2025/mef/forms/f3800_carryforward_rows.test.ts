import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  allocateForm3800CreditUse,
  calculateForm3800Nonpassive,
  ZERO_FORM3800_PASSIVE_ACTIVITY,
} from "../../../nodes/inputs/f3800/calculation.ts";
import type { Form3800CarryoverVintage } from "../../../nodes/inputs/f3800/carryover-ledger.ts";
import { PassiveCreditSourceOrigin } from "../../../nodes/intermediate/forms/form8582cr/source.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { form3800PartVIFields } from "../../pdf/forms/f3800_fields.ts";
import { projectForm3800PartVIFields } from "../../pdf/forms/f3800_detail_projection.ts";
import {
  buildForm3800CarryforwardRows,
  form3800CarryforwardCreditUseRows,
} from "./f3800_carryforward_rows.ts";
import {
  buildIRS3800Document,
  type Form3800DocumentParts,
} from "./f3800_document.ts";

const older: Form3800CarryoverVintage = {
  source_key: "2022-new-markets",
  source_origin: { kind: PassiveCreditSourceOrigin.Self },
  credit_type: "New markets credit",
  form3800_credit_line: "1i",
  originating_tax_year: 2022,
  originating_tax_year_end_date: "2022-12-31",
  source_document_reference: "2022 filed Form 8874",
  originating_return_reference: "2022 accepted return",
  permitted_carryback_years: 1,
  credit_generated_as_filed: 300,
  credit_allowed_origin_year: 0,
  historical_uses: [],
  prior_adjustments: [],
  balance_carried_to_2025: 300,
  original_reported_balance_carried_to_2025: 300,
};
const newer: Form3800CarryoverVintage = {
  ...older,
  source_key: "2024-partnership-new-markets",
  source_origin: {
    kind: PassiveCreditSourceOrigin.Partnership,
    entity_reference: "2024 Partnership K-1 code AD",
    ein: "123456789",
  },
  originating_tax_year: 2024,
  originating_tax_year_end_date: "2024-12-31",
  source_document_reference: "2024 partnership K-1 code AD",
  originating_return_reference: "2024 accepted return",
  credit_generated_as_filed: 400,
  balance_carried_to_2025: 400,
  original_reported_balance_carried_to_2025: 400,
};
const entries = [older, newer].map((vintage) => ({
  vintage,
  subject_to_passive_activity_limit: false,
}));
const lines = calculateForm3800Nonpassive({
  filingStatus: FilingStatus.Single,
  regularTax: 500,
  alternativeMinimumTax: 0,
  foreignTaxCredit: 0,
  priorAllowableCredits: 0,
  tentativeMinimumTax: 0,
  standardCredit: 0,
  specifiedCredit: 0,
  standardCarryforward: 700,
  specifiedCarryforward: 0,
}, ZERO_FORM3800_PASSIVE_ACTIVITY);
const useRows = form3800CarryforwardCreditUseRows(entries);
const allocated = allocateForm3800CreditUse(useRows, lines);
const assembled = buildForm3800CarryforwardRows(
  entries,
  ["CarryforwardGeneralBusinessCr1", "CarryforwardGeneralBusinessCr2"],
  allocated,
);
const parts: Form3800DocumentParts = {
  lines,
  transferStatementIds: [],
  carryforwardSources: assembled.sources,
  currentRows: [],
  currentAmounts: [],
  carryoverRows: assembled.rows,
  currentDetails: [],
  carryoverDetails: assembled.details,
  passiveCurrentDetails: [],
  passiveCarryoverDetails: [],
};

Deno.test("Form 3800 ledger vintages assemble into FIFO Part IV/VI and computation links", () => {
  assertEquals(useRows.map((row) => row.sourceKey), [
    "carryforward:2022-new-markets",
    "carryforward:2024-partnership-new-markets",
  ]);
  assertEquals(allocated.map((row) => row.appliedAgainstTax), [300, 200]);
  assertEquals(assembled.rows.length, 1);
  assertEquals(assembled.rows[0].originatingTaxYear, 2024);
  assertEquals(assembled.rows[0].entity, { ein: "123456789" });
  assertEquals(assembled.rows[0].amount.nonpassiveCredit, 700);
  assertEquals(assembled.rows[0].amount.appliedCredit, 500);
  assertEquals(assembled.rows[0].amount.carryforwardCredit, 200);
  assertEquals(assembled.details.map((detail) => detail.appliedCredit), [
    300,
    200,
  ]);
  const xml = buildIRS3800Document(parts);
  assertStringIncludes(
    xml,
    "<PassThroughEntityEIN>123456789</PassThroughEntityEIN>",
  );
  assertStringIncludes(
    xml,
    'referenceDocumentId="CarryforwardGeneralBusinessCr1 CarryforwardGeneralBusinessCr2"',
  );
  const printed = projectForm3800PartVIFields(parts);
  assertEquals(printed[form3800PartVIFields(2).c], "123456789");
  assertEquals(printed[form3800PartVIFields(2).i], 200);
});

Deno.test("Form 3800 carryforward assembly rejects unbound computation and tax-use sources", () => {
  assertThrows(
    () => buildForm3800CarryforwardRows(entries, ["OnlyOne"], allocated),
    Error,
    "one reserved computation ID per vintage",
  );
  assertThrows(
    () =>
      buildForm3800CarryforwardRows(entries, ["One", "Two"], [
        allocated[0],
        { ...allocated[1], appliedAgainstTax: 201 },
      ]),
    Error,
    "tax use does not match its ledger vintage",
  );
  assertThrows(
    () =>
      form3800CarryforwardCreditUseRows([
        {
          ...entries[0],
          vintage: {
            ...older,
            source_origin: undefined,
          },
        } as unknown as typeof entries[number],
      ]),
    Error,
    "Required",
  );
});

Deno.test("Form 3800 Part VI orders vintages by year without changing their reserved document links", () => {
  const reversed = [...entries].reverse();
  const use = allocateForm3800CreditUse(
    form3800CarryforwardCreditUseRows(reversed),
    lines,
  );
  const result = buildForm3800CarryforwardRows(
    reversed,
    ["CarryforwardGeneralBusinessCr1", "CarryforwardGeneralBusinessCr2"],
    use,
  );
  assertEquals(result.rows[0].sourceKeys, [
    "carryforward:2022-new-markets",
    "carryforward:2024-partnership-new-markets",
  ]);
  assertEquals(result.details.map((detail) => detail.originatingTaxYear), [
    2022,
    2024,
  ]);
  assertEquals(
    result.sources[0].sourceKey,
    "carryforward:2024-partnership-new-markets",
  );
  assertEquals(result.sources[0].documentId, "CarryforwardGeneralBusinessCr1");
});

const XSD_PATH = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/CorporateIncomeTax/Corp1120/IRS3800/IRS3800.xsd",
  import.meta.url,
).pathname;
let xsdAvailable = false;
try {
  Deno.statSync(XSD_PATH);
  xsdAvailable = true;
} catch {
  // The official IRS schema bundle is local-only.
}

Deno.test({
  name:
    "Form 3800 assembled carryforward parent validates against TY2025 v5.4 XSD",
  ignore: !xsdAvailable,
  async fn() {
    const path = await Deno.makeTempFile({ suffix: ".xml" });
    try {
      await Deno.writeTextFile(
        path,
        buildIRS3800Document(parts).replace(
          "<IRS3800>",
          '<IRS3800 xmlns="http://www.irs.gov/efile" documentId="IRS3800-1">',
        ),
      );
      const result = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", XSD_PATH, path],
        stdout: "piped",
        stderr: "piped",
      }).output();
      assertEquals(result.code, 0, new TextDecoder().decode(result.stderr));
    } finally {
      await Deno.remove(path);
    }
  },
});
