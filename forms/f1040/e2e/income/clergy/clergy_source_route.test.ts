import { setDefaultTimeout, test } from "bun:test";
import { existsSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { fileURLToPath as fromFileUrl } from "node:url";
import {
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import * as sys from "../../../../../scripts/support/sys.ts";
import { catalog } from "../../../../../catalog.ts";
import {
  businessRuleReport,
  emittedValidationScope,
} from "../../../../../cli/commands/export.ts";
import { normalizeAllPending } from "../../../2025/return-processing/pending.ts";
import { extractFilerIdentity } from "../../../mef/filer.ts";
import { form1040PdfFor } from "../../../2025/pdf/forms/general/return-assembly/f1040.ts";
import { scheduleSePdfFor } from "../../../2025/pdf/forms/taxes/self-employment/schedule_se.ts";
import { schedule2PdfFor } from "../../../2025/pdf/forms/taxes/other/schedule2.ts";
import { irs1040Pdf2026 } from "../../../2026/pdf/forms/general/return-assembly/f1040.ts";
import { scheduleSePdf2026 } from "../../../2026/pdf/forms/taxes/self-employment/schedule_se.ts";
import { schedule2Pdf2026 } from "../../../2026/pdf/forms/taxes/other/schedule2.ts";
import {
  churchW2,
  clergyGeneral,
  clergyItem,
  consultingScheduleC,
  form4361Approved,
  SPOUSE_SSN,
} from "../../../2025/domains/income/wages/clergy/clergy.fixture.ts";

// Each case runs a full return, MeF build, business rules and PDF projection.
setDefaultTimeout(60_000);

// Pub 517 (2025) and the 2025 Schedule SE instructions: a minister excludes a
// designated housing allowance only up to the smallest of the designation,
// the amount used and the fair rental value; the excess goes on Form 1040
// line 1h as "Excess allowance". Without an approved Form 4361, ministerial
// wages, the whole allowance and a parsonage's rental value, less expenses,
// are Schedule SE line 2 earnings; expenses subtracted there need an attached
// explanation (i1040sse, Ministers; Pub 517, "Allowable deductions").

function run(inputs: Record<string, unknown>, taxYear = 2025) {
  const def = catalog[`f1040:${taxYear}`];
  const result = def.executeReturn(inputs);
  const pending = normalizeAllPending(result.pending);
  const filer = extractFilerIdentity(pending.f1040 ?? {});
  return { def, result, pending, filer };
}

function xmlOf(run_: ReturnType<typeof run>) {
  const xml = run_.def.buildMefXml(run_.pending, run_.filer);
  // buildMefXml carries no transmission timestamp, so the receipt-date
  // header rules IND-002 and IND-689-01 cannot be evaluated here.
  const rejects = businessRuleReport(
    run_.pending,
    run_.filer,
    emittedValidationScope(xml),
  ).entries.filter((entry) => entry.severity !== "alert")
    .map((entry) => entry.ruleNumber)
    .filter((rule) => rule !== "IND-002" && rule !== "IND-689-01");
  return { xml, rejects };
}

function element(xml: string, tag: string): string | undefined {
  return new RegExp(`<${tag}\\b[^>]*>.*?</${tag}>`).exec(xml)?.[0];
}

function single(taxYear: number, extra: Record<string, unknown> = {}) {
  return {
    general: clergyGeneral(taxYear),
    w2: [churchW2()],
    clergy: [clergyItem(taxYear)],
    ...extra,
  };
}

/** Pages the Schedule SE PDF appends after the form for this return. */
async function sePdfSupplementalPages(run_: ReturnType<typeof run>) {
  const all = run_.pending as Record<string, Record<string, unknown>>;
  const sePdf = scheduleSePdfFor(2025);
  const [instance] = sePdf.instances!(
    sePdf.projectFields!(run_.pending.schedule_se, all),
    run_.filer,
    all,
  );
  const document = await PDFDocument.create();
  await sePdf.appendSupplementalPages!(document, instance, run_.filer!, all);
  return document.getPageCount();
}

test("E2E clergy: excess allowance reaches line 1h and ministerial earnings reach Schedule SE", async () => {
  const filing = run(single(2025));
  assertEquals(filing.result.diagnostics, []);
  const f = filing.pending.f1040;
  // Allowance 24,000 less the smallest limit, 20,000 actually used.
  assertEquals(f.line1h_other_earned, 4_000);
  assertEquals(f.line1z_total_wages, 54_000);
  // Line 2: 50,000 wages + 24,000 allowance = 74,000; x 92.35% = 68,339;
  // 12.4% = 8,474 and 2.9% = 1,982, so SE tax 10,456 and half 5,228.
  assertEquals(filing.pending.schedule2.line4_se_tax, 10_456);
  assertEquals(filing.pending.schedule1.line15_se_deduction, 5_228);
  assertEquals(f.line11_agi, 54_000 - 5_228);

  const { xml, rejects } = xmlOf(filing);
  assertEquals(rejects, []);
  const line1h = element(xml, "OtherEarnedIncomeAmt")!;
  assertStringIncludes(line1h, ">4000<");
  assertStringIncludes(line1h, 'referenceDocumentId="WagesNotShownSchedule');
  assertStringIncludes(
    xml,
    "<WagesNotShownSch><OtherWagesNotShownTxt>EXCESS ALLOWANCE</OtherWagesNotShownTxt><WagesNotShownAmt>4000</WagesNotShownAmt></WagesNotShownSch>",
  );
  const se = element(xml, "IRS1040ScheduleSE")!;
  assertStringIncludes(se, "<NetNonFarmProfitLossAmt>74000<");
  assertStringIncludes(se, "<SelfEmploymentTaxAmt>10456<");
  // No expenses are subtracted on line 2, so no explanation is attached.
  assertEquals(se.includes("referenceDocumentName"), false);
  assertEquals(xml.includes("AllowableSEExpenseExplnStmt"), false);
  assertEquals(se.includes("ExemptForm4361Ind"), false);
  // Line 27b: clergy with Schedule SE line 4c also included on line 1z.
  assertStringIncludes(xml, "<ClergyMemberInd>X</ClergyMemberInd>");

  const all = filing.pending as Record<string, Record<string, unknown>>;
  const form1040Pdf = form1040PdfFor(2025);
  const printed = form1040Pdf.projectFields!(f, all);
  assertEquals(printed.print_line1h_type, "EXCESS ALLOWANCE");
  assertEquals(printed.print_line27b_clergy, true);
  // 2025 Form 1040 AcroForm: line 27b "Clergy filing Schedule SE" is c2_12.
  assertEquals(
    form1040Pdf.fields.find((entry) =>
      entry.domainKey === "print_line27b_clergy"
    )?.pdfField,
    "topmostSubform[0].Page2[0].c2_12[0]",
  );
  const sePdf = scheduleSePdfFor(2025);
  const seRow = sePdf.projectFields!(filing.pending.schedule_se, all);
  assertEquals(seRow.net_profit_schedule_c, 74_000);
  assertEquals(seRow.line12, 10_456);
  assertEquals(seRow.line_a_form4361, undefined);
  assertEquals(await sePdfSupplementalPages(filing), 0);
});

test("E2E clergy: Form 4361 minister with no other SE income checks Schedule 2 line 4 box 1", () => {
  const filing = run(single(2025, {
    clergy: [clergyItem(2025, { form4361: form4361Approved })],
  }));
  assertEquals(filing.result.diagnostics, []);
  // The excess allowance is still income; ministerial earnings owe no SE tax.
  assertEquals(filing.pending.f1040.line1h_other_earned, 4_000);
  assertEquals(filing.pending.schedule_se, undefined);
  assertEquals(filing.pending.schedule2?.line4_se_tax, undefined);
  const { xml, rejects } = xmlOf(filing);
  assertEquals(rejects, []);
  assertEquals(xml.includes("<IRS1040ScheduleSE"), false);
  assertEquals(xml.includes("ClergyMemberInd"), false);
  assertStringIncludes(
    element(xml, "IRS1040Schedule2")!,
    "<ExemptForm4361Ind>X</ExemptForm4361Ind>",
  );
  const all = filing.pending as Record<string, Record<string, unknown>>;
  assertEquals(
    schedule2PdfFor(2025).projectFields!(all.schedule2 ?? {}, all)
      .line4_exempt_form4361,
    true,
  );
});

test("E2E clergy: Form 4361 minister with $400 or more of other SE earnings checks Schedule SE line A", () => {
  const filing = run(single(2025, {
    clergy: [clergyItem(2025, { form4361: form4361Approved })],
    schedule_c: [consultingScheduleC(20_000)],
  }));
  assertEquals(filing.result.diagnostics, []);
  // Only the Schedule C profit is SE earnings: 20,000 x 92.35% = 18,470.
  assertEquals(filing.pending.schedule2.line4_se_tax, 2_826);
  const { xml, rejects } = xmlOf(filing);
  assertEquals(rejects, []);
  const se = element(xml, "IRS1040ScheduleSE")!;
  assertStringIncludes(
    se,
    "<SSN>400011234</SSN><ExemptForm4361Ind>X</ExemptForm4361Ind><NetNonFarmProfitLossAmt>20000<",
  );
  assertEquals(
    element(xml, "IRS1040Schedule2")!.includes("ExemptForm4361Ind"),
    false,
  );
  const all = filing.pending as Record<string, Record<string, unknown>>;
  const seRow = scheduleSePdfFor(2025).projectFields!(
    filing.pending.schedule_se,
    all,
  );
  assertEquals(seRow.line_a_form4361, true);
});

test("E2E clergy: Form 4361 minister with under $400 of other SE earnings stays fail-closed", () => {
  const filing = run(single(2025, {
    clergy: [clergyItem(2025, { form4361: form4361Approved })],
    schedule_c: [consultingScheduleC(300)],
  }));
  assertEquals(filing.result.diagnostics, []);
  assertThrows(
    () => xmlOf(filing),
    Error,
    "under $400",
  );
});

test("E2E clergy: a ministerial loss offsets Schedule C on line 2; that mix stays unfiled", () => {
  const filing = run(single(2025, {
    clergy: [clergyItem(2025, {
      unreimbursed_ministerial_expenses: {
        amount: 90_000,
        not_reimbursed_confirmed: true,
        expense_records_reference: "Ministry expense log",
      },
    })],
    schedule_c: [consultingScheduleC(20_000)],
  }));
  assertEquals(filing.result.diagnostics, []);
  // 50,000 + 24,000 - 90,000 = -16,000 ministerial; + 20,000 Schedule C =
  // 4,000; x 92.35% = 3,694; 458 + 107 = 565 (i1040sse: a loss in one
  // business reduces the income from another).
  assertEquals(filing.pending.schedule2.line4_se_tax, 565);
  assertEquals(filing.pending.f1040.line1h_other_earned, 4_000);
  assertThrows(
    () => xmlOf(filing),
    Error,
    "combining ministerial earnings with business",
  );
});

test("E2E clergy: a ministerial loss alone files no Schedule SE", () => {
  const filing = run(single(2025, {
    clergy: [clergyItem(2025, {
      unreimbursed_ministerial_expenses: {
        amount: 90_000,
        not_reimbursed_confirmed: true,
        expense_records_reference: "Ministry expense log",
      },
    })],
  }));
  assertEquals(filing.result.diagnostics, []);
  assertEquals(filing.pending.schedule2?.line4_se_tax, undefined);
  const { xml, rejects } = xmlOf(filing);
  assertEquals(rejects, []);
  assertEquals(xml.includes("<IRS1040ScheduleSE"), false);
  assertEquals(xml.includes("ClergyMemberInd"), false);
});

test("E2E clergy: a parsonage in kind is SE earnings only, less expenses in full", async () => {
  const filing = run(single(2025, {
    clergy: [clergyItem(2025, {
      housing_allowance: undefined,
      parsonage: {
        fair_rental_value_plus_utilities: 18_000,
        fair_rental_value_reference: "Parsonage rental appraisal",
        not_more_than_reasonable_pay_confirmed: true,
      },
      unreimbursed_ministerial_expenses: {
        amount: 3_000,
        not_reimbursed_confirmed: true,
        expense_records_reference: "Ministry expense log",
      },
    })],
  }));
  assertEquals(filing.result.diagnostics, []);
  assertEquals(filing.pending.f1040.line1h_other_earned, undefined);
  // 50,000 + 18,000 - 3,000 = 65,000; x 92.35% = 60,028; tax 9,184.
  assertEquals(filing.pending.schedule2.line4_se_tax, 9_184);
  const { xml, rejects } = xmlOf(filing);
  assertEquals(rejects, []);
  assertEquals(xml.includes("OtherEarnedIncomeAmt"), false);
  // Expenses subtracted on line 2: the explanation is attached and the
  // Schedule SE root references it (IRS1040ScheduleSE.xsd, TY2025).
  const se = element(xml, "IRS1040ScheduleSE")!;
  assertStringIncludes(
    se,
    'referenceDocumentName="AllowableSEExpenseExplanationStatement"',
  );
  const explanation = element(xml, "AllowableSEExpenseExplnStmt")!;
  assertStringIncludes(explanation, "ministerial wages 50000");
  assertStringIncludes(
    explanation,
    "parsonage fair rental value plus utilities 18000",
  );
  assertStringIncludes(explanation, "unreimbursed ministerial expenses 3000");
  assertStringIncludes(explanation, "Total ministerial earnings on line 2: 65000");
  // The PDF attaches the same explanation on a page after Schedule SE.
  assertEquals(await sePdfSupplementalPages(filing), 1);
});

test("E2E clergy: a spouse minister on a joint return files the spouse's Schedule SE", () => {
  const filing = run({
    general: clergyGeneral(2025, true),
    w2: [churchW2(SPOUSE_SSN), {
      ...churchW2(),
      employer_ein: "111111111",
      employer_name: "Example School District",
      source_document_reference: "W-2 Example School District",
      box1_wages: 40_000,
      box3_ss_wages: 40_000,
      box4_ss_withheld: 2_480,
      box5_medicare_wages: 40_000,
      box6_medicare_withheld: 580,
    }],
    clergy: [clergyItem(2025, {
      minister: {
        ...clergyItem(2025).minister,
        owner: "spouse",
        name: "Sam Example",
        ssn: SPOUSE_SSN,
      },
    })],
  });
  assertEquals(filing.result.diagnostics, []);
  assertEquals(filing.pending.schedule2.line4_se_tax, 10_456);
  const { xml, rejects } = xmlOf(filing);
  assertEquals(rejects, []);
  const se = element(xml, "IRS1040ScheduleSE")!;
  assertStringIncludes(se, `<SSN>${SPOUSE_SSN}</SSN>`);
  assertStringIncludes(se, "<NetNonFarmProfitLossAmt>74000<");
  const all = filing.pending as Record<string, Record<string, unknown>>;
  const sePdf = scheduleSePdfFor(2025);
  const rows = sePdf.instances!(
    sePdf.projectFields!(filing.pending.schedule_se, all),
    filing.filer,
    all,
  );
  assertEquals(rows.map((row) => [row.owner_ssn, row.net_profit_schedule_c]), [
    [SPOUSE_SSN, 74_000],
  ]);
});

test("E2E clergy: a spouse's self-employment income keeps the return fail-closed", () => {
  const joint = (clergy: unknown) =>
    run({
      general: clergyGeneral(2025, true),
      w2: [churchW2()],
      clergy: [clergy],
      schedule_c: [consultingScheduleC(30_000, "S")],
    });
  // Ministerial earnings for the pastor, a Schedule C for the spouse: each
  // keeps their own Schedule SE in the calculation, but export refuses.
  const pastor = joint(clergyItem(2025));
  assertEquals(pastor.result.diagnostics, []);
  assertEquals(
    (pastor.pending.schedule_se.owner_instances as Array<
      { recipient: string; net_profit_schedule_c: number }
    >).map((row) => [row.recipient, row.net_profit_schedule_c]),
    [["T", 74_000], ["S", 30_000]],
  );
  assertThrows(() => xmlOf(pastor), Error, "including a spouse's");
  // A Form 4361 pastor beside the spouse's SE tax: the Schedule 2 line 4
  // presentation for that joint return is not confirmed, so export refuses.
  const exempt = joint(clergyItem(2025, { form4361: form4361Approved }));
  assertEquals(exempt.result.diagnostics, []);
  assertThrows(() => xmlOf(exempt), Error, "such as a spouse's");
});

test("E2E clergy: an unmatched W-2 stops the calculation and the export", () => {
  const filing = run(single(2025, {
    w2: [{ ...churchW2(), employer_ein: "987654321" }],
  }));
  assertEquals(
    filing.result.diagnostics.some((entry) =>
      entry.nodeType === "clergy" && entry.message.includes("matched W-2")
    ),
    true,
  );
  assertThrows(() => xmlOf(filing), Error, "Clergy income needs matched W-2");
});

test("E2E clergy: an allowance inside W-2 box 1 is refused, not excluded", () => {
  const item = clergyItem(2025, { ministerial_wages: 74_000 });
  item.housing_allowance!.included_in_w2_box1 = true;
  const filing = run(single(2025, {
    w2: [churchW2(undefined, 74_000)],
    clergy: [item],
  }));
  assertEquals(
    filing.result.diagnostics.some((entry) =>
      entry.nodeType === "clergy" && entry.message.includes("Form W-2c")
    ),
    true,
  );
  assertThrows(() => xmlOf(filing), Error, "Clergy income needs matched W-2");
});

test("E2E clergy TY2026: the same sourced return files line 1h, Schedule SE and its explanation", () => {
  const filing = run(single(2026, {
    clergy: [clergyItem(2026, {
      unreimbursed_ministerial_expenses: {
        amount: 2_000,
        not_reimbursed_confirmed: true,
        expense_records_reference: "Ministry expense log",
      },
    })],
  }), 2026);
  assertEquals(filing.result.diagnostics, []);
  assertEquals(filing.pending.f1040.line1h_other_earned, 4_000);
  // 72,000 x 92.35% = 66,492, below the 2026 wage base: 8,245 + 1,928.
  assertEquals(filing.pending.schedule2.line4_se_tax, 10_173);
  const { xml, rejects } = xmlOf(filing);
  assertEquals(rejects, []);
  assertStringIncludes(xml, "<OtherWagesNotShownTxt>EXCESS ALLOWANCE<");
  assertStringIncludes(xml, "<AllowableSEExpenseExplnStmt");
  assertStringIncludes(xml, "<ClergyMemberInd>X</ClergyMemberInd>");
  const all = filing.pending as Record<string, Record<string, unknown>>;
  const printed = irs1040Pdf2026.projectFields!(filing.pending.f1040, all);
  assertEquals(printed.print_line1h_type, "EXCESS ALLOWANCE");
  assertEquals(printed.print_line27b_clergy, true);
  assertEquals(
    scheduleSePdf2026.projectFields!(filing.pending.schedule_se, all)
      .net_profit_schedule_c,
    72_000,
  );

  const exempt = run(single(2026, {
    clergy: [clergyItem(2026, { form4361: form4361Approved })],
  }), 2026);
  assertEquals(exempt.result.diagnostics, []);
  assertStringIncludes(
    xmlOf(exempt).xml,
    "<ExemptForm4361Ind>X</ExemptForm4361Ind>",
  );
  // The 2026 draft Schedule 2 line 4 exemption widget is not mapped yet.
  const exemptPending = exempt.pending as Record<
    string,
    Record<string, unknown>
  >;
  assertThrows(
    () =>
      schedule2Pdf2026.projectFields!(
        exemptPending.schedule2 ?? {},
        exemptPending,
      ),
    Error,
    "Form 4361 exemption box is not mapped",
  );
});

const SCHEMA = fromFileUrl(
  new URL(
    "../../../../../irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd",
    import.meta.url,
  ),
);

test.skipIf(!existsSync(SCHEMA))(
  "E2E clergy returns validate against the TY2025 MeF XSD",
  async () => {
    for (
      const inputs of [
        single(2025),
        single(2025, {
          clergy: [clergyItem(2025, { form4361: form4361Approved })],
        }),
        single(2025, {
          clergy: [clergyItem(2025, { form4361: form4361Approved })],
          schedule_c: [consultingScheduleC(20_000)],
        }),
        // Expenses on line 2: the explanation statement and its reference.
        single(2025, {
          clergy: [clergyItem(2025, {
            unreimbursed_ministerial_expenses: {
              amount: 3_000,
              not_reimbursed_confirmed: true,
              expense_records_reference: "Ministry expense log",
            },
          })],
        }),
      ]
    ) {
      const { xml } = xmlOf(run(inputs));
      const dir = await sys.makeTempDir();
      const path = `${dir}/return.xml`;
      await sys.writeText(path, xml);
      const validated = await new sys.Command("xmllint", {
        args: ["--noout", "--schema", SCHEMA, path],
        stdout: "piped",
        stderr: "piped",
      }).output();
      await sys.remove(dir, { recursive: true });
      assertEquals(
        validated.code,
        0,
        new TextDecoder().decode(validated.stderr),
      );
    }
  },
);
