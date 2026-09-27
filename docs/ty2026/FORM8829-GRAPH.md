# TY2026 home-office deduction and carryforward contract

The home-office building, additions and qualified-production-property
elections must share asset basis and activity identity with
[Form 4562](FORM4562-GRAPH.md); its line 22 cannot be deducted again after
Form 8829 depreciation has entered Schedule C line 30.

Sources: pinned [2026 draft Form 8829](corpus/draft/f8829.pdf), SHA-256
`90b84dd20515aa148e26b2c0f9b2c3a6d381475403d48bdd6a1f02aafeaac7e9`,
and [2026 draft instructions](corpus/draft/i8829.pdf), SHA-256
`1b6750eec4fb1e613fe3fa5e059f81e0e45b30412933ec986a5bfe7e4e42ac35`.
The instructions cite final [Notice 2026-16](corpus/authorities/n-26-16.pdf),
SHA-256 `742cb325c91706c97aa6cb65728e3f1ce78b19ae47f91d75217f7f976cba32ae`,
for a possible qualified-production-property (QPP) election. Pinned
[2025 Publication 587](corpus/authorities/p587--2025.pdf), SHA-256
`7f68de213b25a0f826b6112191fcf89e29c121865ef59c4945f8699de0a6d2af`,
is a **prior-year comparator** for simplified-method and home-office
background, not 2026 authority. Recheck final 2026 forms/instructions,
Publication 587 and current MeF before filing.

## Filing scope and source records

Form 8829 applies to **Schedule C actual-expense** home use. Prepare a
separate form for each home used for business. If one home serves multiple
businesses, allocate its final line 36 reasonably among their Schedule C
line 30 amounts. The form is not the route for partner or farm home-office
expenses, employee expenses, costs wholly allocable to inventory, or a home
for which the 2026 simplified method was elected. One home may use the
simplified method in a multi-home year; the others need the applicable
actual-expense route. Preserve `homeId`, `businessId`, method/election,
ownership/use dates, area and expense source IDs, prior carryforward year,
and separate direct/indirect/personal portions.

| 2026 Form 8829 part | Calculation and evidence | Downstream |
| --- | --- | --- |
| I, lines 1–7 | Qualifying exclusive/regular use, or storage/daycare exception; business area ÷ total area. Nonexclusive daycare multiplies its area percentage by daycare hours ÷ available hours (8,760 only for a full year). A mixed exclusive/nonexclusive daycare facility needs the special computation **and an attached statement**. | Line 7 business percentage allocates indirect expenses and building basis. Avoid counting inventory space here when its costs belong to inventory. |
| II, line 8 | Schedule C line 29 before the home deduction, plus gain from home business use, less unrelated trade/business loss; split between multiple homes/locations by the instruction rule. | Gross-income limit for this form, tied to its Schedule C activity and Form 8949/4797 where applicable. |
| II, lines 9–15 | Direct/indirect otherwise-deductible casualty loss, mortgage interest/insurance premium and real estate tax. Coordinate with Schedule A deduction choice and limits; line 14 precedes the line 15 ceiling. For a SALT-limited itemizer, the 2026 **line 11 worksheet may iterate** Form 8829 → Schedule C/SE/AGI → Schedule A SALT limit until MAGI changes by no more than $1. | Keep business and personal tax/interest portions disjoint. Form 4684 supplies casualty treatment. |
| II, lines 16–28 | Excess mortgage interest and real estate taxes, insurance, rent, repairs, utilities and other direct/indirect operating expense; add prior operating carryover on line 25. Allow line 27 only to the remaining line 15 limit. | Line 43 = line 26 − line 27 carried to **2027** by home/source year. It can survive a 2025 simplified-method year; recover the last 8829 or 2025 simplified worksheet. |
| II, lines 29–36 | Excess casualty loss, current home depreciation and prior excess casualty/depreciation carryover. Apply the residual line 28 limit. Line 35 casualty portion goes to Form 4684 line 27; line 36 excludes that amount from the Schedule C expense. | **Line 36 → Schedule C line 30** once, allocated if the home serves multiple businesses. Line 44 = line 32 − line 33 carries to 2027 separately from operating expenses. |
| III, lines 37–42 | Smaller of adjusted basis or FMV at conversion, less land, times line 7 percentage; choose depreciation by actual first-business-use date and property history. The 2026 mid-month first-year line 41 table ranges January **2.461%** to December **0.107%**; pre-2026 use generally has **2.564%** subject to exceptions. Additions/improvements have separate dates, basis and statement/Form 4562 rules. A QPP election requires its own eligibility evidence under Notice 2026-16 and basis/recapture tracking. | Line 42 returns to line 30 of this form; do **not** also put this amount on Schedule C line 13. Form 4562 is required for first 2026 home use or 2026 additions/improvements. |

