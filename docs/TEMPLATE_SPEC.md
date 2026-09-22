# TEMPLATE_SPEC.md

디자이너의 InDesign 템플릿 규칙(페이지 유형, 프레임 이름, 데이터 매핑, 스타일 이름, 예외 처리 규칙 등)을 기록하는 문서다.

## 현재 상태: 템플릿 파일 수령, 분석 전

디자이너로부터 실제 InDesign 원본 템플릿(.indd/.idml)과 폰트 파일을 전달받아 `assets/templates/original/`에 보관 중이다(2026-09-22). **다만 아직 템플릿 내부를 열어 분석하지 않았고, 이 문서의 항목들은 인수인계서에서 정의한 "기록해야 할 구조"만 미리 잡아둔 것이며 실제 값은 비어 있다.** 임의로 프레임 이름, 스타일 이름, 페이지 유형 등을 추측해서 채우지 않는다.

원본 템플릿을 실제로 열어 분석하고 디자이너와 확인이 끝난 항목부터 아래 표를 채운다. (관련 요청 사항은 [HANDOFF.md](../HANDOFF.md)의 "디자이너에게 확인해야 할 사항" 참고)

---

## Template Type

반복 사용되는 대표 페이지 레이아웃 종류. (예: FEATURE, INTERVIEW, NEWS, PHOTO 등 — 아직 미확정)

| Template Type | 설명 | 사용되는 Category 예시 |
|---|---|---|
| (미확정) | | |

## Page Type

Template Type 안에서 실제로 존재하는 대표 페이지 유형. (예: COVER, FEATURE_OPENING, FEATURE_BODY, INTERVIEW_OPENING, INTERVIEW_BODY, PHOTO_PAGE, NEWS, TOC, AD 등 — 아직 미확정)

| Page Type | 소속 Template Type | 설명 |
|---|---|---|
| (미확정) | | |

## Frame Name

프레임 이름 규칙. 같은 역할의 프레임은 모든 템플릿에서 동일한 이름을 사용한다.

| Frame Name | 역할 | 프레임 종류 (Text/Image) |
|---|---|---|
| (미확정) | | |

## Data Field Mapping

기사 JSON 데이터 필드와 InDesign 프레임 이름의 매핑.

| Data Field | Frame Name | 비고 |
|---|---|---|
| (미확정) | | |

## Required / Optional

각 데이터 필드/프레임의 필수 여부.

| Frame Name / Data Field | 필수 여부 | 없을 때 처리 |
|---|---|---|
| (미확정) | | |

## Paragraph Style

텍스트 스타일 이름 규칙. (예: MAG_TITLE, MAG_BODY, MAG_CAPTION 등 — 아직 미확정)

| Paragraph Style | 적용 대상 Frame Name | 설명 |
|---|---|---|
| (미확정) | | |

## Object Style

이미지/프레임 오브젝트 스타일 이름 규칙.

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
