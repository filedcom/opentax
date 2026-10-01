import { assertRejects } from "@std/assert";
import { sha256Hex } from "../../../2025/prepared-source.ts";
import { bindForm8862PriorNoticeCopies } from "./prior_notice_byte_binding.ts";

const fields = {
  claim_ctc: true,
  ctc_disallowed_year: 2023,
  ctc_disallowance_notice_reference: "notice-ctc-2023",
  claim_aotc: true,
  aotc_disallowed_year: 2022,
  aotc_disallowance_notice_reference: "notice-aotc-2022",
};
const ctcBytes = new TextEncoder().encode("%PDF-1.7 CTC notice fixture");
const aotcBytes = new TextEncoder().encode("%PDF-1.7 AOTC notice fixture");

Deno.test("Form 8862 binds each reviewed credit notice to its retained PDF bytes", async () => {
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
  await bindForm8862PriorNoticeCopies(fields, reviews, copies, "123456789");
  await assertRejects(() =>
    bindForm8862PriorNoticeCopies(
      fields,
      reviews,
      [{ ...copies[0], bytes: aotcBytes }, copies[1]],
      "123456789",
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
    )
  );
  await assertRejects(() =>
    bindForm8862PriorNoticeCopies(
      fields,
      reviews,
      copies,
      "987654321",
    )
  );
  await assertRejects(() =>
    bindForm8862PriorNoticeCopies(
      fields,
      reviews,
      copies.slice(0, 1),
      "123456789",
    )
  );
});
