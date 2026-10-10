import { assertEquals, assertRejects } from "@std/assert";
import {
  EmployeeType,
  inputSchema,
  itemSchema,
} from "../../../../../nodes/inputs/adjustments/employment/f2106/index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { cases, fixture } from "./form2106_fee_basis.fixture.ts";

const artistCases = [
  {
    name: "single-two-employers",
    status: FilingStatus.Single,
    wages: [7000, 5000],
    expenses: [600, 700],
    joint: false,
    spouseOrdinary: 0,
    total: 12000,
    deduction: 1300,
  },
  {
    name: "single-agi-ceiling",
    status: FilingStatus.Single,
    wages: [8000, 8000],
    expenses: [800, 801],
    joint: false,
    spouseOrdinary: 0,
    total: 16000,
    deduction: 1601,
  },
  {
    name: "single-third-employer",
    status: FilingStatus.Single,
    wages: [6000, 5900, 100],
    expenses: [600, 600, 1],
    joint: false,
    spouseOrdinary: 0,
    total: 12000,
    deduction: 1201,
  },
  {
    name: "joint-one-artist",
    status: FilingStatus.MFJ,
    wages: [6000, 6000],
    expenses: [700, 700],
    joint: true,
    spouseOrdinary: 4000,
    total: 16000,
    deduction: 1400,
  },
  {
    name: "joint-two-artists",
    status: FilingStatus.MFJ,
    wages: [4000, 4000, 4000, 4000],
    expenses: [401, 401, 401, 401],
    joint: true,
    spouseOrdinary: 0,
    total: 16000,
    deduction: 1604,
  },
  {
    name: "separate-lived-apart",
    status: FilingStatus.MFS,
    wages: [7000, 5000],
    expenses: [600, 700],
    joint: false,
    spouseOrdinary: 0,
    total: 12000,
    deduction: 1300,
  },
] as const;

