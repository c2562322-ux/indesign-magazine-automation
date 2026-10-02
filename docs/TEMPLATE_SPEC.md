# TEMPLATE_SPEC.md

디자이너의 InDesign 템플릿 규칙(페이지 유형, 프레임 이름, 데이터 매핑, 스타일 이름, 예외 처리 규칙 등)을 기록하는 문서다.

## 현재 상태: "시작 페이지" Script Label 적용 및 검증 완료, JSON 데이터 계약 정의 완료. "목차" Script Label 적용 및 검증 완료(자동입력/데이터 계약은 미구현). "본문 페이지"/"인터뷰 레이아웃"은 미착수

디자이너로부터 실제 InDesign 원본 템플릿(.indd/.idml)과 폰트 파일을 전달받아 `assets/templates/original/`에 보관 중이다(2026-09-22). `assets/templates/working/`에 작업용 복사본을 만들어 `Inspect Template` 버튼(읽기 전용 문서 분석 기능)으로 실제 InDesign에서 열어본 결과, "시작 페이지" 템플릿의 두 페이지 변형(사진 있는 버전 page.name=2/index=3, 사진 없는 버전 page.name=3/index=4)에 대해 실제 Text Frame / Rectangle 정보를 확인했다(2026-09-23, 실기 테스트는 사용자가 InDesign에서 직접 수행하고 결과를 공유함 — Claude Code가 직접 실행/검증한 것은 아니다). 아래 "Frame 분석 워크시트"에 이 두 페이지의 분석 결과를 기록했다.

이후 사용자가 working .indd에 실제로 Script Label(TITLE/POINT_TEXT/BODY/HERO_IMAGE, TITLE/POINT_TEXT/BODY_COLUMN_1/BODY_COLUMN_2)을 부여했고, 읽기 전용 검증 기능([src/validation.js](../src/validation.js))으로 두 페이지 모두 "결과: 모두 정상"임을 실제 InDesign에서 확인했다(2026-09-23). 이를 기반으로 자동조판 MVP용 기사 JSON 데이터 계약을 정의했다 — [docs/ARTICLE_DATA_SPEC.md](ARTICLE_DATA_SPEC.md) 참고.

이어서 `BODY_COLUMN_1`/`BODY_COLUMN_2`가 InDesign 텍스트 스레드로 실제 연결되어 있음을 확인했다(2026-09-23, `src/validation.js`의 연결 검사로 "연결됨" 확인). 이를 근거로 JSON 데이터 계약을 단순화했다 — 사진 없는 변형도 `bodyColumn1`/`bodyColumn2` 두 필드 대신 `body` 필드 하나만 받고, `BODY_COLUMN_1`에만 채워 넣으면 텍스트 스레드로 `BODY_COLUMN_2`까지 자동으로 흐른다([docs/ARTICLE_DATA_SPEC.md](ARTICLE_DATA_SPEC.md), [DECISIONS.md](../DECISIONS.md) D010).

본문 페이지/인터뷰 레이아웃은 아직 분석하지 않았다. **프레임 단위의 이름 규칙(확정판), 데이터 매핑, 스타일 규칙은 아직 디자이너와 공식 확정된 것이 아니다** — "시작 페이지"/"목차"의 Script Label은 기술적으로 적용/검증되었지만, 이것이 디자이너와 합의된 영구 명명 규칙인지는 별개의 확인 사항으로 남아 있다. 임의로 프레임 이름을 실제로 변경하거나, 확인되지 않은 항목을 추측해서 확정 짓지 않는다.

