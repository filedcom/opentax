import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { FilingStatus } from "../../../mef/header.ts";
import {
  f8283,
  FMVMethod,
  inputSchema as form8283InputSchema,
} from "../../../nodes/inputs/f8283/index.ts";
import {
  inputSchema as scheduleAInputSchema,
  scheduleA as scheduleANode,
} from "../../../nodes/inputs/schedule_a/index.ts";
import { form8283Pdf } from "../../pdf/forms/f8283.ts";
import { form8283 } from "./f8283.ts";
import { form8283FmvReductionStatement } from "./f8283_fmv_reduction_statement.ts";
import { scheduleA as scheduleAMef } from "./schedule_a.ts";
import { execute } from "../../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../../core/runtime/planner.ts";
import { registry } from "../../registry.ts";
import { pdfReviewFixtures } from "../../pdf/review-fixtures.ts";
import { buildPending } from "../pending.ts";
import { buildMefBundle } from "../builder.ts";
import { buildPdfBytes } from "../../pdf/builder.ts";
import { PDFDocument } from "pdf-lib";

const xsdPath = new URL(
  "../../../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;

const gift = {
  property_description: "Purchased patent US 1234567 for water filter",
  donee_organization_name: "Community Science Institute",
  donee_organization_us_address: {
    line1: "1 Science Way",
    city: "Albany",
    state: "NY",
    zip: "12201",
  },
  date_acquired: "2022-02-01",
  date_contributed: "2025-06-01",
  donor_acquisition_description: "Purchase",
  fmv: 4_500,
  deduction_claimed: 3_000,
  cost_or_adjusted_basis: 3_000,
  fmv_method: FMVMethod.ComparableSales,
  charitable_limit_category: "noncash_50" as const,
  is_capital_gain_property: true,
  intellectual_property_capital_gain_reduction: {
    property_kind: "purchased_patent" as const,
    patent_number: "US1234567",
    patent_registration_record_reference: "USPTO registration PAT-17",
    purchase_record_reference: "Patent purchase PAT-17",
    unamortized_basis_schedule_reference: "Patent basis schedule PAT-17",
    unamortized_adjusted_basis: 3_000,
    donee_2025_net_income_statement_reference:
      "Institute income statement PAT-17",
    donor_owned_full_patent_rights_verified: true as const,
    all_patent_rights_transferred_to_donee_verified: true as const,
    adjusted_basis_excludes_prior_amortization_verified: true as const,
    donee_2025_net_income_zero_verified: true as const,
    hypothetical_fmv_sale_gain_entirely_long_term_verified: true as const,
    no_other_reduction_reason_verified: true as const,
  },
};

function pendingReturn(item = gift) {
  const form = form8283InputSchema.parse({ section_a_items: [item] });
  const items = f8283.compute(
    { taxYear: 2025, formType: "f1040" },
    form,
  ).outputs[0].fields.noncash_contribution_items;
  const source = {
    agi: 100_000,
    current_noncash_gift_inventory_complete_confirmed: true as const,
    other_prior_charitable_carryovers_absent_confirmed: true as const,
    capital_gain_property_carryovers: [],
    noncash_contribution_items: items,
  };
  const finalized = scheduleANode.compute(
    { taxYear: 2025, formType: "f1040" },
    scheduleAInputSchema.parse(source),
  ).finalizations![0].fields;
  return {
    f8283: form,
    schedule_a: { ...source, ...finalized },
    f1040: {
      line11_agi: 100_000,
      line12e_itemized_deductions: item.deduction_claimed,
    },
  };
}

const filer = {
  primarySSN: "123456789",
  nameLine1: "ALEX DONOR",
  nameControl: "DONO",
  address: {
    line1: "1 Main St",
    city: "Albany",
    state: "NY",
    zip: "12201",
  },
  filingStatus: FilingStatus.Single,
};

Deno.test("Form 8283 patent initial basis limit reaches Schedule A, Form 1040, native statement and PDF", () => {
  const pending = pendingReturn();
  assertEquals(
    (pending.schedule_a as Record<string, unknown>)
      .line_12_noncash_contributions,
    3_000,
  );
  assertEquals(pending.f1040.line12e_itemized_deductions, 3_000);
  const [statement] = form8283FmvReductionStatement.build([], { pending });
  assertStringIncludes(statement, "section 170(e)(1)(B)(iii)");
  assertStringIncludes(statement, "Patent basis schedule PAT-17");
  const [xml] = form8283.build(pending.f8283, {
    pending,
    documentIdsByPendingKey: {
      form8283_fmv_reduction_statement: ["patent-reduction"],
    },
  });
  assertStringIncludes(xml, 'referenceDocumentId="patent-reduction"');
  assertStringIncludes(xml, ">3000</FairMarketValueAmt>");
  assertStringIncludes(
    scheduleAMef.build(pending.schedule_a, { pending }),
    "<OtherThanByCashOrCheckAmt>3000</OtherThanByCashOrCheckAmt>",
  );
  const [pdf] = form8283Pdf.instances?.(pending.f8283, filer, pending) ?? [];
  assertEquals(pdf?.row1_claim, 3_000);
  assertEquals(pdf?.row1_basis, 3_000);
  assertStringIncludes(
    (pdf?.reduction_statements as string[])[0],
    "unamortized adjusted basis",
  );
});

Deno.test("Form 8283 reports a purchased patent above $5,000 in Section A", async () => {
  const largerPatent = {
    ...gift,
    fmv: 18_000,
    deduction_claimed: 12_000,
    cost_or_adjusted_basis: 12_000,
    intellectual_property_capital_gain_reduction: {
      ...gift.intellectual_property_capital_gain_reduction,
      unamortized_adjusted_basis: 12_000,
    },
  };
  const pending = pendingReturn(largerPatent);
  assertEquals(
    (pending.schedule_a as Record<string, unknown>)
      .line_12_noncash_contributions,
    12_000,
  );
  assertEquals(pending.f1040.line12e_itemized_deductions, 12_000);
  const [statement] = form8283FmvReductionStatement.build([], { pending });
  assertStringIncludes(statement, "section 170(e)(1)(B)(iii)");
  assertStringIncludes(statement, "6000");
  const [xml] = form8283.build(pending.f8283, {
    pending,
    documentIdsByPendingKey: {
      form8283_fmv_reduction_statement: ["large-patent-reduction"],
    },
  });
  assertStringIncludes(xml, 'referenceDocumentId="large-patent-reduction"');
  assertStringIncludes(xml, ">12000</FairMarketValueAmt>");
  assertStringIncludes(
    scheduleAMef.build(pending.schedule_a, { pending }),
    "<OtherThanByCashOrCheckAmt>12000</OtherThanByCashOrCheckAmt>",
  );
  const [pdf] = form8283Pdf.instances?.(pending.f8283, filer, pending) ?? [];
  assertEquals(pdf?.row1_claim, 12_000);
  assertEquals(pdf?.row1_basis, 12_000);
  assertStringIncludes(
    (pdf?.reduction_statements as string[])[0],
    "unamortized adjusted basis",
  );
  assertEquals(
    form8283InputSchema.safeParse({
      section_a_items: [{
        ...largerPatent,
        intellectual_property_capital_gain_reduction: undefined,
      }],
    }).success,
    false,
  );
  const base = pdfReviewFixtures.find((fixture) =>
    fixture.id === "single-section-a-capital-gain-reduction-gift"
  )!;
  const result = execute(buildExecutionPlan(registry), registry, {
    ...base.inputs,
    schedule_a: {
      line_5a_state_income_tax: 24_000,
      current_noncash_gift_inventory_complete_confirmed: true,
      other_prior_charitable_carryovers_absent_confirmed: true,
      capital_gain_property_carryovers: [],
    },
    f8283: { section_a_items: [largerPatent] },
  }, { taxYear: 2025, formType: "f1040" });
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule_a.line_12_noncash_contributions, 12_000);
  const bundle = await buildMefBundle(buildPending(result.pending), {
    filer: base.filer,
    attachments: [],
  });
  assertStringIncludes(
    bundle.xml,
    "<OtherThanByCashOrCheckAmt>12000</OtherThanByCashOrCheckAmt>",
  );
  assertStringIncludes(bundle.xml, ">12000</FairMarketValueAmt>");
  if (await Deno.stat(xsdPath).then(() => true).catch(() => false)) {
    const validation = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsdPath, "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = validation.stdin.getWriter();
    await writer.write(new TextEncoder().encode(bundle.xml));
    await writer.close();
    const checked = await validation.output();
    assertEquals(checked.code, 0, new TextDecoder().decode(checked.stderr));
  }
  const filled = await buildPdfBytes(
    buildPending(result.pending),
    base.filer,
    ".state/pdf-cache",
    bundle,
  );
  assertEquals((await PDFDocument.load(filled)).getPageCount() >= 4, true);
  const reviewDir = ".state/pdf-cache/review";
  await Deno.mkdir(reviewDir, { recursive: true });
  await Deno.writeFile(`${reviewDir}/form8283-high-value-patent.pdf`, filled);
  await Deno.writeTextFile(
    `${reviewDir}/form8283-high-value-patent.xml`,
    bundle.xml,
  );
});