for (const c of artistCases) {
  Deno.test(`Form 2106 artist ${c.name} reconciles owner-wide qualification and complete return`, async () => {
    const original = fixture(cases[4]);
    const sourceJobs = c.wages.map((w, i) => {
      const owner = c.name === "joint-two-artists" && i >= 2
        ? "spouse"
        : "taxpayer";
      const base = original.f2106[i];
      const indexes = c.wages.map((_, index) => index).filter((index) =>
        (c.name === "joint-two-artists" && index >= 2
          ? "spouse"
          : "taxpayer") === owner
      );
      return itemSchema.parse({
        ...base,
        job: {
          ...base.job,
          owner,
          employee_name: owner === "taxpayer"
            ? "Casey Rivera"
            : "Jordan Rivera",
          employee_ssn: owner === "taxpayer" ? "123-45-6789" : "234-56-7890",
          occupation: "Performing artist",
          employment_record_reference: `${c.name} arts job ${i}`,
        },
        qualification: {
          kind: EmployeeType.PERFORMING_ARTIST,
          employers: indexes.map((index) => ({
            employer_ein: original.f2106[index].job.employer_ein,
            wages: c.wages[index],
            w2_reference: `${c.name} arts W-2 ${index}`,
          })),
          performing_arts_gross_income: indexes.reduce(
            (sum, index) => sum + c.wages[index],
            0,
          ),
          adjusted_gross_income_before_artist_deduction: c.total,
          filing_status: c.status === FilingStatus.MFJ
            ? "married_filing_jointly"
            : c.status === FilingStatus.MFS
            ? "married_filing_separately"
            : "single",
          married_at_year_end: c.status !== FilingStatus.Single,
          lived_apart_from_spouse_all_year: c.status === FilingStatus.MFS,
        },
        expenses: {
          ...base.expenses,
          line4_other_business_expenses: c.expenses[i],
          expense_records_reference: `${c.name} expense ${i}`,
          job_business_purpose: "Rehearsal materials for paid performances",
        },
      });
    });
    const w2 = sourceJobs.map((j, i) => ({
      ...original.w2[i],
      employee_ssn: j.job.employee_ssn,
      box1_wages: c.wages[i],
      box2_fed_withheld: c.wages[i] * .1,
      box3_ss_wages: c.wages[i],
      box4_ss_withheld: c.wages[i] * .062,
      box5_medicare_wages: c.wages[i],
      box6_medicare_withheld: c.wages[i] * .0145,
    }));
    if (c.spouseOrdinary) {
      w2.push({
        ...w2[0],
        employee_ssn: "234-56-7890",
        employer_ein: "98-7654321",
        employer_name: "Ordinary Employer",
        box1_wages: 4000,
        box2_fed_withheld: 400,
        box3_ss_wages: 4000,
        box4_ss_withheld: 248,
        box5_medicare_wages: 4000,
        box6_medicare_withheld: 58,
      });
    }
    const source = {
      general: {
        ...original.general,
        filing_status: c.status,
        taxpayer_dob: "2004-06-15",
        spouse_dob: "2004-06-15",
        ...(c.status === FilingStatus.Single
          ? {
            spouse_first_name: undefined,
            spouse_last_name: undefined,
            spouse_ssn: undefined,
            spouse_dob: undefined,
          }
          : {}),
      },
      w2,
      f2106: sourceJobs,
    };
    const result = f1040_2025.executeReturn(source);
    assertEquals(result.diagnostics, []);
    const prepared = buildPending(result.pending);
    const pending = { ...prepared, f2106: inputSchema.parse(prepared.f2106) };
    const f = pending.f1040!;
    assertEquals([
      pending.schedule1?.line12_business_expenses,
      f.line10_adjustments,
      f.line11_agi,
      f.line15_taxable_income,
      f.line24_total_tax,
      f.line35a_refund,
    ], [c.deduction, c.deduction, c.total - c.deduction, 0, 0, c.total * .1]);
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    const first = sourceJobs[0];
    if (first.qualification.kind !== EmployeeType.PERFORMING_ARTIST) {
      throw new Error("Expected artist");
    }
    const q = first.qualification;
    const alteredQualifications = [{
      ...q,
      adjusted_gross_income_before_artist_deduction: 16001,
    }, {
      ...q,
      performing_arts_gross_income: q.performing_arts_gross_income + 1,
    }, {
      ...q,
      employers: q.employers.map((e, i) =>
        i ? e : { ...e, wages: e.wages + 1 }
      ),
    }, {
      ...q,
      filing_status: q.filing_status === "single"
        ? "married_filing_jointly" as const
        : "single" as const,
    }, { ...q, employers: [q.employers[0], q.employers[0]] }];
    const variants: typeof pending[] = alteredQualifications.map(
      (qualification) => ({
        ...pending,
        f2106: {
          f2106s: sourceJobs.map((job) =>
            job.job.owner === first.job.owner ? { ...job, qualification } : job
          ),
        },
      }),
    );
    // Keep each owner's records consistent so these reach final-return joins.
    variants.push(...[{
      ...q,
      adjusted_gross_income_before_artist_deduction: c.total - 1,
    }, {
      ...q,
      performing_arts_gross_income: q.performing_arts_gross_income - 1,
      employers: q.employers.map((e, i) =>
        i ? e : { ...e, wages: e.wages - 1 }
      ),
    }].map((qualification) => ({
      ...pending,
      f2106: {
        f2106s: sourceJobs.map((job) =>
          job.job.owner === first.job.owner ? { ...job, qualification } : job
        ),
      },
    })));
    variants.push({
      ...pending,
      f1040: { ...f, line11_agi: c.total - c.deduction + 1 },
    }, {
      ...pending,
      schedule1: {
        ...pending.schedule1,
        line12_business_expenses: c.deduction + 1,
      },
    }, {
      ...pending,
      w2: {
        w2s: w2.map((w, i) => i ? w : { ...w, box1_wages: w.box1_wages + 1 }),
      },
    }, {
      ...pending,
      f2106: {
        f2106s: sourceJobs.map((j, i) =>
          i ? j : { ...j, job: { ...j.job, employee_ssn: "999-88-7777" } }
        ),
      },
    });
    for (const altered of variants) {
      await assertRejects(() =>
        buildMefBundle(altered, { filer, attachments: [] })
      );
      await assertRejects(() => buildPdfBytes(altered, filer, ".pdf-cache"));
    }
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir = `.state/research/form2106-artists-2026-10-09/${c.name}`;
      await Deno.mkdir(dir, { recursive: true });
      for (
        const [name, data] of [
          ["source", source],
          ["pending", result.pending],
          ["expected", { ...c, rejections: variants.length }],
          ["origins", origins],
        ] as const
      ) {
        await Deno.writeTextFile(
          `${dir}/${name}.json`,
          JSON.stringify(data, null, 2),
        );
      }
      await Deno.writeTextFile(`${dir}/return.xml`, bundle.xml);
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
    }
  });
}
