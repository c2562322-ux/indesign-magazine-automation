# TEMPLATE_SPEC.md

디자이너의 InDesign 템플릿 규칙(페이지 유형, 프레임 이름, 데이터 매핑, 스타일 이름, 예외 처리 규칙 등)을 기록하는 문서다.

## 현재 상태: 실제 프레임 구조 식별 단계 진행 중

디자이너로부터 실제 InDesign 원본 템플릿(.indd/.idml)과 폰트 파일을 전달받아 `assets/templates/original/`에 보관 중이다(2026-09-22). `assets/templates/working/`에 작업용 복사본을 만들어 `Inspect Template` 버튼(읽기 전용 문서 분석 기능)으로 실제 InDesign에서 열어본 결과, 일부 페이지에서 Text Frame / Rectangle이 정상적으로 조회되는 것을 확인했다(2026-09-22, 실기 테스트는 사용자가 InDesign에서 직접 수행하고 결과를 공유함 — Claude Code가 직접 실행/검증한 것은 아니다). 반복되는 대표 Template Type 4종(목차, 시작 페이지, 본문 페이지, 인터뷰 레이아웃)은 확정되었지만, **프레임 단위의 이름 규칙, 데이터 매핑, 스타일 규칙은 아직 확정되지 않았다.** 임의로 프레임 이름, 자동화 이름, 스타일 이름 등을 추측해서 채우지 않는다.

아래 "Frame 분석 워크시트"에 `Inspect Template` 결과를 페이지/프레임 단위로 옮겨 적으면서 분석을 진행한다. 워크시트가 충분히 채워지고 디자이너와 확인이 끝나면, 그 내용을 일반화해 뒤쪽의 "Frame Name" / "Data Field Mapping" / "Required / Optional" / "Paragraph Style" / "Object Style" 표(템플릿 전체에 적용되는 확정 규칙)를 채운다. (관련 요청 사항은 [HANDOFF.md](../HANDOFF.md)의 "디자이너에게 확인해야 할 사항" 참고)

---

## Template Type

반복 사용되는 대표 페이지 레이아웃 종류.

현재 확정된 Template Type 4종 (2026-09-22 확정, 영문/자동화 식별자는 아직 미정):

| Template Type | 자동화용 식별자 | 설명 | 사용되는 Category 예시 |
|---|---|---|---|
| 목차 | (미정) | | |
| 시작 페이지 | (미정) | | |
| 본문 페이지 | (미정) | | |
| 인터뷰 레이아웃 | (미정) | | |

"자동화용 식별자"(예: `TOC`, `FEATURE_OPENING` 같은 영문 코드)는 아직 확정하지 않는다. "설명"/"사용되는 Category 예시"도 디자이너 확인 전이므로 비워둔다.

## Frame 분석 워크시트

`Inspect Template` 버튼으로 확인한 실제 페이지/프레임 정보를 그대로 옮겨 적는 워크시트다. 페이지에 프레임이 여러 개 있으면 프레임마다 한 행씩 작성한다.

| Template Type | Page Number | Page Purpose | Frame Role | Current Frame Name | Proposed Automation Name | Object Type | Data Field | Required / Optional | Notes |
|---|---|---|---|---|---|---|---|---|---|
| (기입 예정) | | | | | | | | | |

열 설명:

- **Template Type**: 위 "Template Type" 표의 4종(목차/시작 페이지/본문 페이지/인터뷰 레이아웃) 중 해당 페이지가 속하는 유형.
- **Page Number**: InDesign에서 표시되는 페이지 번호(`Inspect Template` 로그의 `Page X` 값).
- **Page Purpose**: 그 페이지가 실제로 하는 역할을 짧은 설명으로 적는다 (예: "인터뷰 도입부", "본문 2단 레이아웃"). 아직 확정 용어가 아니어도 된다.
- **Frame Role**: 그 프레임이 콘텐츠상 어떤 역할을 하는지 (예: 제목, 부제, 본문, 작성자, 대표 이미지, 캡션 등). 판단이 어려우면 "(미정)"으로 둔다.
- **Current Frame Name**: `Inspect Template` 로그에 나온 실제 프레임 이름을 그대로 옮겨 적는다. 이름이 비어 있으면 "(이름 없음)"으로 적는다.
- **Proposed Automation Name**: 향후 자동화에 쓸 프레임 이름 후보. **이번 단계에서는 확정하지 않는다.** 후보가 떠오르면 "(후보) TITLE"처럼 "(후보)"를 붙여서만 적고, 디자이너와 확정되기 전까지는 확정 표시를 하지 않는다.
- **Object Type**: `Inspect Template` 로그에 나온 개체 타입 (예: TextFrame, Rectangle 등).
- **Data Field**: `sample/article.json`의 필드(title, subtitle, author, body, heroImage, image01, caption01 등)와 연결될 가능성이 있으면 참고로 적는다. 아직 확정 매핑이 아니다.
- **Required / Optional**: 그 프레임/데이터가 항상 있어야 하는지, 없을 수도 있는지. 디자이너 확인 전이면 "(미정)"으로 둔다.
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

## Notes

기타 디자이너와 논의 중이거나 확정되지 않은 예외 사항을 자유롭게 기록한다.

- (아직 기록된 내용 없음)
