import { assertEquals, assertRejects } from "@std/assert";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { Box12Code } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { f1040_2025 } from "../../../../index.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../../pdf/builder.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";

const cases = [
  ...[
    Box12Code.D,
    Box12Code.E,
    Box12Code.F,
    Box12Code.H,
    Box12Code.S,
    Box12Code.AA,
    Box12Code.BB,
    Box12Code.EE,
  ].map((code) => ({
    name: `single-${code}`,
    code,
    joint: false,
    elective: 2000,
    credit: 400,
  })),
  {
    name: "single-G-split",
    code: Box12Code.G,
    joint: false,
    elective: 1500,
    credit: 300,
  },
  {
    name: "single-G-employer-only",
    code: Box12Code.G,
    joint: false,
    elective: 0,
    credit: 0,
  },
  {
    name: "joint-H-and-AA",
    code: Box12Code.H,
    joint: true,
    elective: 2000,
    credit: 800,
  },
];
for (const item of cases) {
  Deno.test(`W-2 plan source ${item.name} reconciles complete return`, async () => {
    const general = generalSchema.parse({
      filing_status: item.joint ? FilingStatus.MFJ : FilingStatus.Single,
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Plans",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1964-06-15",
      taxpayer_form8880_student_five_months: false,
      taxpayer_form8880_claimed_as_dependent: false,
      ...(item.joint
        ? {
          spouse_first_name: "Sam",
          spouse_last_name: "Plans",
          spouse_ssn: "999-88-7777",
          spouse_dob: "1964-07-15",
          spouse_form8880_student_five_months: false,
          spouse_form8880_claimed_as_dependent: false,
          form8880_joint_distribution_review: {
            filing_due_date: "2026-04-15",
            reviewed_distribution_sources_ref: "complete-joint-lookback",
            no_other_qualifying_distributions_in_lookback: true,
            current_year_source_inventory_review: {
              reviewed_by: "Plan Reviewer",
              reviewed_on: "2026-04-10",
              complete_1099r_inventory_confirmed: true,
            },
            entries: [],
          },
        }
        : {
          form8880_nonjoint_distribution_review: {
            taxpayer_ssn: "111223333",
            reviewed_by: "Plan Reviewer",
            reviewed_on: "2026-04-10",
            filing_due_date: "2026-04-15",
            reviewed_distribution_sources_ref: "complete-lookback",
            complete_distribution_inventory_confirmed: true,
            entries: [],
          },
        }),
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      digital_assets: false,
    });
    const wage = (spouse: boolean) => ({
      employee_ssn: spouse ? "999-88-7777" : "111-22-3333",
      employer_ein: spouse ? "23-4567890" : "12-3456789",
      employer_name: "Plan Employer",
      employer_address_line1: "2 Main St",
      employer_address_city: "Austin",
      employer_address_state: "TX",
      employer_address_zip: "78701",
      box1_wages: 25000 + (!spouse && item.code === Box12Code.H ? 2000 : 0),
      box2_fed_withheld: item.joint ? 1500 : 2000,
      box12_entries: [{
        code: spouse ? Box12Code.AA : item.code,
        amount: 2000,
        ...(!spouse && item.code === Box12Code.G
          ? {
            code_g_governmental_457b: true as const,
            code_g_employee_elective_amount: item.elective,
            code_g_employee_split_review_ref:
              "reviewed-employee-employer-split",
          }
          : {}),
      }],
    });
    const inputs = {
      general,
      w2: item.joint ? [wage(false), wage(true)] : [wage(false)],
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    const beforeTax = item.joint ? 1853 : 928;
    assertEquals(pending.f1040?.line11_agi, item.joint ? 50000 : 25000);
    assertEquals(pending.f1040?.line18_total_tax_before_credits, beforeTax);
    assertEquals(pending.f1040?.line20_nonrefundable_credits ?? 0, item.credit);
    assertEquals(pending.f1040?.line24_total_tax, beforeTax - item.credit);
    assertEquals(
      pending.f1040?.line35a_refund,
      (item.joint ? 3000 : 2000) - beforeTax + item.credit,
    );
    if (item.code === Box12Code.H) {
      assertEquals(pending.schedule1?.line24f_501c18d, 2000);
    }
    if (item.credit) {
      assertEquals(pending.form8880?.print_line2a_deferrals, item.elective);
      assertEquals(
        pending.form8880?.print_line2b_deferrals ?? 0,
        item.joint ? 2000 : 0,
      );
    }
    const filer = extractFilerIdentity(general);
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertEquals(bundle.xml.includes("<IRS8880 "), item.credit > 0);
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    if (item.credit) {
      for (
        const w2s of [
          [],
          [...inputs.w2, inputs.w2[0]],
          inputs.w2.map((w) => ({ ...w, employee_ssn: "222-33-4444" })),
          inputs.w2.map((w) => ({
            ...w,
            box12_entries: w.box12_entries.map((e) => ({ ...e, amount: 2001 })),
          })),
        ]
      ) {
        const altered = { ...pending, w2: { ...pending.w2, w2s } };
        await assertRejects(() =>
          buildMefBundle(altered, { filer, attachments: [] })
        );
        await assertRejects(() => buildPdfBytes(altered, filer, ".pdf-cache"));
      }
    }
    const dir = Deno.env.get("FORM8880_PLAN_EVIDENCE");
    if (dir) {
      const output = `${dir}/${item.name}`;
      await Deno.mkdir(output, { recursive: true });
      for (
        const [name, value] of [
          ["source", inputs],
          ["pending", result.pending],
          ["origins", origins],
        ] as const
      ) {
        await Deno.writeTextFile(
          `${output}/${name}.json`,
          JSON.stringify(value, null, 2),
        );
      }
      await Deno.writeTextFile(`${output}/return.xml`, bundle.xml);
      await Deno.writeFile(`${output}/return.pdf`, pdf);
    }
  });
}
