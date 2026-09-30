# HANDOFF — 중간 작업 보존 (2026-09-30)

> **WIP / 미완성. 사용자 요청으로 개발 중단. 새 계정에서는 이 절을 먼저 읽으세요.**
> 이전 아래 절은 역사적 기록입니다. 이번 작업을 Adobe 실기 성공 또는 제작 완료로 해석하지 마세요.

## A–C. 목적 / 기준 / 시작 상태
- 제품 목적: DOCX 글·이미지와 기존 디자이너 디자인을 구조적으로 비교 → 사용자 선택 → 원본 디자인 유지·콘텐츠 교체 → 검사 → INDD/PDF. AI API 불필요.
- 브랜치 `codex/magazine-studio-1.1`; 시작 HEAD `47e0822088813ca5d282abe954fe78a40d5e4b04`.
- 시작 main 및 중단 전 main: `ce20690bd6d32facfd4f5658dfd2ac696473a762`. main 변경 금지.
- 시작: v2 모델/역할 확인/등록/추천/overlay/단일 프레임 proof, Node173/Python15. 전체 등록 디자인 제작 미연결.
- 시작부터 있던 미추적 사용자 파일: `sample/magazine-design.indd`. 그대로 보존, stage 금지.
- 이번 보존 커밋은 본 문서를 포함하는 `WIP: preserve DOCX-to-design production work for handoff`; 정확한 SHA는 `git log -1`로 확인. SHA 자기참조를 위해 추가 커밋하지 않음.

## D–F. 구현 상태 (완료 = 코드/자동 검증 범위, Adobe 성공 아님)
| 항목 | 상태 | 실제 범위 |
|---|---|---|
| DOCX relationship·등장 순서·중복 제거·PNG/JPEG 크기/비율 | 완료(제한된 형식) | 신규 11개 테스트 중 관련 테스트 통과. VML/외부/장식은 경고/제외 |
| 글+이미지 Article Profile | 완료(코드) | 기존 텍스트 분석 + 이미지 순서/문단위치/픽셀 크기. 네이티브 파일 추출 실기 필요 |
| 여러 기존 디자인 비교/최대3 추천/사용자 선택 | 기존 완료 + 일부 수정 | API 없이 기존 코어 사용. 낮은 추정 ppi 경고 추가, 라이브러리 import 병합 |
| Role UX | 부분 완료 | 핵심 6개 슬롯 선택, 나머지 기본 keep, 상세 기존 화면 유지. 브라우저 직접 재검증 미완료 |
| 추천 → 실제 제작 | 부분 완료 | 새 UI→Studio→native adapter→임시 IDML open→검사 연결. Adobe 미검증 |
| 원본 Fidelity | 부분 완료 | 실제 원본 XML158개 재직렬화 대조 차이0(내부 라벨 제외), CRC 정상. Host typography/geometry readback 코드+Mock. 전체 그래픽 fidelity 보장 아님 |
| TITLE/SUBTITLE/BODY 콘텐츠 교체 | 부분 완료 | 동일 effective run 스타일만 허용. 혼합 스타일/선택 밖 story 연결은 거부 |
| IMAGE 슬롯 교체 | 부분 완료 | 확정 슬롯만 place, 원본 fitting 옵션 요청. 실제 사진/고정 장식 보존 실기와 세부 회귀 테스트 부족 |
| 검사·INDD·PDF 연결 | 부분 완료 | 기존 latest/check/save/export 경로 재사용. Fidelity 실패/overflow 차단 코드. 실제 저장/PDF 미검증 |
| Adobe 실제 E2E·시각 Fidelity | 아직 시작하지 않음 | 실제 Adobe 접근 불가. 이번 브라우저 열기 도구도 사용자가 중단 |
| 등록 디자인 Auto Fix / 혼합 run 재분배 | 아직 시작하지 않음 | 보수적으로 등록 디자인 autoFixAllowed=false; 기존 v1 Auto Fix 유지 |

