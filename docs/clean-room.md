# Clean-room rules

MarinaManagementOS is modelled on how PacSoft MMS NG behaves, not on how it
is built. PacSoft is proprietary software and its licence may restrict
reverse engineering, decompiling or copying. Chris authorised studying the
dev install on his dev PC; these rules keep the new code our own.

Allowed sources:
- What staff see and do: screens, fields, workflows, printed reports.
- The database schema and data we are licensed to read, using SELECT-only
  queries we already use for reporting.
- Our own business rules, SOPs and Excel reports.
- Names visible in the install: file names, import templates, and .NET
  metadata names of screens and tables (what exists, not how it works).

Not allowed:
- Decompiling method bodies, disassembling or instrumenting PacSoft binaries.
- Copying PacSoft code, SQL objects (views, functions, procedures), report
  layouts, text, icons or other assets into this repo.
- Writing to any PacSoft database. Migration extracts are read-only SELECTs
  run outside this app.

Names in [pacsoft-mapping.md](pacsoft-mapping.md) are there only to map data
during migration. Our own schema uses our own names.