"목차" 템플릿(목차샘플1, page index=1/name=2)은 (2026-09-28) `Inspect Current Page`의 읽기 전용 재귀 탐색(D021~D023)으로 실제 구조를 전수 분석하고 Script Label까지 부여/검증했다(D024) — 전체 22개 pageItem 중 20개가 목차 슬롯(`TOC_ITEM_01`~`TOC_ITEM_20`, 각각 Group)이고, 나머지 2개는 이번 자동화 대상이 아닌 상단 고정 디자인 요소("매거진 / 목차샘플1")다. 각 슬롯 내부에는 제목+부제가 하나로 합쳐진 `TOC_TEXT`(TextFrame)와 페이지 번호 `TOC_PAGE`(TextFrame)만 Script Label을 부여했고, 점선/구분선은 무라벨로 남겨뒀다. 자세한 내용은 아래 "Frame 분석 워크시트"와 [DECISIONS.md](../DECISIONS.md) D024/D025 참고. **다만 이 계약을 사용하는 `TABLE_OF_CONTENTS` Generate 코드와 가변 슬롯 검증(N개 데이터면 슬롯 20개 중 앞의 N개만 사용, D025)은 아직 구현되지 않았다** — "목차 자동화 완료"가 아니라 "목차샘플1의 구조 분석 및 Script Label 계약/부여/검증 완료" 단계다.

아래 "Frame 분석 워크시트"에 `Inspect Template` 결과를 페이지/프레임 단위로 옮겨 적으면서 분석을 진행한다. 워크시트가 충분히 채워지고 디자이너와 확인이 끝나면, 그 내용을 일반화해 뒤쪽의 "Frame Name" / "Data Field Mapping" / "Required / Optional" / "Paragraph Style" / "Object Style" 표(템플릿 전체에 적용되는 확정 규칙)를 채운다. (관련 요청 사항은 [HANDOFF.md](../HANDOFF.md)의 "디자이너에게 확인해야 할 사항" 참고)

---

## Template Type

반복 사용되는 대표 페이지 레이아웃 종류.

현재 확정된 Template Type 4종 (2026-09-22 확정, 영문/자동화 식별자는 "시작 페이지"만 확정):

| Template Type | 자동화용 식별자 | 설명 | 사용되는 Category 예시 |
|---|---|---|---|
| 목차 | `TABLE_OF_CONTENTS` (2026-09-28 잠정 확정 — Article Data `templateType` 값으로 D025에서 제안, 디자이너 공식 확인 전) | 목차샘플1(index=1, name=2) 1종. 목차 슬롯 20개(`TOC_ITEM_01`~`TOC_ITEM_20`) + 상단 고정 디자인 요소(자동화 대상 아님)로 구성됨을 확인 (2026-09-28) | |
| 시작 페이지 | `OPENING_PAGE` (2026-09-23 확정, [docs/ARTICLE_DATA_SPEC.md](ARTICLE_DATA_SPEC.md) 참고) | 사진 있는 버전(`variant: "WITH_PHOTO"`, 대표 이미지 프레임 포함)과 사진 없는 버전(`variant: "WITHOUT_PHOTO"`, 본문 2단 구성, 대표 이미지 프레임 없음) 2가지 변형이 실제로 존재함을 확인 (2026-09-23) | |
| 본문 페이지 | (미정) | | |
| 인터뷰 레이아웃 | (미정) | | |

나머지 2종("본문 페이지"/"인터뷰 레이아웃")의 "자동화용 식별자"는 아직 확정하지 않는다. "설명"/"사용되는 Category 예시"도 디자이너 확인 전이므로 비워둔다.

## Frame 분석 워크시트

`Inspect Template` 버튼으로 확인한 실제 페이지/프레임 정보를 그대로 옮겨 적는 워크시트다. 페이지에 프레임이 여러 개 있으면 프레임마다 한 행씩 작성한다.

