import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractFilerIdentity } from "../../mef/filer.ts";
import { sha256Hex } from "../prepared-source.ts";
import {
  calculateFiling,
  type Form8978Input,
  Form8978Source,
} from "../../nodes/inputs/f8978/index.ts";
import type { PdfReviewFixture } from "./review-fixtures.ts";
import type { MefPdfAttachment } from "../mef/form-descriptor.ts";

const general = {
  filing_status: "single",
  taxpayer_first_name: "Alex",
  taxpayer_last_name: "Partner",
  taxpayer_ssn: "123456789",
  taxpayer_dob: "1985-06-15",
  address_line1: "1 Review Way",
  address_city: "Boise",
  address_state: "ID",
  address_zip: "83702",
  digital_assets: false,
};
const w2 = [{
  recipient: "T",
  employee_ssn: "123456789",
  source_document_reference: "2025-review-employer-primary",
  box1_wages: 75000,
  box2_fed_withheld: 11000,
  box3_ss_wages: 75000,
  box4_ss_withheld: 4650,
  box5_medicare_wages: 75000,
  box6_medicare_withheld: 1087.5,
  employer_ein: "123456789",
  employer_name: "Review Employer",
  employer_address_line1: "10 Employer Road",
  employer_address_city: "Boise",
  employer_address_state: "ID",
  employer_address_zip: "83702",
  box12_entries: [],
}];
// Reviewed ordinary-income, single-filer affected-year workpapers. Taxable
// income exceeds100000, so the filed tax computation worksheet applies.
const taxRules: Record<
  number,
  { ded: number; threshold: number; base: number }
