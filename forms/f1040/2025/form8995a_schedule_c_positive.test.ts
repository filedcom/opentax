import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { f1040_2025 } from "./index.ts";
import { FilingStatus as HeaderFilingStatus } from "../mef/header.ts";
import { normalizeAllPending } from "./pending.ts";
import { form8995a } from "./mef/forms/f8995a.ts";
import { form8995aScheduleC } from "./mef/forms/f8995a_schedule_c.ts";
import { form8995aPdf } from "./pdf/forms/f8995a.ts";
import { form8995aScheduleCPdf } from "./pdf/forms/f8995a_schedule_c.ts";
import { pdfReviewFixtures } from "./pdf/review-fixtures.ts";
import { inputSchema as form8995aInputSchema } from "../nodes/intermediate/forms/form8995a/index.ts";

const gain = {
  line_a_principal_business: "Repairs",
  line_b_business_code: "811490",
  line_c_business_name: "North Works",
  line_d_ein: "123456789",
  business_reference: "north-2025",
  line_f_accounting_method: "cash" as const,
  line_g_material_participation: true,
  line_1_gross_receipts: 1_400,
  line_26_wages: 100,
  qbi_w2_wages: 100,
  qbi_unadjusted_basis: 0,
  qbi_no_other_adjustments_confirmed: true,
};
const loss = {
  line_a_principal_business: "Retail",
  line_b_business_code: "459999",
  line_c_business_name: "South Shop",
  line_d_ein: "987654321",
  business_reference: "south-2025",
  line_f_accounting_method: "cash" as const,
  line_g_material_participation: true,
  line_32_at_risk: "a" as const,
  line_1_gross_receipts: 0,
  line_27b_other_expenses: 1_000,
  qbi_w2_wages: 0,
  qbi_unadjusted_basis: 0,
  qbi_no_other_adjustments_confirmed: true,
};
const filer = {
  primarySSN: "111223333",
  firstNameWithInitial: "Alex",
  lastName: "Owner",
  fullName: "Alex Owner",
  nameLine1: "OWNER ALEX",
  nameControl: "OWNE",
  filingStatus: HeaderFilingStatus.Single,
  address: { line1: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

function preparedReturn() {
  const result = f1040_2025.executeReturn({
    general: {
      filing_status: "single",
      taxpayer_first_name: "Alex",
      taxpayer_last_name: "Owner",
      taxpayer_ssn: "111-22-3333",
      taxpayer_dob: "1985-06-15",
      digital_assets: false,
      address_line1: "1 Main St",
      address_city: "Austin",
      address_state: "TX",
      address_zip: "78701",
      qbi_no_prior_loss_or_suspended_loss_confirmed: true,
      qbi_not_patron_of_specified_cooperative_confirmed: true,
    },
    w2: [{ box1_wages: 300_000, box2_fed_withheld: 60_000 }],
    schedule_c: [gain, loss],
  });
  assertEquals(result.diagnostics, []);
  return result;
}

Deno.test("Form 8995-A Schedule C nets two businesses to a positive limited deduction", () => {
  const result = preparedReturn();
  assertEquals(result.pending.f1040.line13_qbi_deduction, 50);
  assertEquals(result.pending.schedule1.line3_schedule_c, 300);
  assertEquals(result.pending.f1040.line8_additional_income, 300);
  assertEquals(result.carryforwards.qbi_loss_carryforward_8995a, undefined);
  const pending = normalizeAllPending(result.pending);
  const parent = form8995aInputSchema.parse(pending.form8995a);
  const companion = form8995aInputSchema.parse(pending.form8995a_schedule_c);
  assertEquals(parent.qbi, 300);
  const parentXml = form8995a.build(parent, { filer, pending });
  const scheduleXml = form8995aScheduleC.build(companion, { filer, pending });
  assertStringIncludes(
    parentXml,
    "<QualifiedBusinessIncomeDedAmt>50</QualifiedBusinessIncomeDedAmt>",
  );
  assertStringIncludes(
    scheduleXml,
    "<TotalTradeOrBusinessLossAmt>1000</TotalTradeOrBusinessLossAmt>",
  );
  assertStringIncludes(
    scheduleXml,
    "<LossNettedIncomeOthTradeBusAmt>1000</LossNettedIncomeOthTradeBusAmt>",
  );
  assertStringIncludes(
    scheduleXml,
    "<QlfyBusLossCarryforwardAmt>0</QlfyBusLossCarryforwardAmt>",
  );
  const parentPdf = form8995aPdf.projectFields!(parent, pending);
  const schedulePdf = form8995aScheduleCPdf.projectFields!(companion, pending);
  assertEquals(parentPdf.line2, 300);
  assertEquals(parentPdf.line3, 60);
  assertEquals(parentPdf.line10, 50);
  assertEquals(parentPdf.line39, 50);
  assertEquals(schedulePdf.line3, 1_000);
  assertEquals(schedulePdf.line4, 1_300);
  assertEquals(schedulePdf.line5, 1_000);
  assertEquals(schedulePdf.line6, 0);
});

Deno.test("positive Schedule C loss-netting packet rejects extra Schedule B and changed final deduction", () => {
  const pending = normalizeAllPending(preparedReturn().pending);
  const altered: Record<string, Record<string, unknown>>[] = [{
    ...pending,
    form8995a_schedule_b: pending.form8995a,
  }, {
    ...pending,
    f1040: { ...pending.f1040, line13_qbi_deduction: 51 },
  }, {
    ...pending,
    schedule1: { ...pending.schedule1, line3_schedule_c: 301 },
  }, {
    ...pending,
    schedule1: { ...pending.schedule1, line17_se_health_insurance: 1 },
  }, {
    ...pending,
    f1040: { ...pending.f1040, line8_additional_income: 301 },
  }, {
    ...pending,
    f1040: {
      ...pending.f1040,
      line15_taxable_income: Number(pending.f1040.line15_taxable_income) + 1,
    },
  }];
  for (const changed of altered) {
    assertThrows(
      () =>
        form8995a.build(form8995aInputSchema.parse(changed.form8995a), {
          filer,
          pending: changed,
        }),
      Error,
    );
    assertThrows(
      () =>
        form8995aScheduleC.build(
          form8995aInputSchema.parse(changed.form8995a_schedule_c),
          {
            filer,
            pending: changed,
          },
        ),
      Error,
    );
    assertThrows(
      () => form8995aPdf.projectFields!(changed.form8995a, changed),
      Error,
    );
    assertThrows(
      () =>
        form8995aScheduleCPdf.projectFields!(
          form8995aInputSchema.parse(changed.form8995a_schedule_c),
          changed,
        ),
      Error,
    );
  }
});

Deno.test("cent-valued Schedule C gain and loss reach whole-dollar Form 8995-A, XSD and filled PDF", async () => {
  const base = pdfReviewFixtures.find((fixture) =>
    fixture.id === "single-form8995a-two-business-loss-netting"
  )!;
  const original = base.inputs.schedule_c as Record<string, unknown>[];
  const inputs = {
    ...base.inputs,
    schedule_c: [
      { ...original[0], line_1_gross_receipts: 400.25 },
      {
        ...original[1],
        part_v_other_expenses: [{
          description: "Shop operating costs",
          amount: 100.10,
        }],
      },
    ],
  };
  const result = f1040_2025.executeReturn(inputs);
  assertEquals(result.diagnostics, []);
  assertEquals(result.pending.schedule1.line3_schedule_c, 200.15);
  assertEquals(result.pending.f1040.line13_qbi_deduction, 40);
  const pending = normalizeAllPending(result.pending);
  const parent = form8995aInputSchema.parse(pending.form8995a);
  const companion = form8995aInputSchema.parse(pending.form8995a_schedule_c);
  assertEquals(parent.schedule_c_qbi_businesses?.map((row) => row.qbi), [
    300.25,
    -100.10,
  ]);
  assertEquals(parent.qbi, 200.15);
  assertEquals(form8995aPdf.projectFields!(parent, pending).line39, 40);
  const projected = form8995aScheduleCPdf.projectFields!(companion, pending);
  assertEquals([
    projected.row1_a,
    projected.row2_a,
    projected.line3,
    projected.line4,
  ], [300, -100, 100, 300]);
  const sourceRows = pending.schedule_c.schedule_cs as Record<
    string,
    unknown
  >[];
  const changedSource = {
    ...pending,
    schedule_c: {
      ...pending.schedule_c,
      schedule_cs: [
        { ...sourceRows[0], line_1_gross_receipts: 400.26 },
        sourceRows[1],
      ],
    },
  };
  assertThrows(() =>
    form8995a.build(parent, { filer: base.filer, pending: changedSource })
  );
  assertThrows(() =>
    form8995aScheduleCPdf.projectFields!(companion, changedSource)
  );
  const prepared = await f1040_2025.prepareReturn(result.pending, base.filer);
  assertStringIncludes(
    prepared.bundle.xml,
    "<QualifiedBusinessIncomeDedAmt>40</QualifiedBusinessIncomeDedAmt>",
  );
  assertStringIncludes(
    prepared.bundle.xml,
    "<TotalTradeOrBusinessLossAmt>100</TotalTradeOrBusinessLossAmt>",
  );
  const xsd = new URL(
    "../../../.state/research/docs/IMF_Series_2025v5.4/1040x_Schema_2025v5.4/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ).pathname;
  const validator = new Deno.Command("xmllint", {
    args: ["--noout", "--schema", xsd, "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = validator.stdin.getWriter();
  await writer.write(new TextEncoder().encode(prepared.bundle.xml));
  await writer.close();
  const validated = await validator.output();
  assertEquals(validated.code, 0, new TextDecoder().decode(validated.stderr));
  const pdf = await prepared.renderPdf();
  assert(pdf.length > 0);
  const pdfPath = await Deno.makeTempFile({ suffix: ".pdf" });
  try {
    await Deno.writeFile(pdfPath, pdf);
    const extracted = await new Deno.Command("pdftotext", {
      args: ["-layout", pdfPath, "-"],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(extracted.code, 0, new TextDecoder().decode(extracted.stderr));
    const text = new TextDecoder().decode(extracted.stdout);
    assert(text.includes("South Shop"));
    assert(/South Shop\s+-100\s*\([^\n]*\)\s+0/.test(text));
    assert(
      /carryforward\. Subtract line 5 from line 3[^\n]*6\s*\(\s*0\s*\)/.test(
        text,
      ),
    );
    assert(/40\s*\(\s*0\s*\)/.test(text));
  } finally {
    await Deno.remove(pdfPath);
  }
  if (Deno.args.includes("--write-review-artifacts")) {
    const directory = new URL(
      "../../../.state/research/ty2025-filled-pdf-review/2026-10-06-form8995a-cent-loss/",
      import.meta.url,
    ).pathname;
    await Deno.mkdir(directory, { recursive: true });
    await Deno.writeFile(`${directory}filled-return.pdf`, pdf);
    await Deno.writeTextFile(`${directory}return.xml`, prepared.bundle.xml);
  }
});

for (
  const [gainQbi, lossQbi, gainFiled, lossFiled, netFiled, deduction] of [
    [300.50, -100.50, 301, -101, 200, 40],
    [304.51, -100.49, 305, -100, 205, 41],
  ] as const
) {
  Deno.test(`Form 8995-A Schedule C rounds signed business cents ${gainQbi}/${lossQbi} before line totals`, () => {
    const base = pdfReviewFixtures.find((fixture) =>
      fixture.id === "single-form8995a-two-business-loss-netting"
    )!;
    const original = base.inputs.schedule_c as Record<string, unknown>[];
    const result = f1040_2025.executeReturn({
      ...base.inputs,
      schedule_c: [
        { ...original[0], line_1_gross_receipts: gainQbi + 100 },
        {
          ...original[1],
          part_v_other_expenses: [{
            description: "Shop operating costs",
            amount: -lossQbi,
          }],
        },
      ],
    });
    assertEquals(result.diagnostics, []);
    assertEquals(result.pending.f1040.line13_qbi_deduction, deduction);
    const pending = normalizeAllPending(result.pending);
    const parent = form8995aInputSchema.parse(pending.form8995a);
    const companion = form8995aInputSchema.parse(pending.form8995a_schedule_c);
    const projected = form8995aScheduleCPdf.projectFields!(companion, pending);
    assertEquals([
      projected.row1_a,
      projected.row2_a,
      projected.line3,
      projected.line4,
    ], [
      gainFiled,
      lossFiled,
      -lossFiled,
      gainFiled,
    ]);
    assertEquals(gainFiled + lossFiled, netFiled);
    assertEquals(
      form8995aPdf.projectFields!(parent, pending).line39,
      deduction,
    );
    assertStringIncludes(
      form8995aScheduleC.build(companion, { filer: base.filer, pending }),
      `<TotalTradeOrBusinessIncomeAmt>${gainFiled}</TotalTradeOrBusinessIncomeAmt>`,
    );
  });
}
