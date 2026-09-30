# TY2025 Schedule LEP source route

Schedule LEP is a request from an individual for future IRS written
communications. The TY2025 return can contain one request for the taxpayer and,
on a joint return, one separate request for the spouse. The form permits codes
000–020; code 000 cancels a previous election. The filed name and taxpayer
identification number come from the final return identity, not free-form
Schedule LEP text. The same validated request creates the native MeF document
and one filled PDF page per person.

Each source item now requires `request_confirmed_by_person: true` and a
`request_record_reference`. A code 000 request also requires the prior
non-000 language code and `prior_election_record_reference` (for example, a
prior filed Schedule LEP or IRS account record). The source references are
internal evidence and are not serialized into the three-field IRS form.

The existing joint Spanish/French return previously passed local TY2025 v5.4
XSD and had both filled pages inspected. This change adds the request records
to that fixture and a cancellation source/native/PDF case, but neither has
entered the requested final bulk test. Underlying request and prior-election
document bytes, IRS business rules, ATS, and post-change filled output remain
open.

Source: [IRS Schedule LEP (Rev. December 2024), including instructions](https://www.irs.gov/pub/irs-prior/f1040lep--2024.pdf).
