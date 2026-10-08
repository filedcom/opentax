import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f8288, WithholdingRate } from "../../../../nodes/inputs/f8288/index.ts";
import { f1040 } from "../../../../nodes/outputs/f1040/index.ts";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { irs1040 } from "../../../mef/forms/identity/f1040.ts";
import { irs1040Pdf } from "../../../pdf/forms/identity/f1040.ts";
import { buildExecutionPlan } from "../../../../../../core/runtime/planner.ts";
import { execute } from "../../../../../../core/runtime/executor.ts";
import { registry } from "../../../registry.ts";
import { assertOtherFormsWithholding } from "./f8288-withholding-reconciliation.ts";
import { buildMefXml } from "../../../mef/builder.ts";
import { buildPending } from "../../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../../pdf/review-fixtures.ts";

const source = {
  f8288s: [{
    property_address: "123 Main St, Anytown, CA 90210",
    gross_sales_price: 500_000,
    withholding_rate: WithholdingRate.RATE_15,
    amount_withheld: 75_000,
    buyer_name: "Buyer LLC",
    buyer_tin: "12-3456789",
    disposition_date: "2025-06-15",
  }],
};
const pending = { f8288: source };

Deno.test("final line 25c rejects unsupported excess and accepts the sourced total", () => {
  assertOtherFormsWithholding({ line25c_total: 75_000 }, pending, true);
  assertOtherFormsWithholding({}, {}, true);
  assertThrows(
    () => assertOtherFormsWithholding({ line25c_total: 75_001 }, pending, true),
    Error,
    "line 25c differs from retained other-form withholding",
  );
  assertThrows(
    () => assertOtherFormsWithholding({ line25c_total: 1 }, {}, true),
    Error,
    "line 25c differs from retained other-form withholding",
  );
});

Deno.test("native and PDF final export reject unsourced line 25c withholding", async () => {
  const fixture = pdfReviewFixtures.find((row) =>
    row.id === "single-w2-refund"
  )!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    fixture.inputs,
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  const forged = {
    ...pending,
    f1040: { ...pending.f1040, line25c_total: 1 },
  };
  assertThrows(
    () => buildMefXml(forged, fixture.filer),
    Error,
    "line 25c differs from retained other-form withholding",
  );
  await assertRejects(
    () => buildPdfBytes(forged, fixture.filer),
    Error,
    "line 25c differs from retained other-form withholding",
  );
});

Deno.test("Form 8288-A withholding is other-forms line 25c, not 1099 line 25b", () => {
  const result = f8288.compute(
    { taxYear: 2025, formType: "f1040" },
    source,
  );
  const deposit = fieldsOf(result.outputs, f1040)!;
  assertEquals(deposit.line25b_withheld_1099, undefined);
  assertEquals(deposit.line25c_other_withheld, 75_000);
  const fields = { line25c_total: 75_000 };
  assertStringIncludes(
    irs1040.build(fields, { pending }),
    "<TaxWithheldOtherAmt>75000</TaxWithheldOtherAmt>",
  );
  assertEquals(
    irs1040Pdf.projectFields?.(fields, pending)?.line25c_total,
    75_000,
  );
});

Deno.test("Form 8288-A source must fit inside filed line 25c in native and PDF", () => {
  for (
    const fields of [
      { line25b_withheld_1099: 75_000 },
      { line25c_total: 74_999, line25b_withheld_1099: 1 },
    ]
  ) {
    assertThrows(
      () => irs1040.build(fields, { pending }),
      Error,
      "line 25c is less than sourced Form 8288-A",
    );
    assertThrows(
      () => irs1040Pdf.projectFields?.(fields, pending),
      Error,
      "line 25c is less than sourced Form 8288-A",
    );
  }
});

Deno.test("Form 8288-A and W-2G withholding both fit in Form 1040 line 25c", () => {
  const combined = {
    ...pending,
    w2g: {
      w2gs: [{
        payer_name: "Casino Inc",
        payer_ein: "12-3456789",
        source_document_reference: "issued-casino-w2g-2025",
        box1_winnings: 1_000,
        box4_federal_withheld: 250,
      }],
    },
  };
  const incomplete = {
    line25c_total: 75_000,
    line25d_total_withholding: 75_000,
    line33_total_payments: 75_000,
  };
  for (
    const exportOne of [
      () => irs1040.build(incomplete, { pending: combined }),
      () => irs1040Pdf.projectFields?.(incomplete, combined),
    ]
  ) {
    assertThrows(
      exportOne,
      Error,
      "less than combined sourced Form 8288-A and W-2G withholding",
    );
  }
  const complete = {
    line25c_total: 75_250,
    line25d_total_withholding: 75_250,
    line33_total_payments: 75_250,
  };
  assertStringIncludes(
    irs1040.build(complete, { pending: combined }),
    "<TaxWithheldOtherAmt>75250</TaxWithheldOtherAmt>",
  );
  assertEquals(
    irs1040Pdf.projectFields?.(complete, combined)?.line25c_total,
    75_250,
  );
});

