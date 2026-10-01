# Recommendation BLOCK / WARN / INFO audit — 2026-10-01

## Evidence and limits

Current private Library contains 55 preserved versions. Supersession removes 14 old versions from normal recommendations: 41 active designs, not 55. The previous UI mixed these counts; it now displays registered/archived/evaluated separately. No Library data or role approval changed.

The user reported 0 candidates / 30 review / 11 incompatible. Their named `Desktop/테스트원고.docx` was not present when read (ENOENT). Thus that exact article's 30 review records cannot be reconstructed from the screenshot. No replacement article is represented as the user's article. The following article-dependent numbers are explicitly a synthetic diagnostic scenario: title 5 characters, body 650 CJK characters, no subtitle/caption, one 1200×800 embedded-image-equivalent input, required fonts assumed installed. Adobe UI still queries installed fonts.

## Bottleneck

Production supported single-photo active design 10/u577b was removed for CAPACITY_UNKNOWN (title) and OVER_ESTIMATE (body), although role binding and static native support were valid. Unknown capacity and source-observation inconsistencies are estimates, not proof of broken typography. Missing Adobe history was already not a production prerequisite. Many other review designs genuinely have unconfirmed roles or unsupported structure; these remain blocked.

Static source-only classification: BLOCK 40 / WARN 0 / INFO 15 across 55; active BLOCK 34 / INFO 7. INFO means statically eligible for internal checking, never Adobe/Production Ready.

Overlapping static causes (all55 / active41): role/intent unresolved 36/30; shared page objects 18/15; mixed semantic typography 14/12; graphic effects 11/9; custom image color management 7/7. These are overlapping page counts and must not be added.

Synthetic one-photo scenario: all55 BLOCK50 / WARN5 / INFO0; active41 BLOCK40 / WARN1 / INFO0. Previously zero production candidates; now one: new sample 10/u577b. Four other statically eligible one-photo versions remain superseded and are not silently restored to the normal pool. Exact same-DOCX count remains unmeasured.

## Shared decision policy

- BLOCK: unresolved roles/references/preservation or required image policy; missing required photos, extra photos, missing known fonts, unresolved image dimensions; unsupported native Fidelity or text replacement capabilities. Unknown diagnostic codes fail closed.
- WARN: geometry/font-metric capacity estimates (including severe estimate and unknown estimate), image crop/resolution advisories, unavailable installed-font inventory. Missing known fonts still BLOCK. Warnings remain visible and penalize rank; no font/geometry edits are authorized.
- INFO: internal Host check required, no claim of Adobe verification. No metadata support or Fidelity tolerances changed.

The same productionAssessment is used by recommendations and bindContent, including native replacementPlan. Legacy evaluate/rank retains raw conservative estimation evidence for analysis. Recommendation WARN never grants output permission: original Fidelity/source overset must pass before replacement; actual content readback, image place, design preservation, Recompose/overset and export gates remain unchanged.

Images do not have a global limit or an unconditional exact-count rule. Every required IMAGE_n must have its indexed DOCX image; surplus images BLOCK. Explicit optional slots may retain source when absent. No new policy for deleting unused required slots is inferred.

## Regression and Adobe procedure

Node310 / Python18 passed. Added production-policy cases and synthetic DOCX one-image → recommendation → selection → native text/image replacement. Forced content overflow remains CONTENT_OVERFLOW and source overflow prevents replacement. Existing 1/2/3/4/40 image and Fidelity tests preserved. Review-collapse test now uses actual ambiguous roles instead of unknown fonts, because the latter is an explicit WARN in the new contract.

Adobe not run here. UDT Reload → same DOCX → recommendations → `이 디자인으로 제작`. A WARN card can run checks; it is not a guarantee of fit. Confirm actual DOCX text/image in the resulting document; if original Fidelity fails, the clone closes and the exact failure remains visible. Do not Auto Fix source differences.

Reproduce the complete read-only audit with `tools/audit-recommendation-policy.js <library.json> [article.docx]`; it uses the plugin's DOCX media parser and reports all versions, active versions, all reason groups and article metrics. Output contains no article text or embedded image bytes.

## All 55 versions

The article decision below is the synthetic scenario, not an Adobe result.

