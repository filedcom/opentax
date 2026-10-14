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
  { id: "T-fishing-T-jobs", kind: "joint-T", owners: ["T", "T"] },
  { id: "T-fishing-S-jobs", kind: "joint-T", owners: ["S", "S"] },
  { id: "T-fishing-both-jobs", kind: "joint-T", owners: ["T", "S"] },
  { id: "S-fishing-T-jobs", kind: "joint-S", owners: ["T", "T"] },
  { id: "S-fishing-S-jobs", kind: "joint-S", owners: ["S", "S"] },
  { id: "S-fishing-both-jobs", kind: "joint-S", owners: ["T", "S"] },
] as const;

for (const entry of cases) {
  Deno.test(`Schedule J multiple nonfarm jobs: ${entry.id}`, async () => {
    const { input: base } = fishingExpenseInput(entry.kind);
    const wageFixture = scheduleJNonfarmW2Inputs();
    const wageSource =
      publicInputSchema.parse(wageFixture.schedule_j).nonfarm_wage_source;
    assertExists(wageSource);
    const [wageBase] = z.array(w2ItemSchema).parse(wageFixture.w2);
    const employer = nonfarmEmployerRecordSchema.parse(
      JSON.parse(atob(wageSource.bytes_base64)),
    );
    const records = entry.owners.map((owner, index) => {
      const amount = index === 0 ? 40000 : 60000;
      const ein = index === 0 ? "987654321" : "987654322";
      const employee = owner === "T" ? "123456789" : "444556666";
      const reference = `W2-2025-JOB-${index}`;
      const documentId = `EMPLOYER-2025-JOB-${index}`;
      const name = `Engineering Employer ${index}`;
      const wage = {
        ...wageBase,
        employer_ein: ein,
        employer_name: name,
        employee_ssn: employee,
        source_document_reference: reference,
        schedule_j_nonfarm_wage_source_document_id: documentId,
        box1_wages: amount,
        box2_fed_withheld: amount * .2,
        box3_ss_wages: amount,
        box4_ss_withheld: amount * .062,
        box5_medicare_wages: amount,
        box6_medicare_withheld: amount * .0145,
      };
      const sourceRecord = {
        ...employer,
        employer_ein: ein,
        employer_name: name,
        issued_by: name,
        employee_ssn: employee,
        w2_source_document_reference: reference,
        w2_box1_wages: amount,
        w2_box2_withholding: amount * .2,
        w2_box3_ss_wages: amount,
        w2_box5_medicare_wages: amount,
      };
      const bytes = new TextEncoder().encode(JSON.stringify(sourceRecord));
      return {
        wage,
        sourceRecord,
        proof: {
          document_id: documentId,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          bytes_base64: btoa(String.fromCharCode(...bytes)),
        },
      };
    });
    const inputs = {
      ...base,
      w2: records.map((record) => record.wage),
      schedule_j: {
        ...z.object({ schedule_j: publicInputSchema }).parse(base).schedule_j,
        nonfarm_wage_sources: records.map((record) => record.proof).reverse(),
      },
    };
    const sourceRecords = records.map((record) => record.sourceRecord);
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = normalizeAllPending(result.pending);
    assertEquals(pending.f1040.line1a_wages, 100000);
    assertEquals(pending.f1040.line25a_w2_withheld, 20000);
    assertEquals(pending.schedule_j.line2a, 15000);
    const wagesFor = (owner: "T" | "S") =>
      records.reduce(
        (sum, record) =>
          sum +
          (record.wage.employee_ssn ===
              (owner === "T" ? "123456789" : "444556666")
            ? record.wage.box1_wages
            : 0),
        0,
      );
    const se = (profit: number, wages: number) => {
      const net = profit * .9235;
      return Math.round(Math.min(net, Math.max(0, 176100 - wages)) * .124) +
        Math.round(net * .029);
    };
    const fishingSe = se(
      120000,
      wagesFor(entry.kind === "joint-T" ? "T" : "S"),
    );
    const farmSe = se(200000, wagesFor(entry.kind === "joint-T" ? "S" : "T"));
    const seTax = fishingSe + farmSe;
    const halfSe = Math.round(fishingSe / 2) + Math.round(farmSe / 2);
    assertEquals(pending.schedule2.line4_se_tax, seTax);
    assertEquals(pending.schedule1.line15_se_deduction, halfSe);
    assertEquals(pending.f1040.line11_agi, 420000 - halfSe);
    assertEquals(
      z.number().parse(pending.f1040.line24_total_tax) - 20000,
      pending.f1040.line37_amount_owed,
    );
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const root = Deno.env.get("OPENTAX_SCHEDULE_J_JOBS_PROOF_DIR");
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            inputs,
            sourceRecords,
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
            sourceRecords,
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
          w2: {
            ...pending.w2,
            w2s: inputs.w2.map((wage, index) =>
              index === 1 ? { ...wage, employee_ssn: "999887777" } : wage
            ),
          },
        },
        {
          ...pending,
          w2: {
            ...pending.w2,
            w2s: inputs.w2.map((wage, index) =>
              index === 1 ? { ...wage, box3_ss_wages: 60001 } : wage
            ),
          },
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
    const [first, second] = inputs.w2;
    const [proof1, proof2] = inputs.schedule_j.nonfarm_wage_sources;
    for (
      const changed of [
        { ...inputs, w2: [first, { ...second, employee_ssn: "999887777" }] },
        { ...inputs, w2: [first, { ...second, box3_ss_wages: 60001 }] },
        { ...inputs, w2: [first, first] },
        {
          ...inputs,
          w2: [first, {
            ...second,
            source_document_reference: first.source_document_reference,
          }],
        },
        { ...inputs, w2: [first] },
        {
          ...inputs,
          schedule_j: { ...inputs.schedule_j, nonfarm_wage_sources: [proof1] },
        },
        {
          ...inputs,
          schedule_j: {
            ...inputs.schedule_j,
            nonfarm_wage_sources: [proof1, proof1],
          },
        },
        {
          ...inputs,
          schedule_j: {
            ...inputs.schedule_j,
            nonfarm_wage_sources: [
              { ...proof1, sha256: "0".repeat(64) },
              proof2,
            ],
          },
        },
        {
          ...inputs,
          schedule_j: { ...inputs.schedule_j, nonfarm_wage_source: proof1 },
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