| Template Type | Page Number | Page Purpose | Frame Role | Current Frame Name | Proposed Automation Name | Object Type | Data Field | Required / Optional | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 시작 페이지 | 2 (index=3) | 사진 있는 시작 페이지 | 제목 | (이름 없음) | (적용됨) `TITLE` | TextFrame | `title` (docs/ARTICLE_DATA_SPEC.md) | Required (MVP 잠정) | 텍스트 미리보기 "매거진 시작 메인 페이지"로 식별. Script Label 실제 부여 및 검증 완료(2026-09-23) |
| 시작 페이지 | 2 (index=3) | 사진 있는 시작 페이지 | 부제 / 포인트 문구 | (이름 없음) | (적용됨) `POINT_TEXT` | TextFrame | `pointText` — sample/article.json의 `subtitle`을 재사용하지 않고 별도 필드로 확정 (docs/ARTICLE_DATA_SPEC.md) | Required (MVP 잠정) | 텍스트 미리보기 "캡션 혹은 부제나 간단한 포인트 문구를 넣으세요."로 식별. Script Label 실제 부여 및 검증 완료(2026-09-23) |
| 시작 페이지 | 2 (index=3) | 사진 있는 시작 페이지 | 본문 | (이름 없음) | (적용됨) `BODY` | TextFrame | `body` (docs/ARTICLE_DATA_SPEC.md) | Required (MVP 잠정) | Lorem ipsum 자리 채움 텍스트로 식별. Script Label 실제 부여 및 검증 완료(2026-09-23) |
| 시작 페이지 | 2 (index=3) | 사진 있는 시작 페이지 | 대표 이미지 | (이름 없음) | (적용됨) `HERO_IMAGE` | Rectangle | `heroImage` (docs/ARTICLE_DATA_SPEC.md) | `variant: "WITH_PHOTO"`일 때 Required, `WITHOUT_PHOTO`일 때 해당 없음 | bounds `[22.07, 116, 287, 201]`로 식별. Script Label 실제 부여 및 검증 완료(2026-09-23). 템플릿 레벨 Optional 여부는 디자이너 확인 필요이나, MVP 데이터 계약은 `variant`로 명시적으로 분기해 이 모호함을 해소함 |
| 시작 페이지 | 2 (index=3) | 사진 있는 시작 페이지 | 템플릿 제작 안내 문구 (데이터 필드 아님) | (이름 없음) | (적용됨) `HERO_IMAGE_GUIDE` | TextFrame | 없음 (JSON 데이터로 채우지 않음 — HERO_IMAGE 배치 성공 후 항상 빈 문자열로 비움) | `variant: "WITH_PHOTO"`일 때 Required (Script Label 필요) | 텍스트 "대표이미지" — 사용자가 직접 "템플릿 안내용 문구, 기사 데이터 필드가 아님"으로 확인함. 2026-09-28 D018 결정: 이 프레임을 삭제하지 않고 `HERO_IMAGE_GUIDE` Script Label을 부여해 자동조판이 찾아서 `contents`만 비우기로 함(위치/크기/스타일 변경 없음). 사용자가 실제 working .indd에 이 Label을 부여하고 Generate 정상 케이스로 실기 검증 완료함(2026-09-28) — 안내 문구가 비워지고 프레임/위치/크기/스타일은 그대로 유지됨([HANDOFF.md](../HANDOFF.md)/[DECISIONS.md](../DECISIONS.md) D018 참고) |
| 시작 페이지 | 3 (index=4) | 사진 없는 시작 페이지 | 제목 | (이름 없음) | (적용됨) `TITLE` | TextFrame | `title` (docs/ARTICLE_DATA_SPEC.md) | Required (MVP 잠정) | 텍스트 미리보기 "매거진 시작 메인 페이지 (사진X)"로 식별. Script Label 실제 부여 및 검증 완료(2026-09-23) |
| 시작 페이지 | 3 (index=4) | 사진 없는 시작 페이지 | 부제 / 포인트 문구 | (이름 없음) | (적용됨) `POINT_TEXT` | TextFrame | `pointText` (docs/ARTICLE_DATA_SPEC.md) | Required (MVP 잠정) | 텍스트 미리보기 "캡션 혹은 부제나 간단한 포인트 문구..."로 식별. Script Label 실제 부여 및 검증 완료(2026-09-23) |
| 시작 페이지 | 3 (index=4) | 사진 없는 시작 페이지 | 본문 (왼쪽 단, 텍스트 스레드 시작점) | (이름 없음) | (적용됨) `BODY_COLUMN_1` | TextFrame | `body` — 이 프레임에만 쓴다 (docs/ARTICLE_DATA_SPEC.md) | `variant: "WITHOUT_PHOTO"`일 때 Required | 왼쪽 컬럼 본문 텍스트 프레임. Script Label 실제 부여 및 검증 완료(2026-09-23). **`BODY_COLUMN_1.nextTextFrame`이 `BODY_COLUMN_2`를 가리키는 텍스트 스레드로 실제 연결되어 있음을 확인**(2026-09-23, `src/validation.js` linkChecks로 "연결됨" 확인) — 여기 채운 본문이 넘치면 InDesign이 자동으로 BODY_COLUMN_2로 흘려보낸다 |
| 시작 페이지 | 3 (index=4) | 사진 없는 시작 페이지 | 본문 (오른쪽 단, 텍스트 스레드로 자동 연결) | (이름 없음) | (적용됨) `BODY_COLUMN_2` | TextFrame | 없음 — 데이터로 직접 쓰지 않음 (docs/ARTICLE_DATA_SPEC.md) | 해당 없음 (직접 채우는 대상이 아님) | 오른쪽 컬럼 본문 텍스트 프레임. Script Label 실제 부여 및 검증 완료(2026-09-23). `BODY_COLUMN_2.previousTextFrame`이 `BODY_COLUMN_1`을 가리키는 텍스트 스레드로 연결되어 있어(확인됨 2026-09-23) `BODY_COLUMN_1`에 채운 본문이 넘치면 자동으로 이어짐 |
| 시작 페이지 | 3 (index=4) | 사진 없는 시작 페이지 | (대표 이미지 프레임 없음) | 해당 없음 | 해당 없음 | 해당 없음 | 해당 없음 (`heroImage`는 `WITHOUT_PHOTO`에서 사용 안 함) | 해당 없음 (프레임 자체가 없음) | 이 페이지 변형에는 HERO_IMAGE에 대응하는 Rectangle이 존재하지 않음 — "사진 없는 시작 페이지"의 특징으로 사용자가 직접 확인함 |
| 목차 | 2 (index=1) | 목차 (목차샘플1) | 목차 항목 슬롯(반복 단위) | (이름 없음) | (적용됨) `TOC_ITEM_01` ~ `TOC_ITEM_20` | Group | 없음(슬롯 자체는 데이터 필드가 아니며, 내부 `TOC_TEXT`/`TOC_PAGE`가 데이터를 받음) | 데이터 개수 N개면 `TOC_ITEM_01`~`TOC_ITEM_0N`만 Required, 나머지는 검증 대상 아님(D025) | 20개 슬롯 전부 동일 구조 반복(`childCount=3`). `Inspect Current Page`로 전수 확인(2026-09-28). 슬롯 식별은 Label 번호 기준, 화면 좌표/등록 순서 아님 |
| 목차 | 2 (index=1) | 목차 (목차샘플1) | 제목 + 부제 (하나의 TextFrame에 통합) | (이름 없음) | (적용됨) `TOC_TEXT` | TextFrame | `items[i].title`/`items[i].subtitle` — 한 TextFrame에 같이 들어감(D025 데이터 계약 잠정안, 디자이너 확인 전) | 사용되는 슬롯(1~N)에서 Required | 별도 SUBTITLE 프레임 없음 — 제목/부제가 분리된 프레임이 아니라는 점이 "시작 페이지"(TITLE/POINT_TEXT 분리)와 다름. 20개 슬롯 전부 `Inspect Current Page`로 확인(2026-09-28) |
| 목차 | 2 (index=1) | 목차 (목차샘플1) | 페이지 번호 | (이름 없음) | (적용됨) `TOC_PAGE` | TextFrame | `items[i].page` (D025 데이터 계약 잠정안) | 사용되는 슬롯(1~N)에서 Required | 20개 슬롯 전부 `Inspect Current Page`로 확인(2026-09-28) |
| 목차 | 2 (index=1) | 목차 (목차샘플1) | 점선/구분선 (데이터 필드 아님) | (이름 없음) | Script Label 없음(의도적) | 해당 없음 | 없음 | 해당 없음(자동화 대상 아님) | 각 슬롯 내부에 있으나 코드가 찾을 필요가 없어 무라벨 상태로 확정 |
| 목차 | 2 (index=1) | 목차 (목차샘플1) | 상단 고정 디자인 요소("매거진 / 목차샘플1") | (이름 없음) | Script Label 없음(자동화 대상 아님) | 해당 없음 | 없음 | 해당 없음(자동화 대상 아님) | 매 호마다 바뀌지 않는 고정 디자인이라는 전제(사용자 확인) — 22개 pageItem 중 목차 슬롯 20개를 제외한 나머지 2개 |

