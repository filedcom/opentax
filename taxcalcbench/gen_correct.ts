#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Generate correct.json for each benchmark case using the 2025 tax calculator.
 * Run: deno run --allow-read --allow-write taxcalcbench/gen_correct.ts
 */

import { dirname, fromFileUrl, join } from "@std/path";
import { computeTax, type FilingStatus, type TaxReturnInput } from "./tax2025.ts";

const CASES_DIR = join(dirname(fromFileUrl(import.meta.url)), "cases");

interface Dependent { qualifying_child_for_ctc?: boolean; }
interface FormEntry { node_type: string; data: Record<string, unknown>; }
interface CaseInput { year: number; scenario?: string; forms: FormEntry[]; }

function buildReturn(caseData: CaseInput): TaxReturnInput {
  const forms = caseData.forms;
  let general: Record<string, unknown> = {};
  for (const f of forms) {
    if (f.node_type === "start") { general = (f.data.general ?? {}) as Record<string, unknown>; break; }
  }

  const status      = (general.filing_status ?? "single") as FilingStatus;
  const dependents  = (general.dependents ?? []) as Dependent[];

  const inp: TaxReturnInput = {
    status,
    taxpayer65:    (general.taxpayer_age_65_or_older ?? false) as boolean,
    taxpayerBlind: (general.taxpayer_blind           ?? false) as boolean,
    spouse65:      (general.spouse_age_65_or_older   ?? false) as boolean,
    spouseBlind:   (general.spouse_blind             ?? false) as boolean,
    qualifyingChildren: dependents.filter(d => d.qualifying_child_for_ctc).length,
    eitcChildren:       dependents.length,
    wages: 0, unemployment: 0, interest: 0, ordinaryDividends: 0, qualifiedDividends: 0,
    ltcg: 0, pension: 0, ssaGross: 0, scheduleCNet: 0,
    studentLoanInterestPaid: 0, hsaEmployer: 0,
    educatorExpenses: 0, educatorExpensesSp: 0,
    depCareExpenses: 0, depCarePersons: 0, aotcExpenses: 0,
    marketplacePremium: 0, marketplaceSlcsp: 0, marketplaceAptc: 0,
    fedWithheld: 0, estimatedTaxPayments: 0,
    ssWagesList: [], ssWithheldList: [],
  };

  for (const f of forms) {
    const nt = f.node_type;
    const d  = f.data as Record<string, number>;

    if (nt === "w2") {
      inp.wages!         += d.box1_wages        ?? 0;
      inp.fedWithheld!   += d.box2_fed_withheld ?? 0;
      inp.ssWagesList!.push(d.box3_ss_wages    ?? 0);
      inp.ssWithheldList!.push(d.box4_ss_withheld ?? 0);
      for (const e of (f.data.box12_entries ?? []) as Array<{code:string;amount:number}>) {
        if (e.code === "W") inp.hsaEmployer! += e.amount ?? 0;
      }
    } else if (nt === "f1099g") {
      inp.unemployment!  += d.box_1_unemployment        ?? 0;
      inp.fedWithheld!   += d.box_4_federal_withheld    ?? 0;
    } else if (nt === "f1099int") {
      inp.interest!      += d.box1 ?? 0;
      inp.fedWithheld!   += d.box4 ?? 0;
    } else if (nt === "f1099div") {
      inp.ordinaryDividends!  += d.box1a ?? 0;
      inp.qualifiedDividends! += d.box1b ?? 0;
      inp.fedWithheld!        += d.box4  ?? 0;
    } else if (nt === "f1099b") {
      const gain = (d.proceeds ?? 0) - (d.cost_basis ?? 0);
      const part = ((f.data.part ?? "") as string).toUpperCase();
      if (part === "D" || part === "") inp.ltcg! += gain;
    } else if (nt === "f1099r") {
      inp.pension!       += d.box2a_taxable_amount ?? d.box1_gross_distribution ?? 0;
      inp.fedWithheld!   += d.box4_federal_withheld ?? 0;
    } else if (nt === "ssa1099") {
      inp.ssaGross!      += d.box3_gross_benefits    ?? 0;
      inp.fedWithheld!   += d.box6_federal_withheld  ?? 0;
    } else if (nt === "schedule_c") {
      const gross = d.line_1_gross_receipts ?? 0;
      const skip  = new Set(["line_1_gross_receipts","line_a_principal_business",
                             "line_b_business_code","line_f_accounting_method","line_g_material_participation"]);
      let expenses = 0;
      for (const [k, v] of Object.entries(d)) {
        if (k.startsWith("line_") && !skip.has(k) && typeof v === "number") expenses += v;
      }
      inp.scheduleCNet! += gross - expenses;
    } else if (nt === "f1099nec") {
      inp.scheduleCNet! += d.box1_nec            ?? 0;
      inp.fedWithheld!  += d.box4_federal_withheld ?? 0;
    } else if (nt === "educator_expenses") {
      inp.educatorExpenses!   += d.educator1_expenses ?? 0;
      inp.educatorExpensesSp! += d.educator2_expenses ?? 0;
    } else if (nt === "f1040es") {
      inp.estimatedTaxPayments! += (d.payment_q1 ?? 0) + (d.payment_q2 ?? 0) +
                                   (d.payment_q3 ?? 0) + (d.payment_q4 ?? 0);
    } else if (nt === "f8863") {
      let entries: Array<Record<string,unknown>>;
      if (f.data.f8863s)       entries = f.data.f8863s as Array<Record<string,unknown>>;
      else if (f.data.credit_type) entries = [f.data];
      else entries = [];
      for (const e of entries) {
        if (e.credit_type === "aoc") inp.aotcExpenses! += (e.aoc_adjusted_expenses as number) ?? 0;
      }
    } else if (nt === "f1095a") {
      let plans: Array<Record<string,unknown>>;
      if (f.data.f1095as)      plans = f.data.f1095as as Array<Record<string,unknown>>;
      else if (f.data.issuer_name) plans = [f.data];
      else plans = [];
      for (const p of plans) {
        inp.marketplacePremium! += (p.annual_premium as number) ?? 0;
        inp.marketplaceSlcsp!   += (p.annual_slcsp   as number) ?? 0;
        inp.marketplaceAptc!    += (p.annual_aptc    as number) ?? 0;
      }
    } else if (nt === "f1098e") {
      for (const e of (f.data.f1098es ?? []) as Array<{box1_student_loan_interest?:number}>) {
        inp.studentLoanInterestPaid! += e.box1_student_loan_interest ?? 0;
      }
    } else if (nt === "f2441") {
      inp.depCareExpenses = d.qualifying_expenses_paid ?? 0;
      inp.depCarePersons  = d.qualifying_person_count  ?? 1;
    }
  }

  return inp;
}

