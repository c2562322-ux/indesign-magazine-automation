# Latest saved batch evidence — 2026-10-02

Input: user's Desktop `registered-page-verification.private.json`, saved at
2026-10-02T01:31:20.883Z. Source data was read only and is not committed.

The JSON has total77, notRun77, passed0, fidelityFailed0, reports0, groups0 and
run.mode=manual. The latest source contributes22 states, all NOT_RUN. Its static
registration labels are ROLE_MAPPING_REQUIRED11, FIDELITY_TEST_REQUIRED5 and
UNSUPPORTED6. These are not Adobe composition/readback findings.

The export's manual branch proves no batch context was present when saving.
It does not prove why: a rejected click, reload or subsequent Library load cannot
be distinguished from this JSON. Do not blame the designer or claim zero actual
Fidelity failures/pass from absent results.

Confirmed code defects corrected:

- Loading a standalone Library merged its entries into legacy entries; batch used
  the whole list. Keep all entries but freeze the most recently loaded Library's
  IDs as the next batch scope (22 rather than77).
- Export permitted empty manual inventory and called it saved verification.
  Reject export with no execution/skip records. Retain manual per-page evidence,
  cancellation/partial results, unsupported skip records and real failure records.
- Record registered.batch.start, skip, page.start and page.finished in existing
  user status/developer diagnostics. Save status includes recorded/total and
  pass/fail/unsupported/notRun counts.

Provisional ownership of registered constraints (overlapping categories):
engine support15 units, role/semantic decisions17 units, neither recorded2 units.
Overlap12; engine-only3, role-only5, both12, awaiting real proof2. Designer source
modifications confirmed0; source overset/fonts and actual mismatch remain unknown.
Typography support appears in14 units, source effect comparison in4, Table in1,
unassigned shared furniture in1. These counts are static constraints in the JSON,
not Host failures.

Fast Production route remains conditional: first obtain actual source proof for
u9ba6/uaa27 and source-testable one-photo u3356; source-safe role confirmation can
unlock u8e19 and u9496+u94f4. u3356 has a first BODY character at16pt followed by
12pt text; support requires a common leading-glyph policy, not flattening. Title
identity in the other two remains a semantic decision. No three identical-DOCX
Production PASS or recommendation3/3 claim is supported yet.

Retest: Reload → load latest22 Library → full batch → wait for completion counts
→ save without reloading Library or panel → inspect run.mode=proof, total22 and
nonempty reports. Unsupported pages will have skip records, not fake PASS.

Tests: Node337 / Python18; batch scope fixture includes55 preserved legacy entries,
22 new entries, one skipped page and one failed page. Remaining pages continue;
empty export and post-reload empty export are blocked. Mock outcomes do not count
as Adobe evidence. No Production/Fidelity/typography/image policy was changed.
