# TY2025 registered PDF field inventory — October 10

## Scope and result

At runtime `a31000e82`, all 118 registered PDF descriptors (115 distinct pending
keys) map to 116 IRS template URLs. Every scalar, filer, extra and expanded row
mapping was checked through each row descriptor's declared maximum. All 7,979
mapped occurrences resolve to the expected text, checkbox or radio field class
and have at least one widget. No missing field, wrong type, widget absence or
configured digest mismatch was observed. Counts include repeated mappings and
are not a count of distinct tax lines or supported filing situations.

The primary cache supplied 86 descriptors. Sixteen more used retained review
caches with consistent candidate hashes; the remaining 16 exact descriptor URLs
were fetched from IRS into a separate evidence cache, all returning PDF bytes
with HTTP 200. URL, selected path, full SHA-256 and configured pins are retained
in the private inventory. Older revision years are the descriptors' referenced
revisions; this check does not independently approve their TY2025 applicability.

An independent pypdf reader confirms all 7,979 canonical field names and `/FT`
types, including checkbox/radio flag checks: 7,238 text mappings and 741 checkbox
mappings, with no radio mapping currently registered. Only one descriptor
configures a digest pin; recording the other hashes does not pin their runtime
loads. No errors were observed by either reader. The normal registry regression
now additionally
asserts field class and widget presence, including extra and every declared row
mapping; previously its real-template checks asserted names only.

## Limits

This is an exhaustive mapping check for the current registry, not a visual
review or proof that every needed line has a mapping. Page selection, labels,
checkbox tax semantics, correct source/owner values, overflow content, generated
statements and full-return filing applicability still require their route
checks. A widget's existence does not prove its final rendered value or rule out
an orphaned duplicate widget. No filled output or new reviewed-page total is
claimed. Existing deferred PDF qualifications remain unchanged.

The final selected gate passed **866 tests, zero failures** across the builder,
template cache and complete descriptor registry (1m43s). The initial gate passed
865 tests and failed
one header-text test because `pdftotext` was absent from PATH; it was rerun with
the retained Poppler environment. No production mapping or builder code changed.

Private evidence: `.state/research/pdf-field-inventory-2026-10-10/` retains
initial and complete inventories, downloaded templates and provenance,
independent reader output, regression logs and hashes.

## Descriptor inventory

Each row passed name/type/widget checks. The abbreviated digest identifies the
actual inspected template bytes; the private inventory retains the full digest.

