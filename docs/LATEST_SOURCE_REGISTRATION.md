# 최신 디자이너 샘플 등록 — 2026-10-01

## 원본과 등록 범위

매거진자동화템플릿.idml을 새 source of truth로 재추출했다. INDD/IDML 원본은 수정하지 않았다. IDML SHA256: `172e0fb7adc52e31ba5f3fefd1ca4c6c186b1714309ec27f2900f82a077ada90`.

일반 페이지 29개 / 일반 spread 15개 / Parent 2개(2 MasterSpread). 표시 번호 1~27 중 1/2가 중복된다. 기존 original의 14페이지 ID와 대응하며 15페이지는 신규다. 기존 역할의 객체 type/Story 참조까지 일치하는 13페이지만 역할을 이전했다. u576c는 참조 변경으로 재확인이 필요하다. geometry/typography는 모두 새 모델 값이며 과거 Adobe 검증 승인을 이전하지 않았다.

개인 active Library는 기존 26버전 + 신규 29버전 = 55버전. 기존 데이터/검증 이력은 삭제하지 않는다. 새 버전이 명시적으로 대체하는 14버전(13개 원본과 이전 디자이너 수정본)은 일반 추천에서만 제외한다. 새 29개 + 유지된 12개 = 41개 활성 평가 버전. 추출 모델, Library, 이전 active backup은 assets/templates/working의 Git 제외 개인 파일이다. 소스 파일/모델/Library는 commit에 포함하지 않는다.

새 29개 중 역할 기준 준비 8 / 역할 확인 21, 정적 Fidelity 검증 가능 16 / 미지원 13, 역할 및 정적 제작 capability 충족 6. 이 수치는 실제 Adobe 검증이 아니다. 신규 Fidelity 실기 완료 0 / Production Ready 0.

## COLOR_SLOT 계약

사용자가 승인한 단일 페이지 회색 면만 ACCENT로 등록: 표시20쪽 u8a75, 22쪽 u8b94, 23쪽 u8b5a, 26쪽 u8cf9. 24~25쪽 공유 객체 u8d69/u8dec는 제외했다. 사진 placeholder, 텍스트, 로고는 등록하지 않았다.

descriptor.colorSlots는 name / confirmed:true / elementIds 배열로 의미와 대상 객체를 명시한다. 여러 객체를 하나의 의미 슬롯에 묶을 수 있다. 공통 엔진은 page/frame ID나 원본 색상 숫자를 하드코딩하지 않는다. 현재 지원 범위는 단일 페이지의 명시적인 solid fill 비사진 Rectangle/Oval/Polygon이며 공유 객체/사진/텍스트/중복 등록을 거부한다.

일반 추천 카드에서 ACCENT 색상을 #RRGGBB로 입력하거나 비워 원본을 유지한다. 엔진은 RGB/CMYK 값을 검증하고, 원본 Fidelity 통과 후 새 swatch를 만들어 승인된 객체의 fillColor만 바꾼다. 기존 swatch를 수정하지 않으므로 다른 객체에 전파되지 않는다. 제작 후 선택색을 expected로 검사하며 다른 geometry/typography/stroke/tint 보존 검사는 그대로 유지한다. proof 문서는 항상 원본색이다. 컬러 변경 시 이전 제작/출력 상태는 무효화한다.

개발자 역할 편집에서 명시적인 슬롯 의미/대상 ID로 추가 디자인에도 등록 가능하다. 역할 검토 확인은 기존 별도 동작을 유지하며 컬러 등록으로 역할 미확정을 해제하지 않는다.

중요: 이번 ACCENT 4페이지는 공유 객체/역할 미확정/PNG metadata 등의 기존 capability 제한이 남아 있다. 슬롯 등록과 공통 제작 구현을 완료했지만 이 4페이지의 실제 컬러 제작 성공을 주장하지 않는다. 검사 우회 없이 후속 공통 지원이 필요하다.

## 페이지별 상태 (전부 Adobe 실기 재검증 필요)

