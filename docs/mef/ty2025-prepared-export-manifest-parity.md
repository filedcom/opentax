# TY2025 prepared native/PDF/manifest parity

`buildMefBundle` validates each submitted PDF and retains the prepared native
XML, source digest, attachment bytes, and per-file byte digests. Both the
merged PDF renderer and submission archive can consume that prepared bundle.

The shared prepared-attachment check now replays the XML digest, exact ordered
`BinaryAttachment` file names/descriptions, unique attachment inventory, and
every retained PDF byte digest before either consumer proceeds. It rejects a
changed description or bytes even when the pending tax graph and filer have
not changed. This also prevents the PDF route from relying on altered
validated bytes for a source-specific evidence check. Positive and tamper
fixtures are authored for the final bulk gate.

The check establishes parity with the retained prepared bundle. It does not
authenticate the outside issuer of a PDF, prove a recipient owns its source,
or prove that every distinct child form copy has a printable PDF instance.
Those source and instance checks remain separate from the common manifest.