열 설명:

- **Template Type**: 위 "Template Type" 표의 4종(목차/시작 페이지/본문 페이지/인터뷰 레이아웃) 중 해당 페이지가 속하는 유형.
- **Page Number**: InDesign에서 표시되는 페이지 번호(`Inspect Template` 로그의 `Page X` 값).
- **Page Purpose**: 그 페이지가 실제로 하는 역할을 짧은 설명으로 적는다 (예: "인터뷰 도입부", "본문 2단 레이아웃"). 아직 확정 용어가 아니어도 된다.
- **Frame Role**: 그 프레임이 콘텐츠상 어떤 역할을 하는지 (예: 제목, 부제, 본문, 작성자, 대표 이미지, 캡션 등). 판단이 어려우면 "(미정)"으로 둔다.
- **Current Frame Name**: `Inspect Template` 로그에 나온 실제 프레임 이름을 그대로 옮겨 적는다. 이름이 비어 있으면 "(이름 없음)"으로 적는다.
- **Proposed Automation Name**: 자동화에 쓸 프레임 식별자(Script Label) 후보. 아직 Script Label을 실제로 부여하지 않았다면 "(후보) TITLE"처럼 "(후보)"를 붙인다. 실제로 InDesign에 Script Label을 부여하고 `Inspect Template`/검증 기능으로 정상 동작을 확인했다면 "(적용됨) TITLE"로 바꿔 적는다. 어느 쪽이든 **디자이너와 공식 합의된 영구 명명 규칙이라는 뜻은 아니다** — 그 확정은 별도로 아래 "Frame Name" 표(확정판)에서 다룬다.
- **Object Type**: `Inspect Template` 로그에 나온 개체 타입 (예: TextFrame, Rectangle 등).
- **Data Field**: 기사 JSON 데이터 필드와 연결될 가능성이 있으면 참고로 적는다("시작 페이지"는 [docs/ARTICLE_DATA_SPEC.md](ARTICLE_DATA_SPEC.md)에서 확정한 필드명 사용). 아직 확정 매핑이 아니다.
- **Required / Optional**: 그 프레임/데이터가 항상 있어야 하는지, 없을 수도 있는지. 디자이너 확인 전이면 "(미정)"으로 둔다. "시작 페이지"처럼 variant(사진 있음/없음)에 따라 달라지는 경우 어느 variant에서 Required인지 명시한다.
- **Notes**: 그 외 특이사항 자유 기록 (예: "제목이 2줄 넘으면 잘림", "이미지 없는 페이지도 있음" 등).

