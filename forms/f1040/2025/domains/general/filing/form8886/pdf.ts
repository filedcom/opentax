import { PDFDocument, StandardFonts } from "pdf-lib";
import { roundWholeDollars } from "../../../../../whole-dollars.ts";
import { form8886Narrative } from "./document.ts";
import { ty2025IrsCountryName } from "../../../../pdf/support/irs_country_name.ts";
import {
  disclosureSchema,
  EntityType,
  type Form8886Disclosure,
  ReportableCategory,
  TaxBenefit,
} from "./source.ts";

type Party = Form8886Disclosure["parties"][number];
export type Form8886Owner = {
  readonly ssn: string;
  readonly lastName: string;
  readonly firstName: string;
  readonly middleInitial?: string;
  readonly address: NonNullable<Party["address"]>;
};
const categoryFields: Readonly<Record<ReportableCategory, number>> = {
  [ReportableCategory.Listed]: 4,
  [ReportableCategory.Confidential]: 5,
  [ReportableCategory.ContractualProtection]: 6,
  [ReportableCategory.Loss]: 7,
  [ReportableCategory.TransactionOfInterest]: 8,
};
// Widget coordinates on the official form, rather than enum order.
const benefitFields: Readonly<Record<TaxBenefit, number>> = {
  [TaxBenefit.Deduction]: 1,
  [TaxBenefit.Exclusion]: 2,
  [TaxBenefit.NoBasisAdjustment]: 3,
  [TaxBenefit.Credit]: 4,
  [TaxBenefit.CapitalLoss]: 5,
  [TaxBenefit.Nonrecognition]: 6,
  [TaxBenefit.Deferral]: 7,
  [TaxBenefit.OrdinaryLoss]: 8,
  [TaxBenefit.BasisAdjustment]: 9,
  [TaxBenefit.Other]: 10,
};
function identifyingNumber(party: Party): string {
  if (party.identity.kind === "unknown") return "";
  const value = party.identity.value;
  return party.identity.kind === "ssn"
    ? `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5)}`
    : `${value.slice(0, 2)}-${value.slice(2)}`;
}
function postalAddress(address: Party["address"]): string {
  if (!address) return "";
  return address.kind === "us"
    ? [
      address.line1,
      address.line2,
      `${address.city}, ${address.state} ${address.zip}`,
    ].filter(Boolean).join(", ")
    : [
      address.line1,
      address.line2,
      address.city,
      address.province,
      address.postal_code,
      address.country,
    ].filter(Boolean).join(", ");
}
/** Staged renderer. Remaining disclosure facts are retained on ordered sheets;
 * no extra row or disclosure word is silently discarded. */
