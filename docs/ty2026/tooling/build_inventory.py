#!/usr/bin/env python3
"""Regenerate the TY2025 surface inventory used by the TY2026 plan."""

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
PDF = ROOT / "forms/f1040/2025/pdf/forms"
MEF = ROOT / "forms/f1040/2025/mef/forms"
NODES = ROOT / "forms/f1040/nodes"
REGISTRY = ROOT / "forms/f1040/2025/registry.ts"

# A node stays unverified until its 2026 behavior, outputs, and form route are
# checked. These notes identify work already started without marking it done.
NODE_PROGRESS = {
    "nol_carryforward": "Current Form 172/instructions and 109 fillable widgets pinned; derive pre-NOL taxable income from graph, deplete origin-year/owner balances oldest first, route allowed amount to Schedule 1 line 8a, and file each required IRS172 plus limitation statement; see FORM172-NOL-GRAPH.md; refresh 2026 law and MeF.",
    "rrb1099r": "RRB issuer explanations and IRS Pubs 575/915/939 pinned; shared node combines SSEB RRB-1099 boxes with pension RRB-1099-R boxes and mislabels 6-10; use separate owner-keyed source records and 1040 6a/b versus 5a/b, withholding/PDF/current MeF; see RRB-1099-GRAPH.md",
    "f4852": "Current Sep 2020 continuous-use form/printed instructions pinned; reconcile real/corrected/substitute payer records, line7e/8f withholding, taxable 1099-R basis, FICA/8959/5329, 34 PDF widgets/current MeF; see FORM4852-GRAPH.md",
    "f8938": "December 2026 draft and November 2021 continuous-use instructions pinned; calculate filer/abroad threshold and asset/exception ledger, Parts I-VI and continuation, 131 PDF widgets/current MeF; see FORM8938-GRAPH.md",
    "f3903": "2026 form/instructions pinned; add intelligence-community/certification, per-move expense and W-2 code P ledger, storage-only/2555, Schedule 1 line14 and 1040 line1h, PDF/current MeF; see FORM3903-EDUCATOR-GRAPH.md",
    "educator_expenses": "2026 Schedule 1 line11 plus Schedule A line17k; require 900-hour/role evidence and owner-keyed nonduplicated expenses, apply per-educator cap then itemized choice/overall limit, PDF/current MeF; see FORM3903-EDUCATOR-GRAPH.md",
    "f1098": "2025 continuous-use form and Dec 2026 instructions pinned; do not register until 8a/8c points correction, 2026 8d MIP, debt/use and mixed-activity allocation, box4 tax-benefit recovery, PDF/current MeF; see FORM1098-1098E-GRAPH.md",
    "f1098e": "2026 form and combined instructions pinned; registered box1/AGI/line21 slice remains, add qualified-loan/borrower and box2 paid-interest facts, full MAGI/SSA audit, PDF/current MeF; see FORM1098-1098E-GRAPH.md",
    "f1099oid": "Jan 2024 continuous-use form/combined instructions pinned; unregistered node mishandles box6 net reporting, TIPS negatives, box10 premium, box11 tax-exempt/PAB split, boxes3/5/12-14; add basis and Schedule B/1/AMT/1040/PDF/current MeF; see INTEREST-GRAPH.md",
    "start": "Use 2026 registry entry and per-return year guard; reconcile all input registration and absent output targets before enabling a complete return; see GRAPH-ROUTES.md and PARITY-QUEUE.md",
    "ext": "Route 2026 Form 4868 extension payment to Schedule 3 line 10 and 1040 settlement; keep extension application/ATS scenario 7 distinct from the final return; see PDF-SCHEDULE3-MAP.md and ATS.md",
    "f1099c": "Classify each debt cancellation as taxable Schedule 1 line 8c, Form 982 exclusion, or property-basis/capital event; preserve creditor/debt/source evidence and attachment route; see FORM982-GRAPH.md",
    "f1099k": "Final Dec 2026 form/instructions pinned; distinguish issuer $20k-and-200 threshold from taxable income, reconcile gross with transaction ledger, 1c cash tips/1d TTOC to Schedule 1-A, Schedule 1 header/8949/C/E/F and box4 withholding; see FORM1099K-GRAPH.md",
    "f1099g": "Final Dec 2026 form/instructions and Rev Rul 2025-4 pinned; registered unemployment/refund/withholding slice remains, add box10 family leave, box8 business refund, box7 farm/box9 CCC, same-year repayments and current MeF; see FORM1099G-GRAPH.md",
    "f1099m": "Final Dec 2026 MISC/combined instructions pinned; reconcile income by activity and 1099-K, add boxes 13a cash tips/13b TTOC/14 overtime as included components of box3 for Schedule 1-A; see FORM1099MISC-NEC-GRAPH.md",
    "f1099nec": "Final Dec 2026 NEC/combined instructions pinned; box1a income includes 1b tips and 1d overtime, 1c TTOC; use existing business/farm or Form8919 source, Schedule 1-A tags and withholding, no synthetic Schedule C; see FORM1099MISC-NEC-GRAPH.md",
    "f1099int": "Reconcile payer-level box amounts, withholding, Schedule B, AGI and foreign/AMT branches against 2026 sources; see INTEREST-GRAPH.md",
    "f1095a": "Route each policy's monthly 1095-A premiums/SLCSP/APTC and shared-policy facts to Form 8962; node is absent from 2026 registry; see FORM8962-GRAPH.md",
    "f8863": "Final 2026 1098-T/combined instructions pinned; derive expenses after aid, prior-year boxes4/6 recapture, 2026-versus-2025 box7, EIN and exception before Form 8863 refundable/nonrefundable split, Schedule 3/1040, PDF/current MeF; see FORM8862-8863-EIC-GRAPH.md",
    "f8949": "Preserve broker/digital-asset lot, category, basis and adjustment detail through Schedule D, multi-page PDF and current MeF; see CAPITAL-GAIN-GRAPH.md and PDF-FORM8949-MAP.md",
    "f5695": "2026 form is prior-year residential clean-energy carryforward only; remove new-expense/joint-occupancy branches and finish credit-limit/PDF/MeF; see FORM5695-CREDIT-GRAPH.md",
    "f8862": "Prior disallowance/recertification must gate EIC/CTC/AOTC sources and filed 2026 attachment; see FORM8862-8863-EIC-GRAPH.md",
    "f7207": "Build 2026 facility/election/recapture record with Form 3800/4255, PDF and current MeF; see GENERAL-BUSINESS-CREDIT-GRAPH.md and ATS-SCENARIO-12.md",
    "f4136": "Use per-business fuel purchase/use ledger and 2026 main form, 2025 Schedule A comparator, Schedule 3 line 12, PDF/current MeF; see FORM4136-GRAPH.md",
    "f8822": "Address-change administrative form returns no graph output; decide separate Form 8822 workflow versus 1040 address update, using current authority and filed-output path",
    "clergy": "Reconcile housing exclusion and Schedule SE base to 2026 Schedule 1/1040, including line 27b clergy checkbox and AGI; see FORM-DELTA.md and SCHEDULE1-GRAPH.md",
    "f3800": "Build source-credit provenance, passive release, limitation/carryover and elective-payment/transfer reconciliation before Schedule 3 line 6a; see GENERAL-BUSINESS-CREDIT-GRAPH.md",
    "f8859": "2026 form is disabled-credit carryforward only; reconcile origin-year balance, liability limit, Schedule 3 and filed form; see FORM8396-8859-8880-GRAPH.md",
    "f8615": "Child eligibility, unearned-income source, parent/sibling tax and preferential-rate worksheets must feed 1040 line 16 and 2026 PDF/MeF; see FORM8615-GRAPH.md",
    "fec": "Foreign-employer compensation reaches 1040 line 1h and AGI; wage foreign-tax/2555 allocation must retain employer/country/source IDs for Form 1116; see FORM1116-GRAPH.md and FORM2555-GRAPH.md",
    "qsehra": "Replace TY2025 benefit limits; reconcile offered/received amount by month with 1095-A/Form 8962 PTC and wage/AGI route for non-MEC reimbursements; see FORM8962-GRAPH.md",
    "depletion": "Keep property/year basis, reserves, units, cost/percentage method and 65% cap through Schedule C/E and asset-disposition basis; verify 2026 resource rates and limits before enabling",
    "f56": "Fiduciary-notice Form 56 has no calculation output; decide separate filing/administrative workflow and current form authority before any 2026 registry inclusion",
    "preparer": "Carry paid-preparer/ERO identity into 2026 1040 signature area and current MeF return header; verify PTIN/EFIN fields and self-prepared rules against selected release",
    "form8396": "MCC credit, home interest deduction reduction, liability limit and three-year carryforward use 2026 form PDF/current MeF; see FORM8396-8859-8880-GRAPH.md",
    "form8880": "2026 contribution/distribution/student tests, phased percentage and tax-limit worksheet route saver credit through Schedule 3; see FORM8396-8859-8880-GRAPH.md",
    "form8919": "2026 reason-code wages and Social Security/Medicare tax route to 1040 line 1g and Schedule 2 line 16b; see FORM4137-8919-GRAPH.md",
    "form8960": "NIIT investment-income/deduction/MAGI graph routes to 2026 Schedule 2 line 6 with 38 PDF widgets/current MeF; see FORM8960-GRAPH.md",
    "schedule_b": "Reconcile payer/source thresholds, interest/dividends, Part III foreign-account/trust questions and any statement before 1040; see PDF-SCHEDULEB-MAP.md",
    "alimony_received": "Pre-2019 agreement/modification evidence gates taxable 2026 Schedule 1 line 2a and 2b original-date field; reconcile AGI; see SCHEDULE1-GRAPH.md",
    "general": "2026 ages, relative limit, and no-dependent identity graph updated; audit credits",
    "w2": "2026 SIMPLE, TP/TT, and Schedule 2 box12 updated; ATS 2 statutory box13 must route to Schedule C once, not 1040 wages; see ATS-SCENARIO-02.md",
    "auto_expense": "2026 business mileage periods updated; audit remaining rules",
    "f2106": "2026 business mileage and AGI limit updated; audit remaining rules",
    "f8621": "Current Dec 2025 Form 8621/instructions pinned; 2026 Schedule 2 routes line 16f/24 interest to 19a/19b, while shared node uses old 17p; complete PFIC elections/Part VI, 151 PDF widgets and current MeF; see FORM8621-GRAPH.md",
    "f7217": "Current Dec 2024 form/instructions and Apr 2026 K-1 box 19 correction pinned; per-date distribution, property basis/gain route, 306 PDF widgets and current MeF remain; see FORM7217-GRAPH.md",
    "f8826": "Current Sep 2017 form with embedded instructions pinned; route cost reduction, passive release and Form 3800 before Schedule 3, 18 PDF widgets/current MeF; see FORM8826-8835-STATEMENTS.md",
    "f8835": "2025 form/instructions pinned as comparator, 2026 section 45 notice identified; replace 2025 rate/calendar assumption and build facility PDF/MeF and Form 3800 route; see FORM8826-8835-STATEMENTS.md",
    "f8911": "Current Dec 2025 form/Schedule A/instructions apply to 2025+; Jun 30 2026 service cutoff, per-item personal/business split, 15/35 PDF widgets and current MeF; see MEF-REMAINDER.md",
    "f8978": "Current Jan 2023 form/Schedule A and Dec 2024 instructions pinned; affected-year recomputation and reporting-year positive/negative routes need 91/154 PDF widgets/current MeF; see MEF-REMAINDER.md",
    "f5884": "Current Mar 2021 form/instructions and pre-2026 hire cutoff pinned; add hire/certification facts, 13 PDF widgets and Form 3800/current MeF; see FORM5884-6765-8994-GRAPH.md",
    "f6765": "Current form/instructions pinned; 2026 Section G requirement and form-revision header conflict identified; replace QRE shortcut, build 270 PDF widgets, payroll election and Form 3800/current MeF; see FORM5884-6765-8994-GRAPH.md",
    "f8994": "Notice 2026-28 pinned; wage/premium method, eligibility and deduction updates missing from shared node; 2021 form is comparator, current Form 3800/MeF needed; see FORM5884-6765-8994-GRAPH.md",
    "f3468": "Published 2025 form/instructions pinned as comparator and Notice 2026-15 PFE guidance pinned; shared flat credit skips seven-part facility ledger, 321 PDF widgets, Form 3800/4255/current MeF; see FORM3468-GRAPH.md",
    "f4255": "Current Dec 2025 form/instructions pinned; shared node sends recapture to 2026 Schedule 2 line 17a (household tax), missing credit-use/EPE/transfer/PWA/emissions, 646 PDF widgets/current MeF; see FORM4255-GRAPH.md",
    "f965": "Current Jan 2021 Form 965-A/instructions pinned; 2026 Schedule 2 prints line 12 but line 15 omits it; shared node uses obsolete line 9 and 2017-only final-year assumption; build liability/payment/deferral ledger, PDF/current MeF; see FORM965A-GRAPH.md",
    "schedule_r": "2026 form/instructions pinned; shared node skips tax-liability worksheet, QSS base and MFJ mixed-age disability rules; derive box/line 10-22 from owner facts, add PDF/current MeF; see SCHEDULER-GRAPH.md",
    "schedule_j": "2026 form and 2025 instruction comparator pinned; derive 2023-25 base-year income/tax and current farming/fishing election, calculate lines 1-23 and compare regular tax before 1040 line 16, PDF/current MeF; see SCHEDULEJ-GRAPH.md",
    "schedule_a": "2026 deduction source/choice and noncash-gift attachment need the SALT, charity floor, mortgage-interest and AGI loops; reconcile Form 8283/ATS 2 and current PDF/MeF; see DEDUCTION-GRAPH.md",
    "eitc": "2026 qualifying-child, earned-income, recertification and opt-out answers must reconcile Schedule EIC/8862, 1040 line 27 and ATS 4/ATS 2; see FORM8862-8863-EIC-GRAPH.md",
    "form5695": "2026 draft is prior-year residential clean-energy carryforward only; remove new-expense/joint-occupancy branches and finish credit ordering/PDF/MeF; see FORM5695-CREDIT-GRAPH.md",
    "schedule3": "2026 lines 6c/6i/6j/6k/6l, line 12 fuel credit and refundable Part II need source credits, ordering, PDF and current MeF; see PDF-SCHEDULE3-MAP.md",
    "schedule_h": "Dedicated 2026 FUTA Section A and household-tax PDF begun; Section B, payroll derivation and MeF remain; see SCHEDULEH-GRAPH.md",
    "agi_aggregator": "Reconcile 2026 Schedule 1/1-A, 1040 sources and foreign exclusions before deduction/tax; close all missing route targets and ATS graphs; see SCHEDULE1-GRAPH.md and GRAPH-ROUTES.md",
    "income_tax_calculation": "2026 ordinary/preferential tax, AMT, Form 8978 and credit-limit order must derive 1040 line 16 from return sources; see CAPITAL-GAIN-GRAPH.md and DEDUCTION-GRAPH.md",
    "standard_deduction": "2026 age/blind/dependent/status limits and itemized-vs-standard choice feed 1040 line 12; reconcile ATS 2 and Schedule A; see DEDUCTION-GRAPH.md",
    "schedule1": "2026 Schedule 1 lines and source ownership differ from 2025, including gambling, 8p loss, 13 HSA and 24j housing; build PDF/current MeF; see SCHEDULE1-GRAPH.md",
    "form8962": "2026 percentage and repayment paths updated; verify final instructions",
    "form_1116": "2026 line 18 adds Schedule 1-A line 43 and line 20 needs Schedule 2 line 1z; shared node omits full category/carryover and new PDF/MeF route; see FORM1116-GRAPH.md",
    "form2555": "2026 form/instructions and Notice 2026-25 pinned; structured filing rejects 2026 and housing route uses legacy Schedule 1 key; see FORM2555-GRAPH.md",
    "f8936": "2026 form/combined instructions pinned; shared node rejects eligible 2026 service and lacks commercial/dealer/business routes; see FORM8936-GRAPH.md",
    "form2441": "2026 benefit and credit rules updated; verify final instructions",
    "form982": "2026 qualified-residence debt date gate updated; audit remaining rules",
    "form8839": "2025/2026 refundable split, indexed caps, and origin-year carryforward updated; add full credit-limit worksheet",
    "form4562": "Asset/activity ledger, 2026 Part I-V, Schedule C/E/F/4835/8829 routes, 271 PDF widgets and current MeF remain; shared node sends depreciation to obsolete Schedule 1 line 13",
    "form461": "Return-wide 2026 business-loss worksheet, source classification, NOL carryover, 18 PDF widgets and current MeF remain; shared node sums precomputed per-source excesses",
    "form8582": "2026 activity-level passive loss, MFS lived-apart branch, per-form allocations, 205 PDF widgets and current MeF remain; shared node collapses carryforwards",
    "form6198": "Continuous-use 2025 form/instructions pinned for TY2026; activity basis/financing, Part III, recapture, per-item carryforward, 34 PDF widgets and current MeF remain",
    "form4684": "2026 draft and 2025 instruction comparator pinned; per-event casualty, state/qualified disaster, Schedule A/4797, Ponzi, election, 162 PDF widgets and current MeF remain",
    "form4797": "2026 draft and 2025 instruction comparator pinned; per-asset Part I-IV, 1231 history, 4684 feedback, QPP checkbox, 188 PDF widgets and current MeF remain",
    "form6252": "2026 draft includes instructions; cross-year sale, recapture, related-party/deemed payments, 49 PDF widgets and current MeF remain; embedded Form 4797 references stale",
    "form8824": "2026 draft and 2025 instruction/Pub544 comparators pinned; multi-property/related-party/recapture, deferred basis, section 1043, 68 PDF widgets and current MeF remain",
    "form8990": "2026 draft and 2025-revision instructions pinned; $32M threshold, source-level BIE/capitalization, ATI, partnership/S-corp/CFC branches, 138 PDF widgets and current MeF remain",
    "form4952": "2026 form embeds instructions; investment-interest election, Schedule A/6198/E, AMT carryforward, 17 PDF widgets and current MeF remain; shared node requires AMT facts unconditionally",
    "form4972": "2026 form embeds instructions; per-participant election, Part II-only ordinary 1099-R remainder, NUA, beneficiary/estate-tax allocation, 58 PDF widgets and current MeF remain; see FORM4972-GRAPH.md",
    "form8815": "2026 form/instructions pinned; shared QSS phaseout uses MFJ thresholds contrary to form, PDF descriptor puts amounts in student/school fields; build source/expense ledger, 23 PDF widgets and current MeF; see FORM8815-GRAPH.md",
    "f8915f": "2026 form draft pinned; 2025 instructions comparator only; replace $100k aggregate/Schedule 1 8z node with $22k-per-disaster ledger, 1040 lines 4b/5b, Form 8606/5329 and Part IV; 102 PDF widgets/current MeF remain; see FORM8915F-GRAPH.md",
    "f8915d": "Latest official Form 8915-D and instructions are 2024; last 2019-disaster repayment window expired in 2024 and carrybacks affect older returns; do not register TY2026 Schedule 1 8z node without newer authority; see FORM8915D-STATUS.md",
    "f8912": "Current Dec 2024 continuous-use form/instructions pinned; 2026 Schedule 3 line 6k persists; shared input blocks 2025-origin carryforward and pass-through CREB, 218 PDF widgets/current MeF remain; see FORM8912-GRAPH.md",
    "form982": "Current March 2018 form/Dec 2021 instructions pinned; 2026 QPRI written-date source missing from 1099-C, shared node drops fully excluded attachment and omits Part II; TY2025 PDF numeric fields mis-map; 27 widgets/current MeF; see FORM982-GRAPH.md",
    "f8834": "Current Oct 2024 form embeds instructions and applies to 2024+; 2026 Schedule 3 line 6i persists; derive Form 8582-CR released legacy passive credit, finalized TMT/order, 11 PDF widgets/current MeF; see FORM8834-GRAPH.md",
    "form6781": "2026 form embeds instructions; 1256 carryback and straddle Parts II/III, elections, QOF routing, 71 PDF widgets and current MeF remain; shared node handles only simple 60/40 accounts",
    "form8615": "2026 form/instructions pinned; child eligibility and source-derived unearned income, parent/sibling preferential worksheets, 2555/Schedule J, 32 PDF widgets and current MeF remain; shared calculator handles ordinary tax only",
    "f8814": "2026 form/instructions pinned; per-child election and source eligibility, special-gain/AMT/foreign-account detail, parent AGI/credit/NIIT routes, 26 PDF widgets and current MeF remain; shared input trusts eligibility flags",
    "f8997": "2026 form changes QOF Parts III-V for end-of-deferral recognition; 2025 form is prior-year instruction comparator, 2026 instructions absent; build investment ledger, 2026 inclusion and Form 8949 route, PDF/MeF",
    "form8997": "2026 QOF deferral ends for legacy investment; shared node treats all inclusion as long-term and misses form disclosure; reconcile with 2026 Form 8997 Parts III-V and Form 8949",
    "f1040": "dedicated 2026 node begun; expand upstream surface and finalizations",
    "schedule1a": "2026 line 13a, TP/4137 employer reconciliation, TT updated; audit remaining sources",
    "form4137": "2026 tips reach Schedule 1-A, income, Schedule 2 tax; audit other cases",
    "schedule2": "dedicated 2026 line calculator/node routes tip and W-2 taxes; split other sources",
    "f8812": "2026 Part II-B uses Schedule 2 lines 16c/17c; Worksheets A/B use 2026 Schedule 3 lines; finish credit graph",
    "f1099div": "2026 ordinary/qualified/exempt dividends, direct box2a gain, PAB/AMT, and withholding; add special gains, QBI, foreign credit, and MeF",
    "schedule_d": "2026 box2a, carryover, and 1099-B/DA transaction PDF routes verified; add other capital sources, QOF, and MeF",
    "f1099b": "dedicated 2026 1099-B input registered with Form 8949/Schedule D PDF; add unsupported broker branches and MeF",
    "form8949": "2026 broker and digital-asset transactions reach category PDF pages and Schedule D; add direct public trades and MeF",
    "schedule_e": "2026 draft adds vehicle-interest line 13a; build activity-level Part I-V graph, PDF, MeF, and ATS 3/6; see SCHEDULEE-GRAPH.md",
    "f1099r": "final 2026 form/instructions pinned; fully and partially taxable normal pensions, code1 early tax, early SIMPLE Form5329 Part I, and pension code G rollover reach AGI/1040/PDF; add other codes, 8606/4972, current MeF; see FORM1099R-GRAPH.md",
    "f2441": "2026 form/instructions pinned; monthly deemed-income and provider continuation built; finish eligibility, prior-year expense, self-employed benefit, PDF and MeF; see FORM2441-GRAPH.md",
    "ssa1099": "dedicated 2026 SSA/RRB source registered through AGI and PDF; add net-repayment deduction, lump-sum election, MeF, and current-year instruction check",
    "form5329": "dedicated 2026 Part I early SIMPLE 25% graph and PDF route; add exceptions, other parts, separate spouse forms, MeF; see FORM5329-GRAPH.md",
    "form8606": "2026 form and instructions pinned; dedicated per-owner basis and Roth calculation needed before registry; see FORM8606-GRAPH.md",
    "form8889": "2026 form/instructions pinned; shared node lacks month-by-month eligibility/spouse allocation, routes income/tax to wrong lines, and omits PDF/MeF parts; see FORM8889-GRAPH.md",
    "form8959": "2026 form/instructions pinned; shared node sends combined old line 18 tax to Schedule 2 line 11, but 2026 splits line 12/18 to 17b/11 and changes PDF positions; see FORM8959-GRAPH.md",
    "form7206": "2026 form/instructions pinned; shared node uses aggregate profit/PTC shortcut, lacks per-business earnings and Form 2555, PDF fields mis-map; see FORM7206-GRAPH.md",
    "form8853": "2026 form/instructions pinned; shared node routes penalty to old Schedule 2 keys, omits MSA prior-year worksheet and LTC multi-payee statements; see FORM8853-GRAPH.md",
    "form_8829": "2026 form/instructions and Notice 2026-16 pinned; shared node omits daycare/direct costs, Schedule A/SALT loop and 2027 carryforwards; PDF area fields reversed; see FORM8829-GRAPH.md",
    "schedule_f": "2026 draft makes line 21b vehicle interest and 21c other interest; build dedicated farm input, PDF/MeF, ATS 3; see SCHEDULEF-GRAPH.md",
    "f4835": "2026 form/instructions pinned; line 19b vehicle interest and farm-rent Schedule E route need PDF/MeF and ATS 3; see FORM4835-GRAPH.md",
    "schedule_se": "ATS 3 elects 2026 farm optional method; current Schedule F suppresses low-profit/loss SE route and 2025 PDF map puts profit in 2026 name field; see SCHEDULESE-GRAPH.md",
    "f1099patr": "continuous-use source pinned; shared box 6/8/9 labels are wrong and boxes 10-13 missing; rebuild cooperative QBI route; see QBI-COOPERATIVE-GRAPH.md",
    "form8995": "2026 simplified form and $400 minimum pinned; patron status requires Form 8995-A; remove estimated-income path for 2026; see QBI-COOPERATIVE-GRAPH.md",
    "form8995a": "2026 form/schedule A and continuous-use schedules B/C/D pinned; add patron reduction, 199A(g), $400 minimum, per-business PDF/MeF; see QBI-COOPERATIVE-GRAPH.md",
    "qbi_aggregation": "Schedule B 8995-A pinned; shared input captures groups but emits no filing/calculation route; see QBI-COOPERATIVE-GRAPH.md",
    "w2g": "final Jan 2026 form/instructions pinned; shared box 2/3/7 labels stale and winnings route to 8z, not 2026 Schedule 1 line 8b; see ATS-SCENARIO-06.md",
    "k1_partnership": "ATS 6 Part II row needs activity, allowed-loss evidence, Schedule E line 41 route, PDF and MeF; packet lacks K-1; see ATS-SCENARIO-06.md",
    "schedule_c": "ATS 2 statutory W-2 output is unused by shared node; line 16b/16c, 44a-c, 109-widget PDF and current MeF needed; see SCHEDULEC-GRAPH.md",
    "f8283": "Dec 2025 continuous-use form/instructions pinned; ATS 2 source record and Schedule A deduction/attachment choice need 2026 routing; see ATS-SCENARIO-02.md",
    "f8888": "Nov 2026 form/instructions pinned; ATS 5 split depends on final refund, shared node metadata-only and savings-bond fields obsolete; add PDF/current MeF; see ATS-SCENARIO-05.md",
}

