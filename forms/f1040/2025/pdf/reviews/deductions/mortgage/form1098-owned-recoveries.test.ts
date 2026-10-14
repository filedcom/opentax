import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { inputSchema as generalSchema } from "../../../../../nodes/inputs/general/filing/general/index.ts";
import { w2ItemSchema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { buildPending } from "../../../../mef/execution/pending.ts";
import { buildMefBundle } from "../../../../mef/builder.ts";
import { buildPdfBytes, type PdfPageOrigin } from "../../../builder.ts";
import { pdfReviewFixtures } from "../../../review-fixtures.ts";
import { withSyntheticForm1098Copy } from "./review-1098-copy.fixture.ts";

const base = pdfReviewFixtures.find((f) => f.id === "single-w2-refund")!;
// Independent TY2025 tax-computation worksheet expectations: single uses
// taxable income * .24 - 7153; joint uses taxable income * .22 - 10172.
// https://www.irs.gov/pub/irs-pdf/i1040tt.pdf, page 14 (2025).
const cases = [
  {
    name: "single-itemized",
    joint: false,
    itemized: true,
    deduction: 18000,
    taxable: 133200,
    tax: 24815,
  },
  {
    name: "single-standard",
    joint: false,
    itemized: false,
    deduction: 15750,
    taxable: 135450,
    tax: 25355,
  },
  {
    name: "joint-itemized",
    joint: true,
    itemized: true,
    deduction: 36000,
    taxable: 116000,
    tax: 15348,
  },
  {
    name: "joint-standard",
    joint: true,
    itemized: false,
    deduction: 31500,
    taxable: 120500,
    tax: 16338,
  },
] as const;

for (const c of cases) {
  Deno.test(`Form 1098 owned recoveries ${c.name} preserve income and verify every lender copy`, async () => {
    const owners = c.joint ? ["111-22-3333", "444-55-6666"] : ["111-22-3333"];
    const mortgages = await Promise.all(
      owners.map((tin, i) =>
        withSyntheticForm1098Copy(`${c.name}-${i}`, {
          lender_name: `Example Lender ${i + 1}`,
          recipient_tin: tin,
          source_document_reference: `2025 ${c.name} loan ${i + 1}`,
          box1_mortgage_interest: c.itemized ? 20000 : 5000,
          box1_current_year_deductible_interest: c.itemized ? 18000 : 4000,
          box1_deduction_workpaper_reference: `2025 ${c.name} interest review ${
            i + 1
          }`,
          box2_outstanding_principal: 300000,
          box4_refund_overpaid: 2000,
          box4_prior_year_refund: true,
          box4_taxable_recovery_verified_amount: i === 0 ? 1200 : 800,
          box4_recovery_workpaper_reference:
            `2025 ${c.name} prior deduction tax-benefit review ${i + 1}`,
          box5_mip: 600,
        })
      ),
    );
    const inputs = {
      general: {
        ...generalSchema.parse(base.inputs.general),
        ...(c.joint
          ? {
            filing_status: FilingStatus.MFJ,
            spouse_first_name: "Sam",
            spouse_last_name: "Example",
            spouse_ssn: owners[1],
            spouse_dob: "1987-03-10",
          }
          : {}),
      },
      w2: [{
        ...w2ItemSchema.array().parse(base.inputs.w2)[0],
        box1_wages: 150000,
        box2_fed_withheld: 30000,
        box3_ss_wages: 150000,
        box4_ss_withheld: 9300,
        box5_medicare_wages: 150000,
        box6_medicare_withheld: 2175,
      }],
      f1098: mortgages,
    };
    const result = f1040_2025.executeReturn(inputs);
    assertEquals(result.diagnostics, []);
    const pending = buildPending(result.pending);
    const f = pending.f1040!;
    const recovery = c.joint ? 2000 : 1200;
    assertEquals([
      f.line1a_wages,
      f.line8_additional_income,
      f.line11_agi,
      f.line15_taxable_income,
      f.line16_income_tax,
      f.line24_total_tax,
      f.line35a_refund,
    ], [
      150000,
      recovery,
      150000 + recovery,
      c.taxable,
      c.tax,
      c.tax,
      30000 - c.tax,
    ]);
    assertEquals(
      c.itemized ? f.line12e_itemized_deductions : f.line12a_standard_deduction,
      c.deduction,
    );
    const filer = extractFilerIdentity(result.pending.f1040)!;
    const bundle = await buildMefBundle(pending, { filer, attachments: [] });
    assertEquals(bundle.xml.includes("<IRS1040ScheduleA"), c.itemized);
    if (c.itemized) {
      assertStringIncludes(
        bundle.xml,
        `<RptHomeMortgIntAndPointsAmt>${c.deduction}</RptHomeMortgIntAndPointsAmt>`,
      );
    }
    assertStringIncludes(
      bundle.xml,
      `<AdjustedGrossIncomeAmt>${150000 + recovery}</AdjustedGrossIncomeAmt>`,
    );
    const origins: PdfPageOrigin[] = [];
    const pdf = await buildPdfBytes(
      pending,
      filer,
      ".pdf-cache",
      bundle,
      origins,
    );
    let rejectionCount = 0;
    for (let i = 0; i < mortgages.length; i++) {
      const m = mortgages[i];
      // Fresh bytes and matching hashes still must agree with the filed facts.
      const wrongRefund = await withSyntheticForm1098Copy(`wrong-refund-${i}`, {
        ...m,
        box4_refund_overpaid: 2001,
      });
      const wrongOwner = await withSyntheticForm1098Copy(`wrong-owner-${i}`, {
        ...m,
        recipient_tin: "999-88-7777",
      });
      const changes = [
        { ...m, issuer_copy: undefined },
        { ...m, issuer_copy: { ...m.issuer_copy, pdf_sha256: "0".repeat(64) } },
        { ...m, issuer_copy: wrongRefund.issuer_copy },
        wrongOwner,
        { ...m, box4_recovery_workpaper_reference: undefined },
      ];
      for (const changed of changes) {
        const variant = {
          ...pending,
          f1098: {
            f1098s: mortgages.map((original, j) =>
              i === j ? changed : original
            ),
          },
        };
        await assertRejects(() =>
          buildMefBundle(variant, { filer, attachments: [] })
        );
        await assertRejects(() => buildPdfBytes(variant, filer, ".pdf-cache"));
        rejectionCount++;
      }
    }
    if (Deno.args.includes("--write-review-artifacts")) {
      const dir =
        `.state/research/form1098-owned-recoveries-2026-10-09/${c.name}`;
      await Deno.mkdir(dir, { recursive: true });
      for (
        const [name, data] of [["source", inputs], ["pending", pending], [
          "origins",
          origins,
        ], ["expected", {
          ...c,
          recovery,
          agi: 150000 + recovery,
          refund: 30000 - c.tax,
          rejectionCount,
        }]] as const
      ) {
        await Deno.writeTextFile(
          `${dir}/${name}.json`,
          JSON.stringify(data, null, 2),
        );
      }
      for (let i = 0; i < mortgages.length; i++) {
        await Deno.writeFile(
          `${dir}/source-${i}.pdf`,
          mortgages[i].issuer_copy.bytes,
        );
      }
      await Deno.writeTextFile(`${dir}/return.xml`, bundle.xml);
      await Deno.writeFile(`${dir}/return.pdf`, pdf);
    }
  });
}