> = {
  2020: { ded: 12400, threshold: 85525, base: 14605.5 },
  2021: { ded: 12550, threshold: 86375, base: 14751 },
  2022: { ded: 12950, threshold: 89075, base: 15213.5 },
  2023: { ded: 13850, threshold: 95375, base: 16290 },
  2024: { ded: 14600, threshold: 100525, base: 17168.5 },
};
function year(
  yyyy: number,
  amount: number,
  overflow = false,
  original = 150000,
) {
  const rules = taxRules[yyyy];
  const rows = overflow
    ? Array.from(
      { length: 8 },
      (_, i) => ({
        origin: "form8986" as const,
        description: `Schedule K-1 line5 interest source${i + 1}`,
        ein: "825555123",
        amount: amount / 8,
      }),
    )
    : [{
      origin: "form8986" as const,
      description: "Schedule K-1 line5 interest income",
      ein: "825555123",
      amount,
    }];
  return {
    tax_year_end: `${yyyy}-12-31`,
    original_income: original,
    income_adjustments: rows,
    original_deductions: rules.ded,
    deduction_adjustments: [],
    corrected_income_tax: Math.round(
      rules.base + .24 * (original + amount - rules.ded - rules.threshold),
    ),
    corrected_amt: 0,
    original_credits: 0,
    credit_adjustments: [],
    original_tax_liability: Math.round(
      rules.base + .24 * (original - rules.ded - rules.threshold),
    ),
    tax_calculation_explanation:
      `Reviewed ${yyyy} original/corrected Single ordinary-income returns; standard deduction${rules.ded}; taxable income above100000 and within24% bracket. Income tax =${rules.base}+24%*(taxable income-${rules.threshold}), rounded to nearest dollar. Original${original}, adjustment${amount}. No preferential income, AMT adjustments, credits, QBI, NIIT or other income-tax changes.`,
  };
}
async function recordPdf(facts: unknown) {
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.setCreationDate(new Date("2025-12-31T12:00:00Z"));
  doc.setModificationDate(new Date("2025-12-31T12:00:00Z"));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let p = doc.addPage([612, 792]), y = 750;
  for (
    const line of [
      "SYNTHETIC REVIEWED FORM8978 SOURCE",
      ...JSON.stringify(facts, null, 2).split("\n").flatMap((l) =>
        l.match(/.{1,94}/g) ?? [""]
      ),
    ]
  ) {
    if (y < 42) {
      p = doc.addPage([612, 792]);
      y = 750;
    }
    p.drawText(line, { x: 36, y, size: 9, font });
    y -= 13;
  }
  return doc.save();
}
export async function form8978ReviewFixture(
  kind: "positive" | "negative" | "multiple",
): Promise<PdfReviewFixture> {
  const filings: Form8978Input["filings"] = kind === "multiple"
    ? [
      {
        source: Form8978Source.Aar,
        columns: [2021, 2022, 2023, 2024].map((y) =>
          year(y, -8000, y === 2024)
        ),
      },
      { source: Form8978Source.Aar, columns: [year(2020, -8000)] },
      {
        source: Form8978Source.BbaAudit,
        columns: [year(2024, 4000, false, 142000)],
      },
    ]
    : [{
      source: Form8978Source.Aar,
      columns: [year(2024, kind === "positive" ? 8000 : -8000)],
    }];
  // Partner-level loss release has its own reviewed provenance and blank tracking.
  if (kind === "multiple") {
    const col = filings[0].columns[3];
    col.deduction_adjustments.push({
      origin: "partner_tax_attribute",
      description: "Section163d investment interest limit",
      attribute_explanation:
        "Reviewed original net investment income2000 and investment interest paid2000; Form8986 interest reduction8000 leaves no positive net investment income. Deductible investment interest decreases2000; revised carryforward2000.",
      amount: -2000,
    });
    col.original_deductions = 30000;
    col.original_tax_liability = 21843;
    col.corrected_income_tax = 20403;
    col.tax_calculation_explanation =
      "Reviewed2024 Single original income150000, itemized deductions30000 (including deductible investment interest2000), taxable120000; tax17168.50+24%*(120000-100525)=21842.50 ->21843. Corrected income142000, deductions28000 after investment interest limitation, taxable114000; tax17168.50+24%*(114000-100525)=20402.50 ->20403. Other itemized deductions28000 exceed standard14600 and produce no AMT adjustment; AMT0. No preferential income, credits, QBI, NIIT or nonincome tax changes.";
    const audit = filings[2].columns[0];
    audit.original_income = 142000;
    audit.original_deductions = 28000;
    audit.original_tax_liability = 20403;
    audit.corrected_income_tax = 21363;
    audit.interest = Math.round(960 * ((1 + .09 / 365) ** 260 - 1));
    audit.interest_calculation_explanation =
      "BBA interest on960 additional2024 tax: original due2025-04-15 to reviewed payment2025-12-31,260 daily periods at9% (ordinary7% underpayment plus2% under section6226);960*((1+0.09/365)^260-1), rounded. No source penalties. The negative AAR adjustments are excluded from interest.";
    audit.tax_calculation_explanation =
      "Reviewed2024 Single baseline after AAR: income142000, deductions28000, taxable114000, prior tax20403. BBA interest income increase4000 yields income146000, deductions28000, taxable118000; tax17168.50+24%*(118000-100525)=21362.50 ->21363. No further investment interest deduction claimed (full ledger reviewed), no AMT, preferential income, QBI, NIIT or other income tax changes.";
  }
  if (kind === "positive") {
    const col = filings[0].columns[0];
    const days = (Date.parse("2025-12-31") - Date.parse("2025-04-15")) /
      86400000;
    col.interest = Math.round(1920 * ((1 + .07 / 365) ** days - 1));
    col.interest_calculation_explanation =
      `AAR interest on1920 additional tax from2025-04-15 through2025-12-31, ${days} daily compounding periods at7% underpayment rate for2025 Q2/Q3/Q4:1920*((1+0.07/365)^${days}-1), rounded. Payment date is reviewed2025-12-31; no penalties per supplied pushout.`;
  }
  const attachments: MefPdfAttachment[] = [];
  const records = await Promise.all(filings.map(async (filing, i) => {
    const sourceFacts = {
      partner_ssn: "123456789",
      issuer_ein: "825555123",
      furnished_date: "2025-06-15",
      source: filing.source,
      affected_years: filing.columns.map((c) => ({
        tax_year_end: c.tax_year_end,
        adjustments: [
          ...c.income_adjustments,
          ...c.deduction_adjustments,
          ...c.credit_adjustments,
        ].filter((r) => r.origin === "form8986"),
      })),
    };
    const computationFacts = {
      partner_ssn: "123456789",
      reviewed_filing: filing,
      calculated: calculateFiling(filing),
      reviewed_historical_return_and_attribute_records: true,
    };
    const docs = await Promise.all(
      [sourceFacts, computationFacts].map(async (facts, j) => {
        const bytes = await recordPdf(facts),
          fileName = `Form8978Reviewed${kind}${i + 1}-${j + 1}.pdf`;
        attachments.push({
          fileName,
          description: `Form8978 ${kind} filing${i + 1} source${j + 1}`,
          bytes,
        });
        return {
          document_reference: `${kind}-filing${i + 1}-record${j + 1}`,
          attachment_file_name: fileName,
          sha256: await sha256Hex(bytes),
        };
      }),
    );
    return {
      issuer_ein: "825555123",
      furnished_date: "2025-06-15",
      source_document: docs[0],
      computation_document: docs[1],
      reviewed_filing: structuredClone(filing),
      historical_tax_rules_and_original_return_reviewed: true as const,
      no_unreported_nonincome_tax_changes_confirmed: true as const,
    };
  }));
  const inputs = {
    general,
    w2,
    f8978: {
      filings,
      reviewed_source: {
        partner_ssn: "123456789",
        reporting_year: 2025,
        non_passthrough_calendar_year_partner_confirmed: true,
        filings: records,
      },
    },
  };
  return {
    id: `single-form8978-${kind}-reviewed-source`,
    inputs,
    filer: extractFilerIdentity(general)!,
    attachments,
    expectedPdfForms: [
      "f1040",
      ...Array(kind === "multiple" ? 3 : 1).fill("f8978"),
      ...Array(kind === "multiple" ? 4 : 1).fill("form8978_schedule_a"),
      ...(kind === "positive" ? [] : ["schedule3"]),
    ],
    reviewFocus: [
      "Reviewed owned source facts and exact supplied PDF bytes; historical computations are transcriptions with explicit formulas, not authenticated prior returns",
      "All affected columns and AAR-before-audit baselines join native calculation and reporting-year1040",
      "Every ScheduleA overflow row preserved; partner tax attribute tracking remains blank; page subtotals sum to parent",
    ],
  };
}
export const form8978ReviewFixtures = await Promise.all(
  (["positive", "negative", "multiple"] as const).map(form8978ReviewFixture),
);
