# Schedule H child turning 21: working compact

Base `c4c597887`; frozen board read in full. Existing complete family/unrelated
payroll inventory excludes a child under 21 for the whole year; a 2004 birth is
rejected. The selected existing parent gap is service performed before and after
the 21st birthday, supported by dated service and payment rows,
relationship/birth, payroll, W-2 and withholding. Preserve prior child,
mixed-family and parent saved packets.

Primary authority: 26 USC 3121(b)(3)(B) and 3306(c)(5) exclude _service
performed_ by a child under 21; TY2025 Pub 926 sets the $2,800 FICA cash-payment
threshold, $1,000 current/prior FUTA quarter threshold, $7,000 FUTA per-worker
cap, and $176,100 Social Security wage base. Split a row spanning the birthday;
determine exclusion by the service period and inclusion by payment in 2025. No
claim of authenticated source records or IRS acceptance.

Production points: `forms/f1040/nodes/intermediate/forms/schedule_h/index.ts`
payroll child schema, family calculation loop, FUTA quarter and cap logic.
Native/PDF already invoke the pure calculator and retained payroll comparison.
New source must distinguish annual Box 1 from postbirthday taxable Box 3/5;
retain a child row and child identity. The legacy family-only withholding route
remains limited to under-21 throughout 2025.

Saved original archives: `/tmp/opentax-scheduleh-mixed-family-evidence-v5-oct6`
(6/31), `/tmp/opentax-scheduleh-mixed-family-final16-raw-oct6/report.json`
(16/84), `/tmp/opentax-scheduleh-parent-evidence-v2-oct6` (8/41),
`/tmp/opentax-scheduleh-parent-final24-raw-oct6/report.json` (24/125; three
October 4 historical qualifications). Originals were never overwritten.

## Completed bounded route

The complete 2025 household payroll retains the child relationship, employer and
child SSNs, birth source, annual and paid-quarter wages, W-2, agreed W-4
withholding, and dated payment and service rows. A payment for pre-birthday work
made after the birthday remains excluded. A row spanning the birthday is
rejected until split into sourced service periods. Paid post-birthday service
wages count toward the per-child $2,800 FICA threshold, $176,100 Social Security
cap, FUTA quarter test and $7,000 FUTA cap. Every prior-year FUTA answer on this
route requires a separate prior-year eligible-quarter cash wage source and four
amounts. Parent/spouse exclusions and the legacy child-only under-21 route
remain intact. Leap-day birth is guarded pending a jurisdictionally sound
age-attainment date.

The new current-quarter packet has child service wages of $3,000 before age 21
and $8,000 after; $1,500 of excluded prebirthday service is paid in July after
the birthday. The unrelated adult earns $3,000. Actual Schedule H FICA wages are
$11,000, Social Security tax $1,364, Medicare $319, capped FUTA wages $10,000
and FUTA $60. Agreed withholding is $250; Schedule H, Schedule 2 line 9 and Form
1040 line 23 are $1,993. The prior-trigger packet retains the same identities
and relationship with $1,600 child postbirthday and $400 adult eligible wages,
all 2025 qualifying paid quarters below $1,000, and a $1,000 prior-year eligible
quarter. FICA is zero, FUTA is $12, withholding $250, and filed household
employment tax $262. The opposite prior-year assertion is rejected.

Final retained synthetic structured source packets are
`/tmp/opentax-scheduleh-turn21-evidence-v4-oct6`, each 6 pages (Form 1040 2,
Schedule 2 2, Schedule H 2). Their PDFs have SHA-256
`ba5406a6248dfeae4a1039f925537bae231061cf1bd406a0ef4ba175b18e2bc9` and
`65a6b03af4aa5bebf7ebfe76670686125a7e1506e406f43e9dda7692e1091f05`. Both are
byte-identical to the reviewed v3 render; all 12 pages were examined in
`/tmp/opentax-scheduleh-turn21-rendered-oct6/current-contact.png` and
`prior-contact.png`. Full local TY2025v5.4 XSD was checked for both.

The five-module source/compatibility gate passed **10/0**,
`/tmp/opentax-scheduleh-turn21-standard-v4-oct6.log` (2m0s). Direct calculator
source negatives include impossible dates, unsplit birthday service, payment
before service, mismatched paid quarters, conflicting W-2 amounts, duplicate
references, false FUTA source and missing transition review. Native and direct
PDF reject a prepared source differing from the retained payroll. Actual
saved-source replay reads the two new packets and the unchanged six mixed-family
plus eight parent packets, **16 returns / 84 pages**,
`/tmp/opentax-scheduleh-turn21-final16-v4-raw-oct6/report.json`; exact pending,
prepared pending, carryforwards, origins and PDF bytes, with XML differing only
in `ReturnTs`. The replay script is
`/tmp/opentax-scheduleh-turn21-final-v4-replay-oct6.ts`; it never calls fixture
factories or rewrites originals.

The retained source facts are reviewed synthetic records, not independently
authenticated birth certificates, payroll or issued W-2 bytes. This contribution
does not close the wider Schedule H parent, state/rate, other split-year family,
authentication or IRS acceptance work.

The saved new public `inputs` were also replayed through the complete
preimplementation `c4c597887` executor. Both return diagnostics reject the child
age transition source:
`/tmp/opentax-scheduleh-turn21-before-public-rejection-oct6.log`, script
`/tmp/opentax-scheduleh-turn21-before-oct6/reject-saved-source.ts`. The final
standard `deno task test` permission profile passes the new source module
**2/0** in `/tmp/opentax-scheduleh-turn21-taskgate-oct6.log`.
