import { assertRejects } from "@std/assert";
import { PDFDocument } from "pdf-lib";
import { sha256Hex } from "../../../2025/prepared-source.ts";
import { bindForm8862PriorNoticeCopies } from "./prior_notice_byte_binding.ts";

const fields = {
  claim_ctc: true,
  ctc_disallowed_year: 2023,
  ctc_disallowance_notice_reference: "notice-ctc-2023",
  claim_aotc: true,
  aotc_disallowed_year: 2022,
  aotc_disallowance_notice_reference: "notice-aotc-2022",
  credit_disallowance_ban_active: false,
};

async function noticePdf(title: string): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.setTitle(title);
  document.addPage([300, 200]);
  return document.save();
}

Deno.test("Form 8862 binds each reviewed credit notice to its retained PDF bytes", async () => {
  const ctcBytes = await noticePdf("CTC synthetic notice");
  const aotcBytes = await noticePdf("AOTC synthetic notice");
  const reviews = [{
    credit: "ctc_odc",
    notice: {
      disallowed_year: 2023,
      notice_reference: "notice-ctc-2023",
      notice_copy_reference: "ctc-copy",
      taxpayer_ssn: "123-45-6789",
      nonclerical_disallowance_verified: true,
      no_active_ban_verified: true,
    },
    notice_copy_sha256: await sha256Hex(ctcBytes),
  }, {
    credit: "aotc",
    notice: {
      disallowed_year: 2022,
      notice_reference: "notice-aotc-2022",
      notice_copy_reference: "aotc-copy",
      taxpayer_ssn: "123-45-6789",
      nonclerical_disallowance_verified: true,
      no_active_ban_verified: true,
    },
    notice_copy_sha256: await sha256Hex(aotcBytes),
  }];
  const copies = [
    { notice_copy_reference: "ctc-copy", bytes: ctcBytes },
    { notice_copy_reference: "aotc-copy", bytes: aotcBytes },
  ];
  const general = {
    filing_status: "single",
    taxpayer_ssn: "123456789",
    prior_ctc_disallowance_review: reviews[0].notice,
    prior_aotc_disallowance_review: reviews[1].notice,
  };
  await bindForm8862PriorNoticeCopies(
    fields,
    reviews,
    copies,
    "123456789",
    general,
  );
  await assertRejects(() =>
    bindForm8862PriorNoticeCopies(
      fields,
      reviews,
      [{ ...copies[0], bytes: aotcBytes }, copies[1]],
      "123456789",
      general,
    )
  );
  await assertRejects(() =>
    bindForm8862PriorNoticeCopies(
      fields,
      [{
        ...reviews[0],
        notice: {
          ...reviews[0].notice,
          disallowed_year: 2021,
        },
      }, reviews[1]],
      copies,
      "123456789",
      general,
    )
  );
  await assertRejects(() =>
    bindForm8862PriorNoticeCopies(
      fields,
      reviews,
      copies,
      "987654321",
      general,
    )
  );
  await assertRejects(() =>
    bindForm8862PriorNoticeCopies(
      fields,
      reviews,
      copies.slice(0, 1),
      "123456789",
      general,
    )
  );
  await assertRejects(() =>
    bindForm8862PriorNoticeCopies(fields, reviews, copies, "123456789", {
      ...general,
      prior_ctc_disallowance_review: {
        ...general.prior_ctc_disallowance_review,
        notice_copy_reference: "other-ctc-copy",
      },
    })
  );
  await assertRejects(() =>
    bindForm8862PriorNoticeCopies(fields, reviews, copies, "123456789", {
      ...general,
      taxpayer_ssn: "987654321",
    })
  );
  await assertRejects(() =>
    bindForm8862PriorNoticeCopies(
      { ...fields, credit_disallowance_ban_active: true },
      reviews,
      copies,
      "123456789",
      general,
    )
  );
  const fakePdf = new TextEncoder().encode("%PDF-1.7 not actually a PDF");
  const fakeDigest = await sha256Hex(fakePdf);
  await assertRejects(() =>
    bindForm8862PriorNoticeCopies(
      fields,
      [{ ...reviews[0], notice_copy_sha256: fakeDigest }, reviews[1]],
      [{ ...copies[0], bytes: fakePdf }, copies[1]],
      "123456789",
      general,
    )
  );
});
