# Owned C/F whole-dollar reconciliation

This work belongs to the existing Schedule C/F, owner-SE, QBI and return-wide reconciliation TODOs. Broader parents remain open.

The [2025 Form 1040 instructions](https://www.irs.gov/instructions/i1040gi) specify whole-dollar rounding and retention of cents while adding source amounts for a single line. Signed loss magnitudes now follow the same half-dollar convention: -10000.50 files as -10001 and -.50 files as -1. Original source cents remain retained.

Visual review exposed a second defect after the formatter repair: Schedule 1 printed C=-301 and F=800 but total=500. The graph now settles eligible ordinary proprietor C/F monetary filing operands before computing expenses, profit, Schedule 1, owner SE, QBI and AGI. Native and PDF replay use that same settlement. Actual deductible meals are calculated from original meal cost before rounding the allowance; conservation expenses use the actual source cost and filed gross-income cap before rounding the allowed amount. Source cost is never replaced with a fabricated amount to obtain the deduction.

Ten registered MFJ sources cover negative49/50/51-cent boundaries, a half-dollar farm loss, distinct raw gross/expense leaf rounding, and meal/conservation allowances. Each actual complete packet includes1040, Schedules1/2/C/F/SE and8995. The ten packets pass pinned local TY2025 XSD validation and contain130 flattened pages. All130 current pages were rendered and visually inspected in33 contacts, including identity, cash/material/all-at-risk checkboxes, signed amounts, derived allowances, totals, blank continuation pages, form year and page order.

The held review checker replays every source through the current graph, verifies PDF/XML/source hashes, template and XSD provenance, packet inventory and all130 completed page slots. It completed successfully for the ten selected cases. Retained evidence is under `.state/research/2026-10-06-owned-cf-filed-held`; renderings and30 artifact hashes are retained alongside it. Main planner contains264 fixtures,116 descriptors,113 keys,95 covered keys and18 uncovered keys.

Verification:

- Signed formatter/native/PDF-builder checks:63 passed,0 failed (`/tmp/opentax-signed-dollar-related.log`).
- Filed-operand compatibility checks:25 passed,0 failed (`/tmp/opentax-owned-cf-filed-operands-related.log`).
- Derived meal/conservation and owner/optional/multiple-C checks:16 passed,0 failed (`/tmp/opentax-owned-cf-filed-derived-final.log`).
- Final registered fixtures/scope checks:3 passed,0 failed (`/tmp/opentax-owned-cf-registration-final.log`).
- Five cent-boundary stale-source/Schedule1/AGI/QBI mutations reject both native and direct PDF exports:1 passed,0 failed (`/tmp/opentax-owned-cf-filed-conflicts.log`).
- Complete held replay:10 cases,130 reviewed pages; hashes and XSD confirmed (`/tmp/opentax-owned-cf-filed-held-check.log`).
- Main integration at68f876474:21 passed,0 failed (2m16s), including common-control SHOP, optional/ordinary farm, owner SE, multiple C, cent conflicts and review scope (`/tmp/opentax-owned-cf-filed-main-integration.log`).
- Main held replay:10 cases,130 reviewed pages, current artifacts and XSD confirmed (`/tmp/opentax-owned-cf-filed-held-main-check.log`).

Original generic, patron, WOTC and optional-method source contracts stay independently guarded. Farm WOTC source work, Single-owner filed-source replay, wider adjustments and source authentication remain under their existing parent TODOs. This evidence does not prove a whole-parent completion, IRS business-rule acceptance, ATS acceptance or filing-ready release.

## Evidence digests

- opentax-owned-cf-registration-final.log: SHA256 `29ce0960cff3f8d4d990b929f7d7436c313f52cb95234e5e94515256bdcec8cd`.
- opentax-owned-cf-filed-conflicts.log: SHA256 `bedc1c09084e1904ef69c1f7e6f2258958a3c58a824e1a5b6fc965515120b749`.
- opentax-owned-cf-filed-held-check.log: SHA256 `6ef81f64e669244448b610126fb5c2ed326a6a099c627515a59ae958b2c650d2`.
- opentax-owned-cf-filed-main-integration.log: SHA256 `cd7f56e3b8fab398ad3e0f315038f869d346544057b081f7b268b5d81383afe7`.
- opentax-owned-cf-filed-held-main-check.log: SHA256 `6ef81f64e669244448b610126fb5c2ed326a6a099c627515a59ae958b2c650d2`.

## Part V source-summed expense correction

At51012d822, two original bank-service costs of0.49 each remain retained as source rows. Their sum0.98 files as1 on ScheduleC lines48/27b; advertising300 therefore yields expenses301 and loss-301. Schedule1 total499, ownerSE70/half35 and AGI464 reconcile. Scalar line27b claims remain outside this ordinary helper pending their separate supported contract.

The additional complete packet has13 pages, all visually reviewed. Current-main held replay passes1 case/13 pages; the prior ten packets also replay unchanged with130 reviewed pages. Together the ordinary MFJ proof covers11 packets/143 pages and33 retained source/XML/PDF hashes. Planner at51012d822 has265 fixtures. The whole11-case source/native/full-XSD/flattened-PDF and conflict tests pass2/0 in41s; logs are `/tmp/opentax-owned-cf-part-v-main.log`, `/tmp/opentax-owned-cf-part-v-held-main-check.log` and `/tmp/opentax-owned-cf-filed-part-v-main-check.log`. Retained new packet/renderings are `.state/research/2026-10-06-owned-cf-part-v-held` and its rendered sibling. This corrects the existing bounded completion and adds no ledger slice.

- opentax-owned-cf-part-v-main.log: SHA256 `486354b03599d6c7878692720ea5ccc0edfc07ef379ec28c564900aa4d82274b`.

- opentax-owned-cf-part-v-held-main-check.log: SHA256 `bbcd7cca0469542df8c9e790a03870dad89270b768e6c78edd6e20639ad69cd9`.

- opentax-owned-cf-filed-part-v-main-check.log: SHA256 `6ef81f64e669244448b610126fb5c2ed326a6a099c627515a59ae958b2c650d2`.
