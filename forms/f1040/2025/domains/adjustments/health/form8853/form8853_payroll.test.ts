import { archerContributionLedgerSchema } from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/archer_contributions.ts";
import { w2 } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
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
import {
  archerCompensationSources,
  calculateArcherContributions,
} from "../../../../../nodes/intermediate/forms/adjustments/health/form8853/archer_contributions.ts";
import { fixture, ledger } from "./form8853_contributions.fixture.ts";

function payrollInput(kind: string) {
  const source = ledger();
  source.compensation.service_wages = kind === "pay-cap" ? 750.49 : 60000.49;
  source.compensation.employer_excess_already_in_box1 =
    kind === "employer-excess" ? 400 : 0;
  source.additional_compensation_sources = {
    complete_employer_payroll_review_reference:
      "Synthetic full employer payroll inventory",
    distinct_issued_w2s_not_corrected_or_replacement_copies_confirmed: true,
    records: [{
      ...source.compensation,
      w2_source_reference: "issued-second-w2",
      payroll_source_reference: "Synthetic distinct second payroll",
    }],
  };
  if (kind === "employer-excess") source.personal_contributions = [];
  if (kind === "pay-cap") source.personal_contributions[0].amount = 3000;
  if (kind === "spouse-mixed") {
    source.owner = "spouse";
    source.filing_status = "mfj";
    source.holder_ssn = "222334444";
    source.personal_contributions[0].payer_ssn = source.holder_ssn;
  }
  const employer = kind === "employer-excess"
    ? 2000.49
    : kind === "spouse-mixed"
    ? 1000
    : 0;
  const input = fixture(source, employer);
  const first = input.w2[0];
  input.w2.push({ ...first, source_document_reference: "issued-second-w2" });
  if (kind === "pay-cap") {
    input.w2.push({
      ...first,
      employer_ein: "98-7654321",
      employer_name: "Other Employer",
      source_document_reference: "unrelated-employer-w2",
      box1_wages: 120000,
      box2_fed_withheld: 20000,
      box3_ss_wages: 120000,
      box4_ss_withheld: 7440,
      box5_medicare_wages: 120000,
      box6_medicare_withheld: 1740,
    });
  }
  return input;
}
function evidenceRoot() {
  try {
    return Deno.env.get("ARCHER_PAYROLL_EVIDENCE");
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return undefined;
    throw error;
  }
}
const cases = [
  {
    id: "personal",
    deduction: 2000,
    income: 0,
    excess: 0,
    tax: 17409,
    agi: 118001,
    additional: 0,
  },
  {
    id: "employer-excess",
    deduction: 0,
    income: 601,
    excess: 1401,
    tax: 18287,
    agi: 121402,
    additional: 84,
  },
  {
    id: "spouse-mixed",
    deduction: 0,
    income: 0,
    excess: 2000,
    tax: 10266,
    agi: 120001,
    additional: 120,
  },
  {
    id: "pay-cap",
    deduction: 1501,
    income: 0,
    excess: 1499,
    tax: 17957,
    agi: 120000,
    additional: 90,
  },
];
for (const entry of cases) {
  Deno.test(`Archer multiple payroll complete return: ${entry.id}`, async () => {
    const input = payrollInput(entry.id);
    const executed = f1040_2025.executeReturn(input);
    assertEquals(executed.diagnostics, []);
    const pending = normalizeAllPending(executed.pending);
    assertEquals(
      pending.schedule1.line23_archer_msa_deduction ?? 0,
      entry.deduction,
    );
    assertEquals(
      pending.schedule1.line8z_archer_excess_employer ?? 0,
      entry.income,
    );
    assertEquals(Math.round(Number(pending.f1040.line11_agi)), entry.agi);
    assertEquals(Math.round(Number(pending.f1040.line24_total_tax)), entry.tax);
    assertEquals(pending.f1040.line23_other_taxes ?? 0, entry.additional);
    const filer = extractFilerIdentity(pending.f1040);
    assertExists(filer);
    const prepared = await f1040_2025.prepareReturn(pending, filer);
    assertEquals(
      (prepared.bundle.xml.match(/<IRSW2 documentId=/g) ?? []).length,
      input.w2.length,
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      prepared.bundle.pending,
      filer,
      ".pdf-cache",
      prepared.bundle,
      origins,
    );
    function editablePending() {
      const copy = structuredClone(pending);
      return {
        ...copy,
        schedule1: copy.schedule1,
        form8853: {
          ...copy.form8853,
          archer_contribution_ledger: archerContributionLedgerSchema.parse(
            copy.form8853.archer_contribution_ledger,
          ),
        },
        w2: w2.inputSchema.parse(copy.w2),
      };
    }
    const mutations: Array<(p: ReturnType<typeof editablePending>) => void> = [
      (p) => {
        p.form8853.archer_contribution_ledger.additional_compensation_sources!
          .records.pop();
      },
      (p) => {
        p.form8853.archer_contribution_ledger.additional_compensation_sources!
          .records[0].service_wages += 1;
      },
      (p) => {
        p.w2.w2s[1].employee_ssn = "999887777";
      },
      (p) => {
        p.w2.w2s[1].source_document_reference = "unreviewed-second";
      },
      (p) => {
        p.w2.w2s.push({
          ...p.w2.w2s[1],
          source_document_reference: "unreviewed-third",
        });
      },
      (p) => {
        p.schedule1.line23_archer_msa_deduction = entry.deduction + 1;
      },
      (p) => {
        p.form8853.archer_contribution_ledger.additional_compensation_sources!
          .records[0].employer_excess_already_in_box1 += 1;
      },
    ];
    for (const mutate of mutations) {
      const changed = editablePending();
      mutate(changed);
      await assertRejects(
        () => f1040_2025.prepareReturn(changed, filer),
        Error,
      );
      await assertRejects(() => buildPdfBytes(changed, filer), Error);
    }
    // Issued record order cannot change the complete payroll limit or final tax.
    const reversed = structuredClone(input);
    reversed.w2.reverse();
    const replay = f1040_2025.executeReturn(reversed);
    assertEquals(replay.diagnostics, []);
    assertEquals(
      replay.pending.f1040.line24_total_tax,
      executed.pending.f1040.line24_total_tax,
    );
    await f1040_2025.prepareReturn(
      replay.pending,
      extractFilerIdentity(replay.pending.f1040),
    );
    const root = evidenceRoot();
    if (root) {
      await Deno.mkdir(root, { recursive: true });
      await Deno.writeFile(`${root}/${entry.id}.pdf`, pdf);
      await Deno.writeTextFile(`${root}/${entry.id}.xml`, prepared.bundle.xml);
      await Deno.writeTextFile(
        `${root}/${entry.id}.json`,
        JSON.stringify(
          {
            input,
            pending,
            expected: entry,
            origins,
            rejectedNative: mutations.length,
            rejectedPdf: mutations.length,
          },
          null,
          2,
        ),
      );
    }
  });
}
Deno.test("Archer payroll inventory rejects repeated records and preserves aggregate cent rounding", () => {
  const source = payrollInput("pay-cap").form8853.archer_contribution_ledger;
  assertEquals(archerCompensationSources(source).length, 2);
  assertEquals(calculateArcherContributions(source).line4, 1501);
  const duplicate = structuredClone(source);
  duplicate.additional_compensation_sources!.records[0].w2_source_reference =
    source.compensation.w2_source_reference;
  assertThrows(
    () => calculateArcherContributions(duplicate),
    Error,
    "distinct issued",
  );
  const payroll = structuredClone(source);
  payroll.additional_compensation_sources!.records[0].payroll_source_reference =
    source.compensation.payroll_source_reference;
  assertThrows(
    () => calculateArcherContributions(payroll),
    Error,
    "distinct issued",
  );
  const refs = archerCompensationSources(source).map((r) => ({
    employee_ssn: source.holder_ssn,
    employer_ein: source.employer_ein,
    source_document_reference: r.w2_source_reference,
    amount: 1000.49,
  }));
  assertEquals(calculateArcherContributions(source, refs).line1, 2001);
  assertThrows(
    () => calculateArcherContributions(source, [refs[0], refs[0]]),
    Error,
    "cannot repeat",
  );
});
