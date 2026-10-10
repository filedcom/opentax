import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  solarBondCases,
  solarBondFixture,
} from "./form8835_solar_bonds.fixture.ts";
import { calculateForm8835 } from "../../../../../nodes/inputs/credits/business/f8835/index.ts";
import { form8835TransferDescription } from "../../../../../nodes/inputs/credits/business/f8835/transfer-source.ts";
import { transferStatementFields } from "../../../../mef/forms/credits/business/f8835_transfer_statement.ts";
import { sha256Hex } from "../../../../return-processing/prepared-source.ts";

export const transferCases = [
  { id: "transfer-base-partial", source: 0, portions: [[200]] },
  { id: "transfer-small-full", source: 1, portions: [[2550]] },
  { id: "transfer-rounded-zero-bond", source: 2, portions: [[1000]] },
  { id: "transfer-early-two-buyers", source: 3, portions: [[1000, 2000]] },
  { id: "transfer-bonuses", source: 4, portions: [[1500]] },
  { id: "transfer-pwa", source: 5, portions: [[2000]] },
  {
    id: "transfer-mixed-facilities",
    source: 6,
    portions: [[10000, 5000], [20000]],
  },
];
export async function transferFixture(c: typeof transferCases[number]) {
  const { input, attachments } = await solarBondFixture(
    solarBondCases[c.source],
  );
  let remaining = 23049;
  const credits = [], transfers = [];
  for (const [index, f] of input.f8835.entries()) {
    const credit = calculateForm8835(f).line15;
    const address = {
      line1: "1 Example Way",
      city: "Austin",
      state: "TX",
      zip: "78701",
    };
    const party = {
      name: "Alex Example",
      tin: "111223333",
      address,
      signer_name: "Alex Example",
      signer_authority_reference: "Synthetic owner signer review",
      signed_on: "2026-02-01",
      signed_statement_reviewed: true,
    };
    f.registration_number = `CAABC25ABCD${index}`;
    f.transfer_election_amount = c.portions[index].reduce((a, b) => a + b, 0);
    f.transfer_source = {
      tax_year: 2025,
      transferor: party,
      facility_description: f.facility_description,
      facility_address: f.facility_us_address,
      facility_latitude: f.facility_latitude,
      facility_longitude: f.facility_longitude,
      facility_placed_in_service_date: f.facility_placed_in_service_date,
      registration_number: f.registration_number,
      registration_record_reference: `Synthetic registration ${index}`,
      registration_tax_year: 2025,
      registration_facility_and_owner_verified: true,
      registration_received_on: "2026-01-20",
      return_filing_date: "2026-02-15",
      return_due_date_including_extensions: "2026-04-15",
      original_timely_return_verified: true,
      eligible_nonapplicable_taxpayer_verified: true,
      self_generated_not_previously_transferred_credit_verified: true,
      no_duplicate_election_or_elective_payment_verified: true,
      complete_facility_transfer_inventory_verified: true,
      total_facility_credit: credit,
      review_reference: `Synthetic transfer review ${index}`,
      transfers: c.portions[index].map((amount, j) => ({
        transferee: {
          ...party,
          name: `Synthetic Buyer ${index + 1}-${j + 1}`,
          tin: String(220000000 + index * 100 + j),
          signer_name: `Buyer Signer ${j + 1}`,
          address: {
            line1: `${20 + j} Buyer Road`,
            city: "Boston",
            state: "MA",
            zip: "02108",
          },
        },
        transferee_tax_year: 2025,
        transferee_return_filing_date: "2026-03-15",
        agreement_reference: `Synthetic agreement ${index}/${j}`,
        credit_amount: amount,
        cash_consideration_cents: amount * 90,
        cash_payments: [{
          record_reference: `Synthetic payment ${index}/${j}/1`,
          paid_on: "2025-12-20",
          amount_cents: amount * 30,
          currency: "USD",
          method: "wire",
          cleared_and_immediately_available_verified: true,
        }, {
          record_reference: `Synthetic payment ${index}/${j}/2`,
          paid_on: "2026-02-10",
          amount_cents: amount * 60,
          currency: "USD",
          method: "ach",
          cleared_and_immediately_available_verified: true,
        }],
        unrelated_under_267b_and_707b_including_controlled_groups_verified:
          true,
        all_6418_and_section45_requirements_verified: true,
        recapture_notification_acknowledged_by_both_parties: true,
        facility_existence_documentation_reference:
          `Synthetic facility evidence ${index}`,
        qualifying_production_and_sales_documentation_reference:
          `Synthetic production evidence ${index}`,
        bonus_documentation_reference: `Synthetic bonus evidence ${index}`,
        minimum_documentation_delivered_to_transferee_verified: true,
        proportional_base_and_bonus_portion_verified: true,
        statement_file_name: `Transfer Election Statement ${index + 1}_${
          j + 1
        }.pdf`,
        statement_sha256: "0".repeat(64),
      })),
    };
    if (f.pwa_source) {
      const a = attachments.find((a) =>
        a.fileName === f.pwa_source.form7220_file_name
      )!;
      const pdf = await PDFDocument.load(a.bytes);
      pdf.getForm().getTextField("topmostSubform[0].Page1[0].f1_3[0]").setText(
        f.registration_number,
      );
      a.bytes = await pdf.save();
      f.pwa_source.form7220_sha256 = await sha256Hex(a.bytes);
    }
    f.transfer_election_statement_file_name =
      f.transfer_source.transfers[0].statement_file_name;
    for (const [j, t] of f.transfer_source.transfers.entries()) {
      const pdf = await PDFDocument.create(),
        font = await pdf.embedFont(StandardFonts.Helvetica);
      let page = pdf.addPage([612, 792]), y = 710;
      const header = () => {
        page.drawText("TRANSFER ELECTION STATEMENT", {
          x: 35,
          y: 760,
          size: 14,
          font,
        });
        page.drawText("SYNTHETIC TEST SOURCE - NOT A SIGNED FILING", {
          x: 35,
          y: 739,
          size: 10,
          font,
        });
      };
      header();
      for (
        const [key, value] of Object.entries(transferStatementFields(f, j))
      ) {
        const height = value.length > 100 ? 65 : 25;
        if (y - height < 40) {
          page = pdf.addPage([612, 792]);
          y = 710;
          header();
        }
        page.drawText(key.replace(/([a-z])([A-Z])/g, "$1 $2"), {
          x: 35,
          y,
          size: 9,
          font,
        });
        y -= height + 5;
        const field = pdf.getForm().createTextField(`Form8835Transfer.${key}`);
        field.enableMultiline();
        field.setText(value);
        field.addToPage(page, {
          x: 35,
          y,
          width: 540,
          height,
          borderWidth: 0,
          font,
        });
        field.setFontSize(9);
        y -= 20;
      }
      pdf.getForm().updateFieldAppearances(font);
      const bytes = await pdf.save();
      t.statement_sha256 = await sha256Hex(bytes);
      attachments.push({
        fileName: t.statement_file_name,
        description: form8835TransferDescription(
          f.facility_description,
          t.transferee.tin,
        ),
        bytes,
      });
    }
    const a = input.form3800_current_production_allocation.facilities[index];
    a.transfer_out_amount = f.transfer_election_amount;
    a.applied_credit = Math.min(remaining, credit - f.transfer_election_amount);
    remaining -= a.applied_credit;
    credits.push(credit);
    transfers.push(f.transfer_election_amount);
  }
  const used = 23049 - remaining;
  return {
    input,
    attachments,
    expected: { credits, transfers, used, tax: 25067 - 2001 - used },
  };
}
