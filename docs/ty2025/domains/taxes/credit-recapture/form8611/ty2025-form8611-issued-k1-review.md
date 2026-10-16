# Form8611 issued partnership K1 building recapture, October6

The existing Form8611 source/native/PDF TODO now has an issued section42(j)(5) partnership codeF path for Single and an actual MFJ spouse recipient. Structured synthetic issued K1 facts retain issuer EIN/name, recipient TIN, statement year/reference, each building BIN/address/date, issuer total including interest, distributive share and allocated amount. Each building also retains recipient no-unused-credit review and no-other-recapture confirmation. No external issuer byte authentication or accepted-filing history is asserted.

[IRS Form8611 instructions](https://www.irs.gov/pub/irs-pdf/f8611.pdf) direct pass-through recipients to line8; section42(j)(5) interest is included in the passed-through amount rather than added again on line11. The [2025 partner instructions](https://www.irs.gov/instructions/i1065sk1) identify box20 codeF for section42(j)(5) recapture. This path uses actual issuer allocations, not taxpayer own-credit historical worksheets.

The issuer's building6000/4000 totals at25% yield1500/1000, exactly matching issued codeF2500. Both official first-page8611 copies leave own-credit lines1–7 and partnership-only16–17 blank. Reviewed no-unused-credit facts give lines9/11/13/15=0; combinedline14=2500 reaches Schedule2 line16/21 and1040 line23. Issued W2 wages80000 remain income, giving final Single tax11555/refund3445 and MFJ tax7846/refund7154. Each complete packet has6 pages.

Native and PDF independently reconstruct every building from actual retained K1 sources and compare issuer/recipient identities, amounts, dates and metadata. Added issuer metadata cannot bypass the legacy PDF gate without a valid schema and complete source replay. Missing whole source identity with retained issued K1 is rejected. Duplicate building BINs, invalid dates, changed allocations, detached K1, wrong taxpayer/spouse and final taxes reject. Wider own-credit history, unused-credit carryovers, bond details and other issuer types remain guarded for printable export; no parent closure or IRS acceptance claimed.

Initial two full source cases/20 tamper probes passed2/0. Final six-file input/K1/native/PDF/coverage/source gate passes **109/0 (9s)** including22 native/PDF mutations; log `/tmp/opentax-f8611-source-compat-final.log`. Held replay confirms2 cases/all12 pages/source/catalog/template hashes/full2025v5.4XSD, `/tmp/opentax-f8611-held-check.log`. All12 pages actually reviewed on four contact sheets; heldPDF bytes equal reviewed originals.

Artifacts: `.state/research/2026-10-06-form8611-issued-k1-held`; renders in sibling `2026-10-06-form8611-issued-k1-rendered`.

- `single-issued-k1-lihtc-recapture.json`: `ebc58cd6c8fe2d94c7b2078af975c1cda7b0e50d141a15b9ba8d33c5e759aa09`
- `single-issued-k1-lihtc-recapture.xml`: `dbcb04113ec0391d5fdc2d7c15c1f4492bd29d5191b522d6ff53adc2ff39aa1d`
- `single-issued-k1-lihtc-recapture.pdf`: `d0755adc65f3c59da9aa1e13a630daf6265e2fd22a21b8aa6b24b889d081f7bb`
- `joint-spouse-issued-k1-lihtc-recapture.json`: `bf989bfb98dd2f8a5bee28cb2a97523bbe44cad645e86b8bb9bd31a948160051`
- `joint-spouse-issued-k1-lihtc-recapture.xml`: `8ca09bd5b14544e571d6f9c6f1539eacee5366c0654ba2f32560b8393759b6c5`
- `joint-spouse-issued-k1-lihtc-recapture.pdf`: `11588f7bc7b1602586b86e06b8167feeba85cea67f4db54c77935b9cb2d73da7`
