# TY2025 Form 8941 owned cash farm SHOP proof

Scope: one directly owned cash Schedule F grain farm, six actual payroll workers, one complete SHOP employer source with two QHP offerings and dated premium invoices/payments, issued agricultural-program 1099-G and secondary farm custom-work 1099-NEC. The farm's Schedule F line 15 retains gross premiums in the source and files the full determined Form 8941 reduction. No scalar farm-profit substitution. SHOP worker W-2/payroll identities and source receipt copies reconcile to the farm records. The combined case binds the same six issued farm W-2 copies to six distinct Form 5884 certifications.

| Packet | Schedule F line 15 raw → filed | Schedule F profit | Determined 8941 | 8941 current use | WOTC determined/use | Pages |
|---|---:|---:|---:|---:|---:|---:|
| full-use | 40,245 → 25,631 | 164,369 | 14,614 | 14,614 | — | 23 |
| limited-use | 40,245 → 25,631 | 84,369 | 14,614 | 5,942 | — | 23 |
| zero-use | 40,245 → 25,631 | 4,369 | 14,614 | 0 | — | 22 |
| SHOP + WOTC | 40,245 → 25,631 | 178,769 | 14,614 | 7,322 | 14,400 / 14,400 | 24 |

All four XMLs passed the local TY2025 full Return1040 XSD. All four PDFs were rendered in full to contact sheets and every page visually reviewed. See `*-all-pages.png`, packet JSON/XML/PDF/text files, `final-focused.log`, and `preservation-test.log` here. The combined Form 3800 contains separate 4b=14,400 and 4h=14,614 determined rows; explicit current use applies WOTC first. Source negatives include farm identity, EIN, full employee/payroll set, issued receipts and their filed copy values, gross benefits, full determined reduction, Form 3800 farm identity, SHOP payment, and combined WOTC/SHOP W-2 mismatch.

Limits: direct one-farm sole proprietor route with ordinary payroll and actual reviewed SHOP qualification; no expanded controlled farm group, no excluded worker coverage in this bounded farm route, no live IRS acceptance assertion. Prior Schedule C common-control/spouse/seasonal/multi-QHP routes preserved by regression.


## Current-main verification

Farm source8c9a77447 passes current-main16/0(1m29s), including controlled farm WOTC, paired owner health, and Schedule1A/capital QBI source preservation. Four current-main PDFs are byte-identical to the agent-reviewed outputs; all92 pages reviewed. Full source XMLs pass local2025v5.4XSD. Current artifact hashes (regenerated XML may have different return timestamps):

- `full-use.json`: `48743aff3ed942c39d365c952acbe6ac02c8d844e0c9de6b7e30b6a0089bdb59`
- `full-use.pdf`: `c6ef5f231201560e5901e4c767d7681254f1a54abe46645d03ed1dd62e719d63`
- `full-use.xml`: `6a4e724dfa2171e7d270fd03058ad8bd9b7678894bb88bf7f82afdfadeb45f3e`
- `limited-use.json`: `60e876d9549bf44b4ba97016d0d5bf6619c9b246bdcd536cf82642b0c5ff026d`
- `limited-use.pdf`: `e58375df32c6ece5c1c37510f28fbac09471c0dc93cc9b92cdd0320613c99dd1`
- `limited-use.xml`: `07e7011ebe6c24e55f026c018a4c218eceedca01b2ee7c99114999c3d79ba9c2`
- `shop-wotc.json`: `391e269c7eb9ed01145222df1289bc40201d735d4201b9075f775f1012394aad`
- `shop-wotc.pdf`: `a1160728152c305f49d432fe7baea20be8a88b906a4d1e6a32c88884abddba6b`
- `shop-wotc.xml`: `26b7e347b2dfa9d0324496c8a3188ef10c0e30ce46a5b78c466956e882b1e58a`
- `zero-use.json`: `62cf8992a526a42320f29869b3203feb10d3f02e240da37aefe768032e4050cd`
- `zero-use.pdf`: `4e7b89355bf4e504e5764ab91f8cf223f59d23734db0fe920ca97d92eca4f6f8`
- `zero-use.xml`: `0dbad71fb16a3ca555f9fc7fa8c30b045e8d0bb9432b1e72b814c163fe1778ef`

Main log `/tmp/opentax-farm-shop-current-main.log`, SHA256 `fee152e078cb70db6e5f04de3c6606140198ca012282ca558960f5dd4057fad2`. Source records are reviewed synthetic facts, not authenticated external issuer bytes or IRS acceptance.
