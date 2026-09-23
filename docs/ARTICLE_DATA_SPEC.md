# ARTICLE_DATA_SPEC.md

자동조판 MVP에서 사용할 기사 데이터(JSON)의 최소 규격을 정의하는 문서다. [docs/TEMPLATE_SPEC.md](TEMPLATE_SPEC.md)가 "InDesign 템플릿/프레임 구조"를 다룬다면, 이 문서는 "그 프레임에 채워 넣을 JSON 데이터의 모양"을 다룬다.

## 현재 범위

- **"시작 페이지"(Template Type, 자동화 식별자 `OPENING_PAGE`) 2개 변형만** 다룬다: 사진 있는 버전, 사진 없는 버전.
- 목차/본문 페이지/인터뷰 레이아웃은 아직 포함하지 않는다.
- 이 문서는 데이터 구조와 샘플 파일 정의까지만 다룬다. 아래는 **아직 구현하지 않았다**:
  - `Load Article` 버튼의 실제 파일 선택 동작
  - JSON 파일 읽기 ([src/data.js](../src/data.js)는 여전히 빈 스텁)
  - InDesign `contents` 변경, 이미지 배치
  - `Generate` 버튼을 통한 자동조판

전제: "시작 페이지" Script Label(`TITLE`/`POINT_TEXT`/`BODY`/`HERO_IMAGE`, `TITLE`/`POINT_TEXT`/`BODY_COLUMN_1`/`BODY_COLUMN_2`) 기반 프레임 검증이 실제 InDesign에서 두 변형 모두 "정상"으로 확인되었다(2026-09-23, [HANDOFF.md](../HANDOFF.md) 참고).

## 왜 `variant`를 명시적 필드로 두는가

"시작 페이지"에는 사진이 있는 버전과 없는 버전, 서로 다른 InDesign 프레임 구성을 가진 두 페이지가 실제로 존재한다([docs/TEMPLATE_SPEC.md](TEMPLATE_SPEC.md) Frame 분석 워크시트 참고). 어느 쪽을 조판할지를 코드가 `heroImage` 필드의 존재 여부 같은 걸로 암묵적으로 추측하게 하면:

- 사진이 아직 준비되지 않아 `heroImage`를 비워 둔 "사진 있음" 기사를 "사진 없음"으로 잘못 판단할 수 있다.
- 반대로 나중에 `bodyColumn1`/`bodyColumn2`류 필드가 추가되면 어떤 조합이 "사진 없음"을 뜻하는지 코드 안에 암묵적 규칙이 계속 쌓인다.
- 데이터를 만드는 쪽(디자이너/에디터/추후 CMS)이 "어떤 필드를 채워야 사진 있는 버전으로 인식되는지"를 코드를 보지 않고는 알 수 없다.

그래서 **`variant` 필드로 명시적으로 선언**하게 했다. 어느 InDesign 페이지 변형을 쓸지는 데이터를 만드는 쪽이 결정해서 명시하고, 코드는 그 값을 그대로 신뢰한다(추측하지 않는다).

같은 이유로, 본문 2단 구성(사진 없음)도 `body` 문자열 하나를 코드가 자동으로 두 프레임에 나눠 채우는 방식을 택하지 않았다. 텍스트가 정확히 어디서 잘려야 두 단에 자연스럽게 들어가는지는 프레임 크기·폰트·자간에 따라 InDesign이 실제로 조판해보지 않으면 예측하기 어렵다. 대신 `bodyColumn1`/`bodyColumn2` 두 필드로 명시적으로 받는다 — 어떻게 나눌지의 판단을 코드가 아니라 데이터를 만드는 쪽에 맡긴다.

## 공통 필드 (두 variant 모두 필요)

| 필드 | 타입 | Required / Optional | 설명 |
|---|---|---|---|
| `templateType` | string | **Required** | 이번 MVP는 `"OPENING_PAGE"` 고정값만 다룬다. |
| `variant` | string (enum: `"WITH_PHOTO"` \| `"WITHOUT_PHOTO"`) | **Required** | 어떤 InDesign 페이지 변형을 쓸지 명시적으로 선언. 기본값이나 추측 로직 없음 — 값이 없거나 이 두 값이 아니면 데이터 오류로 취급할 예정(검증 로직은 아직 미구현). |
| `title` | string | **Required** | `TITLE` Script Label 프레임에 들어간다. |
| `pointText` | string | **Required** | 부제/포인트 문구. `POINT_TEXT` Script Label 프레임에 들어간다. |