async function main() {
  console.log("Generating correct.json for all cases...\n");

  const names: string[] = [];
  for await (const e of Deno.readDir(CASES_DIR)) {
    if (e.isDirectory) names.push(e.name);
  }
  names.sort();

  for (const name of names) {
    const caseDir    = join(CASES_DIR, name);
    const inputFile  = join(caseDir, "input.json");
    const outputFile = join(caseDir, "correct.json");
    try { await Deno.stat(inputFile); } catch { continue; }

    const caseData: CaseInput = JSON.parse(await Deno.readTextFile(inputFile));
    const inp    = buildReturn(caseData);
    const result = computeTax(inp);

    await Deno.writeTextFile(outputFile, JSON.stringify({
      case:     name,
      scenario: caseData.scenario ?? "",
      year:     2025,
      inputs: {
        filing_status:           inp.status,
        wages:                   inp.wages,
        unemployment:            inp.unemployment,
        interest:                inp.interest,
        ordinary_dividends:      inp.ordinaryDividends,
        qualified_dividends:     inp.qualifiedDividends,
        ltcg:                    inp.ltcg,
        pension:                 inp.pension,
        ssa_gross:               inp.ssaGross,
        schedule_c_net:          inp.scheduleCNet,
        student_loan_int:        inp.studentLoanInterestPaid,
        hsa_employer:            inp.hsaEmployer,
        educator_expenses:       inp.educatorExpenses,
        educator_expenses_sp:    inp.educatorExpensesSp,
        aotc_expenses:           inp.aotcExpenses,
        marketplace_premium:     inp.marketplacePremium,
        marketplace_slcsp:       inp.marketplaceSlcsp,
        marketplace_aptc:        inp.marketplaceAptc,
        qualifying_children:     inp.qualifyingChildren,
        eitc_children:           inp.eitcChildren,
        dep_care_expenses:       inp.depCareExpenses,
        estimated_tax_payments:  inp.estimatedTaxPayments,
        fed_withheld:            inp.fedWithheld,
      },
      correct: result,
    }, null, 2));

    const r = result;
    const n = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2 });
    console.log(`  ${name}: agi=${n(r.line11_agi).padStart(12)}  tax=${n(r.line24_total_tax).padStart(10)}  refund=${n(r.line35a_refund).padStart(10)}  owed=${n(r.line37_amount_owed).padStart(9)}`);
  }

  console.log("\nDone.");
}

main();