| Design | Active | IMAGE slots | Static | One-photo scenario | Static blocking reasons |
|---|---|---:|---|---|---|
| original · u1ba · 마커 보존 v2 / u1ba | superseded | 0 | BLOCK | BLOCK | 제목 후보가 없거나 여러 개: 핵심 역할 확인; 본문 영역 확인 필요; 제목 역할 확인 필요; 본문 역할 확인 필요 |
| original · u1ce · 마커 보존 v2 / u1ce | superseded | 0 | BLOCK | BLOCK | 본문 영역 확인 필요; 본문 역할 확인 필요; graphic effect readback 미지원; title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.FontStyle |
| original · u1cf · 마커 보존 v2 / u1cf | superseded | 0 | BLOCK | BLOCK | 본문 영역 확인 필요; 본문 역할 확인 필요; graphic effect readback 미지원; title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.FontStyle, $.AppliedLanguage |
| 시작 메인 · 사진 1장 · 마커 보존 v2 / u335e | superseded | 1 | INFO | WARN |  |
| original · u3356 · 마커 보존 v2 / u3356 | superseded | 0 | INFO | BLOCK |  |
| original · u3d5 · 마커 보존 v2 / u3d5 | superseded | 1 | INFO | WARN |  |
| original · u3d6 · 마커 보존 v2 / u3d6 | superseded | 3 | INFO | BLOCK |  |
| original · u735 · 마커 보존 v2 / u735 | superseded | 0 | BLOCK | BLOCK | 제목 후보가 없거나 여러 개: 핵심 역할 확인; 제목 역할 확인 필요; UNSUPPORTED 페이지 귀속/공유 객체: u7eac |
| original · uad7 · 마커 보존 v2 / uad7 | superseded | 2 | BLOCK | BLOCK | 제목 후보가 없거나 여러 개: 핵심 역할 확인; 제목 역할 확인 필요; UNSUPPORTED 페이지 귀속/공유 객체: u7eac |
| original · u576c · 마커 보존 v2 / u576c | yes | 0 | BLOCK | BLOCK | UNSUPPORTED 페이지 귀속/공유 객체: u7fad; body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 문단/문자 스타일·특수 콘텐츠 구조 확인 필요 |
| original · u5764 · 마커 보존 v2 / u5764 | superseded | 3 | BLOCK | BLOCK | 제목 후보가 없거나 여러 개: 핵심 역할 확인; 제목 역할 확인 필요; UNSUPPORTED 페이지 귀속/공유 객체: u7fad |
| original · u577b · 마커 보존 v2 / u577b | superseded | 1 | INFO | WARN |  |
| original · u577c · 마커 보존 v2 / u577c | superseded | 0 | INFO | BLOCK |  |
| original · u853e · 마커 보존 v2 / u853e | superseded | 0 | INFO | BLOCK |  |
| central · u1ba · 마커 보존 v2 / u1ba | yes | 0 | BLOCK | BLOCK | 제목 후보가 없거나 여러 개: 핵심 역할 확인; 본문 영역 확인 필요; 배치 이미지 1개: 기사 사진/설명·배경 여부 확인 (현재 유지); 제목 역할 확인 필요; 본문 역할 확인 필요 |
| central · u1ce · 마커 보존 v2 / u1ce | yes | 0 | BLOCK | BLOCK | 본문 영역 확인 필요; 본문 역할 확인 필요; graphic effect readback 미지원; title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.AppliedLanguage, $.FontStyle |
| central · u1cf · 마커 보존 v2 / u1cf | yes | 0 | INFO | BLOCK |  |
| central · u335e · 마커 보존 v2 / u335e | yes | 0 | BLOCK | BLOCK | 배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지); UNSUPPORTED custom image color management; title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.FillColor, $.Tracking |
| central · u3356 · 마커 보존 v2 / u3356 | yes | 0 | BLOCK | BLOCK | 배치 이미지 1개: 기사 사진/설명·배경 여부 확인 (현재 유지); UNSUPPORTED custom image color management; title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.Tracking, $.FillColor |
| central · u3d5 · 마커 보존 v2 / u3d5 | yes | 0 | BLOCK | BLOCK | 배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지); UNSUPPORTED custom image color management; title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.FillColor |
| central · u3d6 · 마커 보존 v2 / u3d6 | yes | 0 | BLOCK | BLOCK | 배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지); UNSUPPORTED custom image color management; graphic effect readback 미지원 |
| central · u735 · 마커 보존 v2 / u735 | yes | 0 | BLOCK | BLOCK | 배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지); UNSUPPORTED 페이지 귀속/공유 객체: u83ad; graphic effect readback 미지원 |
| central · uad7 · 마커 보존 v2 / uad7 | yes | 0 | BLOCK | BLOCK | 배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지); UNSUPPORTED 페이지 귀속/공유 객체: u83ad; UNSUPPORTED custom image color management; graphic effect readback 미지원 |
| central · u576c · 마커 보존 v2 / u576c | yes | 0 | BLOCK | BLOCK | 배치 이미지 2개: 기사 사진/설명·배경 여부 확인 (현재 유지); UNSUPPORTED 페이지 귀속/공유 객체: u83b9; graphic effect readback 미지원; UNSUPPORTED custom image color management |
| central · u5764 · 마커 보존 v2 / u5764 | yes | 0 | BLOCK | BLOCK | UNSUPPORTED 페이지 귀속/공유 객체: u83b9; graphic effect readback 미지원 |
| original · u3d5 · 마커 보존 v2 · 디자이너 수정본 / uaa4 | superseded | 1 | INFO | WARN |  |
| 새 샘플 · 1쪽 · u1ba / u1ba | yes | 0 | BLOCK | BLOCK | 제목 역할 확인 필요; 본문 역할 확인 필요 |
| 새 샘플 · 2쪽 · u1ce / u1ce | yes | 0 | BLOCK | BLOCK | 본문 역할 확인 필요; graphic effect readback 미지원; title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.FontStyle |
| 새 샘플 · 1쪽 · u1cf / u1cf | yes | 0 | BLOCK | BLOCK | 본문 역할 확인 필요; graphic effect readback 미지원; title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.FontStyle, $.AppliedLanguage |
| 새 샘플 · 2쪽 · u335e / u335e | yes | 1 | BLOCK | BLOCK | body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.PointSize |
| 새 샘플 · 3쪽 · u3356 / u3356 | yes | 0 | INFO | BLOCK |  |
| 새 샘플 · 4쪽 · u3d5 / u3d5 | yes | 1 | BLOCK | BLOCK | body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.PointSize, $.Leading |
| 새 샘플 · 5쪽 · u3d6 / u3d6 | yes | 3 | INFO | BLOCK |  |
| 새 샘플 · 6쪽 · u735 / u735 | yes | 0 | BLOCK | BLOCK | 제목 역할 확인 필요; UNSUPPORTED 페이지 귀속/공유 객체: u7eac; body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.PointSize, $.Leading |
| 새 샘플 · 7쪽 · uad7 / uad7 | yes | 2 | BLOCK | BLOCK | 제목 역할 확인 필요; UNSUPPORTED 페이지 귀속/공유 객체: u7eac; body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.PointSize, $.Leading |
| 새 샘플 · 8쪽 · u576c / u576c | yes | 0 | BLOCK | BLOCK | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요; UNSUPPORTED 페이지 귀속/공유 객체: u7fad |
| 새 샘플 · 9쪽 · u5764 / u5764 | yes | 3 | BLOCK | BLOCK | 제목 역할 확인 필요; UNSUPPORTED 페이지 귀속/공유 객체: u7fad |
| 새 샘플 · 10쪽 · u577b / u577b | yes | 1 | INFO | WARN |  |
| 새 샘플 · 11쪽 · u577c / u577c | yes | 0 | INFO | BLOCK |  |
| 새 샘플 · 12쪽 · u853e / u853e | yes | 0 | INFO | BLOCK |  |
| 새 샘플 · 13쪽 · u8668 / u8668 | yes | 0 | INFO | BLOCK |  |
| 새 샘플 · 14쪽 · u8726 / u8726 | yes | 1 | BLOCK | BLOCK | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요; 제목 역할 확인 필요 |
| 새 샘플 · 15쪽 · u889b / u889b | yes | 0 | BLOCK | BLOCK | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요; 제목 역할 확인 필요 |
| 새 샘플 · 16쪽 · u87d0 / u87d0 | yes | 0 | BLOCK | BLOCK | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요; 제목 역할 확인 필요 |
| 새 샘플 · 17쪽 · u8846 / u8846 | yes | 0 | BLOCK | BLOCK | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요; 제목 역할 확인 필요 |
| 새 샘플 · 18쪽 · u8942 / u8942 | yes | 0 | BLOCK | BLOCK | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요; 제목 역할 확인 필요 |
| 새 샘플 · 19쪽 · u89c2 / u89c2 | yes | 0 | BLOCK | BLOCK | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요; 제목 역할 확인 필요; 본문 역할 확인 필요 |
| 새 샘플 · 20쪽 · u8a26 / u8a26 | yes | 0 | BLOCK | BLOCK | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요; 제목 역할 확인 필요; UNSUPPORTED 페이지 귀속/공유 객체: u8a28 |
| 새 샘플 · 21쪽 · u8a27 / u8a27 | yes | 0 | BLOCK | BLOCK | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요; 제목 역할 확인 필요; 본문 역할 확인 필요; UNSUPPORTED 페이지 귀속/공유 객체: u8a28 |
| 새 샘플 · 22쪽 · u8b10 / u8b10 | yes | 0 | BLOCK | BLOCK | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요; UNSUPPORTED 페이지 귀속/공유 객체: u8b5d; body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.FontStyle |
| 새 샘플 · 23쪽 · u8b11 / u8b11 | yes | 0 | BLOCK | BLOCK | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요; UNSUPPORTED 페이지 귀속/공유 객체: u8b5d |
| 새 샘플 · 24쪽 · u8c39 / u8c39 | yes | 0 | BLOCK | BLOCK | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요; 제목 역할 확인 필요; UNSUPPORTED 페이지 귀속/공유 객체: u8d69 |
| 새 샘플 · 25쪽 · u8d68 / u8d68 | yes | 0 | BLOCK | BLOCK | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요; UNSUPPORTED 페이지 귀속/공유 객체: u8d69; graphic effect readback 미지원 |
| 새 샘플 · 26쪽 · u8ccf / u8ccf | yes | 0 | BLOCK | BLOCK | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요; 제목 역할 확인 필요; UNSUPPORTED custom image color management |
| 새 샘플 · 27쪽 · u8e19 / u8e19 | yes | 1 | BLOCK | BLOCK | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요 |