P0_NODES = {
    "f1040", "general", "schedule_a", "schedule1a", "schedule1", "schedule2",
    "schedule3", "form8839", "form8962", "form5695", "f8936", "f8812",
    "eitc", "income_tax_calculation", "agi_aggregator", "standard_deduction",
    "form4562", "f1099patr", "form8995", "form8995a", "form_8829", "schedule_h",
    "f8835", "form1062",
}
P1_NODES = {"form_1116"}

# Keep the catch-up ledger tied to the explicit route-owner table. This is
# only a plan reference, never a verified 2026 disposition.
boundary_table = "\n".join(
    line for line in (OUT / "NODE-BOUNDARY-AUDIT.md").read_text().splitlines()
    if line.startswith("| ") and line.count("`") > 0
)
BOUNDARY_NODES = set(re.findall(r"`([^`]+)`", boundary_table))

manifest = json.loads((OUT / "corpus/manifest.json").read_text())
drafts = {Path(f["path"]).stem for f in manifest["files"]
          if f["kind"] == "draft-form" and f["status"] == "downloaded"}
pdf_rows = []
for path in sorted(PDF.glob("*.ts")):
    if path.name.endswith(".test.ts") or path.name == "index.ts":
        continue
    content = path.read_text()
    match = re.search(r'pdfUrl:\s*"([^"]+)"', content)
    if not match:
        continue
    slug = re.search(r"/([a-z0-9]+)(?:--\d{4})?\.pdf", match.group(1))
    pdf_rows.append({"component": path.stem, "pdf_descriptor": str(path.relative_to(ROOT)),
                     "ty2025_pdf_url": match.group(1), "irs_slug": slug.group(1) if slug else "",
                     "ty2026_draft_snapshot": "yes" if slug and slug.group(1) in drafts else "no"})

