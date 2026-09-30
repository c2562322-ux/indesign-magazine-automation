# Adobe IDML open 실패 후 수정 감사 — 2026-09-30

## 확인한 원인과 한계
- 사용자가 실제 Host open 오류를 보고. 모델 추출기 `ET.fromstring()`은 processing instruction을 버리고, package serializer는 XML 선언+Document만 출력: `designmap.xml`의 Adobe `aid` 문서 식별 선언 누락을 확인했다.
- ZIP은 실제 STORE ZIP이었다. 확장자만 IDML인 텍스트 파일이 아니며 mimetype 첫 항목/비압축, CRC는 이전에도 정상. 원본 IDML 파일을 직접 복사하는 경로가 아니라 모델의 sourceXml을 재조립하는 경로다.
- 기존 UXP write는 이미 awaited binary ArrayBuffer였다. 실제 디스크 바이트 검사는 없었고 Mock은 `mimetype=idml` 한 항목도 open 성공 처리했다. 이제 불완전한 패키지/손상 저장은 Host 호출 전 거절한다.
- 원래 nativePath 전달 유지: 보고된 오류는 파일 이름을 식별한 Host 형식 오류. 경로 변환을 원인으로 단정하지 않았다. 실제 UXP 경로/버전 호환은 재실기 대상.
- **확인된 코드 결함을 수정한 상태이지 Adobe 최소 성공 기준 달성 보고가 아니다.** full IDML schema/렌더링 인증은 하지 않는다.

## 수정
- 신규 추출 metadata.aidProcessingInstruction에 원본 선언 보존. 이전 개인 모델에는 표준 `style=50 type=document readerVersion=6.0 featureSet=257` 선언을 보충하고 packagingNotes에 이유 기록. 원본 product 값을 추측하지 않으며 DOMVersion은 변경하지 않는다.
- packaging namespace는 Adobe 통상 `idPkg` prefix 사용. XML namespace 동등성만으로 Host 인식을 인증하지 않음.
- 모델 inventory의 metadata.xml 누락을 더 이상 예외로 통과시키지 않음. 원본 unknown binary는 계속 차단.
- open 전 STORE ZIP 헤더/길이/CRC, 첫 mimetype, container rootfile, aid/Document/DOMVersion, Resources/Spreads/Stories, XML src 대상 존재 검사. Preferences 등 원본 designmap 참조 리소스도 검사. 전체 XML schema validator는 아니다.
- await write → read(binary) → 완전 바이트 일치 → 패키지 재검증 → app.open(nativePath,true). open 거부는 원본 Adobe 오류 + 임시 경로 + 크기/CRC와 함께 fatal 보고. 임시파일을 남겨 재현 가능.
- 새 문서/콘텐츠/Auto Fix/PDF 우회 없음. 이 패치는 열기 경로에 한정.

## 검증
- Node **214**, Python **16** 테스트(기존206/15 유지 + 새8/1). 최종 전체 실행 통과.
- 신규: aid 누락, 원본 PI 보존, CRC/잘림/참조 누락, 저장 손상, 비동기 쓰기 완료 순서, sliced buffer, 한글 nativePath, Reload 중단, Adobe reject 진단, 누락 metadata 차단.
- 실제 개인 모델을 메모리에서 생성 후 독립 Python zipfile/ElementTree 검증: **160항목, XML159, 1,658,609 bytes, CRC f25a74a2**, source inventory 이름 집합 동일. 개인 파일은 쓰지 않음.
- 실제 Adobe 재실기/원본 Fidelity 비교는 아직 미검증.

