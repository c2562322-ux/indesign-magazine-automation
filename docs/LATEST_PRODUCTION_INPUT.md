# Latest-set Production for the actual 19/77/1061 manuscript

2026-10-02. Baseline 9319012. This is **not** completion of three-option Production.

## Input and default Library

The existing DOCX extractor identifies Desktop `01_안과_정기검진_매거진.docx` as exactly title19/subtitle77/body1061 characters and one439×349 image. No article truncation, external photo selection or parser change. Latest source SHA remains7e5b49257d3e3661ec2f0b5cc52cb649c1acf5b7f6569d0ee909465c7591a717.

`studio.js` previously preferred the old packaged `active-library.private.json` even over remembered imports. That file still contains the old55 registered versions. The latest22 were stored separately and were never the default recommendation input.

`src/design-library-source.js` now reads an explicit `magazine-active-design-set/v1` selection before legacy defaults. It selects an exact set/version, fails visibly for an invalid/missing explicitly selected set, and leaves both legacy and remembered libraries intact. On this PC, ignored `active-design-set.private.json` selects ignored `latest-production-candidates.private.json` in `assets/templates/working/`. Source files/models/private content are not committed. Other PCs need their own registered Library/selection; Git alone does not distribute personal design data.

## Common corrections

- BODY inference uses the size supported by the most source characters; a single enlarged initial no longer prevents identification of the BODY. This is role inference, not resizing.
- A unique short heading above all article prose can be TITLE even below the former20pt heuristic. Competing headings remain review-required. No IDs are matched.
- A single enlarged Story initial is supported only when all remaining source characters are uniform and every property/style/language except the first letter's point size is identical. The new first letter retains the captured original size; the rest retains captured source base typography. Every new character and override is checked. Arbitrary bold/color/size ranges and ambiguous languages remain blocked.
- Explicit author/job-title/name lines are PRESERVE rather than inferred SUBTITLE just because they sit beneath TITLE. This corrects an unsafe automatic registration on u3356. Existing manually registered legacy descriptors are not rewritten.

## Known13 source Fidelity PASS designs: suitability for this input

No repeat22-source batch was run. Previous actual proof evidence is `latest-batch-verified-host.private.json`; source PASS is not Production approval.

| Page-set | IMAGE slots | Remaining issue for this actual manuscript |
| --- | ---: | --- |
| u1ba | 0 | No TITLE/BODY and no image destination |
| u1ce | 0 | No BODY/image; TITLE emphasis requires a policy |
| u1cf | 0 | No BODY/image; TITLE style/language ambiguity |
| ub2e9+ub2ea | 3 | Two missing required images; multiple independent TITLEs |
| u335e | 1 | TITLE mixes No Language/Korean within the same character class; replacement policy unresolved |
| u3356 | 1 | No confirmed subtitle destination after preserving the author line; actual BODY overflow measured below |
| u9615 | 0 | No image destination and unsupported BODY emphasis |
| u9ba6 | 0 | No destination for the DOCX image |
| uaa27 | 4 | Three missing required images; no approved unused-slot policy |
| u8a26+u8a27 | 0 | Missing per-page roles and mixed TITLE; no image destination |
| u8ccf | 0 | Ambiguous subtitle and mixed TITLE; no image destination |
| u8e19 | 1 | TITLE is now identified, but there is no confirmed SUBTITLE slot |
| u936f | 4 | TITLE unresolved; three missing required images and no subtitle destination |

Image distribution of these13:0-slot7 /1-slot3 /3-slot1 /4-slot2. None is safe for the complete current input with current confirmed policies. Extra original slots cannot be declared optional without deciding what happens to their contents and placeholders.

## Actual Production and visible composition

InDesign21.4.1.4, restored COM→UXP runner, existing Production Engine. The actual UI module/default-loader/single-card/options handlers were executed with a DOM harness; this is real Adobe DOM execution, not a physical UDT click or a Mock Host.

Before correcting the author-line mapping, u3356 reached CONTENT_APPLIED with source comparison differences0. TITLE19, SUBTITLE77, BODY684+377=1061 and the439×349 DOCX image were actually applied. Initial typography preservation, fitting and other preservation checks had no reported mismatch. Only three CONTENT_OVERFLOW issues remained:

| Role | Frame / Story source ID | Inserted characters | Visible line characters after Recompose | Overset |
| --- | --- | ---: | ---: | --- |
| TITLE | ub6ab / ub6ae | 19 | 19 | No |
| Former inferred SUBTITLE (author line) | ub6c2 / ub6c5 | 77 | 15 | Yes |
| BODY | ub666 / ub669 | 684 | 473 | Yes |
| BODY | ub67d / ub680 | 377 | 287 | Yes |

Visible line counts are actual composition for this exact text/distribution, **not universal maximum character capacities**. No article was shortened to measure these values. The source itself passed proof; these are post-replacement content overflow, not source overset. Inspection copies were closed without saving.

The UI options handler then recorded OPTION_1 BLOCK,0/3 successes and outputReady=false; no final combined document was produced. Raw evidence: ignored `current-production-host.private.json`, `current-panel-production.private.json`.

After preserving the author line, actual default-loader/UI recommendation check loaded exactly22 latest designs,0 cards,12 review-required and10 condition mismatches; no legacy u577b. No Production was attempted for a blocked candidate. Evidence: `current-panel-final.private.json`, with `current-pass13-production-audit.private.json` for the13 proof-PASS subset. Production PASS0; combined INDD0. No source Fidelity PASS or ProductionReady was fabricated for changed role policies.

## Required decisions / next work

Three PASS results cannot currently be delivered without additional confirmed registration policies or source design changes. First confirm the intended subtitle destination and BODY capacity for one-photo designs. u3356 needs a real long-subtitle region rather than its author line and enough BODY capacity for this manuscript; u8e19 has no subtitle destination; u335e requires a deliberate replacement-language policy. Do not infer that unexecuted designs overflow, or send every registration issue to the designer as a geometry defect. Multi-image layouts need an approved unused-slot policy before accepting one photo. None of these decisions authorizes cutting the DOCX, duplicating its image or resizing source frames/fonts.

No request for another user Production test is needed to reproduce the known overflow: Codex already executed it in the Host. Reload→same DOCX is sufficient to confirm the latest22 now feed the UI;0/3 is the honest current state. Three-option E2E remains blocked, not completed.

Validation: Node346/346; Python18/18. Source IDML/DOCX unchanged. main and the existing untracked sample INDD preserved. No parser, existing image extraction/binding/fitting, single-production interface, options-merging or output safety policy rewrite.