with (OUT / "pdf-coverage.csv").open("w", newline="") as handle:
    writer = csv.DictWriter(handle, fieldnames=list(pdf_rows[0]), lineterminator="\n")
    writer.writeheader()
    writer.writerows(pdf_rows)

mef_index = (MEF / "index.ts").read_text()
mef_names = sorted(set(re.findall(r'from "\./([^"/]+)\.ts"', mef_index)))
mef_components = set(mef_names)
pdf_components = {row["component"]: row for row in pdf_rows}
with (OUT / "mef-coverage.csv").open("w", newline="") as handle:
    writer = csv.writer(handle, lineterminator="\n")
    writer.writerow(["component", "ty2025_serializer"])
    writer.writerows((name, str((MEF / (name + ".ts")).relative_to(ROOT))) for name in mef_names)

# The module ledger has 84 rows, but the runtime ALL_MEF_FORMS list has 85
# descriptors: foreign_employer_wages.ts exports two separate documents.
imports = {}
for imported, module in re.findall(
    r'import\s*\{([^}]+)\}\s*from\s*"\./([^"/]+)\.ts"', mef_index
):
    for symbol in re.sub(r"//[^\n]*", "", imported).split(","):
        symbol = symbol.strip()
        if symbol:
            imports[symbol] = module
