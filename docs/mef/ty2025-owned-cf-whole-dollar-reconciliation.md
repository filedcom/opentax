# Pending owned C/F whole-dollar reconciliation

This work belongs to the existing ScheduleC/F, owner-SE and return-wide reconciliation TODOs. No new completed slice is recorded.

The [2025 Form1040 instructions](https://www.irs.gov/instructions/i1040gi) require 50–99 cents to round to the next dollar and cents to be retained while adding inputs for a single line. Applying that convention to signed loss magnitudes exposed the shared native/PDF use of JavaScript Math.round: -10000.50 became -10000, while sourced QBI already used -10001; -.50 became zero. A shared signed formatter now preserves those loss magnitudes and canonical zero. Positive rounding remains the same.

The isolated formatter passes63 native/PDF-builder checks and10 full C/F/optional-farm/multiple-business checks. Logs are `/tmp/opentax-signed-dollar-related.log` and `/tmp/opentax-owned-cf-signed-dollars-final.log`.

- opentax-signed-dollar-related.log: SHA256 `1bc3d7c84e9bc32c2fc07742fb3fdd0c4258eb0a030fafa57547d4284eff6837`.
- opentax-owned-cf-signed-dollars-final.log: SHA256 `077c4cbb17e09a73b746e23da4c7bc7b7f3332025a055196895fb9c0055b1615`.

Six full source/XSD/flattened PDF packets generated78 pages. All78 pages were rendered. Initial visual review covered contacts1–4 (16 pages) and found an unresolved actual filing arithmetic discrepancy: the 50-cent ScheduleC loss case prints Schedule1 line3=-301 and line6=800 but line10=500, because the graph still sums raw -300.50+800 before output rounding. The formatter correction therefore does not establish a reconciled filing route. Full packet review is intentionally incomplete pending the calculation repair.

Next required work: reconcile actual filed C/F operands through Schedule1, owner-SE attribution, QBI, AGI and native/PDF totals while retaining original cent-valued source facts and strict source-conflict rejection; regenerate all affected packets and inspect every page. Existing generic, patron, WOTC and optional-farm routes must retain their source contracts. No whole-parent completion, filing-ready release or IRS acceptance is claimed.
