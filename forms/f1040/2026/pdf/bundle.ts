import { buildForm5329PdfBytes2026 } from "./form5329.ts";
import {
  calculateRetirementSources2026,
  retirementIssuedAttachments2026,
} from "../inputs/retirement-source.ts";
import {
  buildForm8962PdfBytes2026,
  type MarketplaceResult2026,
  requiresForm8962_2026,
} from "./form8962.ts";
import {
  type calculateGambling2026,
  gamblingIssuedAttachments2026,
} from "../inputs/gambling-source.ts";
import type { calculateEstimatedPayments2026 } from "../inputs/estimated-payments.ts";
import { buildForm8888PdfBytes2026 } from "./refund-allocation.ts";
import type { calculateRefundAllocation2026 } from "../inputs/refund-allocation.ts";
import type { calculateForm461_2026 } from "../nodes/form461.ts";
import { executeDraftSources2026 } from "../execute.ts";
import type { SourceDocumentBytes } from "../../../../core/runtime/source-documents.ts";
import type { calculateForm1062Tax2026 } from "../inputs/form1062-tax.ts";
import { buildForm1062Draft2026 } from "./form1062.ts";
import type { calculateLandReturn2026 } from "../nodes/land-dispositions.ts";
import { buildForm4797PdfBytes2026 } from "./form4797.ts";
import { buildCombinedQbiPdfBytes2026 } from "./form8995.ts";
import { buildForm461PdfBytes2026 } from "./form461.ts";
import { buildForm5695PdfBytes2026 } from "./form5695.ts";
import { buildScheduleHPdfBytes2026 } from "./schedule_h.ts";
import type { calculateHousehold2026 } from "../inputs/household-source.ts";
import type { calculateGovernmentPayments2026 } from "../inputs/government-source.ts";
import type { calculateIncomeTax2026 } from "../nodes/income-tax.ts";
import { buildForm8615PdfBytes2026 } from "./form8615.ts";
import type { calculateBusiness2026 } from "../nodes/business.ts";
import { buildBusinessPdfBytes2026 } from "./business.ts";
import type { calculateCapitalGains2026 } from "../nodes/capital-gains.ts";
import { buildCapitalPdfBytes2026 } from "./capital-gains.ts";
import type { calculateEducationCredit2026 } from "../nodes/f8863.ts";
import { buildForm8863PdfBytes2026 } from "./form8863.ts";
import type { calculateCareCredit2026 } from "../nodes/f2441.ts";
import { buildForm2441PdfBytes2026 } from "./form2441.ts";
import type { calculateSchedule3_2026 } from "../schedule3.ts";
import { buildSchedule3PdfBytes2026 } from "./schedule3.ts";
import { inputSchema as w2Schema } from "../inputs/w2.ts";
import type { calculateEic2026 } from "../nodes/eitc.ts";
import { buildScheduleEicPdfBytes2026 } from "./schedule_eic.ts";
import type { calculateChildCredit2026 } from "../nodes/f8812.ts";
import { buildSchedule8812PdfBytes2026 } from "./schedule8812.ts";
import type { calculateSocialSecuritySources2026 } from "../inputs/social-security-source.ts";
import { PDFDocument, PDFName, rgb, StandardFonts } from "pdf-lib";
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
export async function buildDraftReturnPdf2026(
  raw: Record<string, unknown>,
  documents: readonly SourceDocumentBytes[] = [],
) {
  // The executor can skip an entirely absent input; a return cannot lack a filer.
  if (!raw.general) {
    throw new Error("TY2026 draft bundle needs general filer input");
  }
  const input = sourceRegistry2026.start.inputSchema.parse(raw);
  const calculation = await executeDraftSources2026(input, documents);
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
  const gambling = retained<ReturnType<typeof calculateGambling2026>>(
    "gambling",
  );
  const gamblingAttachments = gambling
    ? gamblingIssuedAttachments2026(gambling.source_input)
    : [];
  for (const attachment of gamblingAttachments) {
    const issued = await PDFDocument.load(attachment.bytes);
    attachment.pages = issued.getPageCount();
    if (issued.isEncrypted || issued.getPageCount() === 0) {
      throw new Error("Issued W-2G needs an unencrypted readable PDF");
    }
  }
  const estimates = retained<ReturnType<typeof calculateEstimatedPayments2026>>(
    "estimated_payments",
  );
  const refund = retained<ReturnType<typeof calculateRefundAllocation2026>>(
    "refund_allocation",
  );
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
  const business = retained<ReturnType<typeof calculateBusiness2026>>(
    "schedule_c",
  );
  const land = retained<ReturnType<typeof calculateLandReturn2026>>(
    "land_dispositions",
  )?.calculation;
  const capital = retained<ReturnType<typeof calculateCapitalGains2026>>(
    "capital_gains",
  ) ?? land?.land.loss.calculation.capital;
  const retirement = retained<
    ReturnType<typeof calculateRetirementSources2026>
  >("f1099r");
  if (retirement) {
    const replay = calculateRetirementSources2026(retirement.source_input);
    for (
      const key of [
        "line4a_ira_gross",
        "line4b_ira_taxable",
        "line5a_pension_gross",
        "line5b_pension_taxable",
        "line5c_rollover",
      ] as const
    ) {
      if (f[key] !== (replay.filed_lines as Record<string, unknown>)[key]) {
        throw new Error(
          "Retirement draft lines disagree with reviewed sources",
        );
      }
    }
  }
  const retirementAttachments = retirement
    ? retirementIssuedAttachments2026(retirement)
    : [];
  for (const attachment of retirementAttachments) {
    const issued = await PDFDocument.load(attachment.bytes);
    if (issued.isEncrypted || issued.getPageCount() === 0) {
      throw new Error("Issued Form 1099-R needs an unencrypted readable PDF");
    }
    attachment.pages = issued.getPageCount();
  }
  const benefits = retained<
    ReturnType<typeof calculateSocialSecuritySources2026>
  >("ssa1099");
  const household = retained<ReturnType<typeof calculateHousehold2026>>(
    "household_employment",
  );
  const government = retained<
    ReturnType<typeof calculateGovernmentPayments2026>
  >("government_payments");
  if (
    Math.round(
      (government?.cents.federal_withheld ?? 0) + (wages?.withholding ?? 0) +
        (b?.cents.federal_withholding ?? 0) +
        (benefits?.federal_withholding ?? 0) + (capital?.withholding ?? 0) +
        (retirement?.cents.line25b_withheld_1099 ?? 0),
    ) !== line("line25b_withheld_1099")
  ) {
    throw new Error(
      "TY2026 information-return withholding components disagree with Form 1040",
    );
  }
  const incomeTax = retained<ReturnType<typeof calculateIncomeTax2026>>(
    "income_tax_calculation",
  );
  const care = retained<ReturnType<typeof calculateCareCredit2026>>("f2441");
  const eic = retained<ReturnType<typeof calculateEic2026>>("eitc");
  const childCredit = retained<ReturnType<typeof calculateChildCredit2026>>(
    "f8812",
  );
  const education = retained<ReturnType<typeof calculateEducationCredit2026>>(
    "f8863",
  );
  const s3 = retained<ReturnType<typeof calculateSchedule3_2026>>(
    "schedule3_final",
  );
  const election = retained<ReturnType<typeof calculateForm1062Tax2026>>(
    "form1062",
  );
  let electionForms:
    | Awaited<ReturnType<typeof buildForm1062Draft2026>>
    | undefined;
  if (election) {
    // Independent reconciliation against the finalized return catches any drift
    // between graph handoffs and the actual printed income/tax/credit lines.
    for (
      const [key, value] of Object.entries(election.source_input.return_lines)
    ) {
      if (line(key) !== value) {
        throw new Error(`Form 1062 source disagrees with final ${key}`);
      }
    }
    const verified = calculation.verifiedSourceDocuments;
    if (!verified) {
      throw new Error("Form 1062 bundle needs execution-bound covenant copies");
    }
    electionForms = await buildForm1062Draft2026(
      election.source_input,
      verified.manifest.map((c) => ({
        reference: c.reference,
        bytes: verified.getBytes(c.reference)!,
      })),
      {
        schedule3_line13e: s3?.input.line13e_section1062_tax ?? 0,
        form1040_line24b: line("line24b_form1062"),
      },
      filer,
    );
  }
  const s2 = p.schedule2;
  const s2line = (key: string) => amount(s2, key);
  if (
    s2line("line5_form5329_early_tax") !== (retirement?.line5_early_tax ?? 0)
  ) {
    throw new Error("Schedule 2 early tax disagrees with retirement sources");
  }
  const parts: {
    form: string;
    officialPages?: number;
    render: () => Promise<Uint8Array>;
    hasIncompleteFooter: boolean;
  }[] = [];
  const add = (
    form: string,
    officialPages: number | undefined,
    render: () => Promise<Uint8Array>,
    hasIncompleteFooter = false,
  ) => parts.push({ form, officialPages, render, hasIncompleteFooter });
  // Attachment sequence numbers from the pinned 2026 forms: 01, 1A, 02, 03, 3A,
  // 07, 08, 09, 12, 12A, 17, 21, 24, 27, 29, 32, 33, 43, 44, 47, 50, 55, 56, 61, 64, 71, 72, 75, 106, 106A, 170. Additional statements go at the end.
  add(
    "f1040",
    2,
    () =>
      buildF1040PdfBytes2026(
        f,
        refund?.source_input.claim,
        estimates?.source_input,
      ),
  );
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
        { form5329_not_required: retirement?.form5329_not_required ?? false },
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
  const addBusiness = (
    kind: "schedule_c" | "schedule_se" | "form8995",
    pages: number,
  ) => {
    if (!business?.calculation) return;
    add(kind, pages, () =>
      buildBusinessPdfBytes2026(
        business.source_input,
        p.standard_deduction
          .calculation_input_2026 as DeductionSelectionInput2026,
        {
          schedule1_line3: amount(p.schedule1, "line3_schedule_c"),
          schedule1_line15: amount(p.schedule1, "line15_se_deduction"),
          schedule2_line4: s2line("line4_self_employment_tax"),
          form1040_line11b: line("line11b_agi"),
          form1040_line12e: line("line12e_standard_or_itemized"),
          form1040_line12f: line("line12f_nonitemizer_charity"),
          form1040_line13a: line("line13a_schedule1a"),
          form1040_line13b: line("line13b_qbi"),
          form1040_line15: line("line15_taxable_income"),
        },
        owners,
        kind,
      ));
  };
  if (business?.calculation) {
    addBusiness(
      "schedule_c",
      business.calculation.business.businesses.length * 2,
    );
  }
  if (capital?.file_schedule_d) {
    const destinations = {
      form1040_line7a: line("line7a_capital_gain"),
      form1040_line7b: f.line7b_schedule_d_not_required === true,
      form1040_line3a: line("line3a_qualified_dividends"),
      preferential_gain: amount(p.income_tax_calculation, "net_capital_gain"),
      ...(capital.land
        ? {
          form4797_line10: capital.land.calculation.line10_long_term_gain,
          schedule1_line4: amount(p.schedule1, "line4_other_gains"),
        }
        : {}),
    };
    add(
      "schedule_d",
      2,
      () =>
        buildCapitalPdfBytes2026(
          capital.source_input,
          destinations,
          filer,
          "schedule_d",
        ),
    );
    if (capital.file_form8949) {
      add("form8949", undefined, () =>
        buildCapitalPdfBytes2026(
          capital.source_input,
          destinations,
          filer,
          "form8949",
        ));
    }
  }
  const seForms =
    business?.calculation?.business.owners.filter((o) => o.schedule_se)
      .length ?? 0;
  if (seForms) addBusiness("schedule_se", seForms);
  if (care?.file_form2441) {
    add("form2441", care.part3 ? 2 : 1, () =>
      buildForm2441PdfBytes2026(
        care.source_input,
        {
          form1040_line1e: line("line1e_taxable_dep_care"),
          form1040_line11b: line("line11b_agi"),
          form1040_line18: line("line18_total_tax_before_credits"),
          schedule3_line2: s3?.input.line2_childcare_credit ?? 0,
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
  if (capital?.land) {
    add("form4797", 1, () =>
      buildForm4797PdfBytes2026(
        capital.land!.source_input.source,
        {
          schedule_d_line11: capital.line11_form4797,
          schedule1_line4: amount(p.schedule1, "line4_other_gains"),
          section1231_loss_taken_into_account:
            capital.land!.calculation.history.current.loss_taken_into_account,
        },
        filer,
        capital.land!.source_input.finalized_loss,
      ));
  }
  for (const part of retirement?.early_owners ?? []) {
    if (!part.file_form5329) continue;
    const individual = owners[part.owner];
    if (!individual) throw new Error("Form 5329 owner identity is missing");
    add(`form5329:${part.owner}`, 3, () =>
      buildForm5329PdfBytes2026(
        retirement!.source_input,
        part.owner,
        s2line("line5_form5329_early_tax"),
        individual,
      ), true);
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
          schedule2_line1z: s2line("line1z_additions"),
        },
        filer,
      ));
  }
  if (incomeTax?.form8615) {
    add("form8615", 1, () =>
      buildForm8615PdfBytes2026(incomeTax.source_input, {
        form1040_line11b: line("line11b_agi"),
        form1040_line12e: line("line12e_standard_or_itemized"),
        form1040_line15: line("line15_taxable_income"),
        form1040_line16: line("line16_income_tax"),
      }, filer));
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
  if (household?.file_schedule_h) {
    const employer = household.source_input.claim.employer_tin ===
        household.source_input.taxpayer_ssn
      ? owners.taxpayer
      : owners.spouse;
    if (!employer) throw new Error("Schedule H employer identity is missing");
    add(
      "schedule_h",
      2,
      () =>
        buildScheduleHPdfBytes2026(household.source_input, {
          schedule2_line17a: s2line("line17a_household_employment_tax"),
        }, employer),
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
  if (education?.file_form8863) {
    add(
      "form8863",
      undefined,
      () =>
        buildForm8863PdfBytes2026(education.source_input, {
          form1040_line11b: line("line11b_agi"),
          form1040_line18: line("line18_total_tax_before_credits"),
          form1040_line29: line("line29_refundable_aotc"),
          schedule3_line2: amount(p.schedule3, "line2_childcare_credit"),
          schedule3_line3: amount(p.schedule3, "line3_education_credit"),
        }, filer),
    );
  }
  if (land) {
    add("form8995", 1, () =>
      buildCombinedQbiPdfBytes2026(
        p.standard_deduction
          .calculation_input_2026 as DeductionSelectionInput2026,
        {
          form1040_line11b: line("line11b_agi"),
          form1040_line12e: line("line12e_standard_or_itemized"),
          form1040_line12f: line("line12f_nonitemizer_charity"),
          form1040_line13a: line("line13a_schedule1a"),
          form1040_line13b: line("line13b_qbi"),
          form1040_line15: line("line15_taxable_income"),
        },
        owners,
      ));
  } else if (business?.calculation) addBusiness("form8995", 1);
  if (refund?.file_form8888) {
    add(
      "form8888",
      1,
      () => buildForm8888PdfBytes2026(refund.source_input.claim!, f),
    );
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
  const loss = retained<ReturnType<typeof calculateForm461_2026>>("form461")
    ?.calculation;
  if (loss?.file_form461) {
    add("form461", 1, () =>
      buildForm461PdfBytes2026(loss.source_input, {
        schedule1_line3: amount(p.schedule1, "line3_schedule_c"),
        form1040_line7a: line("line7a_capital_gain"),
        schedule1_line4: amount(p.schedule1, "line4_other_gains"),
        schedule1_line15: amount(p.schedule1, "line15_se_deduction"),
        schedule1_line8p: amount(p.schedule1, "line8p_excess_business_loss"),
        excess_loss_origin_2026: loss.carryforward?.amount ?? 0,
      }, filer));
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
          ...(capital?.land
            ? { schedule1_line4: amount(p.schedule1, "line4_other_gains") }
            : {}),
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
  const marketplace = retained<MarketplaceResult2026>("form8962");
  if (marketplace && requiresForm8962_2026(marketplace)) {
    const dependents = f.dependent_details as {
      ssn?: string;
      itin?: string;
      atin?: string;
    }[] | undefined;
    add(
      "form8962",
      2,
      () =>
        buildForm8962PdfBytes2026(marketplace.source_input, {
          form1040_line11b: line("line11b_agi"),
          form1040_line2a: line("line2a_tax_exempt"),
          form1040_nontaxable_social_security: line("line6a_ss_gross") -
            line("line6b_ss_taxable"),
          schedule3_line9: s3?.input.line9_premium_tax_credit ?? 0,
          schedule2_line1a: s2line("line1a_excess_advance_premium"),
          schedule2_line1z: s2line("line1z_additions"),
          filing_status: String(f.filing_status),
          tax_family_tins: [
            taxpayer.ssn,
            ...(spouse ? [spouse.ssn] : []),
            ...(dependents ?? []).map((d) => d.ssn ?? d.itin ?? d.atin ?? ""),
          ],
        }, filer),
    );
  }
  if (childCredit?.energy_credit?.file_form5695) {
    add(
      "form5695",
      1,
      () =>
        buildForm5695PdfBytes2026(childCredit.source_input, {
          form1040_line18: line("line18_total_tax_before_credits"),
          form1040_line19: line("line19_child_tax_credit"),
          schedule3_line5a: s3?.input.line5a_residential_clean_energy ?? 0,
        }, filer),
    );
  }
  if (electionForms) {
    const forms = electionForms;
    add("form1062", 1, () => Promise.resolve(forms.bytes), true);
    for (const schedule of forms.schedules) {
      add(
        `form1062_schedule_a:${schedule.sale_reference}`,
        schedule.official_pages,
        () => Promise.resolve(schedule.bytes),
        true,
      );
    }
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
    rendered.push({
      source,
      officialPages,
      manifest,
      hasIncompleteFooter: part.hasIncompleteFooter,
    });
  }
  const pagesWithIncompleteFooter = new Set<number>();
  for (const statements of [false, true]) {
    for (
      const { source, officialPages, manifest, hasIncompleteFooter } of rendered
    ) {
      const indices = source.getPageIndices().filter((i) =>
        (i >= officialPages) === statements
      );
      for (const page of await document.copyPages(source, indices)) {
        page.node.delete(PDFName.of("Annots"));
        document.addPage(page);
        if (hasIncompleteFooter) {
          pagesWithIncompleteFooter.add(document.getPageCount());
        }
        (statements ? manifest.statementPages : manifest.formPages).push(
          document.getPageCount(),
        );
      }
    }
  }
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (const [index, page] of document.getPages().entries()) {
    if (pagesWithIncompleteFooter.has(index + 1)) continue;
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
  const sourceAttachments = [
    ...gamblingAttachments,
    ...retirementAttachments,
    ...(electionForms?.covenants.map((covenant) => ({
      ...covenant,
      requiredForForms: electionForms!.schedules.filter((s) =>
        s.covenant_reference === covenant.reference
      ).map((s) => `form1062_schedule_a:${s.sale_reference}`),
    })) ?? []),
  ];
  const sourceFileNames = sourceAttachments.flatMap((a) =>
    "fileName" in a ? [a.fileName] : []
  );
  if (
    new Set(sourceFileNames).size !== sourceFileNames.length ||
    new Set(sourceAttachments.map((a) => a.reference)).size !==
      sourceAttachments.length
  ) {
    throw new Error(
      "Original source attachments need distinct filenames and references",
    );
  }
  document.setTitle("2026 development draft - not for filing");
  return {
    bytes: await document.save({ updateFieldAppearances: false }),
    attachments,
    // Never flatten/merge a signed covenant into generated return pages. These
    // are required original attachments, not optional copies of rendered pages.
    sourceAttachments,
    calculation,
    filingReady: false as const,
    // Pending deposits are not evidence that a credit/activity was finalized.
    unfinishedReceivers: Object.keys(p).filter((k) =>
      !(k in sourceRegistry2026)
    ).sort(),
  };
}