## G–H. 현재 코드 구조 / DOCX
- **신규** `src/docx-media.js`: document.xml + document.xml.rels의 DrawingML embed 추적. media 전체 스캔 안 함. 실제 등장 중복은 occurrences로 보존하고 같은 파일은 하나의 사진으로 처리. 명시적 decorative/behindDoc 제외. 32장/32MB 제한. PNG/JPEG만 지원, EXIF는 dimensions unknown 가능. conventional w/a/r/wp namespace prefix 중심이라는 한계.
- `studio.js`: UXP data folder에 추출 이미지 저장; path/handle을 Article에 연결. Reload guard. 실제 파일 권한/쓰기/배치는 미검증.
- `preview.js`, `preview.html`, `src/image-dimensions.js`: 브라우저 DOCX 이미지 Blob preview와 UMD 연결. 직접 브라우저 검증은 미완료.
- `src/layout-engine.js`: 기존 무료 시안 2장 제한 유지, DOCX 이미지 metadata 보존 필드 추가.
- `src/studio-ui.js`: 등록 원고는 2장 초과 분석 가능; free prepare 제한. registeredEntry/documentKey, 공통 production wrapper 연결. 이미지 3장 이상 시 이전 preview 잔존 여부 등 실제 UI 후속 점검 필요.

## I–K. Design Library / 원본 / 역할
- 두 기존 실제 source model 유지: 기존 일반14쪽 + 센트럴 일반11쪽 = 25개 페이지 분석 대상. **25개 모두 제작승인된 디자인이라는 뜻 아님.** UI 저장 등록 수는 사용자가 불러온 라이브러리에 따라 다름. 원본을 번들에 커밋하지 않음.
- `src/design-registration.js`: 미지정은 기본 KEEP_AS_IS. 명시적 역할 외 TITLE/BODY를 임의 확정하지 않음.
- `src/design-registration-ui.js`: 핵심 슬롯 title/subtitle/body/image1/image2/caption, 상세 프레임 접기. import는 기존 entry를 유지하며 ID별 병합. 추천 선택에 entry/article 연결, 제작 버튼 추가.
- 참고 분석용 로컬 등록 파일: `assets/templates/working/e2e-reference.review.json` (이번 생성, ignored). 기존 원본 page u335e: title u7c7e / subtitle u7caf / body u7c96 / image1 u7c78. 원문의 명확한 placeholder를 보고 만든 **개발자 검토용 매핑**이며 디자이너 승인/Adobe 검증 아님.
- 같은 페이지의 대표이미지 텍스트 u7dba 등 비역할 객체는 그대로 유지. 다른 샘플/페이지 삭제 안 함.

## L–P. Fidelity / 추천 / 제작 / 출력
- **신규** `src/package-xml.js`: raw XML tree→namespace XML→stored ZIP, CRC. XML attribute tab/newline numeric escape 수정(실제 원본 대조로 발견). 데이터 좌표 재계산/복제 없음.
- **신규, 미완성** `src/registered-native.js`: sourceXml 복제→Page/PageItem에 별도 private key label→임시 IDML→InDesign native importer. 원본을 열거나 수정하지 않음. 임시 복원 문서에서 선택 밖 페이지 제거(원본 아님). source binary 누락은 거부.
- STEP A: 원본 XML import 후 geometry/run typography/frame columns/gutter/inset + 기존 검사. 실패하면 콘텐츠 교체 없이 Fidelity 오류와 Auto Fix 금지.
- STEP B: 동일 스타일 story만 교체, font/size/leading/tracking 등 native 값을 재적용, 슬롯 이미지만 place/기존 fitting 요청, recompose→content 검사.
- `src/auto-indesign.js`: registeredContexts WeakMap, createRegistered, 기존 검사에 fidelity/content issues 추가, 기존 save 반환 문서의 frame rebind. latest/state/session 보호 재사용.
- `src/design-matching.js`: pixel aliases/순서/문단 위치와 낮은 추정ppi soft 경고. 정확한 인쇄 품질 보장 아님.
- 일반 생성 경로의 leading fallback은 이번 작업에서 변경하지 않음. 등록 경로는 source XML/native style 상속을 사용하지만 Host 모든 상속/override 보존은 미검증.
- static library productionReady는 여전히 false. 런타임 통과만으로 디자인 전체 영구 승인하지 않음. PDF 기존 재검사/차단 유지.

