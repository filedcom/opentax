import { createHash } from "node:crypto";
import { PficRegime } from "../nodes/inputs/f8621/index.ts";
import type { PdfReviewFixture } from "./pdf/review-fixtures.ts";

/** Synthetic byte-bound issuer, annual QEF and distribution records. */
function copy(document_id: string, content: string) {
  const bytes = new TextEncoder().encode(content);
  return {
    document_id,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes_base64: btoa(String.fromCharCode(...bytes)),
  };
}

export function form8621QefSourceInputs(baseInputs: Readonly<Record<string, unknown>>) {
  return {
    ...baseInputs,
    f8621: [{
      company_name: "QEF Source Fund",
      company_ein_or_ref: "QEF001",
      country_of_incorporation: "Ireland",
      regime: PficRegime.QEF,
      shares_owned: 100,
      fmv_at_year_end: 20000,
      qef_ordinary_income: 2000,
      qef_capital_gain: 0,
      parent_source: {
        corporation_address: {
          line1: "1 Fund Quay",
          city: "Dublin",
          country_code: "EI",
        },
        corporation_tax_year_start: "2025-01-01",
        corporation_tax_year_end: "2025-12-31",
        share_classes: [{
          description: "Ordinary",
          year_end_shares: 100,
          year_end_value_usd: 20000,
        }],
        jointly_owned_with_spouse: false,
        shares_acquired_during_2025: true,
        acquisition_date: "2025-01-01",
        election_status: "qef_new_2025",
        no_outstanding_section1294_election: true,
        issuer_record: copy(
          "issuer-2025",
          "Issuer's 2025 report for QEF Source Fund",
        ),
        qef_annual_statement: {
          ...copy("qef-2025", "QEF annual statement: 2000 ordinary, 0 capital"),
          ordinary_earnings_usd: 2000,
          net_capital_gain_usd: 0,
        },
        qef_1294_activity_record: {
          ...copy(
            "broker-2025",
            "Broker 2025 ledger: no distributions or transfers",
          ),
          distributions_cash_and_property_usd: 0,
          transferred_share_earnings_usd: 0,
        },
      },
      qef_1294_election: {
        distributions_cash_and_property_usd: 0,
        transferred_share_earnings_usd: 0,
        undistributed_ordinary_earnings_usd: 2000,
        undistributed_capital_gain_usd: 0,
        no_section951_inclusion: true,
      },
    }],
  };
}

export function form8621QefReviewFixture(base: PdfReviewFixture): PdfReviewFixture {
  return {
    id: "single-source-qef-1294-election",
    inputs: form8621QefSourceInputs(base.inputs),
    filer: base.filer,
    expectedPdfForms: ["f1040", "schedule1", "form8621"],
    reviewFocus: [
      "Owned QEF issuer, annual statement and no-distribution records match the PFIC identity and 100 shares valued at20000",
      "Form8621 PartsI/II/III show new QEF and ElectionB, ordinary2000, capital0 and deferred tax440",
      "Schedule1 QEF2000 joins AGI77000; taxable61250, predeferral tax8395 and final7955 agree with Form1040",
      "Separate source records are byte-bound synthetic evidence, without external issuer or IRS acceptance authentication",
    ],
  };
}
