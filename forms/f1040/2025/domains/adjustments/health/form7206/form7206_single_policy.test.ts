import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  singlePolicyCases,
  singlePolicyInput,
} from "./form7206_single_policy.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { preparedSourceSha256 } from "../../../../return-processing/prepared-source.ts";

const sourceChanges: Array<(s: any) => void> = [
  (s) => delete s.issued_policy_record,
  (s) => delete s.issued_premium_records,
  (s) => s.issued_policy_record.policyholder_ssn = "999887777",
  (s) => s.issued_premium_records[0].payer_ssn = "999887777",
  (s) => s.issued_premium_records[0].issuer_ein = "991234567",
  (s) => s.issued_premium_records[0].policy_number = "OTHER",
  (s) => s.issued_premium_records[0].paid_on = "2025-02-30",
  (s) => s.issued_premium_records[0].paid_premium++,
  (s) =>
    s.issued_premium_records[0].covered_person =
      s.premium_months[0].covered_person === "spouse" ? "taxpayer" : "spouse",
  (s) => s.issued_premium_records[0].payment_source_reference = "OTHER",
  (s) => s.issued_premium_records[0].policy_source_reference = "OTHER",
  (s) => s.issued_premium_records[0].month = 2,
  (s) => s.premium_months[0].paid_premium++,
  (s) =>
    s.issued_premium_records[1].payment_source_reference =
      s.issued_premium_records[0].payment_source_reference,
];
const expected: Record<string, [number, number, number, number, number]> = {
  "single-variable": [3783, 42684, 5387, 2345, 9410],
  "single-income-limited": [4646, 0, 0, 0, 707],
  "joint-spouse-owner": [2600, 52046, 409, 2013, 2720],
  "joint-taxpayer-spouse-coverage": [5750, 90717, 8143, 5652, 12717],
  "joint-changing-coverage": [5750, 90717, 8143, 5652, 12717],
  "single-excluded-cents": [3252.5, 43214.5, 5493, 2399, 9464],
};
for (const c of singlePolicyCases) {
  Deno.test(`Single-plan health policy inventory through complete return: ${c.id}`, async () => {
    const input = singlePolicyInput(c), r = f1040_2025.executeReturn(input);
    assertEquals(r.diagnostics, []);
    const filer = extractFilerIdentity(r.pending.f1040);
    const prepared = await f1040_2025.prepareReturn(r.pending, filer);
    const pending = prepared.bundle.pending;
    const [health, agi, qbi, tax, total] = expected[c.id];
    assertEquals(pending.form7206!.line14, health);
    assertEquals(pending.schedule1!.line17_se_health_insurance, health);
    assertEquals([
      pending.f1040!.line11_agi,
      pending.f1040!.line13_qbi_deduction ?? 0,
      pending.f1040!.line16_income_tax,
      pending.f1040!.line24_total_tax,
    ], [agi, qbi, tax, total]);
    assertEquals((prepared.bundle.xml.match(/<IRS7206\b/g) ?? []).length, 1);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals(origins.filter((o) => o.formKey === "form7206").length, 1);
    const changes: Array<(p: any) => void> = [
      ...sourceChanges.map((change) => (p: any) =>
        change(p.form7206.single_schedule_c_plan)
      ),
      (p) => p.form7206.line14++,
      (p) => p.schedule1.line17_se_health_insurance++,
      (p) => {
        delete p.form7206.single_schedule_c_plan.issued_policy_record;
        delete p.form7206.single_schedule_c_plan.issued_premium_records;
      },
      (p) => p.f1040.line10_adjustments++,
    ];
    for (const change of changes) {
      const changed = structuredClone(pending);
      change(changed);
      await assertRejects(() => f1040_2025.prepareReturn(changed, filer));
      const sourceSha256 = await preparedSourceSha256(changed, filer);
      await assertRejects(() =>
        buildPdfBytes(changed, filer, ".pdf-cache", {
          ...prepared.bundle,
          pending: changed,
          sourceSha256,
        })
      );
    }
    let root: string | undefined;
    try {
      root = Deno.env.get("FORM7206_SINGLE_POLICY_EVIDENCE");
    } catch { /* optional private evidence */ }
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(
        `${root}/${c.id}.json`,
        JSON.stringify(
          {
            input,
            pending,
            origins,
            expected: expected[c.id],
            nativeRejections: changes.length,
            pdfRejections: changes.length,
          },
          null,
          2,
        ),
      );
      await Deno.writeTextFile(`${root}/${c.id}.xml`, prepared.bundle.xml);
      await Deno.writeFile(`${root}/${c.id}.pdf`, pdf);
    }
  });
}
Deno.test("Single-plan health rejects mismatched public policy and payment records", () => {
  for (const change of sourceChanges) {
    const input = singlePolicyInput(singlePolicyCases[0]);
    change(input.form7206.single_schedule_c_plan);
    assert(
      f1040_2025.executeReturn(input).diagnostics.some((d) =>
        d.severity === "error"
      ),
    );
  }
});