## Q–R. 검증 결과와 미검증
- 중단 후 재실행: **Node184/184 (기존173 + 신규11), 실패0, skip0; Python15/15, 실패0**. `git diff --check` 통과(LF→CRLF 안내만 있음).
- `package.json`의 npm test 목록에 신규 `tests/registered-production.test.js` 포함. 이 PC에서 npm 대신 동일 `node --test` 명령 실행.
- 신규 테스트: DOCX 순서/중복/장식/경로 거부/치수/profile, ZIP CRC/XML, 원본 실패→콘텐츠 미교체, geometry mismatch, content overflow 구분, stale open cleanup. **모든 요구 시나리오를 완성한 테스트 세트 아님.**
- 실제 기존 IDML과 로컬 e2e-reference.idml의 XML158개 비교 차이0(추가 식별 라벨/빈 wrapper 정규화 제외; container 제외). 패키지 CRC 오류 없음. 전체 네이티브 importer 검증은 아님.
- 이번 브라우저 실행 도구는 사용자 중단으로 완료 못함. 실제 버튼 조작 확인 안 함. 테스트용 http.server 세션은 중단 시 Ctrl+C로 종료.
- 아직 Adobe에서 app.open/페이지삭제/label 보존/폰트/style 범위/그룹·Parent·z-order/고정 이미지/저장·PDF/Reload 확인 안 함.

## S. NEXT STEP — 새 계정이 가장 먼저 할 일
1. 브랜치/HEAD/status 확인 후 이 문서와 diff를 읽기. **WIP이므로 사용자에게 완료판이라고 안내하지 말기.** 개인 샘플은 새 clone에 없으므로 별도 안전하게 전달받기.
2. `src/registered-native.js` 우선 코드 감사: import 후 선택 페이지 축소가 spread/Parent/공유 객체/thread에 미치는 영향, readback에서 누락된 fill/stroke/layer/z-order/graphics, uniform 스타일 교체 시 keep/rule/기타 override 보존. 혼합 스타일 거부 정책 유지.
3. `src/package-xml.js`/packagePlan 실제 XML fixture 회귀 추가: container 중복 방지·속성 tab/newline(현재 로컬 대조만으로 확인). private 모델을 테스트에 커밋하지 말기.
4. `src/docx-media.js` namespace/빈 문단 subtitle index/EXIF/중복의미/실제 DOCX fixtures 보강. UXP 파일 쓰기/이미지 place 확인.
5. `src/studio-ui.js`/registration UI 직접 실행: >2장 입력, free↔JSON↔registered 선택·stale document·Reload·실패 재시도. 등록 create→기존 check/save/PDF Mock통합 테스트 보강.
6. 기준 페이지를 **사용자가 역할 확인**한 뒤 Adobe에서 source fidelity 먼저 확인. 원본 단계 overflow/mismatch면 콘텐츠/Auto Fix로 숨기지 말기. content replacement 이후 별도 검사.
7. 위 점검 후에만 완성 개발을 이어가기. 이번 커밋은 중간 보존이며 개발 확대 승인으로 해석하지 말기.

## T–U. 보호 / 제외 / 파일 보존
- main/reset/clean/force push 금지. 기존 시작페이지/Inspector/목차/무료·JSON·AI/폰트/Reload/Auto Fix 회귀 금지. 테스트 완화 금지.
- 원본 INDD/IDML, 개인 Word/이미지/추출 XML 모델, API키, cache는 수정/커밋하지 않음.
- 이번 신규 개인 파생물(모두 ignored·로컬 보존): `assets/templates/working/e2e-reference.review.json`, `assets/templates/working/e2e-reference.idml`. GitHub에 없으므로 다른 PC/계정은 별도 파일 전달 필요.
- 기존 개인 모델 `original-model-final.json`, `central-model-final.json` 및 working 내 분석/원본 복사본은 그대로 보존.
- staged 파일은 시작 시 없음. 보존 대상은 코드15개 + HANDOFF/WORKLOG; sample/magazine-design.indd는 미추적 그대로 남김.

---

# HANDOFF — 1.1.0

## 최신 상태 — 등록 디자인 역할 확인/추천 검증판

