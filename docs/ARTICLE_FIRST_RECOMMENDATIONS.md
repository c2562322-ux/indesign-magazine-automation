# 원고 조건으로 제작 후보 선택 — 2026-10-01

## 이번 변경과 한계

일반 추천 카드는 현재 원고 평가 candidate 중 역할과 공통 Fidelity/production capability를 충족하는 디자인만 표시한다. 검토 필요 디자인은 별도 접힌 개발자 확인 영역에 사유로 표시하며 동일 수준의 제작 카드로 노출하지 않는다. 사진 수/추정 분량/폰트/부제 검사는 유지한다. 후보가0이면 원고를 바꾸도록 강제하거나 미지원 카드를 대신 추천하지 않는다.

resolveClearRoles 공통 규칙: 기존 확정 역할/COLOR_SLOT 보존, 긴 단일 페이지 BODY, 명시 이미지 placeholder 포함 프레임, 명시 POINT_TEXT, 본문 위 단독 짧은 heading(강조/캡션/이미지/목차/부제 제외)을 근거와 함께 부분 등록한다. 새 29개 중13페이지에서 부분 역할을 추가했다. 불명확한 캡션 분배/연속 지면/로고를 임의 기사 슬롯으로 바꾸지 않는다. POINT_TEXT는 현재 공통 subtitle 계약을 사용하므로 독립 subtitle+pointText 동시 치환은 지원 완료가 아니다.

최종 제작 capability 후보는 여전히6개: 3·5·10·11·12·13쪽. 전체 확대 목표는 미완료다. 슬롯 구성은0장4개,1장1개,2장0개,3장1개,4장이상0개. 이는 원고 평가 전 구조적 풀 숫자이지 어떤 원고든 이 수만큼 추천된다는 뜻이 아니다. Adobe 실기 성공/Production Ready 아님.

동일 문장 시험 원고: 제목19자/본문650자/부제없음, 사진각1200x800, 필요한폰트 설치 가정. 0장 후보1(3쪽),1장0,2장0,3장0,4장0. 사진 수만 맞으면 추천시키지 않으며 실제 분량/추정 보류도 반영한 결과다. 이전 동적 이미지 회귀는1/2/3/4/40장 synthetic DOCX 추출→추천→선택→동일 native 엔진 mock 제작/검사를 유지한다. 임의 모든 DOCX가 실제29개에서 결과 생성된다는 보장은 하지 않는다.

개인 active Library 업데이트 전 before-role-completion.private.json 전체 백업. 기존26개/검증 이력/source/color는 보존, 새29개 sidecar의 객관적 역할만 보강. 소스 파일 미수정. tools/register-source-library.js에서도 같은 규칙 재사용.

## 남은 페이지별 조건

