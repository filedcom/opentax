import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  policyInventoryCases,
  policyInventoryInput,
} from "./form7206_policy_inventory.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { preparedSourceSha256 } from "../../../../return-processing/prepared-source.ts";

const sourceChanges: Array<(s: any) => void> = [
  (s) => delete s.plans[0].issued_policy_record,
  (s) => delete s.plans[0].issued_premium_records,
  (s) => s.plans[0].issued_policy_record.policyholder_ssn = "222334444",
  (s) => s.plans[0].issued_premium_records[0].payer_ssn = "222334444",
  (s) => s.plans[0].issued_premium_records[0].issuer_ein = "991234567",
  (s) => s.plans[0].issued_premium_records[0].policy_number = "OTHER",
  (s) => s.plans[0].issued_premium_records[0].paid_on = "2025-02-30",
  (s) => s.plans[0].issued_premium_records[0].paid_premium++,
  (s) => s.plans[0].issued_premium_records[0].covered_person = "spouse",
  (s) =>
    s.plans[0].issued_premium_records[0].payment_source_reference = "OTHER",
  (s) => s.plans[0].issued_premium_records[0].policy_source_reference = "OTHER",
  (s) => s.plans[0].issued_premium_records[0].month = 2,
  (s) => s.plans[0].premium_months[0].paid_premium++,
  (s) => s.business_plan_reviews[0].plan_identifiers = [],
];
const expected: Record<
  string,
  [number, number, number, number, number, number]
> = {
  "seasonal-premiums": [4259, 1737, 184616, 1703, 23139, 24114],
  "both-income-limited": [9866, 4646, 176100, 0, 21640, 22615],
  "primary-employer-excluded": [0, 1737, 188875, 2555, 23888, 24863],
  "changing-covered-persons": [4259, 1737, 184616, 1703, 23139, 24114],
  "below-wage-base": [4259, 1737, 57943, 1589, 2508, 4628],
};
for (const c of policyInventoryCases) {
  Deno.test(`Independent health policy inventory through complete return: ${c.id}`, async () => {
    const input = policyInventoryInput(c), r = f1040_2025.executeReturn(input);
    assertEquals(r.diagnostics, []);
    const filer = extractFilerIdentity(r.pending.f1040);
    const prepared = await f1040_2025.prepareReturn(r.pending, filer);
    const pending = prepared.bundle.pending;
    const rows = pending.form7206!.independent_plan_filing_rows as Array<
      { recipient: string; line14: number }
    >;
    const [t, s, agi, qbi, tax, total] = expected[c.id];
    assertEquals(rows.find((r) => r.recipient === "T")!.line14, t);
    assertEquals(rows.find((r) => r.recipient === "S")!.line14, s);
    assertEquals(pending.schedule1!.line17_se_health_insurance, t + s);
    assertEquals([
      pending.f1040!.line11_agi,
      pending.f1040!.line13_qbi_deduction,
      pending.f1040!.line16_income_tax,
      pending.f1040!.line24_total_tax,
    ], [agi, qbi, tax, total]);
    assertEquals((prepared.bundle.xml.match(/<IRS7206\b/g) ?? []).length, 2);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    assertEquals(origins.filter((o) => o.formKey === "form7206").length, 2);
    const changes: Array<(p: any) => void> = [
      ...sourceChanges.map((change) => (p: any) =>
        change(p.form7206.independent_schedule_c_plans)
      ),
      (p) => p.form7206.independent_plan_filing_rows[0].line14++,
      (p) => p.schedule1.line17_se_health_insurance++,
      (p) => p.form8995.joint_owner_filing_rows[0].health_insurance_deduction++,
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
      root = Deno.env.get("FORM7206_POLICY_EVIDENCE");
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
Deno.test("Independent Schedule C health rejects mismatched public policy and payment records", () => {
  for (const change of sourceChanges) {
    const input = policyInventoryInput(policyInventoryCases[0]);
    change(input.form7206.independent_schedule_c_plans);
    assert(
      f1040_2025.executeReturn(input).diagnostics.some((d) =>
        d.severity === "error"
      ),
    );
  }
});