- 기준 90bc2a5. 역할 후보/확인 UI, 페이지별 등록·파일 저장/재개, API 없는 후보 최대3 및 근거, 분석용 선택/content overlay 연결.
- Object Style BasedOn의 frame preference 상속 누락 보완, AutoLeading 미해결 시 proof 거부. PNG/일부 JPEG 치수 조회(32MB 제한, EXIF unknown).
- 별도 원본 단일 프레임 Host proof 버튼과 readback 연결. 전체 v2 renderer/콘텐츠 교체/기존 INDD/PDF 연결은 아직 미완료. 모든 등록 디자인 productionReady=false.
- 브라우저에서 실제 신규 모델 로드→페이지 역할→유지 등록→확인 필요 추천 표시, Reload 후 무료3안 실행. Adobe Host 미검증.
- 두 실제 IDML XML 대조와 25페이지 미승인 역할 gate 확인. Node173/Python15 통과. 원본/개인 모델 미커밋.
- 다음: 디자이너 역할 확인→전체 지면 Host fidelity→콘텐츠 run 교체→기존 production 연결. 자세한 한계/PC 절차: docs/DESIGN_REGISTRATION.md.


## 최신 상태 — Design Capability / Matching 코어

- 기준 660266c에서 계속 작업. src/design-matching.js, tools/analyze-design.js, tools/match-designs.js 추가.
- 기존 v2를 유지하고 fitting/transparency/clipping의 optional details 보존을 보강했다. 기존 실제 IDML의 geometry/type/style/thread 회귀 비교 차이 0.
- 사용자가 제공한 실제 2센트럴-눈길.idml 분석 완료: 일반11/Parent2쪽, 280객체, 14배치 이미지. INDD 파싱/변경 없음. 기본 style 축약참조, GraphicBounds attributes, variable font nested list 해석 보강.
- 기존 실제 디자인+Word 실행: 제목19/부제38/본문453자·7문단, 기존14+신규11=25개 페이지 분석 항목 모두 역할/폰트 확인 필요. 임의 추천하지 않음.
- Library sidecar는 원본 hash/page 범위/확정 역할/사진 정책 필요. 객체별 수용량은 low-confidence 범위다. Fonts/image dimensions 미확인은 review 상태.
- Original+content overlay+runtime adjustment 분리. productionReady=false. 전체 v2 renderer가 없으므로 기존 생성기에 연결하지 않았고 기존 Studio 제작·Auto Fix·PDF 코드는 변경 없음.
- 전체 Node160 통과(이전143+추가17), Python15 검사도 통과. 두 실제 IDML의 XML 대조 및 profile 검증 통과. Adobe 실기 검증은 아직 안 됨.
- 다음: 두 샘플 role 확인 → 조판으로 capacity 보정 → 기존 제작 adapter v2 지원/UI.
- 문서: docs/DESIGN_MATCHING.md. 개인 모델/결과/샘플 INDD는 Git 제외.

## 최신 인수인계 — 2026-09-30 Design Model Phase 1

- 기준 `630e5e557bfae1c7e8de622012241829d05c7878`의 Studio/Auto Fix 제작 경로를 변경하지 않고 별도 v2 추출/검증 코어를 추가했다.
- `tools/extract_design.py`: IDML ZIP/XML 파싱, sourceXml 보존, geometry/style/story/font/색/참조 추출. INDD 직접 파싱 없음.
- `src/design-model.js`, `src/design-model-host.js`: v2 검증, runtime 분리, 명시적 단일 텍스트 프레임 proof와 Host readback 비교. 전체 지면 importer/생성기가 아니다. 패널 연동은 아직 없음.
- 기존 Node 132개 + 신규 11개 = 143개 통과. 신규 진입점 하나에서 Python 12개 검사도 통과. Mock은 실제 Adobe 검증이 아니다.
- 실제 IDML(일반 14쪽, Parent 2쪽, 객체 217개)을 오프라인 추출하고 text proof를 브라우저에서 표시했다. INDD→새 InDesign 시각 round-trip은 미검증.
- 사용자 `sample/magazine-design.indd`는 원래 untracked 상태 유지. 제공 INDD/IDML/폰트/추출 원문은 stage하지 않는다. 로컬 결과는 ignored `assets/templates/working/`에 있다.
- 다음: DESIGN_FIDELITY의 PC proof 실기 → style/graphics/group/Parent/thread renderer 범위 확장 → role mapping/importer UI.
- 상세: [모델](docs/DESIGN_MODEL.md), [실행](docs/DESIGN_EXTRACTION.md), [fidelity](docs/DESIGN_FIDELITY.md).

