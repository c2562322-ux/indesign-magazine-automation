# u3d6 production source overflow — verified in Adobe, 2026-10-01

Latest user JSON createdAt 2026-10-01T09:54:47.823Z, design 172e0fb7adc52e31-u3d6, source SHA256 172e0fb7adc52e31ba5f3fefd1ca4c6c186b1714309ec27f2900f82a077ada90.

- All 15 comparison records equal; differences 0. Source inspection reports Host Story 2866 overflow. Generic GENERATOR_MISMATCH is the summary wrapper, not evidence of a differing property.
- Exact source role: BODY, TextFrame u7dea, Story u7ded. Original INDD numeric IDs 32234/32237; imported IDML frame/story IDs 2884/2866. Host IDs are not stable source IDs.
- Sample Story has 882 characters. TITLE, SUBTITLE and three image instruction frames on page 5 were not overset.

## Read-only Adobe verification

Actual running InDesign 2026 COM/ExtendScript was used, not Mock and not the UXP production button. Original files were copied to ignored working artifacts; only those copies were opened hidden, recomposed and closed with SaveOptions.NO. Interaction preference was restored in finally. Source IDML copy SHA256 matched the registered model. No original file was opened for writing, saved or changed.

| Stage | BODY source | Overflow |
|---|---|---|
| Designer original INDD copy after Recompose | u7dea / u7ded | true |
| Byte-identical original IDML copy after Recompose | matching 882-character BODY | true |
| Current packagePlan output before page cleanup | u7dea / u7ded | true |
| Same generated document after cleanup and Recompose | u7dea / u7ded | true |

Both source INDD/IDML reported no fonts with status other than INSTALLED. Source/uncleaned bounds (native mm, spread coordinates): [43.9080627017549,235.650000000004,155.104995218913,328]. Cleanup changes the page origin, hence x coordinates become [19.6500000000041,112]; page-relative geometry remains equal in the supplied Fidelity report. Insets/typography/threading comparisons also passed. Overset exists before serialization and before page removal, so this case provides no basis for a geometry/font/composer restoration patch.

Private reproducibility artifacts remain under assets/templates/working/: u3d6-host-audit.private.txt and u3d6-source-check.private.txt, plus source copies and audit scripts. These are not committed. No per-page exceptions were added to product code.

## Resolution / next action

No engine change: keeping source overset blocking is required by the user's policy. Do not downgrade it to WARN, shrink text, resize frames, remove sample text or apply Auto Fix. Recommendation/Library/parser are unchanged.

The designer needs to resolve the existing BODY sample overset in their source and supply a revised INDD/IDML (they decide whether to shorten the sample or change design). This agent did not edit that source. After that source is re-extracted/registered, the user flow remains Reload → same DOCX → this design production. Repeating the current source will correctly fail again; full UXP content replacement has not been newly verified.

Existing targeted regressions for source overflow/mismatch blocking and completion evidence were run; no test expectation was weakened. This commit records diagnosis only, not a claim of Fidelity pass.

Adobe scripting enum reference: https://developer.adobe.com/indesign/dom/api/s/ScriptLanguage/ (JAVASCRIPT).