array = mef_index.split("export const ALL_MEF_FORMS = [", 1)[1].split(
    "] as const;", 1
)[0]
symbols = [line.strip().rstrip(",") for line in array.splitlines()
           if line.strip() and not line.strip().startswith("//")]
descriptor_rows = []
for sequence, symbol in enumerate(symbols, 1):
    module = imports[symbol]
    source = (MEF / (module + ".ts")).read_text()
    declaration = re.search(r"export const " + re.escape(symbol) + r"\b", source)
    if declaration is None:
        raise ValueError(f"MeF descriptor export not found: {symbol}")
    pending_key = re.search(r'pendingKey:\s*"([^"]+)"', source[declaration.end():])
    if pending_key is None:
        raise ValueError(f"MeF pending key not found: {symbol}")
    descriptor_rows.append({
        "sequence": sequence,
        "symbol": symbol,
        "pending_key": pending_key.group(1),
        "ty2025_module": str((MEF / (module + ".ts")).relative_to(ROOT)),
    })
with (OUT / "mef-descriptor-coverage.csv").open("w", newline="") as handle:
    writer = csv.DictWriter(handle, fieldnames=list(descriptor_rows[0]),
                            lineterminator="\n")
    writer.writeheader()
    writer.writerows(descriptor_rows)

year_literals = []
for path in sorted(NODES.rglob("*.ts")):
    if path.name.endswith(".test.ts") or "/config/" in str(path):
        continue
    for number, line in enumerate(path.read_text().splitlines(), 1):
        if "2025" in line:
            year_literals.append((str(path.relative_to(ROOT)), number, line.strip()[:180]))
