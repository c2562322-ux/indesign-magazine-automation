# Direct-selection CONTENT policy

2026-10-02. Applies to the gallery's existing single registered-native engine, in `direct` mode. Recommendation and sequential Production retain their existing eligibility policy.

## Runtime contract

- `replace`: confirmed CONTENT text/IMAGE receives the current article. Existing Story distribution and minimum-crop image assignment are reused.
- `clear`: absent confirmed text becomes an empty Story. Spare confirmed IMAGE slots remove only their own graphic children. Proven existing image-instruction relations are hidden for filled and emptied slots. No arbitrary sample-string search or new role inference.
- `preserve`: unassigned, ambiguous and fixed objects retain their source state. The 196 unassigned texts are not bulk cleared or reclassified. Source/Library files and historical validation are unchanged.

The runtime `magazine-content-actions/v1` ledger records authorized edits and remaining preserved objects. Structured unsupported text Typography may be irrelevant only when that confirmed role is empty and will be cleared; source Fidelity and unknown capability failures remain blocking. Missing subtitle/caption frames produce an explicit unapplied-content warning, never a new frame or concatenation into BODY.

Direct selection can use fewer images than registered slots: remaining CONTENT slots are explicitly empty. Excess article images still block. A slot with an explicit original fitting policy retains it; source NONE uses proportional Fill in direct mode. Adobe's `fit(FILL_PROPORTIONALLY)` changes `fittingOnEmptyFrame` from NONE to FILL, so the intended policy readback is verified against FILL. Frame geometry, alignment, autoFit, uniform scale, frame coverage and subsequent fitting/crop checks remain strict.

## Two inspection phases

Source reproduction must pass before content replacement. Original overset, missing source assets, unsupported structures and source mismatches are not bypassed. Post-content preservation permits only ledger-authorized text/image changes, bounded Auto-fit and existing placeholder visibility changes. It separately checks actual inserted text, empty slots, image readback and geometry.

If all remaining errors are actual CONTENT overflow after replacement, direct mode returns `outcome: incomplete`, `layoutStatus: 조판 미완료`, `outputReady: false`. The complete text and editable result remain open. No next-design fallback, truncation, frame resizing or approval is performed. Other inspection failures are never labelled PASS.

## Actual Host evidence

Adobe InDesign 21.4.1.4, existing COM → UXP harness, full Studio DOCX/gallery/select/produce handlers with a DOM test surface. This is actual Adobe document/Story/graphic readback; literal UDT panel clicks remain user acceptance testing.

Active source SHA256: `5583fa2bb92b5405d28bb6ad1ee9c1a0b6c6be1c31159e73819181dc4bb5979d`. Input: `02_소아근시_매거진.docx`, title22/subtitle75/BODY878/one embedded image.

| Case | Design | Actual result |
|---|---|---|
| Normal | design07 / u3356 | PASS, errors0, BODY566+312=878, 92% Auto-fit, all overset false, one image, placeholder hidden, editable document open. No subtitle slot: explicit unapplied75-character warning. Low-resolution warning remains. |
| Overflow | design06 / u335e | Complete BODY878 and subtitle75 retained; BODY90% and subtitle96% still overflow. Only CONTENT_OVERFLOW issues, no Fidelity/geometry error. `조판 미완료`, outputReady false, document/window remains open. |
| Empty slots | design11 / uaa27 | In-memory variant with empty subtitle (original DOCX unchanged). Subtitle Story0 characters. One image assigned to best-fitting image2; other three graphics counts0, all four proven image instructions hidden. Full BODY878 retained; BODY90% still overflow, correctly incomplete/open. |

Private evidence: `assets/templates/working/direct-policy-host.private.json`; private harness: `direct-policy-host.private.idjs`. No production-ready status is granted to all22 designs. CAPTION clearing is regression-tested with a fixture; there are no confirmed CAPTION slots in this active set. SOURCE assets currently have no placed graphics, so residual graphic detection is tested in fixtures; actual Host verified empty source frames and instruction hiding. Removal of a pre-existing placed sample graphic still needs a source containing one for Adobe acceptance testing.

Full automated regression: Node381/381, Python18/18.

## UDT acceptance

1. Reload, load the same DOCX, select design07, click `선택한 디자인으로 제작`: title, complete BODY and actual photo appear; normal completion, no overflow. Subtitle remains a visible unapplied-content warning because this design lacks that slot.
2. Select design06 and produce with the same input: editable document opens, full BODY/subtitle remain in Stories, UI says `조판 미완료`; overset is still reported.
3. Optional empty-slot check: clear only the panel's subtitle input, reopen the gallery, select design11 and produce. Subtitle frame is empty, one actual photo and three empty CONTENT image frames remain, no sample image instructions. BODY overflow is still reported; this is not PASS.
