# TY2025 Schedule LEP source route

Schedule LEP is a request from an individual for future IRS written
communications. The TY2025 return can contain one request for the taxpayer and,
on a joint return, one separate request for the spouse. The form permits codes
000–020; code 000 cancels a previous election. The filed name and taxpayer
identification number come from the final return identity, not free-form
Schedule LEP text. The same validated request creates the native MeF document
and one filled PDF page per person.

Each source item now requires `request_confirmed_by_person: true` and a
`request_record_reference`. A code 000 request also requires one reviewed
`prior_election_review` record: tax year 2020–2024, owner SSN matching the
requesting person, non-000 language code, filed Schedule LEP or IRS-account
record reference, reviewer, and review date. The source references are internal
evidence and are not serialized into the three-field IRS form.

The joint Spanish/French return previously passed local TY2025 v5.4 XSD and had
both filled pages inspected. The cancellation fixture now checks the prior
election owner against the filed SSN and rejects a same-year or future-year
claim, as the IRS instructs that cancellation be filed with a later-year return.
The record remains a reviewed transcription: underlying request and
prior-election document bytes, actual prior filing/account history, IRS business
rules, ATS, the final bulk test, and post-change filled output remain open.

Source:
[IRS Schedule LEP (Rev. December 2024), including instructions](https://www.irs.gov/pub/irs-prior/f1040lep--2024.pdf).
