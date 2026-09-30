# 등록 디자인 검증판 — 2026-09-30

기준 90bc2a5. 기존 무료/AI/v1 JSON 제작은 보존했다. 이번 연결은 **역할 확인 → 등록 파일 → 원고 비교 → 분석 후보 선택 → 콘텐츠 overlay**까지다. 전체 v2 지면 생성/콘텐츠 교체/INDD/PDF 연결은 미완료이며 새 기능을 Production Ready로 표시하지 않는다.

## 사용 방법

1. 패널의 `등록 디자인에서 추천 · 검증판`에서 `디자인 모델 / 등록 파일 불러오기`를 누른다.
2. IDML에서 추출한 v2 JSON을 선택한다. INDD/IDML 자체를 선택하는 importer가 아니다.
3. 일반 페이지를 선택하고 `이 페이지 역할 확인`을 누른다. 이름을 알아보기 쉽게 수정한다.
4. 구조 위치도의 프레임 ID와 원문 일부를 보고 제목/부제/본문/사진 등을 지정한다. 사진은 필수/선택 정책을 명시한다. 복수 독립 Story에 같은 콘텐츠 역할을 배정하면 확인 필요 상태로 남는다.
5. 기사와 무관한 영역은 `미지정 영역은 모두 원본 유지`로 한 번에 확인한다. 기존에 지정한 기사 역할은 유지한다. 12개씩 표시하므로 모든 객체가 한꺼번에 렌더링되지 않는다.
6. `이 페이지 등록`. 역할 미확정 상태도 분석용으로 등록할 수 있지만 제작 승인은 아니다.
7. `등록 라이브러리 저장`. 저장한 파일은 다음 Reload 때 다시 불러온다. **원본 텍스트/XML/이미지 링크 메타데이터가 들어 있으므로 개인 파일로 보관하고 GitHub에 올리지 않는다.** API 키와 원고는 포함하지 않는다.
8. Word/사진을 기존 원고 영역에 입력하고 `등록 디자인에서 추천`. OpenAI 키/호출 없이 기존 폰트 캐시와 Matching Core로 비교한다.
9. 적합 후보는 최대 3개, 별도로 확인 필요 최대 3개와 제외 사유를 보여준다. `분석 후보로 선택`은 콘텐츠 교체 계획만 만든다. 제작 영역의 기존 생성 버튼은 기존 무료/v1 JSON 시안 대상이다.

로컬 실제 모델(커밋 제외): `assets/templates/working/original-model-final.json`, `assets/templates/working/central-model-final.json`.

## 역할 및 등록 계약

src/design-registration.js: 명시적 role → 문단/문자 Style → Object Style → 이름 → Layer → 텍스트 구조 → 위치/크기 단서. confidence는 확률 보장이 아닌 규칙 강도다. 명시적 role과 선/Group 컨테이너 유지 외에는 자동 확정하지 않는다. Group 자식은 별도 판단한다. 사진은 배경/지면 전체 이미지일 수 있어 자동 슬롯 확정하지 않는다.

TITLE/SUBTITLE/BODY/IMAGE_1/IMAGE_2/CAPTION/HEADER/FOOTER/PAGE_NUMBER와 KEEP 지원. CATEGORY 등 별도 콘텐츠 binding은 아직 없으므로 원본 유지로 확인한다. 복잡한 자동 장식 판별은 미지원이다.

`magazine-registered-library/v1`: models는 source SHA별 원본 모델, designs는 modelKey+descriptor 배열. descriptor는 id/name/sourceSha256/pageIds/roles/images/preserveElementIds. 동일 원본은 파일에 한 번만 저장한다. 로딩 시 SHA 일치, 페이지/역할/사진 정책을 재검증하고 오류 항목만 제외한다. source SHA는 추출 당시 식별값이며 이 UI는 실제 IDML을 다시 해시하는 인증 기능이 아니다.

gate는 ROLE_MAPPING_REQUIRED 또는 READY_FOR_FIDELITY_TEST. 저장 파일의 productionReady/fidelity 선언은 승인 근거로 사용하지 않는다. FIDELITY_VERIFIED/PRODUCTION_READY를 설정하는 경로는 아직 없다. 전체 renderer/readback 전에는 모든 등록 디자인 productionReady=false.

## Typography/fallback 감사

| 경로 | 현재 동작 / 한계 |
|---|---|
| 무료/AI v1 | layout-engine의 글꼴/크기/역할별 행간은 새 디자인을 만드는 규칙. 원본 IDML 재현 경로가 아님 |
| 기존 JSON v1 | json-design.normalize에서 fontSizePt null→8pt, leadingPt null→size×1.2. columns/inset/문단간격/색의 선택값 기본값도 존재. warnings로 표시. 제공 JSON에는 IDML style 상속 reference가 없어 실제 v2 값으로 임의 덮어쓰지 않음 |
| v2 extractor | 문단 BasedOn → 직접 문단값 → 문자 Style → 직접 run override 보존. 모든 contextual/GREP/중첩/조판 기본값이 완전 해석된 것은 아님 |
| v2 frame | 활성 Object Style 그룹 + BasedOn 부모의 TextFramePreference + 직접 override. 이번에 부모 children 누락 경로 보완. cycle 거부 |
| v2 proof | 실제 family/style 필수, size/leading/단/inset/색 등 미해결이면 거부. AutoLeading 미해결도 이제 거부(120% 암묵 적용 금지). alignment/kerning/tracking/문단간격 등 지원 whitelist만 적용 |
| v2 proof 한계 | first baseline 미해결/고급 텍스트/auto sizing/효과 등 omitted 공개. 단일 프레임 MATCH는 전체 Fidelity 인증이 아님 |

