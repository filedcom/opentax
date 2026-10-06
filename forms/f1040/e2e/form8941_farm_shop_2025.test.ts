import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { execute } from "../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../core/runtime/planner.ts";
import { registry } from "../2025/registry.ts";
import { buildMefBundle } from "../2025/mef/builder.ts";
import { buildPending } from "../2025/mef/pending.ts";
import { reconcileForm8941DocumentSource } from "../2025/mef/forms/f8941_source.ts";
import { buildPdfBytes } from "../2025/pdf/builder.ts";
import {
  form8941FarmShopInputs,
  form8941FarmShopWotcInputs,
} from "../2025/pdf/review-8941-farm-shop.fixture.ts";
import { pdfReviewFixtures } from "../2025/pdf/review-fixtures.ts";
import { calculateForm8941 } from "../nodes/inputs/f8941/index.ts";
import {
  inputSchema as farmSchema,
  projectScheduleFItems,
} from "../nodes/intermediate/forms/schedule_f/model.ts";
import { extractFilerIdentity } from "../mef/filer.ts";

const dir = new URL(
  "../../../.state/research/2026-10-06-form8941-farm-shop/",
  import.meta.url,
).pathname;
const xsd = new URL(
  "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
  import.meta.url,
).pathname;
const plan = buildExecutionPlan(registry);

for (
  const [name, agriculture, expectedUse] of [["full-use", 250000, 14614], [
    "limited-use",
    170000,
    5942,
  ], ["zero-use", 90000, 0]] as const
) {
  Deno.test({
    name: `TY2025 Form8941 owned farm ${name}: source, full XSD and PDF`,
    sanitizeResources: false,
    sanitizeOps: false,
    async fn() {
      const input = form8941FarmShopInputs(agriculture);
      const result = execute(plan, registry, input, {
        taxYear: 2025,
        formType: "f1040",
      });
      assertEquals(result.diagnostics, []);
      const lines = calculateForm8941(input.f8941);
      assertEquals([lines.line1, lines.line2, lines.line4, lines.line16], [
        6,
        5,
        39245,
        14614,
      ]);
      const raw = farmSchema.parse(result.pending.schedule_f);
      const filed = projectScheduleFItems(raw)[0];
      assertEquals(raw.schedule_fs[0].line15_employee_benefits, 40245);
      assertEquals(filed.line15_employee_benefits, 25631);
      assertEquals(filed.line22_labor_hired, 110000);
      const profit = agriculture + 50000 - 110000 - 25631;
      assertEquals(result.pending.schedule_se.net_profit_schedule_f, profit);
      assertEquals(result.pending.form8995.qbi_from_schedule_f, profit);
      assertEquals(result.pending.f1040.line8_additional_income, profit);
      assertEquals(result.pending.f1040.form8941_determined_credit, 14614);
      assertEquals(result.pending.f3800.form8941_applied_credit, expectedUse);
      assertEquals(
        result.pending.f1040.line20_nonrefundable_credits,
        expectedUse,
      );
      const filer = extractFilerIdentity(input.general)!;
      reconcileForm8941DocumentSource(input.f8941, result.pending, filer);
      const bundle = await buildMefBundle(buildPending(result.pending), {
        filer,
        attachments: [],
      });
      assertEquals(
        bundle.form3800Parts!.currentAmounts.find((r) => r.line === "4h")!
          .totalCredit,
        14614,
      );
      assertStringIncludes(
        bundle.xml,
        "<SumSmllrAmtAndCreditForHIPAmt>14614</SumSmllrAmtAndCreditForHIPAmt>",
      );
      await Deno.mkdir(dir, { recursive: true });
      await Deno.writeTextFile(
        dir + name + ".json",
        JSON.stringify({ input, lines, pending: result.pending }, null, 2),
      );
      await Deno.writeTextFile(dir + name + ".xml", bundle.xml);
      const valid = await new Deno.Command("xmllint", {
        args: ["--noout", "--schema", xsd, dir + name + ".xml"],
        stderr: "piped",
      }).output();
      assertEquals(valid.code, 0, new TextDecoder().decode(valid.stderr));
      await Deno.writeFile(
        dir + name + ".pdf",
        await buildPdfBytes(
          bundle.pending,
          filer,
          dir + "irs-pdf-cache",
          bundle,
        ),
      );
      const extraction = await new Deno.Command("pdftotext", {
        args: ["-layout", dir + name + ".pdf", "-"],
        stdout: "piped",
      }).output();
      assertEquals(extraction.code, 0);
      const packet = new TextDecoder().decode(extraction.stdout);
      await Deno.writeTextFile(dir + name + ".txt", packet);
      assertStringIncludes(packet, "Small Employer Health Insurance");
      assertStringIncludes(packet, "25631");
      assertEquals(
        packet.split("\f").filter((p) => p.trim()).length,
        name === "zero-use" ? 22 : 23,
      );
    },
  });
}

