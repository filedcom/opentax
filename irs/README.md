# IRS MeF files

The IRS schemas and business rules the harness validates against. IRS e-Services
releases them only to registered software developers, so this folder is in the
repository but its contents are not: `.gitignore` here admits only this README,
`manifest.json` and itself.

Every file below is listed in [`manifest.json`](./manifest.json) with its
SHA-256. `bun run check:irs` reports what is present, missing or altered. Tests
and checks that need a file skip or report "n/a" when it is absent, which is the
case in CI.

| Path in `irs/` | Contents | From the IRS package |
| --- | --- | --- |
| `mef/2025v5.4/` | TY2025 Form 1040 schemas (ATS-valid since 2025-10-13) | `IMF_Series_2025v5.4.zip` › `1040x_Schema_2025v5.4.zip` › `2025v5.4/` |
| `mef/2026v1.0/` | TY2026 Form 1040 schemas (not ATS-valid; ATS uses 2026v3.0, then 2026v4.0 from 2026-11-01) | `IMF_Series_2026v1.0.zip` › `1040x_2026v1.0.zip` › `1040x_Schema_2026v1.0.zip` › `2026v1.0/` |
| `rules/1040_Business_Rules_2025v3.0.csv` | TY2025 rules that `forms/f1040/validation/rules` was generated from | `IMF_Series_2025v3.0.zip` › `1040x_2025v3.0.zip` › `1040x_Business_Rules_2025v3.0.zip` |
| `rules/1040_Business_Rules_2026v1.0.csv` | TY2026 rules | `IMF_Series_2026v1.0.zip` › `1040x_2026v1.0.zip` › `1040x_Business_Rules_2026v1.0.zip` |

Each `mef/<version>/` folder holds the schema package's version folder as
released (`Common/`, `IndividualIncomeTax/`, `Shared/`, ...), so for example
`irs/mef/2025v5.4/IndividualIncomeTax/Ind1040/Return1040.xsd` must exist.

## Installing

Download the packages from the e-Services mailbox (or the team's copy), then:

```sh
cd irs
unzip -q IMF_Series_2025v5.4.zip && unzip -q 1040x_Schema_2025v5.4.zip
mkdir -p mef && mv 2025v5.4 mef/
unzip -q IMF_Series_2026v1.0.zip && unzip -q 1040x_2026v1.0.zip
unzip -q 1040x_Schema_2026v1.0.zip && mv 2026v1.0 mef/
mkdir -p rules && unzip -q -j 1040x_Business_Rules_2026v1.0.zip '1040_Business_Rules_2026v1.0.csv' -d rules
cd .. && bun run check:irs
```

The zips themselves can stay here; they are ignored too. A newer IRS version
gets a new `mef/<version>/` folder and a manifest entry, never edits to an
existing one.
