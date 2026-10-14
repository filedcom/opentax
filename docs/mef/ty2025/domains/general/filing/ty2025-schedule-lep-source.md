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

The joint Spanish/French return passes local TY2025 v5.4 XSD and had both filled
pages inspected. Cancellation intake checks the prior election owner against the
filed SSN and rejects a same-year or future-year claim, as the IRS instructs
that cancellation be filed with a later-year return. **Code 000 now fails final
native, prepared-bundle, and filled-PDF export**, even with a reviewed prior
record. The record is still a transcription: there is no uploaded prior Schedule
LEP or IRS account document byte binding and no authenticated proof that the
earlier election was filed or held on the IRS account. A hash or signed-off
transcription alone would not prove either fact. The request's own source bytes,
IRS business rules, ATS, the final bulk test, and post-change filled output
remain open. A positive cancellation route needs an authenticated prior
return/election or IRS account record matched to the person SSN and prior code,
with retained exact bytes and a trusted acceptance or account provenance chain.

Source:
[IRS Schedule LEP (Rev. December 2024), including instructions](https://www.irs.gov/pub/irs-prior/f1040lep--2024.pdf).
