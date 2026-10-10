import {
  assertEquals,
  assertExists,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { form3800Pdf } from "../../../../pdf/forms/credits/business/f3800/f3800.ts";
import { form3800PartVFields } from "../../../../pdf/forms/credits/business/f3800/f3800_fields.ts";
import { projectForm3800PartVFields } from "../../../../pdf/forms/credits/business/f3800/f3800_detail_projection.ts";

import { fixture } from "./form3800_k1_inventory.fixture.ts";

const cases = [
  { id: "two", count: 2, credit: 10000, mixed: false },
  { id: "three", count: 3, credit: 4000, mixed: false },
  { id: "mixed-two", count: 2, credit: 10000, mixed: true },
  { id: "sixteen", count: 16, credit: 1000, mixed: false },
  { id: "mixed-sixteen", count: 16, credit: 1000, mixed: true },
  { id: "mixed-thirty-one", count: 31, credit: 500, mixed: true },
];
function reviewedFixture(test: typeof cases[number]) {
  const input = fixture(test);
  const sources = [
    ...input.k1_partnership.map((k) => ({
      source_type: "partnership" as const,
      source_ein: k.partnership_ein,
      source_document_reference: k.source_document_reference,
      credit_amount: k.box15_code_z_orphan_drug_credit,
    })),
    ...(input.k1_s_corp ?? []).map((k) => ({
      source_type: "s_corporation" as const,
      source_ein: k.corporation_ein,
      source_document_reference: k.source_document_reference,
      credit_amount: k.box13_code_z_orphan_drug_credit,
    })),
  ].sort((a, b) => a.source_ein.localeCompare(b.source_ein));
  let remaining = 8973;
  const allocated = sources.map((source) => {
    const applied_credit = Math.min(remaining, source.credit_amount);
    remaining -= applied_credit;
    return { ...source, applied_credit };
  });
  // The review deliberately uses a different order than either node's K-1 list.
  return {
    ...input,
    form3800_current_orphan_allocation: {
      tax_year: 2025 as const,
      return_primary_ssn: "111223333",
      review_reference:
        "Synthetic reviewed source-by-source current credit use",
      complete_current_orphan_drug_inventory_confirmed: true as const,
      sources: allocated.reverse(),
    },
  };
}
function evidenceRoot() {
  try {
    return Deno.env.get("FORM3800_ALLOCATION_EVIDENCE");
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return undefined;
    throw error;
  }
}
for (const test of cases) {
  Deno.test(`Form 3800 reviewed partial current-credit inventory: ${test.id}`, async () => {
    const input = reviewedFixture(test);
    const result = f1040_2025.executeReturn(input);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    const total = test.count * test.credit + test.count * (test.count - 1) / 2;
    // Single filer: 150,000 wages less 15,750 deduction; AMT exemption 88,100.
    const regular = 25067, tmt = 16094;
    const allowed = Math.min(total, regular - tmt);
    assertEquals(pending.f1040.line16_income_tax, regular);
    assertEquals(pending.schedule3.line6a_total, allowed);
    assertEquals(pending.f1040.line20_nonrefundable_credits, allowed);
    assertEquals(pending.f1040.line24_total_tax, regular - allowed);
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const prepared = await f1040_2025.prepareReturn(pending, filer);
    const parts = prepared.bundle.form3800Parts;
    assertExists(parts);
    assertEquals(parts.currentDetails.length, test.count);
    assertEquals(parts.currentDetails.reduce((s, r) => s + r.credit, 0), total);
    assertEquals(
      parts.currentDetails.reduce((s, r) => s + r.appliedCredit, 0),
      allowed,
    );
    const instances = form3800Pdf.instances!(
      pending.f3800,
      filer,
      pending,
      parts,
    );
    assertEquals(instances.length, Math.ceil(test.count / 15));
    const printed = instances.flatMap((fields) =>
      Array.from({ length: 15 }, (_, i) => {
        const keys = form3800PartVFields(i + 1);
        return {
          ein: fields[keys.c1],
          credit: fields[keys.e],
          used: fields[keys.i1],
          unused: fields[keys.k],
        };
      }).filter((r) => r.ein !== undefined)
    );
    assertEquals(printed.length, test.count);
    assertEquals(
      printed.map((r) => [r.ein, r.credit, r.used, r.unused]),
      parts.currentDetails.map(
        (r) => [
          r.passThroughEin,
          r.credit,
          r.appliedCredit,
          r.credit - r.appliedCredit,
        ],
      ),
    );
    if (test.count > 15) {
      assertThrows(
        () => projectForm3800PartVFields(parts),
        Error,
        "continuation",
      );
    }
    const missing = {
      ...parts,
      currentDetails: parts.currentDetails.slice(0, -1),
    };
    assertThrows(
      () => form3800Pdf.instances!(pending.f3800, filer, pending, missing),
      Error,
    );
    const swapped = {
      ...parts,
      currentDetails: parts.currentDetails.map((row, index) =>
        index === test.count - 1 ? { ...row, passThroughEin: "999999999" } : row
      ),
    };
    assertThrows(
      () => form3800Pdf.instances!(pending.f3800, filer, pending, swapped),
      Error,
    );
    const wrongTaxUse = {
      ...parts,
      currentDetails: parts.currentDetails.map((row, index) =>
        index === 0
          ? { ...row, appliedCredit: row.appliedCredit - 1 }
          : index === test.count - 1
          ? { ...row, appliedCredit: row.appliedCredit + 1 }
          : row
      ),
    };
    assertThrows(
      () => form3800Pdf.instances!(pending.f3800, filer, pending, wrongTaxUse),
      Error,
    );
    assertEquals(
      parts.currentDetails.map((row) => row.appliedCredit),
      parts.currentDetails.map((row) =>
        input.form3800_current_orphan_allocation.sources.find((source) =>
          source.source_ein === row.passThroughEin
        )!.applied_credit
      ),
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals(
      origins.filter((o) => o.formKey === "f3800").length,
      9 + Math.ceil(test.count / 15) - 1,
    );
    const mutations: Array<(p: typeof pending) => void> = [
      (p) => {
        const rows = p.k1_partnership.k1_partnerships as Array<
          Record<string, unknown>
        >;
        rows[rows.length - 1].box15_code_z_orphan_drug_credit = 1;
      },
      (p) => {
        const rows = p.k1_partnership.k1_partnerships as Array<
          Record<string, unknown>
        >;
        rows.pop();
      },
      (p) => {
        const rows = p.k1_partnership.k1_partnerships as Array<
          Record<string, unknown>
        >;
        rows[0].source_document_reference = "Changed source";
      },
      (p) => {
        const rows = p.k1_partnership.k1_partnerships as Array<
          Record<string, unknown>
        >;
        rows.push(structuredClone(rows[0]));
      },
      (p) => {
        const rows = p.k1_partnership.k1_partnerships as Array<
          Record<string, unknown>
        >;
        rows[0].orphan_drug_credit_subject_to_passive_activity_limit = true;
      },
      (p) => {
        p.f3800.form8820_applied_credits_by_source = parts.currentDetails.map((
          row,
          i,
        ) => row.credit + Number(i === test.count - 1));
      },
      (p) => {
        Reflect.deleteProperty(p.f3800, "current_orphan_allocation_review");
      },
      (p) => {
        Reflect.deleteProperty(p, "form3800_current_orphan_allocation");
      },
      (p) => {
        p.form3800_current_orphan_allocation.return_primary_ssn = "999887777";
      },
      (p) => {
        p.form3800_current_orphan_allocation.review_reference =
          "Changed retained review";
      },
      (p) => {
        p.f1040.line20_nonrefundable_credits = allowed + 1;
      },
      (p) => {
        p.schedule3.line6a_total = allowed + 1;
      },
    ];
    for (const mutation of mutations) {
      const p = structuredClone(pending);
      mutation(p);
      await assertRejects(() => f1040_2025.prepareReturn(p, filer), Error);
      await assertRejects(() => buildPdfBytes(p, filer), Error);
    }
    const root = evidenceRoot();
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${test.id}.pdf`, pdf);
      await Deno.writeTextFile(`${root}/${test.id}.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${root}/${test.id}.json`,
        JSON.stringify(
          {
            input,
            pending,
            parts,
            origins,
            printed,
            expected: { total, regular, tmt, allowed, tax: regular - allowed },
            rejectedNative: mutations.length,
            rejectedPdf: mutations.length,
            rejectedPrepared: 3,
          },
          null,
          2,
        ),
      );
    }
  });
}
