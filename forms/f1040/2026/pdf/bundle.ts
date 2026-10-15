import type { calculateSchedule3_2026 } from "../schedule3.ts";
import { buildSchedule3PdfBytes2026 } from "./schedule3.ts";
import { inputSchema as w2Schema } from "../inputs/w2.ts";
import type { calculateEic2026 } from "../nodes/eitc.ts";
import { buildScheduleEicPdfBytes2026 } from "./schedule_eic.ts";
import type { calculateChildCredit2026 } from "../nodes/f8812.ts";
import { buildSchedule8812PdfBytes2026 } from "./schedule8812.ts";
import type { calculateSocialSecuritySources2026 } from "../inputs/social-security-source.ts";
import { PDFDocument, PDFName, rgb, StandardFonts } from "pdf-lib";
import { execute } from "../../../../core/runtime/executor.ts";
import { buildExecutionPlan } from "../../../../core/runtime/planner.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { sourceRegistry2026 } from "../source-registry.ts";
import type { calculateInvestmentClaim2026 } from "../inputs/investment-claim.ts";
import type { calculateMovingSources2026 } from "../inputs/moving-source.ts";
import type { calculateForm4137_2026 } from "../inputs/form4137.ts";
import type { calculateForm8919_2026 } from "../inputs/form8919.ts";
import type { calculateScheduleA2026 } from "../schedule-a.ts";
import type { calculateSchedule1A2026 } from "../nodes/schedule1a.ts";
import type { calculateForm6251_2026 } from "../nodes/form6251.ts";
import type { calculateForm8959_2026 } from "../nodes/form8959.ts";
import type { calculateForm8960_2026 } from "../nodes/form8960.ts";
import { inputSchema as schedule2Schema } from "../nodes/schedule2.ts";
import { buildF1040PdfBytes2026 } from "./f1040.ts";
import {
  buildSchedule1PdfBytes2026,
  type Schedule1Input2026,
} from "./schedule1.ts";
import { buildSchedule1APdfBytes2026 } from "./schedule1a.ts";
import { buildSchedule2PdfBytes2026 } from "./schedule2.ts";
import { buildSchedule3APdfBytes2026 } from "./schedule3a.ts";
import {
  buildScheduleAPdfBytes2026,
  type DeductionSelectionInput2026,
} from "./schedule_a.ts";
import { buildScheduleBPdfBytes2026 } from "./schedule_b.ts";
import { buildForm4137PdfBytes2026 } from "./form4137.ts";
import { buildForm6251PdfBytes2026 } from "./form6251.ts";
import { buildForm8919PdfBytes2026 } from "./form8919.ts";
import { buildForm8959PdfBytes2026 } from "./form8959.ts";
import { buildForm8960PdfBytes2026 } from "./form8960.ts";
import { buildForm3903PdfBytes2026 } from "./form3903.ts";

export interface DraftAttachment2026 {
  form: string;
  /** One-based final bundle pages, split because statements follow all forms. */
  formPages: number[];
  statementPages: number[];
}

/** Internal development artifact, NOT a filing product or a complete tax return.
 * Accept only the currently registered source claims, execute once, then reconcile
 * every selected component against that execution. No caller-supplied line totals.
 */
