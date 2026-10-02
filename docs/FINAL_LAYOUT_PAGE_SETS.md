# Latest layout page-set foundation — 2026-10-02

Source: designer's `3매거진자동화템플릿 (1).idml`, SHA256
`7e5b49257d3e3661ec2f0b5cc52cb649c1acf5b7f6569d0ee909465c7591a717`.

This is a blocked milestone, not three-option E2E completion. No new design has
an Adobe Production PASS in this session. InDesign COM creation failed with
0x80080005; attaching to the running application failed with 0x800401E3. Source
overset and current installed-font evidence remain unknown.

## Implemented

- `tools/design-set-registration.js` groups pages by shared objects, Group children,
  Story membership and unassigned Spread furniture. The latest 31 ordinary pages
  form 22 design units: 13 singles and 9 pairs. Nothing is duplicated or deleted.
- Shared non-text PRESERVE objects require the complete intersecting page scope.
  Shared CONTENT frames remain blocked. Original/Host bounds are checked against
  the actual labeled Parent page; snapshots and original typography remain strict.
- New descriptors carry explicit design-set/version, ordered page-set membership,
  dependency fingerprint and minimum-crop image policy. Legacy descriptors retain
  their existing sequential image binding. Active=false sets stay registered but
  cannot enter recommendations.
- Minimum-cost one-to-one image assignment uses aspect-ratio crop loss, honors
  required slots and preserves source order for unknown dimensions. Recommendation
  estimates and production bindings use the same assignment. Actual place/Fill,
  link, fitting, effective-resolution and preservation checks remain unchanged.
- Fingerprints include source geometry, Story/run/table preservation data, referenced
  style inheritance, Parent, Group, layers, colors/gradient dependencies, font
  definitions and CONTENT policies. Change reporting provides UNCHANGED/CHANGED/
  ADDED/REMOVED; it does not transfer Adobe authorization. Stable identity currently
  requires persistent source IDs; ID regeneration needs review, not ordinal matching.

## Registration evidence and limits

The new standalone private Library and its audit are in ignored working assets:
`latest-final-layout-7e5b49257d3e3661.private.json` and
`latest-final-layout-audit-7e5b49257d3e3661.private.json`.
The existing active Library and all 55 legacy versions are untouched. Default
activation is deliberately pending the requested three real Production PASS results.

Static classification: READY 0, WARN 2, REVIEW_REQUIRED 5, BLOCK 15 design units.
In ordinary-page counts: READY 0, WARN 2, REVIEW_REQUIRED 7, BLOCK 22.
WARN designs are u9ba6 (no IMAGE slot) and uaa27 (four required IMAGE slots).
They do not constitute three suitable candidates for a one-photo article.

The two-page ub2e9+ub2ea and u9496+u94f4 units no longer fail solely because a
PRESERVE object touches both pages. The former has two independent TITLE Stories;
the latter has no confidently identified TITLE. Neither is automatically approved.

Arbitrary visual emphasis remains unsupported when the DOCX's plain article fields
provide no semantic correspondence. No bold/size/color range is mapped by old
character positions or flattened to a first-run style. Existing uniform and
character-class language policies are unchanged. Fixed Table XML is preserved,
but Table/Cell original-to-Host comparison is still unsupported and explicitly
blocks ua829. Transparency/effect source readback support is also incomplete.

Current DOCX article fields retain plain paragraphs and images; semantic section,
list and Q&A records are not inferred. DOCX table rejection remains unchanged.

## Next gate

Restore actual InDesign automation access, then run source/proof batch inspection
on the standalone Library. Obtain safe role decisions for independent headings
and Table semantics before expanding replacement policies. Do not request or
claim a 3/3 test until three suitable new units actually pass with the same DOCX.

Tests: full Node 335 and Python extraction 18 (final run recorded in HANDOFF).
No source INDD/IDML/DOCX or existing private Library was edited.