## Frame Name

프레임 이름 규칙(확정판). 같은 역할의 프레임은 모든 템플릿에서 동일한 이름을 사용한다. 위 "Frame 분석 워크시트"의 `Current Frame Name`/`Proposed Automation Name` 열을 페이지별로 채운 뒤, 디자이너와 확정된 규칙만 아래 표로 정리한다.

| Frame Name | 역할 | 프레임 종류 (Text/Image) |
|---|---|---|
| (미확정) | | |

## Data Field Mapping

기사 JSON 데이터 필드와 InDesign 프레임 이름의 매핑(확정판). 워크시트의 `Data Field`/`Current Frame Name` 열이 충분히 모이고 확정되면 채운다.

| Data Field | Frame Name | 비고 |
|---|---|---|
| (미확정) | | |

## Required / Optional

각 데이터 필드/프레임의 필수 여부(확정판). 워크시트의 `Required / Optional` 열이 확정되면 채운다.

| Frame Name / Data Field | 필수 여부 | 없을 때 처리 |
|---|---|---|
| (미확정) | | |

## Paragraph Style

텍스트 스타일 이름 규칙. (예: MAG_TITLE, MAG_BODY, MAG_CAPTION 등 — 아직 미확정). `Inspect Template`이 출력하는 "사용 가능한 Paragraph Style 목록"을 참고해 채운다.

