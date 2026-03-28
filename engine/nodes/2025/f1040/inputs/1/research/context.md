# General Screen 1 — Form 1040: Name, Address, Filing Status, and Dependent Information

## Overview

Drake's General screen 1 (with screen 2 for dependents, aliased as screen code "2") captures the top-of-return data needed before any income entry begins. Every Form 1040 begins here. This screen determines:

1. **Who is filing** — taxpayer identity, SSN, date of birth, occupation
2. **How they are filing** — filing status (one of five), which drives virtually every downstream threshold
3. **Where to send correspondence** — mailing address, including foreign address support
4. **Whether additional identification security is active** — Identity Protection PIN
5. **Who they are supporting** — the dependent roster, which drives Child Tax Credit, EITC, HOH eligibility, Form 2441, and Form 8812
6. **Mandatory yes/no disclosures** — digital assets, presidential election fund

The data entered here flows to: the top of Form 1040 (name/address block and filing status checkboxes), the Dependents section of Form 1040 (lines for up to 4 dependents), the standard deduction line (line 12), the signature block (IP PIN), the Third Party Designee block (page 2), and indirectly triggers Form 8812 (CTC/ACTC/ODC), Form 2441 (dependent care), Form 8863 (education credits), and Schedule EIC.

**IRS Form:** 1040
**Drake Screen:** 1 (alias: 2 for dependents)
**Tax Year:** 2025
**Drake Reference:** https://kb.drakesoftware.com/kb/Drake-Tax/20051.htm (Screen List); https://kb.drakesoftware.com/kb/Drake-Tax/18910.htm (2025 Changes); https://kb.drakesoftware.com/kb/Drake-Tax/10221.htm (Creating a New Return)

---

## Data Entry Fields

Required fields first, then optional. Data-entry only — no computed/display fields.

### Section A: Filing Status

| Field | Type | Required | Drake Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | ----------- | ----------- | ------------- | --- |
| filing_status | enum (1–5) | yes | "Filing Status" | One of 5 IRS filing statuses. See Filing Status section below for valid values. | 1040 Instructions p.12; Pub 501 pp.1–30 | https://www.irs.gov/instructions/i1040gi |

### Section B: Taxpayer Identification

| Field | Type | Required | Drake Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | ----------- | ----------- | ------------- | --- |
| tp_first_name | string (max 20 chars, alpha + hyphen + space) | yes | "First name" | Taxpayer legal first name exactly as shown on SSN card | 1040 Instructions, Name and Address, p.11 | https://www.irs.gov/instructions/i1040gi |
| tp_middle_initial | string (1 char) | no | "MI" | Taxpayer middle initial | 1040 Instructions, Name and Address, p.11 | https://www.irs.gov/instructions/i1040gi |
| tp_last_name | string (max 25 chars, alpha + hyphen + space) | yes | "Last name" | Taxpayer legal last name exactly as shown on SSN card | 1040 Instructions, Name and Address, p.11 | https://www.irs.gov/instructions/i1040gi |
| tp_suffix | enum (Jr, Sr, II, III, IV) | no | "Suffix" | Name suffix; e-file validation rejects invalid values | 1040 Instructions, Name and Address, p.11 | https://www.irs.gov/instructions/i1040gi |
| tp_ssn | string (9 digits, no dashes) | yes | "Social security number" | Taxpayer SSN or ITIN. Format: NNNNNNNNN (9 digits). ITIN begins with 9. | 1040 Instructions, SSN, p.11 | https://www.irs.gov/instructions/i1040gi |
| tp_date_of_birth | date (MM/DD/YYYY) | yes | "Date of birth" | Taxpayer date of birth. Must match IRS records. Used to determine age 65+ for additional standard deduction. | 1040 Instructions, p.11 | https://www.irs.gov/instructions/i1040gi |
| tp_occupation | string (max 35 chars) | no | "Occupation" | Taxpayer occupation. Printed on Form 1040 page 2 signature area. No IRS calculation effect. | 1040 Instructions, Signature section, p.83 | https://www.irs.gov/instructions/i1040gi |
| tp_deceased | boolean | no | "Deceased" | Check if taxpayer died in 2025. Enables date_of_death field. | 1040 Instructions, Death of a Taxpayer, p.11 | https://www.irs.gov/instructions/i1040gi |
| tp_date_of_death | date (MM/DD/YYYY) | conditional | "Date of death" | Required if tp_deceased = true. Must be within TY2025. | 1040 Instructions, Death of a Taxpayer, p.11 | https://www.irs.gov/instructions/i1040gi |
| tp_over_65 | boolean | no | "Born before January 2, 1961" | Derived from tp_date_of_birth (born before Jan 2, 1961 = true); may be overridable. Drives line 12d additional standard deduction. | 1040 Instructions, Line 12d, p.36; Pub 501 p.23 | https://www.irs.gov/instructions/i1040gi |
| tp_blind | boolean | no | "Blind" | Taxpayer is blind on last day of tax year. Drives line 12d additional standard deduction. | 1040 Instructions, Line 12d, p.36; Pub 501 p.23 | https://www.irs.gov/instructions/i1040gi |
| tp_can_be_claimed_as_dependent | boolean | no | "Can be claimed as dependent by another" | If checked, standard deduction is limited per dependent worksheet; taxpayer cannot claim dependents. | 1040 Instructions, Standard Deduction, p.36; Pub 501 p.25 | https://www.irs.gov/instructions/i1040gi |

### Section C: Spouse Identification (Required for MFJ; partially available for MFS)

| Field | Type | Required | Drake Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | ----------- | ----------- | ------------- | --- |
| sp_first_name | string (max 20 chars) | conditional | "Spouse's first name" | Required for MFJ; available for MFS. Enter "NRA" if spouse is a nonresident alien without SSN/ITIN. | 1040 Instructions, Name and Address, p.11 | https://www.irs.gov/instructions/i1040gi |
| sp_middle_initial | string (1 char) | no | "MI" | Spouse middle initial | 1040 Instructions, p.11 | https://www.irs.gov/instructions/i1040gi |
| sp_last_name | string (max 25 chars) | conditional | "Spouse's last name" | Required for MFJ; available for MFS. | 1040 Instructions, p.11 | https://www.irs.gov/instructions/i1040gi |
| sp_suffix | enum (Jr, Sr, II, III, IV) | no | "Suffix" | Spouse name suffix. | 1040 Instructions, p.11 | https://www.irs.gov/instructions/i1040gi |
| sp_ssn | string (9 digits) | conditional | "Spouse's social security number" | Required for MFJ; required for MFS if spouse also files. Leave blank for NRA spouse. | 1040 Instructions, p.11 | https://www.irs.gov/instructions/i1040gi |
| sp_date_of_birth | date (MM/DD/YYYY) | conditional | "Spouse's date of birth" | Required for MFJ. Used for age 65+ additional standard deduction and filing requirement checks. | 1040 Instructions, p.11 | https://www.irs.gov/instructions/i1040gi |
| sp_occupation | string (max 35 chars) | no | "Spouse's occupation" | Printed on Form 1040 page 2. | 1040 Instructions, Signature section, p.83 | https://www.irs.gov/instructions/i1040gi |
| sp_deceased | boolean | no | "Deceased" | Check if spouse died in 2025. | 1040 Instructions, Death of a Taxpayer, p.11 | https://www.irs.gov/instructions/i1040gi |
| sp_date_of_death | date (MM/DD/YYYY) | conditional | "Date of death" | Required if sp_deceased = true. | 1040 Instructions, p.11 | https://www.irs.gov/instructions/i1040gi |
| sp_over_65 | boolean | no | "Born before January 2, 1961" | Derived from sp_date_of_birth. Drives line 12d. | 1040 Instructions, Line 12d; Pub 501 p.23 | https://www.irs.gov/instructions/i1040gi |
| sp_blind | boolean | no | "Blind" | Spouse is blind on last day of tax year. Drives line 12d. | 1040 Instructions, Line 12d; Pub 501 p.23 | https://www.irs.gov/instructions/i1040gi |
| sp_can_be_claimed_as_dependent | boolean | no | "Spouse can be claimed as dependent by another" | Rare edge case — affects standard deduction limit. | Pub 501 p.25 | https://www.irs.gov/publications/p501 |
| sp_nonresident_alien | boolean | no | "Nonresident alien" | Marks spouse as NRA. Must check "Spouse is not filing" or "Spouse has no U.S. income" as appropriate. | 1040 Instructions; Drake KB 11051 | https://kb.drakesoftware.com/kb/Drake-Tax/11051.htm |
| sp_not_filing | boolean | no | "Spouse is not filing a return" | For NRA spouse who is not joining the return. Affects e-file eligibility. | Drake KB 11051 | https://kb.drakesoftware.com/kb/Drake-Tax/11051.htm |
| sp_no_us_income | boolean | no | "Spouse has no U.S. income" | For NRA spouse. Affects e-file schema validation. | Drake KB 11051 | https://kb.drakesoftware.com/kb/Drake-Tax/11051.htm |