export async function buildForm8886Pdf(
  sourceInput: Form8886Disclosure,
  owner: Form8886Owner,
  statementNumber: number,
  statementCount: number,
  canonicalTemplate: Uint8Array,
): Promise<Uint8Array> {
  const source = disclosureSchema.parse(sourceInput);
  if (source.taxpayer_ssn !== owner.ssn) {
    throw new Error("Form 8886 PDF owner differs from disclosure");
  }
  if (
    !Number.isInteger(statementNumber) || !Number.isInteger(statementCount) ||
    statementNumber < 1 || statementNumber > statementCount
  ) throw new Error("Invalid Form 8886 PDF statement numbering");
  const document = await PDFDocument.load(canonicalTemplate, {
    updateMetadata: false,
  });
  if (document.getPageCount() !== 2) {
    throw new Error("Form 8886 canonical template must have two pages");
  }
  const form = document.getForm();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const continuations: { line: number; label: string; value: string }[] = [];
  const fieldLine = (page: number, number: number) => {
    if (page === 1) {
      if (number <= 10) return 0;
      if (number <= 13) return 1;
      if (number === 14) return 3;
      if (number === 15) return 4;
      return number <= 21 ? 5 : 6;
    }
    return number <= 11 ? 7 : 8;
  };
  const fieldLabel = (page: number, number: number): string => {
    if (page === 1) {
      if (number === 11) return "Line 1a - transaction names";
      if (number === 12) return "Line 1b - initial participation years";
      if (number === 13) return "Line 1c - reportable transaction numbers";
      if (number === 14) return "Line 3 - published guidance";
      if (number <= 21) return `Line 5 - entity ${(number - 16) % 2 + 1}`;
      return `Line 6 - fee recipient ${number < 29 ? 1 : 2}`;
    }
    if (number === 1) return "Line 7a - other tax benefit";
    return `Line 8 - party ${number < 22 ? 1 : 2}`;
  };
  const text = (page: number, number: number, value: string | number) => {
    const table = page === 1 && number >= 16 && number <= 21
      ? `Pg1Table[0].BodyRow${Math.floor((number - 16) / 2) + 1}[0].`
      : "";
    const field = form.getTextField(
      `topmostSubform[0].Page${page}[0].${table}f${page}_${number}[0]`,
    );
    const canonical = String(value).replace(/\s+/g, " ").trim();
    // The official entity widget caps input at nine digits; the printed form
    // instructions require the EIN hyphen. This packet is flattened below.
    if (
      page === 1 && (number === 18 || number === 19) &&
      /^\d{2}-\d{7}$/.test(canonical)
    ) {
      field.setMaxLength(10);
    }
    const width = field.acroField.getWidgets()[0].getRectangle().width - 4;
    let prefix = canonical;
    if (font.widthOfTextAtSize(canonical, 8) > width) {
      const line = fieldLine(page, number);
      if (line === 0) {
        throw new Error("Form 8886 filer identity exceeds the official field");
      }
      if (page === 1 && number >= 11 && number <= 13) {
        // Lines 1a-1c specifically require an additional list when it does
        // not fit. Other disclosure fields retain as much text as fits.
        prefix = "See Additional List";
        continuations.push({
          line,
          label: `${fieldLabel(page, number)} - additional list`,
          value: canonical,
        });
      } else {
        while (prefix && font.widthOfTextAtSize(prefix, 8) > width) {
          prefix = prefix.slice(0, -1);
        }
        const boundary = prefix.lastIndexOf(" ");
        if (boundary <= 0) {
          throw new Error("Form 8886 field contains a word too wide to render");
        }
        prefix = prefix.slice(0, boundary);
        continuations.push({
          line,
          label: `${fieldLabel(page, number)} (remaining text)`,
          value: canonical.slice(prefix.length).trim(),
        });
      }
    }
    if (
      page === 1 && number >= 11 && number <= 13 &&
      field.getMaxLength() !== undefined &&
      prefix.length > field.getMaxLength()!
    ) {
      // Static output also supports the instructed lists/marker in widgets
      // whose interactive limit accepts only a single year or RTN.
      field.setMaxLength(prefix.length);
    }
    field.setText(prefix);
    field.setFontSize(8);
  };
  const box = (page: number, number: number, checked: boolean, copy = 0) => {
    const field = form.getCheckBox(
      `topmostSubform[0].Page${page}[0].c${page}_${number}[${copy}]`,
    );
    checked ? field.check() : field.uncheck();
  };
  const lines = (firstField: number, count: number, value: string) => {
    const words = value.replace(/\s+/g, " ").trim().split(" ");
    const rows = words.reduce<string[]>((result, word) => {
      const last = result[result.length - 1];
      if (
        last !== undefined &&
        font.widthOfTextAtSize(`${last} ${word}`, 8) <= 536
      ) return [...result.slice(0, -1), `${last} ${word}`];
      return [...result, word];
    }, []);
    if (rows.length > count) {
      const line = firstField === 5 ? 7 : 8;
      continuations.push({
        line,
        label: line === 7
          ? "Line 7e - transaction description (continued)"
          : `Line 8 - party ${
            firstField === 15 ? 1 : 2
          } involvement (continued)`,
        value: rows.slice(count).join(" "),
      });
    }
    rows.slice(0, count).forEach((row, index) =>
      text(2, firstField + index, row)
    );
  };
  text(
    1,
    1,
    [owner.lastName, owner.firstName, owner.middleInitial].filter(Boolean).join(
      " ",
    ),
  );
  text(
    1,
    2,
    `${owner.ssn.slice(0, 3)}-${owner.ssn.slice(3, 5)}-${owner.ssn.slice(5)}`,
  );
  if (owner.address.kind === "foreign") {
    text(1, 3, "See attached foreign mailing address");
    continuations.push({
      line: 0,
      label: "Taxpayer foreign mailing address",
      value: [
        owner.address.line1,
        owner.address.line2,
        owner.address.city,
        owner.address.province,
        owner.address.postal_code,
        ty2025IrsCountryName(owner.address.country),
      ].filter(Boolean).join(", "),
    });
  } else {
    text(
      1,
      3,
      [owner.address.line1, owner.address.line2].filter(Boolean).join(" "),
    );
    text(1, 4, owner.address.city);
    text(1, 5, owner.address.state);
    text(1, 6, owner.address.zip);
  }
  text(1, 7, statementNumber);
  text(1, 8, statementCount);
  text(1, 9, "1040");
  text(1, 10, "2025");
  box(1, 1, false);
  box(1, 1, true, 1);
  box(1, 2, source.initial_year_filer);
  box(1, 3, source.protective_disclosure);
  text(
    1,
    11,
    source.transactions.map((transaction) => transaction.name).join("; "),
  );
  text(
    1,
    12,
    source.transactions.map((transaction) =>
      transaction.initial_participation_year
    ).join("; "),
  );
  text(
    1,
    13,
    source.transactions.flatMap((transaction) =>
      transaction.reportable_transaction_numbers
    ).join(", "),
  );
  Object.values(ReportableCategory).forEach((category) =>
    box(1, categoryFields[category], source.categories.includes(category))
  );
  if (source.published_guidance) text(1, 14, source.published_guidance);
  text(1, 15, source.transactions.length);
  const parties = new Map(
    source.parties.map((party) => [party.party_id, party]),
  );
  const party = (id: string): Party => {
    const found = parties.get(id);
    if (!found) throw new Error("Form 8886 PDF has an undisclosed party");
    return found;
  };
  source.through_entities.forEach((entity, index) => {
    const involved = party(entity.party_id);
    if (index >= 2) {
      continuations.push({
        line: 5,
        label: `Line 5 - entity ${index + 1}`,
        value: [
          entity.entity_type,
          involved.foreign ? "Foreign" : "Domestic",
          involved.name,
          identifyingNumber(involved),
          `Schedule K-1 received: ${entity.k1_received_date ?? "none"}`,
        ].filter(Boolean).join("; "),
      });
      return;
    }
    const start = index === 0 ? 9 : 13;
    box(1, start, entity.entity_type === EntityType.Partnership);
    box(1, start + 1, entity.entity_type === EntityType.SCorporation);
    box(1, start + 2, entity.entity_type === EntityType.Trust);
    box(1, start + 3, involved.foreign);
    text(1, 16 + index, involved.name);
    text(1, 18 + index, identifyingNumber(involved));
    text(1, 20 + index, entity.k1_received_date ?? "none");
  });
  source.fee_recipients.forEach((recipient, index) => {
    const advisor = party(recipient.party_id);
    if (index >= 2) {
      continuations.push({
        line: 6,
        label: `Line 6 - fee recipient ${index + 1}`,
        value: [
          advisor.name,
          identifyingNumber(advisor),
          `Approximate fees paid: ${
            roundWholeDollars(recipient.approximate_fees_paid)
          }`,
          postalAddress(advisor.address),
        ].filter(Boolean).join("; "),
      });
      return;
    }
    const start = index === 0 ? 22 : 29;
    text(1, start, advisor.name);
    text(1, start + 1, identifyingNumber(advisor));
    text(1, start + 2, roundWholeDollars(recipient.approximate_fees_paid));
    if (advisor.address) {
      if (advisor.address.kind !== "us") {
        text(
          1,
          start + 3,
          [advisor.address.line1, advisor.address.line2].filter(Boolean).join(
            " ",
          ),
        );
        text(
          1,
          start + 4,
          [
            advisor.address.city,
            advisor.address.province,
            advisor.address.postal_code,
            advisor.address.country,
          ].filter(Boolean).join(", "),
        );
        return;
      }
      text(
        1,
        start + 3,
        [advisor.address.line1, advisor.address.line2].filter(Boolean).join(
          " ",
        ),
      );
      text(1, start + 4, advisor.address.city);
      text(1, start + 5, advisor.address.state);
      text(1, start + 6, advisor.address.zip);
    }
  });
  Object.values(TaxBenefit).forEach((benefit) =>
    box(
      2,
      benefitFields[benefit],
      source.benefits.some((item) => item.kind === benefit),
    )
  );
  const other = source.benefits.filter((benefit) =>
    benefit.kind === TaxBenefit.Other
  ).map((benefit) => benefit.description).join("; ");
  if (other) text(2, 1, other);
  text(
    2,
    2,
    roundWholeDollars(
      source.benefits.reduce(
        (total, benefit) => total + benefit.anticipated_amount,
        0,
      ),
    ),
  );
  text(2, 3, source.anticipated_benefit_year_count);
  text(2, 4, roundWholeDollars(source.total_investment_or_basis));
  lines(5, 7, form8886Narrative(source));
  source.parties.forEach((involved, index) => {
    if (index >= 2) {
      continuations.push({
        line: 8,
        label: `Line 8 - party ${index + 1}`,
        value: [
          involved.name,
          identifyingNumber(involved),
          postalAddress(involved.address),
          involved.tax_exempt ? "Tax-exempt" : "",
          involved.foreign ? "Foreign" : "",
          involved.related ? "Related" : "",
          involved.involvement_description,
          involved.relationship_description,
        ].filter(Boolean).join("; "),
      });
      return;
    }
    const start = index === 0 ? 12 : 22;
    const check = index === 0 ? 11 : 14;
    box(2, check, involved.tax_exempt);
    box(2, check + 1, involved.foreign);
    box(2, check + 2, involved.related);
    text(2, start, involved.name);
    text(2, start + 1, identifyingNumber(involved));
    text(2, start + 2, postalAddress(involved.address));
    lines(
      start + 3,
      index === 0 ? 7 : 6,
      [involved.involvement_description, involved.relationship_description]
        .filter(Boolean).join(" "),
    );
  });
  form.updateFieldAppearances(font);
  form.flatten();
  const bold = continuations.length
    ? await document.embedFont(StandardFonts.HelveticaBold)
    : font;
  for (
    const continuation of continuations.toSorted((a, b) => a.line - b.line)
  ) {
    const words = continuation.value.split(/\s+/);
    const rows = words.reduce<string[]>((result, word) => {
      if (font.widthOfTextAtSize(word, 10) > 504) {
        throw new Error("Form 8886 continuation has a word too wide to render");
      }
      const last = result.at(-1);
      if (
        last !== undefined &&
        font.widthOfTextAtSize(`${last} ${word}`, 10) <= 504
      ) {
        return [...result.slice(0, -1), `${last} ${word}`];
      }
      return [...result, word];
    }, []);
    for (let offset = 0; offset < rows.length; offset += 39) {
      const page = document.addPage([612, 792]);
      const name = [owner.lastName, owner.firstName, owner.middleInitial]
        .filter(Boolean).join(" ");
      if (font.widthOfTextAtSize(name, 10) > 504) {
        throw new Error(
          "Form 8886 continuation owner name exceeds page width",
        );
      }
      page.drawText(name, { x: 54, y: 742, size: 10, font: bold });
      page.drawText(
        `SSN ${owner.ssn.slice(0, 3)}-${owner.ssn.slice(3, 5)}-${
          owner.ssn.slice(5)
        }`,
        { x: 54, y: 726, size: 10, font },
      );
      page.drawText(
        `Form 8886 - statement ${statementNumber} of ${statementCount} - TY2025`,
        { x: 54, y: 700, size: 11, font: bold },
      );
      page.drawText(continuation.label, {
        x: 54,
        y: 680,
        size: 10,
        font: bold,
      });
      rows.slice(offset, offset + 39).forEach((row, index) =>
        page.drawText(row, { x: 54, y: 650 - index * 14, size: 10, font })
      );
      page.drawText(`Packet page ${document.getPageCount()}`, {
        x: 54,
        y: 54,
        size: 9,
        font,
      });
    }
  }
  return await document.save();
}