Deno.test("Form 8283 patent rejects altered basis, rights, donee income and final return", () => {
  for (
    const item of [
      { ...gift, deduction_claimed: 3_001 },
      { ...gift, date_acquired: "2025-01-01" },
      { ...gift, charitable_limit_category: "capital_gain_30" as const },
      {
        ...gift,
        intellectual_property_capital_gain_reduction: {
          ...gift.intellectual_property_capital_gain_reduction,
          unamortized_adjusted_basis: 2_000,
        },
      },
      {
        ...gift,
        intellectual_property_capital_gain_reduction: {
          ...gift.intellectual_property_capital_gain_reduction,
          patent_registration_record_reference: "",
        },
      },
      {
        ...gift,
        intellectual_property_capital_gain_reduction: {
          ...gift.intellectual_property_capital_gain_reduction,
          all_patent_rights_transferred_to_donee_verified: false,
        },
      },
      {
        ...gift,
        intellectual_property_capital_gain_reduction: {
          ...gift.intellectual_property_capital_gain_reduction,
          donee_2025_net_income_zero_verified: false,
        },
      },
      {
        ...gift,
        intellectual_property_capital_gain_reduction: {
          ...gift.intellectual_property_capital_gain_reduction,
          donee_2025_net_income_statement_reference: "",
        },
      },
    ]
  ) {
    assertEquals(
      form8283InputSchema.safeParse({ section_a_items: [item] }).success,
      false,
    );
  }
  const pending = pendingReturn();
  assertThrows(() =>
    scheduleAMef.build(pending.schedule_a, {
      pending: { ...pending, f8283: undefined },
    })
  );
  assertThrows(() =>
    form8283.build(pending.f8283, {
      pending: {
        ...pending,
        schedule_a: {
          ...pending.schedule_a,
          line_12_noncash_contributions: 4_500,
        },
      },
    })
  );
  assertThrows(() =>
    form8283Pdf.instances?.(pending.f8283, filer, {
      ...pending,
      f1040: { ...pending.f1040, line12e_itemized_deductions: 4_500 },
    })
  );
});