참고: [Adobe IDML Cookbook](https://community.adobe.com/havfw69955/attachments/havfw69955/indesign/632677/1/IDML_cookbook_9627253.pdf)의 IDML 식별·패키징 설명, [Adobe Application.open](https://developer.adobe.com/indesign/uxp/dom/api/a/application/), [UXP File operations](https://developer.adobe.com/indesign/uxp/resources/recipes/file-operation/). Cookbook 링크 원문 재접근은 404였으며 검색에 노출된 Adobe 문서 발췌만 확인했다.

---

# 등록 디자인 1건 PC 실기 준비 감사 — 2026-09-30

상태: **첫 Adobe UXP Smoke Test를 실행할 코드/UI 준비 완료. Adobe 실기 성공 및 전체 Fidelity 인증 아님.**
기준 HEAD `e7a236b97fdbfab3598e983fcc5a8c1ce2be039f`, 브랜치 `codex/magazine-studio-1.1`.
중단된 미커밋 변경을 그대로 이어서 마무리했다. 신규 AI/다중 디자인 일반화는 추가하지 않았다.

## 기준 디자인 / 로컬 입력

- 기존 `assets/templates/working/e2e-reference.review.json`의 **시작 메인 · 사진 1장**.
- 등록 ID `a620c934df5347fb-u335e`, 페이지 `u335e`, 원본 표시 **2쪽**, 216 × 303 mm.
- TITLE `u7c7e` / SUBTITLE `u7caf` / BODY `u7c96` / IMAGE1 `u7c78`.
- 유지 텍스트 `u7dba` 및 Parent/기타 객체는 교체 대상이 아니다. IMAGE1은 원본의 빈 이미지 프레임이다.
- 필요한 선택 페이지 폰트: **프리젠테이션 6 SemiBold / 4 Regular**. 문서 검사에서 Parent/리소스의 추가 누락 폰트도 보고될 수 있다.
- 역할 파일은 기존 개발 검토용 매핑이다. 실제 역할/시각 비교는 사용자 확인이 필요하다. 다른 등록 디자인은 변경/삭제하지 않았다.
- 기존 `sample/article-eye-clinic-with-photo.docx`의 내부 이미지는 실제 추출 결과 0장이다.
- 신규 로컬 합성 입력 `assets/templates/working/registered-smoke.docx`: 제목 5자, 부제 15자, 본문 입력 151자(Article Profile은 줄바꿈 제외 150자), 1200×800 PNG 1장, 순서 1, 문단 인덱스 5, 비율 1.5/landscape.
- 합성 그림은 파랑/노랑 테스트 패턴이며 인쇄 품질용 사진이 아니다. 재생성 도구 `tools/create-registered-smoke-docx.py`는 기존 파일을 덮어쓰지 않는다.

## 실제 코드 흐름

`DOCX → 기존 Article/UI → 추천/사용자 선택 → proof mode → 원본 비교/사용자 시각 확인 → production mode → 새 native import와 원본 재검사 → 콘텐츠 교체 → recompose → 검사 → INDD/PDF`

- `registered-native.create(..., {mode:'proof'})`는 원본만 생성하고 CONTENT 교체를 하지 않는다.
- 검증 문서 상태는 `FIDELITY_PASSED` 또는 `FIDELITY_FAILED`. 검증 문서는 INDD 보존이 가능하지만 제작 PDF는 Host와 UI 양쪽에서 차단한다.
- 제작 버튼은 proof 자동 비교 통과와 사용자 시각 확인 뒤 활성화된다. 제작은 별도의 새 문서에서 원본 검사를 다시 수행한다.
- 원본 단계 오류가 있으면 콘텐츠는 그대로다. 오류 문서는 확인 가능하며, 실행 예외 시 이번에 연 새 문서만 정리한다.
- 최초/재검사 모두 원본 오류와 콘텐츠 overflow를 분리한다. 등록 디자인 Auto Fix는 계속 **전체 비활성**이다. 기존 무료/JSON Auto Fix는 유지한다.

## Fidelity 검사 범위와 한계

| 항목 | 코드의 확인 범위 | 남은 실기/한계 |
|---|---|---|
| 페이지 | import 직후 일반 페이지 수/ID, 선택 후 페이지 수·크기·ID | native label 유지, 실제 importer 호환성 |
| 객체·프레임 | 선택 지면 객체 존재, 페이지 상대 bounds, TextFrame/Story/이전·다음 frame 참조 | 곡선/회전·시각 외곽 전체 보장 아님 |
| 조판 | family/style/size/leading/tracking/alignment/문단 spacing, keep/rule 및 단어·문자·글리프 간격 일부 | 모든 InDesign 조판 속성을 일반화한 엔진 아님 |
| 텍스트 프레임 | inset/columns/gutter의 Object Style 상속 + direct 값 대조 | 실제 상속과 Host enum/단위 readback 확인 필요 |
| fill/stroke | 활성 Object Style 값 + direct override, 객체/텍스트의 solid fill/stroke 색상 및 객체 stroke weight/tint | gradient/미해결 색상은 UNSUPPORTED 차단 |
| 페이지 삭제 | 삭제 전후 선택 객체/Story/Parent 참조/레이어/그룹/쌓임 순서/geometry 스냅샷 비교 | 원본 IDML과 native 절대 z-order/Parent 외관 일치는 시각 확인 필요 |
| 유지 객체 | 교체 후 및 출력 전 스냅샷/원본 속성 재검사 | 선택 외 공유/귀속 불명 객체와 Story 연결은 보수적 거부 |
| graphics | XML 원본 보존, 프레임/원본 crop, 변경 전후 graphics geometry/링크 스냅샷 | 고정 배치 graphic의 원본 transform/color, clipping/transparency readback은 UNSUPPORTED 차단. 기준 페이지는 빈 IMAGE1 슬롯 |
| 이미지 교체 | 원본 Host fitting 설정을 place/fit 전후 유지, 실제 링크/개수/geometry/crop 후속 검사 | 새 이미지의 시각적 크롭/인쇄 품질은 사용자가 확인 |

검사 범위 밖 속성을 전체 재현 성공으로 선언하지 않는다. 선택 페이지의 지원 불가 그래픽 효과, 읽을 수 없는 direct override, 미해결 필수 조판 값은 Fidelity 오류로 기록/차단한다. Native 스냅샷의 비적용 속성 null은 측정값이나 기본값을 뜻하지 않는다.

## Style / Override

- raw XML의 Object/Paragraph/Character Style 정의와 BasedOn 연결을 native importer에 전달한다. 원본 모델/스타일 XML을 평탄화하거나 수정하지 않는다.
- 원본 제목에는 size/leading/tracking 외 문단 rule/spacing, 문자 stroke 등 direct 값이 있었다. 이전의 제한된 재적용은 이를 잃을 수 있었다.
- 모든 교체 목적지를 먼저 읽고, uniform Paragraph/Character Style과 **direct override 집합**을 확인한다. 빈/Br-only run도 검사하며 혼합 스타일은 거부한다.
- 원고 교체 후 원래 Paragraph/Character Style을 적용하고 **원본 Host에서 읽은 direct 값**을 다시 적용한다. 폰트 family를 style보다 먼저 적용한다.
- 원본 numeric/boolean/direct 값과 Host 값을 대조하며, 모르는 enum/복합 override는 조용히 생략하지 않는다.
- leading에 `pointSize × 1.2` 같은 fallback을 적용하지 않는다. AutoLeading 미해결도 차단한다. 현재 `fallbacks: []`는 fallback을 사용하지 않았다는 뜻이다.
- `$ID/Metrics`와 `Metrics`의 식별 접두사 정규화는 값 추정/fallback이 아니다.

## DOCX / UI / 출력

- self-closing 빈 문단 인덱스 보정 포함. relationship의 실제 embed 순서/중복 occurrence/치수/방향 정보가 Article Profile과 IMAGE1 bind에 유지된다.
- UXP data folder에 이미지 bytes를 기록한 뒤 nativePath를 전달한다. 별도 사진 선택은 기존 보조 기능으로 유지한다.
- 3장 이상 원고 입력 때 이전 무료 시안/미리보기 잔존을 제거했다.
- 등록 영역에 선택 디자인/페이지, 제목·부제·본문 글자 수, 내부 이미지 수, Fidelity 상태/불일치 항목/오류 종류를 표시한다.
- 원고 변경·Reload는 이전 검증/출력을 무효화한다. 등록 선택 중 일반 생성 버튼이 남은 무료 시안을 잘못 만들지 못하도록 차단했다. 무료 시안 재선택 시 정상 복구된다.
- Host 검사/저장/PDF 경로를 재사용한다. 저장 후 frame rebind, 원본 검증 문서 PDF 차단, 실제 제작 PDF 사전검사를 유지한다.

## 검증 결과

- **Node 206/206, Python 15/15 통과**, 기존 테스트 삭제/완화 없음. `git diff --check` 통과(LF/CRLF 안내만 있음).
- 합성 fixture의 Host double을 실제 native adapter/check/save/export 경로에 연결해 proof PDF 차단과 production 흐름을 검사했다.
- 신규 회귀: direct keep/rule/행간, 미해결 leading, 빈 run 혼합 override, fill/stroke, KEEP/장식, 페이지 삭제 후 순서/Parent, Story identity, unsupported effects, Word 이미지 bytes/slot/place, overflow 단계 분리, UI 단계/일반 생성 오동작 방지.
- 개인 기준 모델의 패키지를 메모리에서 재직렬화해 **XML 158개 일치**, ZIP CRC 정상, 중복 entry 없음 확인. private 식별 라벨/빈 wrapper/container 정규화 제외. 개인 원문은 로그/테스트 fixture로 커밋하지 않았다.
- 브라우저 직접 확인: 기본 UI의 등록 버튼/상태 표시. 기본 파일 chooser 자동화는 응답하지 않아 직접 파일 선택 완료로 기록하지 않는다.
- 별도 로컬 **Browser Mock**에서 실제 제품 UI 모듈 + 실제 합성 DOCX 파서 + 실제 등록 추천을 실행했다. Host 결과는 의도적으로 모의 응답이며 실제 문서/INDD/PDF를 쓰지 않았다.
- Browser Mock에서 DOCX→추천→선택→proof→확인→production→검사→저장→PDF 버튼 완료, proof 중 제작/PDF/일반 생성 차단, 원고 수정 후 출력/제작 무효화를 확인했다. UI의 Mock 성공은 Adobe 성공이 아니다.
- 로컬 증거 `assets/templates/working/registered-ui-smoke.png`, Mock HTML/JS/Smoke DOCX는 ignored. 임시 브라우저/HTTP 서버 종료.

## 보호 / 다음 작업

원본 INDD/IDML·개인 모델·검토 파일은 수정하거나 stage하지 않았다. 기존 파일 크기와 마지막 수정 시간이 유지됐고, Git 변경 목록에도 없다. 신규 로컬 합성 테스트 자료만 별도로 생성했다. 시작부터의 `sample/magazine-design.indd` 미추적 상태 유지.

다음은 [PC Smoke Test](REGISTERED_PC_SMOKE.md) 실행이다. app.open, native label, Parent/페이지 축소, 실제 폰트 조판, style override setter, fitting/crop, 실제 INDD/PDF를 **Adobe UXP에서 아직 실행하지 않았다**. 해당 단계가 실패하면 재현 증거를 받아 수정하며 Auto Fix로 숨기지 않는다.

참고한 Adobe DOM 계약: [Story labels](https://developer.adobe.com/indesign/uxp/dom/api/s/story/), [FrameFittingOption](https://developer.adobe.com/indesign/uxp/omv/f/FrameFittingOption/). 문서 확인은 실기 증거가 아니다.