실제 보고된 title/subtitle/pageNumber 넘침은 Host 비교 결과 없이는 원인을 확정할 수 없다. 특히 pageNumber ×1.2는 **v1 입력 JSON의 null leading** 처리로 코드상 확인됐다. 해당 JSON 역할과 두 원본 IDML 객체 사이의 검증된 대응 관계가 없어, 다른 샘플의 값을 가져다 채우지 않았다. 기존 Auto Fix/PDF 검사 우회 없음.

## Host 검증 / 원인 분리

역할 확인 화면의 텍스트 프레임에서 `원본 단일 프레임 Host 검증`은 기존 design-model-host를 명시적으로 호출한다. **새 proof 문서만** 만들고 Original/Generated/차이/overflow/omitted를 출력한다. IDML/INDD는 열거나 쓰지 않는다. Studio latest는 변경하지 않으며 이 proof는 기존 INDD/PDF 버튼의 대상이 아니다.

기존 proof 지원 범위: 독립·비회전·사각 TextFrame, 명확한 한 페이지, 기본 솔리드 색/지원되는 run·문단 속성. Group/Parent/이미지/복합 효과/스레드/변수 축/전체 z-order 재현과 콘텐츠 run 재배분은 아직 미지원. 전체 지면을 일부만 만들고 성공으로 표시하지 않는다.

진단 코어는 MISSING_FONT / GENERATOR_MISMATCH / FIDELITY_UNVERIFIED / SOURCE_OVERFLOW_OR_UNKNOWN / CONTENT_OVERFLOW를 구분한다. 원본 비교 일치 및 교체 전 overflow=false가 모두 있어야 콘텐츠 문제로 분류한다. 이 코어는 아직 v2 전체 제작/Auto Fix에 연결되지 않았다. 기존 v1 Auto Fix는 해당 plan 대비 검사이며 원본 IDML Fidelity 인증으로 사용하지 않는다.

## 사진 치수

UXP File.read(binary) + getMetadata 크기 확인 후 최대 32MB PNG/JPEG header를 읽는다. PNG IHDR, 기본/순차/점진 JPEG SOF를 지원한다. EXIF가 있는 JPEG는 회전 해석 전까지 unknown, 큰 파일/손상/미지원도 unknown. 이미지 자체 선택은 유지한다. 브라우저는 기존 naturalWidth/Height 방식.

공식 근거: https://developer.adobe.com/indesign/uxp/reference/uxp-api/reference-js/modules/uxp/persistent-file-storage/file

## 실제 자료 결과 / 검증 범위

두 IDML XML→model 재검증: 기존16쪽(Parent 포함)/217객체/197run/751 typography 비교, 신규13쪽/280객체/206run/784 typography/14 image bounds 비교 통과. 원본 해시 유지. **Adobe 시각적 round-trip이 아님.**

일반 페이지에 명확히 속한 객체: 기존14쪽에 명시적 기사역할0, 자동선/그룹유지43, 사용자확인148. 신규11쪽에 명시적 기사역할0, 자동유지36, 확인228. 후보 추정값을 디자이너 승인으로 바꾸지 않았다.

실제 Word 제목19/부제38/본문453자·7문단/사진0 기준, 미승인 두 모델의 25개 페이지는 모두 확인 필요. 적합 순위를 꾸며내지 않는다. 브라우저에서 신규 실제 모델 로드→첫 페이지 원본유지 등록→제목/본문/폰트 확인 필요 표시를 직접 확인했다. 파일 선택 도구가 길게 지연되어 선택기 성능은 확정하지 않았다.

자동 테스트: Node173(기존160+13), Python15. 등록/저장 재로딩/격리/최대3후보/명시 선택/원본 불변/상속/이미지/초기화실패/취소 이후 상태·stale async 회귀. 기존 proof isolation 검사는 이번 명시적 패널 연결에 맞춰 제작 renderer 격리 조건으로 변경.

## PC Smoke Test

1. UDT Reload → 기존 stability-01 표시와 무료3안/JSON3안 유지.
2. 등록 모델 불러오기 → central-model-final.json → 페이지 목록11개.
3. 텍스트가 있는 페이지 선택 → 원문 일부/구조도/역할 후보 표시. 첫 페이지는 전체 이미지여서 제목·본문 없음이 정상.
4. 제목/본문 지정, 나머지 유지, 이름 입력, 등록·저장 → 재로드 후 등록 파일 재불러오기.
5. 예시 원고 → 등록 디자인 추천 → 이유 또는 확인 필요 표시. 키 불필요, 자동 제작 없음.
6. 텍스트 프레임 Host 검증 → 새 단일 프레임 문서, Original/Generated/MATCH 또는 MISMATCH. 지원 밖이면 이유 표시. 전체 지면과 동일하다고 판단하지 말 것.
7. 실패 시 버전 SHA, 선택 페이지/프레임 ID/역할, 원본/생성 비교, omitted, 넘침 화면을 전달. 원본 개인 경로·기사 전체·API 키는 가리고 전달.

다음 단계: 디자이너 역할 확인 자료 확보 → 원본 콘텐츠의 전체 Host renderer/readback → Fidelity 검증 → content run 교체 정책 → 기존 latest/check/save/PDF 연결. 현재 단계에서 해당 연결을 완료했다고 보지 않는다.
