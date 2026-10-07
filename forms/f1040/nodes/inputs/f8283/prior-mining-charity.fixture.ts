import { PDFDocument, StandardFonts } from "pdf-lib";
import { naturalResourceSource } from "../../../2025/pdf/form8283-natural-resource.fixture.ts";
import { charitableNaturalResourceDocumentFields } from "./natural-resource-source.ts";

export async function priorMiningCharityFixture() {
  // A separate simulated2024 source account. The reviewed2025 archives are
  // untouched. Three producing-year financial accounts retain their amounts,
  // with production commencing2022 and the gift made2024. No fabricated ACK.
  const original = naturalResourceSource("producing_exploration");
  let source: any = structuredClone(original);
  source.date_contributed = "2024-06-01";
  source.producing_stage_reached_on = "2022-01-01";
  source.mine_inventory[0].producing_stage_reached_on = "2022-01-01";
  source.mine_inventory[0].operation_record_reference =
    "Owned gold mine developed ore operation2022";
  source.mine_inventory[0].default_disallowance_return_record_reference =
    "Owned617 production-stage2022 return depletion disallowance";
  source.producing_stage_geological_and_operation_record_reference =
    "Owned gold mine developed ore operation2022";
  source.annual_records = original.annual_records.filter((r: any) =>
    r.tax_year <= 2024
  ).map((row: any) => {
    if (row.tax_year < 2022) return row;
    const shifted = structuredClone(
      original.annual_records.find((r: any) => r.tax_year === row.tax_year + 1),
    );
    const replace = (value: any): any =>
      typeof value === "string"
        ? value.replaceAll(String(row.tax_year + 1), String(row.tax_year))
        : Array.isArray(value)
        ? value.map(replace)
        : value && typeof value === "object"
        ? Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, replace(v)]),
        )
        : value;
    return { ...replace(shifted), tax_year: row.tax_year };
  });
  source.current_year_paid_receipts = original.current_year_paid_receipts.map((
    r: any,
  ) =>
    Object.fromEntries(
      Object.entries(r).map((
        [k, v],
      ) => [k, typeof v === "string" ? v.replaceAll("2025", "2024") : v]),
    )
  );
  const shiftCurrentReferences = (value: any): any =>
    typeof value === "string"
      ? value.replaceAll("2025", "2024")
      : Array.isArray(value)
      ? value.map(shiftCurrentReferences)
      : value && typeof value === "object"
      ? Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, shiftCurrentReferences(v)]),
      )
      : value;
  source = shiftCurrentReferences(source);
  const records = new Map<string, Uint8Array>();
  for (let n = 0; n < 3; n++) {
    const pdf = await PDFDocument.create(),
      font = await pdf.embedFont(StandardFonts.Helvetica),
      form = pdf.getForm();
    let page = pdf.addPage([612, 792]), y = 715;
    const title = () => {
      page.drawText(
        `Simulated2024 owned mine ${
          ["purchase", "annual", "operation"][n]
        } source account`,
        { x: 35, y: 756, size: 11, font },
      );
      page.drawText(
        "Source-contract evidence; not authenticated or accepted filing evidence.",
        { x: 35, y: 737, size: 8, font },
      );
    };
    title();
    for (
      const [key, value] of Object.entries(
        charitableNaturalResourceDocumentFields(source, n, 2024),
      )
    ) {
      if (y < 60) {
        page = pdf.addPage([612, 792]);
        y = 715;
        title();
      }
      page.drawText(key, { x: 35, y, size: 7, font });
      const field = form.createTextField(key);
      field.setText(value);
      field.addToPage(page, {
        x: 35,
        y: y - 22,
        width: 540,
        height: 17,
        font,
        borderWidth: .5,
      });
      field.setFontSize(7);
      y -= 37;
    }
    form.updateFieldAppearances(font);
    const bytes = await pdf.save();
    const file = `prior2024-mine-${n}.pdf`;
    source.retained_source_documents[n].attachment_file_name = file;
    source.retained_source_documents[n].pdf_sha256 = await digest(bytes);
    records.set(file, bytes);
  }
  const regular = {
    tax_year: 2024,
    owner_ssn: source.donor_ssn,
    contribution_id: "prior2024-mineral-gift",
    return_record_reference:
      "Simulated2024 regular return contribution account",
    schedule_c_profit: 40000,
    schedule_se_line12: 5652,
    schedule_se_line13: 2826,
    form1040_line11_agi: 137174,
    schedule_a_line12_noncash: 41152,
    original_charitable_claim: 310000,
    raw_current_allowed: 41152.2,
    raw_carry_to_2025: 268847.8,
  };
  const amt = {
    tax_year: 2024,
    owner_ssn: source.donor_ssn,
    contribution_id: "prior2024-mineral-gift",
    retained_amt_workpaper_reference:
      "Simulated2024 retained AMT contribution account",
    adjusted_basis: 290000,
    original_charitable_claim: 311000,
    raw_current_allowed: 41152.2,
    raw_carry_to_2025: 269847.8,
    form6251_line2q_mining_costs: 90000,
    form6251_line2d_depletion: 0,
    form6251_line3_charitable_adjustment: 0,
  };
  const regularBytes = new TextEncoder().encode(
    JSON.stringify(regular, null, 2),
  );
  const amtBytes = new TextEncoder().encode(JSON.stringify(amt, null, 2));
  records.set("prior2024-regular-account.json", regularBytes);
  records.set("prior2024-amt-account.json", amtBytes);
  const wage = {
    tax_year: 2024,
    source_document_reference: "Simulated2024 issued employer W2",
    employee_ssn: source.donor_ssn,
    employee_name: source.donor_name,
    employer_ein: "123456789",
    employer_name: "Issued employment employer",
    box1_wages: 100000,
    box3_ss_wages: 100000,
    box4_ss_withheld: 6200,
    box5_medicare_wages: 100000,
    box6_medicare_withheld: 1450,
  };
  const history = {
    contribution_id: "prior2024-mineral-gift",
    owner_ssn: source.donor_ssn,
    prior_mining_source: source,
    issued_2024_w2: [wage],
    complete_prior_income_and_gift_inventory_record_reference:
      "2024 complete owned income and gift inventory",
    only_owned_mine_and_issued_wages_in_prior_income: true,
    sole_prior_charitable_gift_and_no_older_carryovers: true,
    single_full_year_itemizing_no_nol_or_status_change: true,
    regular_return_account: regular,
    amt_workpaper_account: amt,
    regular_return_account_record: {
      source_reference: regular.return_record_reference,
      file_name: "prior2024-regular-account.json",
      sha256: await digest(regularBytes),
    },
    amt_workpaper_account_record: {
      source_reference: amt.retained_amt_workpaper_reference,
      file_name: "prior2024-amt-account.json",
      sha256: await digest(amtBytes),
    },
  };
  return { history, records };
}
export function currentMiningCarryFixture(
  wages: number,
  owner = "111223333",
  cash = 0,
  stock = false,
) {
  const current: any = {
    tax_year: 2025,
    owner_ssn: owner,
    issued_w2: [{
      tax_year: 2025,
      source_document_reference: "Simulated2025 issued carry-owner W2",
      employee_ssn: owner,
      employee_name: "Alex Example",
      employer_ein: "987654321",
      employer_name: "Issued current employment employer",
      box1_wages: wages,
      box3_ss_wages: Math.min(176100, wages),
      box4_ss_withheld: Math.round(Math.min(176100, wages) * .062 * 100) / 100,
      box5_medicare_wages: wages,
      box6_medicare_withheld:
        Math.round((wages * .0145 + Math.max(0, wages - 200000) * .009) * 100) /
        100,
    }],
    cash_receipts: cash
      ? [{
        source_document_reference: "2025 current cash receipt",
        donor_ssn: owner,
        paid_on: "2025-03-01",
        amount: cash,
        donee_name: "Current Cash Charity",
        donee_ein: "123450001",
        fifty_percent_organization_record_reference:
          "Current Cash public charity eligibility record",
        contemporaneous_acknowledgment_reference:
          "2025 current cash acknowledgment",
        bank_payment_record_reference: "2025 cash bank payment",
      }]
      : [],
    current_capital_gain_stock_gifts: stock
      ? [{
        contribution_id: "current2025-stock",
        source_document_reference: "2025 current stock transfer",
        donor_ssn: owner,
        donated_on: "2025-04-01",
        acquired_on: "2022-01-01",
        ticker: "TEST",
        shares: 2000,
        acquisition_cost_per_share: 25,
        donation_date_quoted_price_per_share: 50,
        issued_acquisition_record_reference: "2022 issued stock purchase",
        donation_transfer_record_reference: "2025 brokerage transfer",
        published_exchange_quote_record_reference:
          "2025 donation day published exchange quote",
        donee_name: "Current Stock Charity",
        donee_ein: "123450002",
        fifty_percent_organization_record_reference:
          "Current Stock public charity eligibility record",
        no_returnwide_capital_gain_reduction_election: true,
      }]
      : [],
    complete_current_income_and_gift_inventory_record_reference:
      "2025 complete owned income and gift inventory",
    only_issued_wages_in_current_income: true,
    no_other_charitable_contributions_or_prior_carryovers: true,
    original_mine_owned_interest_terminated_in_2024: true,
    single_full_year_itemizing_no_nol_or_status_change: true,
  };
  return current;
}
export async function digest(bytes: Uint8Array) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer),
    ),
  ].map((v) => v.toString(16).padStart(2, "0")).join("");
}
