import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { buildMefXml } from "../../mef/builder.ts";
import { buildPending } from "../../mef/execution/pending.ts";
import { buildPdfBytes } from "../../pdf/builder.ts";
import { pdfReviewFixtures } from "../../pdf/review-fixtures.ts";
import { registry } from "../../registry.ts";
import { assertTaxExemptInterestSource } from "./tax-exempt-interest-reconciliation.ts";

Deno.test("1099-DIV box 12 reaches Form 1040 and retained tax-exempt income", async () => {
  const fixture = pdfReviewFixtures.find((row) =>
    row.id === "single-w2-refund"
  )!;
  const result = execute(
    buildExecutionPlan(registry),
    registry,
    {
      ...fixture.inputs,
      f1099div: [{
        payerName: "Municipal Bond Fund",
        recipient_tin: fixture.filer.primarySSN,
        source_document_reference: "Synthetic 2025 exempt-interest copy",
        isNominee: false,
        box11: false,
        box1a: 0,
        box12: 600,
      }],
    },
    { taxYear: 2025, formType: "f1040" },
  );
  assertEquals(result.diagnostics, []);
  const pending = buildPending(result.pending);
  assertEquals(pending.f1040?.line2a_tax_exempt, 600);
  assertEquals(
    (pending.agi_aggregator as Record<string, unknown>)?.tax_exempt_interest,
    600,
  );
  assertTaxExemptInterestSource(pending);
  assertStringIncludes(
    buildMefXml(pending, fixture.filer),
    "<TaxExemptInterestAmt>600</TaxExemptInterestAmt>",
  );
  const pdf = await buildPdfBytes(pending, fixture.filer);
  assertEquals(new TextDecoder().decode(pdf.slice(0, 5)), "%PDF-");
  const filed = {
    ...pending,
    f1040: { ...pending.f1040, line2a_tax_exempt: 599 },
  };
  const message =
    "Form 1040 line 2a and retained tax-exempt interest must match issued Forms 1099";
  assertThrows(() => buildMefXml(filed, fixture.filer), Error, message);
  await assertRejects(
    () => buildPdfBytes(filed, fixture.filer),
    Error,
    message,
  );
  assertThrows(
    () =>
      assertTaxExemptInterestSource({
        ...pending,
        agi_aggregator: { ...pending.agi_aggregator, tax_exempt_interest: 599 },
      }),
    Error,
    message,
  );
});

Deno.test("nominee and premium adjustments replay across issued exempt-interest copies", () => {
  const pending = {
    f1099div: {
      f1099divs: [{
        isNominee: true,
        box11: false,
        box1a: 10,
        box12: 300,
        nominee_distribution: { box1a: 5, box12: 100 },
      }],
    },
    f1099int: { f1099ints: [{ payer_name: "Bank", box8: 150, box13: 10 }] },
    f1099oid: {
      f1099oids: [{
        payer_name: "Bond",
        box11_tax_exempt_oid: 60,
        box6_acquisition_premium: 10,
        box6_applies_to: "tax_exempt_oid",
        box10_bond_premium: 5,
        box10_applies_to: "tax_exempt_oid",
      }],
    },
    f1040: { line2a_tax_exempt: 385 },
    agi_aggregator: { tax_exempt_interest: [200, 140, 45] },
  };
  assertTaxExemptInterestSource(pending);
  assertThrows(
    () =>
      assertTaxExemptInterestSource({
        ...pending,
        f1040: { line2a_tax_exempt: 384 },
      }),
    Error,
    "Form 1040 line 2a",
  );
});

Deno.test("exempt-interest dividends enter Social Security provisional income", () => {
  const base = {
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Example",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1960-01-01",
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
    },
    schedule_b_part_iii: {
      foreign_accounts_question: false,
      foreign_trust_question: false,
    },
    f1099int: [{
      payer_name: "Bank",
      recipient_tin: "111223333",
      box1: 20_000,
    }],
    ssa1099: [{
      box3_gross_benefits: 10_000,
      box5_net_benefits: 10_000,
      recipient_tin: "111223333",
    }],
  };
  const plan = buildExecutionPlan(registry);
  const without = execute(plan, registry, base, {
    taxYear: 2025,
    formType: "f1040",
  });
  const withExempt = execute(plan, registry, {
    ...base,
    f1099div: [{
      payerName: "Municipal Fund",
      recipient_tin: "111223333",
      source_document_reference: "Synthetic exempt-interest copy",
      isNominee: false,
      box11: false,
      box1a: 0,
      box12: 6_000,
    }],
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(without.diagnostics, []);
  assertEquals(withExempt.diagnostics, []);
  assertEquals(without.pending.f1040?.line6b_ss_taxable ?? 0, 0);
  assertEquals(withExempt.pending.f1040?.line2a_tax_exempt, 6_000);
  assertEquals(withExempt.pending.f1040?.line6b_ss_taxable, 3_000);
});