Deno.test("TY2025 Form8941 farm source conflicts reject before native/PDF", () => {
  const input = form8941FarmShopInputs();
  const result = execute(plan, registry, input, {
    taxYear: 2025,
    formType: "f1040",
  });
  assertEquals(result.diagnostics, []);
  const filer = extractFilerIdentity(input.general)!;
  const mutations: readonly [string, (p: any) => void][] = [
    ["farm ID", (p) => p.schedule_f.schedule_fs[0].farm_id = "Other-Farm"],
    ["EIN", (p) => p.schedule_f.schedule_fs[0].line_d_ein = "999999999"],
    [
      "payroll wage",
      (p) =>
        p.schedule_f.schedule_fs[0].shop_employee_w2_records[0]
          .social_security_medicare_wages += 1,
    ],
    [
      "payroll identity",
      (p) =>
        p.schedule_f.schedule_fs[0].shop_employee_w2_records[0].employee_ssn =
          "999999999",
    ],
    [
      "payroll reference",
      (p) =>
        p.schedule_f.schedule_fs[0].shop_employee_w2_records[0]
          .payroll_record_reference = "Wrong",
    ],
    [
      "missing worker",
      (p) => p.schedule_f.schedule_fs[0].shop_employee_w2_records.pop(),
    ],
    [
      "gross benefits",
      (p) => p.schedule_f.schedule_fs[0].line15_employee_benefits += 1,
    ],
    [
      "premium reduction",
      (p) => p.schedule_f.form8941_premium_reductions[0].credit_amount -= 1,
    ],
    [
      "issued agricultural receipt",
      (p) => p.schedule_f.farm_sources[1].source_document_reference = "Wrong",
    ],
    ["agricultural amount", (p) => p.schedule_f.farm_sources[1].amount += 1],
    [
      "issued custom hire receipt",
      (p) => p.schedule_f.farm_sources[0].source_document_reference = "Wrong",
    ],
    ["custom hire amount", (p) => p.schedule_f.farm_sources[0].amount += 1],
    ["issued 1099-G copy", (p) => p.f1099g.f1099gs[0].box_7_agriculture += 1],
    [
      "issued 1099-NEC copy",
      (p) => p.f1099nec.f1099necs[0].source_document_reference = "Wrong",
    ],
    [
      "Form3800 farm identity",
      (p) => p.f3800.f8941_direct_employer_credit.schedule_f_farm_id = "Wrong",
    ],
  ];
  for (const [name, mutate] of mutations) {
    const p = structuredClone(result.pending);
    mutate(p);
    assertThrows(
      () => reconcileForm8941DocumentSource(input.f8941, p, filer),
      Error,
      undefined,
      name,
    );
  }
  const altered = structuredClone(input.f8941);
  altered.shop_review.employee_premium_reviews[0].monthly_premiums[0]
    .employer_payment += 1;
  assertThrows(
    () => reconcileForm8941DocumentSource(altered, result.pending, filer),
    Error,
  );
});

Deno.test({
  name:
    "TY2025 owned farm SHOP and certified WOTC: distinct Form3800 rows, both full deductions, full XSD and PDF",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const base = pdfReviewFixtures.find((row) =>
      row.id === "owned-farm-wotc-single-below"
    )!;
    const input = form8941FarmShopWotcInputs(base);
    const result = execute(plan, registry, input, {
      taxYear: 2025,
      formType: "f1040",
    });
    assertEquals(result.diagnostics, []);
    const p: any = result.pending;
    assertEquals(p.f3800.f5884_credit.credit_amount, 14400);
    assertEquals(p.f3800.f8941_direct_employer_credit.credit_amount, 14614);
    assertEquals(p.f3800.form5884_applied_credit, 14400);
    assertEquals(p.f3800.form8941_applied_credit, 7322);
    assertEquals(p.f3800.allowed_credit, 21722);
    assertEquals(p.schedule_f.schedule_fs[0].line22_labor_hired, 110000);
    assertEquals(p.schedule_f.schedule_fs[0].line15_employee_benefits, 40245);
    assertEquals(
      projectScheduleFItems(farmSchema.parse(p.schedule_f))[0]
        .line15_employee_benefits,
      25631,
    );
    assertEquals(p.schedule_se.net_profit_schedule_f, 178769);
    assertEquals(p.form8995.qbi_from_schedule_f, 178769);
    assertEquals(p.f1040.line8_additional_income, 178769);
    const filer = extractFilerIdentity(input.general)!;
    const mismatchedPayroll = structuredClone(p);
    mismatchedPayroll.schedule_f.schedule_fs[0].qbi_wotc_filing_review
      .employee_w2_records[0].employee_ssn = "999999999";
    assertThrows(() =>
      reconcileForm8941DocumentSource(input.f8941, mismatchedPayroll, filer)
    );
    const bundle = await buildMefBundle(buildPending(p), {
      filer,
      attachments: [],
    });
    assertEquals(
      bundle.form3800Parts!.currentAmounts.find((row) => row.line === "4b")!
        .totalCredit,
      14400,
    );
    assertEquals(
      bundle.form3800Parts!.currentAmounts.find((row) => row.line === "4h")!
        .totalCredit,
      14614,
    );
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(
      dir + "shop-wotc.json",
      JSON.stringify({ input, pending: p }, null, 2),
    );
    await Deno.writeTextFile(dir + "shop-wotc.xml", bundle.xml);
    const valid = await new Deno.Command("xmllint", {
      args: ["--noout", "--schema", xsd, dir + "shop-wotc.xml"],
      stderr: "piped",
    }).output();
    assertEquals(valid.code, 0, new TextDecoder().decode(valid.stderr));
    await Deno.writeFile(
      dir + "shop-wotc.pdf",
      await buildPdfBytes(bundle.pending, filer, dir + "irs-pdf-cache", bundle),
    );
    const extraction = await new Deno.Command("pdftotext", {
      args: ["-layout", dir + "shop-wotc.pdf", "-"],
      stdout: "piped",
    }).output();
    assertEquals(extraction.code, 0);
    const packet = new TextDecoder().decode(extraction.stdout);
    await Deno.writeTextFile(dir + "shop-wotc.txt", packet);
    assertStringIncludes(
      packet,
      "Credit for Small Employer Health Insurance Premiums",
    );
    assertStringIncludes(packet, "Work Opportunity Credit");
    assertStringIncludes(packet, "25631");
    assert(packet.split("\f").filter((page) => page.trim()).length >= 24);
  },
});