| Paragraph Style | 적용 대상 Frame Name | 설명 |
|---|---|---|
| (미확정) | | |

## Object Style

이미지/프레임 오브젝트 스타일 이름 규칙. `Inspect Template`이 출력하는 "사용 가능한 Object Style 목록"을 참고해 채운다.

| Object Style | 적용 대상 Frame Name | 설명 |
|---|---|---|
| (미확정) | | |

## Image Fit Rule

이미지가 프레임 크기와 다를 때 맞춤 방식 (Fill Frame Proportionally, Fit Content Proportionally 등).

- (미확정)

## Text Overflow Rule

본문이 텍스트 프레임보다 길 때(Overset) 처리 방식 (추가 페이지 생성, Linked Text Frame로 이어주기 등).

- (미확정)

## Missing Image Rule

이미지가 없을 때 레이아웃 처리 방식 (빈 프레임 유지, 프레임 삭제, 대체 레이아웃 사용 등).

- (미확정)

## Page Add / Remove Rule

본문/이미지 분량에 따라 페이지를 추가하거나 삭제하는 규칙.

- (미확정)

## 향후 Template Selection 기준 (장기 방향, 아직 미구현)

**이 섹션은 방향성만 기록한 것이며, 지금 구현하지 않는다.** 현재 우선순위는 여전히 "시작 페이지" 1종에 대한 JSON 기반 자동조판 MVP다(HANDOFF.md/DECISIONS.md D016 참고). 아래는 장기적으로 Word/Excel 등 원고 파일을 입력받아 기사 특성에 맞는 Template Type을 자동으로 고르게 될 때 고려할 후보 기준일 뿐, 디자이너와 확정된 것도 아니고 점수/규칙의 구체적인 값도 정해진 바 없다.

고려 후보 기준:

- 제목 길이
- 본문 길이
- 이미지 개수
- 대표 이미지 존재 여부
- 기사 유형
- 인터뷰/Q&A 형식 여부
- 캡션 유무
- 필요 페이지 수

예시로 든 매핑(전부 미확정, 디자이너 확인 전):

- 대표 이미지가 있는 짧은 기사 시작 → 사진 있는 시작 페이지(`OPENING_PAGE` variant `WITH_PHOTO`)
- 이미지가 없는 기사 시작 → 사진 없는 시작 페이지(`OPENING_PAGE` variant `WITHOUT_PHOTO`)
- 긴 일반 기사 → 본문 페이지(미착수 Template Type)
- Q&A / 인터뷰 형식 → 인터뷰 레이아웃(미착수 Template Type)
- 이미지가 많은 기사 → 이미지 중심 레이아웃(현재 4종 Template Type에 없음 — 필요성 자체가 디자이너 확인 필요)

이 기준을 실제로 규칙 기반 선택 로직으로 구현하는 시점, 또는 적합도/점수 기반으로 확장하는 시점에는 이 섹션을 갱신하고 [DECISIONS.md](../DECISIONS.md)에 별도 결정을 기록한다.

## Notes

기타 디자이너와 논의 중이거나 확정되지 않은 예외 사항을 자유롭게 기록한다.

- (아직 기록된 내용 없음)

## 1.1 새 디자인 모드 — 기존 템플릿 계약과 별개

새 모드는 입력 템플릿을 요구하지 않는다. 별도 새 문서에 `AUTO_TITLE`, `AUTO_SUBTITLE`, `AUTO_BODY_N`, `AUTO_IMAGE_N`, `AUTO_HEADER_N`, `AUTO_FOOTER_N`, `AUTO_RULE_N` 라벨을 부여한다. 좌표 단위는 mm, 글자 크기는 pt. AUTO 라벨 생성은 사용자 요청으로 승인된 D026의 새 문서에만 적용한다. 기존 프레임 라벨/위치/스타일 규칙은 변경하지 않는다. 실제 앱 검증은 아직 없다.


## 새 디자인 모드의 외부 JSON (json-design-01)