| 디자인 | 등록 역할 | 남은 역할 확인 | 기술적 제한 |
|---|---|---|---|
| 새 샘플 · 1쪽 · u1ba | 없음 | 제목 역할 확인 필요 / 본문 역할 확인 필요 | 없음(Adobe 미검증) |
| 새 샘플 · 2쪽 · u1ce | title | 본문 역할 확인 필요 | graphic effect readback 미지원 / title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.FontStyle |
| 새 샘플 · 1쪽 · u1cf | title | 본문 역할 확인 필요 | graphic effect readback 미지원 / title UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.FontStyle, $.AppliedLanguage |
| 새 샘플 · 2쪽 · u335e | body, image1, subtitle, title | 없음 | body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.PointSize |
| 새 샘플 · 3쪽 · u3356 | body, subtitle, title | 없음 | 없음(Adobe 미검증) |
| 새 샘플 · 4쪽 · u3d5 | body, image1, subtitle, title | 없음 | body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.PointSize, $.Leading |
| 새 샘플 · 5쪽 · u3d6 | body, image1, image2, image3, subtitle, title | 없음 | 없음(Adobe 미검증) |
| 새 샘플 · 6쪽 · u735 | body | 제목 역할 확인 필요 | UNSUPPORTED 페이지 귀속/공유 객체: u7eac / body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.PointSize, $.Leading |
| 새 샘플 · 7쪽 · uad7 | body, image1, image2 | 제목 역할 확인 필요 | UNSUPPORTED 페이지 귀속/공유 객체: u7eac / body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.PointSize, $.Leading |
| 새 샘플 · 8쪽 · u576c | body, title | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요 | UNSUPPORTED 페이지 귀속/공유 객체: u7fad |
| 새 샘플 · 9쪽 · u5764 | body, image1, image2, image3 | 제목 역할 확인 필요 | UNSUPPORTED 페이지 귀속/공유 객체: u7fad |
| 새 샘플 · 10쪽 · u577b | body, image1, subtitle, title | 없음 | 없음(Adobe 미검증) |
| 새 샘플 · 11쪽 · u577c | body, title | 없음 | 없음(Adobe 미검증) |
| 새 샘플 · 12쪽 · u853e | body, subtitle, title | 없음 | 없음(Adobe 미검증) |
| 새 샘플 · 13쪽 · u8668 | body, title | 없음 | 없음(Adobe 미검증) |
| 새 샘플 · 14쪽 · u8726 | body, image1, subtitle | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요 / 제목 역할 확인 필요 | 없음(Adobe 미검증) |
| 새 샘플 · 15쪽 · u889b | body | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요 / 제목 역할 확인 필요 | 없음(Adobe 미검증) |
| 새 샘플 · 16쪽 · u87d0 | body, subtitle | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요 / 제목 역할 확인 필요 | 없음(Adobe 미검증) |
| 새 샘플 · 17쪽 · u8846 | body, subtitle | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요 / 제목 역할 확인 필요 | 없음(Adobe 미검증) |
| 새 샘플 · 18쪽 · u8942 | body | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요 / 제목 역할 확인 필요 | 없음(Adobe 미검증) |
| 새 샘플 · 19쪽 · u89c2 | 없음 | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요 / 제목 역할 확인 필요 / 본문 역할 확인 필요 | 없음(Adobe 미검증) |
| 새 샘플 · 20쪽 · u8a26 | body | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요 / 제목 역할 확인 필요 | UNSUPPORTED 페이지 귀속/공유 객체: u8a28 |
| 새 샘플 · 21쪽 · u8a27 | 없음 | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요 / 제목 역할 확인 필요 / 본문 역할 확인 필요 | UNSUPPORTED 페이지 귀속/공유 객체: u8a28 |
| 새 샘플 · 22쪽 · u8b10 | body, title | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요 | UNSUPPORTED 페이지 귀속/공유 객체: u8b5d / body UNSUPPORTED 혼합 Typography: 원본 스타일/언어 패턴을 안전하게 대응할 수 없습니다. 실제 속성 차이: $.FontStyle |
| 새 샘플 · 23쪽 · u8b11 | body, title | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요 | UNSUPPORTED 페이지 귀속/공유 객체: u8b5d |
| 새 샘플 · 24쪽 · u8c39 | body | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요 / 제목 역할 확인 필요 | UNSUPPORTED 페이지 귀속/공유 객체: u8d69 |
| 새 샘플 · 25쪽 · u8d68 | body, title | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요 | UNSUPPORTED 페이지 귀속/공유 객체: u8d69 / graphic effect readback 미지원 |
| 새 샘플 · 26쪽 · u8ccf | body | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요 / 제목 역할 확인 필요 | UNSUPPORTED custom image color management |
| 새 샘플 · 27쪽 · u8e19 | body, image1, title | 단독 기사 TITLE 및 남은 설명/캡션/장식의 의미 확인 필요 | 없음(Adobe 미검증) |

## 검증

Node301/301, Python18/18. 리뷰 카드 기대값은 새 사용자 요구에 맞게 일반카드0/개발자접기 표시로 변경했으며 차단 자체와 평가 개수 검사는 유지했다. 신규 unsupported 제외/전체평가 보존/사진초과 거절/부분등록 원본불변 및 idempotence 검사.

PC: 사용 중인 DOCX 그대로 → Reload → DOCX → 일반 추천에서 선택해 제작. 후보가 없으면 해당 안내가 정상이며 디자인에 맞춘 새 원고를 요구하지 않는다. 다음 개발 우선순위는 단독 지면이 아닌 continuation/목차와 기사 템플릿 구분, 첫글자/도입부 실제 Typography의 명시적 대응 정책, 공유 spread/색관리 지원이다.
