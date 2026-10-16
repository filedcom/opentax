# TY2025 Form 4972: multiple issued beneficiary copies with death and estate allocations

The [official 2025 Form 4972 instructions](https://www.irs.gov/pub/irs-prior/f4972--2025.pdf), pages 3–4, require one election for one participant's distributions in the year, Form 1099-R box 9a aggregation and recipient apportionment, the full allowable ordinary death-benefit exclusion on line 9 for multiple nontrust recipients, and an administrator-sourced federal estate-tax allocation. The Death Benefit Worksheet allocates the elected recipient's exclusion between capital and ordinary income. Estate tax attributable to capital reduces line 6; its remaining full-plan amount reaches line 18. Annuity box 8 uses its distinct percentage.

The existing same-beneficiary group now accepts source-valid death-only, estate-only and combined death/estate allocations for two or three issued copies from one participant, plan and payer. Each elected copy must have the same recipient, box 9a percentage, plan and complete-balance statement, with distinct 1099-R references. The public election supplies a participant-wide death allocation and/or separate estate administrator and estate-return records. The graph matches death participant and recipient identities to the actual group; native and PDF preparation recompute the Form 4972 lines and bind every issued copy and allocation. An unallocated dollar, reused source reference, changed owner/plan, or changed Form 1040 tax fails.

Twenty-six complete packets cover all thirteen combinations below for both two and three copies. Where a Part II NUA election is present, the actual source boxes include taxable cash, box 3 gain and box 6 NUA. Three additional Part III-only NUA routes have actual positive box 6 and zero box 3, without a Part II election. Where annuity is present, source copies carry box 8 value and a separate 25% box 8 percentage. Routes without NUA have zero issued box 3/6 amounts and use Part III only. All packets have an actual 50% box 9a beneficiary share, participant-wide $5,000 death exclusion where applicable, and $2,000 full distribution federal estate tax where applicable.

| Source route | Two-copy Form 4972 line 30 | Three-copy line 30 |
| --- | ---: | ---: |
| Death and estate, NUA and annuity | $2,215 | $4,510 |
| Estate and NUA and annuity, Part III only | $2,490 | $4,735 |
| Death and NUA, Part III only | $2,010 | $4,105 |
| Estate and NUA, Part III only | $2,290 | $4,405 |
| Death and NUA | $2,135 | $4,235 |
| Estate and NUA | $2,420 | $4,535 |
| Death and estate, NUA | $1,990 | $4,075 |
| Death and annuity | $1,895 | $3,810 |
| Estate and annuity | $2,165 | $4,095 |
| Death and estate, annuity | $1,755 | $3,660 |
| Death only | $1,675 | $3,385 |
| Estate only | $1,955 | $3,685 |
| Death and estate | $1,535 | $3,235 |

For the combined NUA and annuity packet, the two-copy source sums are box 2a $20,000, box 3 $4,000, box 6 $2,000, and box 8 $1,500. The NUA capital portion is $400. The recipient's $2,500 death share allocates $500 to capital, and the recipient's $1,000 estate-tax share allocates $200 to capital. Thus line 6 is $4,400 − $500 − $200 = $3,700; line 7 is $740, line 9 is $4,000 and line 18 is $1,600. On Part III, line 23 is $2,904 and the 1986 rate schedule gives line 24 of $349; annuity line 26 is $494 and line 27 is $54. The box 8 portion is removed before dividing the remaining tax by the 50% box 9a share: line 29 = ($3,490 − $540) / 2 = $1,475, and line 30 = **$2,215**. For three copies, the corresponding source sums are $30,000/$6,000/$4,000/$3,000; lines 6/7/9/18 are $6,100/$1,220/$4,000/$1,600. Rate-schedule lines 24/27 are $787/$129, giving line 29 = ($7,870 − $1,290) / 2 = $3,290 and line 30 = **$4,510**.

The focused source/native/full TY2025 v5.4 `Return1040.xsd`/flattened PDF/negative test passed **3/0** (`/tmp/opentax-form4972-beneficiary-multicopy-death-estate-focused-final-oct6.log`, SHA-256 `882f984b375039ae4b42dd94a3cf71a5b32f672254da76397e1b629769a4ebbe`). The 36-file Form 4972 and Form 1099-R preservation suite passed **298/0 in 3m7s** (`/tmp/opentax-form4972-beneficiary-multicopy-death-estate-preservation-final-oct6.log`, SHA-256 `9f35a896559237ee54257299d56dcb76e3fdcc1e528aed26383dca23e4cadbc6`). Each of the 26 complete PDFs has Form 1040 pages 1–2 and one Form 4972 page 3; all 78 rendered pages were reviewed in seven contact sheets under `.state/research/2026-10-06-form4972-beneficiary-multicopy-death-estate/rendered/`. The 26-entry PDF SHA-256 manifest is `/tmp/opentax-form4972-beneficiary-multicopy-death-estate-pdf-sha256-oct6.txt` (manifest SHA-256 `0df29b541b2864c4f818c0f902ce4d9bcb34b8db0ee453d8254c4ab2623e68d5`). The combined NUA/annuity PDF SHA-256 values are `8b0b298384cc42afc959334f7b2cce5bc4a9bd8d6cc642b72cddbafa8802c80d` (two copies) and `384ad854590440b1d5d89f66688b4ef2de180962f2fd262afe12518945c6d9f0` (three copies). The preexisting two/three-copy no-death PDFs remain byte-identical to the six reviewed prior pages, at hashes `cbd76317c9c4170c40a79a5b2c1fa234200bf4ef24a78bcb4e20c6e37c995b49` and `5a7534a1a45456b272a5b2e1051dd6087fc2cc05e53c3f805294fdef867ae7c1`.

The administrator, filed estate-return workpaper, and issuer references are reviewed source facts, not authenticated external bytes. Issuer/estate authentication, historical prior-election verification, IRS business rules, and ATS acceptance remain external evidence boundaries; this local proof does not claim them. Unequal/nonintegral partial shares and separate-spouse beneficiary groups remain guarded.
