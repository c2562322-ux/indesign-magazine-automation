# Bounded typography Auto-fit

Registered Production first imports and verifies the unchanged source, inserts the entire article using the existing role policy, recomposes, and checks content/geometry/typography. Only an otherwise valid document with actual content overset enters this policy. Source overset remains blocking.

- BODY: source-relative 98%, 96%, 94%, 92%, 90%.
- SUBTITLE: source-relative 98%, 96%; absent optional SUBTITLE contracts unchanged.
- TITLE, tracking, geometry, fonts, named styles, language, decoration and KEEP objects are unchanged.
- Numeric leading scales with size. Auto leading remains Auto, preserving its existing percentage.
- All BODY Stories share one ratio, retaining the existing article distribution; no duplicated or truncated text.
- Supported uniform, enlarged-initial and character-class language patterns retain each character's relative size, styles and overrides. Unresolved semantic emphasis stays unsupported.
- These are conservative initial relative limits, not an assertion that every source font remains readable after reduction. Native overset and user visual review still apply. Tracking compression is deliberately not introduced.

Each step starts from captured source-content typography, rather than cumulatively shrinking. It recomposes, checks native overset, the full text, native character count, each size/leading and frame geometry. It stops at the first non-overflow ratio. Continued overflow at the bound fails normally and sequential Production continues.

A private runtime ledger stores the source character snapshots and analytically expected adjusted snapshots. Post-inspection verifies every character's typography, language, styles and explicit overrides against this ledger, plus existing geometry/text/image/preservation checks. A forged/missing ledger fails. Shallow OPTION contexts preserve ledger identity through existing document combination; new source imports never inherit approval. Original source Fidelity is unchanged. Reports expose the applied ratio, source typography, per-step overflow and success; this is authorized content Auto-fit, not original-design Auto Fix.

## Validation

Actual InDesign 21.4.1.4, the existing actual panel-handler/active-Library/Production adapter and unchanged DOCX (19/77/1061 characters, one439x349 embedded image): 3 safe candidates, 3 attempted, 0 Production PASS. Not a physical UDT click test. Private evidence: assets/templates/working/autofit-final-host.private.json. The same sequential engine continued after each actual overflow; no combined document was made because no candidate passed.

| Design / role | Source size / leading (pt) | Adjusted size / leading (pt) | Ratio | Full text | Native overflow |
| --- | --- | --- | --- | --- | --- |
| u335e BODY | 12/20; enlarged initial21/20 | 10.8/18; initial18.9/18 | 90% | 1061 | true |
| u335e SUBTITLE | 15/23 | 14.4/22.08 | 96% | 77 | true |
| u8e19 BODY | 13/16 | 11.7/14.4 | 90% | 1061 | true |
| u3356 BODY Story ub669 | 12/20; initial16/20 | 10.8/18; initial14.4/18 | 90% | 684 | true |
| u3356 BODY Story ub680 | 12/20 | 10.8/18 | 90% | 377 | true |

TITLE remained unchanged/non-overflow. u8e19/u3356 retain the explicit optional absent-subtitle warning (77 characters unapplied), not merging that text elsewhere. Source Fidelity, allowed-adjustment typography/geometry, KEEP, content-preservation and image checks yielded zero mismatch issues. The only final issues were genuine CONTENT_OVERFLOW. Above after-values are analytic permitted values verified by native pointSize/leading readback and final per-character Fidelity, not new source design values.

Observed visible line characters increased: u335e BODY519 to620, u8e19 BODY620 to743, u3356 BODY473/287 to586/343; u335e SUBTITLE48 remained48. These are observations for this exact input, not calibrated capacity limits. Achieving PASS would require exceeding the authorized conservative limits or another structurally confirmed layout with more capacity; neither was fabricated. Other source-Fidelity PASS layouts still have no confirmed photo slot, required additional photos, unresolved visual emphasis/article roles or shared CONTENT-image semantics; no generic safe new one-image role was found in the existing audit (docs/LATEST_CONTENT_ROLES.md).

Full Node360/360 and Python18/18 pass. New tests cover first-success stopping, shared BODY ratio, mixed initial proportions, Auto leading/tracking preservation, bounded failure, unauthorized/forged adjustments and content drift. Actual failed-limit traversal is Host-verified; actual early-success and combined adjusted-option success remain unverified because this input produced no PASS.