아래 기존 상태/테스트 수는 해당 개발 시점의 이력이다. 최신 결과는 위 기준을 따른다.

갱신: 2026-09-29. 사용자 요청: **안정화 유지 + 제공 JSON 디자인 3종 연결.** 개발 브랜치: `codex/magazine-studio-1.1`.

## 현재 상태

- 기존 OPENING_PAGE 모드의 생성 로직(`src/text.js`, `src/image.js`)을 유지하고 새 디자인 모드를 분리했다.
- 새 모드는 새 문서·새 프레임을 생성한다. 기존 문서에는 쓰지 않는다. 이는 사용자가 명시적으로 요청한 새 범위이며 D026에 기록했다.
- 무료 배치 3안 / 선택형 AI 첫 페이지 설계 / 이어지는 본문 페이지 / 원고 저장 / INDD 저장 / 검사 / PDF 코드 구현.
- Word의 탭/수동 줄바꿈 처리와 중복 마커 검사를 보강했다.
- Node 자동 테스트 **115개 통과**(기존 안정화 90 + JSON 회귀 25). Host/DOM/파일 선택은 모의 객체이며 실제 Adobe 실행 검증이 아니다.
- 사용자 PC 1차 실기 확인: 패널 표시, 원고 입력, 무료 3안, 미리보기 글자 크기, 패널 스크롤 정상. InDesign/UDT 정확한 버전은 아직 미기록.
- 이후 사용자 PC에서 새 문서 생성·PDF 내보내기 성공 보고. PDF 사각형 선/미리보기 차이 관찰. 이번 외관 수정 이후 실제 InDesign 재검증 필요. AI 실호출 및 별도 브라우저 렌더링은 여전히 미검증.
- 수정: UXP enum equals 비교, 재생성 실패 시 이전 대상 해제, save 반환 문서 추적, 검사 실패 후 PDF 차단, 단계별 민감정보 제거 진단. PDF 옵션 취소/완료 불명확 시 성공으로 단정하지 않는다.

기존 1.0의 실기 성공 기록은 `docs/archive/HANDOFF-before-1.1.md`에 보존했다. 해당 기록은 새 모드 실기 검증의 근거가 아니다.

- 외관 수정: strokeColor=None 명시, typography/furniture 공통화, 설정 폰트·자간·문단 간격·색상 정합성, 신규 문서의 스타일 override 제거. 실제 줄바꿈/폰트 매칭/페이지 분할은 아직 다를 수 있음. 상세 비교와 실기는 docs/RENDER_PARITY.md.

- 최신 실기 오류: create.styles에서 글꼴 스타일 사용 불가. 역할/폰트/속성은 기존 로그에 없어 정확한 PC 원인 미확정. 폰트와 style 일괄 대입을 순차 적용으로 변경하고 단계별 family/style/name 진단을 추가했다.
- 실제 설치 face 검색/본문·제목 적용, 프로젝트 누락 폰트 경고, UI 전수 감사 완료. Mock 통과와 Adobe 실기는 구분한다. 상세: docs/STUDIO_AUDIT.md. 템플릿 등록/상세 텍스트 편집 UI는 설계만 했다.

- 안정화: 동일 DOM mount 재사용, destroy/새 DOM 재초기화, 선택 UI 실패 격리, Host 실패 시 입력/시안 유지, session/latest/picker 보호. 폰트 Family→Style 선택과 cache/명시 새로고침 분리. 시간 진단 표식: Studio ready [stability-01].
- 최신 절차/전체 UI 추적은 docs/STABILITY.md. 실제 UDT Reload와 최신 폰트 적용은 아직 사용자 PC 실기 필요.

- JSON: designs/manifest.json → validator/normalizer → origin=json plan → Preview/Host. 무료3안 유지. 폰트/무사진/후속 페이지/누락값/추가 파일 방법은 docs/JSON_DESIGNS.md. 표시 [json-design-01] 추가.
- 원본 헤더 크기/페이지번호 행간은 null이므로 명시 기본값과 경고 적용. 원본 제목/부제 프레임이 작아 예시 원고 넘침 가능; 자동 축소/이동 없음. 실제 InDesign/PDF 미검증.