The [PDF field inventory](pdf-fields-f8829.csv) has **58 widgets**, all in
the field tree on one printed page (PDF page 2 after the draft cover).
It includes both direct and indirect columns for lines 9–12 and 16–23,
Part III depreciation, and separate Part IV carryovers. Verify the field
tree and rendered appearances for every attached home and statement.

## Current code boundary

- Shared `form_8829` accepts only area, a single preallocated mortgage
  interest amount, a handful of indirect costs, a caller-supplied
  nonnegative gross-income limit, a single home basis-or-FMV number, one
  month code and two prior carryover totals. It has no eligibility,
  daycare-hours, direct expenses, SALT/mortgage/casualty reconciliation,
  land, improvement assets, acquisition/disposition dates, QPP election,
  Schedule A interaction, or per-home/business identity.
- `businessPct()` only divides area; line 7 daycare and mixed-use statements
  cannot be computed. The node lumps otherwise-deductible mortgage interest
  into the limited operating pool, although Form 8829 puts line 14 before
  the line 15 limit. It omits line 35 casualty separation and never derives
  lines 43/44, so unused costs and origin-year carryforwards disappear.
- Depreciation uses a hard-coded TY2025 month-rate table on one input
  `home_fmv_or_basis` and `first_business_use_month` (`0` means prior year).
  The numeric ordinary first-year rates happen to match the 2026 printed
  table, but the input lacks land, conversion value, prior method,
  additions and QPP treatment. It must select the actual 2026 path from
  asset facts rather than equating a month code with eligibility.
- The node emits only a `line_30_home_office` amount to the shared
  TY2025 Schedule C target and does not self-emit Form 8829 lines or file
  an attachment. It is absent from the TY2026 registry/public input
  surface. The TY2025 PDF descriptor maps `total_area` to the 2026 **line
  1 business area** field and `business_area` to **line 2 total area**;
  several expense keys also target different 2026 printed rows. Its MeF
  serializer emits only twelve raw fields, without the full worksheet or
  repeated-home/statement representation.

## Build and acceptance order

1. Add home, activity, year, method, qualifying-use/daycare, source expense,
   conversion/land/improvement asset and carryforward records. Resolve
   Form 1098, tax, casualty, Form 4797/8949 and Schedule A source ownership
   before Form 8829 arithmetic. Enforce one simplified-method home and
   distinguish Schedule C from farm/partnership/employee cases.
2. Compute lines 1–44 in printed order, with distinct otherwise-deductible,
   operating and depreciation/casualty buckets. Implement the 2026
   line 11/Schedule A SALT iteration where indicated by the instructions;
   reconcile Schedule C line 29/31, Schedule SE, AGI and Schedule A. Save
   2027 line 43 and 44 carryforward records even when line 36 is zero.
3. Render each required 2026 Form 8829 and daycare/improvement/other
   statements. Send line 35 to Form 4684, line 36 to Schedule C line 30,
   and line 42 asset facts to Form 4562 as instructed. Build MeF from the
   current 2026 XSD and active rules; compare PDF/XML and cross-form totals.
4. Test ordinary office, daycare (full and partial year, mixed space),
   storage exception, multiple homes/businesses, simplified-method switch
   with old carryovers, direct vs indirect expenses, itemized vs standard
   deduction, SALT-limited iteration, casualty, zero/negative profit,
   current/prior-year depreciation and improvements, QPP election gate,
   and carryforward into 2027. Re-run TY2025 cases for any shared code.