| Registry index | Pending key | Template pages | Mapped occurrences | SHA-256 prefix |
| ---: | --- | ---: | ---: | --- |
| 0 | `f1040` | 2 | 164 | `3d31c226df0d` |
| 1 | `f4852` | 2 | 33 | `810e5e4df302` |
| 2 | `w2g` | 8 | 22 | `cedc526e5620` |
| 3 | `schedule1` | 2 | 48 | `8dafec719f6a` |
| 4 | `schedule1a` | 2 | 51 | `64f97b38ff42` |
| 5 | `schedule2` | 2 | 43 | `64d867b68333` |
| 6 | `schedule3` | 1 | 29 | `008cfd3fe3eb` |
| 7 | `f8812` | 2 | 39 | `6936462d67e2` |
| 8 | `schedule_a` | 1 | 33 | `c14acf3478f4` |
| 9 | `schedule_b` | 1 | 72 | `dd1ec3719954` |
| 10 | `schedule_c` | 2 | 102 | `ddf401dbe060` |
| 11 | `schedule_d` | 2 | 53 | `90564c8b7e49` |
| 12 | `schedule_e` | 2 | 144 | `c5e2c8fa0ec5` |
| 13 | `form7203` | 2 | 29 | `c5e2c8fa0ec5` |
| 14 | `eitc` | 2 | 38 | `b6dab52511ec` |
| 15 | `schedule_f` | 2 | 89 | `c6f7f19e1a4f` |
| 16 | `schedule_h` | 2 | 60 | `d04de932bd7d` |
| 17 | `schedule_j` | 2 | 27 | `5c888d02d8f1` |
| 18 | `schedule_lep` | 2 | 23 | `8234fbbc8294` |
| 19 | `f9000` | 4 | 8 | `3cca14cd58ef` |
| 20 | `schedule_r` | 2 | 27 | `9b1acf56189a` |
| 21 | `schedule_se` | 2 | 19 | `05bc2b3e1dfc` |
| 22 | `form7203` | 2 | 90 | `e138560a8c5d` |
| 23 | `form461` | 1 | 16 | `f143e18a8954` |
| 24 | `form982` | 1 | 5 | `2ef53d44f526` |
| 25 | `form_1116` | 2 | 93 | `2575162f86c3` |
| 26 | `form1116_schedule_b` | 2 | 66 | `32ca6e58c939` |
| 27 | `f2106` | 2 | 37 | `e81190c31837` |
| 28 | `f2210f` | 1 | 19 | `d02c73f9f75e` |
| 29 | `f2439` | 8 | 14 | `430e5aa3f7e7` |
| 30 | `form2441` | 2 | 48 | `6c3c2d19163f` |
| 31 | `form2555` | 3 | 45 | `979a90f0f837` |
| 32 | `f4136` | 4 | 271 | `87ea4218f72f` |
| 33 | `f3468` | 12 | 22 | `47d5d3524637` |
| 34 | `f3800` | 9 | 1920 | `cdfb169a6920` |
| 35 | `f4136` | 4 | 193 | `86ce549a7f1e` |
| 36 | `form4137` | 2 | 31 | `f2f7a8220e10` |
| 37 | `f4255` | 5 | 35 | `90c2e3f99a98` |
| 38 | `form4562` | 3 | 52 | `c05f9d1f5e26` |
| 39 | `form4684` | 4 | 16 | `911e0fe84ada` |
| 40 | `form4797` | 2 | 104 | `e8ab787f2caa` |
| 41 | `f4835` | 3 | 61 | `8ecc6172e79d` |
| 42 | `form4952` | 4 | 17 | `5113c1669c7c` |
| 43 | `form4972` | 4 | 40 | `d3e05491dca9` |
| 44 | `form5329` | 3 | 27 | `2ad77023aebb` |
| 45 | `f5471_parent` | 6 | 126 | `2dabaa1a9643` |
| 46 | `f5471_schedule_e` | 3 | 38 | `bb6cf8544939` |
| 47 | `f5471_schedule_h` | 1 | 32 | `0a32a1ca8960` |
| 48 | `f5471_schedule_i1` | 1 | 35 | `7277151a1e66` |
| 49 | `f5471_schedule_j` | 3 | 31 | `cf05e47bdabb` |
| 50 | `f5471_schedule_m` | 2 | 15 | `02596e98ac8f` |
| 51 | `f5471_schedule_p` | 4 | 32 | `e9bfe6e8f33b` |
| 52 | `f5471_schedule_q` | 4 | 59 | `f63a48db0aa5` |
| 53 | `f5471_schedule_r` | 1 | 8 | `5a05f5411b38` |
| 54 | `form5695` | 4 | 47 | `e2ac6a5c4b39` |
| 55 | `f5884` | 1 | 11 | `2d4d730f198d` |
| 56 | `form6198` | 1 | 13 | `8ae169186ad9` |
| 57 | `form6251` | 2 | 56 | `6995bfd29c6f` |
| 58 | `form6252` | 4 | 31 | `b2d42f3194dc` |
| 59 | `form6781` | 4 | 18 | `69212af20e69` |
| 60 | `form7206` | 1 | 15 | `822203c9bbd9` |
| 61 | `f7217` | 2 | 266 | `9b16ed91da1e` |
| 62 | `f8283` | 2 | 92 | `389ab1b7c01b` |
| 63 | `form8396` | 2 | 23 | `5c035af74840` |
| 64 | `form8582` | 3 | 203 | `d929884fe07b` |
| 65 | `form8582cr` | 2 | 47 | `1aee00af8e65` |
| 66 | `form8606` | 2 | 32 | `748a2bf2ef45` |
| 67 | `f8611` | 3 | 26 | `9ada6b3420ec` |
| 68 | `form8615` | 1 | 32 | `f1a9ce61a62f` |
| 69 | `form8621` | 4 | 135 | `9c063d71a970` |
| 70 | `form8814` | 1 | 24 | `d88849a33a39` |
| 71 | `form8815` | 4 | 26 | `940b6af53a03` |
| 72 | `f8820` | 4 | 88 | `8b8cd1785900` |
| 73 | `form8824` | 2 | 23 | `0d61359bff5b` |
| 74 | `f8826` | 2 | 14 | `480502e41678` |
| 75 | `form_8829` | 1 | 28 | `994834c9eeac` |
| 76 | `f8834` | 2 | 11 | `6a48b2d674ea` |
| 77 | `f8835` | 3 | 67 | `e0e3aa20718d` |
| 78 | `form8839` | 2 | 30 | `3d3102f9b3dc` |
| 79 | `f8844` | 1 | 6 | `f0752ca5976c` |
| 80 | `f8881` | 1 | 26 | `366548b2d22b` |
| 81 | `f8882` | 2 | 11 | `22f32092f51e` |
| 82 | `f8854` | 5 | 28 | `49f4baf35fb3` |
| 83 | `f8854_annual` | 5 | 34 | `49f4baf35fb3` |
| 84 | `form8853` | 2 | 44 | `5582f8137b70` |
| 85 | `f8859` | 1 | 9 | `7d97367bf894` |
| 86 | `f8862` | 3 | 109 | `fd783d1f46f1` |
| 87 | `f8863` | 2 | 77 | `a251a1cfbd61` |
| 88 | `f8864` | 1 | 11 | `1196e40fe4a4` |
| 89 | `f8874` | 3 | 40 | `81d414921d4f` |
| 90 | `form8880` | 2 | 20 | `ba2b28770bc8` |
| 91 | `f8888` | 3 | 19 | `3ec67f517a0e` |
| 92 | `form8889` | 1 | 27 | `15ed4587f75b` |
| 93 | `f8911` | 1 | 14 | `0960be0efb86` |
| 94 | `f8911_schedule_a` | 1 | 23 | `8feda345747d` |
| 95 | `f8912` | 3 | 218 | `0c083a7452a2` |
| 96 | `f8915f` | 4 | 38 | `8923937e0ad7` |
| 97 | `form8919` | 2 | 37 | `84102b121726` |
| 98 | `f8936` | 1 | 29 | `de9c6988fbe3` |
| 99 | `f8936` | 3 | 64 | `8db7ab70c8ae` |
| 100 | `form8949` | 2 | 200 | `274513891e4e` |
| 101 | `form8995` | 1 | 34 | `55380ad23030` |
| 102 | `f8941` | 1 | 22 | `3835e40ade9c` |
| 103 | `form8959` | 1 | 26 | `13e640049483` |
| 104 | `form8960` | 1 | 24 | `9b323b7166b5` |
| 105 | `form8962` | 2 | 141 | `dc7d2c6b566c` |
| 106 | `f8978` | 1 | 91 | `b954fffd7b16` |
| 107 | `form8978_schedule_a` | 1 | 133 | `e625f6689ae2` |
| 108 | `form8990` | 3 | 33 | `60eb4a9747a6` |
| 109 | `form8992` | 1 | 14 | `0cb4c9f213d2` |
| 110 | `form8992_schedule_a` | 2 | 26 | `f175f2faf346` |
| 111 | `f8994` | 1 | 9 | `d3ec89566eed` |
| 112 | `f965` | 3 | 69 | `ec389e548af6` |
| 113 | `form8995a` | 2 | 90 | `3362db81b8ef` |
| 114 | `form8995a_schedule_a` | 1 | 16 | `fadc0c1cb1ba` |
| 115 | `form8995a_schedule_b` | 1 | 27 | `836460c0d7b5` |
| 116 | `form8995a_schedule_c` | 1 | 15 | `30074d5ce002` |
| 117 | `form8995a_schedule_d` | 1 | 16 | `993afb4447fb` |