export async function buildDraftReturnPdf2026(raw: Record<string, unknown>) {
  // The executor can skip an entirely absent input; a return cannot lack a filer.
  if (!raw.general) {
    throw new Error("TY2026 draft bundle needs general filer input");
  }
  const input = sourceRegistry2026.start.inputSchema.parse(raw);
  const calculation = execute(
    buildExecutionPlan(sourceRegistry2026),
    sourceRegistry2026,
    input,
    { taxYear: 2026, formType: "f1040" },
  );
  if (calculation.diagnostics.length) {
    throw new Error(
      `TY2026 draft bundle calculation failed: ${
        calculation.diagnostics.map((d) => `${d.nodeType}: ${d.message}`).join(
          "; ",
        )
      }`,
    );
  }
  const p = calculation.pending;
  const f = p.f1040;
  if (!f || !Number.isSafeInteger(f.line37_amount_owed)) {
    throw new Error("TY2026 draft bundle needs completed Form 1040 settlement");
  }
  const amount = (fields: Record<string, unknown> | undefined, key: string) => {
    const value = fields?.[key] ?? 0;
    if (typeof value !== "number" || !Number.isSafeInteger(value)) {
      throw new Error(`TY2026 draft bundle needs calculated ${key}`);
    }
    return value;
  };
  const line = (key: string) => amount(f, key);
  const person = (owner: "taxpayer" | "spouse") => {
    const first = f[`${owner}_first_name`];
    const last = f[`${owner}_last_name`];
    const ssn = f[`${owner}_ssn`];
    if (
      typeof first !== "string" || !first.trim() || typeof last !== "string" ||
      !last.trim() || typeof ssn !== "string" ||
      !/^\d{3}-?\d{2}-?\d{4}$/.test(ssn)
    ) {
      throw new Error(`TY2026 draft bundle needs complete ${owner} identity`);
    }
    return {
      name: [first, f[`${owner}_middle_initial`], last].filter(Boolean).join(
        " ",
      ),
      ssn,
    };
  };
  const taxpayer = person("taxpayer");
  const spouse = f.filing_status === FilingStatus.MFJ
    ? person("spouse")
    : undefined;
  const owners = { taxpayer, spouse };
  const filer = {
    name: spouse ? `${taxpayer.name} & ${spouse.name}` : taxpayer.name,
    ssn: taxpayer.ssn,
  };
  // These retained values are produced only by this execution's validated nodes.
  const retained = <T>(node: string) =>
    p[node]?.calculation_2026 as T | undefined;
  const a = retained<ReturnType<typeof calculateScheduleA2026>>("schedule_a");
  const b = retained<ReturnType<typeof calculateInvestmentClaim2026>>(
    "investment_income",
  );
  const s1a = retained<ReturnType<typeof calculateSchedule1A2026>>(
    "schedule1a",
  );
  const tips = retained<ReturnType<typeof calculateForm4137_2026>>("form4137");
  const wages = retained<ReturnType<typeof calculateForm8919_2026>>("form8919");
  const amt = retained<ReturnType<typeof calculateForm6251_2026>>("form6251");
  const medicare = retained<ReturnType<typeof calculateForm8959_2026>>(
    "form8959",
  );
  const niit = retained<ReturnType<typeof calculateForm8960_2026>>("form8960");
  const moving = retained<ReturnType<typeof calculateMovingSources2026>>(
    "f3903",
  );
  const benefits = retained<
    ReturnType<typeof calculateSocialSecuritySources2026>
  >("ssa1099");
  if (
    Math.round(
      (wages?.withholding ?? 0) + (b?.cents.federal_withholding ?? 0) +
        (benefits?.federal_withholding ?? 0),
    ) !== line("line25b_withheld_1099")
  ) {
    throw new Error(
      "TY2026 information-return withholding components disagree with Form 1040",
    );
  }
  const eic = retained<ReturnType<typeof calculateEic2026>>("eitc");
  const childCredit = retained<ReturnType<typeof calculateChildCredit2026>>(
    "f8812",
  );
  const s3 = retained<ReturnType<typeof calculateSchedule3_2026>>("schedule3");
  const s2 = p.schedule2;
  const s2line = (key: string) => amount(s2, key);
  const parts: {
    form: string;
    officialPages?: number;
    render: () => Promise<Uint8Array>;
  }[] = [];
  const add = (
    form: string,
    officialPages: number | undefined,
    render: () => Promise<Uint8Array>,
  ) => parts.push({ form, officialPages, render });
  // Attachment sequence numbers from the pinned 2026 forms: 01, 1A, 02, 03, 3A,
  // 07, 08, 24, 32, 43, 47, 61, 71, 72, 170. Additional statements go at the end.
  add("f1040", 2, () => buildF1040PdfBytes2026(f));
  if (p.schedule1?.file_schedule1) {
    add("schedule1", 2, () =>
      buildSchedule1PdfBytes2026(
        p.schedule1.calculation_input_2026 as Schedule1Input2026,
        {
          form1040_line8: line("line8_additional_income"),
          form1040_line10: line("line10_adjustments"),
        },
        filer,
      ));
  }
  if (s1a?.has_eligible_activity) {
    add("schedule1a", 3, () =>
      buildSchedule1APdfBytes2026(
        s1a.source_input,
        { line13a_schedule1a: line("line13a_schedule1a") },
        filer,
      ));
  }
  if (s2?.file_schedule2) {
    add("schedule2", 2, () =>
      buildSchedule2PdfBytes2026(
        schedule2Schema.parse(
          Object.fromEntries(
            Object.keys(schedule2Schema.shape).map((k) => [k, s2[k]]),
          ),
        ),
        {
          form1040_line17: line("line17_additional_taxes"),
          form1040_line23: line("line23_other_taxes"),
          schedule3a_line4: line("schedule2_line20"),
        },
        filer,
      ));
  }
  if (s3?.file_schedule3) {
    add("schedule3", 1, () =>
      buildSchedule3PdfBytes2026(
        s3.source_input,
        {
          form1040_line20: line("line20_nonrefundable_credits"),
          form1040_line31: line("line31_other_payments"),
        },
        filer,
        w2Schema.parse({
          filing_status: f.filing_status,
          taxpayer_ssn: f.taxpayer_ssn,
          spouse_ssn: f.spouse_ssn,
          w2s: p.w2?.issued_w2_sources ?? [],
        }),
      ));
  }
  if (p.schedule3a) {
    add(
      "schedule3a",
      1,
      () => buildSchedule3APdfBytes2026(p.schedule3a, filer),
    );
  }
  if (f.deduction_method === "itemized") {
    if (!a) {
      throw new Error("Selected Schedule A needs retained expense sources");
    }
    add("schedule_a", 2, () =>
      buildScheduleAPdfBytes2026(
        a.source_input,
        p.standard_deduction
          .calculation_input_2026 as DeductionSelectionInput2026,
        {
          form1040_line11b: line("line11b_agi"),
          form1040_line12e: line("line12e_standard_or_itemized"),
          form1040_line12f: line("line12f_nonitemizer_charity"),
          form1040_line13a: line("line13a_schedule1a"),
          form1040_line13b: line("line13b_qbi"),
        },
        filer,
      ));
  }
  if (b?.schedule_b.required) {
    add("schedule_b", 1, () =>
      buildScheduleBPdfBytes2026(
        b.source_input,
        {
          form1040_line2b: line("line2b_taxable_interest"),
          form1040_line3b: line("line3b_ordinary_dividends"),
        },
        filer,
      ));
  }
  // Employer overflow uses repeated official form pages, not statement pages.
  if (tips?.forms.length) {
    add("form4137", undefined, () =>
      buildForm4137PdfBytes2026(
        tips.source_input,
        {
          form1040_line1c: line("line1c_unreported_tips"),
          schedule2_line16a: s2line("line16a_form4137_tip_tax"),
        },
        owners,
      ));
  }
  if (amt?.file_form6251) {
    add("form6251", 2, () =>
      buildForm6251PdfBytes2026(
        amt.source_input,
        {
          form1040_line11b: line("line11b_agi"),
          form1040_line2a: line("line2a_tax_exempt"),
          form1040_line3a: line("line3a_qualified_dividends"),
          form1040_line7a: line("line7a_capital_gain"),
          form1040_line12e: line("line12e_standard_or_itemized"),
          form1040_line14: line("line14_total_deductions"),
          form1040_line15: line("line15_taxable_income"),
          form1040_line16: line("line16_income_tax"),
          schedule1a_line43: s1a?.lines.line43 ?? 0,
          ...(a ? { schedule_a_line7: a.lines.line7 } : {}),
          schedule2_line2: s2line("line2_amt"),
        },
        filer,
      ));
  }
  if (eic?.file_schedule_eic) {
    add(
      "schedule_eic",
      1,
      () =>
        buildScheduleEicPdfBytes2026(eic.source_input, {
          form1040_line27a: line("line27a_eic"),
          form1040_line11b: line("line11b_agi"),
          form1040_line1i: line("line1i_combat_pay"),
        }, filer),
    );
  }
  if (childCredit?.file_schedule8812) {
    add("schedule8812", 2, () =>
      buildSchedule8812PdfBytes2026(
        childCredit.source_input,
        {
          form1040_line11b: line("line11b_agi"),
          form1040_line18: line("line18_total_tax_before_credits"),
          form1040_line19: line("line19_child_tax_credit"),
          form1040_line28: line("line28_actc"),
          qualifying_children: line("qualifying_child_tax_credit_count"),
          other_dependents: line("other_dependent_count"),
          declines_actc: f.line28_declines_actc === true,
        },
        filer,
      ));
  }
  if (wages?.forms.length) {
    add("form8919", undefined, () =>
      buildForm8919PdfBytes2026(
        wages.source_input,
        {
          form1040_line1g: line("line1g_wages_8919"),
          schedule2_line16b: s2line("line16b_form8919_wage_tax"),
          form8919_withholding_component: wages.withholding,
        },
        owners,
      ));
  }
  if (medicare?.file_form8959) {
    add("form8959", 1, () =>
      buildForm8959PdfBytes2026(
        medicare.source_input,
        {
          schedule2_line17b: s2line("line17b_medicare_wage_tax"),
          schedule2_line11: s2line("line11_medicare_self_employment_tax"),
          form8959_withholding_component: line("line25c_other_withheld"),
        },
        filer,
      ));
  }
  if (niit?.file_form8960) {
    add("form8960", 1, () =>
      buildForm8960PdfBytes2026(
        niit.source_input,
        {
          form1040_line2b: line("line2b_taxable_interest"),
          form1040_line3b: line("line3b_ordinary_dividends"),
          form1040_line7a: line("line7a_capital_gain"),
          form1040_line11b: line("line11b_agi"),
          form1040_line12e: line("line12e_standard_or_itemized"),
          schedule1_line18: amount(p.schedule1, "line18_early_withdrawal"),
          ...(a
            ? {
              schedule_a_line5d: a.lines.line5d,
              schedule_a_line7: a.lines.line7,
            }
            : {}),
          schedule2_line6: s2line("line6_niit"),
        },
        filer,
      ));
  }
  if (moving?.moves.some((m) => m.file_form3903)) {
    add("form3903", undefined, () =>
      buildForm3903PdfBytes2026(
        moving.source_input,
        {
          schedule1_line14: amount(p.schedule1, "line14_moving_expenses"),
          schedule1_storage_fees: moving.schedule1StorageFees,
          f1040_line1h_moving_component: line("line1h_other_earned"),
        },
        filer,
      ));
  }

  const document = await PDFDocument.create();
  const rendered = [];
  const attachments: DraftAttachment2026[] = [];
  for (const part of parts) {
    const source = await PDFDocument.load(await part.render());
    const officialPages = part.officialPages ?? source.getPageCount();
    if (source.getPageCount() < officialPages) {
      throw new Error(`${part.form} page contract changed`);
    }
    const manifest: DraftAttachment2026 = {
      form: part.form,
      formPages: [],
      statementPages: [],
    };
    attachments.push(manifest);
    rendered.push({ source, officialPages, manifest });
  }
  for (const statements of [false, true]) {
    for (const { source, officialPages, manifest } of rendered) {
      const indices = source.getPageIndices().filter((i) =>
        (i >= officialPages) === statements
      );
      for (const page of await document.copyPages(source, indices)) {
        page.node.delete(PDFName.of("Annots"));
        document.addPage(page);
        (statements ? manifest.statementPages : manifest.formPages).push(
          document.getPageCount(),
        );
      }
    }
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (const page of document.getPages()) {
    page.drawText("INCOMPLETE 2026 IMPLEMENTATION", {
      x: 350,
      y: 12,
      size: 8,
      font,
      color: rgb(.4, .1, .1),
    });
  }
  for (const page of document.getPages()) {
    page.node.delete(PDFName.of("Annots"));
  }
  document.catalog.delete(PDFName.of("AcroForm"));
  document.setTitle("2026 development draft - not for filing");
  return {
    bytes: await document.save({ updateFieldAppearances: false }),
    attachments,
    calculation,
    filingReady: false as const,
    // Pending deposits are not evidence that a credit/activity was finalized.
    unfinishedReceivers: Object.keys(p).filter((k) =>
      !(k in sourceRegistry2026)
    ).sort(),
  };
}
