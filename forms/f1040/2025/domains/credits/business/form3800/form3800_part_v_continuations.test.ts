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

const base = {
  "general": {
    "filing_status": "single",
    "taxpayer_first_name": "Alex",
    "taxpayer_last_name": "Example",
    "taxpayer_ssn": "111-22-3333",
    "taxpayer_dob": "1985-06-15",
    "child_eic_filer_review": {
      "not_qualifying_child_of_another_taxpayer_verified": true,
      "relationship_age_residence_record_reference":
        "Synthetic 2025 filer family and residence review",
    },
    "prior_eic_disallowance_review": {
      "status": "none",
      "irs_account_record_reference": "Synthetic IRS account transcript review",
      "no_nonclerical_disallowance_since_1996_verified": true,
    },
    "eic_tax_residency_review": {
      "status": "all_year_resident",
      "taxpayer_status_record_reference":
        "Synthetic 2025 resident status review",
      "spouse_status_record_reference": "Synthetic 2025 spouse status review",
    },
    "address_line1": "1 Example Way",
    "address_city": "Austin",
    "address_state": "TX",
    "address_zip": "78701",
    "digital_assets": false,
  },
  "w2": [
    {
      "box1_wages": 150000,
      "box2_fed_withheld": 30000,
      "employee_ssn": "111-22-3333",
      "box3_ss_wages": 150000,
      "box4_ss_withheld": 9300,
      "box5_medicare_wages": 150000,
      "box6_medicare_withheld": 2175,
      "employer_ein": "12-3456789",
      "employer_name": "Example Employer",
      "employer_address_line1": "10 Employer Road",
      "employer_address_city": "Austin",
      "employer_address_state": "TX",
      "employer_address_zip": "78701",
      "box12_entries": [],
    },
  ],
};
const cases = [
  { id: "thirty", count: 30, credit: 100, mixed: false },
  { id: "fifteen", count: 15, credit: 100, mixed: false },
  { id: "sixteen", count: 16, credit: 100, mixed: false },
  { id: "thirty-one", count: 31, credit: 100, mixed: false },
  { id: "mixed-sixteen", count: 16, credit: 100, mixed: true },
  { id: "mixed-thirty-one", count: 31, credit: 100, mixed: true },
];
function fixture(test: typeof cases[number]) {
  const general = structuredClone(base.general);
  const w2 = structuredClone(base.w2);
  const records = Array.from({ length: test.count }, (_, i) => ({
    ein: String(100000000 + i),
    reference: `Synthetic reviewed 2025 clinical K-1 ${i + 1}`,
    credit: test.credit + i,
  }));
  return {
    general,
    w2,
    k1_partnership: records.filter((_, i) => !test.mixed || i % 2 === 0).map(
      (r) => ({
        partnership_name: "Clinical Partnership",
        partnership_ein: r.ein,
        source_document_reference: r.reference,
        box15_code_z_orphan_drug_credit: r.credit,
        orphan_drug_credit_subject_to_passive_activity_limit: false,
      }),
    ),
    ...(test.mixed
      ? {
        k1_s_corp: records.filter((_, i) => i % 2 === 1).map((r) => ({
          corporation_name: "Clinical S Corporation",
          corporation_ein: r.ein,
          source_document_reference: r.reference,
          box13_code_z_orphan_drug_credit: r.credit,
          orphan_drug_credit_subject_to_passive_activity_limit: false,
        })),
      }
      : {}),
  };
}
function evidenceRoot() {
  try {
    return Deno.env.get("FORM3800_PART_V_EVIDENCE");
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return undefined;
    throw error;
  }
}
for (const test of cases) {
  Deno.test(`Form 3800 complete Part V inventory: ${test.id}`, async () => {
    const input = fixture(test);
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
      parts.currentDetails.map((row) => row.credit),
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