with (OUT / "year-literals.csv").open("w", newline="") as handle:
    writer = csv.writer(handle, lineterminator="\n")
    writer.writerow(["file", "line", "source_excerpt"])
    writer.writerows(year_literals)

# Map every registered TY2025 node to its implementing module. This is the
# graph review worklist, separate from PDF and MeF serializer inventories.
registry_source = REGISTRY.read_text()
bindings: dict[str, Path] = {}
for names, module in re.findall(
    r'import\s*\{(.*?)\}\s*from\s*"([^"]+)";', registry_source, re.S
):
    if not module.startswith("../nodes/"):
        continue
    resolved = (REGISTRY.parent / module).resolve()
    for name in names.split(","):
        parts = name.strip().split(" as ")
        if parts[0]:
            bindings[parts[-1].strip()] = resolved

body = registry_source.split("export const registry: NodeRegistry = {", 1)[1]
body = body.split("\n};", 1)[0]
node_rows = []
for line in body.splitlines():
    code = line.split("//", 1)[0].strip().rstrip(",")
    match = re.fullmatch(r"([A-Za-z][A-Za-z0-9_]*)(?:\s*:\s*([A-Za-z][A-Za-z0-9_]*))?", code)
    if not match:
        continue
    node_type, binding = match.group(1), match.group(2) or match.group(1)
    if node_type == "start":
        source = REGISTRY.parent / "start.ts"
    else:
        source = bindings.get(binding)
        if source is None or not source.exists():
            raise RuntimeError(f"Cannot locate registry binding {node_type}: {binding}")
    relative = str(source.relative_to(ROOT))
    source_text = source.read_text()
    mentions = sum("2025" in source_line for source_line in source_text.splitlines())
    group = "start" if node_type == "start" else relative.split("/nodes/", 1)[1].split("/", 1)[0]
    component = re.sub(r"^form_?", "f", node_type)
    if node_type == "f8812":
        component = "schedule_8812"
    pdf = pdf_components.get(component)
    node_rows.append({
        "node_type": node_type,
        "ty2025_source": relative,
        "group": group,
        "2025_mentions_in_module": mentions,
        "uses_ctx_tax_year": "yes" if "ctx.taxYear" in source_text else "no",
        "ty2025_mef_module": "yes" if component in mef_components else "no",
        "ty2025_pdf_descriptor": "yes" if pdf else "no",
        "ty2026_draft_snapshot": pdf["ty2026_draft_snapshot"] if pdf else "n/a",
        "priority": "P0" if node_type in P0_NODES else "P1" if mentions or node_type in P1_NODES else "P2",
        "2026_disposition": "audit-required",
        "progress_or_next_action": NODE_PROGRESS.get(
            node_type,
            "route owner in NODE-BOUNDARY-AUDIT.md; verify 2026 authority, "
            "node outputs, PDF/MeF filing and full-return test"
            if node_type in BOUNDARY_NODES
            else "verify 2026 law, node outputs, and graph route",
        ),
    })
if len({row["node_type"] for row in node_rows}) != len(node_rows):
    raise RuntimeError("Duplicate node in TY2025 registry inventory")
if not BOUNDARY_NODES <= {row["node_type"] for row in node_rows}:
    raise RuntimeError("Boundary plan names a node outside the TY2025 registry")
with (OUT / "node-coverage.csv").open("w", newline="") as handle:
    writer = csv.DictWriter(handle, fieldnames=list(node_rows[0]), lineterminator="\n")
    writer.writeheader()
    writer.writerows(node_rows)

print(f"PDF descriptors: {len(pdf_rows)}, MeF modules: {len(mef_names)}, MeF descriptors: {len(descriptor_rows)}, registry nodes: {len(node_rows)}, node 2025 mentions: {len(year_literals)}")