### Section D: Address

| Field | Type | Required | Drake Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | ----------- | ----------- | ------------- | --- |
| address_street | string (max 35 chars) | yes | "Home address" | Street number and name, or P.O. Box if no street delivery. | 1040 Instructions, Address, p.11 | https://www.irs.gov/instructions/i1040gi |
| address_apt | string (max 6 chars) | no | "Apt. no." | Apartment, room, or suite number. | 1040 Instructions, Address, p.11 | https://www.irs.gov/instructions/i1040gi |
| address_zip | string (5 or 9 digits) | yes | "ZIP code" | 5-digit or ZIP+4. Triggers auto-fill of city, state, and county. | 1040 Instructions, Address, p.11 | https://www.irs.gov/instructions/i1040gi |
| address_city | string (max 22 chars) | yes | "City" | Auto-filled from ZIP; overridable. | 1040 Instructions, Address, p.11 | https://www.irs.gov/instructions/i1040gi |
| address_state | enum (2-letter state code) | yes | "State" | Auto-filled from ZIP; overridable. Drives state return routing. | 1040 Instructions, Address, p.11 | https://www.irs.gov/instructions/i1040gi |
| address_county | string | no | "County" | Auto-filled from ZIP; overridable. Used for state returns in some states. | Drake KB 10221 | https://kb.drakesoftware.com/kb/Drake-Tax/10221.htm |
| address_foreign_country | string | no | "Foreign country name" | For taxpayers with foreign addresses. If used, state/ZIP are left blank. | 1040 Instructions, Foreign Address, p.11 | https://www.irs.gov/instructions/i1040gi |
| address_foreign_province | string | no | "Foreign province/state/county" | Foreign state or province. | 1040 Instructions, Foreign Address, p.11 | https://www.irs.gov/instructions/i1040gi |
| address_foreign_postal | string | no | "Foreign postal code" | Foreign postal code. | 1040 Instructions, Foreign Address, p.11 | https://www.irs.gov/instructions/i1040gi |
| address_changed | boolean | no | "Address change" | Check if address changed from prior year. IRS updates its records. | 1040 Instructions, Address, p.11 | https://www.irs.gov/instructions/i1040gi |
| name_changed | boolean | no | "Name change" | Check if name changed. IRS will verify with SSA. | 1040 Instructions, Name, p.11 | https://www.irs.gov/instructions/i1040gi |

### Section E: Resident State / Part-Year

| Field | Type | Required | Drake Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | ----------- | ----------- | ------------- | --- |
| resident_state | enum (2-letter state code, or PY) | conditional | "Resident state" | State of residence for state return routing. Select PY if taxpayer lived in multiple states. Required for state e-filing. | Drake KB 11062 | https://kb.drakesoftware.com/Site/Browse/11062/PY-Resident-and-Nonresident-States |

### Section F: Special Filing Flags (New/Updated for 2025)

