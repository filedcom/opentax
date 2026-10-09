import { reconcileForm8911BusinessSources } from "../../../../mef/forms/credits/business/f8911_source.ts";
import { inputSchema as form8911InputSchema } from "../../../../../nodes/inputs/credits/business/f8911/index.ts";
import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { form3800 } from "../../../../mef/forms/credits/business/f3800/f3800.ts";
import { form3800Pdf } from "../../../../pdf/forms/credits/business/f3800/f3800.ts";
import { inputSchema as form3800InputSchema } from "../../../../../nodes/inputs/credits/business/f3800/index.ts";

const fixture = pdfReviewFixtures.find((entry) =>
  entry.id === "single-personal-home-charger-credit"
)!;
function creditInput(credit_amount: number, passive = false) {
  const original = form8911InputSchema.parse(fixture.inputs.f8911);
  return {
    ...fixture.inputs,
    f8911: {
      ...original,
      cost: credit_amount / 0.06,
      business_use_pct: 1,
      main_home_property: false,
      business_source: {
        proprietor_ssn: "111223333",
        schedule_c_business_reference: "synthetic-business-1",
        source_document_reference: "synthetic-equipment-invoice-1",
        section179_deduction: 0,
        rate_basis: "base" as const,
        subject_to_passive_activity_limit: passive,
      },
    },
  };
}

Deno.test("Form 8911 business credit calculation reaches the finalized Form 3800 tax limit", () => {
  for (
    const [credit, allowed, tax, refund] of [[600, 600, 3275, 3725], [
      6000,
      3875,
      0,
      7000,
    ]]
  ) {
    const result = f1040_2025.executeReturn(creditInput(credit));
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.f3800.allowed_credit, allowed);
    assertEquals(result.pending.f1040.line20_nonrefundable_credits, allowed);
    assertEquals(result.pending.f1040.line24_total_tax, tax);
    assertEquals(result.pending.f1040.line35a_refund, refund);
    assertEquals(
      result.pending.schedule3.line6a_total,
      allowed,
    );
  }
});

Deno.test("Form 8911 staged business credit cannot export without property-source reconciliation", () => {
  const { pending } = f1040_2025.executeReturn(creditInput(600));
  assertThrows(
    () => form3800.build(pending.f3800, { pending, filer: fixture.filer }),
    Error,
    "property-source reconciliation",
  );
  assertThrows(
    () => form3800Pdf.instances!(pending.f3800, fixture.filer, pending),
    Error,
    "same prepared MeF return",
  );
});

Deno.test("Form 8911 staged business credit rejects passive amounts without source allocation", () => {
  const result = f1040_2025.executeReturn(creditInput(600, true));
  assertStringIncludes(
    JSON.stringify(result.diagnostics),
    "Form 8582-CR source allocation",
  );
  assertEquals(result.pending.f1040.line20_nonrefundable_credits ?? 0, 0);
  assertThrows(() =>
    form3800InputSchema.parse({
      f8911_credit: {
        credit_amount: 600.01,
        subject_to_passive_activity_limit: false,
      },
    })
  );
});

Deno.test("Form 8911 public mixed-use calculation separates business and personal credit limits", () => {
  const input = creditInput(600);
  const result = f1040_2025.executeReturn({
    ...input,
    f8911: {
      ...input.f8911,
      business_use_pct: 0.4,
      main_home_property: true,
      business_source: {
        ...input.f8911.business_source,
        section179_deduction: 1000,
      },
    },
  });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.f3800.allowed_credit, 180);
  assertEquals(
    result.pending.schedule3.line6j_alt_fuel_vehicle_refueling,
    1000,
  );
  assertEquals(result.pending.f1040.line20_nonrefundable_credits, 1180);
  assertEquals(result.pending.f1040.line24_total_tax, 2695);
});

Deno.test("Form 8911 public increased-rate calculation preserves its stated basis and section 179", () => {
  const input = creditInput(600);
  for (const rate_basis of ["pwa", "construction_before_2023_01_29"] as const) {
    const result = f1040_2025.executeReturn({
      ...input,
      f8911: {
        ...input.f8911,
        construction_began: rate_basis === "pwa" ? "2025-01-01" : "2023-01-28",
        business_source: {
          ...input.f8911.business_source,
          rate_basis,
          section179_deduction: 1000,
        },
      },
    });
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.f3800.allowed_credit, 2700);
    assertEquals(result.pending.f1040.line24_total_tax, 1175);
  }
  const invalid = f1040_2025.executeReturn({
    ...input,
    f8911: {
      ...input.f8911,
      construction_began: "2023-01-29",
      business_source: {
        ...input.f8911.business_source,
        rate_basis: "construction_before_2023_01_29",
      },
    },
  });
  assertStringIncludes(
    JSON.stringify(invalid.diagnostics),
    "construction before January 29, 2023",
  );
});

Deno.test("Form 8911 business source joins reject owner, activity, reference and credit conflicts", () => {
  const { pending } = f1040_2025.executeReturn(creditInput(600));
  const business = {
    line_a_principal_business: "Equipment services",
    line_b_business_code: "811310",
    line_1_gross_receipts: 0,
    line_f_accounting_method: "cash",
    line_g_material_participation: true,
    proprietor_recipient: "T",
    business_reference: "synthetic-business-1",
  };
  const joined = {
    ...pending,
    f8911: pending.f8911,
    f1040: pending.f1040,
    f3800: pending.f3800,
    schedule_c: { schedule_cs: [business] },
  };
  const before = JSON.stringify(joined);
  assertEquals(
    reconcileForm8911BusinessSources(joined.f8911, joined).businessCredit,
    600,
  );
  assertEquals(JSON.stringify(joined), before);
  for (
    const changes of [
      { proprietor_recipient: "S" },
      { line_g_material_participation: false },
      { business_reference: "another-business" },
      { statutory_employee: true },
      { disposed_of_business: true },
    ]
  ) {
    assertThrows(
      () =>
        reconcileForm8911BusinessSources(joined.f8911, {
          ...joined,
          schedule_c: { schedule_cs: [{ ...business, ...changes }] },
        }),
      Error,
      "participating taxpayer-owned",
    );
  }
  assertThrows(
    () =>
      reconcileForm8911BusinessSources(joined.f8911, {
        ...joined,
        schedule_c: { schedule_cs: [business, business] },
      }),
    Error,
    "participating taxpayer-owned",
  );
  assertThrows(
    () =>
      reconcileForm8911BusinessSources(joined.f8911, {
        ...joined,
        f1040: { ...joined.f1040, taxpayer_ssn: "999887777" },
      }),
    Error,
    "proprietor differs",
  );
  assertThrows(
    () =>
      reconcileForm8911BusinessSources(joined.f8911, {
        ...joined,
        f3800: {
          ...joined.f3800,
          f8911_credit: {
            credit_amount: 601,
            subject_to_passive_activity_limit: false,
          },
        },
      }),
    Error,
    "Form 3800 line 1s",
  );
  assertThrows(
    () =>
      reconcileForm8911BusinessSources(
        { ...joined.f8911, cost: 20000 },
        joined,
      ),
    Error,
    "prepared return",
  );
  assertThrows(
    () =>
      form3800.build(joined.f3800, { pending: joined, filer: fixture.filer }),
    Error,
    "property-source reconciliation",
  );
});