Deno.test("full return graph preserves the two-source line 25c sum at native and PDF projection", () => {
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      general: {
        filing_status: "single",
        taxpayer_first_name: "Taxpayer",
        taxpayer_last_name: "Test",
        taxpayer_ssn: "123-45-6789",
        digital_assets: false,
      },
      f8288: [source.f8288s[0]],
      w2g: [{
        payer_name: "Casino Inc",
        payer_ein: "12-3456789",
        source_document_reference: "issued-casino-w2g-2025",
        box1_winnings: 1_000,
        box4_federal_withheld: 250,
      }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = result.pending;
  assertEquals(pending.f1040?.line25c_total, 75_250);
  assertEquals(pending.f1040?.line25d_total_withholding, 75_250);
  assertEquals(pending.f1040?.line33_total_payments, 75_250);
  assertStringIncludes(
    irs1040.build(pending.f1040, { pending }),
    "<TaxWithheldOtherAmt>75250</TaxWithheldOtherAmt>",
  );
  assertEquals(
    irs1040Pdf.projectFields?.(pending.f1040, pending)?.line25c_total,
    75_250,
  );
  const changed = {
    ...pending,
    f8288: {
      f8288s: [{ ...source.f8288s[0], amount_withheld: 75_250 }],
    },
  };
  assertThrows(
    () => irs1040.build(pending.f1040, { pending: changed }),
    Error,
    "less than combined sourced Form 8288-A and W-2G withholding",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(pending.f1040, changed),
    Error,
    "less than combined sourced Form 8288-A and W-2G withholding",
  );
});

Deno.test("other-form withholding guard sums 8288-A, W-2G, 8805, and 8959", () => {
  const allSources = {
    ...pending,
    w2g: {
      w2gs: [{
        payer_name: "Casino Inc",
        payer_ein: "12-3456789",
        source_document_reference: "issued-casino-w2g-2025",
        box1_winnings: 1_000,
        box4_federal_withheld: 250,
      }],
    },
    f8805: {
      f8805s: [{
        partnership_name: "Partnership",
        section_1446_tax_withheld: 100,
        total_tax_withheld: 120,
      }],
    },
    form8959: { line24_total_withheld: 50 },
  };
  assertThrows(
    () => assertOtherFormsWithholding({ line25c_total: 75_399 }, allSources),
    Error,
    "less than combined sourced other-form withholding",
  );
  assertOtherFormsWithholding({ line25c_total: 75_400 }, allSources);
  assertOtherFormsWithholding({ line25c_total: 75_400 }, allSources, true);
  assertThrows(
    () =>
      assertOtherFormsWithholding({ line25c_total: 75_401 }, allSources, true),
    Error,
    "line 25c differs from retained other-form withholding",
  );
  assertThrows(
    () => irs1040.build({ line25c_total: 75_399 }, { pending: allSources }),
    Error,
    "less than combined sourced other-form withholding",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.({ line25c_total: 75_399 }, allSources),
    Error,
    "less than combined sourced other-form withholding",
  );
});

Deno.test("other-form withholding replay includes every trust codeB copy alongside 8288-A, W-2G, 8805 and 8959", () => {
  const combined = {
    ...pending,
    w2g: {
      w2gs: [{
        payer_name: "Casino",
        payer_ein: "123456789",
        source_document_reference: "casino-copy",
        box1_winnings: 1000,
        box4_federal_withheld: 250,
      }],
    },
    f8805: {
      f8805s: [{
        partnership_name: "Partnership",
        section_1446_tax_withheld: 100,
        total_tax_withheld: 120,
      }],
    },
    form8959: { line24_total_withheld: 50 },
    k1_trust: {
      k1_trusts: [
        {
          estate_trust_name: "Trust A",
          box13_code_b_backup_withholding: 100.25,
        },
        {
          estate_trust_name: "Trust B",
          box13_code_b_backup_withholding: 200.5,
        },
      ],
    },
  };
  const total = 75_700.75;
  assertOtherFormsWithholding({ line25c_total: total }, combined, true);
  assertThrows(
    () =>
      assertOtherFormsWithholding({ line25c_total: 75_400 }, combined, true),
    Error,
    "less than combined sourced other-form withholding",
  );
  assertThrows(
    () =>
      assertOtherFormsWithholding({ line25c_total: total + 1 }, combined, true),
    Error,
    "differs from retained other-form withholding",
  );
  const fields = { line25c_total: total };
  assertStringIncludes(
    irs1040.build(fields, { pending: combined }),
    "<TaxWithheldOtherAmt>75701</TaxWithheldOtherAmt>",
  );
  assertEquals(
    irs1040Pdf.projectFields?.(fields, combined)?.line25c_total,
    total,
  );
  const changed = {
    ...combined,
    k1_trust: {
      k1_trusts: [...combined.k1_trust.k1_trusts, {
        estate_trust_name: "Trust C",
        box13_code_b_backup_withholding: 1,
      }],
    },
  };
  assertThrows(
    () => irs1040.build(fields, { pending: changed }),
    Error,
    "less than combined sourced other-form withholding",
  );
  assertThrows(
    () => irs1040Pdf.projectFields?.(fields, changed),
    Error,
    "less than combined sourced other-form withholding",
  );
});