| Field | Type | Required | Drake Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | ----------- | ----------- | ------------- | --- |
| lived_apart_mfs_hoh | boolean | no | "Check if MFS/HOH and lived apart from spouse entire year or legally separated" | New for 2025 — line 6d. Available only for MFS or HOH filers. Affects certain credits and phaseouts. | 1040 Instructions, Line 6d, p.15; Drake KB 18910 | https://kb.drakesoftware.com/kb/Drake-Tax/18910.htm |
| us_residency | boolean | no | "Main home in U.S. for more than half of 2025" | New for 2025. Must be checked if main home (and spouse's if MFJ) was in U.S. >6 months. Affects certain credits. | 1040 Instructions; Drake KB 18910 | https://kb.drakesoftware.com/kb/Drake-Tax/18910.htm |

### Section G: Mandatory Disclosures

| Field | Type | Required | Drake Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | ----------- | ----------- | ------------- | --- |
| digital_assets_yes | boolean | yes | "Digital assets: Yes" | Mandatory. Answer Yes if: (a) received digital assets as reward, award, payment; or (b) sold, exchanged, or otherwise disposed of digital assets in 2025. Cannot be left blank. | 1040 Instructions, Digital Assets, p.12 | https://www.irs.gov/filing/determine-how-to-answer-the-digital-asset-question |
| digital_assets_no | boolean | yes | "Digital assets: No" | Mandatory. Check No if only purchased or held without transacting. One of Yes/No must be checked. | 1040 Instructions, Digital Assets, p.12 | https://www.irs.gov/filing/determine-how-to-answer-the-digital-asset-question |
| presidential_election_tp | boolean | no | "You: $3 to Presidential Election Campaign Fund" | Optional. $3 from general fund designated to presidential election public financing. Does NOT change tax or refund. | 1040 Instructions, Presidential Election Campaign Fund, p.12 | https://www.irs.gov/instructions/i1040gi |
| presidential_election_sp | boolean | no | "Spouse: $3 to Presidential Election Campaign Fund" | Optional. Available for MFJ only. Separate $3 designation for spouse. | 1040 Instructions, p.12 | https://www.irs.gov/instructions/i1040gi |

### Section H: Contact Information (Optional — for IRS use)

| Field | Type | Required | Drake Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | ----------- | ----------- | ------------- | --- |
| phone_daytime | string (10 digits) | no | "Daytime phone number" | Printed on return if configured. IRS uses to contact taxpayer. | 1040 Instructions, p.83 | https://www.irs.gov/instructions/i1040gi |
| phone_evening | string (10 digits) | no | "Evening phone number" | Printed on return if configured. | 1040 Instructions, p.83 | https://www.irs.gov/instructions/i1040gi |
| email | string (valid email format) | no | "Email address" | Optional. Printed on return if configured. | 1040 Instructions, p.83 | https://www.irs.gov/instructions/i1040gi |

### Section I: Identity Protection PIN (entered on PIN screen in Drake)

| Field | Type | Required | Drake Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | ----------- | ----------- | ------------- | --- |
| tp_ip_pin | string (6 digits) | conditional | "Identity Protection PIN (taxpayer)" | Required if IRS has issued an IP PIN for the taxpayer. 6 digits; prepend 0 if issued with 5. Changes annually. Missing or incorrect IP PIN → e-file rejection codes IND-180-01 through IND-183-01. | IRS IP PIN; Drake KB 12938 | https://kb.drakesoftware.com/kb/Drake-Tax/12938.htm |
| sp_ip_pin | string (6 digits) | conditional | "Identity Protection PIN (spouse)" | Required if IRS has issued an IP PIN for the spouse. Same rules as taxpayer. Appears in signature area below taxpayer IP PIN. | IRS IP PIN; Drake KB 12938 | https://kb.drakesoftware.com/kb/Drake-Tax/12938.htm |

### Section J: Screen 2 — Dependents (repeatable, up to 4 on Form 1040; overflow on continuation)

Each dependent is one instance of the following fields:

| Field | Type | Required | Drake Label | Description | IRS Reference | URL |
| ----- | ---- | -------- | ----------- | ----------- | ------------- | --- |
| dep_first_name | string (max 20 chars) | yes | "First name" | Dependent's legal first name. | 1040 Instructions, Dependents, p.16 | https://www.irs.gov/instructions/i1040gi |
| dep_last_name | string (max 25 chars) | yes | "Last name" | Dependent's legal last name. | 1040 Instructions, Dependents, p.16 | https://www.irs.gov/instructions/i1040gi |
| dep_ssn | string (9 digits) | yes | "Social security number" | Dependent's SSN or ATIN. Must match IRS records. ATIN (Adoption TIN) is acceptable for adopted children. | 1040 Instructions, Dependents, p.16; Pub 501 p.18 | https://www.irs.gov/publications/p501 |
| dep_relationship | enum | yes | "Relationship to you" | Relationship code. See Relationship Codes table below. | 1040 Instructions, Dependents, p.16 | https://www.irs.gov/instructions/i1040gi |
| dep_date_of_birth | date (MM/DD/YYYY) | yes | "Date of birth" | Used to determine age for qualifying child tests, CTC eligibility (under 17), EIC eligibility (under 19/24/any if disabled). | 1040 Instructions; Pub 501 p.14 | https://www.irs.gov/publications/p501 |
| dep_months_in_home | integer (0–12) | conditional | "Months lived in home" | Required only if dependent did NOT live with taxpayer for all 12 months. Blank = 12 months assumed. Used for qualifying child residency test and HOH. | 1040 Instructions; Pub 501 p.14 | https://www.irs.gov/publications/p501 |
| dep_residence_location | enum or string | no | "Where lived" | New for 2025. Captures where the dependent lived (with taxpayer, with other parent, other). IRS uses for statistical and audit purposes. | Drake KB 18910 | https://kb.drakesoftware.com/kb/Drake-Tax/18910.htm |
| dep_full_time_student | boolean | no | "Full-time student" | New for 2025. If checked, extends qualifying child age limit to under 24. Must be enrolled as full-time student at a qualifying educational institution at some point during each of 5 months of the year. | 1040 Instructions; Pub 501 p.14 | https://www.irs.gov/publications/p501 |
| dep_totally_disabled | boolean | no | "Totally and permanently disabled" | New for 2025 (surfaced more prominently). Removes age limit for qualifying child and qualifying relative. Qualifies dependent at any age. | 1040 Instructions; Pub 501 p.14 | https://www.irs.gov/publications/p501 |
| dep_qualifying_child | boolean | no | "Qualifying child" | Check if dependent meets all 5 qualifying child tests (see Calculation Logic). Drake may auto-derive from other fields. | 1040 Instructions, Dependents, p.16 | https://www.irs.gov/instructions/i1040gi |
| dep_qualifying_relative | boolean | no | "Qualifying relative" | Check if dependent meets all 4 qualifying relative tests. Mutually exclusive with dep_qualifying_child (cannot be both). | 1040 Instructions, Dependents, p.16 | https://www.irs.gov/instructions/i1040gi |
| dep_ctc_eligible | boolean | no | "Child tax credit" | Check if child qualifies for Child Tax Credit: must be qualifying child, under 17, SSN valid for employment. | 1040 Instructions, Dependents, p.16; Drake KB 18340 | https://kb.drakesoftware.com/kb/Drake-Tax/18340.htm |
| dep_ssn_valid_for_work | boolean | conditional | "SSN valid for work" | Required field if dep_ctc_eligible is being evaluated. An SSN not valid for work disqualifies from CTC and ACTC but not ODC. | Drake KB 18340 | https://kb.drakesoftware.com/kb/Drake-Tax/18340.htm |
| dep_eic_qualifier | enum | no | "Qualifying child for EIC" | Dropdown: blank = is a qualifying child for EIC; X = is NOT a qualifying child for EIC; S = would qualify except SSN not valid for work. | Drake KB 10886 | https://kb.drakesoftware.com/kb/Drake-Tax/10886.htm |
| dep_hoh_qualifier | boolean | no | "Not a dependent — HOH qualifier" | Additional Information section. Marks a person who qualifies TP for HOH status but is NOT claimed as a dependent (e.g., qualifying child released to non-custodial parent via Form 8332). | Drake KB 10419 | https://kb.drakesoftware.com/kb/Drake-Tax/10419.htm |
| dep_qss_qualifier | boolean | no | "Not a dependent — QSS qualifier" | Additional Information section. Marks a person who qualifies TP for QSS status but is not a dependent on this return. | Drake KB 10419 | https://kb.drakesoftware.com/kb/Drake-Tax/10419.htm |
| dep_childcare_expenses | number (dollars) | no | "Child care expenses" | Amount paid for qualifying dependent care expenses in 2025 for this dependent. Flows to Form 2441. | Drake KB 11750 | https://kb.drakesoftware.com/kb/Drake-Tax/11750.htm |
| dep_ip_pin | string (6 digits) | conditional | "Dependent IP PIN" | Located at bottom right of screen 2. Required if IRS has issued an IP PIN for this dependent. E-file rejection code IND-996 if missing or incorrect. | Drake KB 12938 | https://kb.drakesoftware.com/kb/Drake-Tax/12938.htm |

### Dependent Relationship Codes

The following relationship values are accepted in the dep_relationship field. These determine qualifying child eligibility and EIC qualifying person status:

| Code | Description | Qualifying Child? | Qualifying Relative? |
| ---- | ----------- | ----------------- | -------------------- |
| Son | Biological son | Yes (if tests met) | Yes (if QC tests fail) |
| Daughter | Biological daughter | Yes | Yes |
| Stepson | Stepson | Yes | Yes |
| Stepdaughter | Stepdaughter | Yes | Yes |
| Foster child | Foster child (placed by agency) | Yes | No |
| Brother | Brother | Yes | Yes |
| Sister | Sister | Yes | Yes |
| Half brother | Half brother | Yes | Yes |
| Half sister | Half sister | Yes | Yes |
| Stepbrother | Stepbrother | Yes | Yes |
| Stepsister | Stepsister | Yes | Yes |
| Son-in-law | Son-in-law | No | Yes (if household/relationship test) |
| Daughter-in-law | Daughter-in-law | No | Yes |
| Father | Father | No | Yes |
| Mother | Mother | No | Yes |
| Grandfather | Grandfather | No | Yes |
| Grandmother | Grandmother | No | Yes |
| Brother-in-law | Brother-in-law | No | Yes |
| Sister-in-law | Sister-in-law | No | Yes |
| Father-in-law | Father-in-law | No | Yes |
| Mother-in-law | Mother-in-law | No | Yes |
| Nephew | Nephew (brother's/sister's son) | Yes | Yes |
| Niece | Niece (brother's/sister's daughter) | Yes | Yes |
| Cousin | Cousin | No | Yes (if household test) |
| Other | Other (e.g., domestic partner, unrelated person living in home) | No | Yes (if household member all year) |

> **Source:** Pub 501 (2025), "Qualifying Child" and "Qualifying Relative" sections — https://www.irs.gov/publications/p501

---

## Per-Field Routing

| Field | Destination | How Used | Triggers | Limit / Cap | IRS Reference | URL |
| ----- | ----------- | -------- | -------- | ----------- | ------------- | --- |
| filing_status | Form 1040 page 1, Filing Status checkboxes | Determines tax table, standard deduction, phase-outs, thresholds for every credit and deduction | All downstream calculations | Exactly 1 of 5 statuses required | 1040 Instructions p.12 | https://www.irs.gov/instructions/i1040gi |
| tp_first_name, tp_last_name | Form 1040 page 1, Name line | Printed on return; e-file schema name field | IRS identity matching | Must match SSN card | 1040 Instructions p.11 | https://www.irs.gov/instructions/i1040gi |
| tp_ssn | Form 1040 page 1, SSN box | IRS primary key for the return; used for all IRS matching | e-file schema validation | Must be valid 9-digit SSN or ITIN | 1040 Instructions p.11 | https://www.irs.gov/instructions/i1040gi |
| tp_date_of_birth | Form 1040 (not printed, used internally) | Determines age 65 for line 12d; IRS uses for identity verification | Additional standard deduction on line 12d; filing requirement thresholds | Born before Jan 2, 1961 → age 65 flag | 1040 Instructions p.11; Pub 501 p.23 | https://www.irs.gov/publications/p501 |
| tp_over_65 | Form 1040, Line 12d (additional standard deduction) | Added to standard deduction: +$2,000 if Single/HOH; +$1,600 if MFJ/QSS/MFS | — | See Constants table | 1040 Instructions, Line 12d | https://www.irs.gov/instructions/i1040gi |
| tp_blind | Form 1040, Line 12d | Same as tp_over_65 — additional +$2,000 (Single/HOH) or +$1,600 (MFJ/QSS/MFS) | — | Can stack with tp_over_65 | 1040 Instructions, Line 12d | https://www.irs.gov/instructions/i1040gi |
| tp_can_be_claimed_as_dependent | Form 1040, Line 12e — Dependent Standard Deduction Worksheet | Restricts standard deduction to max of $1,350 or (earned income + $450) | Cannot claim own dependents | Lesser of worksheet result or filing-status base deduction | Pub 501 p.25 | https://www.irs.gov/publications/p501 |
| sp_ssn | Form 1040 page 1, Spouse SSN box | IRS spouse identity key; required for MFJ e-file | e-file schema validation | Must be valid 9-digit SSN or ITIN; blank if NRA | 1040 Instructions p.11 | https://www.irs.gov/instructions/i1040gi |
| sp_over_65 | Form 1040, Line 12d | +$1,600 per qualifying condition (MFJ); +$1,300 (MFS) | — | Stacks with sp_blind | 1040 Instructions, Line 12d | https://www.irs.gov/instructions/i1040gi |
| sp_blind | Form 1040, Line 12d | Same as sp_over_65 — stacks | — | Stacks with sp_over_65 | 1040 Instructions, Line 12d | https://www.irs.gov/instructions/i1040gi |
| address_street, address_city, address_state, address_zip | Form 1040 page 1, Address block | Printed on return; IRS uses for correspondence | State return routing | — | 1040 Instructions p.11 | https://www.irs.gov/instructions/i1040gi |
| resident_state | State engine routing | Determines which state return(s) to generate | State return generation | PY triggers part-year returns | Drake KB 11062 | https://kb.drakesoftware.com/Site/Browse/11062/PY-Resident-and-Nonresident-States |
| digital_assets_yes / digital_assets_no | Form 1040 page 1, Digital Assets question | Yes answer requires reporting on Schedule D / Form 8949 if there were disposals | Schedule D, Form 8949 | Mandatory — both fields must not both be false | 1040 Instructions p.12 | https://www.irs.gov/instructions/i1040gi |
| presidential_election_tp | Form 1040 page 1, Election Campaign checkboxes | $3 from general fund; no tax effect | None | $3 per taxpayer; $6 maximum per MFJ return | 1040 Instructions p.12 | https://www.irs.gov/instructions/i1040gi |
| presidential_election_sp | Form 1040 page 1, Spouse election box | Same — $3 designation for spouse | None | Only available MFJ | 1040 Instructions p.12 | https://www.irs.gov/instructions/i1040gi |
| tp_ip_pin | Form 1040 page 2, Signature area / e-file schema | Identity verification — must be present and correct for e-file | e-file validation; incorrect → rejection IND-180-01 | 6 digits | Drake KB 12938 | https://kb.drakesoftware.com/kb/Drake-Tax/12938.htm |
| sp_ip_pin | Form 1040 page 2, Signature area | Same — for spouse | e-file validation | 6 digits | Drake KB 12938 | https://kb.drakesoftware.com/kb/Drake-Tax/12938.htm |
| dep_ssn | Form 1040, Dependents section column 2 | IRS identity matching for dependent | CTC/ACTC/ODC eligibility gating | Valid SSN or ATIN required | 1040 Instructions p.16 | https://www.irs.gov/instructions/i1040gi |
| dep_relationship | Form 1040, Dependents section column 3 | Determines qualifying child vs. qualifying relative status | Qualifying child → CTC/ACTC; qualifying relative → ODC only | See Relationship Codes table | 1040 Instructions p.16; Pub 501 | https://www.irs.gov/publications/p501 |
| dep_date_of_birth | Internal calculation | Age at year-end → qualifying child age test; CTC under-17 test; EIC under-19/24 test | CTC, EIC, ODC, EITC | Under 17 for CTC; under 19 or under 24 (student) for EIC | Pub 501; Drake KB 18340 | https://www.irs.gov/publications/p501 |
| dep_months_in_home | Internal calculation | Residency test for qualifying child (>6 months required) | HOH eligibility | Must be >6 months (>183 days) | Pub 501 p.14 | https://www.irs.gov/publications/p501 |
| dep_ctc_eligible | Form 1040, Dependents section column 4 (CTC check) → Form 8812 | Triggers Form 8812 for Child Tax Credit and ACTC | Form 8812 | Under 17 + SSN valid for work required | 1040 Instructions; Drake KB 18340 | https://kb.drakesoftware.com/kb/Drake-Tax/18340.htm |
| dep_ssn_valid_for_work | Form 8812 gating | If false (SSN not valid for work): disqualifies CTC and ACTC; may still qualify for ODC ($500) | Form 8812 | — | Drake KB 18340 | https://kb.drakesoftware.com/kb/Drake-Tax/18340.htm |
| dep_eic_qualifier | Schedule EIC | Controls whether dependent is counted for EITC; "S" disqualifies from ACTC as well | Schedule EIC, Form 8867 | — | Drake KB 10886 | https://kb.drakesoftware.com/kb/Drake-Tax/10886.htm |
| dep_hoh_qualifier | Internal HOH validation | Allows HOH filing status even when dependent is not claimed on this return | HOH filing status validation | Person must still be qualifying person | Drake KB 10419 | https://kb.drakesoftware.com/kb/Drake-Tax/10419.htm |
| dep_childcare_expenses | Form 2441, Line 3 | Childcare expense for this dependent flows to Form 2441 | Form 2441 | Annual max qualifying expense: $3,000 per child; $6,000 for 2+ qualifying persons | Drake KB 11750; Form 2441 Instructions | https://kb.drakesoftware.com/kb/Drake-Tax/11750.htm |
| dep_ip_pin | e-file schema, dependent identity section | Dependent IP PIN — if issued, must be included in e-file transmission | e-file validation | 6 digits; rejection code IND-996 if missing | Drake KB 12938 | https://kb.drakesoftware.com/kb/Drake-Tax/12938.htm |
| dep_totally_disabled | Qualifying child age override; Form 2441 age override | Removes upper age limit for qualifying child; removes under-13 limit for Form 2441 | EIC, CTC, Form 2441 | Any age qualifies | Pub 501; Drake KB 13172 | https://www.irs.gov/publications/p501 |
| dep_full_time_student | Qualifying child age extension | Allows qualifying child status for ages 19–23 (inclusive) if full-time student | EIC, CTC | Must be under 24 and student | Pub 501 p.14 | https://www.irs.gov/publications/p501 |

---

## Calculation Logic

### Step 1 — Determine Filing Status

Filing status is selected from the five options. The selection drives every downstream threshold. The engine must validate eligibility:

**1 — Single:** Taxpayer was unmarried or legally separated under a divorce or separate maintenance decree on December 31, 2025, and does not qualify for HOH or QSS.

**2 — Married Filing Jointly (MFJ):** Both spouses agree to file together. Both must have valid SSN or ITIN, unless one is an NRA who elects to be treated as a U.S. resident. Creates joint and several liability.

**3 — Married Filing Separately (MFS):** Used when spouses do not want joint liability or have separate financial situations. Generally results in higher tax. Special restrictions: cannot take education credits, EITC, dependent care credit, or other credits. If one spouse itemizes, the other must itemize.

**4 — Head of Household (HOH):**
- Test 1: Unmarried (or "considered unmarried") on December 31, 2025
- Test 2: Paid more than half the cost of maintaining a home for the year
- Test 3: A qualifying person lived with the taxpayer for more than half the year (except a dependent parent, who need not live in the taxpayer's home)
- "Married persons who live apart" exception: a married person living apart from their spouse for the last 6 months of the year and meeting other conditions can be treated as unmarried for HOH purposes — this is what the lived_apart_mfs_hoh checkbox enables

**5 — Qualifying Surviving Spouse (QSS):**
- Spouse died in 2023 or 2024 (not 2025 — if spouse died in 2025, file MFJ for 2025)
- Taxpayer has a qualifying child (son, daughter, stepchild, or adopted child)
- Taxpayer paid more than half the cost of maintaining the home for the child
- Taxpayer was eligible to file MFJ in the year the spouse died

> **Source:** IRS Pub 501 (2025), Filing Status sections — https://www.irs.gov/publications/p501; 1040 Instructions pp.12–15 — https://www.irs.gov/instructions/i1040gi

---

### Step 2 — Determine Standard Deduction (Line 12)

The standard deduction is computed as follows (all amounts are TY2025 per OBBBA):

**Step 2a — Base standard deduction by filing status:**

| Filing Status | Base Amount |
| ------------- | ----------- |
| Single | $15,750 |
| MFS | $15,750 |
| MFJ | $31,500 |
| QSS | $31,500 |
| HOH | $23,625 |

**Step 2b — Additional standard deduction for age 65+ or blindness (Line 12d):**

Each qualifying condition (born before Jan 2, 1961 OR blind) adds an additional amount. Conditions stack — a single person who is both 65+ and blind gets 2 × the additional amount.

| Filing Status | Additional per qualifying condition |
| ------------- | ----------------------------------- |
| Single | +$2,000 |
| HOH | +$2,000 |
| MFJ (per eligible spouse) | +$1,600 |
| QSS | +$1,600 |
| MFS (per eligible spouse) | +$1,600 |

Example: Single taxpayer who is 65 and blind → $15,750 + $2,000 + $2,000 = $19,750 standard deduction.

Example: MFJ where both spouses are 65 and one is also blind → $31,500 + $1,600 + $1,600 + $1,600 = $36,300.

> **Source:** Rev. Proc. 2024-40 (base amounts before OBBBA); OBBBA increased Single/MFS base by $750, MFJ/QSS by $1,500, HOH by $1,125; confirmed in 1040 Instructions (2025) — https://www.irs.gov/instructions/i1040gi; IRS Topic 551 — https://www.irs.gov/taxtopics/tc551

**Step 2c — Dependent filer standard deduction limitation (Line 12e worksheet):**

If tp_can_be_claimed_as_dependent = true:
```
limited_standard_deduction = max($1,350, earned_income + $450)
capped_at = base_standard_deduction_for_filing_status
standard_deduction = min(limited_standard_deduction, capped_at)
```

Example: Dependent filer with $0 earned income → standard deduction = $1,350.
Example: Dependent filer with $10,000 earned income → $10,450, capped at $15,750 (Single) → $10,450.

> **Source:** IRS Topic 551; 1040 Instructions Line 12e Worksheet — https://www.irs.gov/taxtopics/tc551

**Step 2d — Enhanced Senior Deduction (NEW for 2025 — Schedule 1-A):**

This is a SEPARATE deduction from the standard deduction additional amounts above. It is NOT added to the standard deduction; it is an above-the-line additional deduction on Schedule 1-A.

Eligibility: Born before January 2, 1961 (age 65+ by year-end 2025). Valid SSN required (ITIN holders do not qualify).

Amount: $6,000 per eligible taxpayer. If MFJ and both spouses are 65+: $12,000.

Phase-out: Begins at MAGI of $75,000 ($150,000 MFJ). Phase-out rate: 6 cents ($0.06) per $1 of MAGI over the threshold. Fully phases out at $175,000 single ($250,000 MFJ). Formula: reduced_deduction = max(0, $6,000 − ((MAGI − $75,000) × 0.06)).

> **Source:** 1040 Instructions (2025); Drake KB 18910 — https://kb.drakesoftware.com/kb/Drake-Tax/18910.htm

---

### Step 3 — Qualifying Child Tests (for each dependent)

For a dependent to be a qualifying child, ALL FIVE tests must be met:

**Test 1 — Relationship:** Child must be son, daughter, stepchild, foster child (placed by authorized agency), or a descendant of any of these (grandchild, etc.); OR brother, sister, half-sibling, step-sibling, or a descendant (niece/nephew).

**Test 2 — Age:** Child must be, at year-end December 31, 2025:
- Under age 19, OR
- Under age 24 AND a full-time student for at least 5 months, OR
- Permanently and totally disabled (any age)

AND younger than the taxpayer (or younger than the taxpayer's spouse if MFJ).

**Test 3 — Residency:** Child's main home must have been with the taxpayer for MORE THAN HALF THE YEAR (more than 183 days). Temporary absences (school, vacation, medical) count as time with the taxpayer. Special rules for children born/died during year (count whole year).

**Test 4 — Joint Return:** Child cannot file a joint return for 2025 — EXCEPT if filing jointly only to claim a refund (and neither spouse is required to file).

**Test 5 — Support:** Child cannot have provided more than half of their own support for 2025.

> **Source:** IRS Pub 501 (2025), Qualifying Child, pp.14–18 — https://www.irs.gov/publications/p501

---

### Step 4 — Qualifying Relative Tests (for each dependent)

For a dependent to be a qualifying relative (when qualifying child tests fail), ALL FOUR tests must be met:

**Test 1 — Not a qualifying child:** The person is not a qualifying child of any taxpayer for 2025.

**Test 2 — Relationship or household member:** Person must be EITHER:
- Related to the taxpayer in an IRS-specified way (parent, grandparent, sibling, in-law, aunt/uncle, niece/nephew — see Relationship Codes table), OR
- Member of the taxpayer's household for the entire year (lived with TP all 12 months), AND the relationship does not violate local law.

**Test 3 — Gross income:** Person's gross income for 2025 must be LESS THAN $5,200. (For tax year 2025 — confirmed per Pub 501.)

**Test 4 — Support:** Taxpayer must have provided MORE THAN HALF of the person's total support for 2025. Exception: Multiple Support Agreement (Form 2120) allows claiming when multiple people together provide >50% support and each provides at least 10%.

> **Source:** IRS Pub 501 (2025), Qualifying Relative, pp.18–22 — https://www.irs.gov/publications/p501

---

### Step 5 — Tiebreaker Rules (when two taxpayers claim same qualifying child)

Apply in order:

1. Parent wins over non-parent. If only one claimant is the child's parent → parent claims.
2. If both parents, the one with whom the child lived LONGER during 2025 claims.
3. If equal time with both parents → parent with HIGHER AGI claims.
4. If no parent qualifies → person with highest AGI among all eligible claimants claims.

**Custodial parent can release claim:** Using Form 8332, custodial parent releases claim to noncustodial parent. Noncustodial parent then claims the child as a dependent and for CTC, but NOT for HOH, EIC, or dependent care credit (those remain with custodial parent). In Drake, the noncustodial parent enters the dependent on screen 2 and must attach Form 8332.

> **Source:** IRS Pub 501 (2025), Tiebreaker Rules, p.18 — https://www.irs.gov/publications/p501

---

### Step 6 — Child Tax Credit / Additional Child Tax Credit / Other Dependent Credit Gating

For each dependent on screen 2, the engine must determine CTC/ACTC/ODC eligibility:

**Child Tax Credit (CTC) — up to $2,200 per qualifying child (TY2025, OBBBA):**
- Must be a qualifying child (passes 5 tests above)
- Must be UNDER AGE 17 on December 31, 2025
- Must have an SSN issued by the due date of the return (including extensions) that is valid for employment
- Taxpayer (and spouse if MFJ) must also have a valid SSN — ITIN holders cannot claim CTC (OBBBA codified this requirement)
- Phase-out: AGI above $200,000 (all statuses except MFJ) or $400,000 (MFJ) → credit reduced by $50 for every $1,000 (or fraction) over the threshold
→ Flows to Form 1040, Line 19 (via Form 8812)

**Additional Child Tax Credit (ACTC) — refundable portion, up to $1,700 per qualifying child (TY2025):**
- Refundable portion of CTC when CTC exceeds tax liability
- Requires SSN valid for employment (same as CTC)
- Maximum $1,700 per qualifying child for TY2025 (will be inflation-adjusted annually starting TY2026)
→ Flows to Form 1040, Line 28 (via Form 8812)

**Other Dependent Credit (ODC) — $500 per qualifying dependent:**
- For dependents who do NOT qualify for CTC: qualifying relatives, children 17+, children without SSN valid for work, dependents with ITIN, etc.
- $500 flat non-refundable credit
- Same phase-out thresholds as CTC: $200,000 single / $400,000 MFJ (OBBBA made permanent); same $50/$1,000 reduction rate
→ Flows to Form 1040, Line 19 (via Form 8812)

> **Source:** IRS CTC page — https://www.irs.gov/credits-deductions/individuals/child-tax-credit; Drake KB 18340 — https://kb.drakesoftware.com/kb/Drake-Tax/18340.htm

---

### Step 7 — Earned Income Credit Qualifying Child Determination

For each dependent, the EIC qualifier field determines EITC eligibility:

- **Blank (default):** Child IS a qualifying child for EIC. All 5 qualifying child tests must be met. Child must be related (siblings/descendants qualify; parents and in-laws do not qualify).
- **X:** Child is NOT a qualifying child for EIC (entered by preparer). Child may still be a dependent.
- **S:** Child would qualify for EIC but SSN is not valid for work. Disqualifies from EIC.

Age limits for EIC qualifying child: under 19; under 24 if full-time student; any age if permanently and totally disabled.

> **Source:** Drake KB 10886 — https://kb.drakesoftware.com/kb/Drake-Tax/10886.htm; Pub 501

---

### Step 8 — Form 2441 (Dependent Care) Trigger

For each dependent where dep_childcare_expenses > 0 AND:
- Dependent is under age 13, OR
- Dependent is totally and permanently disabled (any age), OR
- Spouse is a full-time student or disabled (special rule for spousal care)

The childcare expense amount flows to Form 2441. Drake generates Form 2441 automatically when any childcare expense is entered on screen 2.

Maximum qualifying expenses: $3,000 for one qualifying person; $6,000 for two or more qualifying persons.

> **Source:** Drake KB 11750 — https://kb.drakesoftware.com/kb/Drake-Tax/11750.htm

---

## Constants & Thresholds (Tax Year 2025)

| Constant | Value | Source | URL |
| -------- | ----- | ------ | --- |
| Standard deduction — Single | $15,750 | 1040 Instructions (OBBBA adjustment to Rev Proc 2024-40) | https://www.irs.gov/instructions/i1040gi |
| Standard deduction — MFS | $15,750 | 1040 Instructions | https://www.irs.gov/instructions/i1040gi |
| Standard deduction — MFJ | $31,500 | 1040 Instructions | https://www.irs.gov/instructions/i1040gi |
| Standard deduction — QSS | $31,500 | 1040 Instructions | https://www.irs.gov/instructions/i1040gi |
| Standard deduction — HOH | $23,625 | 1040 Instructions | https://www.irs.gov/instructions/i1040gi |
| Additional standard deduction — Single/HOH (age 65+ or blind) | +$2,000 per condition | Rev Proc 2024-40; IRS Topic 551 | https://www.irs.gov/taxtopics/tc551 |
| Additional standard deduction — MFJ/QSS/MFS (age 65+ or blind) | +$1,600 per eligible spouse per condition | Rev Proc 2024-40; IRS Topic 551 | https://www.irs.gov/taxtopics/tc551 |
| Enhanced senior deduction (Schedule 1-A, new OBBBA) | $6,000 per eligible person ($12,000 MFJ both 65+) | IRS newsroom; Schedule 1-A | https://www.irs.gov/newsroom/check-your-eligibility-for-the-new-enhanced-deduction-for-seniors |
| Enhanced senior deduction MAGI phase-out threshold | $75,000 single/HOH/MFS; $150,000 MFJ | IRS newsroom | https://www.irs.gov/newsroom/check-your-eligibility-for-the-new-enhanced-deduction-for-seniors |
| Enhanced senior deduction phase-out rate | $0.06 per $1 over threshold (6%) | IRS / TurboTax sources | https://www.irs.gov/newsroom/check-your-eligibility-for-the-new-enhanced-deduction-for-seniors |
| Enhanced senior deduction full phase-out point | $175,000 single; $250,000 MFJ | Multiple sources | https://www.irs.gov/newsroom/check-your-eligibility-for-the-new-enhanced-deduction-for-seniors |
| Enhanced senior deduction effective years | TY2025–TY2028 (OBBBA temporary provision) | IRS newsroom | https://www.irs.gov/newsroom/check-your-eligibility-for-the-new-enhanced-deduction-for-seniors |
| Dependent standard deduction minimum | $1,350 | IRS Topic 551 | https://www.irs.gov/taxtopics/tc551 |
| Dependent standard deduction formula | max($1,350, earned_income + $450) | IRS Topic 551 | https://www.irs.gov/taxtopics/tc551 |
| Qualifying relative gross income limit | $5,200 | Pub 501 (2025) | https://www.irs.gov/publications/p501 |
| Child Tax Credit amount per qualifying child | $2,200 (OBBBA increased from $2,000) | IRS CTC page; multiple OBBBA sources | https://www.irs.gov/credits-deductions/individuals/child-tax-credit |
| Additional Child Tax Credit (ACTC) — max refundable per child | $1,700 | IRS CTC page | https://www.irs.gov/credits-deductions/individuals/child-tax-credit |
| CTC phase-out reduction rate | $50 per $1,000 (or fraction thereof) over threshold | OBBBA (permanent from TCJA) | https://www.irs.gov/credits-deductions/individuals/child-tax-credit |
| Other Dependent Credit amount | $500 per qualifying dependent | Form 8812 | https://www.irs.gov/instructions/i1040gi |
| CTC phase-out threshold — MFJ | $400,000 (unchanged by OBBBA — made permanent) | OBBBA; IRS CTC page | https://www.irs.gov/credits-deductions/individuals/child-tax-credit |
| CTC phase-out threshold — all other filing statuses | $200,000 (unchanged by OBBBA — made permanent) | OBBBA; IRS CTC page | https://www.irs.gov/credits-deductions/individuals/child-tax-credit |
| Form 2441 max qualifying expense — 1 person | $3,000 | Form 2441 Instructions | https://www.irs.gov/instructions/i2441 |
| Form 2441 max qualifying expense — 2+ persons | $6,000 | Form 2441 Instructions | https://www.irs.gov/instructions/i2441 |
| Presidential Election Campaign Fund — per person | $3 | 1040 Instructions p.12 | https://www.irs.gov/instructions/i1040gi |
| IP PIN length | 6 digits | IRS IP PIN FAQ | https://www.irs.gov/identity-theft-fraud-scams/get-an-identity-protection-pin |
| Age 65 cutoff for TY2025 | Born before January 2, 1961 | Pub 501; 1040 Instructions | https://www.irs.gov/publications/p501 |

---

## Data Flow Diagram

```mermaid
flowchart LR
  subgraph inputs["Upstream Inputs"]
    PRIOR[Prior year return data\n(roll-forward from TY2024)]
    PREPARER[Preparer setup\nThird party designee]
    IRS_IPIN[IRS IP PIN assignment\nletter CP01A]
    EMPLOYER[Employer / documents\nSSN cards, addresses]
  end

  subgraph screen["Screen 1 + Screen 2"]
    FS[filing_status]
    TP[Taxpayer: name, SSN,\nDOB, occupation]
    SP[Spouse: name, SSN,\nDOB, occupation]
    ADDR[Address: street, city,\nstate, ZIP, county]
    FLAGS[Flags: deceased, name change,\naddress change, lived apart,\nUS residency, over 65, blind]
    DA[Digital assets Yes/No]
    PEC[Presidential election\ncampaign fund]
    IPIN[IP PINs: taxpayer,\nspouse]
    DEPS[Dependents: name, SSN, DOB,\nrelationship, months in home,\nstudent, disabled, EIC code,\nchildcare $, dep IP PIN]
  end

  subgraph outputs["Downstream (direct, one hop)"]
    F1040_TOP[Form 1040 page 1\nName/Address/Filing Status block]
    F1040_DIGITAL[Form 1040 page 1\nDigital Assets question]
    F1040_PEC[Form 1040 page 1\nElection Campaign checkboxes]
    F1040_LINE12[Form 1040 Line 12\nStandard Deduction]
    F1040_LINE12D[Form 1040 Line 12d\nAdditional SD: age/blindness]
    F1040_DEP[Form 1040 Dependents Section\nLines for up to 4 dependents]
    F1040_SIG[Form 1040 page 2\nSignature / IP PIN / Occupation]
    SCH1A[Schedule 1-A\nEnhanced Senior Deduction]
    F8812[Form 8812\nCTC / ACTC / ODC]
    F2441[Form 2441\nChild and Dependent Care]
    SCH_EIC[Schedule EIC\nEarned Income Credit worksheet]
    STATE[State return\nrouting engine]
  end

  PRIOR --> TP
  PRIOR --> SP
  PRIOR --> ADDR
  PRIOR --> DEPS
  IRS_IPIN --> IPIN
  PREPARER --> F1040_SIG
  EMPLOYER --> TP
  EMPLOYER --> SP

  FS --> F1040_TOP
  FS --> F1040_LINE12
  FS --> F8812
  FS --> SCH_EIC
  TP --> F1040_TOP
  SP --> F1040_TOP
  ADDR --> F1040_TOP
  ADDR --> STATE
  FLAGS --> F1040_TOP
  FLAGS --> F1040_LINE12D
  DA --> F1040_DIGITAL
  PEC --> F1040_PEC
  IPIN --> F1040_SIG

  DEPS -->|"dep_ctc_eligible + dep_ssn_valid_for_work"| F8812
  DEPS -->|"dep_eic_qualifier"| SCH_EIC
  DEPS -->|"dep_childcare_expenses"| F2441
  DEPS --> F1040_DEP

  FLAGS -->|"tp_over_65 or tp_blind"| F1040_LINE12D
  FLAGS -->|"sp_over_65 or sp_blind"| F1040_LINE12D
  FLAGS -->|"tp_can_be_claimed_as_dependent"| F1040_LINE12
  FLAGS -->|"tp_over_65 (age 65+)"| SCH1A
  F1040_LINE12D --> F1040_LINE12
  TP -->|"tp_occupation"| F1040_SIG
  SP -->|"sp_occupation"| F1040_SIG
```

---

## Edge Cases & Special Rules

### Nonresident Alien Spouse

When the spouse is a nonresident alien (NRA) without a valid SSN or ITIN, enter "NRA" in the spouse's first name field and leave SSN blank. Check the "Nonresident alien" checkbox. Also check either "Spouse is not filing a return" or "Spouse has no U.S. income" as applicable.

E-file implications:
- MFS with NRA spouse: eligible for e-file
- MFJ with NRA spouse (making a §6013(g) election to treat NRA as resident): requires ITIN for e-file; cannot e-file without ITIN
- HOH with NRA spouse: eligible for e-file if taxpayer meets HOH requirements independently

> **Source:** Drake KB 11051 — https://kb.drakesoftware.com/kb/Drake-Tax/11051.htm

---

### Taxpayer or Spouse is a Dependent of Another

If the taxpayer (or spouse) checks "can be claimed as dependent by another," two consequences follow:

1. Standard deduction is limited: use the Dependent Standard Deduction Worksheet (Line 12e). Result = max($1,350, earned_income + $450), capped at the base standard deduction for filing status.

2. The taxpayer CANNOT claim any dependents of their own: "You cannot claim any dependents if you, or your spouse if filing jointly, could be claimed as a dependent by another taxpayer."

This is most common for college students filed as Single who are still dependents on their parents' returns.

> **Source:** IRS Pub 501 p.25; Drake KB 10419 — https://www.irs.gov/publications/p501

---

### Married Filing Separately — Special Restrictions

MFS filers face numerous credit restrictions. The engine must enforce these downstream:
- Cannot claim EITC
- Cannot claim Dependent Care Credit (Form 2441) unless legally separated
- Cannot claim American Opportunity Credit or Lifetime Learning Credit
- Cannot claim the adoption credit (generally)
- Cannot claim the premium tax credit (generally)
- If one spouse itemizes deductions, the other must also itemize (standard deduction = $0)
- Standard deduction for MFS = $15,750 (same as Single for TY2025)
- "Lived apart" checkbox (lived_apart_mfs_hoh): if checked for MFS, may unlock certain IRA deduction phase-outs and some credits

> **Source:** 1040 Instructions pp.12–15; Drake KB 18910 — https://www.irs.gov/instructions/i1040gi

---

### HOH — Married Persons Living Apart Exception

A married person can qualify for HOH (and be treated as unmarried) if ALL of the following are met:
1. File a separate return from spouse
2. Paid more than half the cost of maintaining the home
3. Did not live with spouse during the LAST 6 MONTHS of the tax year (or legally separated under decree not a temporary order)
4. Home was the main home for a qualifying person for more than half the year
5. The qualifying person is the taxpayer's dependent qualifying child (or qualifying relative)

This is entered via the lived_apart_mfs_hoh checkbox on screen 1.

> **Source:** Pub 501 (2025), HOH — Married Persons Who Live Apart — https://www.irs.gov/publications/p501

---

### Qualifying Surviving Spouse — Timing

QSS is available for the TWO years FOLLOWING the year of a spouse's death. Example: if spouse died in 2023, the taxpayer can use QSS for TY2023 (actually files MFJ for year of death) and TY2024 and TY2025. After TY2025, must switch to Single or HOH.

If the taxpayer's spouse died IN 2025, the taxpayer files MFJ for TY2025 (not QSS). QSS would begin in TY2026.

The engine must validate: sp_date_of_death in the range [TY2023, TY2024] (i.e., 2023 or 2024) to allow QSS for TY2025. If sp_date_of_death = 2025, force MFJ (or at least warn).

> **Source:** Pub 501 (2025), Qualifying Surviving Spouse — https://www.irs.gov/publications/p501

---

### Form 8332 — Custodial Parent Releases Dependency

When a custodial parent releases the dependency claim to the non-custodial parent via Form 8332:

- The noncustodial parent claims the child as a dependent (enters on screen 2) and checks CTC
- The noncustodial parent gets the dependency exemption (for ODC and CTC)
- The CUSTODIAL parent retains the right to claim: HOH filing status (if otherwise qualified), EITC, dependent care credit (Form 2441), the dep_hoh_qualifier flag enables this in Drake

Implementation: The custodial parent uses the dep_hoh_qualifier = true flag to show the child as a HOH qualifier without claiming as a dependent.

> **Source:** Pub 501, Form 8332 — https://www.irs.gov/publications/p501

---

### Multiple Dependents — Form 1040 Overflow

Form 1040 has space for up to 4 dependents on the front page. When there are 5 or more dependents, the additional ones must be listed on a continuation statement. Drake handles this automatically — all dependents are entered on screen 2 (using the multi-form code feature); Drake generates the continuation as needed.

---

### Child Who Is Also a Qualifying Person for Form 2441 But Over Age 13

The Form 2441 under-13 age rule has an exception for disabled dependents. If a child is over age 13 but totally and permanently disabled, enter dep_totally_disabled = true on screen 2. The dep_childcare_expenses field then becomes active for that dependent for Form 2441 purposes. Drake generates a note for the preparer to verify disability qualifications.

> **Source:** Drake KB 11750 — https://kb.drakesoftware.com/kb/Drake-Tax/11750.htm

---

### ITIN Taxpayer Cannot Claim CTC

If the primary taxpayer has an ITIN (SSN beginning with 9), they cannot claim the Child Tax Credit or Additional Child Tax Credit, even if the dependent children have valid SSNs. They may still claim the Other Dependent Credit. The engine must check if tp_ssn begins with 9 and suppress CTC/ACTC in Form 8812.

> **Source:** Drake KB 18340 — https://kb.drakesoftware.com/kb/Drake-Tax/18340.htm

---

### Digital Assets — Mandatory Response

The digital assets question is mandatory for ALL taxpayers — not just those who transacted in digital assets. If the question is left unanswered, the return is incomplete. The engine must enforce that exactly one of digital_assets_yes or digital_assets_no is checked.

If digital_assets_yes = true, the return must separately report any gain or loss from digital asset transactions on Schedule D / Form 8949. The Yes/No answer on screen 1 does NOT by itself generate any tax — it only satisfies the disclosure requirement.

> **Source:** IRS.gov — https://www.irs.gov/filing/determine-how-to-answer-the-digital-asset-question

---

### Name Mismatch / Name Change

If the taxpayer's name has changed (marriage, divorce, legal name change), check the name_changed flag. The IRS will then verify the new name against SSA records before processing. Failure to notify SSA before filing can result in processing delays. The engine should display a warning if name_changed = true: "Ensure SSA records have been updated before filing."

> **Source:** 1040 Instructions, Name, p.11 — https://www.irs.gov/instructions/i1040gi

---

### Enhanced Senior Deduction Phase-Out (Schedule 1-A) — TY2025

The $6,000 enhanced senior deduction (new under OBBBA, effective TY2025–2028) begins to phase out at MAGI = $75,000 for Single/HOH/MFS and $150,000 for MFJ. Phase-out rate: 6 cents per dollar of MAGI over the threshold. Full phase-out: $175,000 single / $250,000 MFJ.

**Formula:**
```
excess = max(0, MAGI − threshold)   // $75,000 single; $150,000 MFJ
reduction = excess × 0.06
senior_deduction = max(0, $6,000 − reduction)   // per eligible person
```

This deduction is claimed on Schedule 1-A, Part V, and flows back to Form 1040 Line 13b. It can be claimed whether taking the standard deduction OR itemizing. Valid SSN required for each eligible person (ITIN holders do not qualify).

> **Source:** IRS newsroom (Schedule 1-A) — https://www.irs.gov/newsroom/irs-published-schedule-taxpayers-will-use-to-claim-deductions-on-no-tax-on-tips-no-tax-on-overtime-no-tax-on-car-loans-no-tax-on-seniors; IRS enhanced deduction eligibility — https://www.irs.gov/newsroom/check-your-eligibility-for-the-new-enhanced-deduction-for-seniors

---

## Sources

All URLs verified to resolve (tested during research).

| Document | Year | Section | URL | Saved as |
| -------- | ---- | ------- | --- | -------- |
| Drake KB — Federal 1040 Screen List | 2025 | Full screen list | https://kb.drakesoftware.com/kb/Drake-Tax/20051.htm | — |
| Drake KB — 2025 Form 1040 Changes | 2025 | Screen 1 and 2 changes | https://kb.drakesoftware.com/kb/Drake-Tax/18910.htm | — |
| Drake KB — Creating a New Return | 2025 | Screen 1 overview | https://kb.drakesoftware.com/kb/Drake-Tax/10221.htm | — |
| Drake KB — 1040 Dependent Not Showing | 2025 | Screen 2 fields | https://kb.drakesoftware.com/kb/Drake-Tax/10419.htm | — |
| Drake KB — Nonresident Alien Spouse | 2025 | Screen 1 NRA fields | https://kb.drakesoftware.com/kb/Drake-Tax/11051.htm | — |
| Drake KB — Third-Party Designee | 2025 | PREP screen | https://kb.drakesoftware.com/kb/Drake-Tax/10820.htm | — |
| Drake KB — IP PIN FAQs | 2025 | PIN screen, screen 2 | https://kb.drakesoftware.com/kb/Drake-Tax/12938.htm | — |
| Drake KB — 8812 CTC/ACTC/ODC | 2025 | Screen 2 → Form 8812 | https://kb.drakesoftware.com/kb/Drake-Tax/18340.htm | — |
| Drake KB — EIC FAQs | 2025 | Screen 2 EIC fields | https://kb.drakesoftware.com/kb/Drake-Tax/10886.htm | — |
| Drake KB — Form 2441 Dependent Care | 2025 | Screen 2 childcare | https://kb.drakesoftware.com/kb/Drake-Tax/11750.htm | — |
| Drake KB — Disabled Dependent | 2025 | Screen 2 disabled flag | https://kb.drakesoftware.com/kb/Drake-Tax/13172.htm | — |
| IRS Form 1040 Instructions (2025) | 2025 | Full — all sections | https://www.irs.gov/instructions/i1040gi | i1040gi.pdf |
| IRS Form 1040 (2025) | 2025 | Full form | https://www.irs.gov/pub/irs-pdf/f1040.pdf | f1040.pdf |
| IRS Publication 501 (2025) | 2025 | Filing Status, Dependents, Standard Deduction | https://www.irs.gov/publications/p501 | p501.pdf |
| IRS Schedule 8812 Instructions (2025) | 2025 | CTC/ACTC/ODC | https://www.irs.gov/pub/irs-pdf/i1040s8.pdf | i1040s8.pdf |
| IRS Topic 551 — Standard Deduction | 2025 | Standard deduction amounts | https://www.irs.gov/taxtopics/tc551 | — |
| IRS — Digital Asset Question | 2025 | Digital assets rules | https://www.irs.gov/filing/determine-how-to-answer-the-digital-asset-question | — |
| IRS — Get an IP PIN | 2025 | IP PIN overview | https://www.irs.gov/identity-theft-fraud-scams/get-an-identity-protection-pin | — |
| Rev. Proc. 2024-40 | 2024 | §3 — 2025 inflation adjustments | https://www.irs.gov/pub/irs-drop/rp-24-40.pdf | rp-24-40.pdf |