## `variant = "WITH_PHOTO"`일 때 추가 필드

| 필드 | 타입 | Required / Optional | 설명 |
|---|---|---|---|
| `body` | string | **Required** | `BODY` Script Label 프레임(TextFrame)에 들어간다. |
| `heroImage` | string (파일명) | **Required** | `HERO_IMAGE` Script Label이 붙은 Rectangle에 배치될 이미지 파일명(아직 배치 로직 미구현). `sample/images/`의 파일명 규칙을 따른다. |

이 variant에서는 `bodyColumn1`/`bodyColumn2`를 사용하지 않는다.

## `variant = "WITHOUT_PHOTO"`일 때 추가 필드

| 필드 | 타입 | Required / Optional | 설명 |
|---|---|---|---|
| `bodyColumn1` | string | **Required** | 본문 왼쪽 단. `BODY_COLUMN_1` Script Label 프레임(TextFrame)에 들어간다. |
| `bodyColumn2` | string | **Required** | 본문 오른쪽 단. `BODY_COLUMN_2` Script Label 프레임(TextFrame)에 들어간다. |

이 variant에서는 `body`/`heroImage`를 사용하지 않는다 (이 페이지 변형에는 `BODY`나 `HERO_IMAGE` 프레임 자체가 없음 — Inspect Template으로 확인됨).

## JSON 필드 ↔ Script Label 매핑 요약

| JSON 필드 | InDesign Script Label | Object Type | 적용 variant |
|---|---|---|---|
| `title` | `TITLE` | TextFrame | 공통 |
| `pointText` | `POINT_TEXT` | TextFrame | 공통 |
| `body` | `BODY` | TextFrame | `WITH_PHOTO` |
| `heroImage` | `HERO_IMAGE` | Rectangle | `WITH_PHOTO` |
| `bodyColumn1` | `BODY_COLUMN_1` | TextFrame | `WITHOUT_PHOTO` |
| `bodyColumn2` | `BODY_COLUMN_2` | TextFrame | `WITHOUT_PHOTO` |

## 이번 작업에서 확정한 것

- 사진 있음/없음 구분: `variant` 필드로 명시 (heroImage 유무로 암묵 추측하지 않음)
- 본문 2단 구성: `bodyColumn1`/`bodyColumn2` 두 필드로 명시 (자동 2단 분배 방식은 채택하지 않음)
- `templateType` 값: `"OPENING_PAGE"` — [docs/TEMPLATE_SPEC.md](TEMPLATE_SPEC.md)의 "Template Type" 표에도 "시작 페이지"의 자동화용 식별자로 함께 기록함

## 아직 정해지지 않은 것

- 위 Required 표시는 이번 MVP 개발을 위한 잠정 결정이며, 디자이너와 공식 확인된 것은 아니다. 특히 `pointText`가 항상 있어야 하는지, "대표이미지" 안내 문구 프레임을 실제 조판 시 어떻게 처리할지는 여전히 "확인 필요" 상태다 ([docs/TEMPLATE_SPEC.md](TEMPLATE_SPEC.md) Frame 분석 워크시트, HANDOFF.md "디자이너에게 확인해야 할 사항" 참고).
- 글자 수 제한이나 Overset(본문이 프레임보다 길 때) 처리 방식은 정의하지 않았다.
- `heroImage`가 실제로 어떤 방식(로컬 경로/URL/파일명)으로 제공될지는 확정하지 않았다 — 기존 `sample/article.json` 관례(파일명 문자열)를 그대로 따랐다.
- `variant` 값이 잘못되거나 누락됐을 때 코드가 어떻게 반응할지(에러/기본값/무시)는 아직 정의하지 않았다. 검증 로직 자체가 아직 없다.

## 샘플 파일

- [sample/opening-page-with-photo.json](../sample/opening-page-with-photo.json)
- [sample/opening-page-without-photo.json](../sample/opening-page-without-photo.json)

## 관련 문서

- [docs/TEMPLATE_SPEC.md](TEMPLATE_SPEC.md) — InDesign 프레임 구조 / Script Label 분석
- [HANDOFF.md](../HANDOFF.md) — 현재 프로젝트 상태
