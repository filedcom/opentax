import { assertRejects } from "@std/assert";
import { sha256Hex } from "../../../2025/prepared-source.ts";
import { bindForm8814PlainInterestIssuerCopies } from "./issuer_byte_binding.ts";

const firstBytes = new TextEncoder().encode(
  "%PDF-1.7 child first 1099-INT fixture",
);
const secondBytes = new TextEncoder().encode(
  "%PDF-1.7 child second 1099-INT fixture",
);
const item = {
  child_name: "Alex Example",
  child_name_control: "EXAM",
  child_ssn: "123-45-6789",
  child_age_eligible: true,
  child_required_to_file: true,
  child_income_only_permitted_types: true,
  child_no_joint_return: true,
  child_no_estimated_payments: true,
  child_no_withholding: true,
  parent_eligible_to_elect: true,
  interest_income: 2_000,
  source_review: {
    source_document_reference: "child-interest-packet",
    tax_year: 2025,
    child_ssn: "123-45-6789",
    electing_parent_ssn: "987-65-4321",
    eligibility_reviewed: true,
    income: { interest_income: 2_000 },
  },
};

Deno.test("Form 8814 binds the exact two-issuer plain-interest packet to retained bytes", async () => {
  const packet = {
    packet_reference: "child-interest-packet",
    issuers: [{
      tax_year: 2025,
      form_kind: "1099_int",
      issuer_tin: "111223333",
      child_ssn: "123-45-6789",
      source_document_reference: "child-1099-int-1",
      source_document_sha256: await sha256Hex(firstBytes),
      box1_taxable_interest: 1_200,
      no_other_reportable_boxes_or_adjustments: true,
    }, {
      tax_year: 2025,
      form_kind: "1099_int",
      issuer_tin: "444556666",
      child_ssn: "123-45-6789",
      source_document_reference: "child-1099-int-2",
      source_document_sha256: await sha256Hex(secondBytes),
      box1_taxable_interest: 800,
      no_other_reportable_boxes_or_adjustments: true,
    }],
  };
  const copies = [
    { source_document_reference: "child-1099-int-2", bytes: secondBytes },
    { source_document_reference: "child-1099-int-1", bytes: firstBytes },
  ];
  await bindForm8814PlainInterestIssuerCopies(
    item,
    "987654321",
    packet,
    copies,
  );
  await assertRejects(() =>
    bindForm8814PlainInterestIssuerCopies(
      item,
      "987654321",
      packet,
      copies.slice(0, 1),
    )
  );
  await assertRejects(() =>
    bindForm8814PlainInterestIssuerCopies(
      item,
      "987654321",
      packet,
      [{ ...copies[0], bytes: firstBytes }, copies[1]],
    )
  );
  await assertRejects(() =>
    bindForm8814PlainInterestIssuerCopies(
      item,
      "987654321",
      {
        ...packet,
        issuers: [
          packet.issuers[0],
          { ...packet.issuers[1], box1_taxable_interest: 799 },
        ],
      },
      copies,
    )
  );
  await assertRejects(() =>
    bindForm8814PlainInterestIssuerCopies(
      item,
      "987654321",
      {
        ...packet,
        issuers: [
          packet.issuers[0],
          { ...packet.issuers[1], issuer_tin: "111223333" },
        ],
      },
      copies,
    )
  );
  await assertRejects(() =>
    bindForm8814PlainInterestIssuerCopies(
      item,
      "987654321",
      {
        ...packet,
        issuers: [
          packet.issuers[0],
          { ...packet.issuers[1], child_ssn: "000000000" },
        ],
      },
      copies,
    )
  );
  await assertRejects(() =>
    bindForm8814PlainInterestIssuerCopies(
      { ...item, dividend_income: 100 },
      "987654321",
      packet,
      copies,
    )
  );
});