## 다음 3개 작업

1. JSON 디자인은 먼저 `docs/JSON_DESIGNS.md`의 Smoke 순서로 실기 비교한다. 기본 흐름은 `docs/STABILITY.md`의 5~10분 Smoke Test를 통과한 뒤 `docs/PRODUCTION_TESTS.md`의 버튼 순서로 실제 InDesign에서 실행하고 앱·UDT 버전, 코드 SHA, 단계별 결과를 남긴다. docs/RENDER_PARITY.md 순서로 동일 원고/무료 시안의 미리보기·새 문서·PDF 외관을 비교한다.
2. Host API 호환성 문제가 있으면 `src/auto-indesign.js`에 한정해 보정한다. 원고/배치 계산 로직과 기존 템플릿 생성 경로를 함께 바꾸지 않는다.
3. 실제 원고 3건으로 제목 넘침, 본문 페이지 추가, 사진 크롭, 원문 보존, PDF 출력을 확인한 뒤 실무 배포 여부를 결정한다.

## 핵심 경계

- 무료 3안은 로컬 계산이다. AI라고 표시하지 않는다.
- AI 모드는 버튼 실행 시에만 키로 요청. 실호출은 개발 중 하지 않았다. 응답 좌표 검증 실패 시 입력 중단, 자동 재시도 없음.
- 생성 전 폰트·이미지 접근 검사. 생성 중 실패하면 이번 새 문서만 닫는다. 활성 사용자 문서에는 접근하지 않는다.
- `latest` 문서 객체로 저장/출력을 고정하고, 원고·시안이 바뀌면 이전 제작본의 출력 버튼은 비활성화한다.
- 본문 원문은 처음 연결된 Story에 한 번만 입력. `Story.overflows`가 남으면 본문 페이지를 추가한다. 최대 40장.
- API 키/사진 바이너리는 프로젝트 JSON에 넣지 않는다. 사진 링크 경로는 포함되므로 다른 PC로 옮길 때 사진도 전달해야 한다.
- 목차 자동 생성, 여러 기사 일괄 제작, 이미지 생성, 모든 인쇄조건의 자동 검증은 범위 밖이다.

## 개발·전달

- `npm test`: 의존성 설치 없이 115개 테스트. 현재 PC 셸에 npm이 없으면 package.json과 동일한 `node --test tests/core.test.js tests/host.test.js tests/ui.test.js tests/json-design.test.js`를 사용한다.
- `preview.html`: 폴더에서 브라우저로 열어 체험.
- `manifest.json`: UDT로 로드.
- 최종 ZIP에는 소스/문서/테스트/기존 자료를 포함하며 `.git`과 임시파일은 제외.
- 사용자 승인에 따라 개발 브랜치만 commit/push한다. main에는 commit/push/merge하지 않는다.

### 현재 UI/UX 상태 (2026-09-30)
- Family 중심 선택기, 선택 디자인 요약, 역할별 검사 오류 및 PDF 차단 이유, 접힌 진단 적용.
- Story 323/348/401의 실제 역할은 아직 미확정. 새 버전으로 재검사 시 Label 기반 역할과 상세 번호를 확보해야 함.
- 브라우저 Mock 조작과 자동 테스트는 Adobe 실기 성공이 아님. 다음 작업: docs/UI_UX_AUDIT.md의 PC Smoke Test.

- 최종 자동 검증: 기존 115개 + 신규 5개 = 120개 통과 (Node/Mock, Adobe 실기 아님).

### 최신 상태: 안전한 자동 수정 (2026-09-30)
- 제목/부제 넘침을 역할별 제한 정책으로 자동 조정하고 전체 재검사. 한도 실패는 원복하고 PDF 차단.
- 본문은 기존 연결이 유지된 경우만 continuation 추가. 원본 샘플 JSON/레이아웃 값 변경 없음.
- 132개 자동 테스트 통과. 실제 InDesign auto-fit은 미검증: docs/AUTO_FIX.md PC 순서로 확인 필요.
- 기록은 세션 메모리이며 Preview/작업 JSON은 원본 plan을 유지한다. 디자인/원고 변경 후 새 생성 대상에 이전 수정값을 적용하지 않음.