| 페이지 ID | 표시 | 역할 | IMAGE | 역할 준비 | 정적 Fidelity 검증 가능 | 남은 capability 사유 |
|---|---|---|---:|---|---|---|
| u1ba | 1 | KEEP / 확인 필요 | 0 | 확인 필요 | 예 | 없음(실기 미검증) |
| u1ce | 2 | title | 0 | 확인 필요 | 미지원 | graphic effect readback 미지원 / title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. |
| u1cf | 1 | title | 0 | 확인 필요 | 미지원 | graphic effect readback 미지원 / title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. |
| u335e | 2 | body, image1, subtitle, title | 1 | 예 | 예 | body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. |
| u3356 | 3 | body, subtitle, title | 0 | 예 | 예 | 없음(실기 미검증) |
| u3d5 | 4 | body, image1, subtitle, title | 1 | 예 | 예 | body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. |
| u3d6 | 5 | body, image1, image2, image3, subtitle, title | 3 | 예 | 예 | 없음(실기 미검증) |
| u735 | 6 | body | 0 | 확인 필요 | 미지원 | UNSUPPORTED 페이지 귀속/공유 객체: u7eac / body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. |
| uad7 | 7 | body, image1, image2 | 2 | 확인 필요 | 미지원 | UNSUPPORTED 페이지 귀속/공유 객체: u7eac / body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. |
| u576c | 8 | KEEP / 확인 필요 | 0 | 확인 필요 | 미지원 | UNSUPPORTED 페이지 귀속/공유 객체: u7fad |
| u5764 | 9 | body, image1, image2, image3 | 3 | 확인 필요 | 미지원 | UNSUPPORTED 페이지 귀속/공유 객체: u7fad |
| u577b | 10 | body, image1, subtitle, title | 1 | 예 | 예 | 없음(실기 미검증) |
| u577c | 11 | body, title | 0 | 예 | 예 | 없음(실기 미검증) |
| u853e | 12 | body, subtitle, title | 0 | 예 | 예 | 없음(실기 미검증) |
| u8668 | 13 | body, title | 0 | 예 | 예 | 없음(실기 미검증) |
| u8726 | 14 | KEEP / 확인 필요 | 0 | 확인 필요 | 예 | 없음(실기 미검증) |
| u889b | 15 | KEEP / 확인 필요 | 0 | 확인 필요 | 예 | 없음(실기 미검증) |
| u87d0 | 16 | KEEP / 확인 필요 | 0 | 확인 필요 | 예 | 없음(실기 미검증) |
| u8846 | 17 | KEEP / 확인 필요 | 0 | 확인 필요 | 예 | 없음(실기 미검증) |
| u8942 | 18 | KEEP / 확인 필요 | 0 | 확인 필요 | 예 | 없음(실기 미검증) |
| u89c2 | 19 | KEEP / 확인 필요 | 0 | 확인 필요 | 예 | 없음(실기 미검증) |
| u8a26 | 20 | KEEP / 확인 필요 | 0 | 확인 필요 | 미지원 | UNSUPPORTED 페이지 귀속/공유 객체: u8a28 |
| u8a27 | 21 | KEEP / 확인 필요 | 0 | 확인 필요 | 미지원 | UNSUPPORTED 페이지 귀속/공유 객체: u8a28 |
| u8b10 | 22 | KEEP / 확인 필요 | 0 | 확인 필요 | 미지원 | UNSUPPORTED 페이지 귀속/공유 객체: u8b5d |
| u8b11 | 23 | KEEP / 확인 필요 | 0 | 확인 필요 | 미지원 | UNSUPPORTED 페이지 귀속/공유 객체: u8b5d |
| u8c39 | 24 | KEEP / 확인 필요 | 0 | 확인 필요 | 미지원 | UNSUPPORTED 페이지 귀속/공유 객체: u8d69 |
| u8d68 | 25 | KEEP / 확인 필요 | 0 | 확인 필요 | 미지원 | UNSUPPORTED 페이지 귀속/공유 객체: u8d69 / graphic effect readback 미지원 |
| u8ccf | 26 | KEEP / 확인 필요 | 0 | 확인 필요 | 미지원 | UNSUPPORTED graphic detail: MetadataPacketPreference |
| u8e19 | 27 | KEEP / 확인 필요 | 0 | 확인 필요 | 예 | 없음(실기 미검증) |

## 보존 / 회귀 / Adobe 최소 확인

기존 u335e/u3d6의 사용자 실기 성공은 이전 모델에 대한 기록으로 보존한다. 신규 u335e/u3d5 등은 원본 혼합 typography 제한이 있을 수 있으며 이전 성공을 새 모델에 승계하지 않는다. 원본 Parent의 ACE18 2개를 보존하고 이번 패키지에는 복원 마커를 추가하지 않는다. POINT_TEXT 명시 라벨은 기존 subtitle 역할 경로로 인식한다. 동적 IMAGE_1..N, 원본 fitting, Recompose/overflow, KEEP, INDD/PDF 경로를 재사용한다.

Node 295/295, Python 18/18. 추가 회귀: 컬러 대상/범위 검증, 신규 Library append와 과거 데이터 불변, UI 선택색 전달, 원본 proof/차단/제작 색상 readback 및 변조 검출. 자동 테스트는 Adobe 실기 성공이 아니다.

1. UDT Reload → DOCX 불러오기. 이 PC의 active Library를 자동 로드한다.
2. 새 샘플 추천 중 역할/지원 조건이 맞는 카드의 `이 디자인으로 제작` 실행. 사진 수와 부제 유무가 맞는 원고를 사용한다. 예: 신규 u3d6은 사진 3개 구조다.
3. 결과의 글/사진/원본 geometry와 검사 결과 확인 → 오류가 없을 때 INDD/PDF.
4. 전체 새 샘플 확인은 개발자 영역의 일괄 검증 → 전체 페이지 검증 결과 JSON 저장. ACCENT 4페이지는 아직 제작 제한 사유가 남아 있으므로 우회하지 않는다.

개인 Library는 Git으로 배포되지 않는다. 다른 PC에서는 해당 private Library를 별도로 불러와야 한다. 신규 등록 도구 tools/register-source-library.js는 기존 Library와 새 추출 모델을 읽어 새로운 출력 파일로만 append한다.