기존 INDD Script Label 계약과 별개로, designs/의 IDML 추출 draft JSON을 새 문서로 생성하는 경로를 추가했다. 기존 template.js/시작페이지/목차 코드는 사용하거나 변경하지 않는다. 스키마·역할 매핑·단위·폰트·사진·overflow·추가 방법은 [JSON_DESIGNS.md](JSON_DESIGNS.md)를 따른다. 이는 INDD 직접 등록/IDML 파서 기능이 아니다.

## v2 등록 디자인 검증판

기존 양식 Script Label 계약은 유지한다. 새 v2 등록에서는 원본 라벨을 쓰지 않고 별도 등록 JSON의 roles/preserveElementIds에 사용자가 확인한 역할을 저장한다. 제목/부제/본문/사진1·2/캡션/헤더/푸터/페이지번호 및 원본유지를 지원한다. 등록만으로 제작 가능해지지 않으며 상세 계약은 docs/DESIGN_REGISTRATION.md를 따른다.


## 특수 마커 모델 갱신 (2026-10-01)

PI 보존 모델은 extractorVersion2 / markerPreservationVersion1입니다. 기존 모델은 원본에서 재추출해야 하며 과거 Fidelity 승인을 승계하지 않습니다. 기존 Library/역할/검증 기록은 보존됩니다. 새 Library 및 Parent 자동 번호 확인 절차: [특수 마커 안내](SPECIAL_MARKERS.md). Node282/Python18 통과, 새 모델 Adobe 재검증 필요.
# Common registration / source typography — 2026-10-02

An automatically inferred author/job-title/name line is PRESERVE, not a subtitle destination based solely on its position. Existing explicit role confirmations are retained. BODY inference uses the dominant source character size, without resizing a frame or font. A unique heading above article prose can be a TITLE candidate even with a modest source size; ambiguous headings still need review.

The native replacement policy supports one enlarged first letter only when the rest of the source Story is uniform and all other styles/languages/overrides match. Its original size is applied to the new first letter, the original base to the rest, with per-character verification. Other emphasis and ambiguous language ranges require a deliberate registration policy. Actual source/content overflow remains blocking.

## Optional content contracts and TITLE base language (2026-10-02)
Fully confirmed article roles may declare `magazine-content-contract/v1` with absent optional subtitle and `omit-with-warning`. Source identity, absent effective subtitle, no unresolved mapping and confirmed TITLE/BODY are validated; role edits invalidate the contract. A nonempty DOCX subtitle remains explicitly unapplied and visible in diagnostics. No implicit BODY merge or additional frame is permitted.

A visually uniform TITLE whose sample differs only by language may inherit its resolved original base language. Native first-point replacement preserves that language; arbitrary emphasis/size/style changes still require semantic correspondence. BODY remains on the existing strict policies. See [latest22 audit and actual Production](LATEST_CONTENT_ROLES.md).

## Bounded content Typography Auto-fit

Registered Production may proportionally reduce BODY up to10% and SUBTITLE up to4%, only after actual content overset; full content/geometry and source Fidelity remain mandatory. All BODY Stories share a ratio, preserving per-character relative sizes and style/language. Auto leading and tracking remain unchanged. Runtime diagnostics record source and permitted typography; adjusted content still requires native overset0 and strict checks. See [policy and actual Host results](BOUNDED_AUTO_FIT.md).
# Active source identity

New registrations store model metadata.sourceFilename/sourceSha256 and descriptor.provenance: designSetId, designSetVersion, sourceFilename, sourceSha256, sourcePageIds, sourceSpreadIds, pageSetId, fingerprint. The active selection stores an explicit sources allowlist. General native load/recommendation/Production and combined OPTION checks validate these fields; equal page IDs do not transfer prior roles or approvals. Source frame/image geometry and fitting remain in the extracted model and existing computed profile. No source geometry or role is inferred from an archived registration.

## Gallery selection contract
Gallery identity is designId plus full descriptor.provenance, captured with the article snapshot. Single Production reports fidelity.designId and provenance; both must exactly match the selected entry after active-source validation. Native preview manifest magazine-native-preview/v1 stores source-ordered page files and renderer/Host identity; cached preview is not Fidelity/Production approval. See TEMPLATE_GALLERY.md.
