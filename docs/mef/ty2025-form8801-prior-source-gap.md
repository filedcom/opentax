# TY2025 Form 8801 prior-year source boundary

The [2025 Form 8801 instructions](https://www.irs.gov/instructions/i8801)
require distinguishing AMT caused by deferral items from AMT caused by
exclusion items. They direct a 2024 Form 8801 line 26 carryforward to the
2025 computation and require filing Form 8801 only when its 2025 line 21 is
positive. The public `f8801` node still has a preview-only credit calculation,
and the shared MeF/PDF attachment guard blocks positive claims.

As a prerequisite, each positive prior-year AMT amount now needs a reviewed
2024 Form 6251 line 11 source; each positive carryforward needs a reviewed
2024 Form 8801 line 26 source. The records name distinct filed-form references,
one taxpayer SSN, a reviewer and date, and exact whole-dollar source lines.
The input schema rejects missing records, changed line amounts, mismatched
owners, and reused document references. Positive and tamper fixtures are
authored for the deferred bulk test pass.

These are entered review facts, not authenticated filed-return bytes or an IRS
acceptance record. They also do not calculate the prior-year exclusion-item
minimum tax, official 2025 Form 8801 line 21, current-year line 24 capacity,
or line 26 carryforward. The node's Schedule 3 line 6b output remains an
unfileable preview; Form 8801 has no registered native or PDF descriptor.
Before a positive route opens, reproduce those official lines from accepted
prior-year Forms 6251/8801 and the finalized 2025 return, reconcile Schedule
3/Form 1040, and validate native/PDF output and IRS rules.
