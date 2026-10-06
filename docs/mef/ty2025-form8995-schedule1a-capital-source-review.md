# Form8995 Schedule1A and personal-sale source reconciliation

IRS2025 [Form8995 instructions](https://www.irs.gov/instructions/i8995) line11 subtract Form1040 lines12e and13b. Schedule1A now contributes its calculated deduction to the QBI node; both income-cap computation and filed line11 use it. Native/PDF export independently replays actual Schedule1A source and final line13b, including zero clipping conflicts.

Personal-sale gain is independently recomputed from retained1099K/8949 sale rows and ScheduleD. Only transaction and filing-status ScheduleD input is retained in this bounded one-ScheduleC path. Direct aggregate-only capital or other capital input remains outside this route. Full replay compares finalized ScheduleD, Form1040 gain and8995 net-capital lines; qualified dividends retain their distinct issued source check.

Four complete synthetic source packets pass source/native/full2025v5.4XSD/PDF and forty native/PDF tamper probes; all54 pages were rendered and visually inspected across16 contact sheets. Positive tips: NEC80000 less advertising8000 gives profit72000, SE10173/half5087, AGI66913, sourced Schedule1A12000; pre-QBI taxable39163, deduction7833, finaltax13694. Zero-tip case retains QBI9293 with deduction0 and SE1413. Personal sale proceeds800 less basis300 produce500; actual business receipts50000 give QBI46467, pre-QBI taxable31217, capital500, deduction6143 and finaltax9776. Zero-cap case retainsQBI1858, capital500, deduction0, tax283.

Source fixtures are synthetic reviewed facts; external issuer authentication, wider capital combinations and IRS acceptance remain unproven. Final five-file standalone QBI/native/source/all-registered-return-replay/Pub974 gate passes66/0 (41s), `/tmp/opentax-qbi-schedule1a-capital-final-v5.log`; SHA256 `7fd6f7a4fd87bb2777d4743b567340bf88026fca58017e77d7c3f0fad738157c`. The pure-schema import-cycle repair is a dependency; preliminary gates hit that known cycle before it was applied. No full-suite pass is claimed.

## Reviewed artifact hashes

- `capital-positive.json`: `ba621812e9797174ff80962d87b9586173aec8995b5c1a676f08200e4a7849cc`
- `capital-positive.pdf`: `8625317c186801dc60594cf7583a48ae4f45c328df5e3e58413cc0061cc67ad4`
- `capital-positive.xml`: `6165523fdf04e2dd69566b427b32fc5e2e13f8bdcb94542318273ba83d9b35b5`
- `capital-zero.json`: `ba028e95abfd53eeba264b2b0c4ce13a769a979ffaa1361d9099561eee1ca6dc`
- `capital-zero.pdf`: `7a50a62758f90fec88e1d9d6c45f65a699b592654940542e9529d82680a16579`
- `capital-zero.xml`: `cd11a96fa33cf8a5d600a8d4b43d1ab86510946c31154121968dcb25c9afba02`
- `tips-positive.json`: `1d64ef114f7865df67334ac98bb63537b545a1a4403440acddd8e04504bd5e83`
- `tips-positive.pdf`: `058595808c139e3a2c61cae3744c166642a04302dff173eda746112f634148c0`
- `tips-positive.xml`: `599b9a731fe60c8f5980d4a1071e387bab4570898fc1d652506e3173a1947084`
- `tips-zero.json`: `cf195a5628797c08188eeaee7ce8a69504bc2f382934741c3c535eeb117ec10e`
- `tips-zero.pdf`: `6b71b4ccfc674981fcc4816fdd5960421ed04406cd49bde3e575df6c0d3f9891`
- `tips-zero.xml`: `92572c7558aee3eb7bc33792b37104d62e1468bbb57f7412f23bbe6ea116aad9`

Current main six-file QBI/paired-health/registered-return-replay/Pub974 gate passes74/0 (1m5s), `/tmp/opentax-qbi-paired-source-main.log`; SHA256 `7c08ddc7fb12914da21d75eea72f620ccd3cf8f87956c40d2a652aa0fe91b02a`. All four current-main PDFs are byte-identical to the visually reviewed outputs. Regenerated XML timestamps change their digests; current XML passes fullXSD. Current artifact hashes:

- `capital-positive.xml`: `3e3b2b45f21f2ffa0919af0ef1e2ebddb2ef0900ad0c0a90497ac7d3e8866309`
- `capital-zero.xml`: `ca3e5e46f7140a3cef0e3d989d078f95950f7a61610e2fe6358462b3433af52b`
- `tips-positive.xml`: `f8f9cbf6fca311511a826695706e79c18857737768a2b49638be3bcfa5e52d05`
- `tips-zero.xml`: `cb342d990063cec0d7173f9910f30bd37d676bd1ae59452e8504ff9138f81a63`


## Superseding deductible-business-tip QBI correction

The earlier bounded proof established Schedule1A taxable-income cap and actual personal-sale capital joins, but retained deducted business tips in QBI. Source660521649 now excludes the actual deductible business share: wholly excludedQBI9293→0 with noForm8995, and positiveQBI66913→54913. The actual capital-source joins and cap ordering remain verified by currentmain62/0. Use [current tip source review](ty2025-qualified-business-tips-qbi-source-review.md) for corrected native/PDF packets; older reviewed tip PDF bytes are historical evidence, not current-output claims.
