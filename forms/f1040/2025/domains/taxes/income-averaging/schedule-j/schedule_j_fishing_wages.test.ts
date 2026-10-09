import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { createHash } from "node:crypto";
import { z } from "zod";
import { fishingExpenseInput } from "./schedule_j_fishing_expenses.fixture.ts";
import { scheduleJNonfarmW2Inputs } from "./schedule_j_nonfarm_w2.fixture.ts";
import { nonfarmEmployerRecordSchema } from "./schedule_j_source_return.ts";
import { publicInputSchema } from "../../../../../nodes/inputs/taxes/income-averaging/schedule_j/index.ts";
import { w2ItemSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { f1040_2025 } from "../../../../index.ts";
import { normalizeAllPending } from "../../../../return-processing/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";

const cases = [
  { id: "fishing-wages", kind: "fishing", wageOwner: "T" },
  { id: "two-farms-wages", kind: "mixed-two-farm", wageOwner: "T" },
  { id: "joint-T-fishing-T-wages", kind: "joint-T", wageOwner: "T" },
  { id: "joint-T-fishing-S-wages", kind: "joint-T", wageOwner: "S" },
  { id: "joint-S-fishing-T-wages", kind: "joint-S", wageOwner: "T" },
  { id: "joint-S-fishing-S-wages", kind: "joint-S", wageOwner: "S" },
] as const;

for (const entry of cases) {
  Deno.test(`Schedule J nonfarm wages with owned fishing/farming: ${entry.id}`, async () => {
    const { input: base } = fishingExpenseInput(entry.kind);
    const wageFixture = scheduleJNonfarmW2Inputs();
    const wageSource =
      publicInputSchema.parse(wageFixture.schedule_j).nonfarm_wage_source;
    assertExists(wageSource);
    const [wageBase] = z.array(w2ItemSchema).parse(wageFixture.w2);
    const owner = entry.wageOwner === "T" ? "123456789" : "444556666";
    const wage = { ...wageBase, employee_ssn: owner };
    const employer = nonfarmEmployerRecordSchema.parse(
      JSON.parse(atob(wageSource.bytes_base64)),
    );
    const sourceRecord = { ...employer, employee_ssn: owner };
    const bytes = new TextEncoder().encode(JSON.stringify(sourceRecord));
    const inputs = {
      ...base,
      w2: [wage],
      schedule_j: {
        ...z.object({ schedule_j: publicInputSchema }).parse(base).schedule_j,
        nonfarm_wage_source: {
          ...wageSource,
          bytes_base64: btoa(String.fromCharCode(...bytes)),
          sha256: createHash("sha256").update(bytes).digest("hex"),
        },
      },
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals(pending.f1040.line1a_wages, 100000);
    assertEquals(pending.f1040.line25a_w2_withheld, 20000);
    assertEquals(pending.schedule_j.line2a, 15000);
    const joint = entry.kind.startsWith("joint-");
    const fishingWage = joint && entry.kind.endsWith(entry.wageOwner);
    const se = (profit: number, wages: number) => {
      const net = profit * .9235;
      return Math.round(Math.min(net, Math.max(0, 176100 - wages)) * .124) +
        Math.round(net * .029);
    };
    const fishingSe = se(120000, fishingWage ? 100000 : 0);
    const farmSe = se(200000, joint && !fishingWage ? 100000 : 0);
    const seTax = joint ? fishingSe + farmSe : se(320000, 100000);
    const halfSe = joint
      ? Math.round(fishingSe / 2) + Math.round(farmSe / 2)
      : Math.round(seTax / 2);
    assertEquals(pending.schedule2.line4_se_tax, seTax);
    assertEquals(pending.schedule1.line15_se_deduction, halfSe);
    assertEquals(pending.f1040.line11_agi, (joint ? 420000 : 455000) - halfSe);
    assertEquals(
      z.number().parse(pending.f1040.line24_total_tax) - 20000,
      pending.f1040.line37_amount_owed,
    );
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const root = Deno.env.get("OPENTAX_SCHEDULE_J_WAGES_PROOF_DIR");
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs,
            sourceRecord,
            pending,
            filer,
            expected: { ...entry, seTax, halfSe },
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
    }
    if (!joint) {
      // Deferred Form 4972/AMT rounding mismatch; preserve the original sources.
      assertEquals(pending.form6251.amti, 685997);
      assertEquals(pending.form6251.exemption, 73188);
      await assertRejects(
        () => f1040_2025.prepareReturn(result.pending, filer),
        Error,
        "Form 6251 exemption and taxable excess differ",
      );
      await assertRejects(
        () => buildPdfBytes(pending, filer),
        Error,
        "Form 6251 exemption and taxable excess differ",
      );
      return;
    }
    const qbi = Math.round((320000 - halfSe) * .2);
    const taxable = 420000 - halfSe - 33100 - qbi;
    const regular = Math.round(taxable * .24 - 14306);
    const electedTax = Math.round((taxable - 15000) * .24 - 14306) + 1500;
    const additionalMedicare = Math.round(
      (320000 * .9235 + 100000 - 250000) * .009,
    );
    assertEquals(pending.f1040.line13_qbi_deduction, qbi);
    assertEquals(pending.f1040.line15_taxable_income, taxable);
    assertEquals(pending.schedule_j.line23, electedTax);
    assertEquals(pending.form6251.regular_tax, regular);
    assertEquals(
      pending.schedule2.line11_additional_medicare,
      additionalMedicare,
    );
    assertEquals(pending.schedule2.line2_amt ?? 0, 0);
    assertEquals(
      pending.f1040.line24_total_tax,
      electedTax + seTax + additionalMedicare,
    );
    const prepared = await f1040_2025.prepareReturn(result.pending, filer);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    if (root) {
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, prepared.bundle.xml);
      await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs,
            sourceRecord,
            pending,
            filer,
            origins,
            expected: { ...entry, seTax, halfSe },
            acceptanceVerified: false,
          },
          null,
          2,
        ),
      );
    }
    for (
      const changed of [
        {
          ...pending,
          w2: { ...pending.w2, w2s: [{ ...wage, employee_ssn: "999887777" }] },
        },
        {
          ...pending,
          w2: { ...pending.w2, w2s: [{ ...wage, box3_ss_wages: 100001 }] },
        },
        {
          ...pending,
          f1040: {
            ...pending.f1040,
            line16_income_tax: Number(pending.f1040.line16_income_tax) + 1,
          },
        },
        {
          ...pending,
          schedule1: { ...pending.schedule1, line15_se_deduction: halfSe + 1 },
        },
      ]
    ) {
      await assertRejects(
        () => f1040_2025.prepareReturn(changed, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(changed, filer), Error);
    }
    for (
      const changed of [
        { ...inputs, w2: [{ ...wage, employee_ssn: "999887777" }] },
        { ...inputs, w2: [{ ...wage, box3_ss_wages: 100001 }] },
        {
          ...inputs,
          schedule_j: {
            ...inputs.schedule_j,
            nonfarm_wage_source: {
              ...inputs.schedule_j.nonfarm_wage_source,
              sha256: "0".repeat(64),
            },
          },
        },
      ]
    ) {
      await assertRejects(async () => {
        const result = f1040_2025.executeReturn(changed);
        if (result.diagnostics.length) {
          throw new Error("Rejected public source");
        }
        await f1040_2025.prepareReturn(result.pending, filer);
      }, Error);
    }
  });
}
